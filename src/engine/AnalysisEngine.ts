// ============================================
// AnalysisEngine.ts — Motor de análisis post-partida
// ============================================
// Evalúa todos los movimientos de una partida usando Stockfish.
// Clasifica cada jugada en 8 categorías (tipo chess.com).
// Calcula precisión por jugador.

import { StockfishEngine } from './StockfishWorker';

// === Move Classification ===
export type MoveClassification =
  | 'brilliant'    // Jugada brillante
  | 'great'        // Genial
  | 'best'         // Mejor jugada
  | 'good'         // Buena
  | 'inaccuracy'   // Imprecisión
  | 'mistake'      // Error
  | 'blunder'      // Error grave
  | 'missed'       // Ocasión perdida
  | 'book';        // Jugada de apertura (sin clasificar)

// Color mapping for each classification
// Structured for easy future replacement with custom icons
export const CLASSIFICATION_CONFIG: Record<MoveClassification, {
  label: string;
  color: string;
  shortLabel: string;
  // Future: iconPath?: string;
}> = {
  brilliant:  { label: 'Brillante',       color: '#1baaa7', shortLabel: '!!' },
  great:      { label: 'Genial',          color: '#5c8bb0', shortLabel: '!'  },
  best:       { label: 'Mejor jugada',    color: '#a3bf3f', shortLabel: '★'  },
  good:       { label: 'Buena',           color: '#7fba4c', shortLabel: '✓'  },
  inaccuracy: { label: 'Imprecisión',     color: '#e6a528', shortLabel: '?!' },
  mistake:    { label: 'Error',           color: '#e87d24', shortLabel: '?'  },
  blunder:    { label: 'Error grave',     color: '#c93430', shortLabel: '??'  },
  missed:     { label: 'Ocasión perdida', color: '#8b8b8b', shortLabel: '□'  },
  book:       { label: 'Apertura',        color: '#a89070', shortLabel: '📖' },
};

// === Analysis Result Types ===
export interface MoveAnalysis {
  moveIndex: number;
  san: string;
  from: string;
  to: string;
  color: 'white' | 'black';
  // Evaluations in centipawns (from white's perspective)
  evalBefore: number;       // Position eval before this move
  evalAfter: number;        // Position eval after this move
  bestMove: string;         // Best UCI move according to Stockfish
  bestMoveSan: string;      // Best move in SAN notation (if available)
  // Classification
  classification: MoveClassification;
  // Centipawn loss (positive = loss for the player)
  cpLoss: number;
}

export interface GameAnalysis {
  moves: MoveAnalysis[];
  whiteAccuracy: number;    // 0-100%
  blackAccuracy: number;    // 0-100%
  whiteBrilliant: number;
  whiteGreat: number;
  whiteBest: number;
  whiteGood: number;
  whiteInaccuracy: number;
  whiteMistake: number;
  whiteBlunder: number;
  blackBrilliant: number;
  blackGreat: number;
  blackBest: number;
  blackGood: number;
  blackInaccuracy: number;
  blackMistake: number;
  blackBlunder: number;
}

// === Classification Logic ===

function classifyMove(
  evalBefore: number,
  evalAfter: number,
  isBestMove: boolean,
  color: 'white' | 'black',
  moveNumber: number
): MoveClassification {
  // Opening moves (first 5 moves each side) — less strict classification
  if (moveNumber <= 10) {
    if (isBestMove) return 'best';
    const loss = color === 'white'
      ? evalBefore - evalAfter
      : evalAfter - evalBefore;
    if (loss <= 10) return 'book';
    if (loss <= 30) return 'good';
    if (loss <= 80) return 'inaccuracy';
    if (loss <= 200) return 'mistake';
    return 'blunder';
  }

  // Centipawn loss from the perspective of the player who moved
  const cpLoss = color === 'white'
    ? evalBefore - evalAfter
    : evalAfter - evalBefore;

  // Check for brilliant: player was losing/equal, made a move that
  // creates a significant advantage (not the obvious best move)
  const wasLosing = color === 'white' ? evalBefore < -50 : evalBefore > 50;
  const nowWinning = color === 'white' ? evalAfter > 150 : evalAfter < -150;
  if (!isBestMove && wasLosing && nowWinning && cpLoss <= 0) {
    return 'brilliant';
  }

  // Great: finding a strong move in a complex/losing position
  if (isBestMove && wasLosing && nowWinning) {
    return 'great';
  }

  // Best move
  if (isBestMove && cpLoss <= 5) return 'best';

  // Good: very small loss
  if (cpLoss <= 30) return 'good';

  // Check for missed opportunity: had a winning move but played something neutral
  const hadWinning = color === 'white' ? evalBefore > 200 : evalBefore < -200;
  const isNowNeutral = Math.abs(evalAfter) < 100;
  if (hadWinning && isNowNeutral && cpLoss > 100) {
    return 'missed';
  }

  // Inaccuracy: 30-100 centipawns lost
  if (cpLoss <= 100) return 'inaccuracy';

  // Mistake: 100-300 centipawns lost
  if (cpLoss <= 300) return 'mistake';

  // Blunder: > 300 centipawns lost
  return 'blunder';
}

// === Accuracy Calculation ===
// Uses a formula similar to chess.com:
// accuracy = 103.1668 * e^(-0.04354 * (avg_cp_loss)) - 3.1668
// Clamped to 0-100

function calculateAccuracy(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 100;
  const avgLoss = cpLosses.reduce((a, b) => a + b, 0) / cpLosses.length;
  const accuracy = 103.1668 * Math.exp(-0.04354 * avgLoss) - 3.1668;
  return Math.max(0, Math.min(100, Math.round(accuracy * 10) / 10));
}

// === Analysis Engine ===

export class AnalysisEngine {
  private stockfish: StockfishEngine;
  private _progress: number = 0;
  private _isAnalyzing: boolean = false;
  private _cancelled: boolean = false;

  constructor() {
    this.stockfish = new StockfishEngine();
    // Set max level for analysis (accurate evaluations)
    this.stockfish.setLevel(8);
  }

  get progress(): number { return this._progress; }
  get isAnalyzing(): boolean { return this._isAnalyzing; }

  /**
   * Analyze a complete game given its FEN positions and move history.
   *
   * @param positions Array of FEN strings: [initial, after_move_1, after_move_2, ...]
   * @param moves Array of {san, from, to, color} for each move
   * @param onProgress Callback with progress 0-100
   */
  async analyzeGame(
    positions: string[],
    moves: { san: string; from: string; to: string; color: 'white' | 'black' }[],
    onProgress?: (progress: number, currentMove: number) => void,
  ): Promise<GameAnalysis> {
    this._isAnalyzing = true;
    this._cancelled = false;
    this._progress = 0;

    const evaluations: number[] = [];
    const moveAnalyses: MoveAnalysis[] = [];

    // Wait for Stockfish to be ready
    await this.waitForReady();

    // Step 1: Evaluate all positions
    const totalPositions = positions.length;
    for (let i = 0; i < totalPositions; i++) {
      if (this._cancelled) break;

      try {
        const evaluation = await this.evaluatePosition(positions[i]!);
        evaluations.push(evaluation);
      } catch {
        // If evaluation fails, use the previous eval or 0
        evaluations.push(evaluations.length > 0 ? evaluations[evaluations.length - 1]! : 0);
      }

      this._progress = Math.round((i / totalPositions) * 50);
      onProgress?.(this._progress, i);
    }

    // Step 2: Get best moves for each position BEFORE a move
    for (let i = 0; i < moves.length; i++) {
      if (this._cancelled) break;

      const move = moves[i]!;
      const evalBefore = evaluations[i] ?? 0;
      const evalAfter = evaluations[i + 1] ?? 0;

      // Get the best move for this position
      let bestMoveUci = '';
      try {
        bestMoveUci = await this.stockfish.getBestMove(positions[i]!);
      } catch {
        bestMoveUci = '';
      }

      // Check if the player's move matches Stockfish's best move
      const playerMoveUci = move.from + move.to;
      const isBestMove = bestMoveUci.startsWith(playerMoveUci);

      // Classify the move
      const classification = classifyMove(
        evalBefore, evalAfter, isBestMove, move.color, i
      );

      // Calculate centipawn loss
      const cpLoss = move.color === 'white'
        ? Math.max(0, evalBefore - evalAfter)
        : Math.max(0, evalAfter - evalBefore);

      moveAnalyses.push({
        moveIndex: i,
        san: move.san,
        from: move.from,
        to: move.to,
        color: move.color,
        evalBefore,
        evalAfter,
        bestMove: bestMoveUci,
        bestMoveSan: '', // TODO: convert UCI to SAN
        classification,
        cpLoss,
      });

      this._progress = 50 + Math.round((i / moves.length) * 50);
      onProgress?.(this._progress, i);
    }

    // Step 3: Calculate stats
    const whiteMoves = moveAnalyses.filter(m => m.color === 'white');
    const blackMoves = moveAnalyses.filter(m => m.color === 'black');

    const whiteAccuracy = calculateAccuracy(whiteMoves.map(m => m.cpLoss));
    const blackAccuracy = calculateAccuracy(blackMoves.map(m => m.cpLoss));

    const countClass = (moves: MoveAnalysis[], cls: MoveClassification) =>
      moves.filter(m => m.classification === cls).length;

    this._isAnalyzing = false;
    this._progress = 100;
    onProgress?.(100, moves.length);

    return {
      moves: moveAnalyses,
      whiteAccuracy,
      blackAccuracy,
      whiteBrilliant: countClass(whiteMoves, 'brilliant'),
      whiteGreat: countClass(whiteMoves, 'great'),
      whiteBest: countClass(whiteMoves, 'best'),
      whiteGood: countClass(whiteMoves, 'good'),
      whiteInaccuracy: countClass(whiteMoves, 'inaccuracy'),
      whiteMistake: countClass(whiteMoves, 'mistake'),
      whiteBlunder: countClass(whiteMoves, 'blunder'),
      blackBrilliant: countClass(blackMoves, 'brilliant'),
      blackGreat: countClass(blackMoves, 'great'),
      blackBest: countClass(blackMoves, 'best'),
      blackGood: countClass(blackMoves, 'good'),
      blackInaccuracy: countClass(blackMoves, 'inaccuracy'),
      blackMistake: countClass(blackMoves, 'mistake'),
      blackBlunder: countClass(blackMoves, 'blunder'),
    };
  }

  /**
   * Evaluate a position and return centipawn score from white's perspective.
   */
  private evaluatePosition(fen: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.stockfish.available) {
        reject(new Error('Stockfish not available'));
        return;
      }

      const worker = this.stockfish.getWorker();
      if (!worker) { reject(new Error('No worker')); return; }

      // CRITICAL: Determine whose turn it is from the FEN.
      // FEN format: "rnbqkbnr/... w KQkq - 0 1" — the 2nd field is 'w' or 'b'
      const fenParts = fen.split(' ');
      const isBlackToMove = fenParts[1] === 'b';

      let lastScore = 0;
      let resolved = false;

      const handler = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';

        // Parse evaluation from "info" lines
        // IMPORTANT: Stockfish score is ALWAYS from the perspective of the SIDE TO MOVE
        if (line.includes('score cp ')) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) {
            lastScore = parseInt(match[1]!, 10);
          }
        } else if (line.includes('score mate ')) {
          const match = line.match(/score mate (-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1]!, 10);
            lastScore = mateIn > 0 ? 10000 - mateIn * 10 : -10000 + (-mateIn) * 10;
          }
        }

        if (line.startsWith('bestmove') && !resolved) {
          resolved = true;
          worker.removeEventListener('message', handler);

          // CRITICAL FIX: Normalize score to ALWAYS be from WHITE's perspective.
          // Stockfish returns score from the side-to-move's perspective.
          // If it's black's turn, we negate to get white's perspective.
          const normalizedScore = isBlackToMove ? -lastScore : lastScore;
          resolve(normalizedScore);
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage('go depth 14 movetime 1500');

      // Timeout after 4 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          worker.removeEventListener('message', handler);
          worker.postMessage('stop');
          const normalizedScore = isBlackToMove ? -lastScore : lastScore;
          resolve(normalizedScore);
        }
      }, 4000);
    });
  }

  private waitForReady(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (this.stockfish.available) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
      // Max wait 5 seconds
      setTimeout(resolve, 5000);
    });
  }

  cancel(): void {
    this._cancelled = true;
  }

  destroy(): void {
    this.cancel();
    this.stockfish.destroy();
  }
}
