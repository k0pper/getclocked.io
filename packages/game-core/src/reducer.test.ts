import { describe, it, expect } from 'vitest';
import { initGame, gameReducer, finalOf, currentTarget } from './reducer';
import { ms, seed } from './units';

describe('initGame', () => {
  it('starts in progress with generated targets and no results', () => {
    const g = initGame(seed(42));
    expect(g.status).toBe('in_progress');
    expect(g.targets.length).toBe(7);
    expect(g.results).toEqual([]);
    expect(g.current).toBe(0);
  });

  it('is complete immediately with zero rounds', () => {
    const g = initGame(seed(1), { minMs: ms(150), maxMs: ms(10_000), rounds: 0 });
    expect(g.status).toBe('complete');
    expect(finalOf(g)).toBe(0);
  });
});

describe('gameReducer / RECORD_GUESS', () => {
  it('records a scored result and advances, immutably', () => {
    const g0 = initGame(seed(42));
    const target = currentTarget(g0)!;
    const g1 = gameReducer(g0, { type: 'RECORD_GUESS', guessMs: target });

    expect(g1.results.length).toBe(1);
    expect(g1.current).toBe(1);
    expect(g1.results[0]!.points).toBeCloseTo(10, 9); // perfect guess
    expect(g1.results[0]!.deltaMs).toBe(0);
    expect(g0.results.length).toBe(0); // original untouched
  });

  it('computes a signed delta (slow is positive)', () => {
    const g0 = initGame(seed(7));
    const target = currentTarget(g0)!;
    const g1 = gameReducer(g0, { type: 'RECORD_GUESS', guessMs: ms(target + 100) });
    expect(g1.results[0]!.deltaMs).toBe(100);
  });

  it('completes after the last round and exposes the final score', () => {
    let g = initGame(seed(123));
    expect(finalOf(g)).toBeNull();

    while (g.status === 'in_progress') {
      const target = currentTarget(g)!;
      g = gameReducer(g, { type: 'RECORD_GUESS', guessMs: target }); // all perfect
    }

    expect(g.status).toBe('complete');
    expect(g.results.length).toBe(7);
    expect(currentTarget(g)).toBeNull();
    expect(finalOf(g)).toBeCloseTo(10, 9);
  });

  it('ignores guesses once complete', () => {
    let g = initGame(seed(1), { minMs: ms(150), maxMs: ms(10_000), rounds: 1 });
    g = gameReducer(g, { type: 'RECORD_GUESS', guessMs: ms(500) });
    const after = gameReducer(g, { type: 'RECORD_GUESS', guessMs: ms(999) });
    expect(after).toBe(g); // same reference — no change
    expect(after.results.length).toBe(1);
  });
});
