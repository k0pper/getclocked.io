import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  formatSeconds,
  formatSignedMs,
  roundRating,
  type GameState,
  type RoundResult,
} from '@getclocked/game-core';
import { LEDClock } from '@/components/LEDClock';
import { Buzzer } from '@/components/Buzzer';
import { Button } from '@/components/Button';
import { RoundPips } from '@/components/RoundPips';
import { useRoundMachine, type Phase } from '@/game/useRoundMachine';
import { scoreColor, LED_TEXT } from '@/lib/scoreColor';
import { cn } from '@/lib/utils';

interface GameScreenProps {
  seed: number;
  onComplete: (game: GameState) => void;
  onQuit: () => void;
}

function caption(phase: Phase, round: number, interrupted: boolean): string {
  switch (phase) {
    case 'intro':
      return interrupted ? 'Replay' : `Round ${round}`;
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
  const cap = caption(m.phase, m.round, m.interrupted);
  const clockColor = m.result ? scoreColor(m.result.points) : 'green';
  const lastRound = m.completed >= m.totalRounds;

  return (
    <motion.section
      className="flex min-h-dvh flex-col px-6 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-[0.25em] text-steel">
          ROUND {m.round}
          <span className="text-steel-dim">/{m.totalRounds}</span>
        </span>
        <button
          type="button"
          onClick={onQuit}
          className="font-mono text-xs uppercase tracking-[0.2em] text-steel-dim transition-colors hover:text-steel"
        >
          Quit
        </button>
      </header>

      <div className="mt-5 flex justify-center">
        <RoundPips total={m.totalRounds} completed={m.completed} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7">
        <div className="flex h-7 items-center" aria-live="polite">
          <AnimatePresence mode="wait">
            {cap && (
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
            )}
          </AnimatePresence>
        </div>

        <LEDClock ref={m.clockRef} color={clockColor} reducedMotion={reduce} />

        <div className="flex min-h-[7rem] w-full items-start justify-center">
          <AnimatePresence mode="wait">
            {m.phase === 'result' && m.result && (
              <ResultPanel key="result" result={m.result} reduce={reduce} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex min-h-[15rem] items-center justify-center">
        <AnimatePresence mode="wait">
          {m.phase === 'result' ? (
            <motion.div
              key="continue"
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Button variant="amber" size="lg" onClick={m.onContinue}>
                {lastRound ? 'See results' : 'Next round'}
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
  const color = scoreColor(result.points);
  const dir = result.deltaMs > 0 ? 'too slow' : result.deltaMs < 0 ? 'too fast' : 'dead on';

  return (
    <motion.div
      className="flex flex-col items-center gap-3 text-center"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-end gap-8 font-mono">
        <Stat label="Target" value={`${formatSeconds(result.targetMs)}s`} className="text-led-amber" />
        <Stat label="You" value={`${formatSeconds(result.guessMs)}s`} className="text-bone" />
      </div>
      <p className="font-mono text-xs tracking-widest text-steel">
        {formatSignedMs(result.deltaMs)} ms · {dir}
      </p>
      <div className="flex items-center gap-3">
        <span className={cn('font-sans text-3xl font-bold tabular-nums', LED_TEXT[color])}>
          {result.points.toFixed(1)}
        </span>
        <span className={cn('font-mono text-sm uppercase tracking-[0.2em]', LED_TEXT[color])}>
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
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-steel-dim">{label}</span>
      <span className={cn('text-lg', className)}>{value}</span>
    </div>
  );
}
