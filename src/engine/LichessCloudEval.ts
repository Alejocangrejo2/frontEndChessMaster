// ============================================
// LichessCloudEval.ts — Evaluaciones de Lichess Cloud
// ============================================
// Usa la API oficial de Lichess para obtener evaluaciones
// de posiciones de Stockfish pre-calculadas.
// Endpoint: GET https://lichess.org/api/cloud-eval?fen=...
// Docs: https://lichess.org/api#tag/Analysis/operation/apiCloudEval

export interface CloudEvalResult {
  fen: string;
  knodes: number;
  depth: number;
  cp?: number;     // centipawns (from white's perspective)
  mate?: number;   // mate in N (positive = white mates, negative = black mates)
  bestMove?: string; // best move in UCI format (e.g. "e2e4")
}

const LICHESS_API = 'https://lichess.org/api/cloud-eval';

// Cache to avoid redundant API calls
const evalCache = new Map<string, CloudEvalResult | null>();

/**
 * Fetch cloud evaluation for a single FEN position.
 * Returns null if the position is not in Lichess's database.
 */
export async function fetchCloudEval(fen: string): Promise<CloudEvalResult | null> {
  // Check cache first
  if (evalCache.has(fen)) {
    return evalCache.get(fen)!;
  }

  try {
    const encodedFen = encodeURIComponent(fen);
    const res = await fetch(`${LICHESS_API}?fen=${encodedFen}&multiPv=1`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5s timeout per position
    });

    if (!res.ok) {
      evalCache.set(fen, null);
      return null;
    }

    const data = await res.json();
    
    if (!data.pvs || data.pvs.length === 0) {
      evalCache.set(fen, null);
      return null;
    }

    const pv = data.pvs[0];
    const result: CloudEvalResult = {
      fen: data.fen || fen,
      knodes: data.knodes || 0,
      depth: data.depth || 0,
      cp: pv.cp,
      mate: pv.mate,
      bestMove: pv.moves ? pv.moves.split(' ')[0] : undefined,
    };

    evalCache.set(fen, result);
    return result;
  } catch {
    evalCache.set(fen, null);
    return null;
  }
}

/**
 * Batch fetch cloud evaluations for multiple positions.
 * Fetches sequentially with a small delay to respect Lichess rate limits.
 * Returns a map of FEN -> evaluation (null if not found).
 */
export async function fetchCloudEvalBatch(
  fens: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, CloudEvalResult | null>> {
  const results = new Map<string, CloudEvalResult | null>();

  for (let i = 0; i < fens.length; i++) {
    const fen = fens[i];
    const result = await fetchCloudEval(fen);
    results.set(fen, result);

    if (onProgress) {
      onProgress(i + 1, fens.length);
    }

    // Small delay to respect rate limits (Lichess allows ~1 req/s for cloud eval)
    if (i < fens.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

/**
 * Convert cloud eval centipawns to a normalized score for display.
 * Positive = white advantage, negative = black advantage.
 * Mate scores are converted to +/- 10000.
 */
export function cloudEvalToScore(eval_: CloudEvalResult | null): number {
  if (!eval_) return 0;
  if (eval_.mate !== undefined && eval_.mate !== null) {
    return eval_.mate > 0 ? 10000 : -10000;
  }
  return (eval_.cp ?? 0) / 100; // Convert centipawns to pawns
}

/**
 * Format cloud eval for display (e.g. "+0.5", "-1.2", "M3", "M-5")
 */
export function formatCloudEval(eval_: CloudEvalResult | null): string {
  if (!eval_) return '?';
  if (eval_.mate !== undefined && eval_.mate !== null) {
    return `M${eval_.mate > 0 ? '' : ''}${eval_.mate}`;
  }
  const cp = (eval_.cp ?? 0) / 100;
  return cp >= 0 ? `+${cp.toFixed(1)}` : cp.toFixed(1);
}
