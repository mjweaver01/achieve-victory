import type { CompleteRequest } from '../types/api';
import { error } from '../utils/http';
import { redeemSession } from './complete';

/** Non-production: redeem without playing. */
export async function postDevComplete(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return error('Not found', 404);
  }

  let body: CompleteRequest;
  try {
    body = (await req.json()) as CompleteRequest;
  } catch {
    return error('Invalid JSON body', 400);
  }

  return redeemSession(body, { skipTimingValidation: true });
}
