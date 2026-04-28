// ============================================
// LobbyPage.tsx -- Pantalla principal de ChessMaster
// ============================================
// Emparejamiento rapido (vs IA) + Crear partida privada + Unirse con codigo

import React, { useState, useCallback } from 'react';
import { TIME_CONTROLS, type TimeControl, type AIDifficulty } from '../hooks/useChessEngine';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { FriendsPanel } from '../components/FriendsPanel';
import type { Color } from 'chessground/types';

const CATEGORY_LABELS: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
  unlimited: 'Sin limite',
};

export const LobbyPage: React.FC = () => {
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<AIDifficulty>(1);
  const [selectedColor, setSelectedColor] = useState<'white' | 'random' | 'black'>('random');
  const [selectedTimeForAI, setSelectedTimeForAI] = useState<TimeControl>(
    TIME_CONTROLS.find(t => t.name === 'unlimited') || TIME_CONTROLS[9] as TimeControl
  );
  const [joinCode, setJoinCode] = useState('');

  // Multiplayer
  const multiplayer = useMultiplayerGame();
  const [waitingCode, setWaitingCode] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  // Quick pairing: click a time control -> game with AI
  const handleQuickPlay = (tc: TimeControl) => {
    sessionStorage.setItem('gameConfig', JSON.stringify({
      timeControl: tc,
      isVsAI: true,
      aiLevel: selectedLevel,
      playerColor: 'white',
    }));
    window.location.href = '/game';
  };

  const handlePlayComputer = () => {
    const color: Color = selectedColor === 'random'
      ? (Math.random() > 0.5 ? 'white' : 'black')
      : selectedColor;

    sessionStorage.setItem('gameConfig', JSON.stringify({
      timeControl: selectedTimeForAI,
      isVsAI: true,
      aiLevel: selectedLevel,
      playerColor: color,
    }));
    window.location.href = '/game';
  };

  // Create private game room
  const handleCreateRoom = useCallback(async () => {
    const code = await multiplayer.createRoom();
    if (code) {
      setWaitingCode(code);
      setIsWaiting(true);
      // Start polling to detect when opponent joins
      multiplayer.startPolling(code);
    }
  }, [multiplayer]);

  // Join game with code
  const handleJoinWithCode = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    const room = await multiplayer.joinRoom(code);
    if (room) {
      // Save config and navigate to game
      sessionStorage.setItem('gameConfig', JSON.stringify({
        timeControl: { minutes: 10, increment: 0, name: '10+0', label: '10+0', category: 'rapid' },
        isVsAI: false,
        playerColor: room.myColor,
        roomCode: room.code,
      }));
      window.location.href = `/game?room=${room.code}`;
    }
  }, [joinCode, multiplayer]);

  // Check if opponent joined (polling effect)
  React.useEffect(() => {
    if (isWaiting && multiplayer.roomState && multiplayer.roomState.status === 'ACTIVE') {
      // Opponent joined! Navigate to game
      multiplayer.stopPolling();
      sessionStorage.setItem('gameConfig', JSON.stringify({
        timeControl: { minutes: 10, increment: 0, name: '10+0', label: '10+0', category: 'rapid' },
        isVsAI: false,
        playerColor: 'white', // Creator is always white
        roomCode: waitingCode,
      }));
      window.location.href = `/game?room=${waitingCode}`;
    }
  }, [isWaiting, multiplayer.roomState, waitingCode, multiplayer]);

  const timeControlsGrid = TIME_CONTROLS.filter(tc => tc.category !== 'unlimited');

  // === WAITING SCREEN ===
  if (isWaiting && waitingCode) {
    return (
      <div className="lobby-page" id="lobby-page">
        <div className="lobby-waiting" id="lobby-waiting">
          <div className="lobby-waiting__card">
            <div className="lobby-waiting__icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{opacity: 0.5}}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2 className="lobby-waiting__title">Esperando oponente...</h2>
            <p className="lobby-waiting__subtitle">Comparte este codigo con tu amigo</p>
            <div className="lobby-waiting__code">{waitingCode}</div>
            <p className="lobby-waiting__hint">O comparte este link:</p>
            <div className="lobby-waiting__link">
              {window.location.origin}/game?room={waitingCode}
            </div>
            <button
              className="lobby-waiting__cancel"
              onClick={() => {
                setIsWaiting(false);
                setWaitingCode(null);
                multiplayer.stopPolling();
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page" id="lobby-page">
      {/* Main content -- time control grid */}
      <div className="lobby-page__main" id="lobby-main">
        <div className="lobby-section-title">Emparejamiento rapido</div>

        <div className="lobby-grid" id="lobby-grid">
          {timeControlsGrid.map(tc => (
            <button
              key={tc.name}
              className="lobby-grid__item"
              onClick={() => handleQuickPlay(tc)}
              id={`tc-${tc.name.replace('+', '-')}`}
            >
              <div className="lobby-grid__time">{tc.label}</div>
              <div className="lobby-grid__category">
                {CATEGORY_LABELS[tc.category]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="lobby-page__actions" id="lobby-actions">
        <button
          className="lobby-action lobby-action--accent"
          onClick={() => setShowGameSetup(true)}
          id="btn-play-computer"
        >
          <span className="lobby-action__icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
            </svg>
          </span>
          <span className="lobby-action__text">Jugar contra el ordenador</span>
        </button>

        {/* CREATE PRIVATE GAME */}
        <button
          className="lobby-action"
          onClick={handleCreateRoom}
          disabled={multiplayer.isCreating}
          id="btn-create-room"
        >
          <span className="lobby-action__icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </span>
          <span className="lobby-action__text">
            {multiplayer.isCreating ? 'Creando...' : 'Crear partida privada'}
          </span>
        </button>

        {/* JOIN WITH CODE */}
        <div className="lobby-join-code" id="lobby-join-code">
          <div className="lobby-join-code__title">
            Unirse con codigo
          </div>
          <div className="lobby-join-code__row">
            <input
              className="lobby-join-code__input"
              type="text"
              placeholder="Pegar codigo..."
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
              maxLength={8}
              id="join-code-input"
            />
            <button
              className="lobby-join-code__btn"
              onClick={handleJoinWithCode}
              disabled={joinCode.trim().length < 4 || multiplayer.isJoining}
              id="btn-join-code"
            >
              {multiplayer.isJoining ? '...' : 'Unirse'}
            </button>
          </div>
          {multiplayer.error && (
            <div className="lobby-join-code__error">{multiplayer.error}</div>
          )}
        </div>

        {/* Friends panel */}
        <FriendsPanel
          username={localStorage.getItem('chess_username')}
          compact={true}
        />
      </aside>

      {/* Game setup modal (vs AI) */}
      {showGameSetup && (
        <div className="modal-overlay" onClick={() => setShowGameSetup(false)} id="game-setup-modal">
          <div className="modal game-setup" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowGameSetup(false)}>x</button>
            <h2 className="game-setup__title">Configuracion de la partida</h2>

            <div className="game-setup__variant">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{opacity: 0.6}}>
                <path d="M19 22H5v-2h14v2zm2-20H3v16h18V2zm-2 14H5V4h14v12z"/>
              </svg>
              <span className="game-setup__variant-name">Estandar</span>
              <span className="game-setup__variant-desc">Reglas de ajedrez FIDE</span>
            </div>

            <div className="game-setup__section">
              <label className="game-setup__label">Control de tiempo</label>
              <div className="game-setup__time-grid">
                {TIME_CONTROLS.map(tc => (
                  <button
                    key={tc.name}
                    className={`game-setup__time-btn ${selectedTimeForAI.name === tc.name ? 'game-setup__time-btn--active' : ''}`}
                    onClick={() => setSelectedTimeForAI(tc)}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="game-setup__section">
              <label className="game-setup__label">Nivel de dificultad</label>
              <div className="game-setup__levels">
                {([1, 2, 3, 4, 5, 6, 7, 8] as AIDifficulty[]).map(level => (
                  <button
                    key={level}
                    className={`game-setup__level ${selectedLevel === level ? 'game-setup__level--active' : ''}`}
                    onClick={() => setSelectedLevel(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="game-setup__section">
              <label className="game-setup__label">Color</label>
              <div className="game-setup__colors">
                <button
                  className={`game-setup__color ${selectedColor === 'black' ? 'game-setup__color--active' : ''}`}
                  onClick={() => setSelectedColor('black')}
                >
                  <span className="game-setup__color-piece game-setup__color-piece--black">&#9818;</span>
                  <span>Negras</span>
                </button>
                <button
                  className={`game-setup__color ${selectedColor === 'random' ? 'game-setup__color--active' : ''}`}
                  onClick={() => setSelectedColor('random')}
                >
                  <span className="game-setup__color-piece">&#9818;&#9812;</span>
                  <span>Aleatorio</span>
                </button>
                <button
                  className={`game-setup__color ${selectedColor === 'white' ? 'game-setup__color--active' : ''}`}
                  onClick={() => setSelectedColor('white')}
                >
                  <span className="game-setup__color-piece game-setup__color-piece--white">&#9812;</span>
                  <span>Blancas</span>
                </button>
              </div>
            </div>

            <button className="game-setup__play" onClick={handlePlayComputer} id="btn-start-game">
              Jugar contra el ordenador
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
