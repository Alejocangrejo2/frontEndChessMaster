// ============================================
// useChessEngine.ts — Hook principal: ChessEngine + Timer + IA
// ============================================
// FIX: Lee configuración de sessionStorage para que el tiempo
// coincida con la selección del lobby.

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChessEngine, MoveInfo, GameStatus, GameResult, LegalDests } from '../engine/ChessEngine';
import { StockfishEngine } from '../engine/StockfishWorker';
import type { Key, Color } from 'chessground/types';
import type { Role } from 'chessops/types';

export type TimeControl = {
  name: string;
  label: string;
  minutes: number;
  increment: number;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'unlimited';
};

export const TIME_CONTROLS: TimeControl[] = [
  { name: '1+0', label: '1+0', minutes: 1, increment: 0, category: 'bullet' },
  { name: '2+1', label: '2+1', minutes: 2, increment: 1, category: 'bullet' },
  { name: '3+0', label: '3+0', minutes: 3, increment: 0, category: 'blitz' },
  { name: '3+2', label: '3+2', minutes: 3, increment: 2, category: 'blitz' },
  { name: '5+0', label: '5+0', minutes: 5, increment: 0, category: 'blitz' },
  { name: '5+3', label: '5+3', minutes: 5, increment: 3, category: 'blitz' },
  { name: '10+0', label: '10+0', minutes: 10, increment: 0, category: 'rapid' },
  { name: '15+10', label: '15+10', minutes: 15, increment: 10, category: 'rapid' },
  { name: '30+0', label: '30+0', minutes: 30, increment: 0, category: 'classical' },
  { name: 'unlimited', label: 'Sin límite', minutes: 0, increment: 0, category: 'unlimited' },
];

export type AIDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface GameConfig {
  timeControl: TimeControl;
  aiLevel: AIDifficulty;
  playerColor: Color;
  isVsAI: boolean;
}

interface UseChessEngineReturn {
  fen: string;
  turn: Color;
  status: GameStatus;
  result: GameResult | undefined;
  isGameOver: boolean;
  isCheck: boolean;
  checkSquare: Key | undefined;
  lastMove: [Key, Key] | undefined;
  legalDests: LegalDests;
  moveHistory: MoveInfo[];
  fenHistory: string[];
  playerColor: Color;
  isVsAI: boolean;
  aiLevel: AIDifficulty;
  isAIThinking: boolean;
  whiteTime: number;
  blackTime: number;
  timeControl: TimeControl;
  whiteCaptured: Role[];
  blackCaptured: Role[];
  materialBalance: number;
  // Review system
  reviewIndex: number | null;
  reviewFen: string | null;
  reviewLastMove: [Key, Key] | undefined;
  isReviewing: boolean;
  goToMove: (index: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  goBack: () => void;
  goForward: () => void;
  onMove: (from: Key, to: Key) => void;
  newGame: (config?: Partial<GameConfig>) => void;
  resign: () => void;
  offerDraw: () => void;
  setTimeControl: (tc: TimeControl) => void;
  flipBoard: () => void;
  formatTime: (ms: number) => string;
}

/**
 * Read initial game config from sessionStorage (set by LobbyPage).
 * This is the FIX for the 5-minute bug: we now respect the user's
 * time control selection instead of always defaulting to 5+0.
 */
function getInitialConfig(): GameConfig {
  try {
    const stored = sessionStorage.getItem('gameConfig');
    if (stored) {
      const parsed = JSON.parse(stored);
      // NOTE: Do NOT remove sessionStorage here!
      // React StrictMode double-renders, so the second render
      // would miss the data. We clear it in a useEffect instead.
      return {
        timeControl: parsed.timeControl || TIME_CONTROLS[4],
        aiLevel: parsed.aiLevel || 1,
        playerColor: parsed.playerColor || 'white',
        isVsAI: parsed.isVsAI ?? true,
      };
    }
  } catch { /* ignore parse errors */ }

  return {
    timeControl: TIME_CONTROLS[4] as TimeControl,
    aiLevel: 1,
    playerColor: 'white',
    isVsAI: true,
  };
}

export function useChessEngine(): UseChessEngineReturn {
  // Read config from sessionStorage on first mount
  const initialConfig = useRef(getInitialConfig());
  const cfg = initialConfig.current;

  // Clear sessionStorage after mount (safe from StrictMode double-render)
  useEffect(() => {
    sessionStorage.removeItem('gameConfig');
  }, []);

  const engineRef = useRef<ChessEngine>(new ChessEngine());

  const [fen, setFen] = useState(engineRef.current.fen());
  const [turn, setTurn] = useState<Color>(engineRef.current.turn);
  const [status, setStatus] = useState<GameStatus>(engineRef.current.status);
  const [result, setResult] = useState<GameResult | undefined>(engineRef.current.result);
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>(undefined);
  const [checkSquare, setCheckSquare] = useState<Key | undefined>(undefined);
  const [legalDests, setLegalDests] = useState<LegalDests>(engineRef.current.legalDests());
  const [moveHistory, setMoveHistory] = useState<MoveInfo[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [whiteCaptured, setWhiteCaptured] = useState<Role[]>([]);
  const [blackCaptured, setBlackCaptured] = useState<Role[]>([]);
  const [materialBalanceVal, setMaterialBalance] = useState(0);

  // Game config — initialized from sessionStorage
  const [playerColor, setPlayerColor] = useState<Color>(cfg.playerColor);
  const [isVsAI, setIsVsAI] = useState(cfg.isVsAI);
  const [aiLevel, setAiLevel] = useState<AIDifficulty>(cfg.aiLevel);

  // Timer — initialized from the SELECTED time control, not always 5+0
  const initMs = cfg.timeControl.category === 'unlimited' ? Infinity : cfg.timeControl.minutes * 60 * 1000;
  const [timeControl, setTimeControlState] = useState<TimeControl>(cfg.timeControl);
  const [whiteTime, setWhiteTime] = useState(initMs);
  const [blackTime, setBlackTime] = useState(initMs);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);

  // Sync all React state from engine
  const syncState = useCallback(() => {
    const engine = engineRef.current;
    setFen(engine.fen());
    setTurn(engine.turn);
    setStatus(engine.status);
    setResult(engine.result);
    setLastMove(engine.lastMove());
    setCheckSquare(engine.kingInCheck());
    setLegalDests(engine.legalDests());
    setMoveHistory(engine.moveHistory);
    // Material advantage
    setWhiteCaptured(engine.capturedPieces('white'));
    setBlackCaptured(engine.capturedPieces('black'));
    setMaterialBalance(engine.materialBalance());
  }, []);

  // Timer countdown
  useEffect(() => {
    if (status === 'active' || status === 'check') {
      if (timeControl.category === 'unlimited') return;

      lastTickRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastTickRef.current;
        lastTickRef.current = now;

        if (turn === 'white') {
          setWhiteTime(prev => {
            const next = prev - elapsed;
            if (next <= 0) {
              engineRef.current.timeout('white');
              syncState();
              return 0;
            }
            return next;
          });
        } else {
          setBlackTime(prev => {
            const next = prev - elapsed;
            if (next <= 0) {
              engineRef.current.timeout('black');
              syncState();
              return 0;
            }
            return next;
          });
        }
      }, 100);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [turn, status, timeControl.category, syncState]);

  // Stockfish engine reference
  const stockfishRef = useRef<StockfishEngine | null>(null);

  // Initialize Stockfish on mount, clean up on unmount
  useEffect(() => {
    if (cfg.isVsAI) {
      const sf = new StockfishEngine();
      sf.setLevel(cfg.aiLevel);
      stockfishRef.current = sf;
    }
    return () => {
      stockfishRef.current?.destroy();
      stockfishRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI move logic — uses Stockfish with fallback to random
  // Includes humanized delay to simulate natural thinking time
  const makeAIMove = useCallback(() => {
    const engine = engineRef.current;
    if (engine.isGameOver || engine.turn === playerColor) return;

    setIsAIThinking(true);

    const fen = engine.fen();
    const sf = stockfishRef.current;

    // Generate a natural-feeling delay based on AI level
    // Higher levels "think" longer. Uses Gaussian-like distribution.
    const generateHumanDelay = (): number => {
      // Box-Muller transform for Gaussian distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

      // Base delay scales with level: 400ms (lv1) to 1200ms (lv8)
      const baseDelay = 300 + aiLevel * 100;
      // Variance also scales: ±200ms (lv1) to ±600ms (lv8)
      const variance = 150 + aiLevel * 50;

      const delay = baseDelay + gaussian * variance;
      // Clamp between 400ms and 3000ms
      return Math.max(400, Math.min(3000, delay));
    };

    const executeMove = (uciMove: string) => {
      if (engine.isGameOver) {
        setIsAIThinking(false);
        return;
      }
      // UCI move format: "e2e4" or "e7e8q" (promotion)
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      const promoMap: Record<string, 'queen' | 'rook' | 'bishop' | 'knight'> = {
        q: 'queen', r: 'rook', b: 'bishop', n: 'knight'
      };

      engine.move(from, to, promotion ? promoMap[promotion] : undefined);

      // Add increment after AI move
      if (timeControl.increment > 0) {
        const aiColor = playerColor === 'white' ? 'black' : 'white';
        if (aiColor === 'white') {
          setWhiteTime(prev => prev + timeControl.increment * 1000);
        } else {
          setBlackTime(prev => prev + timeControl.increment * 1000);
        }
      }

      syncState();
      setIsAIThinking(false);
    };

    // Try Stockfish first
    if (sf && sf.available) {
      const humanDelay = generateHumanDelay();
      const startTime = Date.now();

      sf.getBestMove(fen)
        .then((uciMove: string) => {
          // Calculate remaining delay (Stockfish may finish before delay)
          const elapsed = Date.now() - startTime;
          const remainingDelay = Math.max(0, humanDelay - elapsed);

          setTimeout(() => executeMove(uciMove), remainingDelay);
        })
        .catch(() => {
          // Fallback to random move
          makeRandomMove(engine);
        });
    } else {
      // Stockfish not available — use random fallback
      const delay = 200 + (aiLevel * 80);
      setTimeout(() => {
        makeRandomMove(engine);
      }, delay);
    }
  }, [playerColor, aiLevel, syncState, timeControl.increment]);

  // Random move fallback
  const makeRandomMove = useCallback((engine: ChessEngine) => {
    if (engine.isGameOver) {
      setIsAIThinking(false);
      return;
    }

    const dests = engine.legalDests();
    const allMoves: { from: string; to: string }[] = [];

    dests.forEach((targets, from) => {
      targets.forEach(to => {
        allMoves.push({ from, to });
      });
    });

    if (allMoves.length > 0) {
      const idx = Math.floor(Math.random() * allMoves.length);
      const randomMove = allMoves[idx];
      if (randomMove) {
        engine.move(randomMove.from, randomMove.to);
      }

      // Add increment after AI move
      if (timeControl.increment > 0) {
        const aiColor = playerColor === 'white' ? 'black' : 'white';
        if (aiColor === 'white') {
          setWhiteTime(prev => prev + timeControl.increment * 1000);
        } else {
          setBlackTime(prev => prev + timeControl.increment * 1000);
        }
      }

      syncState();
    }

    setIsAIThinking(false);
  }, [playerColor, syncState, timeControl.increment]);

  // If player is black, AI moves first on mount
  useEffect(() => {
    if (cfg.isVsAI && cfg.playerColor === 'black') {
      const timer = setTimeout(() => makeAIMove(), 600);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle player move
  const onMove = useCallback((from: Key, to: Key) => {
    const engine = engineRef.current;

    let promotion: 'queen' | undefined;
    if (engine.needsPromotion(from, to)) {
      promotion = 'queen';
    }

    const moveInfo = engine.move(from, to, promotion);
    if (!moveInfo) return;

    // Add increment after player move
    if (timeControl.increment > 0) {
      if (moveInfo.color === 'white') {
        setWhiteTime(prev => prev + timeControl.increment * 1000);
      } else {
        setBlackTime(prev => prev + timeControl.increment * 1000);
      }
    }

    syncState();
    setReviewIndex(null); // Exit review mode on new move

    // Trigger AI response
    if (isVsAI && !engine.isGameOver) {
      makeAIMove();
    }
  }, [syncState, isVsAI, makeAIMove, timeControl.increment]);

  // New game
  const newGame = useCallback((config?: Partial<GameConfig>) => {
    const tc = config?.timeControl || timeControl;
    const color = config?.playerColor || 'white';
    const vsAI = config?.isVsAI ?? true;
    const level = config?.aiLevel || aiLevel;

    engineRef.current = new ChessEngine();

    setPlayerColor(color);
    setIsVsAI(vsAI);
    setAiLevel(level);
    setIsAIThinking(false);

    // Reset timer to the CORRECT time control
    if (tc.category !== 'unlimited') {
      const ms = tc.minutes * 60 * 1000;
      setWhiteTime(ms);
      setBlackTime(ms);
    } else {
      setWhiteTime(Infinity);
      setBlackTime(Infinity);
    }

    setTimeControlState(tc);
    syncState();

    // If player is black, AI moves first
    if (vsAI && color === 'black') {
      setTimeout(() => makeAIMove(), 500);
    }
  }, [timeControl, aiLevel, syncState, makeAIMove]);

  const resign = useCallback(() => {
    engineRef.current.resign(playerColor);
    syncState();
  }, [playerColor, syncState]);

  const offerDraw = useCallback(() => {
    if (isVsAI) {
      engineRef.current.drawByAgreement();
      syncState();
    }
  }, [isVsAI, syncState]);

  const setTimeControl = useCallback((tc: TimeControl) => {
    setTimeControlState(tc);
  }, []);

  const flipBoard = useCallback(() => {
    setPlayerColor(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  const formatTime = useCallback((ms: number): string => {
    if (ms === Infinity) return '--:--';
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // === Move Review System ===
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const isReviewing = reviewIndex !== null;

  const reviewFen = isReviewing
    ? engineRef.current.fenAtMove(reviewIndex)
    : null;

  const reviewLastMove = isReviewing
    ? engineRef.current.lastMoveAtIndex(reviewIndex)
    : undefined;

  const goToMove = useCallback((index: number) => {
    const maxIndex = engineRef.current.moveCount - 1;
    if (index < -1) index = -1;
    if (index > maxIndex) index = maxIndex;
    // If at the latest move, exit review
    if (index >= maxIndex) {
      setReviewIndex(null);
    } else {
      setReviewIndex(index);
    }
  }, []);

  const goToStart = useCallback(() => {
    setReviewIndex(-1);
  }, []);

  const goToEnd = useCallback(() => {
    setReviewIndex(null);
  }, []);

  const goBack = useCallback(() => {
    const current = reviewIndex ?? (engineRef.current.moveCount - 1);
    goToMove(current - 1);
  }, [reviewIndex, goToMove]);

  const goForward = useCallback(() => {
    if (reviewIndex === null) return; // already at end
    goToMove(reviewIndex + 1);
  }, [reviewIndex, goToMove]);

  // Reset review when a new move is made
  // (handled by syncState resetting review to null in onMove)

  return {
    fen,
    turn,
    status,
    result,
    isGameOver: engineRef.current.isGameOver,
    isCheck: status === 'check',
    checkSquare,
    lastMove,
    legalDests,
    moveHistory,
    fenHistory: engineRef.current.fenHistory,
    playerColor,
    isVsAI,
    aiLevel,
    isAIThinking,
    whiteTime,
    blackTime,
    timeControl,
    whiteCaptured,
    blackCaptured,
    materialBalance: materialBalanceVal,
    // Review system
    reviewIndex,
    reviewFen,
    reviewLastMove,
    isReviewing,
    goToMove,
    goToStart,
    goToEnd,
    goBack,
    goForward,
    onMove,
    newGame,
    resign,
    offerDraw,
    setTimeControl,
    flipBoard,
    formatTime,
  };
}
