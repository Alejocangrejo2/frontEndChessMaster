// ============================================
// EvalBar.tsx — Barra de evaluación vertical
// ============================================
// Muestra evaluación tipo chess.com: blanca arriba, negra abajo.

import React from 'react';

interface EvalBarProps {
  /** Evaluation in centipawns from white's perspective */
  evaluation: number;
  /** Flipped orientation (black at bottom) */
  flipped?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({ evaluation, flipped = false }) => {
  // Convert centipawns to percentage (sigmoid-like function)
  // -1000 → ~5%, 0 → 50%, +1000 → ~95%
  const sigmoid = (cp: number): number => {
    const x = cp / 400; // Scale factor
    return 1 / (1 + Math.exp(-x));
  };

  const whitePercent = sigmoid(evaluation) * 100;
  const blackPercent = 100 - whitePercent;

  // Display value
  const displayEval = (): string => {
    if (Math.abs(evaluation) >= 9900) {
      const mateIn = Math.round((10000 - Math.abs(evaluation)) / 10);
      return `M${mateIn}`;
    }
    const pawns = evaluation / 100;
    if (pawns > 0) return `+${pawns.toFixed(1)}`;
    return pawns.toFixed(1);
  };

  const isWhiteAdvantage = evaluation > 0;

  return (
    <div className="eval-bar" title={`Evaluación: ${displayEval()}`}>
      <div
        className="eval-bar__white"
        style={{ height: `${flipped ? blackPercent : whitePercent}%` }}
      />
      <div
        className="eval-bar__black"
        style={{ height: `${flipped ? whitePercent : blackPercent}%` }}
      />
      <span className={`eval-bar__label ${isWhiteAdvantage ? 'eval-bar__label--white' : 'eval-bar__label--black'}`}>
        {displayEval()}
      </span>
    </div>
  );
};
