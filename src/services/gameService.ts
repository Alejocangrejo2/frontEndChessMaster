// ============================================
// gameService.ts — Re-export from centralized API
// ============================================
export {
  createGame,
  getGameHistory,
  getGameState,
  saveMove,
  type GameHistoryItem,
} from './api';
