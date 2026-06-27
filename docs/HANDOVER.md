# Handover — getclocked.io (leaderboard + deploy)

A working brief for the next session. Read [CLAUDE.md](../CLAUDE.md) first for the
core architecture, then this for the leaderboard feature and the deployment
hard-won knowledge.

## Where things stand

- **Game**: complete and polished (single-player). Title screen (broken-neon
  wordmark easter egg, socials, multiplayer teaser), countdown pre-roll, reveal
  with EARLY–PERFECT–LATE scale, CRT scanlines, 3D buttons, auto-advance.
- **Leaderboard backend**: built and **deployed on Vercel**, DB migrated on Neon.
  `GET /api/leaderboard` returns 200 ("No scores yet"). Accounts + ranked submit
  implemented and wired into the UI.
- **Open issue (likely config, not code)**: finishing a game shows "can't be
  saved" → the run had no token → `POST /api/game/start` failed at game start.
  Almost certainly `APP_ORIGIN` is set to a value that doesn't exactly match the
  deployed origin, so the server's origin guard 403s every POST. **Fix: remove
  `APP_ORIGIN` (or set it to the exact origin, scheme+host, no trailing slash)
  and redeploy.** Confirm via the browser Network tab: tap "Tap in", look at the
  `/api/game/start` request — a 403 confirms it.

## Architecture of the leaderboard

The one idea: **the server never trusts a score.** It hands out the seed and
re-runs the pure `@getclocked/game-core` over the player's submitted guesses to
compute the score itself.

Flow:
1. `POST /api/game/start` (anonymous, no DB) → server picks a `seed`, signs a
   single-use token `{nonce, seed, exp}` (HMAC, `GAME_TOKEN_SECRET`), returns
   both. The client plays with that seed. If this call fails, the client falls
   back to a local seed and the run is **unranked** (can't be saved).
2. Player finishes. Saving is **always explicit** — even when signed in you must
   press "Save as <name>" (shared-machine safety). Signed-out players get a
   sign-in/up form first.
3. `POST /api/game/submit` (auth required) → verify token, re-score via
   game-core, insert the nonce (PK collision = replay → 409), persist, return
   rank. The score in the DB is the server's number, never the client's.

Auth is custom (no Better Auth): username+password, scrypt via `node:crypto`,
httpOnly DB-backed sessions. Username rule `^[A-Za-z0-9]{3,10}$`,
case-insensitive unique.

## Repo layout (leaderboard parts)

| Path | What |
| --- | --- |
| `packages/server/src/` | Hono app, auth, game services, DB schema (Drizzle), pure units (password/token/validate/scoring) |
| `packages/server/drizzle/0000_init.sql` | Hand-authored schema; idempotent |
| `packages/server/scripts/migrate.mjs` | Dependency-light migration runner (loads `.env.local`) |
| `api/[[...route]].ts` | Vercel Node function — adapts Hono via `getRequestListener` |
| `apps/web/src/lib/api.ts` | Client API (graceful when backend absent) |
| `apps/web/src/hooks/useAuth.tsx` | Auth context |
| `apps/web/src/components/AuthForm.tsx` | Sign in/up form |
| `apps/web/src/screens/LeaderboardScreen.tsx` | Leaderboard view |
| `apps/web/src/screens/ResultsScreen.tsx` | `SaveCard` save flow |

## Deployment (Vercel + Neon) — and the landmines

**One Vercel project, repo root as Root Directory** (NOT `apps/web`). `vercel.json`
at the root drives everything; `/api` is the serverless function.

`vercel.json`:
- `buildCommand`: `pnpm --filter @getclocked/server build && pnpm build`
  (the server bundle must exist before the function is traced).
- `installCommand`: `pnpm install --frozen-lockfile; pnpm rebuild esbuild @tailwindcss/oxide`
- `rewrites`: SPA fallback scoped away from `/api` via `/((?!api/).*)`.

**Landmines already solved (do not regress):**
1. **pnpm build-script gate.** Vercel's pnpm refuses to run `esbuild`'s
   native-binary build (`ERR_PNPM_IGNORED_BUILDS`). `onlyBuiltDependencies` in
   `pnpm-workspace.yaml` is not honoured there. Fix = the explicit
   `pnpm rebuild esbuild @tailwindcss/oxide` in `installCommand`.
2. **`.js` extensions.** Vercel compiles the function with `moduleResolution:
   nodenext`, which requires explicit `.js` on relative imports. All of
   `game-core` and `server` source uses `.js` specifiers (resolve to `.ts` under
   bundler/nodenext/Vite alike). Keep it.
3. **Workspace deps aren't bundled at runtime.** Vercel externalizes
   `@getclocked/server`, and its export pointed at `.ts` → `ERR_MODULE_NOT_FOUND`.
   Fix = esbuild bundles `src/app.ts` → `dist/app.js` (self-contained); the
   `./app` export is conditional: `types`→src, `default`→`dist/app.js`. The
   `build` script + the buildCommand produce it.
4. **`api/tsconfig.json` is self-contained** (no `extends`): Vercel's function
   compiler reads it but doesn't resolve `extends`, silently dropping `strict`
   and bundler resolution. Keep it inlined and in sync with `tsconfig.base.json`.

**Neon env vars** (Vercel integration sets the first two):
- `DATABASE_URL` (pooled, runtime), `DATABASE_URL_UNPOOLED` (DDL/migrations)
- `GAME_TOKEN_SECRET` (`openssl rand -base64 32`)
- `APP_ORIGIN` (optional; **see open issue** — wrong value 403s all POSTs)

Env changes require a **redeploy** to take effect.

**Migration**: `vercel env pull .env.local` then
`pnpm --filter @getclocked/server db:migrate` (or paste `0000_init.sql` into the
Neon SQL editor). Already run once; tables exist.

**Local dev caveat**: `pnpm dev` is Vite only — no `/api`. The app runs in
unranked/offline mode locally. Use `vercel dev` (with env) or a Preview deploy to
exercise auth + leaderboard.

## Gate & commands

- `pnpm check` (typecheck ×5, lint, tests: game-core 43, server 29, web 3) — must stay green.
- `pnpm --filter @getclocked/server build` — produces the function bundle.
- Server logic (password/token/validate/re-scoring) is unit-tested; DB-touching
  code is typechecked but not integration-tested (no test DB yet).

## Possible next steps

- Verify/fix the `APP_ORIGIN` save issue (above).
- Integration tests against a Neon branch in CI; GitHub Action for migrations.
- `vercel dev` documented for local full-stack runs.
- Multiplayer (needs a persistent WebSocket service — Vercel functions won't host
  long-lived sockets; see `.agents/skills/web-realtime-socket-io`).
