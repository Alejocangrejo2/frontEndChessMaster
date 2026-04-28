// ============================================
// LandingPage.tsx -- Pantalla de entrada de ChessMaster
// ============================================
// Se muestra cuando el usuario NO esta loggeado.
// Ofrece: iniciar sesion / registrarse.

import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

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

  if (mode === 'landing') {
    return (
      <div className="landing" id="landing-page">
        <div className="landing__bg">
          <div className="landing__grid"></div>
          {/* Floating chess piece silhouettes */}
          <div className="landing__pieces">
            <span className="landing__piece landing__piece--1">&#9814;</span>
            <span className="landing__piece landing__piece--2">&#9816;</span>
            <span className="landing__piece landing__piece--3">&#9815;</span>
            <span className="landing__piece landing__piece--4">&#9813;</span>
            <span className="landing__piece landing__piece--5">&#9817;</span>
            <span className="landing__piece landing__piece--6">&#9814;</span>
            <span className="landing__piece landing__piece--7">&#9816;</span>
            <span className="landing__piece landing__piece--8">&#9812;</span>
          </div>
        </div>
        <div className="landing__content">
          <div className="landing__hero">
            <div className="landing__icon">
              <svg viewBox="0 0 64 64" width="72" height="72" fill="none">
                <rect x="8" y="48" width="48" height="6" rx="3" fill="currentColor" opacity="0.3"/>
                <rect x="16" y="42" width="32" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                <path d="M24 42V28c0-2 2-4 4-4h8c2 0 4 2 4 4v14" fill="currentColor" opacity="0.7"/>
                <circle cx="32" cy="18" r="8" fill="currentColor"/>
                <circle cx="32" cy="18" r="4" fill="var(--c-bg)"/>
              </svg>
            </div>
            <h1 className="landing__title">ChessMaster</h1>
            <p className="landing__subtitle">Tu plataforma de ajedrez online</p>
            <div className="landing__features">
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg>
                </span>
                <span>Partidas en vivo</span>
              </div>
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 2L3 7v11h14V7l-7-5zm0 2.5L15 8v8H5V8l5-3.5z"/></svg>
                </span>
                <span>Puzzles de Lichess</span>
              </div>
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 2a4 4 0 00-4 4c0 1.5.8 2.8 2 3.5V18h4V9.5c1.2-.7 2-2 2-3.5a4 4 0 00-4-4z"/></svg>
                </span>
                <span>Analisis con IA</span>
              </div>
              <div className="landing__feature">
                <span className="landing__feature-icon">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6c0 2.2 1.2 4.2 3 5.2V16a1 1 0 001 1h4a1 1 0 001-1v-2.8c1.8-1 3-3 3-5.2a6 6 0 00-6-6z"/></svg>
                </span>
                <span>Sistema de amigos</span>
              </div>
            </div>
          </div>

          <div className="landing__actions">
            <button
              className="landing__btn landing__btn--primary"
              onClick={() => setMode('login')}
              id="btn-login"
            >
              Iniciar sesion
            </button>
            <button
              className="landing__btn landing__btn--secondary"
              onClick={() => setMode('register')}
              id="btn-register"
            >
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
      <div className="landing__bg">
        <div className="landing__grid"></div>
      </div>
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
