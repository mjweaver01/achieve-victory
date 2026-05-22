import { getDb } from '../db/index';
import {
  findOrCreateCustomer,
  isShopifyConfigured,
  mintDiscountCode,
} from '../services/shopify';
import { isResendConfigured, sendDiscountEmail } from '../services/resend';
import type { CompleteRequest, CompleteResponse } from '../types/api';
import { validateEmail } from '../utils/emailValidation';
import { error, json } from '../utils/http';

export async function postComplete(req: Request): Promise<Response> {
  let body: CompleteRequest;
  try {
    body = (await req.json()) as CompleteRequest;
  } catch {
    return error('Invalid JSON body', 400);
  }

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
    return json({ success: true } satisfies CompleteResponse);
  }

  if (!isShopifyConfigured() || !isResendConfigured()) {
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

  const { customerId } = await findOrCreateCustomer(email);
  const code = await mintDiscountCode(customerId);

  await db
    .insertInto('codes')
    .values({
      email,
      code,
      shopify_customer_id: customerId,
      created_at: now,
    })
    .execute();

  await sendDiscountEmail(email, code);

  return json({ success: true } satisfies CompleteResponse);
}
