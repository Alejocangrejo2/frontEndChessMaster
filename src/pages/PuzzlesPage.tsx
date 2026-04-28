// ============================================
// PuzzlesPage.tsx -- Puzzle Rush usando puzzles reales
// ============================================
// Usa el MISMO componente ChessBoard que las partidas.
// Valida movimientos usando ChessEngine (chessops).
// Formato Lichess: FEN + movimientos UCI.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { ChessEngine } from '../engine/ChessEngine';
import {
  Puzzle,
  getRandomPuzzle,
  getDifficultyForStreak,
  getDifficultyLabel,
  getThemeLabel,
} from '../engine/puzzleData';
import type { Key, Color } from 'chessground/types';

export const PuzzlesPage: React.FC = () => {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [engine, setEngine] = useState<ChessEngine | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);  // Index into puzzle.moves that player must play
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>(undefined);
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'solved' | null>(null);
  const [bestStreak, setBestStreak] = useState(() => {
    return parseInt(localStorage.getItem('puzzle_best_streak') || '0');
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const loadNewPuzzle = useCallback(() => {
    const difficulty = getDifficultyForStreak(streak);
    const puzzle = getRandomPuzzle(difficulty);
    const newEngine = new ChessEngine(puzzle.fen);
    setCurrentPuzzle(puzzle);
    setEngine(newEngine);
    setMoveIndex(0);
    setLastMove(undefined);
    setFeedback(null);
    setIsProcessing(false);
  }, [streak]);

  useEffect(() => {
    loadNewPuzzle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Current FEN from engine
  const currentFEN = engine?.fen() || '8/8/8/8/8/8/8/8 w - - 0 1';

  // Determine whose turn it is
  const turnColor: Color = useMemo(() => {
    return engine?.turn || 'white';
  }, [engine, currentFEN]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build legal destinations from engine (all legal moves, not just solution)
  const dests = useMemo(() => {
    if (!engine || isProcessing || feedback === 'solved' || feedback === 'wrong') {
      return new Map<Key, Key[]>();
    }
    try {
      return engine.legalDests();
    } catch {
      return new Map<Key, Key[]>();
    }
  }, [engine, isProcessing, feedback, currentFEN]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback((from: Key, to: Key) => {
    if (!currentPuzzle || !engine || isProcessing) return;

    const userMove = `${from}${to}`;
    const expectedMove = currentPuzzle.moves[moveIndex];

    // Check if the move matches (also handle promotion: e7e8q)
    const isCorrect = expectedMove &&
      (userMove === expectedMove || userMove === expectedMove.substring(0, 4));

    if (isCorrect) {
      // Play the correct move on the engine
      const promotion = expectedMove.length === 5
        ? (expectedMove[4] === 'q' ? 'queen' : expectedMove[4] === 'r' ? 'rook' : expectedMove[4] === 'b' ? 'bishop' : 'knight') as const
        : (engine.needsPromotion(from, to) ? 'queen' as const : undefined);

      const moveResult = engine.move(from, to, promotion);
      if (!moveResult) return;

      setLastMove([from, to]);
      setIsProcessing(true);

      const nextMoveIndex = moveIndex + 1;

      if (nextMoveIndex >= currentPuzzle.moves.length) {
        // Puzzle solved!
        setFeedback('solved');
        const newStreak = streak + 1;
        setStreak(newStreak);
        setTotalSolved(prev => prev + 1);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
          localStorage.setItem('puzzle_best_streak', newStreak.toString());
        }
        // Force re-render for FEN update
        setEngine(Object.create(Object.getPrototypeOf(engine), Object.getOwnPropertyDescriptors(engine)));
        setTimeout(() => loadNewPuzzle(), 2000);
      } else {
        setFeedback('correct');
        setMoveIndex(nextMoveIndex);

        // Auto-play opponent response after a delay
        const opponentMove = currentPuzzle.moves[nextMoveIndex];
        setTimeout(() => {
          if (opponentMove) {
            const oFrom = opponentMove.substring(0, 2);
            const oTo = opponentMove.substring(2, 4);
            const oPromo = opponentMove.length === 5
              ? (opponentMove[4] === 'q' ? 'queen' : opponentMove[4] === 'r' ? 'rook' : opponentMove[4] === 'b' ? 'bishop' : 'knight') as const
              : undefined;
            engine.move(oFrom, oTo, oPromo);
            setLastMove([oFrom as Key, oTo as Key]);
            setMoveIndex(nextMoveIndex + 1);
            setFeedback(null);
            setIsProcessing(false);
            // Force re-render
            setEngine(Object.create(Object.getPrototypeOf(engine), Object.getOwnPropertyDescriptors(engine)));
          }
        }, 600);
      }
    } else {
      // Wrong move!
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => {
        if (currentPuzzle) {
          // Reset to puzzle start
          const freshEngine = new ChessEngine(currentPuzzle.fen);
          setEngine(freshEngine);
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

  const resetPuzzle = useCallback(() => {
    if (currentPuzzle) {
      const freshEngine = new ChessEngine(currentPuzzle.fen);
      setEngine(freshEngine);
      setMoveIndex(0);
      setLastMove(undefined);
      setFeedback(null);
      setIsProcessing(false);
    }
  }, [currentPuzzle]);

  const difficulty = getDifficultyForStreak(streak);
  const difficultyColors: Record<string, string> = {
    easy: '#4caf50', medium: '#ff9800', hard: '#f44336',
  };

  // Primary theme label
  const themeLabel = currentPuzzle?.themes?.[0]
    ? getThemeLabel(currentPuzzle.themes[0])
    : '';

  return (
    <div className="puzzles-page fade-in" id="puzzles-page">
      {/* Stats bar */}
      <div className="puzzles-stats">
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Racha</span>
          <span className="puzzles-stats__value" style={{ color: streak > 0 ? '#4caf50' : 'inherit' }}>
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
          <h2 className="puzzles-info__title">{currentPuzzle.title}</h2>
          <span className="puzzles-info__theme">
            {themeLabel} - Rating {currentPuzzle.rating}
          </span>
          {feedback === 'correct' && <span className="puzzles-feedback puzzles-feedback--correct">Correcto - tu turno</span>}
          {feedback === 'wrong' && <span className="puzzles-feedback puzzles-feedback--wrong">Incorrecto - intenta de nuevo</span>}
          {feedback === 'solved' && <span className="puzzles-feedback puzzles-feedback--solved">Puzzle resuelto!</span>}
          {!feedback && <span className="puzzles-info__hint">Juegan las {turnColor === 'white' ? 'blancas' : 'negras'}</span>}
        </div>
      )}

      {/* Board -- SAME ChessBoard component as game */}
      <div className="puzzles-board-wrap">
        <ChessBoard
          fen={currentFEN}
          orientation={turnColor}
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
