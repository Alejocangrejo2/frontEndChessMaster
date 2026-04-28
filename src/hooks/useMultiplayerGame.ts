// ============================================
// useMultiplayerGame.ts — Hook para partidas multijugador
// ============================================
// Maneja: crear sala, unirse, polling de estado, enviar movimientos.

import { useState, useCallback, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface RoomState {
  code: string;
  whitePlayer: string;
  blackPlayer: string | null;
  status: string; // WAITING, ACTIVE, CHECKMATE, STALEMATE, DRAW, RESIGNED
  fen: string;
  currentTurn: string;
  lastMove: string | null;
  winner: string | null;
  moveCount: number;
  myColor: 'white' | 'black';
}

function getToken(): string | null {
  return localStorage.getItem('chess_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export function useMultiplayerGame() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create a new room
  const createRoom = useCallback(async (): Promise<string | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/room/create`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.code;
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Error al crear sala');
        return null;
      }
    } catch {
      setError('No se pudo conectar al servidor');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Join an existing room
  const joinRoom = useCallback(async (code: string): Promise<RoomState | null> => {
    setIsJoining(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/room/join/${code.toUpperCase()}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);
        return data;
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'No se pudo unir a la sala');
        return null;
      }
    } catch {
      setError('No se pudo conectar al servidor');
      return null;
    } finally {
      setIsJoining(false);
    }
  }, []);

  // Poll room state
  const pollState = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/api/room/${code}/state`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);
      }
    } catch { /* silent */ }
  }, []);

  // Start polling
  const startPolling = useCallback((code: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    // Poll immediately
    pollState(code);
    // Then every 2 seconds
    pollingRef.current = setInterval(() => pollState(code), 2000);
  }, [pollState]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Send a move
  const sendMove = useCallback(async (code: string, from: string, to: string, newFen: string) => {
    try {
      const res = await fetch(`${API_URL}/api/room/${code}/move`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ from, to, fen: newFen }),
      });
      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);
      }
    } catch { /* silent */ }
  }, []);

  // Resign
  const resign = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/api/room/${code}/resign`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as RoomState;
        setRoomState(data);
      }
    } catch { /* silent */ }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    roomState,
    isCreating,
    isJoining,
    error,
    createRoom,
    joinRoom,
    startPolling,
    stopPolling,
    sendMove,
    resign,
  };
}
