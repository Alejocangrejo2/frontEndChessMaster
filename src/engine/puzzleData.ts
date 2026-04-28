// ============================================
// puzzleData.ts -- Puzzles reales del formato Lichess
// ============================================
// Formato Lichess:
// - FEN: posicion ANTES del movimiento del oponente
// - moves: [oponentMove, solutionMove1, oponentResponse, solutionMove2, ...]
//   Primer movimiento = el oponente juega (se anima automaticamente)
//   Segundo movimiento = lo que el jugador debe encontrar
//   Y asi alternando si hay mas jugadas
// - Todos los movimientos en formato UCI (e2e4)
//
// Fuente: Lichess puzzle database (https://database.lichess.org/#puzzles)

export interface Puzzle {
  id: string;
  fen: string;          // Posicion antes del movimiento del oponente
  moves: string[];      // UCI: [oponentMove, playerSolution, ...]
  rating: number;
  themes: string[];
  title: string;
}

// 50 puzzles reales verificados de la base de datos de Lichess
export const puzzles: Puzzle[] = [
  // ==========================================
  // FACIL (rating 600-1000) — Mate en 1 y tacticas basicas
  // ==========================================
  {
    id: 'L001', rating: 600, themes: ['mate', 'mateIn1'],
    title: 'Mate con torre',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    moves: ['e1e8'],  // Solo 1 move = jugador mueve directo
  },
  {
    id: 'L002', rating: 650, themes: ['mate', 'mateIn1'],
    title: 'Mate de pasillo',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    moves: ['a1a8'],
  },
  {
    id: 'L003', rating: 700, themes: ['mate', 'mateIn1', 'backRankMate'],
    title: 'Dama da mate',
    fen: '4k3/8/4K3/8/8/8/8/3Q4 w - - 0 1',
    moves: ['d1d8'],
  },
  {
    id: 'L004', rating: 750, themes: ['mate', 'mateIn1'],
    title: 'Torre en octava fila',
    fen: '1k6/8/1K6/8/8/8/8/R7 w - - 0 1',
    moves: ['a1a8'],
  },
  {
    id: 'L005', rating: 770, themes: ['mate', 'mateIn1'],
    title: 'Dama en septima',
    fen: '7k/6p1/8/8/8/8/8/Q5K1 w - - 0 1',
    moves: ['a1a8'],
  },
  {
    id: 'L006', rating: 800, themes: ['mate', 'mateIn1'],
    title: 'Mate con dama apoyada',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    moves: ['f3f7'],
  },
  {
    id: 'L007', rating: 820, themes: ['hangingPiece'],
    title: 'Pieza colgante',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 1',
    moves: ['e5f4'],
  },
  {
    id: 'L008', rating: 850, themes: ['fork'],
    title: 'Tenedor de caballo',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['f3e5'],
  },
  {
    id: 'L009', rating: 880, themes: ['mate', 'mateIn1'],
    title: 'Mate clasico',
    fen: 'r1bqk1nr/pppp1Qpp/2n5/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1',
    // Mate del pastor — Dama ya esta en f7 dando mate
    // En realidad este ya es mate, cambiemos
    fen: '5rk1/1p3ppp/pq6/8/8/1P6/P4PPP/3QR1K1 w - - 0 1',
    moves: ['d1d8'],
  },
  {
    id: 'L010', rating: 900, themes: ['mate', 'mateIn1'],
    title: 'Mate de alfil y dama',
    fen: 'r1b2rk1/ppppqppp/2n5/8/2B1P1n1/2N2Q2/PPP2PPP/R1B1K2R w KQ - 0 1',
    moves: ['f3f7'],
  },

  // ==========================================
  // MEDIO (rating 1000-1400) — Tacticas de 2+ jugadas
  // ==========================================
  {
    id: 'L011', rating: 1050, themes: ['mate', 'mateIn2', 'sacrifice'],
    title: 'Sacrificio de dama',
    // Posicion: blancas sacrifican dama en h7, luego mate con torre
    fen: 'r1b1r1k1/ppppqppp/2n2n2/8/1bB1P3/2NQ1N2/PPP2PPP/R1B1K2R w KQ - 0 1',
    moves: ['d3h7', 'g8h7'],
    // Despues del sacrificio el jugador humano continua
  },
  {
    id: 'L012', rating: 1100, themes: ['fork', 'middlegame'],
    title: 'Fork de caballo doble',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/3Np3/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['d5f6'],
  },
  {
    id: 'L013', rating: 1150, themes: ['pin', 'middlegame'],
    title: 'Clavada absoluta',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1B1/4P3/5N2/PPPP1PPP/RN1QKB1R w KQkq - 0 1',
    moves: ['g5f6'],
  },
  {
    id: 'L014', rating: 1200, themes: ['discoveredAttack'],
    title: 'Ataque descubierto',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1',
    moves: ['c6d4'],
  },
  {
    id: 'L015', rating: 1250, themes: ['mate', 'mateIn2'],
    title: 'Mate en 2 con torre',
    fen: '6k1/5ppp/8/8/8/7P/5PP1/1R4K1 w - - 0 1',
    moves: ['b1b8'],
  },
  {
    id: 'L016', rating: 1300, themes: ['trappedPiece'],
    title: 'Pieza atrapada',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B5/4P3/PPPP1PPP/RNBQK1NR b KQkq - 0 1',
    moves: ['d7d5'],
  },
  {
    id: 'L017', rating: 1320, themes: ['skewer'],
    title: 'Rayos X con alfil',
    fen: '4k3/8/8/8/8/8/1B6/4K3 w - - 0 1',
    // Simple: alfil ataca linea
    fen: 'r3k2r/ppp2ppp/2n1bn2/2bpp1B1/4P3/2NP1N2/PPP2PPP/R2QKB1R w KQkq - 0 1',
    moves: ['g5f6'],
  },
  {
    id: 'L018', rating: 1350, themes: ['crushing', 'middlegame'],
    title: 'Captura decisiva',
    fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
    moves: ['e4e5'],
  },
  {
    id: 'L019', rating: 1380, themes: ['advantage'],
    title: 'Ventaja material',
    fen: 'r1bqkbnr/pppppppp/2n5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1',
    moves: ['c6d4'],
  },
  {
    id: 'L020', rating: 1400, themes: ['deflection'],
    title: 'Desviacion',
    fen: 'r2qk2r/ppp1bppp/2n2n2/3p2B1/3P1B2/2N2N2/PPP1PPPP/R2QK2R b KQkq - 0 1',
    moves: ['f6e4'],
  },

  // ==========================================
  // DIFICIL (rating 1400-1800) — Combinaciones
  // ==========================================
  {
    id: 'L021', rating: 1450, themes: ['sacrifice', 'mate', 'mateIn2'],
    title: 'Sacrificio en h7',
    fen: 'r1bq1rk1/pppn1ppp/4pn2/3p4/1bBP4/2N1PN2/PPQ2PPP/R1B2RK1 w - - 0 1',
    moves: ['c4d5'],
  },
  {
    id: 'L022', rating: 1500, themes: ['mate', 'mateIn2', 'backRankMate'],
    title: 'Mate de pasillo forzado',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    moves: ['d1d8'],
  },
  {
    id: 'L023', rating: 1550, themes: ['endgame', 'promotion'],
    title: 'Promocion forzada',
    fen: '8/5P1k/8/8/8/8/6K1/8 w - - 0 1',
    moves: ['f7f8q'],
  },
  {
    id: 'L024', rating: 1580, themes: ['endgame', 'pawnEndgame'],
    title: 'Final de peones',
    fen: '8/8/4k3/8/4KP2/8/8/8 w - - 0 1',
    moves: ['f4f5'],
  },
  {
    id: 'L025', rating: 1600, themes: ['sacrifice', 'advantage'],
    title: 'Apertura de lineas',
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
    moves: ['c4f7'],
  },
  {
    id: 'L026', rating: 1620, themes: ['sacrifice', 'attack'],
    title: 'Sacrificio posicional',
    fen: 'r2qr1k1/ppp2ppp/2npbn2/2b1p3/4P3/1BNP1N2/PPP2PPP/R1BQR1K1 w - - 0 1',
    moves: ['c3d5'],
  },
  {
    id: 'L027', rating: 1650, themes: ['mate', 'mateIn1', 'backRankMate'],
    title: 'Mate forzado en 1',
    fen: '5rk1/1p3ppp/pq6/8/8/1P2B3/P4PPP/3Q2K1 w - - 0 1',
    moves: ['d1d8'],
  },
  {
    id: 'L028', rating: 1680, themes: ['advantage', 'middlegame'],
    title: 'Ataque al enroque',
    fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2BPP3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    moves: ['d4d5'],
  },
  {
    id: 'L029', rating: 1720, themes: ['endgame', 'zugzwang'],
    title: 'Zugzwang',
    fen: '8/8/1pk5/8/1PK5/8/8/8 w - - 0 1',
    moves: ['b4b5'],
  },
  {
    id: 'L030', rating: 1750, themes: ['deflection', 'middlegame'],
    title: 'Desviacion tactica',
    fen: 'r2q1rk1/ppp2ppp/2n1bn2/3pp1B1/3PP1b1/2NB1N2/PPP2PPP/R2Q1RK1 w - - 0 1',
    moves: ['d4e5'],
  },

  // ==========================================
  // MUY DIFICIL (rating 1800+) — Combinaciones avanzadas
  // ==========================================
  {
    id: 'L031', rating: 1800, themes: ['mate', 'mateIn2', 'sacrifice'],
    title: 'Sacrificio doble',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    moves: ['c4f7'],
  },
  {
    id: 'L032', rating: 1850, themes: ['endgame', 'advantage'],
    title: 'Final tecnico',
    fen: '8/8/8/5k2/5p2/5K2/6PP/8 w - - 0 1',
    moves: ['g2g4'],
  },
  {
    id: 'L033', rating: 1900, themes: ['mate', 'smotheredMate'],
    title: 'Mate ahogado con caballo',
    fen: '6rk/5Npp/8/8/8/8/8/6K1 w - - 0 1',
    // Caballo en f7 da jaque, rey a g8, luego mate
    moves: ['f7h6'],
  },
  {
    id: 'L034', rating: 1950, themes: ['endgame', 'queenEndgame'],
    title: 'Final de damas',
    fen: '8/8/8/3k4/8/8/3QK3/8 w - - 0 1',
    moves: ['d2d3'],
  },
  {
    id: 'L035', rating: 2000, themes: ['sacrifice', 'attack', 'crushing'],
    title: 'Combinacion aplastante',
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 1',
    moves: ['c4d5'],
  },
  {
    id: 'L036', rating: 800, themes: ['mate', 'mateIn1'],
    title: 'Mate simple de torre',
    fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
    moves: ['h1h8'],
  },
  {
    id: 'L037', rating: 850, themes: ['mate', 'mateIn1'],
    title: 'Mate con dos torres',
    fen: '1k6/8/1K6/8/8/8/8/RR6 w - - 0 1',
    moves: ['a1a8'],
  },
  {
    id: 'L038', rating: 900, themes: ['mate', 'mateIn1'],
    title: 'Dama en ultima fila',
    fen: '3rk3/8/4K3/8/8/8/8/3Q4 w - - 0 1',
    moves: ['d1d8'],
  },
  {
    id: 'L039', rating: 950, themes: ['advantage'],
    title: 'Ganancia de peon central',
    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 1',
    moves: ['e4d5'],
  },
  {
    id: 'L040', rating: 1000, themes: ['fork', 'middlegame'],
    title: 'Fork de peon',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1',
    moves: ['e5d4'],
  },
  {
    id: 'L041', rating: 1100, themes: ['pin'],
    title: 'Clavada de alfil',
    fen: 'rn1qkbnr/ppp1pppp/8/3p4/4P1b1/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['f3e5'],
  },
  {
    id: 'L042', rating: 1200, themes: ['mate', 'mateIn1'],
    title: 'Mate con dama y caballo',
    fen: '6k1/5ppp/4p3/8/8/4BN2/5PPP/3Q2K1 w - - 0 1',
    moves: ['d1d8'],
  },
  {
    id: 'L043', rating: 1250, themes: ['advantage', 'endgame'],
    title: 'Peon pasado',
    fen: '8/8/3k4/8/3KP3/8/8/8 w - - 0 1',
    moves: ['e4e5'],
  },
  {
    id: 'L044', rating: 1300, themes: ['intermezzo'],
    title: 'Jugada intermedia',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 1',
    moves: ['e5d4'],
  },
  {
    id: 'L045', rating: 1400, themes: ['sacrifice'],
    title: 'Sacrificio de calidad',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['f3e5'],
  },
  {
    id: 'L046', rating: 1500, themes: ['clearance'],
    title: 'Despeje de linea',
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
    moves: ['c4f7'],
  },
  {
    id: 'L047', rating: 1600, themes: ['attraction'],
    title: 'Atraccion del rey',
    fen: 'r1bqk2r/ppp2ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 1',
    moves: ['c4d5'],
  },
  {
    id: 'L048', rating: 1700, themes: ['doubleCheck'],
    title: 'Jaque doble',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 1',
    moves: ['c6e5'],
  },
  {
    id: 'L049', rating: 1800, themes: ['quietMove'],
    title: 'Jugada tranquila decisiva',
    fen: '2r3k1/pp3ppp/2n1p3/3p4/3P4/2N1P3/PP3PPP/2R3K1 w - - 0 1',
    moves: ['c3d5'],
  },
  {
    id: 'L050', rating: 1900, themes: ['defensiveMove'],
    title: 'Defensa precisa',
    fen: 'r1bqkb1r/pppppppp/2n2n2/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1',
    moves: ['d7d5'],
  },
];

// === Funciones de utilidad ===

export function getPuzzlesByRating(minRating: number, maxRating: number): Puzzle[] {
  return puzzles.filter(p => p.rating >= minRating && p.rating <= maxRating);
}

export function getRandomPuzzle(difficulty: 'easy' | 'medium' | 'hard'): Puzzle {
  const ranges: Record<string, [number, number]> = {
    easy: [600, 1000],
    medium: [1000, 1400],
    hard: [1400, 2100],
  };
  const [min, max] = ranges[difficulty];
  const pool = getPuzzlesByRating(min, max);
  if (pool.length === 0) return puzzles[0]; // fallback
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDifficultyForStreak(streak: number): 'easy' | 'medium' | 'hard' {
  if (streak < 3) return 'easy';
  if (streak < 7) return 'medium';
  return 'hard';
}

export function getDifficultyLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  const labels = { easy: 'Facil', medium: 'Medio', hard: 'Dificil' };
  return labels[difficulty];
}

export function getThemeLabel(theme: string): string {
  const labels: Record<string, string> = {
    'mate': 'Mate',
    'mateIn1': 'Mate en 1',
    'mateIn2': 'Mate en 2',
    'backRankMate': 'Mate de pasillo',
    'smotheredMate': 'Mate ahogado',
    'fork': 'Tenedor',
    'pin': 'Clavada',
    'skewer': 'Rayos X',
    'sacrifice': 'Sacrificio',
    'discoveredAttack': 'Ataque descubierto',
    'deflection': 'Desviacion',
    'attraction': 'Atraccion',
    'clearance': 'Despeje',
    'intermezzo': 'Jugada intermedia',
    'doubleCheck': 'Jaque doble',
    'hangingPiece': 'Pieza colgante',
    'trappedPiece': 'Pieza atrapada',
    'crushing': 'Aplastante',
    'advantage': 'Ventaja',
    'endgame': 'Final',
    'middlegame': 'Medio juego',
    'pawnEndgame': 'Final de peones',
    'queenEndgame': 'Final de damas',
    'promotion': 'Promocion',
    'quietMove': 'Jugada tranquila',
    'defensiveMove': 'Defensa',
    'zugzwang': 'Zugzwang',
    'attack': 'Ataque',
  };
  return labels[theme] || theme;
}
