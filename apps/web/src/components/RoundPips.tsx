import { cn } from '@/lib/utils';

interface RoundPipsProps {
  total: number;
  /** Number of rounds already scored. */
  completed: number;
  className?: string;
}

/** Seven LED pips: scored = green bar, current = amber bar, upcoming = dim dot. */
export function RoundPips({ total, completed, className }: RoundPipsProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="img"
      aria-label={`Round ${Math.min(completed + 1, total)} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const done = i < completed;
        const current = i === completed;
        return (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              done
                ? 'w-5 bg-led-green shadow-[0_0_0.5em_-0.1em_var(--color-led-green)]'
                : current
                  ? 'w-5 bg-led-amber shadow-[0_0_0.5em_-0.1em_var(--color-led-amber)]'
                  : 'w-1.5 bg-steel-dim',
            )}
          />
        );
      })}
    </div>
  );
}
