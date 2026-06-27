import { getRequestListener } from '@hono/node-server';
import { app } from '@getclocked/server/app';

/**
 * Vercel Node serverless entry. One optional catch-all function serves every
 * `/api/*` path; Hono (basePath `/api`) routes internally. `getRequestListener`
 * adapts Hono's web-standard `fetch` to Node's (req, res) signature, which is
 * exactly what a Vercel Node function receives. Node runtime (not Edge) is
 * required — password hashing uses `node:crypto`'s scrypt.
 */
export default getRequestListener(app.fetch);
