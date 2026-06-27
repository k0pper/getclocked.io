import { getRequestListener } from '@hono/node-server';
import { app } from '@getclocked/server/app';

/**
 * Vercel Node serverless entry. A single function at `/api` serves every
 * `/api/*` path; Hono (basePath `/api`) routes internally. `getRequestListener`
 * adapts Hono's web-standard `fetch` to Node's (req, res) signature, which is
 * exactly what a Vercel Node function receives. Node runtime (not Edge) is
 * required — password hashing uses `node:crypto`'s scrypt.
 *
 * Why a plain `index.ts` + a `/api/(.*)` rewrite (in `vercel.json`) instead of a
 * `[[...route]]` catch-all file: Vercel's zero-config function detection deployed
 * the optional-catch-all as a *single-segment* matcher (`/api/:one`), so only
 * one-segment paths like `/api/leaderboard` reached the function while every
 * two-segment route (`/api/game/start`, `/api/auth/login`, …) 404'd at the edge
 * before any code ran. The explicit rewrite funnels all depths here; Vercel
 * preserves the original request URL in `req.url`, so Hono still routes by path.
 */
export default getRequestListener(app.fetch);
