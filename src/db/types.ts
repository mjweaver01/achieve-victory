import type { Insertable, Selectable, Updateable } from 'kysely';

export interface SessionsTable {
  id: string;
  email: string;
  started_at: number;
  redeemed_at: number | null;
  completion_time_ms: number | null;
  score: number | null;
}

export interface CodesTable {
  email: string;
  code: string;
  shopify_customer_id: string;
  created_at: number;
}

export interface BlockedAttemptsTable {
  id: string;
  email: string;
  reason: string;
  attempted_at: number;
}

export interface DB {
  sessions: SessionsTable;
  codes: CodesTable;
  blocked_attempts: BlockedAttemptsTable;
}

export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;
export type SessionUpdate = Updateable<SessionsTable>;
export type Code = Selectable<CodesTable>;
export type NewCode = Insertable<CodesTable>;
