export function isAdminAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;

  const url = new URL(req.url);
  const provided = (
    url.searchParams.get('key') ?? req.headers.get('x-admin-secret')
  )?.trim();

  return provided === secret;
}
