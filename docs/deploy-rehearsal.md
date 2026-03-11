# Deploy Rehearsal

Run this once before moving the MVP to the server. The goal is to verify that the repository can be started from a clean state with production-like settings.

## 1. Prepare environment

- Copy `.env.example` to a dedicated rehearsal env file.
- Replace these values with non-default secrets:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `S3_ACCESS_KEY`
  - `S3_SECRET_KEY`
  - `GEMINI_API_KEY`
- Set production-like routing values:
  - `NODE_ENV=production`
  - `TRUST_PROXY=true` if the app will sit behind Nginx or another reverse proxy
  - `WEB_ORIGIN=https://your-staging-domain.example`
  - `AUTH_PUBLIC_URL=https://your-staging-domain.example`
- Keep `billingEnabled=false` in admin config if Robokassa is not connected yet.

## 2. Boot infrastructure

- Start PostgreSQL and object storage.
- Ensure API, web and worker use the same database and S3-compatible bucket.
- Confirm the worker can reach Gemini and the object storage from the same network as the API.

## 3. Fresh deployment commands

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @superava/api db:deploy
pnpm --filter @superava/api db:seed
pnpm --filter @superava/api db:generate
pnpm build
```

Then start the services separately:

```bash
pnpm --filter @superava/api start
pnpm --filter @superava/web start
pnpm --filter @superava/worker start
```

Run them under your process manager or containers on the server, but the rehearsal should still prove that all three services start independently from the built artifacts.

## 4. Smoke test checklist

### Platform checks

- `GET /health` returns `200`.
- `GET /ready` returns `200`.
- `GET /ready` fails if the generation worker heartbeat is missing or stale.
- API starts with `helmet`, trusted proxy support and valid CORS allowlist.
- Worker starts without storage or database errors.

### Auth checks

- Register a new user.
- Login and logout.
- Password reset request returns `ok`.
- Email verification link generation works.
- Admin login still works.
- Block a user from admin and confirm login is denied.

### Generation checks

- Upload at least one profile shot.
- Create a text generation.
- Create a template generation.
- Create a reference-photo generation.
- Confirm `queued -> processing -> finalizing -> completed` in the UI.
- Confirm generated assets are readable from storage.

### Billing checks

- User balance endpoint returns the wallet summary.
- Generation creation reserves funds when billing is enabled.
- Successful worker completion captures the reservation.
- Failed generation releases the reservation.
- `insufficient_balance` is returned when balance is too low.

### Admin checks

- Categories page loads.
- Templates page loads and edits persist.
- Prompt constructor page loads and pricing config persists.
- User role/status management still works.

## 5. Failure drills

- Stop the worker and verify that API still accepts requests but generations stop progressing.
- Restart the worker and confirm queued jobs continue.
- Intentionally break storage credentials and confirm `/ready` fails with `503`.
- Intentionally set a short `SESSION_SECRET` in production mode and confirm startup fails.

## 6. Exit criteria

You are ready to move to the server when:

- migrations apply cleanly from scratch
- API, web and worker start independently
- `/health` and `/ready` behave as expected
- auth and generation smoke tests pass
- storage access is stable
- billing reserve/capture/release works without manual fixes
