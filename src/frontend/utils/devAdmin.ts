const ADMIN_KEY_STORAGE = 'madeon_admin_key';

export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function getDevAdminSecret(): string | null {
  if (!isLocalDevHost()) return null;
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

export function storeDevAdminSecret(secret: string): void {
  if (!isLocalDevHost()) return;
  sessionStorage.setItem(ADMIN_KEY_STORAGE, secret);
}
