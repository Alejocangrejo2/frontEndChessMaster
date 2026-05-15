// ============================================
// FriendsPage.tsx — Página de amigos
// ============================================

import React from 'react';
import { FriendsPanel } from '../components/FriendsPanel';
import { FloatingPieces } from '../components/FloatingPieces';

interface FriendsPageProps {
  username: string | null;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({ username }) => {
  return (
    <div className="friends-page" id="friends-page">
      <FloatingPieces count={30} />
      <div className="friends-page__header">
        <h1 className="friends-page__title">Amigos</h1>
        <p className="friends-page__subtitle">
          Busca usuarios, envía solicitudes y reta a tus amigos a partidas privadas
        </p>
      </div>
      <div className="friends-page__content">
        <FriendsPanel username={username} compact={false} />
      </div>
    </div>
  );
};
