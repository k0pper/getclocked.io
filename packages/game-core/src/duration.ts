import type { Ms, Seed } from './units';
import { ms } from './units';
import { mulberry32, deriveSeed, type Rng } from './rng';

export interface DurationConfig {
  /** Shortest possible target. */
  minMs: Ms;
  /** Longest possible target. */
  maxMs: Ms;
  /** Number of rounds per game. */
  rounds: number;
}

/**
 * 150ms – 10s over 7 rounds.
 *
 * The range is the brief's; the count is tuned for a ~90s session that's long
 * enough to show skill but short enough to replay-and-share.
 */
export const DEFAULT_DURATION_CONFIG: DurationConfig = {
  minMs: ms(150),
  maxMs: ms(10_000),
  rounds: 7,
};

/** One log-uniform draw within `[loMs, hiMs]`, rounded to whole milliseconds. */
export function drawLogUniform(rng: Rng, loMs: number, hiMs: number): Ms {
  const logLo = Math.log(loMs);
  const logHi = Math.log(hiMs);
  const value = Math.exp(logLo + rng.next() * (logHi - logLo));
  return ms(Math.round(value));
}

/**
 * Generate the round targets for a game.
 *
 * The range is split into `rounds` log-equal bands and one target is drawn per
 * band, which guarantees variety (every game has a short one and a long one)
 * and keeps the distribution perceptually even — humans judge time on a
 * roughly logarithmic scale (Weber's law), so equal *log* bands feel like equal
 * difficulty steps. The order is then shuffled so difficulty isn't monotonic.
 *
 * With the default config the lowest band is ~[150, 273]ms, so at most one
 * round per game lands in the sub-250ms "reaction-floor" territory.
 *
 * Deterministic in `root`: same seed → same targets, every time, everywhere.
 */
export function generateTargets(root: Seed, cfg: DurationConfig = DEFAULT_DURATION_CONFIG): Ms[] {
  const { minMs, maxMs, rounds } = cfg;
  if (rounds <= 0) return [];

  const logMin = Math.log(minMs);
  const logMax = Math.log(maxMs);
  const bandWidth = (logMax - logMin) / rounds;

  const targets: Ms[] = [];
  for (let i = 0; i < rounds; i++) {
    const rng = mulberry32(deriveSeed(root, i));
    const bandLo = Math.exp(logMin + i * bandWidth);
    const bandHi = Math.exp(logMin + (i + 1) * bandWidth);
    targets.push(drawLogUniform(rng, bandLo, bandHi));
  }

  // Shuffle with a stream that can't collide with any band's stream.
  return shuffle(targets, mulberry32(deriveSeed(root, rounds)));
}

/** Fisher–Yates shuffle driven by a deterministic Rng. */
function shuffle<T>(input: readonly T[], rng: Rng): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
