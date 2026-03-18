// ============================================
// StockfishWorker.ts — Wrapper para Stockfish WASM (UCI)
// ============================================
// Maneja comunicacion con el motor Stockfish via Web Worker.
// Soporta niveles de dificultad 1-8 con configuracion progresiva.
//
// FIX: Resuelve el problema de Stockfish colgándose después de ~8 movimientos.
// Causa: no se enviaba 'stop' antes de nueva búsqueda ni 'isready' entre búsquedas.
// El motor se quedaba en estado de búsqueda permanente.

export interface StockfishConfig {
  level: number; // 1-8
}

// Mapeo de nivel a configuracion UCI de Stockfish
// Nivel 1: muy debil, Nivel 8: fuerte
function getLevelConfig(level: number): { skillLevel: number; depth: number; moveTime: number } {
  // Depths reducidos para evitar cálculos infinitos
  // moveTime es el control PRINCIPAL — depth es secundario
  switch (level) {
    case 1: return { skillLevel: 0, depth: 1, moveTime: 100 };
    case 2: return { skillLevel: 3, depth: 2, moveTime: 200 };
    case 3: return { skillLevel: 5, depth: 3, moveTime: 300 };
    case 4: return { skillLevel: 8, depth: 5, moveTime: 500 };
    case 5: return { skillLevel: 11, depth: 6, moveTime: 800 };
    case 6: return { skillLevel: 14, depth: 8, moveTime: 1200 };
    case 7: return { skillLevel: 17, depth: 10, moveTime: 1800 };
    case 8: return { skillLevel: 20, depth: 12, moveTime: 2500 };
    default: return { skillLevel: 0, depth: 1, moveTime: 100 };
  }
}

type MessageCallback = (bestMove: string) => void;

export class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private searching = false;
  private pendingCallback: MessageCallback | null = null;
  private level: number = 1;
  private initialized = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      // Load stockfish from public directory
      this.worker = new Worker('/stockfish.js');

      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : e.data?.toString() || '';
        this.handleMessage(line);
      };

      this.worker.onerror = (err) => {
        console.warn('Stockfish worker error:', err);
        this.isReady = false;
        this.searching = false;
        // Resolve pending with empty to trigger fallback
        if (this.pendingCallback) {
          this.pendingCallback = null;
        }
      };

      // Initialize UCI
      this.send('uci');
    } catch (err) {
      console.warn('Could not initialize Stockfish worker:', err);
      this.worker = null;
    }
  }

  private handleMessage(line: string): void {
    if (line === 'uciok') {
      this.initialized = true;
      // Set initial level config
      this.applyLevel(this.level);
      this.send('isready');
    } else if (line === 'readyok') {
      this.isReady = true;
      this.searching = false;
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1] || '';
      this.searching = false;

      // Clear timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      if (this.pendingCallback && bestMove && bestMove !== '(none)') {
        const cb = this.pendingCallback;
        this.pendingCallback = null;
        // Request ready state for next search
        this.send('isready');
        cb(bestMove);
      } else {
        this.pendingCallback = null;
        this.send('isready');
      }
    }
  }

  private send(cmd: string): void {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private applyLevel(level: number): void {
    const config = getLevelConfig(level);
    this.send(`setoption name Skill Level value ${config.skillLevel}`);
    this.send('setoption name UCI_LimitStrength value true');
    // Map skill level to approximate Elo
    const elo = 800 + (level - 1) * 200; // 800 to 2200
    this.send(`setoption name UCI_Elo value ${elo}`);
  }

  /**
   * Set the difficulty level (1-8).
   * Must be called before getBestMove().
   */
  setLevel(level: number): void {
    this.level = Math.max(1, Math.min(8, level));
    if (this.initialized) {
      this.applyLevel(this.level);
      this.send('isready');
    }
  }

  /**
   * Stop any current search. This is CRITICAL to prevent the engine
   * from hanging indefinitely.
   */
  private stopSearch(): void {
    if (this.searching) {
      this.send('stop');
      this.searching = false;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pendingCallback = null;
  }

  /**
   * Get the best move for the given FEN position.
   * Returns a UCI move string like "e2e4" or "e7e8q" (promotion).
   *
   * FIX: Now properly handles engine state between searches:
   * 1. Stops any in-progress search first
   * 2. Waits for readyok before starting new search
   * 3. Uses movetime as PRIMARY limit (more reliable than depth alone)
   * 4. Hard timeout at 5s forces stop+fallback
   */
  getBestMove(fen: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Stockfish worker not available'));
        return;
      }

      // Stop any in-progress search FIRST
      this.stopSearch();

      // Request ready state
      this.isReady = false;
      this.send('isready');

      let attempts = 0;
      const maxAttempts = 100; // 5 seconds max wait for ready

      const trySearch = () => {
        attempts++;
        if (!this.isReady) {
          if (attempts > maxAttempts) {
            // Engine not responding to isready — force restart
            console.warn('Stockfish not responding to isready, forcing restart');
            this.restartWorker();
            reject(new Error('Stockfish not ready'));
            return;
          }
          setTimeout(trySearch, 50);
          return;
        }

        const config = getLevelConfig(this.level);

        this.pendingCallback = (bestMove: string) => {
          resolve(bestMove);
        };

        this.searching = true;

        // Set position and search
        // Use ONLY movetime — this is the most reliable way to limit Stockfish
        this.send(`position fen ${fen}`);
        this.send(`go movetime ${config.moveTime}`);

        // Hard timeout: if no response in 5 seconds, force stop
        this.timeoutId = setTimeout(() => {
          if (this.pendingCallback) {
            console.warn('Stockfish hard timeout, forcing stop');
            this.send('stop');
            // Give it 500ms to respond to stop
            setTimeout(() => {
              if (this.pendingCallback) {
                this.pendingCallback = null;
                this.searching = false;
                this.send('isready');
                reject(new Error('Stockfish timeout'));
              }
            }, 500);
          }
        }, Math.max(config.moveTime + 3000, 5000));
      };

      trySearch();
    });
  }

  /**
   * Force restart the worker if it becomes unresponsive.
   */
  private restartWorker(): void {
    if (this.worker) {
      try { this.worker.terminate(); } catch { /* ignore */ }
    }
    this.worker = null;
    this.isReady = false;
    this.searching = false;
    this.initialized = false;
    this.pendingCallback = null;
    this.initWorker();
    // Re-apply level after restart
    setTimeout(() => {
      if (this.initialized) {
        this.setLevel(this.level);
      }
    }, 1000);
  }

  /**
   * Check if Stockfish is available and initialized.
   */
  get available(): boolean {
    return this.worker !== null && this.initialized;
  }

  /**
   * Get the underlying worker for direct communication (used by AnalysisEngine).
   */
  getWorker(): Worker | null {
    return this.worker;
  }

  /**
   * Clean up the worker.
   */
  destroy(): void {
    this.stopSearch();
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.initialized = false;
  }
}
