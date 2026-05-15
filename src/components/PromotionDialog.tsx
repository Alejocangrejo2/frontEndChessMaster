// ============================================
// PromotionDialog.tsx — Selector de pieza para promocion
// ============================================
// Muestra las 4 opciones de promocion al llegar un peon al final.

import React from 'react';
import type { Color } from 'chessground/types';

type PromotionChoice = 'queen' | 'rook' | 'bishop' | 'knight';

interface PromotionDialogProps {
  color: Color;
  onSelect: (piece: PromotionChoice) => void;
}

const PIECES: { role: PromotionChoice; white: string; black: string }[] = [
  { role: 'queen',  white: '\u2655', black: '\u265B' },
  { role: 'rook',   white: '\u2656', black: '\u265C' },
  { role: 'bishop', white: '\u2657', black: '\u265D' },
  { role: 'knight', white: '\u2658', black: '\u265E' },
];

export const PromotionDialog: React.FC<PromotionDialogProps> = ({ color, onSelect }) => {
  return (
    <div className="promotion-overlay" onClick={e => e.stopPropagation()}>
      <div className="promotion-dialog">
        <div className="promotion-dialog__title">Promocionar a:</div>
        <div className="promotion-dialog__options">
          {PIECES.map(p => (
            <button
              key={p.role}
              className="promotion-dialog__btn"
              onClick={() => onSelect(p.role)}
              title={p.role}
            >
              <span className="promotion-dialog__piece">
                {color === 'white' ? p.white : p.black}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
