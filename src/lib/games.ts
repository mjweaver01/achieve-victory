import { GAME_LABELS, GAMES } from '../constants/games';
import type { GameType } from '../types/game';

export function isGameType(value: unknown): value is GameType {
  return typeof value === 'string' && (GAMES as readonly string[]).includes(value);
}

export function normalizeGame(value: unknown): GameType {
  if (isGameType(value)) return value;
  return 'puzzle';
}

export function gamePath(game: GameType): string {
  return game === 'game2048' ? '/play/2048' : `/play/${game}`;
}

export function gameLabel(game: GameType): string {
  return GAME_LABELS[game];
}
