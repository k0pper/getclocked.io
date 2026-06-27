import { describe, it, expect } from 'vitest';
import { mulberry32, deriveSeed } from './rng';
import { seed } from './units';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(seed(12345));
    const b = mulberry32(seed(12345));
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('yields values in [0, 1)', () => {
    const r = mulberry32(seed(1));
    for (let i = 0; i < 2000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different first draws for different seeds', () => {
    expect(mulberry32(seed(1)).next()).not.toEqual(mulberry32(seed(2)).next());
  });

  it('is roughly uniform (mean ~0.5 over 10k draws)', () => {
    const r = mulberry32(seed(99));
    let sum = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) sum += r.next();
    const mean = sum / n;
    expect(mean).toBeGreaterThan(0.47);
    expect(mean).toBeLessThan(0.53);
  });
});

describe('deriveSeed', () => {
  it('is deterministic', () => {
    expect(deriveSeed(seed(42), 3)).toBe(deriveSeed(seed(42), 3));
  });

  it('produces a distinct seed per round index', () => {
    const root = seed(42);
    const derived = new Set([0, 1, 2, 3, 4, 5, 6].map((i) => deriveSeed(root, i)));
    expect(derived.size).toBe(7);
  });

  it('differs across root seeds', () => {
    expect(deriveSeed(seed(1), 0)).not.toBe(deriveSeed(seed(2), 0));
  });

  it('returns a uint32', () => {
    const d = deriveSeed(seed(0xffffffff), 999);
    expect(Number.isInteger(d)).toBe(true);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(0xffffffff);
  });
});
