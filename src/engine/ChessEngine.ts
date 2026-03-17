// ============================================
// ChessEngine.ts — Wrapper sobre chessops (motor oficial de Lichess)
// ============================================
// Expone una API limpia de alto nivel para React.
// Internamente usa chessops para validación completa de reglas.

import { Chess } from 'chessops/chess';
import { parseFen, makeFen, INITIAL_FEN } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import { parseSquare, makeSquare, opposite } from 'chessops/util';
import type { Square, NormalMove, Color, Role } from 'chessops/types';
import type { Key } from 'chessground/types';

// === Types exported for the app ===

export type GameStatus = 'active' | 'check' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';

export interface MoveInfo {
  san: string;
  from: string;
  to: string;
  color: Color;
  captured?: Role;
  promotion?: Role;
  isCheck: boolean;
  isCheckmate: boolean;
}

export interface GameResult {
  winner?: Color;
  reason: 'checkmate' | 'stalemate' | 'insufficient' | 'threefold' | 'fifty-move' | 'timeout' | 'resignation' | 'draw-agreement';
}

export type LegalDests = Map<Key, Key[]>;

// === Chess Engine Class ===

export class ChessEngine {
  private pos: Chess;
  private history: MoveInfo[] = [];
  private positions: string[] = []; // FEN history for threefold repetition
  private _status: GameStatus = 'active';
  private _result: GameResult | undefined;

  constructor(fen?: string) {
    const setup = parseFen(fen || INITIAL_FEN);
    if (setup.isOk) {
      const chess = Chess.fromSetup(setup.value);
      if (chess.isOk) {
        this.pos = chess.value;
      } else {
        this.pos = Chess.default();
      }
    } else {
      this.pos = Chess.default();
    }
    this.positions.push(this.fen());
    this.updateStatus();
  }

  // --- Getters ---

  get turn(): Color {
    return this.pos.turn;
  }

  get status(): GameStatus {
    return this._status;
  }

  get result(): GameResult | undefined {
    return this._result;
  }

  get moveHistory(): MoveInfo[] {
    return [...this.history];
  }

  /** All FEN positions: [initial, after_move_1, after_move_2, ...] */
  get fenHistory(): string[] {
    return [...this.positions];
  }

  get moveCount(): number {
    return this.history.length;
  }

  get isGameOver(): boolean {
    return ['checkmate', 'stalemate', 'draw', 'resigned', 'timeout'].includes(this._status);
  }

  fen(): string {
    return makeFen(this.pos.toSetup());
  }

  /**
   * Get the FEN at a specific move index.
   * Index -1 = initial position, 0 = after first move, etc.
   */
  fenAtMove(moveIndex: number): string {
    const posIndex = moveIndex + 1; // positions[0] = initial
    if (posIndex < 0 || posIndex >= this.positions.length) {
      return this.fen();
    }
    return this.positions[posIndex]!;
  }

  /**
   * Get the last move at a specific move index (for highlighting).
   */
  lastMoveAtIndex(moveIndex: number): [Key, Key] | undefined {
    if (moveIndex < 0 || moveIndex >= this.history.length) return undefined;
    const move = this.history[moveIndex];
    if (!move) return undefined;
    return [move.from as Key, move.to as Key];
  }

  isCheck(): boolean {
    return this.pos.isCheck();
  }

  isCheckmate(): boolean {
    return this.pos.isCheckmate();
  }

  isStalemate(): boolean {
    return this.pos.isStalemate();
  }

  isInsufficientMaterial(): boolean {
    return this.pos.isInsufficientMaterial();
  }

  /** Standard piece values for material calculation */
  private static readonly PIECE_VALUES: Record<string, number> = {
    pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9,
  };

  /**
   * Count material for each side.
   * Returns { white: number, black: number } with total material points.
   */
  materialCount(): { white: number; black: number } {
    let white = 0;
    let black = 0;
    for (const [_sq, piece] of this.pos.board) {
      const val = ChessEngine.PIECE_VALUES[piece.role] || 0;
      if (piece.color === 'white') white += val;
      else black += val;
    }
    return { white, black };
  }

  /**
   * Material balance from white's perspective.
   * Positive = white advantage, negative = black advantage.
   */
  materialBalance(): number {
    const mat = this.materialCount();
    return mat.white - mat.black;
  }

  /**
   * Get captured pieces for a given color (pieces that color has lost).
   * Returns an array of role strings sorted by value.
   */
  capturedPieces(color: Color): Role[] {
    const initial: Record<Role, number> = {
      pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1, king: 0,
    };
    const current: Record<string, number> = {};
    for (const [_sq, piece] of this.pos.board) {
      if (piece.color === color) {
        current[piece.role] = (current[piece.role] || 0) + 1;
      }
    }
    const captured: Role[] = [];
    const roles: Role[] = ['queen', 'rook', 'bishop', 'knight', 'pawn'];
    for (const role of roles) {
      const lost = initial[role] - (current[role] || 0);
      for (let i = 0; i < lost; i++) {
        captured.push(role);
      }
    }
    return captured;
  }

  /**
   * Get the square of the king in check (for highlighting)
   */
  kingInCheck(): Key | undefined {
    if (!this.pos.isCheck()) return undefined;
    const king = this.pos.board.kingOf(this.pos.turn);
    if (king === undefined) return undefined;
    return makeSquare(king) as Key;
  }

  /**
   * Get legal destinations for all pieces of the current turn.
   * Returns Map compatible with chessground's `movable.dests`.
   */
  legalDests(): LegalDests {
    const dests: LegalDests = new Map();
    const ctx = this.pos.ctx();

    for (const from of this.pos.board[this.pos.turn]) {
      const squares = this.pos.dests(from, ctx);
      if (squares.nonEmpty()) {
        const targets: Key[] = [];
        for (const to of squares) {
          targets.push(makeSquare(to) as Key);
        }
        dests.set(makeSquare(from) as Key, targets);
      }
    }
    return dests;
  }

  /**
   * Check if a move needs promotion (pawn reaching back rank).
   */
  needsPromotion(from: string, to: string): boolean {
    const fromSq = parseSquare(from);
    const toSq = parseSquare(to);
    if (fromSq === undefined || toSq === undefined) return false;

    const piece = this.pos.board.get(fromSq);
    if (!piece || piece.role !== 'pawn') return false;

    const rank = this.pos.turn === 'white' ? 7 : 0;
    return Math.floor(toSq / 8) === rank;
  }

  /**
   * Execute a move given from/to squares (chessground format).
   * Returns MoveInfo if legal, undefined if illegal.
   */
  move(from: string, to: string, promotion?: Role): MoveInfo | undefined {
    if (this.isGameOver) return undefined;

    const fromSq = parseSquare(from) as Square;
    const toSq = parseSquare(to) as Square;
    if (fromSq === undefined || toSq === undefined) return undefined;

    // Build the move
    const move: NormalMove = {
      from: fromSq,
      to: toSq,
      promotion,
    };

    // Check legality
    if (!this.pos.isLegal(move)) return undefined;

    // Get the captured piece before playing
    const captured = this.pos.board.get(toSq);
    const capturedRole = captured?.role;

    // Generate SAN before playing the move
    const san = makeSan(this.pos, move);

    // Play the move
    this.pos.play(move);

    // Record the move
    const moveInfo: MoveInfo = {
      san,
      from,
      to,
      color: opposite(this.pos.turn), // the color that just moved
      captured: capturedRole,
      promotion,
      isCheck: this.pos.isCheck(),
      isCheckmate: this.pos.isCheckmate(),
    };

    this.history.push(moveInfo);
    this.positions.push(this.fen());

    // Update game status
    this.updateStatus();

    return moveInfo;
  }

  /**
   * Make a move from SAN notation (e.g., "e4", "Nf3", "O-O").
   */
  moveSan(san: string): MoveInfo | undefined {
    if (this.isGameOver) return undefined;

    const move = parseSan(this.pos, san);
    if (!move) return undefined;

    if ('from' in move) {
      return this.move(
        makeSquare(move.from),
        makeSquare(move.to),
        move.promotion
      );
    }
    return undefined;
  }

  /**
   * Resign the game.
   */
  resign(color: Color): void {
    this._status = 'resigned';
    this._result = {
      winner: opposite(color),
      reason: 'resignation',
    };
  }

  /**
   * Set timeout.
   */
  timeout(color: Color): void {
    this._status = 'timeout';
    this._result = {
      winner: opposite(color),
      reason: 'timeout',
    };
  }

  /**
   * Accept draw.
   */
  drawByAgreement(): void {
    this._status = 'draw';
    this._result = {
      winner: undefined,
      reason: 'draw-agreement',
    };
  }

  /**
   * Clone the engine for analysis (doesn't affect the real game).
   */
  clone(): ChessEngine {
    const engine = new ChessEngine(this.fen());
    engine.history = [...this.history];
    engine.positions = [...this.positions];
    engine._status = this._status;
    engine._result = this._result;
    return engine;
  }

  /**
   * Get the last move (for chessground highlighting).
   */
  lastMove(): [Key, Key] | undefined {
    if (this.history.length === 0) return undefined;
    const last = this.history[this.history.length - 1];
    if (!last) return undefined;
    return [last.from as Key, last.to as Key];
  }

  /**
   * Generate PGN string of the game.
   */
  toPgn(headers?: Record<string, string>): string {
    const lines: string[] = [];

    // Headers
    const defaultHeaders: Record<string, string> = {
      Event: 'Casual Game',
      Site: 'LiChess Clone',
      Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      White: headers?.White || 'Player',
      Black: headers?.Black || 'Computer',
      Result: this.getPgnResult(),
    };

    const allHeaders = { ...defaultHeaders, ...headers };
    for (const [key, value] of Object.entries(allHeaders)) {
      lines.push(`[${key} "${value}"]`);
    }
    lines.push('');

    // Moves
    const moves: string[] = [];
    for (let i = 0; i < this.history.length; i++) {
      if (i % 2 === 0) {
        moves.push(`${Math.floor(i / 2) + 1}.`);
      }
      const move = this.history[i];
      if (move) moves.push(move.san);
    }
    moves.push(this.getPgnResult());
    lines.push(moves.join(' '));

    return lines.join('\n');
  }

  // --- Private Methods ---

  private updateStatus(): void {
    if (this._status === 'resigned' || this._status === 'timeout') return;

    const outcome = this.pos.outcome();
    if (outcome) {
      if (outcome.winner) {
        this._status = 'checkmate';
        this._result = { winner: outcome.winner, reason: 'checkmate' };
      } else {
        // Draw
        if (this.pos.isStalemate()) {
          this._status = 'stalemate';
          this._result = { winner: undefined, reason: 'stalemate' };
        } else if (this.pos.isInsufficientMaterial()) {
          this._status = 'draw';
          this._result = { winner: undefined, reason: 'insufficient' };
        } else {
          this._status = 'draw';
          this._result = { winner: undefined, reason: 'fifty-move' };
        }
      }
    } else if (this.pos.isCheck()) {
      this._status = 'check';
    } else if (this.isThreefoldRepetition()) {
      this._status = 'draw';
      this._result = { winner: undefined, reason: 'threefold' };
    } else {
      this._status = 'active';
    }
  }

  private isThreefoldRepetition(): boolean {
    const currentFen = this.fen().split(' ').slice(0, 4).join(' ');
    let count = 0;
    for (const fen of this.positions) {
      if (fen.split(' ').slice(0, 4).join(' ') === currentFen) {
        count++;
        if (count >= 3) return true;
      }
    }
    return false;
  }

  private getPgnResult(): string {
    if (!this._result) return '*';
    if (this._result.winner === 'white') return '1-0';
    if (this._result.winner === 'black') return '0-1';
    return '1/2-1/2';
  }
}
