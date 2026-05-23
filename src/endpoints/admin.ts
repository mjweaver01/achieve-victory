import { sql } from 'kysely';
import { codesByDayExpr, getDb } from '../db/index';
import type { AdminStatsResponse } from '../types/api';
import { anonymizeEmail } from '../utils/anonymize';
import { isAdminAuthorized } from '../utils/adminAuth';
import { toEpochMs } from '../utils/epoch';
import { error, json } from '../utils/http';

export async function getAdmin(req: Request): Promise<Response> {
  if (!isAdminAuthorized(req)) {
    return error('Unauthorized', 401);
  }

  const db = getDb();

  const count = (value: string | number | bigint | undefined) =>
    Number(value ?? 0);

  const totalSessions = count(
    (
      await db
        .selectFrom('sessions')
        .select(sql<string>`count(*)`.as('count'))
        .executeTakeFirst()
    )?.count
  );

  const totalCodes = count(
    (
      await db
        .selectFrom('codes')
        .select(sql<string>`count(*)`.as('count'))
        .executeTakeFirst()
    )?.count
  );

  const dropOffCount = count(
    (
      await db
        .selectFrom('sessions')
        .select(sql<string>`count(*)`.as('count'))
        .where('redeemed_at', 'is', null)
        .executeTakeFirst()
    )?.count
  );

  const blockedAttempts = count(
    (
      await db
        .selectFrom('blocked_attempts')
        .select(sql<string>`count(*)`.as('count'))
        .executeTakeFirst()
    )?.count
  );

  const dayExpr = codesByDayExpr();
  const codesByDayRows = await db
    .selectFrom('codes')
    .select([dayExpr.as('date'), sql<string>`count(*)`.as('count')])
    .groupBy(dayExpr)
    .orderBy('date', 'asc')
    .execute();

  const topSessions = await db
    .selectFrom('sessions')
    .select(['email', 'completion_time_ms', 'redeemed_at'])
    .where('completion_time_ms', 'is not', null)
    .where('redeemed_at', 'is not', null)
    .orderBy('completion_time_ms', 'asc')
    .limit(25)
    .execute();

  const completionRate = totalSessions > 0 ? totalCodes / totalSessions : 0;

  const response: AdminStatsResponse = {
    totalSessions,
    totalCodes,
    completionRate,
    codesByDay: codesByDayRows.map(row => ({
      date: row.date,
      count: count(row.count),
    })),
    topCompletions: topSessions.map(row => ({
      email: anonymizeEmail(row.email),
      completionTimeMs: toEpochMs(row.completion_time_ms),
      completedAt: toEpochMs(row.redeemed_at),
    })),
    dropOffCount,
    blockedAttempts,
  };

  return json(response);
}
