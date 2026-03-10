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
4. Run `pnpm dev`.

## Current status

- Product landing pages and feature scaffolding are in place.
- API returns demo profile, template, and generation data.
- Worker logs prepared Gemini payloads and is ready for queue integration.
- Database, object storage, auth, and real image processing are next.
