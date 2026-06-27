import { useEffect, useState } from 'react';
import { PERSONAL_BEST_KEY } from '@/lib/constants';

export interface PersonalBest {
  score: number;
  seed: number;
  at: number;
}

/** Best-effort read of the stored personal best (null in private mode / on parse errors). */
export function readPersonalBest(): PersonalBest | null {
  try {
    const raw = localStorage.getItem(PERSONAL_BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersonalBest>;
    if (typeof parsed.score === 'number' && typeof parsed.seed === 'number') {
      return { score: parsed.score, seed: parsed.seed, at: parsed.at ?? 0 };
    }
  } catch {
    // localStorage unavailable or corrupt — treat as no best.
  }
  return null;
}

function writePersonalBest(pb: PersonalBest): void {
  try {
    localStorage.setItem(PERSONAL_BEST_KEY, JSON.stringify(pb));
  } catch {
    // best-effort only
  }
}

/**
 * Record a finished game's score against the stored best.
 * Reads the previous best once (so the "new best" badge is stable across the
 * render), then persists in an effect.
 */
export function useRecordBest(score: number, seed: number): { best: number; isNewBest: boolean } {
  const [prev] = useState<PersonalBest | null>(() => readPersonalBest());
  const isNewBest = prev == null || score > prev.score;
  const best = isNewBest ? score : prev.score;

  useEffect(() => {
    if (isNewBest) writePersonalBest({ score, seed, at: Date.now() });
  }, [isNewBest, score, seed]);

  return { best, isNewBest };
}
