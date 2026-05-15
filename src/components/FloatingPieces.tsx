// ============================================
// FloatingPieces.tsx — Componente reutilizable de piezas flotantes
// ============================================
// Renderiza piezas de ajedrez flotando en el fondo.
// Uso: <FloatingPieces count={30} /> en cualquier pantalla.

import React, { useMemo } from 'react';

const PIECE_CHARS = [
  '\u2654', '\u2655', '\u2656', '\u2657', '\u2658', '\u2659', // White
  '\u265A', '\u265B', '\u265C', '\u265D', '\u265E', '\u265F', // Black
];

const COLORS = [
  'rgba(255,255,255,',  // white
  'rgba(200,200,200,',  // silver
  'rgba(139,90,43,',    // wood
  'rgba(100,100,100,',  // gray
  'rgba(80,80,80,',     // dark gray
  'rgba(60,60,60,',     // charcoal
  'rgba(90,158,111,',   // accent green (muted)
];

interface FloatingPiecesProps {
  count?: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const FloatingPieces: React.FC<FloatingPiecesProps> = ({ count = 30 }) => {
  const pieces = useMemo(() => {
    const rng = seededRandom(42); // Deterministic so it doesn't re-shuffle
    const result = [];

    for (let i = 0; i < count; i++) {
      const depth = rng(); // 0 = far, 1 = near
      const size = 16 + depth * 60; // 16-76px
      const blur = Math.max(0, Math.round((1 - depth) * 4)); // 0-4px
      const opacity = 0.02 + depth * 0.06; // 0.02-0.08
      const speed = 40 - depth * 28; // 12-40s
      const colorIdx = Math.floor(rng() * COLORS.length);
      const pieceIdx = Math.floor(rng() * PIECE_CHARS.length);

      result.push({
        char: PIECE_CHARS[pieceIdx],
        x: rng() * 96 + 2,   // 2%-98%
        y: rng() * 96 + 2,
        size: Math.round(size),
        speed: Math.round(speed),
        blur,
        color: `${COLORS[colorIdx]}${opacity.toFixed(2)})`,
        delay: -Math.round(rng() * 15),
      });
    }
    return result;
  }, [count]);

  return (
    <div className="floating-pieces" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="floating-pieces__piece"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            color: p.color,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
            filter: p.blur > 0 ? `blur(${p.blur}px)` : 'none',
            textShadow: p.blur === 0 ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
};
