import { useState } from 'react';
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  type Easing,
} from 'motion/react';
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
    const breaking = !broken;
    onToggle(index);
    // A click is a user gesture, so it's safe to lazily start audio here.
    void (async () => {
      try {
        await audio.start();
        if (ch === 'O' && breaking) {
          // The O doesn't pop like a tube — it falls like a door and the sign
          // shakes (slam + electric neon judder, timed to the visual impact).
          audio.play('topple');
        } else {
          audio.play('zap');
          if (isLast && breaking) audio.play('creak');
        }
      } catch {
        /* never let audio failure break the interaction */
      }
    })();
  };

  // The O doesn't die like the others — when clicked it gets shoved over and
  // falls away from the screen (a 3D topple, handled below), so it stays lit on
  // the way down instead of flickering out.
  const topple = ch === 'O' && broken;

  // The lit tube's animation target. Broken → dark (the ghost shows through),
  // except the toppling O which stays lit; lit → its ambient flicker (or steady
  // if reduced / no flicker assigned).
  const litAnimate = broken
    ? topple
      ? { opacity: 1 }
      : reduce
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

  // The dangling-D, as a physical object: hinged at the bottom-left "screw", the
  // tube swings down under gravity and comes to rest hanging upside-down (180°).
  // A spring (not scripted keyframes) does the falling, so it overshoots and
  // rebounds with real momentum; under-damped so it visibly wobbles before
  // settling. Repairing springs it back upright a touch stiffer/quicker.
  // Rests a touch shy of a full 180° (counter-clockwise) because the D's bowl
  // sits to one side of the screw — its weight won't hang dead-straight.
  const dangle = isLast && broken;
  // Pivot: the D hinges at its bottom-left screw; the toppling O hinges on its
  // whole base, like a wall meeting the floor — at the glyph's baseline (~86%),
  // not the inline box bottom, so it doesn't sink below the other letters.
  const pivot = topple ? '50% 86%' : '12% 84%';
  const dropAnimate = dangle
    ? { rotate: 148, rotateX: 0 }
    : topple
      ? // Keyframes (not a spring) so the fall can accelerate like gravity: a
        // slow tip past the balance point, a fast plunge, then a hard landing
        // that overshoots and rebounds twice before settling at rest.
        { rotate: 0, rotateX: [0, 8, 86, 79, 83, 82] }
      : { rotate: 0, rotateX: 0 };
  const dropTransition = reduce
    ? { duration: 0 }
    : dangle
      ? { type: 'spring' as const, stiffness: 36, damping: 5.2, mass: 1.25 }
      : topple
        ? {
            duration: 1.05,
            times: [0, 0.18, 0.52, 0.68, 0.84, 1],
            // Per-segment: ease-in through the accelerating fall, then easing
            // out of each diminishing bounce — a heavy object coming to rest.
            ease: ['easeIn', 'easeIn', 'easeOut', 'easeInOut', 'easeOut'] as Easing[],
          }
        : { type: 'spring' as const, stiffness: 130, damping: 15 };

  // …and once hung it never fully stills — a faint, slow sway like a loose sign
  // caught in a draft, layered on top of the resting angle. Starts after the
  // fall has mostly played out.
  const swayAnimate = dangle && !reduce ? { rotate: [-2.4, 2.4] } : { rotate: 0 };
  const swayTransition =
    dangle && !reduce
      ? {
          duration: 2.8,
          repeat: Infinity,
          repeatType: 'mirror' as const,
          ease: 'easeInOut' as const,
          delay: 1.3,
        }
      : { duration: 0.3 };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${broken ? 'repair' : 'break'} letter ${ch}`}
      className={cn(
        'relative inline-block cursor-pointer appearance-none bg-transparent p-0',
        'origin-[12%_84%] align-baseline focus-visible:outline-none',
      )}
    >
      {/* Outer: the perpetual idle sway. Inner: the gravity drop to upside-down.
          Both hinge at the same screw so the two rotations compose about one
          pivot — a hanging letter that keeps swaying. */}
      <motion.span
        className="relative inline-block"
        style={{ transformOrigin: pivot }}
        animate={swayAnimate}
        transition={swayTransition}
      >
        <motion.span
          className="relative inline-block"
          style={{ transformOrigin: pivot, transformPerspective: 520 }}
          animate={dropAnimate}
          transition={dropTransition}
        >
          {/* The loose screw glint at the pivot — only on the dangling D */}
          {isLast && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute bottom-[16%] left-[12%] h-1 w-1 rounded-full"
              style={{
                background: 'radial-gradient(circle, #fff 0%, #ffc53d 60%, transparent 75%)',
              }}
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
 * a shower of sparks) and click again to repair it. Two letters break character:
 * the final "D" loses its top screw and swings down under gravity to hang
 * upside-down from its remaining screw, never quite settling; the "O" gets shoved
 * over and topples away from the screen in 3D, like a wall you just pushed. The
 * whole word still reads as `ariaLabel` to screen readers via a labelled wrapper;
 * the per-letter buttons add break/repair controls on top.
 */
export function NeonSign({ text, className, ariaLabel }: NeonSignProps) {
  const reduce = useReducedMotion() ?? false;
  const letters = [...text];
  const [broken, setBroken] = useState<ReadonlySet<number>>(() => new Set());
  // Imperative control of the whole sign's jolt when the O lands (see toggle).
  const shake = useAnimationControls();

  const toggle = (index: number) => {
    // The O toppling over hits the ground hard; the whole sign judders from the
    // impact. Fire it only on the *break* (not the repair), and time the delay
    // to the O's plunge landing (~0.5s into its fall). Skip for reduced motion.
    const breakingO = letters[index] === 'O' && !broken.has(index);
    if (breakingO && !reduce) {
      void shake.start({
        x: [0, -5, 4, -3, 2, -1, 0],
        y: [0, 3, -2, 2, -1, 1, 0],
        rotate: [0, -0.6, 0.5, -0.3, 0.2, 0, 0],
        transition: { delay: 0.5, duration: 0.5, ease: 'easeOut' },
      });
    }
    setBroken((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <span
      className={cn('relative inline-flex font-display leading-none text-led-green', className)}
    >
      {/* One labelled node carries the wordmark's meaning to assistive tech so
          the sign still reads as a whole word; the per-letter buttons below add
          break/repair controls (each with its own aria-label). */}
      <span className="sr-only">{ariaLabel ?? text}</span>
      <motion.span className="inline-flex" animate={shake}>
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
      </motion.span>
    </span>
  );
}
