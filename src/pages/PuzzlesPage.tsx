// ============================================
// PuzzlesPage.tsx — Puzzle Rush Mode
// ============================================
// Usa el MISMO componente ChessBoard (chessground) que las partidas
// para mantener consistencia visual total.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { Puzzle, getRandomPuzzle, getDifficultyForStreak } from '../engine/puzzleData';
import type { Key } from 'chessground/types';

/**
 * Convert UCI move string to [from, to] keys for chessground.
 */
function uciToKeys(uci: string): [Key, Key] {
  const from = uci.substring(0, 2) as Key;
  const to = uci.substring(2, 4) as Key;
  return [from, to];
}

/**
 * Parse FEN to extract legal destinations for a specific piece.
 * For puzzles we only allow the solution move.
 */
function buildDestsForSolution(fen: string, solutionMove: string): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  const [from, to] = [solutionMove.substring(0, 2) as Key, solutionMove.substring(2, 4) as Key];
  
  // Parse FEN to find all pieces of the current turn
  const parts = fen.split(' ');
  const board = parts[0];
  const turn = parts[1]; // 'w' or 'b'
  const rows = board.split('/');
  
  // Find all squares with pieces of the current turn's color
  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        col += parseInt(ch);
      } else {
        const isWhite = ch === ch.toUpperCase();
        const isCurrentTurn = (turn === 'w' && isWhite) || (turn === 'b' && !isWhite);
        if (isCurrentTurn) {
          const square = (String.fromCharCode(97 + col) + (8 - r)) as Key;
          if (square === from) {
            dests.set(square, [to]);
          } else {
            // Allow selecting other pieces but no valid moves
            dests.set(square, []);
          }
        }
        col++;
      }
    }
  }
  
  return dests;
}

/**
 * Apply a UCI move to a FEN string (simplified — moves the piece).
 */
function applyMoveToFEN(fen: string, uci: string): string {
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  const board: (string | null)[][] = [];
  
  for (let r = 0; r < 8; r++) {
    board[r] = [];
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) board[r].push(null);
      } else {
        board[r].push(ch);
      }
    }
  }
  
  const fromC = uci.charCodeAt(0) - 97;
  const fromR = 8 - parseInt(uci[1]);
  const toC = uci.charCodeAt(2) - 97;
  const toR = 8 - parseInt(uci[3]);
  
  // Handle promotion
  let piece = board[fromR][fromC];
  if (uci.length === 5) {
    const promoChar = uci[4];
    piece = parts[1] === 'w' ? promoChar.toUpperCase() : promoChar.toLowerCase();
  }
  
  board[toR][toC] = piece;
  board[fromR][fromC] = null;
  
  // Rebuild FEN
  const newRows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = '';
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === null) {
        empty++;
      } else {
        if (empty > 0) { row += empty; empty = 0; }
        row += board[r][c];
      }
    }
    if (empty > 0) row += empty;
    newRows.push(row);
  }
  
  const newTurn = parts[1] === 'w' ? 'b' : 'w';
  return `${newRows.join('/')} ${newTurn} ${parts[2] || '-'} ${parts[3] || '-'} 0 1`;
}

export const PuzzlesPage: React.FC = () => {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [currentFEN, setCurrentFEN] = useState('8/8/8/8/8/8/8/8 w - - 0 1');
  const [moveIndex, setMoveIndex] = useState(0);
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
    setCurrentPuzzle(puzzle);
    setCurrentFEN(puzzle.fen);
    setMoveIndex(0);
    setLastMove(undefined);
    setFeedback(null);
    setIsProcessing(false);
  }, [streak]);

  useEffect(() => {
    loadNewPuzzle();
  }, []);

  // Determine whose turn it is from FEN
  const turnColor = useMemo(() => {
    const parts = currentFEN.split(' ');
    return parts[1] === 'w' ? 'white' : 'black';
  }, [currentFEN]);

  // Build legal destinations (only the solution move)
  const dests = useMemo(() => {
    if (!currentPuzzle || moveIndex >= currentPuzzle.solution.length || isProcessing) {
      return new Map<Key, Key[]>();
    }
    return buildDestsForSolution(currentFEN, currentPuzzle.solution[moveIndex]);
  }, [currentFEN, currentPuzzle, moveIndex, isProcessing]);

  const handleMove = useCallback((from: Key, to: Key) => {
    if (!currentPuzzle || isProcessing) return;
    
    const userMove = `${from}${to}`;
    const expectedMove = currentPuzzle.solution[moveIndex];
    
    if (userMove === expectedMove) {
      // Correct move!
      const newFEN = applyMoveToFEN(currentFEN, userMove);
      setCurrentFEN(newFEN);
      setLastMove([from, to]);
      setIsProcessing(true);

      const nextMoveIndex = moveIndex + 1;

      if (nextMoveIndex >= currentPuzzle.solution.length) {
        // Puzzle solved!
        setFeedback('solved');
        const newStreak = streak + 1;
        setStreak(newStreak);
        setTotalSolved(prev => prev + 1);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
          localStorage.setItem('puzzle_best_streak', newStreak.toString());
        }
        setTimeout(() => loadNewPuzzle(), 2000);
      } else {
        setFeedback('correct');
        setMoveIndex(nextMoveIndex);

        // Auto-play opponent response after a delay
        const opponentMove = currentPuzzle.solution[nextMoveIndex];
        setTimeout(() => {
          const afterOpponentFEN = applyMoveToFEN(newFEN, opponentMove);
          const [oFrom, oTo] = uciToKeys(opponentMove);
          setCurrentFEN(afterOpponentFEN);
          setLastMove([oFrom, oTo]);
          setMoveIndex(nextMoveIndex + 1);
          setFeedback(null);
          setIsProcessing(false);
        }, 600);
      }
    } else {
      // Wrong move!
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => {
        if (currentPuzzle) {
          setCurrentFEN(currentPuzzle.fen);
          setMoveIndex(0);
          setLastMove(undefined);
          setFeedback(null);
          setIsProcessing(false);
        }
      }, 1500);
    }
  }, [currentPuzzle, moveIndex, currentFEN, streak, bestStreak, isProcessing, loadNewPuzzle]);

  const skipPuzzle = useCallback(() => {
    setStreak(0);
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  const resetPuzzle = useCallback(() => {
    if (currentPuzzle) {
      setCurrentFEN(currentPuzzle.fen);
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
  const difficultyLabels: Record<string, string> = {
    easy: 'Fácil', medium: 'Medio', hard: 'Difícil',
  };

  return (
    <div className="puzzles-page fade-in" id="puzzles-page">
      {/* Stats bar */}
      <div className="puzzles-stats">
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Racha</span>
          <span className="puzzles-stats__value" style={{ color: streak > 0 ? '#4caf50' : 'inherit' }}>
            🔥 {streak}
          </span>
        </div>
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Resueltos</span>
          <span className="puzzles-stats__value">✓ {totalSolved}</span>
        </div>
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Mejor racha</span>
          <span className="puzzles-stats__value">🏆 {bestStreak}</span>
        </div>
        <div className="puzzles-stats__item">
          <span className="puzzles-stats__label">Dificultad</span>
          <span className="puzzles-stats__value" style={{ color: difficultyColors[difficulty] }}>
            {difficultyLabels[difficulty]}
          </span>
        </div>
      </div>

      {/* Puzzle info */}
      {currentPuzzle && (
        <div className="puzzles-info">
          <h2 className="puzzles-info__title">{currentPuzzle.title}</h2>
          <span className="puzzles-info__theme">{currentPuzzle.theme}</span>
          {feedback === 'correct' && <span className="puzzles-feedback puzzles-feedback--correct">✓ Correcto — tu turno</span>}
          {feedback === 'wrong' && <span className="puzzles-feedback puzzles-feedback--wrong">✕ Incorrecto — intenta de nuevo</span>}
          {feedback === 'solved' && <span className="puzzles-feedback puzzles-feedback--solved">🎉 ¡Puzzle resuelto!</span>}
          {!feedback && <span className="puzzles-info__hint">Juegan las {turnColor === 'white' ? 'blancas' : 'negras'}</span>}
        </div>
      )}

      {/* Board — SAME ChessBoard component as game */}
      <div className="puzzles-board-wrap">
        <ChessBoard
          fen={currentFEN}
          orientation={turnColor === 'white' ? 'white' : 'black'}
          turnColor={turnColor as 'white' | 'black'}
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
          Saltar ⏭
        </button>
        <button className="puzzles-controls__btn" onClick={resetPuzzle}>
          Reiniciar ↺
        </button>
      </div>
    </div>
  );
};
