// ============================================
// MoveList.tsx -- Panel de movimientos mejorado
// ============================================
// Mas grande, mas legible, con indicadores de calidad de jugada.
// Los indicadores se muestran como puntos de color (sin emojis).

import React, { useRef, useEffect } from 'react';
import type { MoveInfo } from '../engine/ChessEngine';

export type MoveQuality = 'brilliant' | 'great' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';

const QUALITY_LABELS: Record<MoveQuality, string> = {
  brilliant: 'Brillante',
  great: 'Genial',
  best: 'Mejor',
  good: 'Buena',
  inaccuracy: 'Imprecision',
  mistake: 'Error',
  blunder: 'Grave error',
  book: 'Teoria',
};

interface MoveListProps {
  moves: MoveInfo[];
  currentMoveIndex?: number;
  onMoveClick?: (index: number) => void;
  moveQualities?: (MoveQuality | null)[]; // Quality for each move
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentMoveIndex,
  onMoveClick,
  moveQualities,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Group moves into pairs
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

  const getQualityClass = (index: number): string => {
    if (!moveQualities || !moveQualities[index]) return '';
    return `move-list__move--${moveQualities[index]}`;
  };

  const getQualityTitle = (index: number): string => {
    if (!moveQualities || !moveQualities[index]) return '';
    return QUALITY_LABELS[moveQualities[index]!];
  };

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
      <div className="move-list__scroll">
        {movePairs.map((pair) => (
          <div key={pair.number} className="move-list__row">
            <span className="move-list__number">{pair.number}.</span>
            {pair.white && (
              <span
                className={`move-list__move ${currentMoveIndex === pair.whiteIdx ? 'move-list__move--active' : ''} ${getQualityClass(pair.whiteIdx)}`}
                onClick={() => onMoveClick?.(pair.whiteIdx)}
                title={getQualityTitle(pair.whiteIdx)}
              >
                {pair.white.san}
              </span>
            )}
            {pair.black && (
              <span
                className={`move-list__move ${currentMoveIndex === pair.blackIdx ? 'move-list__move--active' : ''} ${getQualityClass(pair.blackIdx)}`}
                onClick={() => onMoveClick?.(pair.blackIdx)}
                title={getQualityTitle(pair.blackIdx)}
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
