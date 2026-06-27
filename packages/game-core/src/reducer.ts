import type { Ms, Score, Seed } from './units.js';
import { ms } from './units.js';
import { DEFAULT_DURATION_CONFIG, generateTargets, type DurationConfig } from './duration.js';
import { DEFAULT_SCORING, finalScore, roundScore, type ScoringConfig } from './scoring.js';

export interface RoundResult {
  /** 0-based round index. */
  index: number;
  targetMs: Ms;
  guessMs: Ms;
  /** `guess − target`: positive = too late, negative = too early. */
  deltaMs: Ms;
  points: Score;
}

export interface GameState {
  seed: Seed;
  durationConfig: DurationConfig;
  scoringConfig: ScoringConfig;
  /** The pre-generated hidden targets for every round. */
  targets: readonly Ms[];
  /** Index of the round currently being played (== results.length). */
  current: number;
  results: readonly RoundResult[];
  status: 'in_progress' | 'complete';
}

export type GameAction = { type: 'RECORD_GUESS'; guessMs: Ms };

/**
 * Create a fresh game from a seed. Targets are generated up front (deterministic
 * in the seed) so a run is fully reproducible from `seed` alone.
 */
export function initGame(
  seed: Seed,
  durationConfig: DurationConfig = DEFAULT_DURATION_CONFIG,
  scoringConfig: ScoringConfig = DEFAULT_SCORING,
): GameState {
  const targets = generateTargets(seed, durationConfig);
  return {
    seed,
    durationConfig,
    scoringConfig,
    targets,
    current: 0,
    results: [],
    status: targets.length > 0 ? 'in_progress' : 'complete',
  };
}

/**
 * Pure progression. The app measures `guessMs` (via performance.now) and hands
 * it here; scoring and advancement are deterministic. An interrupted round is
 * handled by the app simply *not* dispatching — it replays the same target.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RECORD_GUESS': {
      if (state.status === 'complete') return state;
      const target = state.targets[state.current];
      if (target === undefined) return state;

      const points = roundScore(target, action.guessMs, state.scoringConfig);
      const result: RoundResult = {
        index: state.current,
        targetMs: target,
        guessMs: action.guessMs,
        deltaMs: ms(action.guessMs - target),
        points,
      };
      const current = state.current + 1;
      return {
        ...state,
        results: [...state.results, result],
        current,
        status: current >= state.targets.length ? 'complete' : 'in_progress',
      };
    }
    default:
      return state;
  }
}

/** The target for the round in progress, or `null` once the game is complete. */
export function currentTarget(state: GameState): Ms | null {
  return state.targets[state.current] ?? null;
}

/** Final 0–10 score once complete, else `null`. */
export function finalOf(state: GameState): Score | null {
  if (state.status !== 'complete') return null;
  return finalScore(state.results.map((r) => r.points));
}
