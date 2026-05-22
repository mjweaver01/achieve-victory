import { sql } from 'kysely';
import { codesByDayExpr, getDb } from '../db/index';
import type { AdminStatsResponse } from '../types/api';
import { error, json } from '../utils/http';

function isAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const url = new URL(req.url);
  const queryKey = url.searchParams.get('key');
  const headerKey = req.headers.get('x-admin-secret');

  return queryKey === secret || headerKey === secret;
}

export async function getAdmin(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
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
    .innerJoin('codes', 'codes.email', 'sessions.email')
    .select([
      'sessions.email',
      'sessions.completion_time_ms',
      'sessions.redeemed_at',
      'codes.code',
    ])
    .where('sessions.completion_time_ms', 'is not', null)
    .orderBy('sessions.completion_time_ms', 'asc')
    .limit(25)
    .execute();

  const completionRate =
    totalSessions > 0 ? totalCodes / totalSessions : 0;

  const response: AdminStatsResponse = {
    totalSessions,
    totalCodes,
    completionRate,
    codesByDay: codesByDayRows.map(row => ({
      date: row.date,
      count: count(row.count),
    })),
    topCompletions: topSessions.map(row => ({
      email: row.email,
      completionTimeMs: row.completion_time_ms!,
      code: row.code,
      completedAt: row.redeemed_at!,
    })),
    dropOffCount,
    blockedAttempts,
  };

  return json(response);
}
