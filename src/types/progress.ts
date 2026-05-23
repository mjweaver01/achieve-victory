import type { GameType } from './game';

export type RedeemProgress = {
  status: 'playing' | 'submitting' | 'done' | 'error';
  message: string;
  code?: string;
  offerText?: string;
  completionTimeMs?: number;
};

export type PuzzleProgress = {
  board: number[];
  startedAt: number | null;
  elapsedMs: number;
  done: boolean;
  completionTimeMs?: number;
};

export type ChessProgress = {
  fen: string;
  startedAt: number | null;
  outcome: 'playing' | 'lost' | 'draw';
  statusText: string;
};

export type SolitaireProgress = {
  tableau: {
    down: string[];
    up: string[];
  }[];
  deck: string[];
  waste: string[];
  foundations: {
    S: string[];
    H: string[];
    D: string[];
    C: string[];
  };
  startedAt: number | null;
  outcome: 'playing' | 'won';
  statusText: string;
  moves: number;
};

export type Game2048Progress = {
  board: number[];
  score: number;
  startedAt: number | null;
  outcome: 'playing' | 'won' | 'lost';
  statusText: string;
};

export type StoredProgress = {
  sessionId: string;
  game: GameType;
  puzzle?: PuzzleProgress;
  chess?: ChessProgress;
  solitaire?: SolitaireProgress;
  game2048?: Game2048Progress;
  redeem?: RedeemProgress;
};
