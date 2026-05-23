import { Database } from 'bun:sqlite';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { mkdirSync } from 'fs';
import path from 'path';
import pg from 'pg';
import type { DB } from './types';
import { runMigrations } from './schema';

const { Pool, types } = pg;

// node-pg returns int8 as strings by default; our schema stores epoch ms in bigint columns.
types.setTypeParser(20, (value: string) => Number.parseInt(value, 10));

let db: Kysely<DB> | null = null;
let sqlite: Database | null = null;
let pool: pg.Pool | null = null;

function getPostgresUrl(): string | null {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  // Backward-compatible fallback for misconfigured environments.
  const maybeUrl = process.env.DATABASE_PATH?.trim();
  if (
    maybeUrl &&
    (maybeUrl.startsWith('postgres://') || maybeUrl.startsWith('postgresql://'))
  ) {
    console.warn(
      '[DB] DATABASE_PATH contains a Postgres URL; using it as DATABASE_URL. Set DATABASE_URL in Railway.'
    );
    return maybeUrl;
  }

  return null;
}

export function isPostgres(): boolean {
  return Boolean(getPostgresUrl());
}

export function getDbPath(): string {
  return (
    process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'madeon.db')
  );
}

export function getDb(): Kysely<DB> {
  if (db) return db;

  const postgresUrl = getPostgresUrl();
  if (postgresUrl) {
    pool = new Pool({ connectionString: postgresUrl });
    db = new Kysely<DB>({
      dialect: new PostgresDialect({ pool }),
    });
    return db;
  }

  const dbPath = getDbPath();
  mkdirSync(path.dirname(dbPath), { recursive: true });

  sqlite = new Database(dbPath, { create: true });
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');

  db = new Kysely<DB>({
    dialect: new BunSqliteDialect({ database: sqlite }),
  });

  return db;
}

/** Daily bucket for codes.created_at (epoch ms). */
export function codesByDayExpr() {
  if (isPostgres()) {
    return sql<string>`to_char(to_timestamp(created_at / 1000.0), 'YYYY-MM-DD')`;
  }
  return sql<string>`strftime('%Y-%m-%d', created_at / 1000, 'unixepoch')`;
}

export async function initDb(): Promise<void> {
  const instance = getDb();
  await runMigrations(instance, { isPostgres: isPostgres() });
  if (isPostgres()) {
    console.log('[DB] PostgreSQL ready (DATABASE_URL)');
  } else {
    console.log(`[DB] SQLite ready at ${getDbPath()}`);
  }
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
  sqlite?.close();
  sqlite = null;
  if (pool) {
    await pool.end();
    pool = null;
  }
}
