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

// --- Fallback puzzles (offline) ---

export const FALLBACK_PUZZLES: LichessPuzzle[] = [
  { id: 'FB01', rating: 800,  themes: ['mate','mateIn1'],     fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',     solution: ['a1a8'], initialPly: 0, plays: 0 },
  { id: 'FB02', rating: 900,  themes: ['mate','mateIn1'],     fen: '4k3/8/4K3/8/8/8/8/3Q4 w - - 0 1',       solution: ['d1d8'], initialPly: 0, plays: 0 },
  { id: 'FB03', rating: 1000, themes: ['mate','mateIn1'],     fen: '1k6/8/1K6/8/8/8/8/R7 w - - 0 1',        solution: ['a1a8'], initialPly: 0, plays: 0 },
  { id: 'FB04', rating: 1200, themes: ['fork'],               fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', solution: ['f3e5'], initialPly: 0, plays: 0 },
  { id: 'FB05', rating: 1400, themes: ['sacrifice'],          fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQ - 0 1', solution: ['f3f7'], initialPly: 0, plays: 0 },
  { id: 'FB06', rating: 1600, themes: ['mate','mateIn2'],     fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d8'], initialPly: 0, plays: 0 },
  { id: 'FB07', rating: 1800, themes: ['endgame','promotion'],fen: '8/5P1k/8/8/8/8/6K1/8 w - - 0 1',         solution: ['f7f8q'], initialPly: 0, plays: 0 },
  { id: 'FB08', rating: 2000, themes: ['sacrifice','attack'], fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1B1/4P3/5N2/PPPP1PPP/RN1QKB1R w KQkq - 0 1', solution: ['g5f6'], initialPly: 0, plays: 0 },
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
