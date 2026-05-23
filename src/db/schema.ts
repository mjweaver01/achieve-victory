import { sql, type Kysely } from 'kysely';
import type { DB } from '../types/db';

const baseMigrations = [
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    started_at BIGINT NOT NULL,
    redeemed_at BIGINT,
    completion_time_ms BIGINT,
    score INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_redeemed
    ON sessions(redeemed_at, completion_time_ms)`,

  `CREATE TABLE IF NOT EXISTS codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    shopify_customer_id TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS blocked_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    reason TEXT NOT NULL,
    attempted_at BIGINT NOT NULL
  )`,
];

const postgresBigIntFixes = [
  `ALTER TABLE sessions ALTER COLUMN started_at TYPE BIGINT`,
  `ALTER TABLE sessions ALTER COLUMN redeemed_at TYPE BIGINT`,
  `ALTER TABLE sessions ALTER COLUMN completion_time_ms TYPE BIGINT`,
  `ALTER TABLE codes ALTER COLUMN created_at TYPE BIGINT`,
  `ALTER TABLE blocked_attempts ALTER COLUMN attempted_at TYPE BIGINT`,
];

function isDuplicateColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('duplicate column') ||
    msg.includes('already exists') ||
    msg.includes('column "game" of relation "sessions" already exists')
  );
}

export async function runMigrations(
  db: Kysely<DB>,
  opts?: { isPostgres?: boolean }
): Promise<void> {
  for (const statement of baseMigrations) {
    await sql.raw(statement).execute(db);
  }

  if (opts?.isPostgres) {
    for (const statement of postgresBigIntFixes) {
      await sql.raw(statement).execute(db);
    }
  }

  // Track the selected game per session for analytics/leaderboard filtering.
  try {
    await sql.raw(`ALTER TABLE sessions ADD COLUMN game TEXT`).execute(db);
  } catch (err) {
    if (!isDuplicateColumnError(err)) throw err;
  }

  await sql
    .raw(
      `UPDATE sessions SET game = 'puzzle'
       WHERE game IS NULL`
    )
    .execute(db);
}
