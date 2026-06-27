import { motion } from 'motion/react';
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
import { scoreColor, LED_TEXT } from '@/lib/scoreColor';
import { useRecordBest } from '@/hooks/usePersonalBest';
import { cn } from '@/lib/utils';

interface ResultsScreenProps {
  game: GameState;
  onReplay: () => void;
  onHome: () => void;
}

const GLOW: Record<'green' | 'amber' | 'red', string> = {
  green: 'led-glow-green',
  amber: 'led-glow-amber',
  red: 'led-glow-red',
};

export function ResultsScreen({ game, onReplay, onHome }: ResultsScreenProps) {
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
        <span className={cn('font-led text-6xl', LED_TEXT[color], GLOW[color])}>
          {final.toFixed(1)}
        </span>
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
            <span className="ml-auto tabular-nums text-steel-dim">{formatSignedMs(r.deltaMs)}ms</span>
            <span
              className={cn('w-8 text-right font-semibold tabular-nums', LED_TEXT[scoreColor(r.points)])}
            >
              {r.points.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="ghost" size="md" onClick={onHome}>
          Home
        </Button>
        <Button variant="amber" size="md" onClick={onReplay}>
          Play again
        </Button>
      </div>
    </motion.section>
  );
}
