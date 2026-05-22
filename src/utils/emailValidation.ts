import domains from 'disposable-email-domains';
import { getDb } from '../db/index';

const disposableSet = new Set(domains as string[]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; reason: string };

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function hasPlusAddress(email: string): boolean {
  const local = email.split('@')[0] ?? '';
  return local.includes('+');
}

export function isDisposableDomain(email: string): boolean {
  const domain = email.split('@')[1];
  if (!domain) return true;
  return disposableSet.has(domain);
}

export async function validateEmail(
  raw: string
): Promise<EmailValidationResult> {
  const email = normalizeEmail(raw);

  if (!validateEmailFormat(email)) {
    return { ok: false, reason: 'invalid_format' };
  }
  if (hasPlusAddress(email)) {
    return { ok: false, reason: 'plus_address' };
  }
  if (isDisposableDomain(email)) {
    return { ok: false, reason: 'disposable_domain' };
  }

  return { ok: true, email };
}

export async function recordBlockedAttempt(
  email: string,
  reason: string
): Promise<void> {
  await getDb()
    .insertInto('blocked_attempts')
    .values({
      id: crypto.randomUUID(),
      email,
      reason,
      attempted_at: Date.now(),
    })
    .execute();
}
