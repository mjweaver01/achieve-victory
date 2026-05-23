import { getDb } from '../db/index';
import type { GameType, LeaderboardResponse } from '../types/api';
import { anonymizeEmail } from '../utils/anonymize';
import { json } from '../utils/http';

const LIMIT = 50;

function normalizeGame(game: string | null): GameType {
  if (game === 'chess') return 'chess';
  if (game === 'solitaire') return 'solitaire';
  if (game === 'game2048') return 'game2048';
  return 'puzzle';
}

export async function getLeaderboard(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const gameFilter = url.searchParams.get('game');

  let query = getDb()
    .selectFrom('sessions')
    .select(['email', 'game', 'completion_time_ms', 'redeemed_at'])
    .where('redeemed_at', 'is not', null)
    .where('completion_time_ms', 'is not', null)
    .orderBy('completion_time_ms', 'asc');

  if (
    gameFilter === 'puzzle' ||
    gameFilter === 'chess' ||
    gameFilter === 'solitaire' ||
    gameFilter === 'game2048'
  ) {
    query = query.where('game', '=', gameFilter);
  }

  const rows = await query.limit(LIMIT).execute();

  const response: LeaderboardResponse = {
    entries: rows.map((row, index) => ({
      rank: index + 1,
      email: anonymizeEmail(row.email),
      game: normalizeGame(row.game),
      completionTimeMs: row.completion_time_ms!,
      completedAt: row.redeemed_at!,
    })),
  };

  return json(response);
}
