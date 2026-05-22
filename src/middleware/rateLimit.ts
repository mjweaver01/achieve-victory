type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}

export function rateLimitApi(req: Request): Response | null {
  if (!isProduction()) return null;

  const ip = clientIp(req);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxRequests = 3;

  let bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(ip, bucket);
  }

  bucket.count += 1;

  if (bucket.count > maxRequests) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Try again later.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}
