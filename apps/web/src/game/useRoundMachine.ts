import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initGame,
  gameReducer,
  ms,
  seed as toSeed,
  type GameState,
  type RoundResult,
} from '@getclocked/game-core';
import { audio } from '@/audio/engine';
import type { LEDClockHandle } from '@/components/LEDClock';
import type { BuzzerState } from '@/components/Buzzer';
import { INTRO_MS, MAX_GUESS_MS, MIN_TAP_GAP_MS, PRE_PROMPT_MS } from '@/lib/constants';

export type Phase = 'idle' | 'intro' | 'target' | 'prompt' | 'reproduce' | 'result' | 'done';

export interface RoundMachine {
  phase: Phase;
  round: number; // 1-based
  totalRounds: number;
  completed: number;
  scores: number[];
  buzzerState: BuzzerState;
  result: RoundResult | null;
  interrupted: boolean;
  clockRef: React.RefObject<LEDClockHandle | null>;
  onBuzzerTap: (ts: number) => void;
  onContinue: () => void;
}

const SCORE_SUCCESS = 6; // points threshold for the success vs fail stinger

/**
 * Orchestrates one game: the phase machine, the audio-clock beep pair, the LED
 * clock ignition, the buzzer measurement, and the void-and-replay edge cases.
 *
 * The pure game-core reducer owns scoring/progression; this hook owns time.
 */
export function useRoundMachine(
  seedValue: number,
  onComplete: (game: GameState) => void,
): RoundMachine {
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [result, setResult] = useState<RoundResult | null>(null);
  const [interrupted, setInterrupted] = useState(false);

  const clockRef = useRef<LEDClockHandle | null>(null);
  const gameRef = useRef<GameState | null>(null);
  if (gameRef.current === null) gameRef.current = initGame(toSeed(seedValue));

  const phaseRef = useRef<Phase>('idle');
  const startTsRef = useRef(0);
  const aliveRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Transition helper — updates the ref synchronously (so taps never read a
  // stale phase) and the state (for rendering).
  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Void the current round and re-run it (same target). Used on timeout / when
  // the tab is hidden mid-round.
  const replayRound = useCallback(() => {
    setInterrupted(true);
    setResult(null);
    clockRef.current?.clear();
    goPhase('intro');
  }, [goPhase]);

  // Boot: make sure audio is live (the Start gesture already kicked it off),
  // then begin the first round.
  useEffect(() => {
    aliveRef.current = true;
    // Proceed even if audio init fails (e.g. no output device) — sound is
    // feedback only, never a gate on the game.
    void audio
      .start()
      .catch(() => undefined)
      .finally(() => {
        if (aliveRef.current) goPhase('intro');
      });
    return () => {
      aliveRef.current = false;
    };
  }, [goPhase]);

  // Per-phase entry effects (the time-driven transitions). Cleanup cancels any
  // pending timers when the phase changes or the component unmounts.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    if (phase === 'intro') {
      const t = window.setTimeout(() => goPhase('target'), INTRO_MS);
      return () => clearTimeout(t);
    }

    if (phase === 'target') {
      setInterrupted(false);
      setResult(null);
      clockRef.current?.clear();
      const target = game.targets[game.current];
      if (target == null) {
        goPhase('done');
        return;
      }
      const { startInMs, stopInMs } = audio.scheduleTargetBeeps(target);
      const t1 = window.setTimeout(() => clockRef.current?.ignite(target), startInMs);
      const t2 = window.setTimeout(() => goPhase('prompt'), stopInMs + PRE_PROMPT_MS);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (phase === 'reproduce') {
      const t = window.setTimeout(() => replayRound(), MAX_GUESS_MS);
      return () => clearTimeout(t);
    }

    if (phase === 'done') {
      onCompleteRef.current(game);
    }

    return undefined;
  }, [phase, goPhase, replayRound]);

  // Void + replay if the tab is hidden during a timing-critical phase.
  useEffect(() => {
    const onVis = () => {
      const p = phaseRef.current;
      if (document.hidden && (p === 'target' || p === 'prompt' || p === 'reproduce')) {
        replayRound();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [replayRound]);

  const onBuzzerTap = useCallback(
    (ts: number) => {
      const p = phaseRef.current;
      const game = gameRef.current;
      if (!game) return;

      if (p === 'prompt') {
        startTsRef.current = ts;
        audio.play('tap');
        clockRef.current?.ignite();
        goPhase('reproduce');
        return;
      }

      if (p === 'reproduce') {
        const raw = ts - startTsRef.current;
        if (raw < MIN_TAP_GAP_MS) return; // anti-bounce
        audio.play('tap');
        const guessMs = ms(Math.min(raw, MAX_GUESS_MS));
        const next = gameReducer(game, { type: 'RECORD_GUESS', guessMs });
        gameRef.current = next;
        const r = next.results[next.results.length - 1] ?? null;
        setResult(r);
        if (r) {
          clockRef.current?.reveal(r.targetMs);
          audio.play(r.points >= SCORE_SUCCESS ? 'success' : 'fail');
        }
        goPhase('result');
      }
    },
    [goPhase],
  );

  const onContinue = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    setResult(null);
    goPhase(game.status === 'complete' ? 'done' : 'intro');
  }, [goPhase]);

  const game = gameRef.current;
  const totalRounds = game ? game.targets.length : 0;
  const round = result ? result.index + 1 : Math.min((game ? game.current : 0) + 1, totalRounds);
  const completed = game ? game.results.length : 0;
  const scores = game ? game.results.map((r) => r.points) : [];
  const buzzerState: BuzzerState =
    phase === 'prompt'
      ? 'armed'
      : phase === 'reproduce'
        ? 'live'
        : phase === 'result'
          ? 'disabled'
          : 'idle';

  return {
    phase,
    round,
    totalRounds,
    completed,
    scores,
    buzzerState,
    result,
    interrupted,
    clockRef,
    onBuzzerTap,
    onContinue,
  };
}
