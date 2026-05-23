import {
  CLOCK_SKEW_MS,
  GAME_MIN_COMPLETION_MS,
  MAX_COMPLETION_MS,
  SESSION_MAX_AGE_MS,
} from '../constants/games';
import type { GameType } from '../types/game';

export type CompletionValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateCompletion(params: {
  game: GameType;
  completionTimeMs: number;
  sessionStartedAt: number;
  now?: number;
  skipTiming?: boolean;
}): CompletionValidationResult {
  if (params.skipTiming) return { ok: true };

  const now = params.now ?? Date.now();
  const { game, completionTimeMs, sessionStartedAt } = params;

  if (!Number.isFinite(completionTimeMs) || completionTimeMs < 0) {
    return { ok: false, reason: 'Invalid completion time' };
  }

  const wallClockMs = now - sessionStartedAt;

  if (wallClockMs > SESSION_MAX_AGE_MS) {
    return { ok: false, reason: 'Session expired — start a new game' };
  }

  if (completionTimeMs < GAME_MIN_COMPLETION_MS[game]) {
    return { ok: false, reason: 'Completion time is too fast for this game' };
  }

  if (completionTimeMs > MAX_COMPLETION_MS) {
    return { ok: false, reason: 'Invalid completion time' };
  }

  if (completionTimeMs > wallClockMs + CLOCK_SKEW_MS) {
    return { ok: false, reason: 'Completion time exceeds session duration' };
  }

  return { ok: true };
}
