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

/** Round LEDs: each scored round glows its own score colour; the current round
 *  is amber; upcoming rounds are dim dots. */
export function RoundPips({ total, scores, className }: RoundPipsProps) {
  const current = scores.length;
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="img"
      aria-label={`Round ${Math.min(current + 1, total)} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const scored = i < scores.length;
        const isCurrent = i === current;
        const bar = scored ? PIP_BG[scoreColor(scores[i]!)] : isCurrent ? PIP_BG.amber : '';
        return (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              scored || isCurrent ? 'w-5' : 'w-1.5 bg-steel-dim',
              bar,
            )}
          />
        );
      })}
    </div>
  );
}
