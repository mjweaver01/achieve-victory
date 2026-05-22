import { existsSync, statSync } from 'fs';
import path from 'path';
import indexPageHtml from './frontend/index.html';
import { postStart } from './endpoints/start';
import { postComplete } from './endpoints/complete';
import { postDevComplete } from './endpoints/devComplete';
import { postResend } from './endpoints/resend';
import { getLeaderboard } from './endpoints/leaderboard';
import { getAdmin } from './endpoints/admin';
import { initDb } from './db/index';
import { rateLimitApi } from './middleware/rateLimit';

const isProduction = process.env.NODE_ENV === 'production';

console.log(
  `🎵 Madeon promo game — ${process.env.NODE_ENV ?? 'development'} mode`
);

await initDb();

function withRateLimit(
  handler: (req: Request) => Promise<Response> | Response
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const limited = rateLimitApi(req);
    if (limited) return limited;
    return handler(req);
  };
}

function servePublicFile(pathname: string): Response | undefined {
  const publicRoot = path.join(import.meta.dir, '..', 'public');
  const publicPath = path.join(publicRoot, pathname);

  if (
    !publicPath.startsWith(publicRoot) ||
    !existsSync(publicPath) ||
    !statSync(publicPath).isFile()
  ) {
    return undefined;
  }

  const file = Bun.file(publicPath);
  const ext = publicPath.split('.').pop()?.toLowerCase();
  const contentTypeMap: Record<string, string> = {
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    css: 'text/css',
    ico: 'image/x-icon',
    woff2: 'font/woff2',
    woff: 'font/woff',
  };
  const contentType =
    contentTypeMap[ext ?? ''] ?? 'application/octet-stream';
  const headers: Record<string, string> = { 'Content-Type': contentType };

  if (
    ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'css', 'woff2', 'woff'].includes(
      ext ?? ''
    )
  ) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }

  return new Response(file, { headers });
}

const server = Bun.serve({
  port: process.env.PORT ?? 3847,
  hostname:
    process.env.HOSTNAME ?? (isProduction ? '0.0.0.0' : 'localhost'),
  routes: {
    '/': indexPageHtml,
    '/play': indexPageHtml,
    '/play/puzzle': indexPageHtml,
    '/play/chess': indexPageHtml,
    '/leaderboard': indexPageHtml,
    '/admin': indexPageHtml,

    '/api/start': {
      POST: isProduction ? withRateLimit(postStart) : postStart,
    },
    '/api/complete': {
      POST: isProduction ? withRateLimit(postComplete) : postComplete,
    },
    '/api/resend': {
      POST: isProduction ? withRateLimit(postResend) : postResend,
    },
    '/api/dev/complete': { POST: postDevComplete },
    '/api/leaderboard': { GET: getLeaderboard },
    '/api/admin': { GET: getAdmin },

    '/images/*': (req) => {
      const file = servePublicFile(new URL(req.url).pathname);
      return file ?? new Response('Not Found', { status: 404 });
    },
    '/fonts/*': (req) => {
      const file = servePublicFile(new URL(req.url).pathname);
      return file ?? new Response('Not Found', { status: 404 });
    },
  },
  ...(isProduction
    ? {}
    : {
        development: {
          hmr: true,
        },
      }),
} as Parameters<typeof Bun.serve>[0]);

console.log(`Listening at http://${server.hostname}:${server.port}`);
