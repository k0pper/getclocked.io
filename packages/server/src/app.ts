import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { ConfigError, isProd, requireTokenSecret } from './env';
import { getDb } from './db/client';
import {
  destroySession,
  getSessionUser,
  login,
  signup,
  type AuthUser,
} from './auth/service';
import { SESSION_COOKIE, SESSION_TTL_MS } from './auth/session';
import { leaderboard, startGame, submitScore } from './game/service';
import { validateGuesses, validatePassword, validateUsername } from './validate';

type Env = { Variables: { user: AuthUser } };

export const app = new Hono<Env>().basePath('/api');

/* ── Helpers ──────────────────────────────────────────────────────────────── */

async function readBody(c: Context): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

async function currentUser(c: Context): Promise<AuthUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  return getSessionUser(getDb(), token);
}

const requireAuth = createMiddleware<Env>(async (c, next) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Sign in to continue.' }, 401);
  c.set('user', user);
  await next();
});

/* ── Same-origin guard (defense in depth; SameSite cookies do the real work) ── */

app.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const allowed = process.env.APP_ORIGIN;
    const origin = c.req.header('origin');
    if (allowed && origin && origin !== allowed) {
      return c.json({ error: 'Bad origin.' }, 403);
    }
  }
  await next();
});

/* ── Auth ─────────────────────────────────────────────────────────────────── */

app.post('/auth/signup', async (c) => {
  const body = await readBody(c);
  const u = validateUsername(body.username);
  if (!u.ok) return c.json({ error: u.error }, 400);
  const p = validatePassword(body.password);
  if (!p.ok) return c.json({ error: p.error }, 400);

  const result = await signup(getDb(), u.value.username, u.value.key, p.value);
  if (!result.ok) return c.json({ error: result.error }, result.status as 409);
  setSessionCookie(c, result.token);
  return c.json({ user: { username: result.user.username } });
});

app.post('/auth/login', async (c) => {
  const body = await readBody(c);
  const u = validateUsername(body.username);
  if (!u.ok) return c.json({ error: 'Wrong nickname or password.' }, 401);
  const p = validatePassword(body.password);
  if (!p.ok) return c.json({ error: 'Wrong nickname or password.' }, 401);

  const result = await login(getDb(), u.value.key, p.value);
  if (!result.ok) return c.json({ error: result.error }, result.status as 401);
  setSessionCookie(c, result.token);
  return c.json({ user: { username: result.user.username } });
});

app.post('/auth/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await destroySession(getDb(), token);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

app.get('/auth/me', async (c) => {
  const user = await currentUser(c);
  return c.json({ user: user ? { username: user.username } : null });
});

/* ── Game ─────────────────────────────────────────────────────────────────── */

// Anonymous-friendly: hands out a server seed so a run can start immediately.
app.post('/game/start', (c) => {
  const { seed, token } = startGame(requireTokenSecret());
  return c.json({ seed, token });
});

app.post('/game/submit', requireAuth, async (c) => {
  const body = await readBody(c);
  if (typeof body.token !== 'string') return c.json({ error: 'Missing game token.' }, 400);
  const guesses = validateGuesses(body.guesses);
  if (!guesses.ok) return c.json({ error: guesses.error }, 400);

  const result = await submitScore(
    getDb(),
    requireTokenSecret(),
    c.get('user').id,
    body.token,
    guesses.value,
  );
  if (!result.ok) return c.json({ error: result.error }, result.status as 400);
  return c.json({ points: result.points, rank: result.rank, best: result.best });
});

app.get('/leaderboard', async (c) => {
  const raw = Number(c.req.query('limit'));
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 100) : 20;
  const user = await currentUser(c);
  const board = await leaderboard(getDb(), limit, user?.id ?? null);
  return c.json(board);
});

/* ── Errors ───────────────────────────────────────────────────────────────── */

app.notFound((c) => c.json({ error: 'Not found.' }, 404));

app.onError((err, c) => {
  if (err instanceof ConfigError) {
    return c.json({ error: 'The leaderboard is not configured yet.' }, 503);
  }
  console.error('[api] unhandled error', err);
  return c.json({ error: 'Something went wrong.' }, 500);
});
