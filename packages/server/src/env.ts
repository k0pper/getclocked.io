/**
 * Environment access — read lazily, never at import time, so importing the Hono
 * app (e.g. during a build, or in a route that doesn't touch the DB) never
 * throws on a missing variable. Handlers that need a value call these.
 */

export interface Env {
  DATABASE_URL: string;
  GAME_TOKEN_SECRET: string;
  APP_ORIGIN: string | undefined;
}

/** Throws (→ 503 via the app's error handler) if the backend isn't configured. */
export function requireEnv(): Env {
  const DATABASE_URL = process.env.DATABASE_URL;
  const GAME_TOKEN_SECRET = process.env.GAME_TOKEN_SECRET;
  if (!DATABASE_URL) throw new ConfigError('DATABASE_URL is not set');
  if (!GAME_TOKEN_SECRET) throw new ConfigError('GAME_TOKEN_SECRET is not set');
  return { DATABASE_URL, GAME_TOKEN_SECRET, APP_ORIGIN: process.env.APP_ORIGIN };
}

/** Only the token secret — for endpoints (e.g. /game/start) that don't hit the DB. */
export function requireTokenSecret(): string {
  const secret = process.env.GAME_TOKEN_SECRET;
  if (!secret) throw new ConfigError('GAME_TOKEN_SECRET is not set');
  return secret;
}

export function isProd(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

/** Distinguishes "backend not configured" (503) from a real 500. */
export class ConfigError extends Error {}
