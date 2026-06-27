import { randomInt, randomUUID } from 'node:crypto';
import { desc, eq, gt, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { redeemedTokens, scores, users } from '../db/schema';
import { rescore } from './scoring';
import { newNonce, signGameToken, verifyGameToken } from './token';

/** Game tokens are short-lived — long enough to finish a 7-round run, not so
 *  long they sit around as reusable capabilities. */
export const GAME_TOKEN_TTL_MS = 30 * 60 * 1000;

export interface StartResult {
  seed: number;
  token: string;
}

/** Issue a server-chosen seed + signed single-use token. No auth, no DB: a run
 *  can begin instantly, even logged-out (it just can't be *saved* without auth). */
export function startGame(secret: string): StartResult {
  const seed = randomInt(0, 2 ** 32); // uint32, server's choice (no seed-shopping)
  const token = signGameToken(
    { nonce: newNonce(), seed, exp: Date.now() + GAME_TOKEN_TTL_MS },
    secret,
  );
  return { seed, token };
}

export type SubmitResult =
  | { ok: true; points: number; rank: number; best: number }
  | { ok: false; status: number; error: string };

/** Verify the token, re-score the run server-side from the raw guesses, persist,
 *  and report the user's standing. Single-use is enforced by the nonce PK. */
export async function submitScore(
  db: Database,
  secret: string,
  userId: string,
  token: string,
  guesses: number[],
): Promise<SubmitResult> {
  const payload = verifyGameToken(token, secret, Date.now());
  if (!payload) return { ok: false, status: 400, error: 'Invalid or expired game token.' };

  const rescored = rescore(payload.seed, guesses);
  if (!rescored) return { ok: false, status: 400, error: 'Could not score this run.' };

  const redeemed = await db
    .insert(redeemedTokens)
    .values({ nonce: payload.nonce, userId })
    .onConflictDoNothing()
    .returning({ nonce: redeemedTokens.nonce });
  if (redeemed.length === 0) {
    return { ok: false, status: 409, error: 'This run has already been submitted.' };
  }

  await db.insert(scores).values({
    id: randomUUID(),
    userId,
    points: rescored.points.toFixed(2),
    seed: payload.seed,
    rounds: rescored.rounds,
  });

  const stats = await userStats(db, userId);
  return {
    ok: true,
    points: rescored.points,
    rank: stats?.rank ?? 1,
    best: stats?.best ?? rescored.points,
  };
}

export interface LeaderboardEntry {
  username: string;
  points: number;
}

export interface LeaderboardResult {
  top: LeaderboardEntry[];
  me: { best: number; rank: number } | null;
}

/** Top N players by their best run, plus the caller's own best + rank. */
export async function leaderboard(
  db: Database,
  limit: number,
  userId: string | null,
): Promise<LeaderboardResult> {
  const best = bestByUserCte(db);

  const top = await db
    .with(best)
    .select({ username: users.username, points: best.points })
    .from(best)
    .innerJoin(users, eq(users.id, best.userId))
    .orderBy(desc(best.points))
    .limit(limit);

  const me = userId ? await userStats(db, userId) : null;
  return { top, me };
}

/** The caller's best score and dense-ish rank (1 + players strictly above). */
export async function userStats(
  db: Database,
  userId: string,
): Promise<{ best: number; rank: number } | null> {
  const mine = await db
    .select({ points: sql<number>`max(${scores.points})::float8` })
    .from(scores)
    .where(eq(scores.userId, userId));
  const myBest = mine[0]?.points ?? null;
  if (myBest == null) return null;

  const best = bestByUserCte(db);
  const rankRows = await db
    .with(best)
    .select({ rank: sql<number>`count(*)::int + 1` })
    .from(best)
    .where(gt(best.points, myBest));
  return { best: myBest, rank: rankRows[0]?.rank ?? 1 };
}

/** CTE: each user's best (max) score as a float. */
function bestByUserCte(db: Database) {
  return db.$with('best').as(
    db
      .select({
        userId: scores.userId,
        points: sql<number>`max(${scores.points})::float8`.as('points'),
      })
      .from(scores)
      .groupBy(scores.userId),
  );
}
