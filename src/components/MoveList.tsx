// ============================================
// MoveList.tsx — Panel de movimientos estilo Lichess
// ============================================

import React, { useRef, useEffect } from 'react';
import type { MoveInfo } from '../engine/ChessEngine';

interface MoveListProps {
  moves: MoveInfo[];
  currentMoveIndex?: number;
  onMoveClick?: (index: number) => void;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentMoveIndex,
  onMoveClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Group moves into pairs (white, black)
  const movePairs: { number: number; white?: MoveInfo; black?: MoveInfo; whiteIdx: number; blackIdx: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
      whiteIdx: i,
      blackIdx: i + 1,
    });
  }

  if (moves.length === 0) {
    return (
      <div className="move-list">
        <div className="move-list__empty">
          Juega tu primer movimiento
        </div>
      </div>
    );
  }

  return (
    <div className="move-list" ref={scrollRef}>
      <div className="move-list__moves">
        {movePairs.map((pair) => (
          <div key={pair.number} className="move-list__row">
            <span className="move-list__number">{pair.number}.</span>
            {pair.white && (
              <span
                className={`move-list__move ${currentMoveIndex === pair.whiteIdx ? 'move-list__move--active' : ''}`}
                onClick={() => onMoveClick?.(pair.whiteIdx)}
              >
                {pair.white.san}
              </span>
            )}
            {pair.black && (
              <span
                className={`move-list__move ${currentMoveIndex === pair.blackIdx ? 'move-list__move--active' : ''}`}
                onClick={() => onMoveClick?.(pair.blackIdx)}
              >
                {pair.black.san}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
