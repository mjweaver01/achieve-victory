import { getDb } from '../db/index';
import type { GameType, StartRequest, StartResponse } from '../types/api';
import {
  recordBlockedAttempt,
  validateEmail,
} from '../utils/emailValidation';
import { error, json } from '../utils/http';

function normalizeGame(game: string | undefined): GameType {
  if (game === 'chess') return 'chess';
  if (game === 'solitaire') return 'solitaire';
  if (game === 'game2048') return 'game2048';
  return 'puzzle';
}

export async function postStart(req: Request): Promise<Response> {
  let body: Partial<StartRequest>;
  try {
    body = (await req.json()) as Partial<StartRequest>;
  } catch {
    return error('Invalid JSON body', 400);
  }

  if (!body.email) {
    return error('Email is required', 400);
  }

  const validation = await validateEmail(body.email);
  if (!validation.ok) {
    await recordBlockedAttempt(
      body.email.trim().toLowerCase(),
      validation.reason
    );
    return error('Email is not allowed', 400);
  }

  const { email } = validation;
  const game = normalizeGame(body.game);
  const db = getDb();

  const existingCode = await db
    .selectFrom('codes')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst();

  if (existingCode) {
    const response: StartResponse = {
      alreadyRedeemed: true,
      code: existingCode.code,
    };
    return json(response);
  }

  const sessionId = crypto.randomUUID();
  const startedAt = Date.now();

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      email,
      game,
      started_at: startedAt,
      redeemed_at: null,
      completion_time_ms: null,
      score: null,
    })
    .execute();

  const response: StartResponse = { sessionId };
  return json(response);
}
