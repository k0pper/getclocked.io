import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { formatClock, ms } from '@getclocked/game-core';
import { cn } from '@/lib/utils';
import { IGNITION_MS, IGNITION_FADE_MS, IGNITION_MAX_FRACTION } from '@/lib/constants';

export interface LEDClockHandle {
  /**
   * Ignite: digits spring up from 0 (visible) then fade to dark. The visible
   * window is capped at a fraction of `durationMs` so a 150ms target reads as a
   * single glowing flash rather than a botched fade.
   */
  ignite(durationMs?: number): void;
  /** Show a fixed value, fully lit (used on the result reveal). */
  reveal(valueMs: number): void;
  /** Go dark (only the faint ghost segments remain). */
  clear(): void;
}

const LED_COLOR = {
  green: { text: 'text-led-green', glow: 'led-glow-green' },
  amber: { text: 'text-led-amber', glow: 'led-glow-amber' },
  red: { text: 'text-led-red', glow: 'led-glow-red' },
} as const;

interface LEDClockProps {
  color?: keyof typeof LED_COLOR;
  reducedMotion?: boolean;
  className?: string;
}

const ZERO = formatClock(ms(0));
const GHOST = ZERO.replace(/[0-9]/g, '8');

/**
 * The black-and-green LED stopwatch. Animation is driven by a single rAF loop
 * writing directly to the DOM (textContent + opacity) — never React state — so
 * it can update every frame without re-rendering the tree.
 */
export const LEDClock = forwardRef<LEDClockHandle, LEDClockProps>(function LEDClock(
  { color = 'green', reducedMotion = false, className },
  ref,
) {
  const litRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const setText = (text: string) => {
    if (litRef.current) litRef.current.textContent = text;
  };
  const setOpacity = (value: number) => {
    if (litRef.current) litRef.current.style.opacity = String(value);
  };

  // Cancel any in-flight ignition loop on unmount.
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    ignite(durationMs?: number) {
      stopRaf();
      const visibleMs =
        durationMs != null
          ? Math.min(IGNITION_MS, Math.max(90, durationMs * IGNITION_MAX_FRACTION))
          : IGNITION_MS;

      // Reduced motion: a single static flash, no animated digits.
      if (reducedMotion) {
        setText(ZERO);
        setOpacity(1);
        const start = performance.now();
        const tick = () => {
          const t = performance.now() - start;
          if (t >= visibleMs) {
            setOpacity(0);
            rafRef.current = null;
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const origin = performance.now();
      const tick = () => {
        const elapsed = performance.now() - origin;
        setText(formatClock(ms(elapsed)));
        if (elapsed <= visibleMs) {
          setOpacity(1);
        } else {
          const fade = 1 - (elapsed - visibleMs) / IGNITION_FADE_MS;
          if (fade <= 0) {
            setOpacity(0);
            rafRef.current = null;
            return; // keep last digits but invisible
          }
          setOpacity(fade);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    reveal(valueMs: number) {
      stopRaf();
      setText(formatClock(ms(Math.max(0, valueMs))));
      setOpacity(1);
    },
    clear() {
      stopRaf();
      setText(ZERO);
      setOpacity(0);
    },
  }));

  const { text, glow } = LED_COLOR[color];

  return (
    <div className={cn('led-screen rounded-2xl border border-seam px-7 py-5', className)}>
      <span
        className={cn(
          'relative inline-block font-led leading-none tracking-wider',
          'text-[clamp(2.2rem,13vw,4.5rem)]',
          text,
        )}
        role="timer"
        aria-hidden
      >
        {/* Ghost segments (always faintly lit) */}
        <span className="absolute inset-0 select-none opacity-[0.13]">{GHOST}</span>
        {/* Lit digits — mutated imperatively; starts dark. */}
        <span ref={litRef} className={cn('relative', glow)} style={{ opacity: 0 }}>
          {ZERO}
        </span>
      </span>
    </div>
  );
});
