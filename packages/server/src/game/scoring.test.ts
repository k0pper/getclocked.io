import { describe, expect, it } from 'vitest';
import { finalOf, gameReducer, initGame, ms, seed as toSeed } from '@getclocked/game-core';
import { rescore } from './scoring';

function targetsFor(seedValue: number): number[] {
  return initGame(toSeed(seedValue)).targets.map((t) => Number(t));
}

describe('rescore', () => {
  it('scores a perfect run (guess == target) as 10', () => {
    const guesses = targetsFor(42);
    const r = rescore(42, guesses);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.points).toBeCloseTo(10, 6);
    expect(r.rounds.length).toBe(guesses.length);
  });

  it('reproduces game-core scoring exactly (server is authoritative)', () => {
    const targets = targetsFor(7);
    const guesses = targets.map((t, i) => t + (i % 2 === 0 ? 200 : -150));

    let g = initGame(toSeed(7));
    for (const guess of guesses) g = gameReducer(g, { type: 'RECORD_GUESS', guessMs: ms(guess) });
    const expected = finalOf(g);

    const r = rescore(7, guesses);
    expect(r?.points).toBe(expected);
  });

  it('is deterministic in the seed', () => {
    const guesses = targetsFor(99).map(() => 1000);
    expect(rescore(99, guesses)).toEqual(rescore(99, guesses));
  });

  it('rejects the wrong guess count', () => {
    expect(rescore(1, [1000])).toBeNull();
  });
});
