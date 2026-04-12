// ============================================
// api.ts — Servicio de API para ChessMaster
// ============================================
// Centraliza todas las llamadas al backend REST.
// Usa JWT token almacenado en localStorage para autenticacion.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('chess_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// === AUTH ===

export interface AuthResponse {
  token: string;
  username: string;
  rating: number;
}

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Error al registrar');
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Error de autenticacion');
  }
  return res.json();
}

// === GAMES ===

export interface GameHistoryItem {
  gameId: number;
  boardState: string;
  status: string;
  currentTurn: string;
  difficulty: string;
  winner: string | null;
  moves: {
    moveNumber: number;
    fromSquare: string;
    toSquare: string;
    pieceType: string;
    pieceColor: string;
    captured: string | null;
    notation: string;
  }[];
}

export async function createGame(difficulty: string): Promise<GameHistoryItem> {
  const res = await fetch(`${API_BASE}/api/game/new`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ difficulty }),
  });
  if (!res.ok) throw new Error('Error al crear partida');
  return res.json();
}

export async function getGameHistory(): Promise<GameHistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/game/history`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al obtener historial');
  return res.json();
}

export async function getGameState(gameId: number): Promise<GameHistoryItem> {
  const res = await fetch(`${API_BASE}/api/game/${gameId}/state`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Partida no encontrada');
  return res.json();
}

export async function saveMove(gameId: number, fromSquare: string, toSquare: string): Promise<GameHistoryItem> {
  const res = await fetch(`${API_BASE}/api/game/${gameId}/move`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fromSquare, toSquare }),
  });
  if (!res.ok) throw new Error('Error al guardar movimiento');
  return res.json();
}

/**
 * Checks if the backend API is available.
 * Used to show online/offline state.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'OPTIONS',
    });
    return res.ok || res.status === 405 || res.status === 403;
  } catch {
    return false;
  }
}
