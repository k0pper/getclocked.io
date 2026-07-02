// Local dev server for the API — serves the same Hono app the Vercel function
// runs, so `pnpm dev` gets working auth + leaderboard without `vercel dev`.
// Requires the server bundle (`pnpm --filter @getclocked/server build`); the
// root `dev` script builds it first. Vite proxies `/api` here (vite.config.ts).

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Node doesn't auto-load .env files — same pattern as packages/server/scripts/migrate.mjs.
for (const name of ['.env.local', '.env']) {
  const file = join(repoRoot, name);
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* ignore a malformed/locked env file */
    }
  }
}

const { serve } = await import('@hono/node-server');
const { app } = await import('@getclocked/server/app');

const port = Number(process.env.API_PORT) || 8787;
serve({ fetch: app.fetch, port }, () => {
  const configured = process.env.DATABASE_URL && process.env.GAME_TOKEN_SECRET;
  console.log(
    `[api] listening on http://localhost:${port}` +
      (configured ? '' : ' — DATABASE_URL/GAME_TOKEN_SECRET missing, API will 503 (offline mode)'),
  );
});
