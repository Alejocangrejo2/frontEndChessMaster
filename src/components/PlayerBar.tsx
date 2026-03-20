// ============================================
// PlayerBar.tsx — Barra de jugador con ventaja de material
// ============================================
// Muestra: nombre, piezas capturadas agrupadas, ventaja de material, reloj

import React from 'react';
import type { Role } from 'chessops/types';

interface PlayerBarProps {
  name: string;
  rating?: number;
  title?: string;
  isOnline?: boolean;
  isActive?: boolean;
  color: 'white' | 'black';
  timeMs: number;
  formatTime: (ms: number) => string;
  capturedPieces?: Role[];
  materialDiff?: number;
}

// SVG piece symbols for captured display (small, consistent)
const PIECE_CHAR: Record<string, string> = {
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
};

// Group and sort captured pieces for display
function groupCaptured(pieces: Role[]): { role: Role; count: number }[] {
  const order: Role[] = ['queen', 'rook', 'bishop', 'knight', 'pawn'];
  const counts = new Map<Role, number>();
  for (const p of pieces) {
    counts.set(p, (counts.get(p) || 0) + 1);
  }
  return order
    .filter(r => counts.has(r))
    .map(r => ({ role: r, count: counts.get(r)! }));
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  name,
  rating,
  title,
  isOnline = true,
  isActive = false,
  color: _color,
  timeMs,
  formatTime,
  capturedPieces = [],
  materialDiff = 0,
}) => {
  const isLow = timeMs <= 30000 && timeMs > 0;
  const isCritical = timeMs <= 10000 && timeMs > 0;
  const grouped = groupCaptured(capturedPieces);

  return (
    <div className={`player-bar ${isActive ? 'player-bar--active' : ''}`}>
      <div className="player-bar__info">
        <span className={`player-bar__status ${isOnline ? 'player-bar__status--online' : ''}`} />
        {title && <span className="player-bar__title">{title}</span>}
        <span className="player-bar__name">{name}</span>
        {rating !== undefined && <span className="player-bar__rating">{rating}</span>}
      </div>
      <div className="player-bar__captured">
        {grouped.map(({ role, count }) => (
          <span key={role} className="player-bar__piece-group">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="player-bar__piece">{PIECE_CHAR[role]}</span>
            ))}
          </span>
        ))}
        {materialDiff > 0 && (
          <span className="player-bar__diff">+{materialDiff}</span>
        )}
      </div>
      <div className={[
        'player-bar__clock',
        isActive ? 'player-bar__clock--active' : '',
        isLow ? 'player-bar__clock--low' : '',
        isCritical ? 'player-bar__clock--critical' : '',
      ].filter(Boolean).join(' ')}>
        {formatTime(timeMs)}
      </div>
    </div>
  );
};
