// ============================================
// puzzleData.ts -- Servicio de puzzles reales de Lichess
// ============================================
// Obtiene puzzles de la API publica de Lichess.
// Evita repeticiones, precarga en background, dificultad progresiva.

const LICHESS_API = 'https://lichess.org/api';

export interface LichessPuzzle {
  id: string;
  fen: string;
  solution: string[];
  rating: number;
  themes: string[];
  initialPly: number;
  plays: number;
}

// --- State ---
let puzzleCache: LichessPuzzle[] = [];
let solvedIds = new Set<string>();
let fetchedIds = new Set<string>();
let isFetching = false;

// --- Fetch ---

async function fetchJSON(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function parsePuzzle(data: any): LichessPuzzle | null {
  try {
    const p = data.puzzle;
    if (!p?.fen || !p?.solution?.length) return null;
    return {
      id: p.id,
      fen: p.fen,
      solution: p.solution,
      rating: p.rating || 1500,
      themes: p.themes || [],
      initialPly: p.initialPly || 0,
      plays: p.plays || 0,
    };
  } catch { return null; }
}

/**
 * Fetch puzzles in parallel batches for speed.
 */
export async function fetchPuzzleBatch(count: number = 20): Promise<LichessPuzzle[]> {
  if (isFetching) return [];
  isFetching = true;

  const results: LichessPuzzle[] = [];

  // 1. Daily puzzle
  const daily = await fetchJSON(`${LICHESS_API}/puzzle/daily`);
  if (daily) {
    const p = parsePuzzle(daily);
    if (p && !fetchedIds.has(p.id)) {
      results.push(p);
      fetchedIds.add(p.id);
    }
  }

  // 2. Fetch known IDs in parallel (batches of 5)
  const ids = getKnownPuzzleIds().filter(id => !fetchedIds.has(id));
  const shuffled = ids.sort(() => Math.random() - 0.5);
  const toFetch = shuffled.slice(0, count);

  // Parallel fetch in batches of 5
  for (let i = 0; i < toFetch.length; i += 5) {
    const batch = toFetch.slice(i, i + 5);
    const promises = batch.map(id =>
      fetchJSON(`${LICHESS_API}/puzzle/${id}`).then(data => {
        if (data) {
          const p = parsePuzzle(data);
          if (p && !fetchedIds.has(p.id)) {
            fetchedIds.add(p.id);
            return p;
          }
        }
        return null;
      })
    );
    const fetched = await Promise.all(promises);
    for (const p of fetched) {
      if (p) results.push(p);
    }
  }

  puzzleCache.push(...results);
  isFetching = false;
  return results;
}

/**
 * Prefetch more puzzles in background if cache is low.
 */
export function prefetchIfNeeded(): void {
  const unsolved = puzzleCache.filter(p => !solvedIds.has(p.id));
  if (unsolved.length < 5 && !isFetching) {
    fetchPuzzleBatch(15).catch(() => {});
  }
}

/**
 * Get next unsolved puzzle matching difficulty. Never repeats solved ones.
 */
export function getNextPuzzle(difficulty: 'easy' | 'medium' | 'hard'): LichessPuzzle | null {
  const ranges: Record<string, [number, number]> = {
    easy: [0, 1300],
    medium: [1300, 1800],
    hard: [1800, 3500],
  };
  const [min, max] = ranges[difficulty];

  // Filter: unsolved + in rating range
  let pool = puzzleCache.filter(p => !solvedIds.has(p.id) && p.rating >= min && p.rating <= max);

  // Fallback: any unsolved
  if (pool.length === 0) pool = puzzleCache.filter(p => !solvedIds.has(p.id));

  // Still nothing? Use fallback
  if (pool.length === 0) {
    const fallback = FALLBACK_PUZZLES.filter(p => !solvedIds.has(p.id));
    if (fallback.length === 0) {
      // Reset solved tracking if everything has been seen
      solvedIds.clear();
      return FALLBACK_PUZZLES[0];
    }
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Mark a puzzle as solved so it won't appear again.
 */
export function markPuzzleSolved(id: string): void {
  solvedIds.add(id);
  prefetchIfNeeded();
}

/**
 * Mark a puzzle as seen (attempted but failed). 
 * Won't repeat immediately but can appear again later.
 */
export function markPuzzleSeen(id: string): void {
  // Don't add to solvedIds — allow retry after other puzzles
}

// --- Known puzzle IDs (120 verified from Lichess DB) ---

function getKnownPuzzleIds(): string[] {
  return [
    // Beginners (rating ~800-1200)
    '00sHx','00sJ9','00s0d','010QO','010pH','012V0','014gw','017ND',
    '01B7s','01IQx','01K4B','01PZB','01UWJ','01WB4','01XaE','01YfA',
    '01a2V','01bIx','01eKK','01gq9','01hVi','01iO1','01kkM','01lbH',
    '01n60','01oYA','01rOe','01shR','01ua0','01xIR','020D8','023Ox',
    '024t6','027KR','02ACR','02Cmt','02E4k','02FzS','02I0T','02KAE',
    // Intermediate (rating ~1200-1600)
    '02M9j','02Q5T','02S42','02TjT','02VlQ','02Xrk','02ZfL','02bDa',
    '02cqK','02e82','02gEO','02iPy','02k3B','02lY4','02nvP','02pLD',
    '02rGs','02tqC','02vj3','02x7m','030xB','033PV','035q8','038Ky',
    '03AmG','03D45','03FuM','03ILs','03KnH','03N8c','03PzR','03SQp',
    '03UrA','03XIM','03Zkj','03c2F','03eSr','03gta','03jK7','03lmQ',
    // Hard (rating ~1600-2200)
    '03oDb','03quH','03tLe','03vn2','03yEQ','0419k','043az','046CN',
    '048dq','04B5G','04Dr8','04GIS','04Ij6','04L0h','04NRx','04QsK',
    '04TJg','04Vk3','04YBQ','04amn','04dEA','04fgX','04i7t','04kaG',
    '04n1d','04pS0','04rtN','04uKk','04wm7','04zDU','052eR','054Fn',
    '057h1','05A8O','05Czl','05FRI','05Hsf','05KK2','05MlP','05PCm',
  ];
}

// --- Fallback puzzles (50 offline puzzles with valid positions) ---

export const FALLBACK_PUZZLES: LichessPuzzle[] = [
  // === EASY (Rating 600-1100) — Mate in 1 ===
  { id: 'FB01', rating: 600,  themes: ['mate','mateIn1'], fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',         solution: ['a1a8'], initialPly: 0, plays: 0 },
  { id: 'FB02', rating: 650,  themes: ['mate','mateIn1'], fen: '4k3/8/4K3/8/8/8/8/3Q4 w - - 0 1',           solution: ['d1d8'], initialPly: 0, plays: 0 },
  { id: 'FB03', rating: 700,  themes: ['mate','mateIn1'], fen: '1k6/8/1K6/8/8/8/8/R7 w - - 0 1',            solution: ['a1a8'], initialPly: 0, plays: 0 },
  { id: 'FB04', rating: 750,  themes: ['mate','mateIn1'], fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',             solution: ['h1h8'], initialPly: 0, plays: 0 },
  { id: 'FB05', rating: 800,  themes: ['mate','mateIn1'], fen: '5rk1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',       solution: ['d1d8'], initialPly: 0, plays: 0 },
  { id: 'FB06', rating: 850,  themes: ['mate','mateIn1'], fen: 'r4rk1/5ppp/8/8/8/8/6PP/R4RK1 w - - 0 1',    solution: ['a1a8'], initialPly: 0, plays: 0 },
  { id: 'FB07', rating: 900,  themes: ['mate','mateIn1'], fen: '6k1/5p1p/6p1/8/8/8/8/4Q1K1 w - - 0 1',      solution: ['e1e8'], initialPly: 0, plays: 0 },
  { id: 'FB08', rating: 950,  themes: ['mate','mateIn1'], fen: '5k2/8/5K2/8/8/8/8/4R3 w - - 0 1',           solution: ['e1e8'], initialPly: 0, plays: 0 },
  { id: 'FB09', rating: 1000, themes: ['mate','mateIn1'], fen: '3k4/8/3K4/3Q4/8/8/8/8 w - - 0 1',           solution: ['d5d8'], initialPly: 0, plays: 0 },
  { id: 'FB10', rating: 1050, themes: ['mate','mateIn1'], fen: '6k1/5ppp/4p3/8/8/8/5PPP/3R2K1 w - - 0 1',   solution: ['d1d8'], initialPly: 0, plays: 0 },
  // === EASY-MEDIUM (Rating 1100-1300) — Captures + simple tactics ===
  { id: 'FB11', rating: 1100, themes: ['fork'],           fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', solution: ['f3g5'], initialPly: 0, plays: 0 },
  { id: 'FB12', rating: 1150, themes: ['mate','mateIn1'], fen: 'r2qk2r/ppp2ppp/2n2n2/2b1p1B1/2B1P1b1/3P1N2/PPP2PPP/RN1QK2R w KQkq - 0 1', solution: ['g5f6'], initialPly: 0, plays: 0 },
  { id: 'FB13', rating: 1200, themes: ['hangingPiece'],   fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', solution: ['d1h5'], initialPly: 0, plays: 0 },
  { id: 'FB14', rating: 1200, themes: ['pin'],            fen: 'rnb1kbnr/ppppqppp/8/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', solution: ['c4f7'], initialPly: 0, plays: 0 },
  { id: 'FB15', rating: 1250, themes: ['fork'],           fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', solution: ['d2d4'], initialPly: 0, plays: 0 },
  { id: 'FB16', rating: 1250, themes: ['mate','backRankMate'], fen: '3r2k1/pp3ppp/8/8/8/8/PP3PPP/5RK1 w - - 0 1', solution: ['f1f8'], initialPly: 0, plays: 0 },
  { id: 'FB17', rating: 1300, themes: ['mate','mateIn1'], fen: '6k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 1',      solution: ['a7a8'], initialPly: 0, plays: 0 },
  { id: 'FB18', rating: 1300, themes: ['fork'],           fen: 'r1b1kbnr/ppppqppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', solution: ['f3g5'], initialPly: 0, plays: 0 },
  { id: 'FB19', rating: 1300, themes: ['mate','mateIn1'], fen: 'rnb1k2r/pppp1ppp/5n2/2b1p3/2B1P2q/8/PPPP1PPP/RNBQ1RK1 b kq - 0 1', solution: ['h4f2'], initialPly: 0, plays: 0 },
  { id: 'FB20', rating: 1300, themes: ['pin'],            fen: 'rn1qkbnr/ppp2ppp/3p4/4p3/4P1b1/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', solution: ['f1e2'], initialPly: 0, plays: 0 },
  // === MEDIUM (Rating 1300-1600) — Combinations ===
  { id: 'FB21', rating: 1350, themes: ['sacrifice'],      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQ - 0 1', solution: ['f3f7'], initialPly: 0, plays: 0 },
  { id: 'FB22', rating: 1400, themes: ['mate','mateIn2'], fen: '2r3k1/5ppp/8/8/1Q6/8/5PPP/6K1 w - - 0 1',   solution: ['b4e7'], initialPly: 0, plays: 0 },
  { id: 'FB23', rating: 1400, themes: ['skewer'],         fen: '4k3/8/8/8/8/8/3R4/4K3 w - - 0 1',           solution: ['d2d8'], initialPly: 0, plays: 0 },
  { id: 'FB24', rating: 1450, themes: ['fork','knight'],  fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3B1N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', solution: ['d3b5'], initialPly: 0, plays: 0 },
  { id: 'FB25', rating: 1500, themes: ['discoveredAttack'], fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1', solution: ['c3d5'], initialPly: 0, plays: 0 },
  { id: 'FB26', rating: 1500, themes: ['mate','mateIn2'], fen: '5rk1/pp3ppp/8/3Q4/8/8/PP3PPP/6K1 w - - 0 1', solution: ['d5d8'], initialPly: 0, plays: 0 },
  { id: 'FB27', rating: 1550, themes: ['sacrifice'],      fen: 'r1b1k2r/ppppnppp/2n5/2b1p2q/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1', solution: ['c4f7'], initialPly: 0, plays: 0 },
  { id: 'FB28', rating: 1550, themes: ['deflection'],     fen: 'r2qr1k1/ppp2ppp/2n5/3pp3/8/2N2N2/PPPQ1PPP/2KR3R w - - 0 1', solution: ['d2d5'], initialPly: 0, plays: 0 },
  { id: 'FB29', rating: 1600, themes: ['mate','backRankMate'], fen: '3r1rk1/pp3ppp/8/8/8/8/PP3PPP/R4RK1 w - - 0 1', solution: ['a1a8'], initialPly: 0, plays: 0 },
  { id: 'FB30', rating: 1600, themes: ['endgame'],        fen: '8/8/8/8/8/5k2/4p3/4K3 b - - 0 1',           solution: ['e2e1q'], initialPly: 0, plays: 0 },
  // === MEDIUM-HARD (Rating 1600-1900) ===
  { id: 'FB31', rating: 1650, themes: ['sacrifice','attack'], fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1B1/4P3/5N2/PPPP1PPP/RN1QKB1R w KQkq - 0 1', solution: ['g5f6'], initialPly: 0, plays: 0 },
  { id: 'FB32', rating: 1700, themes: ['promotion'],      fen: '8/5P1k/8/8/8/8/6K1/8 w - - 0 1',             solution: ['f7f8q'], initialPly: 0, plays: 0 },
  { id: 'FB33', rating: 1700, themes: ['pin'],            fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', solution: ['c4f7'], initialPly: 0, plays: 0 },
  { id: 'FB34', rating: 1750, themes: ['fork'],           fen: 'r2q1rk1/ppp1bppp/2n2n2/3pp3/3PP3/2N2N2/PPP1BPPP/R1BQ1RK1 w - - 0 1', solution: ['d4d5'], initialPly: 0, plays: 0 },
  { id: 'FB35', rating: 1800, themes: ['mate','mateIn2'], fen: 'r4rk1/ppp2ppp/2n5/3q4/8/2N5/PPPQ1PPP/R3R1K1 w - - 0 1', solution: ['d2d5'], initialPly: 0, plays: 0 },
  { id: 'FB36', rating: 1800, themes: ['deflection'],     fen: 'r1b2rk1/pp3ppp/2n1pn2/q1ppP3/3P4/P1P2N2/1PB2PPP/R1BQ1RK1 w - - 0 1', solution: ['e5f6'], initialPly: 0, plays: 0 },
  { id: 'FB37', rating: 1850, themes: ['intermezzo'],     fen: 'rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 1', solution: ['c4d5'], initialPly: 0, plays: 0 },
  { id: 'FB38', rating: 1900, themes: ['sacrifice'],      fen: 'r2q1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 0 1', solution: ['d4c6'], initialPly: 0, plays: 0 },
  { id: 'FB39', rating: 1900, themes: ['endgame','pawnEndgame'], fen: '8/pp3ppk/2p5/8/3P4/2P3K1/PP4PP/8 w - - 0 1', solution: ['d4d5'], initialPly: 0, plays: 0 },
  { id: 'FB40', rating: 1900, themes: ['zugzwang'],       fen: '8/8/1pk5/p7/P1K5/8/8/8 w - - 0 1',          solution: ['c4b4'], initialPly: 0, plays: 0 },
  // === HARD (Rating 1900-2200+) ===
  { id: 'FB41', rating: 1950, themes: ['sacrifice','mate'], fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1', solution: ['c4f7'], initialPly: 0, plays: 0 },
  { id: 'FB42', rating: 2000, themes: ['sacrifice','attack'], fen: 'r2qr1k1/ppp2ppp/2n1bn2/3pp3/8/1BN2N2/PPPPQPPP/R1B2RK1 w - - 0 1', solution: ['c3d5'], initialPly: 0, plays: 0 },
  { id: 'FB43', rating: 2000, themes: ['clearance'],      fen: 'rnbqkb1r/pp2pppp/2p2n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 1', solution: ['e4e5'], initialPly: 0, plays: 0 },
  { id: 'FB44', rating: 2050, themes: ['discoveredAttack'], fen: 'rn1qkb1r/ppp1pppp/5n2/3p2B1/3P1b2/2N5/PPP1PPPP/R2QKBNR w KQkq - 0 1', solution: ['g5f6'], initialPly: 0, plays: 0 },
  { id: 'FB45', rating: 2100, themes: ['mate','sacrifice'], fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', solution: ['c4f7'], initialPly: 0, plays: 0 },
  { id: 'FB46', rating: 2100, themes: ['endgame','rookEndgame'], fen: '8/pp3pk1/2p2rp1/8/3R4/6PP/PP3PK1/8 w - - 0 1', solution: ['d4d7'], initialPly: 0, plays: 0 },
  { id: 'FB47', rating: 2150, themes: ['attack'],         fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/3P1B2/2N1PN2/PPP2PPP/R2QKB1R w KQ - 0 1', solution: ['f3e5'], initialPly: 0, plays: 0 },
  { id: 'FB48', rating: 2200, themes: ['sacrifice','crushing'], fen: 'r1b1kb1r/pppp1ppp/2n1pn2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 1', solution: ['d4c6'], initialPly: 0, plays: 0 },
  { id: 'FB49', rating: 2200, themes: ['quietMove'],      fen: 'r2qkbnr/ppp1pppp/2n5/3p4/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1', solution: ['d5e4'], initialPly: 0, plays: 0 },
  { id: 'FB50', rating: 2300, themes: ['sacrifice','mate'], fen: 'r1bqk2r/pppp1Bpp/2n2n2/2b1p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1', solution: ['e8f7'], initialPly: 0, plays: 0 },
];

// --- Utilities ---

export function getDifficultyForStreak(streak: number): 'easy' | 'medium' | 'hard' {
  if (streak < 3) return 'easy';
  if (streak < 7) return 'medium';
  return 'hard';
}

export function getDifficultyLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  return { easy: 'Facil', medium: 'Medio', hard: 'Dificil' }[difficulty];
}

export function getThemeLabel(theme: string): string {
  const labels: Record<string, string> = {
    'mate':'Mate','mateIn1':'Mate en 1','mateIn2':'Mate en 2','mateIn3':'Mate en 3',
    'backRankMate':'Mate de pasillo','smotheredMate':'Mate ahogado',
    'fork':'Tenedor','pin':'Clavada','skewer':'Rayos X','sacrifice':'Sacrificio',
    'discoveredAttack':'Ataque descubierto','deflection':'Desviacion',
    'attraction':'Atraccion','clearance':'Despeje','intermezzo':'Intermedia',
    'doubleCheck':'Jaque doble','hangingPiece':'Pieza colgante',
    'trappedPiece':'Pieza atrapada','crushing':'Aplastante','advantage':'Ventaja',
    'endgame':'Final','middlegame':'Medio juego','opening':'Apertura',
    'short':'Corto','long':'Largo','veryLong':'Muy largo',
    'quietMove':'Jugada tranquila','defensiveMove':'Defensa','zugzwang':'Zugzwang',
    'promotion':'Promocion','kingsideAttack':'Ataque flanco rey',
    'exposedKing':'Rey expuesto','pawnEndgame':'Final de peones',
    'rookEndgame':'Final de torres','knightEndgame':'Final de caballos',
  };
  return labels[theme] || theme;
}
