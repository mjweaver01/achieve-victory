export const GAMES = ['puzzle', 'chess', 'solitaire', 'game2048'] as const;

/** Minimum plausible play time before a completion is accepted. */
export const GAME_MIN_COMPLETION_MS: Record<(typeof GAMES)[number], number> = {
  puzzle: 3_000,
  chess: 5_000,
  solitaire: 10_000,
  game2048: 15_000,
};

export const MAX_COMPLETION_MS = 4 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const CLOCK_SKEW_MS = 5_000;

export const GAME_LABELS: Record<(typeof GAMES)[number], string> = {
  puzzle: 'Puzzle',
  chess: 'Chess',
  solitaire: 'Solitaire',
  game2048: '2048',
};
