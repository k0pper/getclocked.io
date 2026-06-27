import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  formatSeconds,
  ms,
  roundRating,
  type GameState,
  type RoundResult,
} from '@getclocked/game-core';
import { LEDClock } from '@/components/LEDClock';
import { Buzzer } from '@/components/Buzzer';
import { Button } from '@/components/Button';
import { RoundPips } from '@/components/RoundPips';
import { GhostText } from '@/components/GhostText';
import { useRoundMachine, type Phase } from '@/game/useRoundMachine';
import { scoreColor, perfColor, perfGlow } from '@/lib/scoreColor';
import { cn } from '@/lib/utils';

interface GameScreenProps {
  seed: number;
  onComplete: (game: GameState) => void;
  onQuit: () => void;
}

function caption(phase: Phase): string {
  switch (phase) {
    case 'target':
      return 'Listen';
    case 'prompt':
      return 'Reproduce it';
    case 'reproduce':
      return 'Now…';
    default:
      return '';
  }
}

export function GameScreen({ seed, onComplete, onQuit }: GameScreenProps) {
  const reduce = !!useReducedMotion();
  const m = useRoundMachine(seed, onComplete);
  const cap = caption(m.phase);
  const clockColor = m.result ? scoreColor(m.result.points) : 'green';
  const lastRound = m.completed >= m.totalRounds;

  return (
    <motion.section
      className="flex min-h-dvh flex-col px-6 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="flex items-center justify-end">
        <button
          type="button"
          onClick={onQuit}
          className="font-mono text-xs uppercase tracking-[0.2em] text-steel-dim transition-colors hover:text-steel"
        >
          Quit
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex h-14 items-center justify-center" aria-live="polite">
          <AnimatePresence mode="wait">
            {m.phase === 'intro' ? (
              <motion.p
                key="ready"
                className="led-glow-amber font-mono text-base uppercase tracking-[0.5em] text-led-amber"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {m.interrupted ? 'Replay — get ready' : 'Get ready'}
              </motion.p>
            ) : cap ? (
              <motion.p
                key={cap}
                className="font-mono text-sm uppercase tracking-[0.35em] text-steel"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {cap}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Round indicator sits just above the clock with a small gap. */}
        <div className="flex flex-col items-center gap-3">
          <RoundPips total={m.totalRounds} scores={m.scores} />
          {/* The pre-roll count sits *on* the clock face, counting the player in. */}
          <div className="relative">
            <LEDClock ref={m.clockRef} color={clockColor} reducedMotion={reduce} />
            <AnimatePresence>
              {m.countdown != null && (
                <motion.div
                  key={m.countdown}
                  className="pointer-events-none absolute inset-0 grid place-items-center"
                  initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 1.18 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.82 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <span
                    className="pointer-events-none absolute h-32 w-32 rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(4,5,10,0.85) 38%, transparent 72%)',
                    }}
                  />
                  <GhostText
                    value={String(m.countdown)}
                    variant="led"
                    color="amber"
                    ariaLabel={`Get ready — ${m.countdown}`}
                    className="relative text-[clamp(3rem,16vw,5rem)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex min-h-[14rem] w-full items-start justify-center">
          <AnimatePresence mode="wait">
            {m.phase === 'result' && m.result && (
              <ResultPanel key="result" result={m.result} reduce={reduce} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex min-h-[15rem] items-center justify-center">
        <AnimatePresence mode="wait">
          {m.phase === 'result' && lastRound ? (
            // Final round: no click — the machine rolls to the results screen.
            <motion.p
              key="tallying"
              className="font-mono text-sm uppercase tracking-[0.4em] text-steel"
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: [0.4, 1, 0.4] }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={
                reduce
                  ? undefined
                  : { duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }
              }
            >
              Tallying…
            </motion.p>
          ) : m.phase === 'result' ? (
            <motion.div
              key="continue"
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Button variant="amber" size="lg" onClick={m.onContinue}>
                Next round
                <span aria-hidden className="-mr-1 text-[0.85em]">
                  ▸
                </span>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="buzzer"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Buzzer state={m.buzzerState} onTap={m.onBuzzerTap} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function ResultPanel({ result, reduce }: { result: RoundResult; reduce: boolean }) {
  const col = perfColor(result.points);
  const glow = perfGlow(result.points);
  const perfStyle = { color: col, textShadow: glow };

  const early = result.deltaMs < 0;
  const dir = result.deltaMs === 0 ? 'PERFECT' : early ? 'TOO EARLY' : 'TOO LATE';
  const sign = result.deltaMs < 0 ? '−' : result.deltaMs > 0 ? '+' : '';
  const deltaSeconds = `${sign}${formatSeconds(ms(Math.abs(result.deltaMs)))}s`;

  // Dot position on the EARLY—PERFECT—LATE scale: signed relative error, where
  // ±50% off pegs the ends. Centre (50%) is a dead-on guess.
  const rel = result.targetMs > 0 ? result.deltaMs / result.targetMs : 0;
  const pos = Math.max(-1, Math.min(1, rel / 0.5));
  const leftPct = 50 + pos * 50;

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center gap-7 py-2 text-center"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-end justify-center gap-14 font-mono">
        <Stat
          label="The clock ran"
          value={`${formatSeconds(result.targetMs)}s`}
          className="text-led-green led-glow-green"
        />
        <Stat label="You guessed" value={`${formatSeconds(result.guessMs)}s`} style={perfStyle} />
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <p className="font-mono text-sm tracking-widest tabular-nums" style={perfStyle}>
          {deltaSeconds} · {dir}
        </p>
        <div className="relative h-1.5 w-full rounded-full bg-void-deep">
          <span
            className="absolute inset-0 rounded-full opacity-40"
            style={{
              background:
                'linear-gradient(to right, var(--color-led-red), var(--color-led-amber) 28%, var(--color-led-green) 50%, var(--color-led-amber) 72%, var(--color-led-red))',
            }}
          />
          {/* PERFECT centre tick */}
          <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-bone/30" />
          {/* where this guess landed */}
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/30"
            style={{ left: `${leftPct}%`, background: col, boxShadow: glow }}
          />
        </div>
        <div className="flex w-full justify-between font-mono text-[0.6rem] uppercase tracking-[0.18em] text-steel-dim">
          <span>Early</span>
          <span>Perfect</span>
          <span>Late</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-baseline gap-2">
          <span className="font-led text-6xl leading-none tabular-nums" style={perfStyle}>
            {result.points.toFixed(1)}
          </span>
          <span className="font-mono text-base text-steel">/ 10</span>
        </div>
        <span
          className="font-mono text-xs uppercase tracking-[0.25em]"
          style={{ color: col }}
        >
          {roundRating(result.points)}
        </span>
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  className,
  style,
}: {
  label: string;
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-steel-dim">{label}</span>
      <span className={cn('text-lg', className)} style={style}>
        {value}
      </span>
    </div>
  );
}
