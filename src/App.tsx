// ============================================
// App.tsx -- Root de ChessMaster
// ============================================

import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { LandingPage } from './pages/LandingPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { FriendsPage } from './pages/FriendsPage';
import { PuzzlesPage } from './pages/PuzzlesPage';
import { MultiplayerGamePage } from './pages/MultiplayerGamePage';
import { ChallengeNotification } from './components/ChallengeNotification';

export type BoardTheme = 'brown' | 'green' | 'blue' | 'gray';

/**
 * Detects multiplayer (via ?room= or sessionStorage) and routes accordingly.
 */
const GamePageWrapper: React.FC<{ username: string | null }> = ({ username }) => {
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const roomCode = searchParams.get('room');

  const config = (() => {
    try {
      const stored = sessionStorage.getItem('gameConfig');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  const effectiveRoomCode = roomCode || config?.roomCode;

  if (effectiveRoomCode && username) {
    const myColor = config?.playerColor || 'white';
    return (
      <MultiplayerGamePage
        key={effectiveRoomCode}
        roomCode={effectiveRoomCode}
        username={username}
        myColor={myColor}
      />
    );
  }

  return <GamePage key={location.key} username={username} />;
};

const App: React.FC = () => {
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem('chess_username')
  );

  // LIGHT theme by default
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('chess_theme') as 'dark' | 'light' | null;
    return stored || 'light';
  });

  // Board color scheme
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
    const stored = localStorage.getItem('chess_board_theme') as BoardTheme | null;
    return stored || 'brown';
  });

  const handleLogin = useCallback((name: string) => {
    localStorage.setItem('chess_username', name);
    sessionStorage.setItem('chess_session_active', 'true');
    // Sync theme from landing page toggle
    const savedTheme = localStorage.getItem('chess_theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
    setUsername(name);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('chess_username');
    localStorage.removeItem('chess_token');
    sessionStorage.removeItem('chess_session_active');
    setUsername(null);
  }, []);

  const handleSetTheme = useCallback((t: 'dark' | 'light') => {
    setTheme(t);
    localStorage.setItem('chess_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  const handleSetBoardTheme = useCallback((bt: BoardTheme) => {
    setBoardTheme(bt);
    localStorage.setItem('chess_board_theme', bt);
    document.documentElement.setAttribute('data-board', bt);
  }, []);

  // Apply theme on mount
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-board', boardTheme);
  }, [theme, boardTheme]);

  // Auto-logout: if tab was closed and reopened, sessionStorage is gone
  // so we detect a stale localStorage username and clear it
  React.useEffect(() => {
    const storedUser = localStorage.getItem('chess_username');
    const sessionActive = sessionStorage.getItem('chess_session_active');

    if (storedUser && !sessionActive) {
      // Tab was closed — session expired
      localStorage.removeItem('chess_username');
      localStorage.removeItem('chess_token');
      setUsername(null);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOT logged in -> show landing page
  if (!username) {
    return (
      <div className={`app theme--${theme}`} id="app-root">
        <LandingPage onLogin={(name, _token) => handleLogin(name)} />
      </div>
    );
  }

  // Logged in -> full app
  return (
    <BrowserRouter>
      <div className={`app theme--${theme}`} id="app-root">
        <Header
          username={username}
          onLogin={() => {}}
          onLogout={handleLogout}
          onSetTheme={handleSetTheme}
          onSetBoardTheme={handleSetBoardTheme}
          currentTheme={theme}
          currentBoardTheme={boardTheme}
        />

        <main className="app-main" id="main-content">
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/game" element={<GamePageWrapper username={username} />} />
            <Route path="/game/:id" element={<GamePageWrapper username={username} />} />
            <Route path="/history" element={<HistoryPage username={username} />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/friends" element={<FriendsPage username={username} />} />
            <Route path="/puzzles" element={<PuzzlesPage />} />
            <Route path="*" element={
              <div className="placeholder-page">
                <h2>Pagina no encontrada</h2>
                <p>404</p>
              </div>
            } />
          </Routes>
        </main>

        {/* Global challenge notifications — visible on all pages */}
        <ChallengeNotification username={username} />
      </div>
    </BrowserRouter>
  );
};

export default App;
