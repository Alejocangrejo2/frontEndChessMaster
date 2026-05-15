// ============================================
// GamePage.tsx — Pagina de partida ChessMaster
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { MoveList } from '../components/MoveList';
import { PlayerBar } from '../components/PlayerBar';
import { useChessEngine } from '../hooks/useChessEngine';
import { FloatingPieces } from '../components/FloatingPieces';
import { PromotionDialog } from '../components/PromotionDialog';
import type { GameStatus } from '../engine/ChessEngine';

interface GamePageProps {
  username?: string | null;
}

export const GamePage: React.FC<GamePageProps> = ({ username }) => {
  const game = useChessEngine();
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const hasSavedRef = useRef(false);

  // Auto-save completed games to localStorage
  useEffect(() => {
    if (!game.isGameOver || hasSavedRef.current) return;
    hasSavedRef.current = true;

    const result: 'win' | 'loss' | 'draw' =
      game.result?.winner === game.playerColor ? 'win' :
      game.result?.winner ? 'loss' : 'draw';

    const record = {
      id: `game_${Date.now()}`,
      date: new Date().toLocaleDateString('es-ES'),
      opponent: game.isVsAI ? `Stockfish Nv.${game.aiLevel}` : 'Oponente',
      result,
      timeControl: game.timeControl.name,
      moves: game.moveHistory.length,
      color: game.playerColor,
    };

    try {
      const stored = localStorage.getItem('chess_history');
      const history = stored ? JSON.parse(stored) : [];
      history.unshift(record);
      if (history.length > 100) history.length = 100;
      localStorage.setItem('chess_history', JSON.stringify(history));
    } catch { /* ignore storage errors */ }
  }, [game.isGameOver, game.result, game.playerColor, game.isVsAI, game.aiLevel, game.timeControl, game.moveHistory, username]);

  const playerName = username || 'Anonimo';
  const opponentName = game.isVsAI ? `Stockfish nivel ${game.aiLevel}` : 'Oponente';

  const isFlipped = game.playerColor === 'black';
  // Top = opponent side, Bottom = player side (always)
  const topPlayer = isFlipped
    ? { name: opponentName, color: 'white' as const, time: game.whiteTime }
    : { name: opponentName, color: 'black' as const, time: game.blackTime };
  const bottomPlayer = isFlipped
    ? { name: playerName, color: 'black' as const, time: game.blackTime }
    : { name: playerName, color: 'white' as const, time: game.whiteTime };

  // Material advantage
  const mb = game.materialBalance;
  const topMaterialDiff = topPlayer.color === 'white'
    ? (mb > 0 ? mb : 0)
    : (mb < 0 ? -mb : 0);
  const bottomMaterialDiff = bottomPlayer.color === 'white'
    ? (mb > 0 ? mb : 0)
    : (mb < 0 ? -mb : 0);

  const topCaptured = topPlayer.color === 'white'
    ? game.blackCaptured
    : game.whiteCaptured;
  const bottomCaptured = bottomPlayer.color === 'white'
    ? game.blackCaptured
    : game.whiteCaptured;

  // Board display: use review FEN if reviewing, otherwise live FEN
  const displayFen = game.reviewFen || game.fen;
  const displayLastMove = game.isReviewing ? game.reviewLastMove : game.lastMove;
  const displayCheck = game.isReviewing ? undefined : game.checkSquare;
  const displayDests = game.isReviewing || game.isGameOver ? new Map() : game.legalDests;
  const displayViewOnly = game.isReviewing || game.isGameOver || game.isAIThinking;

  // Current move index for highlighting in the move list
  const currentMoveIndex = game.isReviewing
    ? (game.reviewIndex ?? -1)
    : game.moveHistory.length - 1;

  const getStatusMessage = (): string => {
    switch (game.status) {
      case 'check': return 'Jaque';
      case 'checkmate': {
        const winner = game.result?.winner === 'white' ? 'Blancas' : 'Negras';
        return `Jaque mate - ${winner} ganan`;
      }
      case 'stalemate': return 'Tablas - Ahogado';
      case 'draw': return `Tablas - ${getDrawReason()}`;
      case 'resigned': {
        const winner = game.result?.winner === 'white' ? 'Blancas' : 'Negras';
        return `${winner} ganan - Rendicion`;
      }
      case 'timeout': {
        const winner = game.result?.winner === 'white' ? 'Blancas' : 'Negras';
        return `${winner} ganan - Tiempo agotado`;
      }
      default:
        if (game.isAIThinking) return 'IA pensando...';
        return game.turn === 'white' ? 'Turno de blancas' : 'Turno de negras';
    }
  };

  const getDrawReason = (): string => {
    switch (game.result?.reason) {
      case 'insufficient': return 'Material insuficiente';
      case 'threefold': return 'Repeticion triple';
      case 'fifty-move': return 'Regla de 50 movimientos';
      case 'draw-agreement': return 'Por acuerdo';
      default: return '';
    }
  };

  const getStatusIcon = (status: GameStatus): string => {
    switch (status) {
      case 'checkmate': case 'resigned': case 'timeout': return '#';
      case 'stalemate': case 'draw': return '=';
      case 'check': return '!';
      default: return 'i';
    }
  };

  const handleResign = () => {
    if (showResignConfirm) {
      game.resign();
      setShowResignConfirm(false);
    } else {
      setShowResignConfirm(true);
    }
  };

  return (
    <div className="game-page" id="game-page">
      <FloatingPieces count={50} />
      {/* Left Panel */}
      <aside className="game-page__info" id="game-info-panel">
        <div className="game-info">
          <div className="game-info__header">
            <span className="game-info__type">
              {game.timeControl.category === 'unlimited' ? 'Sin limite' : game.timeControl.name}
              {' - '}
              {game.isVsAI ? 'vs Ordenador' : 'Clasificatoria'}
            </span>
          </div>
          <div className="game-info__players">
            <div className="game-info__player">
              <span className={`game-info__dot ${game.turn === 'white' ? 'game-info__dot--active' : ''}`} />
              {playerName}
            </div>
            <div className="game-info__player">
              <span className={`game-info__dot ${game.turn === 'black' ? 'game-info__dot--active' : ''}`} />
              {opponentName}
            </div>
          </div>
        </div>
      </aside>

      {/* Center — Board */}
      <div className="game-page__board" id="game-board-area">
        <PlayerBar
          name={topPlayer.name}
          isActive={game.turn === topPlayer.color}
          color={topPlayer.color}
          timeMs={topPlayer.time}
          formatTime={game.formatTime}
          capturedPieces={topCaptured}
          materialDiff={topMaterialDiff}
          isOnline={true}
        />

        <ChessBoard
          fen={displayFen}
          orientation={game.playerColor}
          turnColor={game.turn}
          lastMove={displayLastMove}
          check={displayCheck}
          dests={displayDests}
          viewOnly={displayViewOnly}
          onMove={game.onMove}
        />

        <PlayerBar
          name={bottomPlayer.name}
          isActive={game.turn === bottomPlayer.color}
          color={bottomPlayer.color}
          timeMs={bottomPlayer.time}
          formatTime={game.formatTime}
          capturedPieces={bottomCaptured}
          materialDiff={bottomMaterialDiff}
          isOnline={true}
        />
      </div>

      {/* Right Panel */}
      <aside className="game-page__panel" id="game-side-panel">
        <div className="panel-player panel-player--top">
          <span className="panel-player__dot panel-player__dot--online" />
          <span className="panel-player__name">{opponentName}</span>
        </div>

        {/* Move navigation — ALL BUTTONS FUNCTIONAL */}
        <div className="panel-nav" id="move-nav">
          <button className="panel-nav__btn" title="Girar tablero" onClick={game.flipBoard}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M7.5 21.5V18H3.6L7.15 14.45L5.75 13.05L2 16.8V12.5H0V21.5H7.5ZM16.25 10.95L19.8 7.4V11.5H21.8V2.5H12.8V4.5H16.7L13.15 8.05L14.55 9.45L16.25 7.75V10.95Z"/>
            </svg>
          </button>
          <button className="panel-nav__btn" title="Inicio" onClick={game.goToStart}>|&lt;</button>
          <button className="panel-nav__btn" title="Anterior" onClick={game.goBack}>&lt;</button>
          <button className="panel-nav__btn" title="Siguiente" onClick={game.goForward}>&gt;</button>
          <button className="panel-nav__btn" title="Final" onClick={game.goToEnd}>&gt;|</button>
        </div>

        <MoveList
          moves={game.moveHistory}
          currentMoveIndex={currentMoveIndex}
          onMoveClick={(index) => game.goToMove(index)}
        />

        {/* Review indicator */}
        {game.isReviewing && (
          <div className="panel-review-indicator" onClick={game.goToEnd}>
            Revisando jugada {(game.reviewIndex ?? -1) + 1} de {game.moveHistory.length} — Clic para volver
          </div>
        )}

        {/* Status */}
        <div className={`game-status game-status--${game.status}`} id="game-status">
          <span className="game-status__icon">{getStatusIcon(game.status)}</span>
          <div className="game-status__text">
            <span className="game-status__message">{getStatusMessage()}</span>
            {game.turn === game.playerColor && !game.isGameOver && (
              <span className="game-status__turn">Es tu turno</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!game.isGameOver && (
          <div className="game-actions" id="game-actions">
            <button
              className={`game-actions__btn game-actions__btn--resign ${showResignConfirm ? 'game-actions__btn--confirm' : ''}`}
              onClick={handleResign}
              title={showResignConfirm ? 'Confirmar' : 'Rendirse'}
              id="btn-resign"
            >
              {showResignConfirm ? 'Confirmar' : 'Rendirse'}
            </button>
            <button
              className="game-actions__btn game-actions__btn--draw"
              onClick={game.offerDraw}
              title="Tablas"
              id="btn-draw"
            >
              Tablas
            </button>
          </div>
        )}

        {/* Game over */}
        {game.isGameOver && (
          <div className="game-over-actions" id="game-over-actions">
            <button
              className="game-over-actions__btn game-over-actions__btn--analyze"
              onClick={() => {
                // Store game data for analysis
                const analysisData = {
                  positions: game.fenHistory,
                  moves: game.moveHistory.map(m => ({
                    san: m.san,
                    from: m.from,
                    to: m.to,
                    color: m.color,
                  })),
                  playerColor: game.playerColor,
                  playerName: playerName,
                  opponentName: opponentName,
                };
                sessionStorage.setItem('analysis_game', JSON.stringify(analysisData));
                window.location.href = '/analysis';
              }}
              id="btn-analyze"
            >
              Analizar partida
            </button>
            <button
              className="game-over-actions__btn game-over-actions__btn--rematch"
              onClick={() => game.newGame()}
              id="btn-rematch"
            >
              Revancha
            </button>
            <button
              className="game-over-actions__btn game-over-actions__btn--new"
              onClick={() => window.location.href = '/'}
              id="btn-new-game"
            >
              Nueva partida
            </button>
          </div>
        )}

        <div className="panel-player panel-player--bottom">
          <span className="panel-player__dot panel-player__dot--online" />
          <span className="panel-player__name">{playerName}</span>
        </div>

        {!game.isGameOver && (
          <div className="panel-turn" id="turn-indicator">
            {game.turn === game.playerColor ? 'Tu turno' : 'Turno del oponente'}
          </div>
        )}
      </aside>

      {/* Promotion dialog */}
      {game.pendingPromotion && (
        <PromotionDialog
          color={game.turn === 'white' ? 'black' : 'white'}
          onSelect={game.completePromotion}
        />
      )}
    </div>
  );
};
