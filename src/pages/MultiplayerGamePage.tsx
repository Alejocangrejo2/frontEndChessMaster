// ============================================
// MultiplayerGamePage.tsx -- Partida multijugador sincronizada
// ============================================
// Backend = fuente unica de verdad.
// Detecta correctamente: jaque mate, tablas, rendicion.
// Incluye pantalla post-partida con revision de movimientos.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { PlayerBar } from '../components/PlayerBar';
import { ChessEngine } from '../engine/ChessEngine';
import { FloatingPieces } from '../components/FloatingPieces';
import type { Key, Color } from 'chessground/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('chess_token');
  return token
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

interface RoomMove {
  moveNumber: number;
  from: string;
  to: string;
  san: string;
  color: string;
  fen: string;
}

interface RoomState {
  code: string;
  whitePlayer: string;
  blackPlayer: string | null;
  status: string;       // WAITING, ACTIVE, FINISHED
  fen: string;
  currentTurn: string;
  lastMove: string | null;
  winner: string | null;
  endReason: string | null; // CHECKMATE, STALEMATE, DRAW, RESIGNED, ABANDONED
  moveCount: number;
  myColor: 'white' | 'black';
  moves: RoomMove[];
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
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Review state
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const isReviewing = reviewIndex !== null;

  // Poll the backend for state
  const pollState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/room/${roomCode}/state`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);

        if (data.status === 'WAITING') {
          setStatusMessage('Esperando oponente...');
        } else if (data.status === 'ACTIVE') {
          setStatusMessage(data.currentTurn === myColor ? 'Tu turno' : 'Turno del oponente');
        } else if (data.status === 'FINISHED') {
          setIsGameOver(true);
          // Stop polling once game is over
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          // Build correct end message
          const isWinner = data.winner === myColor;
          const isDraw = !data.winner;
          switch (data.endReason) {
            case 'CHECKMATE':
              setStatusMessage(isWinner ? 'Victoria por jaque mate' : 'Derrota por jaque mate');
              break;
            case 'STALEMATE':
              setStatusMessage('Tablas por ahogado');
              break;
            case 'DRAW':
              setStatusMessage('Tablas');
              break;
            case 'RESIGNED':
              setStatusMessage(isWinner ? 'Victoria - El oponente se rindio' : 'Derrota - Te rendiste');
              break;
            case 'ABANDONED':
              setStatusMessage(isWinner ? 'Victoria por abandono' : 'Derrota por abandono');
              break;
            default:
              setStatusMessage(isDraw ? 'Tablas' : (isWinner ? 'Victoria' : 'Derrota'));
          }
        }
      }
    } catch { /* silent */ }
  }, [roomCode, myColor]);

  // Start polling on mount
  useEffect(() => {
    pollState();
    pollingRef.current = setInterval(pollState, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollState]);

  // Calculate legal dests (only for our color, only on our turn)
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

  // Handle move -- validate locally, send to backend, detect game end
  const handleMove = useCallback(async (from: Key, to: Key) => {
    if (!roomState || roomState.currentTurn !== myColor || isGameOver) return;

    try {
      const tempEngine = new ChessEngine(roomState.fen);
      const promotion = tempEngine.needsPromotion(from, to) ? 'queen' as const : undefined;
      const moveResult = tempEngine.move(from, to, promotion);
      if (!moveResult) return;

      const newFen = tempEngine.fen();
      const san = moveResult.san;
      const gameStatus = tempEngine.status;

      // Send move to backend
      const res = await fetch(`${API_URL}/api/room/${roomCode}/move`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ from, to, fen: newFen, san }),
      });

      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);

        // Detect game-ending conditions AFTER the move
        if (gameStatus === 'checkmate') {
          await fetch(`${API_URL}/api/room/${roomCode}/end`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason: 'CHECKMATE', winner: myColor }),
          });
          pollState(); // Immediately refresh to get final state
        } else if (gameStatus === 'stalemate') {
          await fetch(`${API_URL}/api/room/${roomCode}/end`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason: 'STALEMATE', winner: null }),
          });
          pollState();
        } else if (gameStatus === 'draw') {
          await fetch(`${API_URL}/api/room/${roomCode}/end`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason: 'DRAW', winner: null }),
          });
          pollState();
        }
      }
    } catch { /* silent */ }
  }, [roomState, roomCode, myColor, isGameOver, pollState]);

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

  // === Review functions ===
  const moves = roomState?.moves || [];
  const goToMove = (index: number) => {
    if (index < 0 || index >= moves.length) return;
    setReviewIndex(index);
  };
  const goToStart = () => setReviewIndex(moves.length > 0 ? 0 : null);
  const goToEnd = () => setReviewIndex(null);
  const goBack = () => {
    if (reviewIndex === null && moves.length > 0) setReviewIndex(moves.length - 1);
    else if (reviewIndex !== null && reviewIndex > 0) setReviewIndex(reviewIndex - 1);
  };
  const goForward = () => {
    if (reviewIndex !== null) {
      if (reviewIndex >= moves.length - 1) setReviewIndex(null);
      else setReviewIndex(reviewIndex + 1);
    }
  };

  // === Derive display state ===
  const displayFen = isReviewing && reviewIndex !== null && moves[reviewIndex]
    ? moves[reviewIndex].fen
    : (roomState?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  const turnColor = (roomState?.currentTurn || 'white') as Color;
  const isMyTurn = roomState?.currentTurn === myColor;

  const lastMoveKeys: [Key, Key] | undefined = useMemo(() => {
    if (isReviewing && reviewIndex !== null && moves[reviewIndex]) {
      return [moves[reviewIndex].from as Key, moves[reviewIndex].to as Key];
    }
    if (!roomState?.lastMove) return undefined;
    const parts = roomState.lastMove.split(',');
    if (parts.length !== 2) return undefined;
    return [parts[0] as Key, parts[1] as Key];
  }, [roomState?.lastMove, isReviewing, reviewIndex, moves]);

  const opponentName = roomState
    ? (myColor === 'white' ? (roomState.blackPlayer || 'Esperando...') : roomState.whitePlayer)
    : 'Esperando...';

  // Display dests: empty during review or when game is over
  const displayDests = isReviewing || isGameOver ? new Map<Key, Key[]>() : legalDests;

  // Group moves into pairs for display (1. e4 e5  2. Nf3 Nc6 ...)
  const movePairs = useMemo(() => {
    const pairs: { num: number; white?: RoomMove; black?: RoomMove; whiteIdx: number; blackIdx: number }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1],
        whiteIdx: i,
        blackIdx: i + 1,
      });
    }
    return pairs;
  }, [moves]);

  return (
    <div className="game-page" id="game-page">
      <FloatingPieces count={30} />
      {/* Left Panel */}
      <aside className="game-page__info" id="game-info-panel">
        <div className="game-info">
          <div className="game-info__header">
            <span className="game-info__type">
              Partida privada - {roomCode}
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
          movableColor={myColor}
          lastMove={lastMoveKeys}
          dests={displayDests}
          viewOnly={isGameOver || isReviewing}
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

        {/* Move navigation */}
        {moves.length > 0 && (
          <div className="panel-nav" id="move-nav">
            <button className="panel-nav__btn" title="Inicio" onClick={goToStart}>|&lt;</button>
            <button className="panel-nav__btn" title="Anterior" onClick={goBack}>&lt;</button>
            <button className="panel-nav__btn" title="Siguiente" onClick={goForward}>&gt;</button>
            <button className="panel-nav__btn" title="Final" onClick={goToEnd}>&gt;|</button>
          </div>
        )}

        {/* Move list */}
        {moves.length > 0 && (
          <div className="move-list" id="move-list">
            <div className="move-list__scroll">
              {movePairs.map(pair => (
                <div className="move-list__row" key={pair.num}>
                  <span className="move-list__number">{pair.num}.</span>
                  {pair.white && (
                    <span
                      className={`move-list__move ${reviewIndex === pair.whiteIdx ? 'move-list__move--active' : ''}`}
                      onClick={() => goToMove(pair.whiteIdx)}
                    >
                      {pair.white.san}
                    </span>
                  )}
                  {pair.black && (
                    <span
                      className={`move-list__move ${reviewIndex === pair.blackIdx ? 'move-list__move--active' : ''}`}
                      onClick={() => goToMove(pair.blackIdx)}
                    >
                      {pair.black.san}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review indicator */}
        {isReviewing && (
          <div className="panel-review-indicator" onClick={goToEnd}>
            Revisando jugada {(reviewIndex ?? 0) + 1} de {moves.length} - Clic para volver
          </div>
        )}

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

        {/* Actions during game */}
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

        {/* Post-game actions */}
        {isGameOver && (
          <div className="game-over-actions" id="game-over-actions">
            <button
              className="game-over-actions__btn game-over-actions__btn--new"
              onClick={() => window.location.href = '/'}
              id="btn-new-game"
            >
              Nueva partida
            </button>
            <button
              className="game-over-actions__btn game-over-actions__btn--analyze"
              onClick={() => {
                if (roomState) {
                  const analysisData = {
                    positions: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                      ...moves.map(m => m.fen)],
                    moves: moves.map(m => ({
                      san: m.san,
                      from: m.from,
                      to: m.to,
                      color: m.color,
                    })),
                    playerColor: myColor,
                    playerName: username,
                    opponentName,
                  };
                  sessionStorage.setItem('analysis_game', JSON.stringify(analysisData));
                  window.location.href = '/analysis';
                }
              }}
              id="btn-analyze"
            >
              Analizar partida
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
