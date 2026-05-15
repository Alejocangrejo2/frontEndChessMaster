// ============================================
// PuzzlesPage.tsx -- Puzzles reales de Lichess
// ============================================
// Obtiene puzzles directamente de la API de Lichess.
// Valida movimientos con ChessEngine (chessops).
// Si la API no responde, usa puzzles de fallback.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { ChessEngine } from '../engine/ChessEngine';
import {
  LichessPuzzle,
  fetchPuzzleBatch,
  getNextPuzzle,
  markPuzzleSolved,
  prefetchIfNeeded,
  getDifficultyForStreak,
  getDifficultyLabel,
  getThemeLabel,
} from '../engine/puzzleData';
import { FloatingPieces } from '../components/FloatingPieces';
import type { Key, Color } from 'chessground/types';

export const PuzzlesPage: React.FC = () => {
  const [currentPuzzle, setCurrentPuzzle] = useState<LichessPuzzle | null>(null);
  const [engine, setEngine] = useState<ChessEngine | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>(undefined);
  const [playerColor, setPlayerColor] = useState<Color>('white'); // FIXED per puzzle
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'solved' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [puzzlesLoaded, setPuzzlesLoaded] = useState(false);
  const [bestStreak, setBestStreak] = useState(() => {
    return parseInt(localStorage.getItem('puzzle_best_streak') || '0');
  });

  // Load puzzles from Lichess API on mount
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    fetchPuzzleBatch(15).then(fetched => {
      if (!mounted) return;
      if (fetched.length === 0) {
        // API failed, use fallback puzzles
        // Push fallback puzzles into cache via import
        console.warn('Lichess API unavailable, using fallback puzzles');
      }
      setPuzzlesLoaded(true);
      setIsLoading(false);
    }).catch(() => {
      if (mounted) {
        setPuzzlesLoaded(true);
        setIsLoading(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  // Load a new puzzle when puzzles are available
  const loadNewPuzzle = useCallback(() => {
    const difficulty = getDifficultyForStreak(streak);
    const puzzle = getNextPuzzle(difficulty);

    if (!puzzle) return;

    const newEngine = new ChessEngine(puzzle.fen);
    // Fix orientation: determine which color the PLAYER plays
    // In Lichess puzzles, the FEN shows the position, and the player
    // plays as whoever's turn it is in the FEN
    const fenTurn = puzzle.fen.split(' ')[1];
    const fixedColor: Color = fenTurn === 'b' ? 'black' : 'white';
    setPlayerColor(fixedColor);
    setCurrentPuzzle(puzzle);
    setEngine(newEngine);
    setMoveIndex(0);
    setLastMove(undefined);
    setFeedback(null);
    setIsProcessing(false);
  }, [streak]);

  // Load first puzzle when batch is ready
  useEffect(() => {
    if (puzzlesLoaded && !currentPuzzle) {
      loadNewPuzzle();
    }
  }, [puzzlesLoaded, currentPuzzle, loadNewPuzzle]);

  // Current FEN from engine
  const currentFEN = engine?.fen() || '8/8/8/8/8/8/8/8 w - - 0 1';

  // Whose turn
  const turnColor: Color = engine?.turn || 'white';

  // Legal destinations from engine
  const dests = useMemo(() => {
    if (!engine || isProcessing || feedback === 'solved' || feedback === 'wrong') {
      return new Map<Key, Key[]>();
    }
    try {
      return engine.legalDests();
    } catch {
      return new Map<Key, Key[]>();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, isProcessing, feedback, currentFEN]);

  const handleMove = useCallback((from: Key, to: Key) => {
    if (!currentPuzzle || !engine || isProcessing) return;

    const userMove = `${from}${to}`;
    const expectedMove = currentPuzzle.solution[moveIndex];
    if (!expectedMove) return;

    // Check match (handle promotion: e7e8q matches e7e8)
    const isCorrect = userMove === expectedMove ||
      userMove === expectedMove.substring(0, 4);

    if (isCorrect) {
      // Play the correct move
      const promotion = expectedMove.length === 5
        ? ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[expectedMove[4]] || undefined) as any
        : (engine.needsPromotion(from, to) ? 'queen' as const : undefined);

      const moveResult = engine.move(from, to, promotion);
      if (!moveResult) return;

      setLastMove([from, to]);
      setIsProcessing(true);

      const nextMoveIndex = moveIndex + 1;

      if (nextMoveIndex >= currentPuzzle.solution.length) {
        // Puzzle solved!
        setFeedback('solved');
        const newStreak = streak + 1;
        setStreak(newStreak);
        setTotalSolved(prev => prev + 1);
        markPuzzleSolved(currentPuzzle.id);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
          localStorage.setItem('puzzle_best_streak', newStreak.toString());
        }
        // Trigger re-render
        setEngine(prev => prev ? new ChessEngine(prev.fen()) : null);
        setTimeout(() => loadNewPuzzle(), 2000);
      } else {
        setFeedback('correct');

        // Auto-play opponent response
        const opponentMove = currentPuzzle.solution[nextMoveIndex];
        setTimeout(() => {
          if (opponentMove && engine) {
            const oFrom = opponentMove.substring(0, 2);
            const oTo = opponentMove.substring(2, 4);
            const oPromo = opponentMove.length === 5
              ? ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[opponentMove[4]] || undefined) as any
              : undefined;
            engine.move(oFrom, oTo, oPromo);
            setLastMove([oFrom as Key, oTo as Key]);
            setMoveIndex(nextMoveIndex + 1);
            setFeedback(null);
            setIsProcessing(false);
            setEngine(new ChessEngine(engine.fen()));
          }
        }, 600);
      }
    } else {
      // Wrong move
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => {
        if (currentPuzzle) {
          setEngine(new ChessEngine(currentPuzzle.fen));
          setMoveIndex(0);
          setLastMove(undefined);
          setFeedback(null);
          setIsProcessing(false);
        }
      }, 1500);
    }
  }, [currentPuzzle, engine, moveIndex, streak, bestStreak, isProcessing, loadNewPuzzle]);

  const skipPuzzle = useCallback(() => {
    setStreak(0);
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  const showSolution = useCallback(() => {
    if (!currentPuzzle || !engine) return;
    // Play the solution move to show it
    const solutionMove = currentPuzzle.solution[moveIndex];
    if (solutionMove) {
      const from = solutionMove.substring(0, 2);
      const to = solutionMove.substring(2, 4);
      const promo = solutionMove.length === 5
        ? ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[solutionMove[4]] || undefined) as any
        : undefined;
      engine.move(from, to, promo);
      setLastMove([from as Key, to as Key]);
      setEngine(new ChessEngine(engine.fen()));
      setFeedback('wrong');
      setStreak(0);
      setIsProcessing(true);
      setTimeout(() => loadNewPuzzle(), 2000);
    }
  }, [currentPuzzle, engine, moveIndex, loadNewPuzzle]);

  const resetPuzzle = useCallback(() => {
    if (currentPuzzle) {
      setEngine(new ChessEngine(currentPuzzle.fen));
      setMoveIndex(0);
      setLastMove(undefined);
      setFeedback(null);
      setIsProcessing(false);
    }
  }, [currentPuzzle]);

  const difficulty = getDifficultyForStreak(streak);
  const difficultyColors: Record<string, string> = {
    easy: '#5a9e6f', medium: '#ff9800', hard: '#f44336',
  };

  // Theme labels
  const themeLabels = currentPuzzle?.themes?.map(getThemeLabel).join(', ') || '';

  if (isLoading) {
    return (
      <div className="puzzles-page fade-in" id="puzzles-page">
        <FloatingPieces count={50} />
        <div className="puzzles-loading">
          <div className="puzzles-loading__spinner"></div>
          <p className="puzzles-loading__text">Cargando puzzles de Lichess...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="puzzles-page fade-in" id="puzzles-page">
      <FloatingPieces count={50} />
      {/* Stats bar */}
      <div className="puzzles-stats">
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Racha</span>
          <span className="puzzles-stats__value" style={{ color: streak > 0 ? '#5a9e6f' : 'inherit' }}>
            {streak}
          </span>
        </div>
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Resueltos</span>
          <span className="puzzles-stats__value">{totalSolved}</span>
        </div>
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Mejor racha</span>
          <span className="puzzles-stats__value">{bestStreak}</span>
        </div>
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Dificultad</span>
          <span className="puzzles-stats__value" style={{ color: difficultyColors[difficulty] }}>
            {getDifficultyLabel(difficulty)}
          </span>
        </div>
      </div>

      {/* Puzzle info */}
      {currentPuzzle && (
        <div className="puzzles-info">
          <h2 className="puzzles-info__title">
            Puzzle #{currentPuzzle.id}
            <span className="puzzles-info__rating"> - Rating {currentPuzzle.rating}</span>
          </h2>
          <span className="puzzles-info__theme">{themeLabels}</span>
          {currentPuzzle.plays > 0 && (
            <span className="puzzles-info__plays">{currentPuzzle.plays.toLocaleString()} jugadas</span>
          )}
          {feedback === 'correct' && <span className="puzzles-feedback puzzles-feedback--correct">Correcto - tu turno</span>}
          {feedback === 'wrong' && <span className="puzzles-feedback puzzles-feedback--wrong">Incorrecto - intenta de nuevo</span>}
          {feedback === 'solved' && <span className="puzzles-feedback puzzles-feedback--solved">Puzzle resuelto!</span>}
          {!feedback && <span className="puzzles-info__hint">Juegan las {turnColor === 'white' ? 'blancas' : 'negras'}</span>}
        </div>
      )}

      {/* Board */}
      <div className="puzzles-board-wrap">
        <ChessBoard
          fen={currentFEN}
          orientation={playerColor}
          turnColor={turnColor}
          lastMove={lastMove}
          dests={dests}
          viewOnly={isProcessing || feedback === 'solved' || feedback === 'wrong'}
          onMove={handleMove}
          animation={true}
        />
      </div>

      {/* Controls */}
      <div className="puzzles-controls">
        <button className="puzzles-controls__btn" onClick={showSolution}>
          Ver solucion
        </button>
        <button className="puzzles-controls__btn" onClick={skipPuzzle}>
          Saltar
        </button>
        <button className="puzzles-controls__btn" onClick={resetPuzzle}>
          Reiniciar
        </button>
      </div>
    </div>
  );
};
