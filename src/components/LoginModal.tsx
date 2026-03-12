// ============================================
// LoginModal.tsx — Modal de login/registro estilo Lichess
// ============================================

import React, { useState } from 'react';

interface LoginModalProps {
  onLogin: (username: string) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    if (isRegister && !email.trim()) {
      setError('Ingresa tu email');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { username, email, password }
        : { username, password };

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('chess_token', data.token);
        onLogin(data.username || username);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Error de autenticación');
      }
    } catch {
      // If backend is not available, login locally
      onLogin(username);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal login-modal" onClick={e => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>✕</button>
        
        <h2 className="login-modal__title">
          {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
        </h2>

        <form onSubmit={handleSubmit} className="login-modal__form">
          <div className="login-modal__field">
            <label>Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ingresa tu nombre"
              autoFocus
              id="input-username"
            />
          </div>

          {isRegister && (
            <div className="login-modal__field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                id="input-email"
              />
            </div>
          )}

          <div className="login-modal__field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              id="input-password"
            />
          </div>

          {error && <div className="login-modal__error">{error}</div>}

          <button
            type="submit"
            className="login-modal__submit"
            disabled={loading}
            id="btn-submit-auth"
          >
            {loading ? 'Cargando...' : (isRegister ? 'Registrarse' : 'Iniciar Sesión')}
          </button>
        </form>

        <div className="login-modal__toggle">
          {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button onClick={() => setIsRegister(!isRegister)} className="login-modal__toggle-btn">
            {isRegister ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </div>
      </div>
    </div>
  );
};
