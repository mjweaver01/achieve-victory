export type GameType = 'puzzle' | 'chess' | 'solitaire' | 'game2048';

export type StoredSession = {
  sessionId: string;
  email: string;
  game: GameType;
};

import { clearProgress } from './gameProgress';

const SESSION_KEY = 'madeon_session';
const LAST_EMAIL_KEY = 'madeon_last_email';

export function gamePath(game: GameType): string {
  return game === 'game2048' ? '/play/2048' : `/play/${game}`;
}

export function getStoredSession(): StoredSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredSession;
    if (!data.sessionId || !data.email) return null;
    return {
      ...data,
      game:
        data.game === 'chess' ||
        data.game === 'solitaire' ||
        data.game === 'game2048'
          ? data.game
          : 'puzzle',
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
  game: GameType
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
