export type GameType = 'puzzle' | 'chess' | 'solitaire' | 'game2048';

export type StartResponse = { sessionId: string };

export type StartRequest = {
  email: string;
  game?: GameType;
};

export type CompleteRequest = {
  sessionId: string;
  email: string;
  game?: GameType;
  completionTimeMs: number;
  score?: number;
};

export type CompleteResponse = {
  success: true;
  code: string;
  offerText: string;
};

export type ResendCodeRequest = {
  sessionId: string;
  email: string;
};

export type ResendCodeResponse = { success: true; mock?: boolean };

export type LeaderboardEntry = {
  rank: number;
  email: string;
  game: GameType;
  completionTimeMs: number;
  completedAt: number;
};

export type LeaderboardResponse = { entries: LeaderboardEntry[] };

export type AdminStatsResponse = {
  totalSessions: number;
  totalCodes: number;
  completionRate: number;
  codesByDay: { date: string; count: number }[];
  topCompletions: {
    email: string;
    completionTimeMs: number;
    code: string;
    completedAt: number;
  }[];
  dropOffCount: number;
  blockedAttempts: number;
};
