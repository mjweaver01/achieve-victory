export type StartResponse =
  | { sessionId: string }
  | { alreadyRedeemed: true; code: string };

export type CompleteRequest = {
  sessionId: string;
  email: string;
  completionTimeMs: number;
  score?: number;
};

export type CompleteResponse = { success: true };

export type ResendCodeRequest = {
  sessionId: string;
  email: string;
};

export type ResendCodeResponse = { success: true; mock?: boolean };

export type LeaderboardEntry = {
  rank: number;
  email: string;
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
