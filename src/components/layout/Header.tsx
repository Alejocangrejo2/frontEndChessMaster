// ============================================
// Header.tsx — Navbar de ChessMaster
// ============================================
// Incluye: navegacion, tema, colores de tablero

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { BoardTheme } from '../../App';

interface HeaderProps {
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onSetTheme?: (theme: 'dark' | 'light') => void;
  onSetBoardTheme?: (theme: BoardTheme) => void;
  currentTheme?: 'dark' | 'light';
  currentBoardTheme?: BoardTheme;
}

const BOARD_THEMES: { id: BoardTheme; label: string; light: string; dark: string }[] = [
  { id: 'brown', label: 'Clasico', light: '#f0d9b5', dark: '#b58863' },
  { id: 'green', label: 'Verde', light: '#ffffdd', dark: '#86a666' },
  { id: 'blue', label: 'Azul', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'gray', label: 'Gris', light: '#e8e8e8', dark: '#555555' },
];

export const Header: React.FC<HeaderProps> = ({
  username,
  onLogin,
  onLogout,
  onSetTheme,
  onSetBoardTheme,
  currentTheme = 'light',
  currentBoardTheme = 'brown',
}) => {
  const location = useLocation();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const navItems = [
    { path: '/', label: 'JUGAR' },
    { path: '/friends', label: 'AMIGOS' },
    { path: '/puzzles', label: 'EJERCICIOS' },
    { path: '/history', label: 'HISTORIAL' },
  ];

  return (
    <header className="site-header" id="site-header">
      <div className="site-header__inner">
        {/* Logo */}
        <Link to="/" className="site-header__logo" id="logo-link">
          <svg className="site-header__logo-icon" viewBox="0 0 50 50" width="28" height="28">
            <path fill="currentColor" d="M25 1C11.7 1 1 11.7 1 25s10.7 24 24 24 24-10.7 24-24S38.3 1 25 1zm0 44C13.9 45 5 36.1 5 25S13.9 5 25 5s20 8.9 20 20-8.9 20-20 20z"/>
            <path fill="currentColor" d="M25 10c-1.7 0-3 1.3-3 3v2c0 .6.4 1 1 1h1v4l-7 8h3l3-3.5V28h-4v2h4v3h-4v2h4v5h4v-5h4v-2h-4v-3h4v-2h-4v-3.5L30 28h3l-7-8v-4h1c.6 0 1-.4 1-1v-2c0-1.7-1.3-3-3-3z"/>
          </svg>
          <span className="site-header__logo-text">ChessMaster</span>
        </Link>

        {/* Navigation */}
        <nav className="site-header__nav" id="main-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`site-header__nav-item ${location.pathname === item.path ? 'site-header__nav-item--active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="site-header__actions">
          {username ? (
            <div className="site-header__user">
              <span className="site-header__user-link">{username}</span>
              <button className="site-header__btn site-header__btn--text" onClick={onLogout} id="btn-logout">
                Salir
              </button>
            </div>
          ) : (
            <>
              <button className="site-header__btn site-header__btn--text" onClick={onLogin} id="btn-login">
                INICIAR SESION
              </button>
              <button className="site-header__btn site-header__btn--accent" onClick={onLogin} id="btn-register">
                REGISTRARSE
              </button>
            </>
          )}

          {/* Settings toggle */}
          <div className="site-header__theme-wrapper">
            <button
              className="site-header__btn site-header__btn--icon"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              id="btn-settings"
              title="Ajustes"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
            {showSettingsMenu && (
              <div className="settings-menu" id="settings-menu" onClick={e => e.stopPropagation()}>
                {/* Theme section */}
                <div className="settings-menu__section">
                  <div className="settings-menu__label">Tema</div>
                  <div className="settings-menu__row">
                    <button
                      className={`settings-menu__btn ${currentTheme === 'light' ? 'settings-menu__btn--active' : ''}`}
                      onClick={() => onSetTheme?.('light')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                      Claro
                    </button>
                    <button
                      className={`settings-menu__btn ${currentTheme === 'dark' ? 'settings-menu__btn--active' : ''}`}
                      onClick={() => onSetTheme?.('dark')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
                      Oscuro
                    </button>
                  </div>
                </div>

                {/* Board colors section */}
                <div className="settings-menu__section">
                  <div className="settings-menu__label">Tablero</div>
                  <div className="settings-menu__board-grid">
                    {BOARD_THEMES.map(bt => (
                      <button
                        key={bt.id}
                        className={`settings-menu__board-btn ${currentBoardTheme === bt.id ? 'settings-menu__board-btn--active' : ''}`}
                        onClick={() => onSetBoardTheme?.(bt.id)}
                        title={bt.label}
                      >
                        <div className="settings-menu__board-preview">
                          <div style={{ background: bt.light }} className="settings-menu__board-sq" />
                          <div style={{ background: bt.dark }} className="settings-menu__board-sq" />
                          <div style={{ background: bt.dark }} className="settings-menu__board-sq" />
                          <div style={{ background: bt.light }} className="settings-menu__board-sq" />
                        </div>
                        <span className="settings-menu__board-label">{bt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
