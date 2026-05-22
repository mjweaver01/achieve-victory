import { getDb } from '../db/index';
import {
  isRewardSystemConfigured,
  resendRewardEmail,
} from '../services/rewards';
import type { ResendCodeRequest, ResendCodeResponse } from '../types/api';
import { validateEmail } from '../utils/emailValidation';
import { error, json } from '../utils/http';

export async function postResend(req: Request): Promise<Response> {
  let body: ResendCodeRequest;
  try {
    body = (await req.json()) as ResendCodeRequest;
  } catch {
    return error('Invalid JSON body', 400);
  }

  const { sessionId } = body;
  if (!sessionId || !body.email) {
    return error('sessionId and email are required', 400);
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
  if (session.redeemed_at == null) {
    return error('Complete the game before requesting your code', 400);
  }

  const existingCode = await db
    .selectFrom('codes')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst();

  if (!existingCode) {
    return error('No code found for this email', 404);
  }

  if (!isRewardSystemConfigured()) {
    return error('Reward system is not configured', 503);
  }

  try {
    const { mock } = await resendRewardEmail(email, existingCode.code);
    return json({ success: true, mock } satisfies ResendCodeResponse);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Could not send email';
    return error(msg, 502);
  }
}
