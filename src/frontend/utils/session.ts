export type GameType = 'puzzle' | 'chess';

export type StoredSession = {
  sessionId: string;
  email: string;
  game: GameType;
};

const SESSION_KEY = 'madeon_session';

export function getStoredSession(): StoredSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredSession;
    if (!data.sessionId || !data.email) return null;
    return {
      ...data,
      game: data.game === 'chess' ? 'chess' : 'puzzle',
    };
  } catch {
    return null;
  }
}

export function storeSession(
  sessionId: string,
  email: string,
  game: GameType
): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ sessionId, email, game })
  );
}
