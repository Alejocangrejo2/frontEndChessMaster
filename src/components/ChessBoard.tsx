// ============================================
// ChessBoard.tsx -- Tablero interactivo usando chessground
// ============================================

import React, { useRef, useEffect } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Color, Key } from 'chessground/types';
import type { LegalDests } from '../engine/ChessEngine';

// Import chessground CSS
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

export interface ChessBoardProps {
  fen: string;
  orientation?: Color;
  turnColor?: Color;
  movableColor?: Color;   // NEW: which color the player controls
  lastMove?: [Key, Key];
  check?: Key | boolean;
  dests?: LegalDests;
  viewOnly?: boolean;
  onMove?: (from: Key, to: Key) => void;
  animation?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation = 'white',
  turnColor = 'white',
  movableColor,
  lastMove,
  check,
  dests,
  viewOnly = false,
  onMove,
  animation = true,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Determine which color can move
  // If movableColor is set, use it. Otherwise fall back to turnColor.
  const effectiveColor = viewOnly ? undefined : (movableColor || turnColor);

  // Initialize chessground ONCE on mount
  useEffect(() => {
    if (!boardRef.current) return;

    const api = Chessground(boardRef.current, {
      fen,
      orientation,
      turnColor,
      lastMove: lastMove as Key[] | undefined,
      check: check ? true : undefined,
      coordinates: true,
      autoCastle: true,
      viewOnly: false, // NEVER set viewOnly on init — control via movable instead
      highlight: { lastMove: true, check: true },
      animation: { enabled: animation, duration: 200 },
      movable: {
        free: false,
        color: effectiveColor,
        dests: dests as Map<Key, Key[]> | undefined,
        showDests: true,
        events: {
          after: (orig: Key, dest: Key) => {
            onMoveRef.current?.(orig, dest);
          },
        },
      },
      premovable: { enabled: true, showDests: true, castle: true },
      draggable: { enabled: true, showGhost: true, distance: 3, autoDistance: true },
      selectable: { enabled: true },
      drawable: { enabled: true, visible: true },
    });

    apiRef.current = api;

    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update chessground when game state changes
  useEffect(() => {
    if (!apiRef.current) return;

    apiRef.current.set({
      fen,
      orientation,
      turnColor,
      lastMove: lastMove as Key[] | undefined,
      check: check ? true : undefined,
      movable: {
        free: false,
        color: effectiveColor,
        dests: dests as Map<Key, Key[]> | undefined,
        showDests: true,
        events: {
          after: (orig: Key, dest: Key) => {
            onMoveRef.current?.(orig, dest);
          },
        },
      },
      draggable: { enabled: !viewOnly },
    });
  }, [fen, orientation, turnColor, lastMove, check, dests, viewOnly, effectiveColor]);

  return (
    <div className="board-container">
      <div
        ref={boardRef}
        className="cg-wrap"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
