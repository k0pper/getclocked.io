import { finalOf, gameReducer, initGame, ms, seed as toSeed } from '@getclocked/game-core';
import type { StoredRound } from '../db/schema.js';

export interface Rescored {
  /** Final 0–10 score, recomputed server-side. */
  points: number;
  rounds: StoredRound[];
}

/**
 * Re-run a game from its (server-issued) seed and the player's submitted
 * per-round guesses, using the exact same pure `game-core` code the client ran.
 * The persisted score is *this* number — the client never gets to assert a
 * score, only its raw guesses. Returns null if the run doesn't complete (wrong
 * guess count for the seed's targets).
 */
export function rescore(seedValue: number, guesses: readonly number[]): Rescored | null {
  let game = initGame(toSeed(seedValue));
  if (game.targets.length !== guesses.length) return null;

  for (const guess of guesses) {
    game = gameReducer(game, { type: 'RECORD_GUESS', guessMs: ms(guess) });
  }

  const final = finalOf(game);
  if (final == null) return null;

  const rounds: StoredRound[] = game.results.map((r) => ({
    index: r.index,
    targetMs: r.targetMs,
    guessMs: r.guessMs,
    deltaMs: r.deltaMs,
    points: r.points,
  }));

  return { points: final, rounds };
}
