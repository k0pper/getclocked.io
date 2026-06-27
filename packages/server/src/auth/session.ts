import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'gc_sess';
/** 30 days. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

/** The opaque token handed to the browser (kept only in the httpOnly cookie). */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** What we actually store — a hash, so the DB never holds a usable token. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
