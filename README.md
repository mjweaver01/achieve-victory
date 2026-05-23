# Madeon Promo Game

Standalone promo web app: email capture → mini-games → personalized Shopify discount code.

## Stack

- Bun + React (HTML import bundling)
- SQLite (local) or PostgreSQL (Railway via `DATABASE_URL`) + Kysely
- Shopify Admin REST API
- Railway (planned)

## Local dev

```bash
bun install
cp .env.example .env
# Optional locally: leave SHOPIFY_* empty — dev auto-uses mock codes (printed in terminal)
bun run dev
```

Open http://localhost:3847

## Static assets

Put images and fonts in `public/` (see `public/README.md`). They are served at the site root, e.g. `public/images/logo.svg` → `/images/logo.svg`.

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/start` | POST | `{ email }` → `{ sessionId }` |
| `/api/complete` | POST | `{ sessionId, email, completionTimeMs }` |
| `/api/leaderboard` | GET | Public anonymized leaderboard |
| `/api/admin` | GET | `?key=` or `x-admin-secret` header |
| `/api/dev/complete` | POST | Non-production only. Same body as `/api/complete`; `?key=` or `x-admin-secret` |

### Dev: skip a game (local)

1. Set `ADMIN_SECRET` in `.env` and restart `bun dev`.
2. Visit `http://localhost:3847/solve?key=YOUR_ADMIN_SECRET` once (stores the key for **Dev: skip to code** on puzzle/chess).
3. Or call the API directly:

```bash
curl -X POST http://localhost:3847/api/dev/complete \
  -H 'Content-Type: application/json' \
  -H 'x-admin-secret: YOUR_ADMIN_SECRET' \
  -d '{"sessionId":"...","email":"you@example.com","completionTimeMs":5000}'
```

## Status

Phase 1 (backend skeleton + routes + DB) and initial frontend are in place. Next: album art puzzle assets, Railway deploy, client answers on open questions in the plan.

## Railway database

Attach a **PostgreSQL** plugin — Railway injects `DATABASE_URL` and the app uses Postgres automatically (migrations run on boot). No volume required.

For local dev, leave `DATABASE_URL` unset; SQLite is used at `DATABASE_PATH` (default `./data/madeon.db`).
