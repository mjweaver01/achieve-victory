import { getDb } from '../db/index';
import {
  fulfillReward,
  isRewardSystemConfigured,
} from '../services/rewards';
import type { CompleteRequest, CompleteResponse } from '../types/api';
import { validateEmail } from '../utils/emailValidation';
import { error, json } from '../utils/http';

export async function redeemSession(
  body: CompleteRequest
): Promise<Response> {
  const { sessionId, completionTimeMs, score } = body;
  if (!sessionId || !body.email || completionTimeMs == null) {
    return error('sessionId, email, and completionTimeMs are required', 400);
  }

  const validation = await validateEmail(body.email);
  if (!validation.ok) {
    return error('Email is not allowed', 400);
  }

  const email = validation.email;
  const db = getDb();
  const session = await db
    .selectFrom('sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    return error('Session not found', 404);
  }
  if (session.email !== email) {
    return error('Email does not match session', 403);
  }
  if (session.redeemed_at != null) {
    return error('Session already redeemed', 409);
  }

  const existingCode = await db
    .selectFrom('codes')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst();

  if (existingCode) {
    console.log(
      `[reward] code already exists for ${email} (session=${sessionId}, code=${existingCode.code})`
    );
    return json({ success: true } satisfies CompleteResponse);
  }

  if (!isRewardSystemConfigured()) {
    return error('Reward system is not configured', 503);
  }

  const now = Date.now();
  await db
    .updateTable('sessions')
    .set({
      redeemed_at: now,
      completion_time_ms: completionTimeMs,
      score: score ?? null,
    })
    .where('id', '=', sessionId)
    .execute();

  try {
    const { code, shopifyCustomerId } = await fulfillReward(email);

    await db
      .insertInto('codes')
      .values({
        email,
        code,
        shopify_customer_id: shopifyCustomerId,
        created_at: now,
      })
      .execute();

    console.log(
      `[reward] code created for ${email} (session=${sessionId}, code=${code}, timeMs=${completionTimeMs})`
    );

    return json({ success: true } satisfies CompleteResponse);
  } catch (err) {
    await db
      .updateTable('sessions')
      .set({
        redeemed_at: null,
        completion_time_ms: null,
        score: null,
      })
      .where('id', '=', sessionId)
      .execute();

    const msg =
      err instanceof Error ? err.message : 'Could not send reward email';
    console.error(
      `[reward] failed for ${email} (session=${sessionId}): ${msg}`
    );
    return error(msg, 502);
  }
}

export async function postComplete(req: Request): Promise<Response> {
  let body: CompleteRequest;
  try {
    body = (await req.json()) as CompleteRequest;
  } catch {
    return error('Invalid JSON body', 400);
  }

  return redeemSession(body);
}
