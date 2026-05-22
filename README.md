# Madeon Promo Game

Standalone promo web app: email capture → sliding puzzle → personalized Shopify discount via Resend.

Full build plan: `~/Websites/digi-twin/Projects/Madeon - Promo Game/Plan.md`

## Stack

- Bun + React (HTML import bundling)
- SQLite (local) or PostgreSQL (Railway via `DATABASE_URL`) + Kysely
- Shopify Admin REST API
- Resend email
- Railway (planned)

## Local dev

```bash
bun install
cp .env.example .env
# Add SHOPIFY_* and RESEND_* when testing end-to-end redemption
bun run dev
```

Open http://localhost:3847

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/start` | POST | `{ email }` → `{ sessionId }` |
| `/api/complete` | POST | `{ sessionId, email, completionTimeMs }` |
| `/api/leaderboard` | GET | Public anonymized leaderboard |
| `/api/admin` | GET | `?key=` or `x-admin-secret` header |

## Status

Phase 1 (backend skeleton + routes + DB) and initial frontend are in place. Next: album art puzzle assets, React Email template, Railway deploy, client answers on open questions in the plan.

## Railway database

Attach a **PostgreSQL** plugin — Railway injects `DATABASE_URL` and the app uses Postgres automatically (migrations run on boot). No volume required.

For local dev, leave `DATABASE_URL` unset; SQLite is used at `DATABASE_PATH` (default `./data/madeon.db`).
