import { describe, it, expect } from 'vitest';
import {
  roundScore,
  finalScore,
  effectiveError,
  relativeError,
  roundRating,
  gameRank,
  DEFAULT_SCORING,
  type ScoringConfig,
} from './scoring';
import { ms, score } from './units';

// Deadzone off, to test the pure relative-error curve in isolation.
const noDeadzone: ScoringConfig = { deadzoneMs: ms(0), k: DEFAULT_SCORING.k };

describe('roundScore', () => {
  it('is a perfect 10 for an exact match', () => {
    expect(roundScore(ms(4000), ms(4000))).toBeCloseTo(10, 9);
  });

  it('treats errors within the deadzone as perfect', () => {
    expect(roundScore(ms(4000), ms(4025))).toBeCloseTo(10, 9);
    expect(roundScore(ms(4000), ms(3975))).toBeCloseTo(10, 9);
    expect(roundScore(ms(200), ms(220))).toBeCloseTo(10, 9); // 20ms off a short target
  });

  it('stays within [0, 10] across extreme inputs', () => {
    const cases: ReadonlyArray<readonly [number, number]> = [
      [150, 150],
      [150, 10_000],
      [10_000, 150],
      [4000, 0],
      [500, 50_000],
      [1000, 1],
    ];
    for (const [t, g] of cases) {
      const s = roundScore(ms(t), ms(g));
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(10);
    }
  });

  it('decreases monotonically as the error grows', () => {
    const target = ms(4000);
    let prev = Infinity;
    for (const off of [0, 100, 250, 500, 1000, 2000, 4000]) {
      const s = roundScore(target, ms(4000 + off));
      expect(s).toBeLessThanOrEqual(prev + 1e-9);
      prev = s;
    }
  });

  it('is scale-invariant in relative error (deadzone off)', () => {
    // 20% over at 150ms and at 10s must score identically.
    const short = roundScore(ms(150), ms(180), noDeadzone);
    const long = roundScore(ms(10_000), ms(12_000), noDeadzone);
    expect(short).toBeCloseTo(long, 6);
  });

  it('matches the documented curve at 10% / 20% / 50% (deadzone off)', () => {
    expect(roundScore(ms(1000), ms(1100), noDeadzone)).toBeCloseTo(10 * Math.exp(-0.35), 6);
    expect(roundScore(ms(1000), ms(1200), noDeadzone)).toBeCloseTo(10 * Math.exp(-0.7), 6);
    expect(roundScore(ms(1000), ms(1500), noDeadzone)).toBeCloseTo(10 * Math.exp(-1.75), 6);
  });

  it('is symmetric for too-fast vs too-slow', () => {
    expect(roundScore(ms(2000), ms(2300))).toBeCloseTo(roundScore(ms(2000), ms(1700)), 9);
  });
});

describe('effectiveError / relativeError', () => {
  it('subtracts the deadzone but never goes below zero', () => {
    expect(effectiveError(ms(1000), ms(1010), ms(25))).toBe(0);
    expect(effectiveError(ms(1000), ms(1100), ms(25))).toBe(75);
  });

  it('guards against a zero target', () => {
    expect(relativeError(ms(10), ms(0))).toBe(0);
  });
});

describe('finalScore', () => {
  it('averages the round scores', () => {
    expect(finalScore([score(10), score(0), score(5)])).toBeCloseTo(5, 9);
  });

  it('is 0 with no rounds', () => {
    expect(finalScore([])).toBe(0);
  });
});

describe('roundRating', () => {
  it('maps points to labels at the thresholds', () => {
    expect(roundRating(score(10))).toBe('PERFECT');
    expect(roundRating(score(9.5))).toBe('PERFECT');
    expect(roundRating(score(9.49))).toBe('DIALED');
    expect(roundRating(score(8))).toBe('DIALED');
    expect(roundRating(score(6))).toBe('SHARP');
    expect(roundRating(score(4))).toBe('LOOSE');
    expect(roundRating(score(2))).toBe('SLOPPY');
    expect(roundRating(score(1.99))).toBe('CLOCKED');
    expect(roundRating(score(0))).toBe('CLOCKED');
  });
});

describe('gameRank', () => {
  it('maps the final score to a title', () => {
    expect(gameRank(score(10))).toBe('TIMELORD');
    expect(gameRank(score(9))).toBe('TIMELORD');
    expect(gameRank(score(8))).toBe('CLOCKWORK');
    expect(gameRank(score(7.5))).toBe('CLOCKWORK');
    expect(gameRank(score(6))).toBe('DIALED IN');
    expect(gameRank(score(4))).toBe('ROOKIE');
    expect(gameRank(score(2))).toBe('OFF-BEAT');
    expect(gameRank(score(1.5))).toBe('GOT CLOCKED');
  });
});
