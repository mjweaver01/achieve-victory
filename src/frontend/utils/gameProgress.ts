import type { GameType } from './session';
import { normalizePuzzleBoard } from './puzzleBoard';

export type RedeemProgress = {
  status: 'playing' | 'submitting' | 'done' | 'error';
  message: string;
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

export type StoredProgress = {
  sessionId: string;
  game: GameType;
  puzzle?: PuzzleProgress;
  chess?: ChessProgress;
  redeem?: RedeemProgress;
};

const PROGRESS_KEY = 'madeon_progress';

function readRaw(): StoredProgress | null {
  const raw = sessionStorage.getItem(PROGRESS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredProgress;
  } catch {
    return null;
  }
}

function write(data: StoredProgress | null): void {
  if (!data) {
    sessionStorage.removeItem(PROGRESS_KEY);
    return;
  }
  sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

export function loadProgress(sessionId: string): StoredProgress | null {
  const data = readRaw();
  if (!data || data.sessionId !== sessionId) return null;
  if (data.puzzle) {
    data.puzzle = {
      ...data.puzzle,
      board: normalizePuzzleBoard(data.puzzle.board),
    };
  }
  return data;
}

export function clearProgress(): void {
  sessionStorage.removeItem(PROGRESS_KEY);
}

export function clearGameState(sessionId: string, game: GameType): void {
  const data = readRaw();
  if (!data || data.sessionId !== sessionId) return;
  if (game === 'puzzle') delete data.puzzle;
  else delete data.chess;
  data.redeem = { status: 'playing', message: '' };
  write(data);
}

function ensureProgress(
  sessionId: string,
  game: GameType
): StoredProgress {
  const existing = readRaw();
  if (existing?.sessionId === sessionId) {
    existing.game = game;
    return existing;
  }
  return { sessionId, game };
}

export function savePuzzleProgress(
  sessionId: string,
  puzzle: PuzzleProgress
): void {
  const data = ensureProgress(sessionId, 'puzzle');
  data.puzzle = {
    ...puzzle,
    board: normalizePuzzleBoard(puzzle.board),
    elapsedMs: Number.isFinite(puzzle.elapsedMs) ? puzzle.elapsedMs : 0,
  };
  write(data);
}

export function saveChessProgress(
  sessionId: string,
  chess: ChessProgress
): void {
  const data = ensureProgress(sessionId, 'chess');
  data.chess = chess;
  write(data);
}

export function saveRedeemProgress(
  sessionId: string,
  redeem: RedeemProgress
): void {
  const data = readRaw();
  if (!data || data.sessionId !== sessionId) return;
  data.redeem = redeem;
  write(data);
}
