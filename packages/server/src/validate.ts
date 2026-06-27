import { DEFAULT_DURATION_CONFIG } from '@getclocked/game-core';

/** Nickname rules: letters and digits only, 3–10 chars. Enforced here (server),
 *  in the client form, and by a DB CHECK constraint. */
export const USERNAME_RE = /^[A-Za-z0-9]{3,10}$/;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 200;

/** Rounds per game — sourced from game-core so the two never drift. */
export const ROUNDS = DEFAULT_DURATION_CONFIG.rounds;

/** A reproduction is capped at 12s in the client; reject anything implausible. */
export const MIN_GUESS_MS = 1;
export const MAX_GUESS_MS = 12_000;

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateUsername(input: unknown): Validated<{ username: string; key: string }> {
  if (typeof input !== 'string') return { ok: false, error: 'Username is required.' };
  const username = input.trim();
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: '3–10 characters, letters and numbers only.' };
  }
  return { ok: true, value: { username, key: username.toLowerCase() } };
}

export function validatePassword(input: unknown): Validated<string> {
  if (typeof input !== 'string') return { ok: false, error: 'Password is required.' };
  if (input.length < PASSWORD_MIN) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN} characters.` };
  }
  if (input.length > PASSWORD_MAX) {
    return { ok: false, error: 'Password is too long.' };
  }
  return { ok: true, value: input };
}

/** Validate a submitted set of per-round reproductions (one integer ms each). */
export function validateGuesses(input: unknown): Validated<number[]> {
  if (!Array.isArray(input) || input.length !== ROUNDS) {
    return { ok: false, error: `Expected ${ROUNDS} guesses.` };
  }
  const out: number[] = [];
  for (const x of input) {
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      return { ok: false, error: 'Invalid guess value.' };
    }
    const v = Math.round(x);
    if (v < MIN_GUESS_MS || v > MAX_GUESS_MS) {
      return { ok: false, error: 'Guess out of range.' };
    }
    out.push(v);
  }
  return { ok: true, value: out };
}
