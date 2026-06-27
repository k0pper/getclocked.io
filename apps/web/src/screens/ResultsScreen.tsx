import { useEffect, useState } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import {
  finalOf,
  gameRank,
  formatSeconds,
  formatSignedMs,
  score,
  type GameState,
} from '@getclocked/game-core';
import { Button } from '@/components/Button';
import { GhostText } from '@/components/GhostText';
import { AuthForm } from '@/components/AuthForm';
import { scoreColor, LED_TEXT, type LedColor } from '@/lib/scoreColor';
import { useRecordBest } from '@/hooks/usePersonalBest';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';

interface ResultsScreenProps {
  game: GameState;
  /** Single-use submit token for a ranked run; null ⇒ unranked (can't save). */
  token: string | null;
  onReplay: () => void;
  onHome: () => void;
  onLeaderboard: () => void;
}

const GLOW: Record<LedColor, string> = {
  green: 'led-glow-green',
  amber: 'led-glow-amber',
  red: 'led-glow-red',
};

function CountUpScore({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setN,
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <span className={className}>{n.toFixed(1)}</span>;
}

export function ResultsScreen({
  game,
  token,
  onReplay,
  onHome,
  onLeaderboard,
}: ResultsScreenProps) {
  const final = finalOf(game) ?? score(0);
  const rank = gameRank(final);
  const color = scoreColor(final);
  const { best, isNewBest } = useRecordBest(final, game.seed);

  return (
    <motion.section
      className="flex min-h-dvh flex-col items-center gap-6 px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GhostText
          value={rank}
          variant="display"
          color={color}
          ariaLabel={`Rank: ${rank}`}
          className="text-[clamp(1.25rem,6vw,2.3rem)]"
        />
      </motion.div>

      <motion.div
        className="led-screen flex items-baseline gap-2 rounded-2xl border border-seam px-9 py-5"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <CountUpScore
          value={final}
          className={cn('font-led text-6xl', LED_TEXT[color], GLOW[color])}
        />
        <span className="font-mono text-sm text-steel">/ 10</span>
      </motion.div>

      {isNewBest ? (
        <motion.span
          className="font-mono text-xs uppercase tracking-[0.3em] text-led-amber"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          ★ New best
        </motion.span>
      ) : (
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-steel-dim">
          Best {best.toFixed(1)}
        </span>
      )}

      <ul className="mt-2 w-full max-w-sm divide-y divide-seam/60">
        {game.results.map((r) => (
          <li key={r.index} className="flex items-center gap-3 py-2 font-mono text-xs">
            <span className="w-3 text-steel-dim">{r.index + 1}</span>
            <span className="text-steel">{formatSeconds(r.targetMs)}s</span>
            <span className="text-steel-dim">→</span>
            <span className="text-bone">{formatSeconds(r.guessMs)}s</span>
            <span className="ml-auto tabular-nums text-steel-dim">
              {formatSignedMs(r.deltaMs)}ms
            </span>
            <span
              className={cn(
                'w-8 text-right font-semibold tabular-nums',
                LED_TEXT[scoreColor(r.points)],
              )}
            >
              {r.points.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex w-full flex-col items-center gap-5 pt-6">
        <SaveCard game={game} token={token} onLeaderboard={onLeaderboard} />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onHome}>
            Home
          </Button>
          <Button variant="ghost" size="sm" onClick={onLeaderboard}>
            Leaderboard
          </Button>
          <Button variant="amber" size="md" onClick={onReplay}>
            Play again
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Persist-this-run panel. Saving is always an explicit choice — even when
 * already signed in you must press "Save as <name>" (so a shared machine never
 * attributes a run to whoever happens to be logged in). Signed-out players get
 * the sign-in/up form first; an unranked run (backend was unreachable at start)
 * simply can't be saved.
 */
function SaveCard({
  game,
  token,
  onLeaderboard,
}: {
  game: GameState;
  token: string | null;
  onLeaderboard: () => void;
}) {
  const { username, logout } = useAuth();
  const [phase, setPhase] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [info, setInfo] = useState<{ rank: number; best: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!token) return;
    setPhase('saving');
    setError(null);
    const guesses = game.results.map((r) => Number(r.guessMs));
    const result = await api.submitRun(token, guesses);
    if (result.ok) {
      setInfo({ rank: result.data.rank, best: result.data.best });
      setPhase('saved');
    } else if (result.status === 409) {
      // Already submitted — treat as done, not an error.
      setError('This run was already saved.');
      setPhase('saved');
    } else {
      setError(result.error);
      setPhase('error');
    }
  };

  const shell = 'w-full max-w-xs rounded-2xl border border-seam bg-void-raised/60 p-4';

  if (!token) {
    return (
      <p className="max-w-xs text-center font-mono text-xs leading-relaxed text-steel-dim">
        Unranked run — the leaderboard was unreachable when it started, so it can’t be saved.
      </p>
    );
  }

  if (phase === 'saved') {
    return (
      <div className={cn(shell, 'flex flex-col items-center gap-2 text-center')}>
        {info ? (
          <p className="font-mono text-sm text-led-green">
            Saved · Rank #{info.rank} · Best {info.best.toFixed(1)}
          </p>
        ) : (
          <p className="font-mono text-sm text-steel">{error}</p>
        )}
        <Button variant="ghost" size="sm" onClick={onLeaderboard}>
          View leaderboard
        </Button>
      </div>
    );
  }

  if (username) {
    return (
      <div className={cn(shell, 'flex flex-col items-center gap-2.5 text-center')}>
        <Button
          variant="primary"
          size="md"
          disabled={phase === 'saving'}
          onClick={save}
          className="w-full"
        >
          {phase === 'saving' ? 'Saving…' : `Save as ${username}`}
        </Button>
        {error && <p className="font-mono text-xs text-led-red">{error}</p>}
        <button
          type="button"
          onClick={() => void logout()}
          className="font-mono text-[0.7rem] text-steel-dim underline-offset-2 hover:text-steel hover:underline"
        >
          Not {username}? Switch account
        </button>
      </div>
    );
  }

  return (
    <div className={cn(shell, 'flex flex-col items-center gap-3')}>
      <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-steel">
        Sign in to save this run
      </p>
      <AuthForm />
    </div>
  );
}
