/**
 * Branded numeric units.
 *
 * These are nominal `number` types — at runtime they are plain numbers, but the
 * compiler stops you from accidentally passing a `Score` where an `Ms` is wanted
 * (a real hazard in a game that juggles milliseconds, points, and RNG seeds).
 *
 * Arithmetic on a brand widens back to `number`, so re-brand at boundaries with
 * the constructors below.
 */

export type Ms = number & { readonly __brand: 'Ms' };
export type Score = number & { readonly __brand: 'Score' };
export type Seed = number & { readonly __brand: 'Seed' };

/** Tag a number as milliseconds. */
export const ms = (n: number): Ms => n as Ms;

/** Tag a number as a 0–10 score. */
export const score = (n: number): Score => n as Score;

/** Tag a number as a uint32 RNG seed (coerced into range). */
export const seed = (n: number): Seed => (n >>> 0) as Seed;

/** Clamp a number into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
