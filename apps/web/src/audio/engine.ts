import * as Tone from 'tone';
import { LEAD_IN_MS } from '@/lib/constants';

export type SoundName = 'start' | 'stop' | 'tap' | 'success' | 'fail';

/**
 * Single shared audio engine (Tone.js).
 *
 * Sounds are pure feedback — interval *measurement* uses performance.now().
 * But the two target beeps are scheduled as a pair on the **audio clock**
 * (`scheduleTargetBeeps`), so the gap the player hears equals the target T
 * exactly, immune to Tone's look-ahead and to background-tab timer throttling.
 *
 * Soft by design: triangle/sine oscillators, gentle envelopes — "not too
 * aggressive".
 */
class AudioEngine {
  private started = false;
  private master: Tone.Volume | null = null;
  private beepStart: Tone.Synth | null = null;
  private beepStop: Tone.Synth | null = null;
  private thock: Tone.MembraneSynth | null = null;
  private chime: Tone.Synth | null = null;
  private buzz: Tone.Synth | null = null;

  get isStarted(): boolean {
    return this.started;
  }

  /** Resume the AudioContext + build the instruments. Call from a user gesture. */
  async start(): Promise<void> {
    if (this.started) return;
    await Tone.start();
    const master = new Tone.Volume(-7).toDestination();

    this.master = master;
    this.beepStart = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.006, decay: 0.12, sustain: 0, release: 0.08 },
    }).connect(master);
    this.beepStop = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.006, decay: 0.16, sustain: 0, release: 0.1 },
    }).connect(master);
    this.thock = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.02 },
    }).connect(master);
    this.chime = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.18, sustain: 0, release: 0.12 },
    }).connect(master);
    this.buzz = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.22, sustain: 0, release: 0.12 },
    }).connect(master);

    this.started = true;
  }

  /**
   * Schedule the START and STOP target beeps `durationMs` apart on the audio
   * clock. Returns when each fires, in ms from now, so the UI can align its
   * visual ignition with the audible start and time the phase change.
   */
  scheduleTargetBeeps(durationMs: number): { startInMs: number; stopInMs: number } {
    if (!this.started || !this.beepStart || !this.beepStop) {
      return { startInMs: LEAD_IN_MS, stopInMs: LEAD_IN_MS + durationMs };
    }
    const now = Tone.getContext().currentTime;
    const startAt = now + LEAD_IN_MS / 1000;
    const stopAt = startAt + durationMs / 1000;
    this.beepStart.triggerAttackRelease('A5', 0.12, startAt);
    this.beepStop.triggerAttackRelease('E5', 0.14, stopAt);
    return { startInMs: LEAD_IN_MS, stopInMs: LEAD_IN_MS + durationMs };
  }

  /** Fire a one-shot sound immediately (low-latency feedback). */
  play(name: SoundName): void {
    if (!this.started) return;
    const t = Tone.getContext().currentTime;
    switch (name) {
      case 'start':
        this.beepStart?.triggerAttackRelease('A5', 0.12, t);
        break;
      case 'stop':
        this.beepStop?.triggerAttackRelease('E5', 0.14, t);
        break;
      case 'tap':
        this.thock?.triggerAttackRelease('C2', 0.1, t);
        break;
      case 'success':
        this.chime?.triggerAttackRelease('E5', 0.12, t);
        this.chime?.triggerAttackRelease('A5', 0.18, t + 0.12);
        break;
      case 'fail':
        this.buzz?.triggerAttackRelease('A3', 0.18, t);
        this.buzz?.triggerAttackRelease('E3', 0.22, t + 0.13);
        break;
    }
  }

  setMuted(muted: boolean): void {
    if (this.master) this.master.mute = muted;
  }
}

/** The app-wide audio engine. */
export const audio = new AudioEngine();
