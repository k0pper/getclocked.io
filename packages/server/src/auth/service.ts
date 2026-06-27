import { randomUUID } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { sessions, users } from '../db/schema.js';
import { hashPassword, verifyPassword } from './password.js';
import { hashSessionToken, newSessionToken, SESSION_TTL_MS } from './session.js';

export interface AuthUser {
  id: string;
  username: string;
}

export type SignupResult =
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; status: number; error: string };

export type LoginResult = SignupResult;

/** Create an account and an initial session. Username uniqueness is enforced on
 *  the lowercased key by a unique index — we surface its violation as 409. */
export async function signup(
  db: Database,
  username: string,
  key: string,
  password: string,
): Promise<SignupResult> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.usernameKey, key))
    .limit(1);
  if (existing.length > 0) {
    return { ok: false, status: 409, error: 'That nickname is taken.' };
  }

  const id = randomUUID();
  const passwordHash = hashPassword(password);
  try {
    await db.insert(users).values({ id, username, usernameKey: key, passwordHash });
  } catch {
    // Lost a race on the unique index.
    return { ok: false, status: 409, error: 'That nickname is taken.' };
  }

  const token = await createSession(db, id);
  return { ok: true, user: { id, username }, token };
}

export async function login(
  db: Database,
  key: string,
  password: string,
): Promise<LoginResult> {
  const rows = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.usernameKey, key))
    .limit(1);
  const row = rows[0];
  // Verify even when the user is missing? Not worth the complexity here; the
  // timing difference doesn't leak useful info for a game leaderboard.
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return { ok: false, status: 401, error: 'Wrong nickname or password.' };
  }
  const token = await createSession(db, row.id);
  return { ok: true, user: { id: row.id, username: row.username }, token };
}

export async function createSession(db: Database, userId: string): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: randomUUID(),
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt,
  });
  return token;
}

export async function destroySession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
}

/** Resolve the live session's user, or null if missing/expired. */
export async function getSessionUser(db: Database, token: string): Promise<AuthUser | null> {
  const rows = await db
    .select({ id: users.id, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}
