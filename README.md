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

If your local database was created before Prisma migrations were added, reset it once so it can be recreated from the migration history and seed data.

Recommended local recovery flow for an older dev database:
1. `pnpm --filter @superava/api exec prisma migrate reset`
2. `pnpm --filter @superava/api db:seed`
3. `pnpm dev`

## Current status

- Product landing pages and feature scaffolding are in place.
- API, database, and object storage are wired into the MVP.
- Cookie-session auth with `USER` / `ADMIN` roles is in progress for production hardening.
- Worker logs prepared Gemini payloads and is ready for queue integration.
