import type { GameType } from '../../types/game';
import type {
  ChessProgress,
  Game2048Progress,
  PuzzleProgress,
  RedeemProgress,
  SolitaireProgress,
  StoredProgress,
} from '../../types/progress';
import { normalizePuzzleBoard } from './puzzleBoard';

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
  else if (game === 'chess') delete data.chess;
  else if (game === 'solitaire') delete data.solitaire;
  else delete data.game2048;
  data.redeem = {
    status: 'playing',
    message: '',
    code: undefined,
    offerText: undefined,
    completionTimeMs: undefined,
  };
  write(data);
}

function ensureProgress(sessionId: string, game: GameType): StoredProgress {
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

export function saveSolitaireProgress(
  sessionId: string,
  solitaire: SolitaireProgress
): void {
  const data = ensureProgress(sessionId, 'solitaire');
  data.solitaire = solitaire;
  write(data);
}

export function save2048Progress(
  sessionId: string,
  progress: Game2048Progress
): void {
  const data = ensureProgress(sessionId, 'game2048');
  data.game2048 = progress;
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
