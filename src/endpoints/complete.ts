import { getDb } from '../db/index';
import {
  fulfillReward,
  isRewardSystemConfigured,
  RewardEmailDeliveryError,
} from '../services/rewards';
import { getDiscountOfferText } from '../services/discount';
import type { CompleteRequest, CompleteResponse, GameType } from '../types/api';
import { validateEmail } from '../utils/emailValidation';
import { error, json } from '../utils/http';

function normalizeGame(game: CompleteRequest['game']): GameType {
  if (game === 'chess') return 'chess';
  if (game === 'solitaire') return 'solitaire';
  if (game === 'game2048') return 'game2048';
  return 'puzzle';
}

export async function redeemSession(
  body: CompleteRequest
): Promise<Response> {
  const offerText = getDiscountOfferText();
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

  if (!isRewardSystemConfigured() && !existingCode) {
    return error('Reward system is not configured', 503);
  }

  const now = Date.now();
  await db
    .updateTable('sessions')
    .set({
      game: normalizeGame(body.game),
      redeemed_at: now,
      completion_time_ms: completionTimeMs,
      score: score ?? null,
    })
    .where('id', '=', sessionId)
    .execute();

  if (existingCode) {
    console.log(
      `[reward] code already exists for ${email} (session=${sessionId}, code=${existingCode.code}) — recording leaderboard entry`
    );
    return json({
      success: true,
      code: existingCode.code,
      offerText,
    } satisfies CompleteResponse);
  }

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

    return json({ success: true, code, offerText } satisfies CompleteResponse);
  } catch (err) {
    if (err instanceof RewardEmailDeliveryError) {
      await db
        .insertInto('codes')
        .values({
          email,
          code: err.code,
          shopify_customer_id: err.shopifyCustomerId,
          created_at: now,
        })
        .onConflict(oc => oc.column('email').doNothing())
        .execute();

      const msg = `${err.message} Your code is shown below.`;
      console.error(
        `[reward] email failed for ${email} (session=${sessionId}, code=${err.code}): ${err.message}`
      );
      return json({ error: msg, code: err.code, offerText }, 502);
    }

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
