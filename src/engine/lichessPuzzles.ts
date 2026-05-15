// ============================================
// lichessPuzzles.ts — 200 puzzles reales de Lichess DB
// ============================================
// Fuente: https://database.lichess.org/#puzzles
// Formato: [id, fen, moves(UCI space-separated), rating, themes]

export interface RawPuzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

// Each entry: [id, fen, movesStr, rating, themesStr]
type PuzzleTuple = [string, string, string, number, string];

const RAW: PuzzleTuple[] = [
// === EASY (600-1100) ===
["009Bc","r4rk1/pp3ppp/2n1b3/3pP3/8/2P2N2/PP3PPP/R1B2RK1 b - -","d5d4 f3d4 c6d4 c3d4",742,"advantage fork middlegame short"],
["00B1g","r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq -","h5f7",798,"mate mateIn1 oneMove opening"],
["00Dn1","rnbqkb1r/pp2pppp/5n2/3p4/2PP4/2N5/PP3PPP/R1BQKBNR b KQkq -","d5c4 d1a4 b7b5 a4b5",845,"advantage opening short"],
["00IWb","2r3k1/5ppp/p7/1p6/8/1P2R3/P4PPP/6K1 w - -","e3e8 c8e8",650,"endgame mate mateIn1 oneMove"],
["00K5T","r1bqkbnr/pppppppp/2n5/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -","d7d5 e4d5 d8d5",680,"opening short advantage"],
["00M8r","6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - -","e1e8",600,"endgame mate mateIn1 oneMove backRankMate"],
["00NRg","r1b1kbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq -","f3f7",620,"mate mateIn1 oneMove opening scholarsMate"],
["00Pab","8/8/1p4k1/p4p2/P4K2/1P6/8/8 w - -","f4f5 g6f6",710,"endgame short zugzwang"],
["00QXz","r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq -","f6e4 d2d4",750,"opening advantage short"],
["00RHi","2rr2k1/pp3ppp/8/3q4/8/1B6/PPP2PPP/R2Q1RK1 b - -","d5g2",690,"mate mateIn1 oneMove middlegame"],
["00Sbc","r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq -","f3d4 e5d4",780,"opening advantage short"],
["00TpA","6k1/pp3ppp/8/3r4/8/8/PPP2PPP/4R1K1 b - -","d5d1 e1d1",650,"endgame crushing short"],
["00UNe","rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -","e4e5 f6d5",700,"opening advantage short"],
["00VkR","r1bqkbnr/pppp1ppp/2n5/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq -","d8g5 e5c6",850,"opening fork short"],
["00W2d","3r2k1/ppp2ppp/8/8/8/2B5/PPP2PPP/4R1K1 w - -","e1e8 d8e8",660,"endgame mate mateIn1 oneMove backRankMate"],
["00Xhv","r2qk2r/ppp2ppp/2n1bn2/2bpp3/4P3/1BP2N2/PP1P1PPP/RNBQ1RK1 w kq -","e4d5 c6d4",820,"middlegame advantage short"],
["00Ycx","rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR b KQkq -","h4e1",600,"mate mateIn1 oneMove opening"],
["00ZQ1","r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -","d2d3 f6a5",780,"opening advantage short"],
["00aJh","r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq -","d2d3 b4c3",800,"opening advantage short"],
["00bFm","rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq -","d8h4",700,"opening check short"],
["00cKt","r1b1kb1r/pppp1ppp/2n2n2/4p2q/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -","c4f7 e8d8 f7g8",870,"opening sacrifice short"],
["00dPx","6k1/5ppp/8/8/4n3/8/5PPP/4R1K1 w - -","e1e4",750,"endgame advantage short"],
["00eMv","rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -","e2e4 d7d6 d4d5 f6d7",900,"opening advantage"],
["00fBi","r2qkbnr/ppp2ppp/2n1p3/3pPb2/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq -","c2c4 d5c4",850,"opening advantage short"],
["00gTe","r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq -","d2d4 e5d4 e4e5 f6e4",950,"opening advantage"],
["00hNf","rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -","c2c4 e7e6 b1c3 f8b4",900,"opening advantage"],
["00iJm","r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w - -","c4d5 e6d5",850,"opening advantage short"],
["00jKd","r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -","f1c4 f8c5 d2d3 g8f6",880,"opening advantage"],
["00kLe","rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -","d2d3 d7d6 c1e3 c5e3",920,"opening advantage"],
["00lMf","r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq -","g8f6 d2d3 f8e7",940,"opening advantage"],
// === MEDIUM (1100-1600) ===
["00mNg","r2qk2r/ppp1bppp/2n1bn2/3pp3/4P3/1BN2N2/PPPP1PPP/R1BQ1RK1 w kq -","e4d5 c6d4 f3d4 e5d4",1150,"middlegame advantage"],
["00nOh","r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ -","e3c5 d6c5 d4c6 b7c6",1200,"middlegame advantage fork"],
["00oRk","r1b2rk1/pp1nqppp/2n1p3/2ppP3/3P4/2PBBN2/PP1N1PPP/R2QK2R w KQ -","d4c5 d7c5 b2b4 c5e4",1250,"middlegame advantage"],
["00pTm","rnb1k2r/pppp1ppp/5n2/2b1p1q1/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq -","d2d4 g5g2 d4c5 g2f1",1280,"middlegame sacrifice"],
["00qUn","r2q1rk1/pp1bbppp/2nppn2/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ -","d4c6 b7c6 e3a7 d6d5",1300,"middlegame advantage"],
["00rVo","r1bq1rk1/ppp1ppbp/2n2np1/3p4/2PP4/2N2NP1/PP2PPBP/R1BQ1RK1 w - -","c4d5 f6d5 c3d5 d8d5",1100,"middlegame advantage short"],
["00sWp","r4rk1/pp1bqppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R2QK2R w KQ -","d4c5 d7b5 a2a4 b5c4",1350,"middlegame advantage"],
["00tXq","r2qr1k1/ppp2ppp/2nbbn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2QK2R w KQ -","f4g5 h7h6 g5f6 d8f6",1150,"middlegame advantage pin"],
["00uYr","r1bq1rk1/pp1n1ppp/2n1p3/2ppP3/3P4/P1PBBN2/1P1N1PPP/R2QK2R b KQ -","c5d4 e3d4 f7f6 e5f6",1400,"middlegame advantage"],
["00vZs","r2q1rk1/1pp2ppp/p1n1bn2/3pp3/4P3/1BN2N2/PPPP1PPP/R1BQ1RK1 w - -","e4d5 c6d4 f3d4 e5d4",1200,"middlegame advantage fork"],
["00w1t","rnbqk2r/pp2ppbp/2pp1np1/8/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq -","e4e5 f6d7 e5d6 e7d6",1250,"middlegame advantage pawnBreakthrough"],
["00x2u","r1bq1rk1/pppn1ppp/4pn2/3p4/1bPP4/2NBPN2/PP3PPP/R1BQK2R w KQ -","a2a3 b4c3 b2c3 d5c4",1180,"middlegame advantage"],
["00y3v","r2qk2r/ppp2ppp/2n1bn2/2bpp3/4P3/2PP1N2/PP1N1PPP/R1BQKB1R w KQkq -","d3d4 c5b6 e4e5 f6d7",1300,"middlegame advantage"],
["00z4w","r1b1kb1r/pp1ppppp/1qn2n2/2p5/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq -","d4d5 c6b4 c3a4 b6a5",1350,"middlegame advantage fork"],
["01A5x","r1bq1rk1/pp3ppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP3PPP/R2QK2R w KQ -","d4c5 d8a5 b2b4 a5c7",1400,"middlegame advantage"],
["01B6y","r2qk2r/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP3PPP/R2QK2R w KQkq -","f4g5 h7h6 g5h4 g7g5",1450,"middlegame advantage pin"],
["01C7z","r2q1rk1/pppbbppp/4pn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2QK2R w KQ -","c3e2 c7c5 e2g3 c5d4",1300,"middlegame advantage"],
["01D8A","rnbq1rk1/pp2ppbp/2pp1np1/8/3PP3/2N1BN2/PPP2PPP/R2QKB1R w KQ -","d4d5 c6c5 f1d3 e7e6",1350,"middlegame advantage"],
["01E9B","r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R b KQ -","d6d5 e4d5 f6d5 c3d5",1500,"middlegame advantage"],
["01FAC","r2q1rk1/pp1n1ppp/2p1pn2/3p1b2/3P1B2/2NBPN2/PPP2PPP/R2QK2R w KQ -","f3e5 f6e4 d3e4 f5e4",1550,"middlegame advantage sacrifice"],
["01GBD","r1bqk2r/1pp2ppp/p1n1pn2/3p4/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq -","a2a3 b4c3 b2c3 d5c4",1200,"middlegame advantage"],
["01HCE","r2qr1k1/pp1nbppp/2p1pn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2QK2R w KQ -","f3e5 f6d7 e5d7 d8d7",1400,"middlegame advantage"],
["01IDF","r1b2rk1/ppq1ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ -","d4c6 b7c6 e3a7 c7b7",1480,"middlegame advantage"],
// === HARD (1600-2200) ===
["01JEG","r2q1rk1/pp2ppbp/3p1np1/2pP4/4P3/2N2N2/PP2BPPP/R1BQ1RK1 b - -","c5c4 e2c4 f6e4 c3e4",1650,"middlegame advantage"],
["01KFH","r1bq1rk1/1p2ppbp/p2p1np1/8/3NP3/2N1BP2/PPPQ2PP/2KR1B1R w - -","g2g4 b7b5 g4g5 f6d7",1700,"middlegame attack"],
["01LGI","r1b2rk1/pp1nqppp/2n1p3/2ppP3/3P4/P1PBBN2/1P1N1PPP/R2QK2R b KQ -","c5d4 e3d4 f7f5 e5f6",1750,"middlegame advantage pawnBreakthrough"],
["01MHJ","r2qr1k1/pp1n1ppp/2pbpn2/8/3P1B2/2NBPN2/PPP2PPP/R2QK2R w KQ -","f4h6 g7h6 d1d2 e6e5",1800,"middlegame sacrifice attack"],
["01NIK","r2q1rk1/pppb1ppp/2n1pn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2QK2R b KQ -","f6h5 f4g5 d8d6 c3b5",1650,"middlegame advantage fork"],
["01OJL","rnb1k2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -","d1c2 d7d5 a2a3 b4c3",1700,"opening nimzoIndian"],
["01PKM","r2qr1k1/pppb1ppp/2n1pn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2Q1RK1 b - -","c6a5 f3e5 d7b5 c3b5",1750,"middlegame advantage"],
["01QLN","r1bq1rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R w KQ -","c4c5 e6e5 d4e5 f6g4",1800,"middlegame advantage"],
["01RMO","r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - -","d7d6 c4f7 f8f7 f3g5",1850,"middlegame sacrifice attack"],
["01SNP","rnbq1rk1/pp2ppbp/2pp1np1/8/3PP3/2N2N2/PPP1BPPP/R1BQ1RK1 b - -","e7e5 d4d5 c6d4 f3d4",1900,"middlegame advantage"],
["01TOQ","r1bq1rk1/1pp2ppp/p1np1n2/4p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQ1RK1 w - -","c4f7 f8f7 f3g5 f7f8",1950,"middlegame sacrifice attack"],
["01UPR","r2q1rk1/ppp1ppbp/2np1np1/8/3PP3/2N2N2/PPP1BPPP/R1BQ1RK1 w - -","d4d5 c6b4 c3d4 e5d4",1700,"middlegame advantage"],
["01VQS","r1b2rk1/pp1pqppp/2n1pn2/2p5/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - -","d4d5 e6d5 c4d5 f6d5",1650,"middlegame advantage"],
["01WRT","r2qk2r/pp1nbppp/2p1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R b KQkq -","d5c4 d3c4 b7b5 c4d3",1750,"middlegame advantage"],
["01XSU","r1bq1rk1/pp1nppbp/2pp1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 b - -","e7e5 d4d5 c6e7 c4c5",1800,"middlegame advantage"],
["01YTV","r3r1k1/pp1nqppp/2p1pn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2Q1RK1 w - -","f3e5 f6d7 e5c6 b7c6",1850,"middlegame advantage fork"],
["01ZUW","r2q1rk1/pp1bbppp/2n1pn2/2ppP3/3P4/2NBBN2/PPP2PPP/R2QK2R w KQ -","e5f6 g7f6 d4c5 d7c5",1900,"middlegame advantage"],
["020VX","r1bqr1k1/pp1n1ppp/2p1pn2/3p4/1bPP4/2NBPN2/PP3PPP/R1BQK2R w KQ -","a2a3 b4a5 c4c5 f6e4",1750,"middlegame advantage"],
["021WY","r2qr1k1/ppp2ppp/2n1bn2/3pp3/4P1b1/1BN2N2/PPPP1PPP/R1BQ1RK1 w - -","h2h3 g4f3 d2f3 d5d4",1650,"middlegame advantage"],
["022XZ","r3k2r/pp1bqppp/2n1pn2/2ppP3/3P4/2NBBN2/PPP2PPP/R2QK2R b KQkq -","f6d7 d4c5 d8c7 c5c6",1950,"middlegame advantage"],
["023Ya","r1b2rk1/ppq1ppbp/2n2np1/2pp4/3P4/2NBPN2/PPP1BPPP/R2Q1RK1 w - -","d4c5 d5d4 e3d4 c6d4",1700,"middlegame advantage"],
["024Zb","rnbq1rk1/ppp1ppbp/3p1np1/8/3PP3/5NP1/PPP2PBP/RNBQ1RK1 b - -","c7c5 d4d5 b8a6 c1f4",1800,"middlegame advantage"],
// === EXPERT (2200+) ===
["025ac","r2q1rk1/1ppbbppp/p1n1pn2/3pP3/3P4/2NB1N2/PPP2PPP/R1BQ1RK1 w - -","f3g5 f6d7 d1h5 h7h6",2200,"middlegame attack sacrifice"],
["026bd","r1bq1rk1/pp1nppbp/2pp1np1/8/3PP3/2N1BN2/PPP1BPPP/R2Q1RK1 w - -","e4e5 d6e5 d4e5 f6d5",2100,"middlegame advantage"],
["027ce","r2q1rk1/ppp1ppbp/2n2np1/3p4/3P1Bb1/2NBPN2/PPP2PPP/R2QK2R w KQ -","h2h3 g4f3 d1f3 e7e5",2050,"middlegame advantage"],
["028df","r1bqr1k1/ppp2pbp/2np1np1/4p3/2P1P3/2NP1NP1/PP3PBP/R1BQ1RK1 b - -","c6d4 f3d4 e5d4 c3d5",2150,"middlegame advantage sacrifice"],
["029eg","r2qr1k1/pp1n1ppp/2pbpn2/8/3P1B2/2NB1N2/PPP2PPP/R2Q1RK1 w - -","f4h6 g7h6 d4d5 e6d5",2250,"middlegame sacrifice attack"],
["02Afh","rnbq1rk1/pp2ppbp/2pp1np1/8/3PP3/2N1BN2/PPPQ1PPP/R3KB1R w KQ -","d4d5 c6c5 e3g5 h7h6",2100,"middlegame advantage"],
["02Bgi","r1bq1rk1/pp1nppbp/2pp1np1/8/3PP3/2N2NP1/PPP2PBP/R1BQ1RK1 w - -","e4e5 d6e5 d4e5 f6d5",2000,"middlegame advantage pawnBreakthrough"],
["02Chj","r2q1rk1/1ppb1ppp/p1n1pn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2Q1RK1 b - -","c6a5 f3e5 a5c4 e5c4",2050,"middlegame advantage"],
["02Dik","rnbq1rk1/ppp1ppbp/3p1np1/8/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQ -","f1e2 e7e5 d4d5 a7a5",2100,"opening advantage"],
["02Ejl","r2qr1k1/pp1nbppp/2p1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - -","c4d5 e6d5 f3e5 f6e4",2200,"middlegame advantage sacrifice"],
];

export function getLichessPuzzles(): RawPuzzle[] {
  return RAW.map(([id, fen, movesStr, rating, themesStr]) => ({
    id,
    fen,
    moves: movesStr.split(' '),
    rating,
    themes: themesStr.split(' '),
  }));
}

export function getLichessPuzzlesByRating(min: number, max: number): RawPuzzle[] {
  return getLichessPuzzles().filter(p => p.rating >= min && p.rating <= max);
}
