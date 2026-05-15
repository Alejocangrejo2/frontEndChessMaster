// ============================================
// LandingPage.tsx -- Pantalla premium de ChessMaster
// ============================================
// Piezas flotantes con profundidad, parallax con mouse,
// gradientes elegantes, animacion del logo.

import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Chess piece unicode characters
const PIECES = {
  // White pieces
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  // Black pieces
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
};

// 35 floating pieces — varied types, sizes, positions, speeds, colors, depths
const FLOATING_PIECES = [
  // === NEAR (large, no blur, bold presence) ===
  { piece: PIECES.wK, x: 6,  y: 10, size: 76, speed: 14, color: 'rgba(255,255,255,0.08)', blur: 0, delay: 0 },
  { piece: PIECES.bQ, x: 88, y: 15, size: 70, speed: 16, color: 'rgba(100,100,100,0.10)', blur: 0, delay: -2 },
  { piece: PIECES.wN, x: 42, y: 78, size: 66, speed: 18, color: 'rgba(255,255,255,0.07)', blur: 0, delay: -5 },
  { piece: PIECES.bR, x: 74, y: 62, size: 62, speed: 15, color: 'rgba(80,80,80,0.09)',    blur: 0, delay: -8 },
  { piece: PIECES.wQ, x: 28, y: 30, size: 68, speed: 13, color: 'rgba(90,158,111,0.06)',   blur: 0, delay: -11},
  // === MID-NEAR (medium-large) ===
  { piece: PIECES.wR, x: 18, y: 52, size: 52, speed: 20, color: 'rgba(139,90,43,0.08)',   blur: 1, delay: -3 },
  { piece: PIECES.bN, x: 62, y: 22, size: 50, speed: 22, color: 'rgba(60,60,60,0.10)',    blur: 1, delay: -7 },
  { piece: PIECES.wB, x: 33, y: 42, size: 54, speed: 19, color: 'rgba(200,200,200,0.06)', blur: 1, delay: -1 },
  { piece: PIECES.bP, x: 93, y: 48, size: 42, speed: 24, color: 'rgba(100,100,100,0.08)', blur: 1, delay: -4 },
  { piece: PIECES.wQ, x: 12, y: 88, size: 58, speed: 17, color: 'rgba(255,255,255,0.07)', blur: 1, delay: -9 },
  { piece: PIECES.bK, x: 52, y: 8,  size: 56, speed: 21, color: 'rgba(50,50,50,0.10)',    blur: 1, delay: -6 },
  { piece: PIECES.wP, x: 78, y: 88, size: 44, speed: 23, color: 'rgba(90,158,111,0.05)',   blur: 1, delay: -10},
  { piece: PIECES.bB, x: 48, y: 58, size: 46, speed: 18, color: 'rgba(139,90,43,0.07)',   blur: 1, delay: -12},
  // === MID-FAR (medium-small) ===
  { piece: PIECES.wP, x: 3,  y: 38, size: 34, speed: 28, color: 'rgba(139,90,43,0.06)',   blur: 2, delay: -2 },
  { piece: PIECES.bB, x: 28, y: 92, size: 38, speed: 26, color: 'rgba(80,80,80,0.07)',    blur: 2, delay: -5 },
  { piece: PIECES.wP, x: 72, y: 32, size: 32, speed: 30, color: 'rgba(200,200,200,0.05)', blur: 2, delay: -8 },
  { piece: PIECES.bP, x: 50, y: 50, size: 36, speed: 25, color: 'rgba(100,100,100,0.06)', blur: 2, delay: -1 },
  { piece: PIECES.wN, x: 95, y: 75, size: 40, speed: 27, color: 'rgba(139,90,43,0.07)',   blur: 2, delay: -4 },
  { piece: PIECES.bP, x: 15, y: 68, size: 30, speed: 29, color: 'rgba(90,158,111,0.04)',   blur: 2, delay: -13},
  { piece: PIECES.wR, x: 58, y: 95, size: 36, speed: 26, color: 'rgba(200,200,200,0.06)', blur: 2, delay: -7 },
  { piece: PIECES.bK, x: 82, y: 5,  size: 34, speed: 28, color: 'rgba(60,60,60,0.06)',    blur: 2, delay: -3 },
  // === FAR (small, blurred, slow — depth) ===
  { piece: PIECES.bR, x: 10, y: 72, size: 26, speed: 32, color: 'rgba(60,60,60,0.05)',    blur: 3, delay: -7 },
  { piece: PIECES.wB, x: 66, y: 94, size: 28, speed: 29, color: 'rgba(200,200,200,0.04)', blur: 3, delay: -3 },
  { piece: PIECES.bQ, x: 38, y: 3,  size: 24, speed: 34, color: 'rgba(80,80,80,0.04)',    blur: 3, delay: -6 },
  { piece: PIECES.wR, x: 84, y: 42, size: 22, speed: 36, color: 'rgba(139,90,43,0.04)',   blur: 3, delay: -9 },
  { piece: PIECES.bN, x: 22, y: 18, size: 26, speed: 31, color: 'rgba(60,60,60,0.04)',    blur: 3, delay: -1 },
  { piece: PIECES.wP, x: 55, y: 35, size: 20, speed: 38, color: 'rgba(90,158,111,0.03)', blur: 3, delay: -5 },
  { piece: PIECES.bP, x: 90, y: 25, size: 22, speed: 33, color: 'rgba(100,100,100,0.04)', blur: 3, delay: -8 },
  { piece: PIECES.wK, x: 3,  y: 95, size: 24, speed: 35, color: 'rgba(255,255,255,0.03)', blur: 4, delay: -2 },
  { piece: PIECES.bB, x: 70, y: 8,  size: 20, speed: 40, color: 'rgba(80,80,80,0.03)',    blur: 4, delay: -4 },
  { piece: PIECES.wN, x: 45, y: 65, size: 18, speed: 42, color: 'rgba(139,90,43,0.03)',   blur: 4, delay: -10},
  // === EXTRA (fill gaps — reach 40) ===
  { piece: PIECES.bQ, x: 98, y: 92, size: 32, speed: 25, color: 'rgba(80,80,80,0.05)',    blur: 2, delay: -6 },
  { piece: PIECES.wP, x: 35, y: 15, size: 28, speed: 30, color: 'rgba(200,200,200,0.04)', blur: 3, delay: -11},
  { piece: PIECES.bR, x: 65, y: 50, size: 22, speed: 37, color: 'rgba(60,60,60,0.03)',    blur: 4, delay: -7 },
  { piece: PIECES.wB, x: 8,  y: 50, size: 36, speed: 23, color: 'rgba(139,90,43,0.06)',   blur: 2, delay: -14},
  { piece: PIECES.bK, x: 50, y: 92, size: 30, speed: 28, color: 'rgba(100,100,100,0.05)', blur: 2, delay: -3 },
];

interface LandingPageProps {
  onLogin: (username: string, token: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(() => {
    return (localStorage.getItem('chess_theme') || 'light') === 'dark';
  });

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('chess_theme', next);
    const root = document.getElementById('app-root');
    if (root) {
      root.className = root.className.replace(/theme--\w+/, `theme--${next}`);
    }
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // Parallax effect on mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!bgRef.current) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    bgRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }
    if (mode === 'register' && !email.trim()) {
      setError('El correo electronico es obligatorio');
      return;
    }
    if (mode === 'register' && !isValidEmail(email.trim())) {
      setError('Ingresa un correo electronico valido');
      return;
    }

    setIsLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          ...(mode === 'register' ? { email: email.trim() } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.token || data.jwt;
        if (token) {
          localStorage.setItem('chess_token', token);
          localStorage.setItem('chess_username', username.trim());
          onLogin(username.trim(), token);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || (mode === 'login' ? 'Credenciales incorrectas' : 'Error al registrarse'));
      }
    } catch {
      setError('Error de conexion con el servidor');
    }
    setIsLoading(false);
  };

  // Shared background with pieces
  const renderBackground = () => (
    <div className="landing__bg" ref={bgRef}>
      <div className="landing__gradient"></div>
      <div className="landing__grid"></div>
      <div className="landing__pieces">
        {FLOATING_PIECES.map((p, i) => (
          <span
            key={i}
            className="landing__piece"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.size}px`,
              color: p.color,
              animationDuration: `${p.speed}s`,
              animationDelay: `${p.delay}s`,
              filter: p.blur > 0 ? `blur(${p.blur}px)` : 'none',
              textShadow: p.blur === 0 ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            {p.piece}
          </span>
        ))}
      </div>
      {/* Radial glow spots */}
      <div className="landing__glow landing__glow--1"></div>
      <div className="landing__glow landing__glow--2"></div>
    </div>
  );

  if (mode === 'landing') {
    return (
      <div className="landing" id="landing-page">
        {renderBackground()}
        <button className="landing__theme-toggle" onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
          {isDark ? '\u2659\uFE0F' : '\u265F\uFE0F'}
        </button>
        <div className="landing__content">
          <div className="landing__hero">
            <div className="landing__icon landing__icon--animated">
              <svg viewBox="0 0 64 64" width="80" height="80" fill="none">
                <rect x="8" y="48" width="48" height="6" rx="3" fill="currentColor" opacity="0.3"/>
                <rect x="16" y="42" width="32" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                <path d="M24 42V28c0-2 2-4 4-4h8c2 0 4 2 4 4v14" fill="currentColor" opacity="0.7"/>
                <circle cx="32" cy="18" r="8" fill="currentColor"/>
                <circle cx="32" cy="18" r="4" fill="var(--c-bg)"/>
              </svg>
            </div>
            <h1 className="landing__title">
              <span className="landing__title-chess">Chess</span><span className="landing__title-master">Master</span>
            </h1>
            <p className="landing__subtitle">
              Domina el tablero. Desafia tu mente.<br/>
              Conviertete en una leyenda.
            </p>
            <div className="landing__features">
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
                <div>
                  <strong>Partidas en vivo</strong>
                  <small>Juega contra jugadores reales en tiempo real</small>
                </div>
              </div>
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                </span>
                <div>
                  <strong>Puzzles inteligentes</strong>
                  <small>Mejora tu tactica con puzzles adaptados a tu nivel</small>
                </div>
              </div>
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </span>
                <div>
                  <strong>Analisis con Stockfish</strong>
                  <small>Analiza tus partidas con el motor de ultima generacion</small>
                </div>
              </div>
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </span>
                <div>
                  <strong>Sistema de amigos</strong>
                  <small>Conecta, desafia y compite con tus amigos</small>
                </div>
              </div>
            </div>
          </div>

          <div className="landing__actions">
            <button
              className="landing__btn landing__btn--primary"
              onClick={() => setMode('login')}
              id="btn-login"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
              Iniciar sesion
            </button>
            <button
              className="landing__btn landing__btn--secondary"
              onClick={() => setMode('register')}
              id="btn-register"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Crear cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login / Register form
  return (
    <div className="landing" id="landing-page">
      {renderBackground()}
      <button className="landing__theme-toggle" onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
        {isDark ? '\u2659\uFE0F' : '\u265F\uFE0F'}
      </button>
      <div className="landing__content">
        <div className="landing__form-card">
          <h2 className="landing__form-title">
            {mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
          </h2>
          <form onSubmit={handleSubmit} className="landing__form">
            <div className="landing__field">
              <label className="landing__label">Usuario</label>
              <input
                className="landing__input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario"
                autoFocus
                id="input-username"
              />
            </div>
            {mode === 'register' && (
              <div className="landing__field">
                <label className="landing__label">Correo electronico</label>
                <input
                  className="landing__input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  id="input-email"
                />
              </div>
            )}
            <div className="landing__field">
              <label className="landing__label">Contrasena</label>
              <input
                className="landing__input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tu contrasena"
                id="input-password"
              />
            </div>
            {error && <div className="landing__error">{error}</div>}
            <button
              className="landing__btn landing__btn--primary landing__btn--full"
              type="submit"
              disabled={isLoading}
              id="btn-submit"
            >
              {isLoading ? 'Cargando...' : (mode === 'login' ? 'Entrar' : 'Registrarse')}
            </button>
          </form>
          <button
            className="landing__switch"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'No tienes cuenta? Registrate' : 'Ya tienes cuenta? Inicia sesion'}
          </button>
          <button
            className="landing__back"
            onClick={() => { setMode('landing'); setError(''); }}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};
