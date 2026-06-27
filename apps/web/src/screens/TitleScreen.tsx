import { useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { GhostText } from '@/components/GhostText';
import { Button } from '@/components/Button';

interface TitleScreenProps {
  onStart: () => void;
  personalBest?: number | null;
}

export function TitleScreen({ onStart, personalBest = null }: TitleScreenProps) {
  const reduce = useReducedMotion();

  // Space / Enter starts from the title (focus-independent).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: reduce ? 0 : 0.2 },
    },
  };
  const item: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      };

  return (
    <motion.section
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-9 px-6 py-14 text-center"
      initial="hidden"
      animate="show"
      exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
      variants={container}
    >
      {/* Eyebrow — a booth "rec" light; introduces the red LED */}
      <motion.div
        variants={item}
        className="flex items-center gap-2.5 font-mono text-[0.7rem] uppercase tracking-[0.35em] text-steel"
      >
        <span className="relative flex h-2 w-2">
          <motion.span
            className="inline-flex h-2 w-2 rounded-full bg-led-red shadow-[0_0_0.6em_var(--color-led-red)]"
            animate={reduce ? undefined : { opacity: [1, 0.25, 1] }}
            transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
        Singleplayer
      </motion.div>

      {/* Wordmark — boots like an LED display */}
      <motion.div variants={item} className="flex flex-col items-center gap-2">
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0.25, 1, 0.55, 1] }}
          transition={
            reduce ? undefined : { duration: 1, times: [0, 0.2, 0.34, 0.5, 0.72, 1], delay: 0.15 }
          }
        >
          <GhostText
            value="GETCLOCKED"
            variant="display"
            color="green"
            ariaLabel="getclocked dot io"
            className="text-[clamp(1.65rem,8.5vw,4.25rem)]"
          />
        </motion.div>
        <span className="font-mono text-[0.7rem] tracking-[0.55em] text-led-amber/80">.IO</span>
      </motion.div>

      {/* Teaser clock in a recessed screen */}
      <motion.div variants={item} className="led-screen rounded-2xl border border-seam px-7 py-4">
        <motion.div
          animate={reduce ? undefined : { opacity: [0.82, 1, 0.82] }}
          transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <GhostText
            value="00:00:00"
            variant="led"
            color="green"
            ariaLabel=""
            className="text-[clamp(1.6rem,9vw,2.9rem)] tracking-wider"
          />
        </motion.div>
      </motion.div>

      <motion.p
        variants={item}
        className="max-w-xs text-balance text-sm leading-relaxed text-steel"
      >
        Two beeps mark a hidden interval. Reproduce it blind — seven rounds, one verdict on your
        sense of time.
      </motion.p>

      <motion.div variants={item} className="flex flex-col items-center gap-3">
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.035, 1] }}
          transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Button variant="amber" size="lg" onClick={onStart} aria-label="Start game">
            Tap in
          </Button>
        </motion.div>
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-steel-dim">
          tap or press space
        </span>
      </motion.div>

      {personalBest != null && (
        <motion.div
          variants={item}
          className="font-mono text-xs tracking-[0.3em] text-led-amber/80"
        >
          BEST {personalBest.toFixed(1)}
        </motion.div>
      )}
    </motion.section>
  );
}
