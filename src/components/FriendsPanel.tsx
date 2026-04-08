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

  // Load friends list
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
        // Fallback: use localStorage mock data
        loadMockFriends();
      }
    } catch {
      loadMockFriends();
    }
  }, [username]);

  // Load pending requests
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
        loadMockRequests();
      }
    } catch {
      loadMockRequests();
    }
  }, [username]);

  // Mock data fallback (works without backend)
  const loadMockFriends = () => {
    const stored = localStorage.getItem('chess_friends');
    if (stored) {
      setFriends(JSON.parse(stored));
    } else {
      // Demo friends
      const demoFriends: Friend[] = [
        { id: '1', username: 'Magnus_Fan', rating: 1450, online: true },
        { id: '2', username: 'AjedrezPro', rating: 1320, online: true },
        { id: '3', username: 'GarryK42', rating: 1580, online: false, lastSeen: 'hace 2h' },
        { id: '4', username: 'NataliaChess', rating: 1200, online: false, lastSeen: 'hace 1d' },
      ];
      localStorage.setItem('chess_friends', JSON.stringify(demoFriends));
      setFriends(demoFriends);
    }
  };

  const loadMockRequests = () => {
    const stored = localStorage.getItem('chess_friend_requests');
    if (stored) {
      setRequests(JSON.parse(stored));
    } else {
      setRequests([]);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [loadFriends, loadRequests]);

  // Search users
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
        // Mock search
        setSearchResults([
          { username: searchQuery, rating: 1200 + Math.floor(Math.random() * 600) },
        ]);
      }
    } catch {
      setSearchResults([
        { username: searchQuery, rating: 1200 + Math.floor(Math.random() * 600) },
      ]);
    }
    setIsSearching(false);
  }, [searchQuery]);

  // Send friend request
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
      } else {
        // Mock: save locally
        const pending = JSON.parse(localStorage.getItem('chess_sent_requests') || '[]');
        pending.push({ to: targetUsername, timestamp: new Date().toISOString() });
        localStorage.setItem('chess_sent_requests', JSON.stringify(pending));
        setNotification(`Solicitud enviada a ${targetUsername}`);
      }
    } catch {
      setNotification(`Solicitud enviada a ${targetUsername}`);
    }
    setSearchResults(prev => prev.filter(r => r.username !== targetUsername));
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

    // Update local state
    setRequests(prev => prev.filter(r => r.id !== requestId));
    const newFriend: Friend = {
      id: requestId,
      username: fromUser,
      rating: 1200,
      online: false,
    };
    setFriends(prev => {
      const updated = [...prev, newFriend];
      localStorage.setItem('chess_friends', JSON.stringify(updated));
      return updated;
    });
    setNotification(`${fromUser} añadido como amigo`);
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

    setFriends(prev => {
      const updated = prev.filter(f => f.id !== friendId);
      localStorage.setItem('chess_friends', JSON.stringify(updated));
      return updated;
    });
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
        <div className="friends-search" id="friends-search">
          <div className="friends-search__input-wrap">
            <input
              className="friends-search__input"
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              id="search-username-input"
            />
            <button
              className="friends-search__btn"
              onClick={handleSearch}
              disabled={isSearching || searchQuery.length < 2}
            >
              {isSearching ? '...' : 'Buscar'}
            </button>
          </div>

          <div className="friends-search__results">
            {searchResults.map(user => {
              const isFriend = friends.some(f => f.username === user.username);
              const isSelf = user.username === username;
              return (
                <div key={user.username} className="friends-search__result">
                  <div className="friends-search__result-info">
                    <span className="friends-search__result-name">{user.username}</span>
                    <span className="friends-search__result-rating">{user.rating}</span>
                  </div>
                  {isSelf ? (
                    <span className="friends-search__result-tag">Tú</span>
                  ) : isFriend ? (
                    <span className="friends-search__result-tag">Amigo</span>
                  ) : (
                    <button
                      className="friends-search__result-add"
                      onClick={() => sendRequest(user.username)}
                    >
                      + Agregar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
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
