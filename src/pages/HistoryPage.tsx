// ============================================
// HistoryPage.tsx — Historial de partidas
// ============================================
// Carga historial desde backend API si disponible,
// fallback a localStorage si no hay backend.

import React, { useState, useEffect } from 'react';
import { getGameHistory, type GameHistoryItem } from '../services/api';
import { FloatingPieces } from '../components/FloatingPieces';

interface GameRecord {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  timeControl: string;
  moves: number;
  color: 'white' | 'black';
}

interface HistoryPageProps {
  username?: string | null;
}

/** Convert backend API games to local display format */
function apiToLocal(games: GameHistoryItem[]): GameRecord[] {
  return games.map(g => ({
    id: String(g.gameId),
    date: new Date().toLocaleDateString(),
    opponent: `Stockfish (${g.difficulty})`,
    result: g.winner === 'WHITE' ? 'win' :
            g.winner === 'BLACK' ? 'loss' :
            g.winner === 'DRAW' ? 'draw' : 'draw' as const,
    timeControl: g.difficulty || 'N/A',
    moves: g.moves?.length || 0,
    color: 'white' as const,
  }));
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ username }) => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'local' | 'none'>('none');

  useEffect(() => {
    const loadHistory = async () => {
      // 1. Try backend API first
      if (localStorage.getItem('chess_token')) {
        try {
          const apiGames = await getGameHistory();
          setGames(apiToLocal(apiGames));
          setSource('api');
          setLoading(false);
          return;
        } catch {
          // Backend unavailable, fall through to localStorage
        }
      }

      // 2. Fallback to localStorage
      try {
        const stored = localStorage.getItem('chess_history');
        if (stored) {
          setGames(JSON.parse(stored));
          setSource('local');
        }
      } catch { /* ignore */ }
      setLoading(false);
    };

    loadHistory();
  }, []);

  const stats = {
    total: games.length,
    wins: games.filter(g => g.result === 'win').length,
    losses: games.filter(g => g.result === 'loss').length,
    draws: games.filter(g => g.result === 'draw').length,
  };

  if (!username) {
    return (
      <div className="history-page" id="history-page">
        <FloatingPieces count={50} />
        <div className="history-empty">
          <h2>Historial de Partidas</h2>
          <p>Inicia sesion para ver tu historial de partidas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page" id="history-page">
      <FloatingPieces count={50} />
      <div className="history-header">
        <h1 className="history-title">Historial de Partidas</h1>
        {source === 'local' && (
          <span className="history-source-badge">Datos locales</span>
        )}
        {source === 'api' && (
          <span className="history-source-badge history-source-badge--online">Sincronizado</span>
        )}
        <div className="history-stats">
          <div className="history-stat">
            <span className="history-stat__value">{stats.total}</span>
            <span className="history-stat__label">Partidas</span>
          </div>
          <div className="history-stat history-stat--win">
            <span className="history-stat__value">{stats.wins}</span>
            <span className="history-stat__label">Victorias</span>
          </div>
          <div className="history-stat history-stat--loss">
            <span className="history-stat__value">{stats.losses}</span>
            <span className="history-stat__label">Derrotas</span>
          </div>
          <div className="history-stat history-stat--draw">
            <span className="history-stat__value">{stats.draws}</span>
            <span className="history-stat__label">Tablas</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="history-loading">Cargando...</div>
      ) : games.length === 0 ? (
        <div className="history-empty">
          <p>No tienes partidas jugadas aun.</p>
          <a href="/" className="btn btn--accent">Jugar ahora</a>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table" id="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Oponente</th>
                <th>Resultado</th>
                <th>Tiempo</th>
                <th>Movimientos</th>
                <th>Color</th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
                <tr key={game.id} className={`history-row history-row--${game.result}`}>
                  <td>{game.date}</td>
                  <td>{game.opponent}</td>
                  <td>
                    <span className={`history-result history-result--${game.result}`}>
                      {game.result === 'win' ? 'Victoria' : game.result === 'loss' ? 'Derrota' : 'Tablas'}
                    </span>
                  </td>
                  <td>{game.timeControl}</td>
                  <td>{game.moves}</td>
                  <td>{game.color === 'white' ? 'Blancas' : 'Negras'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
