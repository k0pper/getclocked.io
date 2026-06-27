import { describe, it, expect } from 'vitest';
import { generateTargets, drawLogUniform, DEFAULT_DURATION_CONFIG } from './duration';
import { mulberry32 } from './rng';
import { ms, seed } from './units';

describe('generateTargets', () => {
  it('returns one target per round', () => {
    expect(generateTargets(seed(1)).length).toBe(DEFAULT_DURATION_CONFIG.rounds);
  });

  it('keeps every target within [min, max]', () => {
    for (let s = 0; s < 50; s++) {
      for (const t of generateTargets(seed(s))) {
        expect(t).toBeGreaterThanOrEqual(DEFAULT_DURATION_CONFIG.minMs);
        expect(t).toBeLessThanOrEqual(DEFAULT_DURATION_CONFIG.maxMs);
      }
    }
  });

  it('is deterministic in the seed', () => {
    expect(generateTargets(seed(777))).toEqual(generateTargets(seed(777)));
  });

  it('differs across seeds', () => {
    expect(generateTargets(seed(1))).not.toEqual(generateTargets(seed(2)));
  });

  it('places at most one target in the short (~sub-1s) band', () => {
    // Only the lowest log band sits below ~1086ms, so a game never has two
    // "easy short" rounds.
    for (let s = 0; s < 100; s++) {
      const short = generateTargets(seed(s)).filter((t) => t < 1050);
      expect(short.length).toBeLessThanOrEqual(1);
    }
  });

  it('always spans a wide range (variety from log-stratification)', () => {
    for (let s = 0; s < 25; s++) {
      const targets = generateTargets(seed(s));
      expect(Math.min(...targets)).toBeLessThan(1100);
      expect(Math.max(...targets)).toBeGreaterThan(3000);
    }
  });

  it('honours a custom config', () => {
    const targets = generateTargets(seed(5), { minMs: ms(1000), maxMs: ms(2000), rounds: 3 });
    expect(targets.length).toBe(3);
    for (const t of targets) {
      expect(t).toBeGreaterThanOrEqual(1000);
      expect(t).toBeLessThanOrEqual(2000);
    }
  });

  it('returns an empty array for zero rounds', () => {
    expect(generateTargets(seed(1), { ...DEFAULT_DURATION_CONFIG, rounds: 0 })).toEqual([]);
  });
});

describe('drawLogUniform', () => {
  it('stays within the band', () => {
    const r = mulberry32(seed(3));
    for (let i = 0; i < 1000; i++) {
      const v = drawLogUniform(r, 200, 800);
      expect(v).toBeGreaterThanOrEqual(200);
      expect(v).toBeLessThanOrEqual(800);
    }
  });
});
