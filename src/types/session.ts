import type { GameType } from './game';

export type StoredSession = {
  sessionId: string;
  email: string;
  game: GameType;
};
