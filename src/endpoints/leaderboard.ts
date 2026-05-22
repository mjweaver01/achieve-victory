import { getDb } from '../db/index';
import type { LeaderboardResponse } from '../types/api';
import { anonymizeEmail } from '../utils/anonymize';
import { json } from '../utils/http';

const LIMIT = 50;

export async function getLeaderboard(): Promise<Response> {
  const rows = await getDb()
    .selectFrom('sessions')
    .select(['email', 'completion_time_ms', 'redeemed_at'])
    .where('redeemed_at', 'is not', null)
    .where('completion_time_ms', 'is not', null)
    .orderBy('completion_time_ms', 'asc')
    .limit(LIMIT)
    .execute();

  const response: LeaderboardResponse = {
    entries: rows.map((row, index) => ({
      rank: index + 1,
      email: anonymizeEmail(row.email),
      completionTimeMs: row.completion_time_ms!,
      completedAt: row.redeemed_at!,
    })),
  };

  return json(response);
}
