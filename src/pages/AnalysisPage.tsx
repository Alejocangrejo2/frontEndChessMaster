// ============================================
// AnalysisPage.tsx — Análisis post-partida
// ============================================
// Evalúa la partida completa con Stockfish y muestra
// clasificación de jugadas, evaluación y precisión.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoard } from '../components/ChessBoard';
import { EvalBar } from '../components/EvalBar';
import { AnalysisEngine, CLASSIFICATION_CONFIG } from '../engine/AnalysisEngine';
import type { GameAnalysis, MoveAnalysis, MoveClassification } from '../engine/AnalysisEngine';
import { FloatingPieces } from '../components/FloatingPieces';
import type { Key } from 'chessground/types';

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const analysisEngineRef = useRef<AnalysisEngine | null>(null);

  // Game data from sessionStorage
  const [gameData, setGameData] = useState<{
    positions: string[];
    moves: { san: string; from: string; to: string; color: 'white' | 'black' }[];
    playerColor: 'white' | 'black';
    playerName: string;
    opponentName: string;
  } | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAnalyzingMove, setCurrentAnalyzingMove] = useState(0);

  // Review state
  const [reviewIndex, setReviewIndex] = useState<number>(-1); // -1 = before first move
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  // Load game data on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('analysis_game');
      if (stored) {
        const data = JSON.parse(stored);
        setGameData(data);
        setOrientation(data.playerColor || 'white');
        // Start at the end of the game
        setReviewIndex(data.moves.length - 1);
      }
    } catch {
      navigate('/');
    }
  }, [navigate]);

  // Try Lichess cloud eval first, then backend, then local WASM
  useEffect(() => {
    if (!gameData || analysis) return;
    setIsAnalyzing(true);

    // --- Priority 1: Lichess Cloud Eval ---
    const tryLichessCloudEval = async (): Promise<GameAnalysis | null> => {
      try {
        const { fetchCloudEval, cloudEvalToScore } = await import('../engine/LichessCloudEval');
        const positions = gameData.positions;
        const moves = gameData.moves;
        const evals: number[] = [];

        // Fetch eval for each position
        for (let i = 0; i < positions.length; i++) {
          setProgress(Math.round((i / positions.length) * 80));
          setCurrentAnalyzingMove(i);

          const result = await fetchCloudEval(positions[i]);
          if (!result) {
            // Position not in cloud DB — abort cloud eval, use fallback
            return null;
          }
          evals.push(cloudEvalToScore(result));

          // Rate limit: 200ms between requests
          if (i < positions.length - 1) {
            await new Promise(r => setTimeout(r, 200));
          }
        }

        // Build analysis from cloud evals
        const moveAnalyses: MoveAnalysis[] = moves.map((m, i) => {
          const evalBefore = evals[i] ?? 0;
          const evalAfter = evals[i + 1] ?? evalBefore;
          const isWhite = m.color === 'white';
          const cpLoss = isWhite
            ? Math.max(0, evalBefore - evalAfter)
            : Math.max(0, evalAfter - evalBefore);

          // Classify move based on centipawn loss
          let classification: MoveClassification = 'best';
          if (cpLoss > 3) classification = 'blunder';
          else if (cpLoss > 1.5) classification = 'mistake';
          else if (cpLoss > 0.5) classification = 'inaccuracy';
          else if (cpLoss > 0.2) classification = 'good';
          else if (cpLoss > 0.05) classification = 'best';
          else classification = 'brilliant';

          return {
            moveIndex: i,
            san: m.san,
            from: m.from,
            to: m.to,
            color: m.color,
            evalBefore: evalBefore * 100, // Convert to centipawns
            evalAfter: evalAfter * 100,
            bestMove: '',
            bestMoveSan: '',
            classification,
            cpLoss: cpLoss * 100,
          };
        });

        // Calculate accuracy
        const calcAccuracy = (ms: MoveAnalysis[]) => {
          if (ms.length === 0) return 100;
          const avgLoss = ms.reduce((s, m) => s + m.cpLoss, 0) / ms.length;
          return Math.max(0, Math.min(100, 100 - avgLoss / 2));
        };

        const wm = moveAnalyses.filter(m => m.color === 'white');
        const bm = moveAnalyses.filter(m => m.color === 'black');
        const countCls = (arr: MoveAnalysis[], cls: string) =>
          arr.filter(m => m.classification === cls).length;

        return {
          moves: moveAnalyses,
          whiteAccuracy: Math.round(calcAccuracy(wm) * 10) / 10,
          blackAccuracy: Math.round(calcAccuracy(bm) * 10) / 10,
          whiteBrilliant: countCls(wm, 'brilliant'),
          whiteGreat: countCls(wm, 'great'),
          whiteBest: countCls(wm, 'best'),
          whiteGood: countCls(wm, 'good'),
          whiteInaccuracy: countCls(wm, 'inaccuracy'),
          whiteMistake: countCls(wm, 'mistake'),
          whiteBlunder: countCls(wm, 'blunder'),
          blackBrilliant: countCls(bm, 'brilliant'),
          blackGreat: countCls(bm, 'great'),
          blackBest: countCls(bm, 'best'),
          blackGood: countCls(bm, 'good'),
          blackInaccuracy: countCls(bm, 'inaccuracy'),
          blackMistake: countCls(bm, 'mistake'),
          blackBlunder: countCls(bm, 'blunder'),
        };
      } catch {
        return null;
      }
    };

    // --- Priority 2: Backend Stockfish ---
    const tryBackendAnalysis = async (): Promise<GameAnalysis | null> => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        const res = await fetch(`${API_URL}/api/analysis/game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positions: gameData.positions,
            moves: gameData.moves,
          }),
        });
        if (!res.ok) return null;

        const data = await res.json();

        // Convert backend response to GameAnalysis format
        const moves: MoveAnalysis[] = data.moves.map((m: any) => ({
          moveIndex: m.moveIndex,
          san: m.san,
          from: m.from,
          to: m.to,
          color: m.color as 'white' | 'black',
          evalBefore: m.evalBefore,
          evalAfter: m.evalAfter,
          bestMove: m.bestMove || '',
          bestMoveSan: '',
          classification: m.classification as MoveClassification,
          cpLoss: m.cpLoss,
        }));

        const wm = moves.filter(m => m.color === 'white');
        const bm = moves.filter(m => m.color === 'black');
        const countCls = (arr: MoveAnalysis[], cls: string) =>
          arr.filter(m => m.classification === cls).length;

        return {
          moves,
          whiteAccuracy: data.whiteAccuracy,
          blackAccuracy: data.blackAccuracy,
          whiteBrilliant: data.whiteCounts?.brilliant ?? countCls(wm, 'brilliant'),
          whiteGreat: data.whiteCounts?.great ?? countCls(wm, 'great'),
          whiteBest: data.whiteCounts?.best ?? countCls(wm, 'best'),
          whiteGood: data.whiteCounts?.good ?? countCls(wm, 'good'),
          whiteInaccuracy: data.whiteCounts?.inaccuracy ?? countCls(wm, 'inaccuracy'),
          whiteMistake: data.whiteCounts?.mistake ?? countCls(wm, 'mistake'),
          whiteBlunder: data.whiteCounts?.blunder ?? countCls(wm, 'blunder'),
          blackBrilliant: data.blackCounts?.brilliant ?? countCls(bm, 'brilliant'),
          blackGreat: data.blackCounts?.great ?? countCls(bm, 'great'),
          blackBest: data.blackCounts?.best ?? countCls(bm, 'best'),
          blackGood: data.blackCounts?.good ?? countCls(bm, 'good'),
          blackInaccuracy: data.blackCounts?.inaccuracy ?? countCls(bm, 'inaccuracy'),
          blackMistake: data.blackCounts?.mistake ?? countCls(bm, 'mistake'),
          blackBlunder: data.blackCounts?.blunder ?? countCls(bm, 'blunder'),
        };
      } catch {
        return null; // Backend unavailable
      }
    };

    const runAnalysis = async () => {
      // Try Lichess cloud eval first (fastest, most accurate)
      setProgress(5);
      const cloudResult = await tryLichessCloudEval();
      if (cloudResult) {
        setAnalysis(cloudResult);
        setProgress(100);
        setIsAnalyzing(false);
        return;
      }

      // Try backend Stockfish
      setProgress(10);
      const backendResult = await tryBackendAnalysis();

      if (backendResult) {
        setAnalysis(backendResult);
        setProgress(100);
        setIsAnalyzing(false);
        return;
      }

      // Fallback: local WASM Stockfish
      const engine = new AnalysisEngine();
      analysisEngineRef.current = engine;

      try {
        const result = await engine.analyzeGame(
          gameData.positions,
          gameData.moves,
          (prog, moveIdx) => {
            setProgress(prog);
            setCurrentAnalyzingMove(moveIdx);
          }
        );
        setAnalysis(result);
      } catch {
        // Analysis failed completely
      }
      setIsAnalyzing(false);
    };

    runAnalysis();

    return () => {
      analysisEngineRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameData]);

  // Get FEN and lastMove for current review position
  const getDisplayFen = useCallback((): string => {
    if (!gameData) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const posIdx = reviewIndex + 1; // positions[0] = initial
    if (posIdx < 0 || posIdx >= gameData.positions.length) {
      return gameData.positions[gameData.positions.length - 1] || '';
    }
    return gameData.positions[posIdx] || '';
  }, [gameData, reviewIndex]);

  const getDisplayLastMove = useCallback((): [Key, Key] | undefined => {
    if (!gameData || reviewIndex < 0 || reviewIndex >= gameData.moves.length) return undefined;
    const move = gameData.moves[reviewIndex]!;
    return [move.from as Key, move.to as Key];
  }, [gameData, reviewIndex]);

  // Navigation
  const goToStart = () => setReviewIndex(-1);
  const goBack = () => setReviewIndex(prev => Math.max(-1, prev - 1));
  const goForward = () => setReviewIndex(prev =>
    gameData ? Math.min(gameData.moves.length - 1, prev + 1) : prev
  );
  const goToEnd = () => setReviewIndex(gameData ? gameData.moves.length - 1 : -1);
  const goToMove = (idx: number) => setReviewIndex(idx);

  // Current eval for EvalBar
  const currentEval = analysis && reviewIndex >= 0
    ? analysis.moves[reviewIndex]?.evalAfter ?? 0
    : 0;

  // Current move analysis
  const currentMoveAnalysis = analysis && reviewIndex >= 0
    ? analysis.moves[reviewIndex]
    : undefined;

  // Group moves into pairs for the move list
  const movePairs: { number: number; white?: MoveAnalysis; black?: MoveAnalysis; whiteIdx: number; blackIdx: number }[] = [];
  if (analysis) {
    for (let i = 0; i < analysis.moves.length; i += 2) {
      movePairs.push({
        number: Math.floor(i / 2) + 1,
        white: analysis.moves[i],
        black: analysis.moves[i + 1],
        whiteIdx: i,
        blackIdx: i + 1,
      });
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goBack(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goForward(); }
      if (e.key === 'Home') { e.preventDefault(); goToStart(); }
      if (e.key === 'End') { e.preventDefault(); goToEnd(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameData]);

  if (!gameData) {
    return (
      <div className="analysis-page analysis-page--empty">
        <FloatingPieces count={50} />
        <h2>No hay partida para analizar</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Ir al lobby</button>
      </div>
    );
  }

  return (
    <div className="analysis-page" id="analysis-page">
      <FloatingPieces count={50} />
      {/* Loading overlay */}
      {isAnalyzing && (
        <div className="analysis-loading">
          <div className="analysis-loading__inner">
            <div className="analysis-loading__title">Analizando partida...</div>
            <div className="analysis-loading__bar">
              <div className="analysis-loading__fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="analysis-loading__text">
              Movimiento {currentAnalyzingMove + 1} de {gameData.moves.length}
              <span className="analysis-loading__percent">{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Left: Eval Bar + Board */}
      <div className="analysis-page__board-area">
        {analysis && (
          <EvalBar evaluation={currentEval} flipped={orientation === 'black'} />
        )}

        <div className="analysis-page__board">
          <ChessBoard
            fen={getDisplayFen()}
            orientation={orientation}
            turnColor="white"
            lastMove={getDisplayLastMove()}
            check={undefined}
            dests={new Map()}
            viewOnly={true}
            onMove={() => {}}
          />
        </div>
      </div>

      {/* Right Panel */}
      <aside className="analysis-page__panel">
        {/* Accuracy Header */}
        {analysis && (
          <div className="analysis-accuracy" id="accuracy-header">
            <div className="analysis-accuracy__player">
              <div className="analysis-accuracy__name">{gameData.playerName}</div>
              <div className="analysis-accuracy__value">
                {gameData.playerColor === 'white' ? analysis.whiteAccuracy : analysis.blackAccuracy}%
              </div>
              <div className="analysis-accuracy__label">Precisión</div>
            </div>
            <div className="analysis-accuracy__vs">vs</div>
            <div className="analysis-accuracy__player">
              <div className="analysis-accuracy__name">{gameData.opponentName}</div>
              <div className="analysis-accuracy__value">
                {gameData.playerColor === 'white' ? analysis.blackAccuracy : analysis.whiteAccuracy}%
              </div>
              <div className="analysis-accuracy__label">Precisión</div>
            </div>
          </div>
        )}

        {/* Move Classification Summary */}
        {analysis && (
          <div className="analysis-summary">
            {renderClassSummary('white', analysis, gameData.playerColor === 'white' ? gameData.playerName : gameData.opponentName)}
            {renderClassSummary('black', analysis, gameData.playerColor === 'black' ? gameData.playerName : gameData.opponentName)}
          </div>
        )}

        {/* Navigation */}
        <div className="panel-nav analysis-nav" id="analysis-nav">
          <button className="panel-nav__btn" title="Girar" onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M7.5 21.5V18H3.6L7.15 14.45L5.75 13.05L2 16.8V12.5H0V21.5H7.5ZM16.25 10.95L19.8 7.4V11.5H21.8V2.5H12.8V4.5H16.7L13.15 8.05L14.55 9.45L16.25 7.75V10.95Z"/>
            </svg>
          </button>
          <button className="panel-nav__btn" title="Inicio" onClick={goToStart}>|&lt;</button>
          <button className="panel-nav__btn" title="Anterior" onClick={goBack}>&lt;</button>
          <button className="panel-nav__btn" title="Siguiente" onClick={goForward}>&gt;</button>
          <button className="panel-nav__btn" title="Final" onClick={goToEnd}>&gt;|</button>
        </div>

        {/* Move List with classifications */}
        <div className="analysis-moves" id="analysis-moves">
          {movePairs.map(pair => (
            <div key={pair.number} className="move-list__row">
              <span className="move-list__number">{pair.number}.</span>
              {pair.white && renderAnalysisMove(pair.white, pair.whiteIdx, reviewIndex, goToMove)}
              {pair.black && renderAnalysisMove(pair.black, pair.blackIdx, reviewIndex, goToMove)}
            </div>
          ))}
        </div>

        {/* Current move detail */}
        {currentMoveAnalysis && (
          <div className="analysis-detail" id="move-detail">
            <div className="analysis-detail__header" style={{
              borderLeftColor: CLASSIFICATION_CONFIG[currentMoveAnalysis.classification].color
            }}>
              <span className="analysis-detail__class" style={{
                color: CLASSIFICATION_CONFIG[currentMoveAnalysis.classification].color
              }}>
                {CLASSIFICATION_CONFIG[currentMoveAnalysis.classification].label}
              </span>
              <span className="analysis-detail__san">{currentMoveAnalysis.san}</span>
            </div>
            <div className="analysis-detail__eval">
              Eval: {(currentMoveAnalysis.evalAfter / 100).toFixed(2)}
              {currentMoveAnalysis.cpLoss > 0 && (
                <span className="analysis-detail__loss">
                  {` (−${(currentMoveAnalysis.cpLoss / 100).toFixed(1)})`}
                </span>
              )}
            </div>
            {currentMoveAnalysis.bestMove && currentMoveAnalysis.classification !== 'best' && currentMoveAnalysis.classification !== 'good' && currentMoveAnalysis.classification !== 'book' && (
              <div className="analysis-detail__best">
                Mejor: {currentMoveAnalysis.bestMove}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="analysis-actions">
          <button className="btn-primary" onClick={() => navigate('/')}>
            Nueva partida
          </button>
          <button className="btn-secondary" onClick={() => navigate('/history')}>
            Historial
          </button>
        </div>
      </aside>
    </div>
  );
};

// === Helper: Render a classified move in the move list ===
function renderAnalysisMove(
  move: MoveAnalysis,
  index: number,
  currentIndex: number,
  onClick: (idx: number) => void
) {
  const config = CLASSIFICATION_CONFIG[move.classification];
  const isActive = index === currentIndex;

  return (
    <span
      className={`move-list__move analysis-move ${isActive ? 'move-list__move--active' : ''}`}
      style={{
        color: isActive ? '#fff' : config.color,
        backgroundColor: isActive ? config.color : 'transparent',
      }}
      onClick={() => onClick(index)}
      title={`${config.label} (${move.cpLoss > 0 ? `−${(move.cpLoss / 100).toFixed(1)}` : '0.0'})`}
    >
      {/* Classification indicator — text-based, ready for future icon replacement */}
      <span className="analysis-move__indicator" data-classification={move.classification}>
        {config.shortLabel}
      </span>
      {move.san}
    </span>
  );
}

// === Helper: Render classification summary for one side ===
function renderClassSummary(
  color: 'white' | 'black',
  analysis: GameAnalysis,
  name: string
) {
  const prefix = color;
  const stats: { cls: MoveClassification; count: number }[] = [
    { cls: 'brilliant', count: analysis[`${prefix}Brilliant`] },
    { cls: 'great', count: analysis[`${prefix}Great`] },
    { cls: 'best', count: analysis[`${prefix}Best`] },
    { cls: 'good', count: analysis[`${prefix}Good`] },
    { cls: 'inaccuracy', count: analysis[`${prefix}Inaccuracy`] },
    { cls: 'mistake', count: analysis[`${prefix}Mistake`] },
    { cls: 'blunder', count: analysis[`${prefix}Blunder`] },
  ];

  return (
    <div className="analysis-summary__side">
      <div className="analysis-summary__name">
        <span className={`analysis-summary__color-dot analysis-summary__color-dot--${color}`} />
        {name}
      </div>
      <div className="analysis-summary__stats">
        {stats.filter(s => s.count > 0).map(s => (
          <div key={s.cls} className="analysis-summary__stat">
            <span className="analysis-summary__stat-label" style={{ color: CLASSIFICATION_CONFIG[s.cls].color }}>
              {CLASSIFICATION_CONFIG[s.cls].shortLabel}
            </span>
            <span className="analysis-summary__stat-name">{CLASSIFICATION_CONFIG[s.cls].label}</span>
            <span className="analysis-summary__stat-count">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
