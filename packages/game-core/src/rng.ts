import type { Seed } from './units.js';
import { seed as toSeed } from './units.js';

/** A deterministic pseudo-random source yielding floats in `[0, 1)`. */
export interface Rng {
  next(): number;
}

/**
 * mulberry32 — a tiny, fast, well-distributed 32-bit PRNG. Deterministic for a
 * given seed, which is what makes rounds reproducible (and, later, lets the
 * multiplayer server reproduce a client's rounds for anti-cheat).
 */
export function mulberry32(s: Seed): Rng {
  let a = s >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/**
 * Derive an independent seed for a given round index from a root seed.
 *
 * Each round therefore draws from its own stream, so a verifier can reproduce
 * round N in isolation without replaying rounds 0..N-1. Uses an integer hash
 * mix (splitmix-style finalizer) for good avalanche.
 */
export function deriveSeed(root: Seed, roundIndex: number): Seed {
  let h = (root ^ Math.imul(roundIndex + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return toSeed(h);
}
