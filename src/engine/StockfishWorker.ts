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
// Nivel 1: principiante, Nivel 8: fuerza maxima (GM)
//
// Stockfish tiene 2 mecanismos para debilitarse:
//   1. Skill Level (0-20): agrega errores aleatorios. 0 = maximo error, 20 = perfecto
//   2. UCI_LimitStrength + UCI_Elo: limita directamente la fuerza
//
// Para niveles 1-5: usamos ambos mecanismos (ELO cap + Skill Level bajo)
// Para niveles 6-8: solo Skill Level alto, SIN limite de ELO → juega fuerte
function getLevelConfig(level: number): {
  skillLevel: number;
  depth: number;
  moveTime: number;
  elo: number;
  limitStrength: boolean;
} {
  switch (level) {
    case 1: return { skillLevel: 0,  depth: 1,  moveTime: 100,  elo: 800,  limitStrength: true };
    case 2: return { skillLevel: 3,  depth: 3,  moveTime: 200,  elo: 1000, limitStrength: true };
    case 3: return { skillLevel: 5,  depth: 5,  moveTime: 400,  elo: 1200, limitStrength: true };
    case 4: return { skillLevel: 8,  depth: 7,  moveTime: 600,  elo: 1400, limitStrength: true };
    case 5: return { skillLevel: 10, depth: 9,  moveTime: 800,  elo: 1600, limitStrength: true };
    case 6: return { skillLevel: 13, depth: 12, moveTime: 1200, elo: 0,    limitStrength: false };
    case 7: return { skillLevel: 16, depth: 15, moveTime: 2000, elo: 0,    limitStrength: false };
    case 8: return { skillLevel: 20, depth: 25, moveTime: 4000, elo: 0,    limitStrength: false };
    default: return { skillLevel: 0,  depth: 1,  moveTime: 100,  elo: 800,  limitStrength: true };
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
      // Set hash and threads for better performance
      this.send('setoption name Hash value 64');
      this.send('setoption name Threads value 1');
      // Apply initial level config
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
    if (config.limitStrength) {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${config.elo}`);
    } else {
      // Full strength — no ELO limit, Skill Level controls quality
      this.send('setoption name UCI_LimitStrength value false');
    }
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
   * Flow: stop → isready → ucinewgame → applyLevel → position → go depth+movetime
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
            console.warn('Stockfish not responding to isready, forcing restart');
            this.restartWorker();
            reject(new Error('Stockfish not ready'));
            return;
          }
          setTimeout(trySearch, 50);
          return;
        }

        const config = getLevelConfig(this.level);

        // Re-apply level config before EVERY search to ensure it sticks
        this.applyLevel(this.level);

        this.pendingCallback = (bestMove: string) => {
          resolve(bestMove);
        };

        this.searching = true;

        // Set position and search with both depth and movetime
        this.send('ucinewgame');
        this.send(`position fen ${fen}`);
        this.send(`go depth ${config.depth} movetime ${config.moveTime}`);

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
