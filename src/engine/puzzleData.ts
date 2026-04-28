// ============================================
// puzzleData.ts — Chess Puzzles Database
// ============================================
// Puzzles categorizados por dificultad.
// Cada puzzle tiene: FEN, solución (movimientos), tema.

export interface Puzzle {
  id: number;
  fen: string;
  solution: string[]; // UCI format: ["e2e4", "d7d5"]
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  title: string;
}

export const puzzles: Puzzle[] = [
  // === EASY (Mates in 1) ===
  {
    id: 1, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Jaque mate con dama',
    fen: '6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 1',
    solution: ['b2g7'],
  },
  {
    id: 2, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Mate de pasillo',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['a1a8'],
  },
  {
    id: 3, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Mate con torre',
    fen: 'k7/8/1K6/8/8/8/8/R7 w - - 0 1',
    solution: ['a1a8'],
  },
  {
    id: 4, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Mate de alfil y dama',
    fen: 'r1bqk2r/pppp1Bpp/2n2n2/2b1p3/4P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solution: ['f3f7'],
  },
  {
    id: 5, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Dama al rescate',
    fen: '5rk1/5ppp/8/8/8/4Q3/5PPP/6K1 w - - 0 1',
    solution: ['e3e8'],
  },
  {
    id: 6, difficulty: 'easy', theme: 'Captura',
    title: 'Captura la dama',
    fen: 'rnb1kbnr/pppppppp/8/8/4q3/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1',
    solution: ['f3e5'], // Forking doesn't apply, but capturing vicinity
  },
  {
    id: 7, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Mate con dos torres',
    fen: '1k6/8/1K6/8/8/8/8/RR6 w - - 0 1',
    solution: ['a1a8'],
  },
  {
    id: 8, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Mate de Anastasia',
    fen: '4r1k1/5pNp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['a1a8'],
  },
  {
    id: 9, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Sacrificio y mate',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solution: ['f3f7'],
  },
  {
    id: 10, difficulty: 'easy', theme: 'Mate en 1',
    title: 'Mate del pasillo',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: ['d1d8'],
  },

  // === MEDIUM (Tactics - 2 moves) ===
  {
    id: 11, difficulty: 'medium', theme: 'Clavada',
    title: 'Alfil clava la dama',
    fen: 'r2qkb1r/ppp2ppp/2n2n2/3pp1B1/4P1b1/3P1N2/PPP2PPP/RN1QKB1R w KQkq - 0 1',
    solution: ['g5f6', 'g7f6'],
  },
  {
    id: 12, difficulty: 'medium', theme: 'Doble ataque',
    title: 'Caballo fork',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    solution: ['f3g5', 'f7f6'],
  },
  {
    id: 13, difficulty: 'medium', theme: 'Descubierta',
    title: 'Ataque descubierto',
    fen: 'r1bqkbnr/pppppppp/2n5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1',
    solution: ['c6d4', 'c2c3'],
  },
  {
    id: 14, difficulty: 'medium', theme: 'Sacrificio',
    title: 'Sacrificio de alfil',
    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 1',
    solution: ['e2e3', 'b4c3'],
  },
  {
    id: 15, difficulty: 'medium', theme: 'Mate en 2',
    title: 'Mate del pastor',
    fen: 'r1bqkbnr/pppppppp/2n5/8/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solution: ['f3f7'],
  },
  {
    id: 16, difficulty: 'medium', theme: 'Trampa',
    title: 'Ataque al rey expuesto',
    fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 1',
    solution: ['e5d4', 'f3d4'],
  },
  {
    id: 17, difficulty: 'medium', theme: 'Táctica',
    title: 'Ganando material',
    fen: 'r1bqkbnr/1ppppppp/p1n5/8/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1',
    solution: ['c6d4', 'f3d4'],
  },
  {
    id: 18, difficulty: 'medium', theme: 'Clavada',
    title: 'Torre clava pieza',
    fen: 'r2qk2r/ppp1bppp/2n2n2/3p2B1/3P4/2N2N2/PPP1PPPP/R2QKB1R w KQkq - 0 1',
    solution: ['g5f6', 'e7f6'],
  },
  {
    id: 19, difficulty: 'medium', theme: 'Ataque doble',
    title: 'Fork de caballo real',
    fen: 'r1bqk2r/ppppnppp/2n5/2b1p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1',
    solution: ['f3e5', 'c6e5'],
  },
  {
    id: 20, difficulty: 'medium', theme: 'Defensa',
    title: 'Bloqueo táctico',
    fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
    solution: ['e4e5', 'f6d5'],
  },

  // === HARD (Complex tactics - 2-3 moves) ===
  {
    id: 21, difficulty: 'hard', theme: 'Sacrificio',
    title: 'Sacrificio de dama para mate',
    fen: 'r1b1k2r/pppp1ppp/2n2n2/2b1p3/2BqP3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 1',
    solution: ['c4f7', 'e8f7'],
  },
  {
    id: 22, difficulty: 'hard', theme: 'Combinación',
    title: 'Combinación ganadora',
    fen: 'r2q1rk1/ppp2ppp/2n1bn2/3pp1B1/3PP1b1/2NB1N2/PPP2PPP/R2Q1RK1 w - - 0 1',
    solution: ['d4e5', 'f6e4'],
  },
  {
    id: 23, difficulty: 'hard', theme: 'Mate en 2',
    title: 'Mate sofocado clásico',
    fen: '6rk/5Npp/8/8/8/8/8/4K2R w - - 0 1',
    solution: ['h1h7'],
  },
  {
    id: 24, difficulty: 'hard', theme: 'Sacrificio',
    title: 'Doble sacrificio',
    fen: 'r1bq1rk1/ppp2ppp/2nb1n2/3pp3/2BPP3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
    solution: ['d4e5', 'd6e5'],
  },
  {
    id: 25, difficulty: 'hard', theme: 'Ataque',
    title: 'Ataque al enroque',
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
    solution: ['c4f7', 'f8f7'],
  },
  {
    id: 26, difficulty: 'hard', theme: 'Táctica avanzada',
    title: 'Zugzwang posicional',
    fen: 'r2qr1k1/ppp2ppp/2npbn2/2b1p3/4P3/1BNP1N2/PPP2PPP/R1BQR1K1 w - - 0 1',
    solution: ['c3d5', 'f6d5'],
  },
  {
    id: 27, difficulty: 'hard', theme: 'Mate',
    title: 'Mate artístico',
    fen: '5rk1/1p3ppp/pq6/8/8/1P2B3/P4PPP/3Q2K1 w - - 0 1',
    solution: ['d1d8', 'f8d8'],
  },
  {
    id: 28, difficulty: 'hard', theme: 'Combinación',
    title: 'Gambito de dama',
    fen: 'r1b1kb1r/pppp1ppp/2n2n2/4p2q/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
    solution: ['f3e5', 'h5e2'],
  },
  {
    id: 29, difficulty: 'hard', theme: 'Final',
    title: 'Promoción forzada',
    fen: '8/5P1k/8/8/8/8/6K1/8 w - - 0 1',
    solution: ['f7f8q'],
  },
  {
    id: 30, difficulty: 'hard', theme: 'Táctica maestra',
    title: 'Tema de desviación',
    fen: 'r2qk2r/ppp1bppp/2n2n2/3p2B1/3P1B2/2N2N2/PPP1PPPP/R2QK2R b KQkq - 0 1',
    solution: ['f6e4', 'g5e7'],
  },
];

/**
 * Get puzzles by difficulty.
 */
export function getPuzzlesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Puzzle[] {
  return puzzles.filter(p => p.difficulty === difficulty);
}

/**
 * Get a random puzzle of given difficulty.
 */
export function getRandomPuzzle(difficulty: 'easy' | 'medium' | 'hard'): Puzzle {
  const pool = getPuzzlesByDifficulty(difficulty);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get puzzle difficulty based on streak.
 */
export function getDifficultyForStreak(streak: number): 'easy' | 'medium' | 'hard' {
  if (streak < 3) return 'easy';
  if (streak < 7) return 'medium';
  return 'hard';
}
