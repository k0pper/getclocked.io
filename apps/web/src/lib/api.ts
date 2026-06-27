/**
 * Thin client for the getclocked.io API (same-origin `/api`, served by the
 * Vercel function in `/api`). Every call is defensive: a missing/unconfigured
 * backend or a network error resolves to a graceful result, never a throw, so
 * the game stays fully playable offline.
 */

const BASE = '/api';

export interface Session {
  seed: number;
  token: string;
}

export interface SubmitResponse {
  points: number;
  rank: number;
  best: number;
}

export interface LeaderboardEntry {
  username: string;
  points: number;
}

export interface LeaderboardData {
  top: LeaderboardEntry[];
  me: { best: number; rank: number } | null;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function call(path: string, init?: RequestInit, timeoutMs = 8000): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${BASE}${path}`, {
      credentials: 'include',
      signal: controller.signal,
      ...init,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function postJson(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

function errorOf(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error: unknown }).error;
    if (typeof e === 'string') return e;
  }
  return fallback;
}

async function parse<T>(res: Response | null): Promise<ApiResult<T>> {
  if (!res) return { ok: false, error: 'Can’t reach the server.', status: 0 };
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty / non-JSON body */
  }
  if (!res.ok) return { ok: false, error: errorOf(body, 'Something went wrong.'), status: res.status };
  return { ok: true, data: body as T };
}

/** Server-issued seed + single-use token for a *ranked* run. Null ⇒ play
 *  unranked with a local seed (backend down / not configured). Short timeout so
 *  starting a game never hangs on a cold function. */
export async function startSession(): Promise<Session | null> {
  // Generous enough to ride out a cold serverless start, short enough that a
  // genuinely-down backend still drops to local (unranked) play promptly.
  const result = await parse<Session>(await call('/game/start', postJson({}), 4500));
  if (!result.ok) return null;
  const { seed, token } = result.data;
  return typeof seed === 'number' && typeof token === 'string' ? { seed, token } : null;
}

export async function fetchMe(): Promise<string | null> {
  const result = await parse<{ user: { username: string } | null }>(await call('/auth/me', undefined, 5000));
  return result.ok ? (result.data.user?.username ?? null) : null;
}

export async function signup(username: string, password: string): Promise<ApiResult<string>> {
  const result = await parse<{ user: { username: string } }>(
    await call('/auth/signup', postJson({ username, password })),
  );
  return result.ok ? { ok: true, data: result.data.user.username } : result;
}

export async function login(username: string, password: string): Promise<ApiResult<string>> {
  const result = await parse<{ user: { username: string } }>(
    await call('/auth/login', postJson({ username, password })),
  );
  return result.ok ? { ok: true, data: result.data.user.username } : result;
}

export async function logout(): Promise<void> {
  await call('/auth/logout', postJson({}));
}

export async function submitRun(
  token: string,
  guesses: number[],
): Promise<ApiResult<SubmitResponse>> {
  return parse<SubmitResponse>(await call('/game/submit', postJson({ token, guesses })));
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardData | null> {
  const result = await parse<LeaderboardData>(await call(`/leaderboard?limit=${limit}`, undefined, 6000));
  return result.ok ? result.data : null;
}
