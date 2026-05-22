import indexPageHtml from './frontend/index.html';
import { postStart } from './endpoints/start';
import { postComplete } from './endpoints/complete';
import { postDevComplete } from './endpoints/devComplete';
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

    '/api/start': { POST: withRateLimit(postStart) },
    '/api/complete': { POST: withRateLimit(postComplete) },
    '/api/dev/complete': { POST: postDevComplete },
    '/api/leaderboard': { GET: getLeaderboard },
    '/api/admin': { GET: getAdmin },
  },
  development: !isProduction,
});

console.log(`Listening at http://${server.hostname}:${server.port}`);
