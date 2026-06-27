import type { Ms, Score } from './units';
import { clamp, ms, score } from './units';

export interface ScoringConfig {
  /**
   * Errors at or below this are treated as perfect. Absorbs the ~20–50ms jitter
   * of human tapping / input latency so a near-perfect attempt isn't punished
   * for sub-perceptual imprecision.
   */
  deadzoneMs: Ms;
  /**
   * Exponential falloff steepness on *relative* error. Higher = harsher.
   * k=3.5 → 10% off ≈ 7.2/10, 20% ≈ 5.0, 50% ≈ 1.7.
   */
  k: number;
}

export const DEFAULT_SCORING: ScoringConfig = {
  deadzoneMs: ms(25),
  k: 3.5,
};

/** `|guess − target|`, with the deadzone subtracted (never below zero). */
export function effectiveError(targetMs: Ms, guessMs: Ms, deadzoneMs: Ms): Ms {
  const raw = Math.abs(guessMs - targetMs);
  return ms(Math.max(0, raw - deadzoneMs));
}

/**
 * Effective error as a fraction of the target.
 *
 * Relative (not absolute) error is the fair metric across 150ms–10s: by Weber's
 * law, being 200ms off a 10s target is excellent but 200ms off a 200ms target
 * is terrible — and this captures exactly that.
 */
export function relativeError(effErrMs: Ms, targetMs: Ms): number {
  if (targetMs <= 0) return 0;
  return effErrMs / targetMs;
}

/** Score a single round: `10 · e^(−k · relErr)`, clamped to `[0, 10]`. */
export function roundScore(
  targetMs: Ms,
  guessMs: Ms,
  cfg: ScoringConfig = DEFAULT_SCORING,
): Score {
  const effErr = effectiveError(targetMs, guessMs, cfg.deadzoneMs);
  const relErr = relativeError(effErr, targetMs);
  const points = 10 * Math.exp(-cfg.k * relErr);
  return score(clamp(points, 0, 10));
}

/** Final game score: the mean of the round scores (0–10). */
export function finalScore(rounds: readonly Score[]): Score {
  if (rounds.length === 0) return score(0);
  const sum = rounds.reduce<number>((acc, p) => acc + p, 0);
  return score(sum / rounds.length);
}

/* ── Flavour: ratings & ranks (drive the reveal copy/colour) ─────────────── */

export type RoundRating = 'PERFECT' | 'DIALED' | 'SHARP' | 'LOOSE' | 'SLOPPY' | 'CLOCKED';

/** Per-round label from its points. */
export function roundRating(points: Score): RoundRating {
  if (points >= 9.5) return 'PERFECT';
  if (points >= 8) return 'DIALED';
  if (points >= 6) return 'SHARP';
  if (points >= 4) return 'LOOSE';
  if (points >= 2) return 'SLOPPY';
  return 'CLOCKED';
}

export type GameRank =
  | 'TIMELORD'
  | 'CLOCKWORK'
  | 'DIALED IN'
  | 'ROOKIE'
  | 'OFF-BEAT'
  | 'GOT CLOCKED';

/** Overall title from the final score. */
export function gameRank(final: Score): GameRank {
  if (final >= 9) return 'TIMELORD';
  if (final >= 7.5) return 'CLOCKWORK';
  if (final >= 6) return 'DIALED IN';
  if (final >= 4) return 'ROOKIE';
  if (final >= 2) return 'OFF-BEAT';
  return 'GOT CLOCKED';
}
