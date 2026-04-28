// ============================================
// PuzzlesPage.tsx — Puzzle Rush Mode
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import { Puzzle, getRandomPuzzle, getDifficultyForStreak } from '../engine/puzzleData';

interface PuzzleSquare {
  piece: string | null;
  color: 'light' | 'dark';
}

const PIECE_UNICODE: Record<string, string> = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

function parseFEN(fen: string): PuzzleSquare[][] {
  const board: PuzzleSquare[][] = [];
  const rows = fen.split(' ')[0].split('/');
  for (let r = 0; r < 8; r++) {
    board[r] = [];
    let col = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) {
          const isLight = (r + col) % 2 === 0;
          board[r].push({ piece: null, color: isLight ? 'light' : 'dark' });
          col++;
        }
      } else {
        const isLight = (r + col) % 2 === 0;
        board[r].push({ piece: ch, color: isLight ? 'light' : 'dark' });
        col++;
      }
    }
  }
  return board;
}

function squareToCoords(uci: string): { fromR: number; fromC: number; toR: number; toC: number } {
  return {
    fromC: uci.charCodeAt(0) - 97,
    fromR: 8 - parseInt(uci[1]),
    toC: uci.charCodeAt(2) - 97,
    toR: 8 - parseInt(uci[3]),
  };
}

function coordsToUCI(fromR: number, fromC: number, toR: number, toC: number): string {
  return String.fromCharCode(97 + fromC) + (8 - fromR) +
         String.fromCharCode(97 + toC) + (8 - toR);
}

export const PuzzlesPage: React.FC = () => {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [board, setBoard] = useState<PuzzleSquare[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'solved' | null>(null);
  const [bestStreak, setBestStreak] = useState(() => {
    return parseInt(localStorage.getItem('puzzle_best_streak') || '0');
  });

  const loadNewPuzzle = useCallback(() => {
    const difficulty = getDifficultyForStreak(streak);
    const puzzle = getRandomPuzzle(difficulty);
    setCurrentPuzzle(puzzle);
    setBoard(parseFEN(puzzle.fen));
    setMoveIndex(0);
    setSelectedSquare(null);
    setFeedback(null);
  }, [streak]);

  useEffect(() => {
    loadNewPuzzle();
  }, []);

  const handleSquareClick = useCallback((r: number, c: number) => {
    if (!currentPuzzle || feedback === 'solved' || feedback === 'wrong') return;

    if (selectedSquare) {
      // Try to make a move
      const uci = coordsToUCI(selectedSquare.r, selectedSquare.c, r, c);
      const expectedMove = currentPuzzle.solution[moveIndex];

      if (uci === expectedMove) {
        // Correct move
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = { ...newBoard[r][c], piece: newBoard[selectedSquare.r][selectedSquare.c].piece };
        newBoard[selectedSquare.r][selectedSquare.c] = { ...newBoard[selectedSquare.r][selectedSquare.c], piece: null };
        setBoard(newBoard);
        setSelectedSquare(null);

        if (moveIndex + 1 >= currentPuzzle.solution.length) {
          // Puzzle solved!
          setFeedback('solved');
          const newStreak = streak + 1;
          setStreak(newStreak);
          setTotalSolved(prev => prev + 1);
          if (newStreak > bestStreak) {
            setBestStreak(newStreak);
            localStorage.setItem('puzzle_best_streak', newStreak.toString());
          }
          setTimeout(() => loadNewPuzzle(), 1500);
        } else {
          setFeedback('correct');
          setMoveIndex(prev => prev + 1);

          // Auto-play opponent response if there is one
          if (moveIndex + 1 < currentPuzzle.solution.length) {
            const opponentMove = currentPuzzle.solution[moveIndex + 1];
            if (opponentMove) {
              const { fromR, fromC, toR, toC } = squareToCoords(opponentMove);
              setTimeout(() => {
                const nextBoard = newBoard.map(row => [...row]);
                nextBoard[toR][toC] = { ...nextBoard[toR][toC], piece: nextBoard[fromR][fromC].piece };
                nextBoard[fromR][fromC] = { ...nextBoard[fromR][fromC], piece: null };
                setBoard(nextBoard);
                setMoveIndex(prev => prev + 1);
                setFeedback(null);
              }, 500);
            }
          }
        }
      } else {
        // Wrong move
        setFeedback('wrong');
        setStreak(0);
        setSelectedSquare(null);
        setTimeout(() => {
          setBoard(parseFEN(currentPuzzle.fen));
          setMoveIndex(0);
          setFeedback(null);
        }, 1500);
      }
    } else {
      // Select a piece
      if (board[r][c].piece) {
        setSelectedSquare({ r, c });
      }
    }
  }, [selectedSquare, board, currentPuzzle, moveIndex, streak, bestStreak, feedback, loadNewPuzzle]);

  const skipPuzzle = useCallback(() => {
    setStreak(0);
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  const difficulty = getDifficultyForStreak(streak);
  const difficultyColors = {
    easy: '#4caf50',
    medium: '#ff9800',
    hard: '#f44336',
  };
  const difficultyLabels = {
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
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
          {feedback === 'correct' && <span className="puzzles-feedback puzzles-feedback--correct">✓ Correcto</span>}
          {feedback === 'wrong' && <span className="puzzles-feedback puzzles-feedback--wrong">✕ Incorrecto</span>}
          {feedback === 'solved' && <span className="puzzles-feedback puzzles-feedback--solved">🎉 ¡Resuelto!</span>}
        </div>
      )}

      {/* Board */}
      <div className="puzzles-board">
        {board.map((row, r) => (
          <div key={r} className="puzzles-board__row">
            {row.map((sq, c) => {
              const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`puzzles-board__square puzzles-board__square--${sq.color} ${isSelected ? 'puzzles-board__square--selected' : ''}`}
                  onClick={() => handleSquareClick(r, c)}
                >
                  {sq.piece && (
                    <span className={`puzzles-board__piece ${sq.piece === sq.piece.toUpperCase() ? 'puzzles-board__piece--white' : 'puzzles-board__piece--black'}`}>
                      {PIECE_UNICODE[sq.piece]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="puzzles-controls">
        <button className="puzzles-controls__btn" onClick={skipPuzzle}>
          Saltar ⏭
        </button>
        <button className="puzzles-controls__btn" onClick={() => {
          if (currentPuzzle) {
            setBoard(parseFEN(currentPuzzle.fen));
            setMoveIndex(0);
            setSelectedSquare(null);
            setFeedback(null);
          }
        }}>
          Reiniciar ↺
        </button>
      </div>
    </div>
  );
};
