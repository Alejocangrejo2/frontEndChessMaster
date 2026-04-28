// ============================================
// MultiplayerGamePage.tsx -- Partida multijugador sincronizada
// ============================================
// USA EL BACKEND COMO FUENTE UNICA DE VERDAD.
// Ambos jugadores ven el mismo estado.
// Solo el jugador en turno puede mover.
// Solo puede mover piezas de su color.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { PlayerBar } from '../components/PlayerBar';
import { ChessEngine } from '../engine/ChessEngine';
import type { Key, Color } from 'chessground/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('chess_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

interface RoomState {
  code: string;
  whitePlayer: string;
  blackPlayer: string | null;
  status: string;
  fen: string;
  currentTurn: string;
  lastMove: string | null;
  winner: string | null;
  moveCount: number;
  myColor: 'white' | 'black';
}

interface MultiplayerGamePageProps {
  roomCode: string;
  username: string;
  myColor: Color;
}

export const MultiplayerGamePage: React.FC<MultiplayerGamePageProps> = ({ roomCode, username, myColor }) => {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [statusMessage, setStatusMessage] = useState('Conectando...');
  const [isGameOver, setIsGameOver] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll the backend for state
  const pollState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/room/${roomCode}/state`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);

        // Update status
        if (data.status === 'WAITING') {
          setStatusMessage('Esperando oponente...');
        } else if (data.status === 'ACTIVE') {
          if (data.currentTurn === myColor) {
            setStatusMessage('Tu turno');
          } else {
            setStatusMessage('Turno del oponente');
          }
        } else if (data.status === 'RESIGNED') {
          setIsGameOver(true);
          setStatusMessage(data.winner === myColor ? 'Victoria - Oponente se rindio' : 'Derrota - Te rendiste');
        } else if (data.status === 'CHECKMATE') {
          setIsGameOver(true);
          setStatusMessage(data.winner === myColor ? 'Victoria - Jaque mate' : 'Derrota - Jaque mate');
        } else if (data.status === 'STALEMATE' || data.status === 'DRAW') {
          setIsGameOver(true);
          setStatusMessage('Tablas');
        }
      }
    } catch { /* silent */ }
  }, [roomCode, myColor]);

  // Start polling on mount
  useEffect(() => {
    pollState(); // immediate
    pollingRef.current = setInterval(pollState, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollState]);

  // Calculate legal dests from local engine (only for our color, only on our turn)
  const legalDests = useMemo(() => {
    if (!roomState || roomState.status !== 'ACTIVE' || roomState.currentTurn !== myColor) {
      return new Map<Key, Key[]>();
    }
    try {
      const tempEngine = new ChessEngine(roomState.fen);
      return tempEngine.legalDests();
    } catch {
      return new Map<Key, Key[]>();
    }
  }, [roomState, myColor]);

  // Handle move -- send to backend
  const handleMove = useCallback(async (from: Key, to: Key) => {
    if (!roomState || roomState.currentTurn !== myColor || isGameOver) return;

    try {
      // Create fresh engine from current FEN to validate and compute new FEN
      const tempEngine = new ChessEngine(roomState.fen);
      // Auto-promote to queen if needed
      const promotion = tempEngine.needsPromotion(from, to) ? 'queen' as const : undefined;
      const moveResult = tempEngine.move(from, to, promotion);
      if (!moveResult) return; // illegal move

      const newFen = tempEngine.fen();
      const newStatus = tempEngine.status;

      // Send to backend
      const res = await fetch(`${API_URL}/api/room/${roomCode}/move`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ from, to, fen: newFen }),
      });

      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);

        // Check if game ended (checkmate/stalemate)
        if (newStatus === 'checkmate' || newStatus === 'stalemate') {
          const winner = newStatus === 'checkmate' ? myColor : undefined;
          await fetch(`${API_URL}/api/room/${roomCode}/resign`, {
            method: 'POST',
            headers: authHeaders(),
          }).catch(() => {});
        }
      }
    } catch { /* silent */ }
  }, [roomState, roomCode, myColor, isGameOver]);

  // Resign
  const handleResign = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/room/${roomCode}/resign`, {
        method: 'POST',
        headers: authHeaders(),
      });
      pollState();
    } catch { /* silent */ }
  }, [roomCode, pollState]);

  // Derive display state
  const displayFen = roomState?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const turnColor = (roomState?.currentTurn || 'white') as Color;
  const isMyTurn = roomState?.currentTurn === myColor;

  const lastMoveKeys: [Key, Key] | undefined = useMemo(() => {
    if (!roomState?.lastMove) return undefined;
    const parts = roomState.lastMove.split(',');
    if (parts.length !== 2) return undefined;
    return [parts[0] as Key, parts[1] as Key];
  }, [roomState?.lastMove]);

  const opponentName = roomState
    ? (myColor === 'white' ? (roomState.blackPlayer || 'Esperando...') : roomState.whitePlayer)
    : 'Esperando...';

  const viewOnly = !isMyTurn || isGameOver || roomState?.status !== 'ACTIVE';

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  return (
    <div className="game-page" id="game-page">
      {/* Left Panel */}
      <aside className="game-page__info" id="game-info-panel">
        <div className="game-info">
          <div className="game-info__header">
            <span className="game-info__type">
              Partida privada - Codigo: {roomCode}
            </span>
          </div>
          <div className="game-info__players">
            <div className="game-info__player">
              <span className={`game-info__dot ${turnColor === 'white' ? 'game-info__dot--active' : ''}`} />
              {roomState?.whitePlayer || '...'} (Blancas)
            </div>
            <div className="game-info__player">
              <span className={`game-info__dot ${turnColor === 'black' ? 'game-info__dot--active' : ''}`} />
              {roomState?.blackPlayer || 'Esperando...'} (Negras)
            </div>
          </div>
        </div>
      </aside>

      {/* Center -- Board */}
      <div className="game-page__board" id="game-board-area">
        <PlayerBar
          name={opponentName}
          isActive={!isMyTurn && !isGameOver}
          color={myColor === 'white' ? 'black' : 'white'}
          timeMs={Infinity}
          formatTime={() => '--:--'}
          capturedPieces={[]}
          materialDiff={0}
          isOnline={!!roomState?.blackPlayer}
        />

        <ChessBoard
          fen={displayFen}
          orientation={myColor}
          turnColor={turnColor}
          lastMove={lastMoveKeys}
          dests={legalDests}
          viewOnly={viewOnly}
          onMove={handleMove}
        />

        <PlayerBar
          name={username}
          isActive={isMyTurn && !isGameOver}
          color={myColor}
          timeMs={Infinity}
          formatTime={() => '--:--'}
          capturedPieces={[]}
          materialDiff={0}
          isOnline={true}
        />
      </div>

      {/* Right Panel */}
      <aside className="game-page__panel" id="game-side-panel">
        <div className="panel-player panel-player--top">
          <span className={`panel-player__dot ${roomState?.blackPlayer ? 'panel-player__dot--online' : 'panel-player__dot--offline'}`} />
          <span className="panel-player__name">{opponentName}</span>
        </div>

        {/* Status */}
        <div className={`game-status game-status--${isGameOver ? 'checkmate' : 'playing'}`} id="game-status">
          <div className="game-status__text">
            <span className="game-status__message">{statusMessage}</span>
            {roomState?.status === 'ACTIVE' && (
              <span className="game-status__turn">
                Movimientos: {roomState.moveCount}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isGameOver && roomState?.status === 'ACTIVE' && (
          <div className="game-actions" id="game-actions">
            <button
              className={`game-actions__btn game-actions__btn--resign ${showResignConfirm ? 'game-actions__btn--confirm' : ''}`}
              onClick={() => {
                if (showResignConfirm) {
                  handleResign();
                  setShowResignConfirm(false);
                } else {
                  setShowResignConfirm(true);
                }
              }}
              id="btn-resign"
            >
              {showResignConfirm ? 'Confirmar rendicion' : 'Rendirse'}
            </button>
          </div>
        )}

        {/* Game over */}
        {isGameOver && (
          <div className="game-over-actions" id="game-over-actions">
            <button
              className="game-over-actions__btn game-over-actions__btn--new"
              onClick={() => window.location.href = '/'}
              id="btn-new-game"
            >
              Volver al lobby
            </button>
          </div>
        )}

        <div className="panel-player panel-player--bottom">
          <span className="panel-player__dot panel-player__dot--online" />
          <span className="panel-player__name">{username} ({myColor === 'white' ? 'Blancas' : 'Negras'})</span>
        </div>

        {!isGameOver && (
          <div className="panel-turn" id="turn-indicator">
            {isMyTurn ? 'Tu turno' : 'Turno del oponente'}
          </div>
        )}
      </aside>
    </div>
  );
};
