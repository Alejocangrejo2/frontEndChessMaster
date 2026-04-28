// ============================================
// LobbyPage.tsx — Pantalla principal de ChessMaster (simplificada)
// ============================================
// Solo: Emparejamiento rapido + Jugar contra ordenador.
// Sin: streams, torneos, stats, correspondencia, sala de espera.

import React, { useState } from 'react';
import { TIME_CONTROLS, type TimeControl, type AIDifficulty } from '../hooks/useChessEngine';
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

  // Quick pairing: click a time control -> game with that exact time
  const handleQuickPlay = (tc: TimeControl) => {
    sessionStorage.setItem('gameConfig', JSON.stringify({
      timeControl: tc,
      isVsAI: true,
      aiLevel: selectedLevel,
      playerColor: 'white',
    }));
    // Full page navigation to force hook re-initialization
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

  // Join game with code
  const handleJoinWithCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    
    sessionStorage.setItem('gameConfig', JSON.stringify({
      timeControl: { minutes: 10, increment: 0, name: '10+0', label: '10+0', category: 'rapid' },
      isVsAI: false,
      privateCode: code,
      playerColor: 'black', // Joiner plays black
    }));
    window.location.href = `/game/${code}`;
  };

  // Time controls for the grid (exclude unlimited)
  const timeControlsGrid = TIME_CONTROLS.filter(tc => tc.category !== 'unlimited');

  return (
    <div className="lobby-page" id="lobby-page">
      {/* Main content — time control grid */}
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

      {/* Right sidebar — play vs computer + join code + friends */}
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

        {/* JOIN WITH CODE */}
        <div className="lobby-join-code" id="lobby-join-code">
          <div className="lobby-join-code__title">
            🔗 Unirse con código
          </div>
          <div className="lobby-join-code__row">
            <input
              className="lobby-join-code__input"
              type="text"
              placeholder="Pegar código..."
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
              maxLength={8}
              id="join-code-input"
            />
            <button
              className="lobby-join-code__btn"
              onClick={handleJoinWithCode}
              disabled={joinCode.trim().length < 4}
              id="btn-join-code"
            >
              Unirse
            </button>
          </div>
        </div>

        {/* Friends panel */}
        <FriendsPanel
          username={localStorage.getItem('chess_username')}
          compact={true}
        />
      </aside>

      {/* Game setup modal */}
      {showGameSetup && (
        <div className="modal-overlay" onClick={() => setShowGameSetup(false)} id="game-setup-modal">
          <div className="modal game-setup" onClick={e => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowGameSetup(false)}>x</button>
            <h2 className="game-setup__title">Configuracion de la partida</h2>

            {/* Variant info */}
            <div className="game-setup__variant">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{opacity: 0.6}}>
                <path d="M19 22H5v-2h14v2zm2-20H3v16h18V2zm-2 14H5V4h14v12z"/>
              </svg>
              <span className="game-setup__variant-name">Estandar</span>
              <span className="game-setup__variant-desc">Reglas de ajedrez FIDE</span>
            </div>

            {/* Time control for AI game */}
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

            {/* AI Level */}
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

            {/* Color selector */}
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

            {/* Play button */}
            <button className="game-setup__play" onClick={handlePlayComputer} id="btn-start-game">
              Jugar contra el ordenador
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
