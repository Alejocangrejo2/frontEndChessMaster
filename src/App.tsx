// ============================================
// App.tsx — Root de ChessMaster
// ============================================

import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { FriendsPage } from './pages/FriendsPage';
import { PuzzlesPage } from './pages/PuzzlesPage';
import { LoginModal } from './components/LoginModal';

export type BoardTheme = 'brown' | 'green' | 'blue' | 'gray';

/**
 * Wrapper that forces GamePage to fully remount when navigating
 * from the lobby. Without this, React reuses the component and
 * the useChessEngine hook never reads the new sessionStorage config.
 */
const GamePageWrapper: React.FC<{ username: string | null }> = ({ username }) => {
  const location = useLocation();
  return <GamePage key={location.key} username={username} />;
};

const App: React.FC = () => {
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem('chess_username')
  );
  const [showLogin, setShowLogin] = useState(false);

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
    setUsername(name);
    setShowLogin(false);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('chess_username');
    localStorage.removeItem('chess_token');
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

  // Apply theme + board theme on mount
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-board', boardTheme);
  }, [theme, boardTheme]);

  return (
    <BrowserRouter>
      <div className={`app theme--${theme}`} id="app-root">
        <Header
          username={username}
          onLogin={() => setShowLogin(true)}
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

        {showLogin && (
          <LoginModal
            onLogin={handleLogin}
            onClose={() => setShowLogin(false)}
          />
        )}
      </div>
    </BrowserRouter>
  );
};

export default App;
