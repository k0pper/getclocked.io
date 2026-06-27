import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { audio } from '@/audio/engine';
import { cn } from '@/lib/utils';

interface NeonSignProps {
  /** The word to light up (uppercase display glyphs). */
  text: string;
  className?: string;
  ariaLabel?: string;
}

/** Keyframes for a single failing tube — irregular drop-outs and quick
 *  double-stutters, like a neon letter starving for current. */
type Flicker = { opacity: number[]; times: number[]; duration: number; delay: number };

/**
 * Per-letter flicker, keyed by letter index. Hand-tuned (no RNG) so the sign
 * has a consistent "these specific tubes are dying" character: a couple of
 * letters stutter, the rest hold steady.
 */
const FLICKER: Record<number, Flicker> = {
  // T — long-period stutter with a hard dropout mid-cycle
  2: {
    opacity: [1, 1, 0.18, 1, 0.22, 1, 1, 1],
    times: [0, 0.46, 0.5, 0.54, 0.58, 0.62, 0.66, 1],
    duration: 4.7,
    delay: 0.3,
  },
  // O — early double-blink then a deep, slow fade
  6: {
    opacity: [1, 0.2, 1, 1, 1, 0.12, 0.85, 1],
    times: [0, 0.05, 0.1, 0.4, 0.74, 0.79, 0.85, 1],
    duration: 5.9,
    delay: 1.2,
  },
  // E (second) — restless, never fully settles
  8: {
    opacity: [1, 1, 0.25, 1, 1, 0.15, 1, 0.9, 1],
    times: [0, 0.28, 0.32, 0.37, 0.66, 0.7, 0.74, 0.86, 1],
    duration: 3.9,
    delay: 0.7,
  },
};

/** A single spark: a direction (deg) and distance it flies before fading. */
type Spark = { id: number; angle: number; distance: number; hue: string; size: number };

const SPARK_HUES = ['#ffffff', '#7df9ff', '#34f36b', '#ffc53d'] as const;

/** Build a small fan of sparks flying out from the letter (no RNG seed needed —
 *  this is pure visual feedback, only ever runs in the browser on a click). */
function makeSparks(seed: number): Spark[] {
  const count = 5 + (seed % 3);
  return Array.from({ length: count }, (_, k) => {
    const n = seed * 31 + k * 97;
    return {
      id: n,
      angle: -120 + ((n * 53) % 240), // mostly upward/outward
      distance: 14 + ((n * 17) % 22),
      hue: SPARK_HUES[(n >>> 2) % SPARK_HUES.length] ?? '#ffffff',
      size: 2 + ((n >>> 3) % 3),
    };
  });
}

/** The flicker-out keyframes when a tube dies: a couple of erratic stutters,
 *  then dark. */
const BREAK_OUT = {
  opacity: [1, 0.1, 0.8, 0.05, 0.4, 0],
  transition: { duration: 0.5, times: [0, 0.12, 0.2, 0.34, 0.5, 1], ease: 'linear' as const },
};

interface LetterProps {
  ch: string;
  index: number;
  isLast: boolean;
  broken: boolean;
  reduce: boolean;
  onToggle: (index: number) => void;
}

function Letter({ ch, index, isLast, broken, reduce, onToggle }: LetterProps) {
  const flicker = FLICKER[index];
  // A fresh spark batch per break so AnimatePresence remounts them each time.
  const [sparkBatch, setSparkBatch] = useState(0);
  const sparks = !reduce && broken ? makeSparks(index * 7 + sparkBatch) : [];

  const handleClick = () => {
    setSparkBatch((b) => b + 1);
    onToggle(index);
    // A click is a user gesture, so it's safe to lazily start audio here.
    void (async () => {
      try {
        await audio.start();
        audio.play('zap');
        if (isLast) audio.play('creak');
      } catch {
        /* never let audio failure break the interaction */
      }
    })();
  };

  // The lit tube's animation target. Broken → dark (the ghost shows through);
  // lit → its ambient flicker (or steady if reduced / no flicker assigned).
  const litAnimate = broken
    ? reduce
      ? { opacity: 0 }
      : BREAK_OUT
    : reduce || !flicker
      ? { opacity: 1 }
      : { opacity: flicker.opacity };

  const litTransition =
    broken || reduce || !flicker
      ? undefined
      : {
          duration: flicker.duration,
          times: flicker.times,
          delay: flicker.delay,
          repeat: Infinity,
          repeatDelay: 0.6,
          ease: 'linear' as const,
        };

  // The dangling-D: pivot at the top-left "screw", swing damped, settle inverted.
  const dangle = isLast && broken;
  const dangleAnimate =
    dangle && !reduce
      ? { rotate: [0, 152, 168, 175, 180], y: [0, 1, 2, 2, 2] }
      : dangle && reduce
        ? { rotate: 180 }
        : { rotate: 0, y: 0 };
  const dangleTransition =
    dangle && !reduce
      ? { duration: 1.4, times: [0, 0.4, 0.62, 0.82, 1], ease: 'easeOut' as const }
      : { duration: 0 };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${broken ? 'repair' : 'break'} letter ${ch}`}
      className={cn(
        'relative inline-block cursor-pointer appearance-none bg-transparent p-0',
        'origin-[18%_12%] align-baseline focus-visible:outline-none',
      )}
    >
      <motion.span
        className="relative inline-block"
        style={{ transformOrigin: '18% 12%' }}
        animate={dangleAnimate}
        transition={dangleTransition}
      >
        {/* The loose screw glint at the pivot — only on the dangling D */}
        {isLast && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-[14%] top-[6%] h-1 w-1 rounded-full"
            style={{ background: 'radial-gradient(circle, #fff 0%, #ffc53d 60%, transparent 75%)' }}
            animate={{ opacity: broken ? [0, 1, 0.6] : 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
        {/* Unlit tube (ghost) — always present so a dead letter still has form */}
        <span className="select-none opacity-[0.12]">{ch}</span>
        {/* Lit tube — flickers in place over the ghost, dies on break */}
        <motion.span
          className="led-glow-green absolute inset-0"
          animate={litAnimate}
          transition={litTransition}
        >
          {ch}
        </motion.span>
      </motion.span>

      {/* Electricity sparkles — fly out and fade at the moment of breaking */}
      <AnimatePresence>
        {sparks.map((s) => {
          const rad = (s.angle * Math.PI) / 180;
          return (
            <motion.span
              key={s.id}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/3 rounded-full"
              style={{
                width: s.size,
                height: s.size,
                background: s.hue,
                boxShadow: `0 0 6px ${s.hue}`,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(rad) * s.distance,
                y: Math.sin(rad) * s.distance,
                opacity: 0,
                scale: 0.4,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          );
        })}
      </AnimatePresence>
    </button>
  );
}

/**
 * A wordmark rendered as a broken neon sign: each glyph sits on faint "unlit
 * tube" ghosts, and a few tubes flicker/drop out as if short of power. The lit
 * layer flickers while the ghost stays put, so a dying letter reads as a dark
 * tube rather than vanishing entirely. Reduced motion holds every tube lit.
 *
 * Easter egg: every letter is a button — click to "break" it (the tube dies in
 * a shower of sparks) and click again to repair it. The final "D" loses a screw
 * and dangles upside-down. The whole word still reads as `ariaLabel` to screen
 * readers via a labelled wrapper; the per-letter buttons add break/repair
 * controls on top.
 */
export function NeonSign({ text, className, ariaLabel }: NeonSignProps) {
  const reduce = useReducedMotion() ?? false;
  const letters = [...text];
  const [broken, setBroken] = useState<ReadonlySet<number>>(() => new Set());

  const toggle = (index: number) =>
    setBroken((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <span
      className={cn('relative inline-flex font-display leading-none text-led-green', className)}
    >
      {/* One labelled node carries the wordmark's meaning to assistive tech so
          the sign still reads as a whole word; the per-letter buttons below add
          break/repair controls (each with its own aria-label). */}
      <span className="sr-only">{ariaLabel ?? text}</span>
      <span className="inline-flex">
        {letters.map((ch, i) => (
          <Letter
            key={i}
            ch={ch}
            index={i}
            isLast={i === letters.length - 1}
            broken={broken.has(i)}
            reduce={reduce}
            onToggle={toggle}
          />
        ))}
      </span>
    </span>
  );
}
