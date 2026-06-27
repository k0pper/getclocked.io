import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { COALESCE_MS } from '@/lib/constants';

export type BuzzerState = 'idle' | 'armed' | 'live' | 'disabled';

interface BuzzerProps {
  state: BuzzerState;
  /** Fired once per physical press while armed/live, with a high-res timestamp. */
  onTap: (ts: number) => void;
  className?: string;
}

const RING: Record<BuzzerState, string> = {
  idle: 'border-steel-dim',
  armed: 'border-led-amber',
  live: 'border-led-green',
  disabled: 'border-steel-dim',
};

const LABEL: Record<BuzzerState, string> = {
  idle: '',
  armed: 'Tap to start',
  live: 'Tap to stop',
  disabled: '',
};

/**
 * The arcade buzzer. One physical press = one logical tap: pointerdown and
 * Space both route through `registerTap`, which de-dupes cross-channel
 * duplicates and ignores key-repeat. Taps only register while armed or live.
 */
export function Buzzer({ state, onTap, className }: BuzzerProps) {
  const reduce = useReducedMotion();
  const interactive = state === 'armed' || state === 'live';

  // Latest-value refs so the global key listener never goes stale.
  const interactiveRef = useRef(interactive);
  const onTapRef = useRef(onTap);
  interactiveRef.current = interactive;
  onTapRef.current = onTap;

  const lastTap = useRef<{ ts: number; source: 'pointer' | 'key' }>({
    ts: -Infinity,
    source: 'pointer',
  });
  const [pulse, setPulse] = useState(0); // bump → ripple

  const registerTap = useCallback((ts: number, source: 'pointer' | 'key') => {
    if (!interactiveRef.current) return;
    const last = lastTap.current;
    if (source !== last.source && ts - last.ts < COALESCE_MS) return; // one press, two channels
    lastTap.current = { ts, source };
    setPulse((p) => p + 1);
    onTapRef.current(ts);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      registerTap(e.timeStamp || performance.now(), 'key');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [registerTap]);

  const ringGlow =
    state === 'live'
      ? '0 0 3em -0.4em var(--color-led-green), inset 0 2px 6px #ffffff14, inset 0 -10px 22px #000000aa'
      : state === 'armed'
        ? '0 0 3em -0.4em var(--color-led-amber), inset 0 2px 6px #ffffff14, inset 0 -10px 22px #000000aa'
        : 'inset 0 2px 6px #ffffff0f, inset 0 -10px 22px #000000aa';

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <motion.button
        type="button"
        aria-label={LABEL[state] || 'Buzzer'}
        disabled={state === 'disabled'}
        onPointerDown={(e) => {
          e.preventDefault();
          registerTap(e.timeStamp || performance.now(), 'pointer');
        }}
        className={cn(
          'relative grid h-40 w-40 select-none place-items-center rounded-full border-4 outline-none [touch-action:manipulation] sm:h-44 sm:w-44',
          'transition-[border-color,box-shadow] duration-300',
          RING[state],
          interactive ? 'cursor-pointer' : 'cursor-default',
        )}
        style={{
          background: 'radial-gradient(circle at 50% 30%, #222a34, #090c12 70%)',
          boxShadow: ringGlow,
        }}
        whileTap={interactive ? { scale: 0.93 } : undefined}
        animate={reduce || state !== 'armed' ? { scale: 1 } : { scale: [1, 1.04, 1] }}
        transition={
          reduce || state !== 'armed'
            ? { duration: 0.2 }
            : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <span
          className="pointer-events-none absolute inset-4 rounded-full"
          style={{ background: 'radial-gradient(circle at 50% 26%, #313a4799, transparent 62%)' }}
        />
        <AnimatePresence>
          {pulse > 0 && (
            <motion.span
              key={pulse}
              className={cn(
                'pointer-events-none absolute inset-0 rounded-full border-2',
                RING[state],
              )}
              initial={{ opacity: 0.6, scale: 0.92 }}
              animate={{ opacity: 0, scale: 1.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      <span
        className="h-4 font-mono text-[0.7rem] uppercase tracking-[0.25em] text-steel"
        aria-live="polite"
      >
        {LABEL[state]}
      </span>
    </div>
  );
}
