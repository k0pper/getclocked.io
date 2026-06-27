import { useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { GhostText } from '@/components/GhostText';
import { NeonSign } from '@/components/NeonSign';
import { Button } from '@/components/Button';
import { CameraGlyph, SpaceKeyIcon, TerminalGlyph } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';

interface TitleScreenProps {
  onStart: () => void;
  onLeaderboard: () => void;
  /** True while the server seed is being fetched (keeps the start gesture honest). */
  starting?: boolean;
  personalBest?: number | null;
}

export function TitleScreen({
  onStart,
  onLeaderboard,
  starting = false,
  personalBest = null,
}: TitleScreenProps) {
  const reduce = useReducedMotion();
  const { username, logout } = useAuth();

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
      {/* Wordmark — a broken neon sign, a couple of tubes flickering out */}
      <motion.div variants={item} className="flex flex-col items-center gap-2">
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0.25, 1, 0.55, 1] }}
          transition={
            reduce ? undefined : { duration: 1, times: [0, 0.2, 0.34, 0.5, 0.72, 1], delay: 0.15 }
          }
        >
          <NeonSign
            text="GETCLOCKED"
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

      <motion.div variants={item} className="flex flex-col items-center gap-3">
        <p className="text-sm uppercase tracking-[0.18em] text-steel">
          Two beeps — guess the time
        </p>
        <div className="flex items-center gap-5">
          <a
            href="https://instagram.com/k.opper"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 font-mono text-xs tracking-wide text-steel-dim transition-[color,filter] hover:text-led-green hover:[filter:drop-shadow(0_0_0.5em_color-mix(in_oklab,var(--color-led-green)_60%,transparent))]"
          >
            <CameraGlyph className="h-4 w-4" />
            k.opper
          </a>
          <a
            href="https://github.com/k0pper"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 font-mono text-xs tracking-wide text-steel-dim transition-[color,filter] hover:text-led-green hover:[filter:drop-shadow(0_0_0.5em_color-mix(in_oklab,var(--color-led-green)_60%,transparent))]"
          >
            <TerminalGlyph className="h-4 w-4" />
            k0pper
          </a>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col items-center gap-3">
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.035, 1] }}
          transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Button
            variant="amber"
            size="lg"
            onClick={onStart}
            disabled={starting}
            aria-label="Start game"
            className="w-64"
          >
            {starting ? 'Starting…' : 'Tap in'}
            {!starting && <SpaceKeyIcon className="-mr-1 ml-0.5 opacity-80" />}
          </Button>
        </motion.div>
        {/* Same keycap as "Tap in", but visibly inert: greyed, desaturated and
            flat (no raised lip), so it reads as not-yet-pressable. */}
        <Button
          variant="amber"
          size="lg"
          disabled
          aria-label="Multiplayer — coming soon"
          className="w-64 opacity-55 grayscale-[0.4] !shadow-none disabled:opacity-55"
        >
          Multiplayer
          <span className="rounded-full border border-void/40 px-2 py-0.5 text-[0.6rem] tracking-[0.2em] text-void/80">
            Soon
          </span>
        </Button>
      </motion.div>

      {personalBest != null && (
        <motion.div
          variants={item}
          className="font-mono text-xs tracking-[0.3em] text-led-amber/80"
        >
          BEST {personalBest.toFixed(1)}
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onLeaderboard}>
          Leaderboard
        </Button>
        {username && (
          <span className="font-mono text-[0.7rem] text-steel-dim">
            Signed in as <span className="text-steel">{username}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="ml-2 underline underline-offset-2 hover:text-steel"
            >
              Sign out
            </button>
          </span>
        )}
      </motion.div>
    </motion.section>
  );
}
