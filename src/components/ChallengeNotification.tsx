// ============================================
// ChallengeNotification.tsx — Notificacion de reto en tiempo real
// ============================================
// Muestra un popup flotante cuando un amigo te reta.
// Countdown de 70s, acepta/rechaza, expira sola.

import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface Challenge {
  id: string;
  from: string;
  to: string;
  roomCode: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

interface ChallengeNotificationProps {
  username: string | null;
}

function getToken(): string | null {
  return localStorage.getItem('chess_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const ChallengeNotification: React.FC<ChallengeNotificationProps> = ({ username }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [sentChallenge, setSentChallenge] = useState<Challenge | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for incoming AND sent challenges every 3 seconds
  useEffect(() => {
    if (!username || !getToken()) return;

    const poll = async () => {
      try {
        // Poll incoming challenges
        const res = await fetch(`${API_URL}/api/challenge/pending`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setChallenges(data.filter((c: Challenge) => c.status === 'pending'));
          }
        }

        // Poll sent challenges to detect acceptance
        if (sentChallenge) {
          const sentRes = await fetch(`${API_URL}/api/challenge/sent`, {
            headers: authHeaders(),
          });
          if (sentRes.ok) {
            const sentData = await sentRes.json();
            if (Array.isArray(sentData)) {
              const accepted = sentData.find(
                (c: Challenge) => c.id === sentChallenge.id && c.status === 'accepted'
              );
              if (accepted) {
                // Opponent accepted! Navigate to game
                sessionStorage.setItem('gameConfig', JSON.stringify({
                  timeControl: { minutes: 10, increment: 0, name: '10+0', label: '10+0', category: 'rapid' },
                  isVsAI: false,
                  playerColor: 'white',
                  roomCode: accepted.roomCode,
                }));
                window.location.href = `/game?room=${accepted.roomCode}`;
              }
            }
          }
        }
      } catch { /* silent */ }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [username, sentChallenge]);

  // Accept challenge
  const acceptChallenge = useCallback(async (challenge: Challenge) => {
    try {
      const res = await fetch(`${API_URL}/api/challenge/${challenge.id}/accept`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const accepted = await res.json();
        const roomCode = accepted.roomCode;
        if (roomCode) {
          sessionStorage.setItem('gameConfig', JSON.stringify({
            timeControl: { minutes: 10, increment: 0, name: '10+0', label: '10+0', category: 'rapid' },
            isVsAI: false,
            playerColor: 'black',
            roomCode,
          }));
          window.location.href = `/game?room=${roomCode}`;
        }
      }
    } catch { /* silent */ }
  }, []);

  // Reject challenge
  const rejectChallenge = useCallback(async (challenge: Challenge) => {
    try {
      await fetch(`${API_URL}/api/challenge/${challenge.id}/reject`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch { /* silent */ }

    setChallenges(prev => prev.filter(c => c.id !== challenge.id));
  }, []);

  // Send a challenge (called externally via window event)
  useEffect(() => {
    const handleSendChallenge = (e: CustomEvent<{ to: string }>) => {
      const sendChallenge = async () => {
        try {
          const res = await fetch(`${API_URL}/api/challenge/send`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ to: e.detail.to }),
          });
          if (res.ok) {
            const data = await res.json();
            setSentChallenge(data);
          }
        } catch { /* silent */ }
      };
      sendChallenge();
    };

    window.addEventListener('send-challenge', handleSendChallenge as EventListener);
    return () => window.removeEventListener('send-challenge', handleSendChallenge as EventListener);
  }, []);

  // Nothing to show
  if (challenges.length === 0 && !sentChallenge) return null;

  return (
    <div className="challenge-notifications" id="challenge-notifications">
      {/* Incoming challenges */}
      {challenges.map(c => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          type="incoming"
          onAccept={() => acceptChallenge(c)}
          onReject={() => rejectChallenge(c)}
        />
      ))}

      {/* Sent challenge (waiting for response) */}
      {sentChallenge && (
        <ChallengeCard
          key={sentChallenge.id}
          challenge={sentChallenge}
          type="sent"
          onExpire={() => setSentChallenge(null)}
        />
      )}
    </div>
  );
};

// Individual challenge card with countdown
const ChallengeCard: React.FC<{
  challenge: Challenge;
  type: 'incoming' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onExpire?: () => void;
}> = ({ challenge, type, onAccept, onReject, onExpire }) => {
  const CHALLENGE_DURATION = 70;
  const elapsed = Math.floor((Date.now() - challenge.timestamp) / 1000);
  const initialRemaining = Math.max(0, CHALLENGE_DURATION - elapsed);
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onExpire]);

  if (remaining <= 0) return null;

  const progress = (remaining / CHALLENGE_DURATION) * 100;

  return (
    <div className={`challenge-card challenge-card--${type}`}>
      <div className="challenge-card__progress" style={{ width: `${progress}%` }} />
      <div className="challenge-card__content">
        <div className="challenge-card__icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
          </svg>
        </div>
        <div className="challenge-card__text">
          {type === 'incoming' ? (
            <>
              <strong>{challenge.from}</strong> te esta retando
            </>
          ) : (
            <>
              Reto enviado a <strong>{challenge.to}</strong>
            </>
          )}
          <span className="challenge-card__timer">{remaining}s</span>
        </div>
        {type === 'incoming' && (
          <div className="challenge-card__actions">
            <button className="challenge-card__btn challenge-card__btn--accept" onClick={onAccept}>
              Aceptar
            </button>
            <button className="challenge-card__btn challenge-card__btn--reject" onClick={onReject}>
              Rechazar
            </button>
          </div>
        )}
        {type === 'sent' && (
          <div className="challenge-card__actions">
            <span className="challenge-card__waiting">Esperando...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to dispatch a challenge event from any component
export function sendChallengeEvent(toUsername: string): void {
  window.dispatchEvent(new CustomEvent('send-challenge', { detail: { to: toUsername } }));
}
