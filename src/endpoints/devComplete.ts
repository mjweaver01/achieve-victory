import type { CompleteRequest } from '../types/api';
import { isAdminAuthorized } from '../utils/adminAuth';
import { error } from '../utils/http';
import { redeemSession } from './complete';

/** Non-production: redeem without playing (requires admin secret). */
export async function postDevComplete(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return error('Not found', 404);
  }

  if (!isAdminAuthorized(req)) {
    return error('Unauthorized', 401);
  }

  let body: CompleteRequest;
  try {
    body = (await req.json()) as CompleteRequest;
  } catch {
    return error('Invalid JSON body', 400);
  }

  return redeemSession(body);
}
