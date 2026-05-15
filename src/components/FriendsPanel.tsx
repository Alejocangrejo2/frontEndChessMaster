// ============================================
// FriendsPanel.tsx — Panel lateral de amigos
// ============================================
// Muestra lista de amigos con estado online/offline,
// búsqueda de usuarios, solicitudes pendientes.
// Se integra en el Lobby y como página independiente.

import React, { useState, useCallback, useEffect } from 'react';

// === Types ===
export interface Friend {
  id: string;
  username: string;
  rating: number;
  online: boolean;
  lastSeen?: string;
}

export interface FriendRequest {
  id: string;
  fromUser: string;
  fromRating: number;
  timestamp: string;
}

interface FriendsPanelProps {
  /** Current username (needed to send requests) */
  username: string | null;
  /** Compact mode for sidebar (less detail) */
  compact?: boolean;
  /** Callback when challenging a friend */
  onChallenge?: (friendUsername: string) => void;
}

// === Mock data (replaced by API when backend is running) ===
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const FriendsPanel: React.FC<FriendsPanelProps> = ({
  username,
  compact = false,
  onChallenge,
}) => {
  // State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ username: string; rating: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [notification, setNotification] = useState<string | null>(null);

  // Notification auto-clear
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load friends list (only from real backend)
  const loadFriends = useCallback(async () => {
    if (!username) return;
    try {
      const token = localStorage.getItem('chess_token');
      const res = await fetch(`${API_URL}/api/friends/list`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      } else {
        setFriends([]);
      }
    } catch {
      setFriends([]);
    }
  }, [username]);

  // Load pending requests (only from real backend)
  const loadRequests = useCallback(async () => {
    if (!username) return;
    try {
      const token = localStorage.getItem('chess_token');
      const res = await fetch(`${API_URL}/api/friends/requests`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else {
        setRequests([]);
      }
    } catch {
      setRequests([]);
    }
  }, [username]);

  // No mock data — all data comes from real backend only

  // Send heartbeat to mark user as online
  const sendHeartbeat = useCallback(async () => {
    if (!username) return;
    try {
      const token = localStorage.getItem('chess_token');
      if (!token) return;
      await fetch(`${API_URL}/api/friends/heartbeat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch { /* silent */ }
  }, [username]);

  // Load data on mount + auto-refresh every 30s
  useEffect(() => {
    loadFriends();
    loadRequests();
    sendHeartbeat();

    // Heartbeat + refresh every 30 seconds
    const interval = setInterval(() => {
      sendHeartbeat();
      loadFriends();
      loadRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadFriends, loadRequests, sendHeartbeat]);

  // Search users (only real users from backend)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setIsSearching(true);

    try {
      const token = localStorage.getItem('chess_token');
      const res = await fetch(`${API_URL}/api/friends/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
        setNotification('Error al buscar usuarios');
      }
    } catch {
      setSearchResults([]);
      setNotification('No se pudo conectar al servidor');
    }
    setIsSearching(false);
  }, [searchQuery]);

  // Send friend request (real backend only)
  const sendRequest = useCallback(async (targetUsername: string) => {
    if (!username) return;
    try {
      const token = localStorage.getItem('chess_token');
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ toUsername: targetUsername }),
      });
      if (res.ok) {
        setNotification(`Solicitud enviada a ${targetUsername}`);
        setSearchResults(prev => prev.filter(r => r.username !== targetUsername));
      } else {
        const data = await res.json().catch(() => ({}));
        setNotification(data.message || 'Error al enviar solicitud');
      }
    } catch {
      setNotification('No se pudo conectar al servidor');
    }
  }, [username]);

  // Accept friend request
  const acceptRequest = useCallback(async (requestId: string, fromUser: string) => {
    try {
      const token = localStorage.getItem('chess_token');
      await fetch(`${API_URL}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
    } catch { /* Use fallback */ }

    // Reload data from backend after accepting
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setNotification(`${fromUser} añadido como amigo`);
    // Refresh friends list from backend
    loadFriends();
  }, []);

  // Reject friend request
  const rejectRequest = useCallback(async (requestId: string) => {
    try {
      const token = localStorage.getItem('chess_token');
      await fetch(`${API_URL}/api/friends/reject/${requestId}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
    } catch { /* Use fallback */ }

    setRequests(prev => prev.filter(r => r.id !== requestId));
    setNotification('Solicitud rechazada');
  }, []);

  // Remove friend
  const removeFriend = useCallback(async (friendId: string) => {
    try {
      const token = localStorage.getItem('chess_token');
      await fetch(`${API_URL}/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
    } catch { /* Use fallback */ }

    setFriends(prev => prev.filter(f => f.id !== friendId));
    setNotification('Amigo eliminado');
  }, []);

  // Challenge a friend
  const handleChallenge = (friendUsername: string) => {
    if (onChallenge) {
      onChallenge(friendUsername);
    } else {
      // Generate a game code and redirect
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      sessionStorage.setItem('gameConfig', JSON.stringify({
        timeControl: { minutes: 10, increment: 0, name: '10+0', label: '10+0', category: 'rapid' },
        isVsAI: false,
        privateCode: code,
        challengedUser: friendUsername,
      }));
      setNotification(`Código de partida: ${code} — Comparte con ${friendUsername}`);
    }
  };

  if (!username) {
    return (
      <div className="friends-panel friends-panel--login" id="friends-panel">
        <div className="friends-panel__empty">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style={{ opacity: 0.3 }}>
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <p>Inicia sesión para ver tus amigos</p>
        </div>
      </div>
    );
  }

  const onlineFriends = friends.filter(f => f.online);
  const offlineFriends = friends.filter(f => !f.online);

  return (
    <div className={`friends-panel ${compact ? 'friends-panel--compact' : ''}`} id="friends-panel">
      {/* Notification */}
      {notification && (
        <div className="friends-panel__notification">{notification}</div>
      )}

      {/* Tabs */}
      <div className="friends-tabs" id="friends-tabs">
        <button
          className={`friends-tabs__tab ${activeTab === 'friends' ? 'friends-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Amigos {friends.length > 0 && <span className="friends-tabs__count">{friends.length}</span>}
        </button>
        <button
          className={`friends-tabs__tab ${activeTab === 'requests' ? 'friends-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Solicitudes
          {requests.length > 0 && <span className="friends-tabs__badge">{requests.length}</span>}
        </button>
        <button
          className={`friends-tabs__tab ${activeTab === 'search' ? 'friends-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Buscar
        </button>
      </div>

      {/* FRIENDS TAB */}
      {activeTab === 'friends' && (
        <div className="friends-list" id="friends-list">
          {friends.length === 0 ? (
            <div className="friends-panel__empty">
              <p>No tienes amigos aún</p>
              <button className="friends-panel__add-btn" onClick={() => setActiveTab('search')}>
                Buscar usuarios
              </button>
            </div>
          ) : (
            <>
              {/* Online friends */}
              {onlineFriends.length > 0 && (
                <div className="friends-group">
                  <div className="friends-group__header">
                    <span className="friends-group__dot friends-group__dot--online" />
                    En línea ({onlineFriends.length})
                  </div>
                  {onlineFriends.map(f => (
                    <FriendItem
                      key={f.id}
                      friend={f}
                      compact={compact}
                      onChallenge={() => handleChallenge(f.username)}
                      onRemove={() => removeFriend(f.id)}
                    />
                  ))}
                </div>
              )}

              {/* Offline friends */}
              {offlineFriends.length > 0 && (
                <div className="friends-group">
                  <div className="friends-group__header">
                    <span className="friends-group__dot friends-group__dot--offline" />
                    Desconectados ({offlineFriends.length})
                  </div>
                  {offlineFriends.map(f => (
                    <FriendItem
                      key={f.id}
                      friend={f}
                      compact={compact}
                      onChallenge={() => handleChallenge(f.username)}
                      onRemove={() => removeFriend(f.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="friends-requests" id="friends-requests">
          {requests.length === 0 ? (
            <div className="friends-panel__empty">
              <p>No hay solicitudes pendientes</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="friend-request" id={`request-${req.id}`}>
                <div className="friend-request__info">
                  <span className="friend-request__name">{req.fromUser}</span>
                  <span className="friend-request__rating">{req.fromRating}</span>
                </div>
                <div className="friend-request__actions">
                  <button
                    className="friend-request__btn friend-request__btn--accept"
                    onClick={() => acceptRequest(req.id, req.fromUser)}
                    title="Aceptar"
                  >
                    ✓
                  </button>
                  <button
                    className="friend-request__btn friend-request__btn--reject"
                    onClick={() => rejectRequest(req.id)}
                    title="Rechazar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <div className="friends-list" id="friends-search">
          {/* Search input styled like a friend item */}
          <div className="friend-item friend-item--search">
            <div className="friend-item__main" style={{ width: '100%' }}>
              <span className="friend-item__dot friend-item__dot--search">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </span>
              <input
                className="friend-item__search-input"
                type="text"
                placeholder="Nombre de usuario..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                id="search-username-input"
              />
            </div>
            <button
              className="friend-item__action friend-item__action--search"
              onClick={handleSearch}
              disabled={isSearching || searchQuery.length < 2}
              title="Buscar"
            >
              {isSearching ? '...' : 'Ir'}
            </button>
          </div>

          {/* Results as friend-item cards */}
          {searchResults.length > 0 && (
            <div className="friends-group">
              <div className="friends-group__header">
                Resultados ({searchResults.length})
              </div>
              {searchResults.map(user => {
                const isFriend = friends.some(f => f.username === user.username);
                const isSelf = user.username === username;
                return (
                  <div key={user.username} className="friend-item">
                    <div className="friend-item__main">
                      <span className="friend-item__dot friend-item__dot--offline" />
                      <span className="friend-item__name">{user.username}</span>
                      <span className="friend-item__rating">{user.rating}</span>
                    </div>
                    {isSelf ? (
                      <span className="friend-item__last-seen">Tú</span>
                    ) : isFriend ? (
                      <span className="friend-item__last-seen">Amigo</span>
                    ) : (
                      <button
                        className="friend-item__action friend-item__action--challenge"
                        onClick={() => sendRequest(user.username)}
                        title="Agregar amigo"
                        style={{ display: 'flex' }}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {searchResults.length === 0 && searchQuery.length > 0 && !isSearching && (
            <div className="friends-panel__empty">
              <p>Escribe un nombre y presiona Ir</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// === Friend Item Component ===
const FriendItem: React.FC<{
  friend: Friend;
  compact: boolean;
  onChallenge: () => void;
  onRemove: () => void;
}> = ({ friend, compact, onChallenge, onRemove }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`friend-item ${friend.online ? 'friend-item--online' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="friend-item__main">
        <span className={`friend-item__dot ${friend.online ? 'friend-item__dot--online' : 'friend-item__dot--offline'}`} />
        <span className="friend-item__name">{friend.username}</span>
        {!compact && <span className="friend-item__rating">{friend.rating}</span>}
      </div>

      {showActions && (
        <div className="friend-item__actions">
          {friend.online && (
            <button
              className="friend-item__action friend-item__action--challenge"
              onClick={onChallenge}
              title="Retar"
            >
              ⚔
            </button>
          )}
          <button
            className="friend-item__action friend-item__action--remove"
            onClick={onRemove}
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      )}

      {!showActions && !compact && friend.lastSeen && !friend.online && (
        <span className="friend-item__last-seen">{friend.lastSeen}</span>
      )}
    </div>
  );
};
