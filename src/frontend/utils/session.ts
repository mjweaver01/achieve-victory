import { gamePath, normalizeGame } from '../../lib/games';
import type { StoredSession } from '../../types/session';
import { clearProgress } from './gameProgress';

export { gamePath };

const SESSION_KEY = 'madeon_session';
const LAST_EMAIL_KEY = 'madeon_last_email';

export function getStoredSession(): StoredSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredSession;
    if (!data.sessionId || !data.email) return null;
    return {
      ...data,
      game: normalizeGame(data.game),
    };
  } catch {
    return null;
  }
}

export function getLastEmail(): string {
  const fromSession = getStoredSession()?.email;
  if (fromSession) return fromSession;
  return localStorage.getItem(LAST_EMAIL_KEY) ?? '';
}

export function storeSession(
  sessionId: string,
  email: string,
  game: StoredSession['game']
): void {
  const existing = getStoredSession();
  if (existing?.sessionId !== sessionId) {
    clearProgress();
  }
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ sessionId, email, game })
  );
  localStorage.setItem(LAST_EMAIL_KEY, email);
}
