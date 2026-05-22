import { sql, type Kysely } from 'kysely';
import type { DB } from './types';

const migrations = [
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    redeemed_at INTEGER,
    completion_time_ms INTEGER,
    score INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_redeemed
    ON sessions(redeemed_at, completion_time_ms)`,

  `CREATE TABLE IF NOT EXISTS codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    shopify_customer_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS blocked_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    reason TEXT NOT NULL,
    attempted_at INTEGER NOT NULL
  )`,
];

export async function runMigrations(db: Kysely<DB>): Promise<void> {
  for (const statement of migrations) {
    await sql.raw(statement).execute(db);
  }
}
