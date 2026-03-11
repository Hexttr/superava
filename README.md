# Superava

Mobile-first photo generation MVP built around a reusable face profile, asynchronous jobs, and a backend that can later power web, native apps, and bots.

## Workspace

- `apps/web` - Next.js client
- `apps/api` - Fastify API
- `apps/worker` - background worker placeholder
- `packages/shared` - shared domain types and demo data
- `packages/ai-provider` - Gemini provider abstraction
- `packages/ui` - shared UI primitives
- `infra/docker` - local PostgreSQL and MinIO stack

## Local start

1. Copy `.env.example` to `.env`.
2. Start infra with `docker compose -f infra/docker/docker-compose.yml up -d`.
3. Install dependencies with `pnpm install`.
4. Apply API migrations with `pnpm --filter @superava/api db:deploy`.
5. Seed local data with `pnpm --filter @superava/api db:seed`.
6. Run `pnpm dev`.

Optional for production auth email delivery:
- `AUTH_PUBLIC_URL` - public web URL used in verification/reset links
- `RESEND_API_KEY` and `MAIL_FROM` - enable real email delivery through Resend
- `TRUST_PROXY=true` - trust reverse proxy headers in production
- `WEB_ORIGIN` - may be a comma-separated allowlist in production
- `READINESS_CHECK_WORKER=true` - fail readiness if generation worker heartbeat is stale

If your local database was created before Prisma migrations were added, reset it once so it can be recreated from the migration history and seed data.

Recommended local recovery flow for an older dev database:
1. `pnpm --filter @superava/api exec prisma migrate reset`
2. `pnpm --filter @superava/api db:seed`
3. `pnpm dev`

## Current status

- Product landing pages and feature scaffolding are in place.
- API, database, and object storage are wired into the MVP.
- Cookie-session auth with `USER` / `ADMIN` roles is in progress for production hardening.
- Password reset, email verification links, and admin user controls are available in the auth layer.
- Worker executes generation jobs through pg-boss and persists outputs to object storage.
- Billing foundation is present: wallet, ledger, generation reservation/capture/release, admin pricing controls.

## Server Migration

- Pre-migration rehearsal checklist: [docs/deploy-rehearsal.md](docs/deploy-rehearsal.md)
- Post-deploy integrations roadmap: [docs/post-deploy-integrations.md](docs/post-deploy-integrations.md)

Before moving to the server, make sure:

1. `pnpm --filter @superava/api db:deploy` works from a clean database.
2. `GET /health` and `GET /ready` both pass in a production-like environment.
3. API, web, and worker can be started independently.
4. Object storage credentials are not left on the local defaults.
5. `SESSION_SECRET` is replaced with a long random value.

Recommended rollout order:

1. Deploy the current MVP with auth, worker, storage and billing foundation.
2. Validate the real production domain, HTTPS, email links and readiness checks.
3. Connect Robokassa.
4. Connect social auth.
5. Finish final UX polish for payment and OAuth flows.
