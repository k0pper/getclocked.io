import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { scoreColor } from '@/lib/scoreColor';

interface RoundPipsProps {
  total: number;
  /** Points for each completed round (length = rounds scored so far). */
  scores: readonly number[];
  className?: string;
}

const PIP_BG: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-led-green shadow-[0_0_0.5em_-0.1em_var(--color-led-green)]',
  amber: 'bg-led-amber shadow-[0_0_0.5em_-0.1em_var(--color-led-amber)]',
  red: 'bg-led-red shadow-[0_0_0.5em_-0.1em_var(--color-led-red)]',
};

/** Round LEDs: every segment is the same width. Scored rounds glow their own
 *  score colour, the current round is a bright white pip that pulses (so "you
 *  are here" is unmistakable), upcoming rounds stay dim. The round counter lives
 *  in the indicator itself. */
export function RoundPips({ total, scores, className }: RoundPipsProps) {
  const reduce = useReducedMotion();
  const current = scores.length;
  const roundNum = Math.min(current + 1, total);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.35em] text-steel">
        Round <span className="text-bone">{roundNum}</span> / {total}
      </span>
      <div
        className="flex items-center gap-1.5"
        role="img"
        aria-label={`Round ${roundNum} of ${total}`}
      >
        {Array.from({ length: total }, (_, i) => {
          const scored = i < scores.length;
          const isCurrent = i === current;
          if (isCurrent && !scored) {
            return (
              <motion.span
                key={i}
                className="h-1.5 w-6 rounded-full bg-bone shadow-[0_0_0.7em_-0.05em_rgba(255,255,255,0.95)]"
                animate={reduce ? undefined : { opacity: [1, 0.45, 1] }}
                transition={
                  reduce ? undefined : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
                }
              />
            );
          }
          return (
            <span
              key={i}
              className={cn(
                'h-1.5 w-6 rounded-full transition-all duration-300',
                scored ? PIP_BG[scoreColor(scores[i]!)] : 'bg-steel-dim/60',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
