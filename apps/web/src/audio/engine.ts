import type * as ToneNS from 'tone';
import { LEAD_IN_MS } from '@/lib/constants';

export type SoundName =
  | 'start'
  | 'stop'
  | 'tap'
  | 'count'
  | 'success'
  | 'fail'
  | 'zap'
  | 'creak'
  | 'topple';

/**
 * Single shared audio engine (Tone.js, lazily imported on first start so it
 * stays out of the initial bundle).
 *
 * Sounds are pure feedback — interval measurement uses performance.now(). The
 * two target beeps are scheduled as a pair on the audio clock
 * (`scheduleTargetBeeps`) so the gap the player hears equals the target T
 * exactly, immune to look-ahead and background-tab throttling.
 */
class AudioEngine {
  private started = false;
  private tone: typeof ToneNS | null = null;
  private master: ToneNS.Volume | null = null;
  private beepStart: ToneNS.Synth | null = null;
  private beepStop: ToneNS.Synth | null = null;
  private thock: ToneNS.MembraneSynth | null = null;
  private tick: ToneNS.Synth | null = null;
  private chime: ToneNS.Synth | null = null;
  private buzz: ToneNS.Synth | null = null;
  // Easter-egg: an electrical fizzle (filtered noise) for a tube breaking, and
  // a soft metallic creak (detuned sine) for the loose-screw "D" swinging.
  private fizzle: ToneNS.NoiseSynth | null = null;
  private creak: ToneNS.Synth | null = null;
  // Easter-egg: the "O" topples like a heavy door — a deep slam — and the whole
  // sign judders with a fast-tremolo neon buzz on impact.
  private slam: ToneNS.MembraneSynth | null = null;
  private neon: ToneNS.Synth | null = null;

  get isStarted(): boolean {
    return this.started;
  }

  /** Lazy-load Tone, resume the AudioContext, and build the instruments. */
  async start(): Promise<void> {
    if (this.started) return;
    const Tone = await import('tone');
    await Tone.start();
    const master = new Tone.Volume(-5).toDestination();

    this.tone = Tone;
    this.master = master;
    // The start/stop beeps and the buzzer thock carry the game — they get a
    // per-voice level boost and longer envelopes so they land with weight.
    this.beepStart = new Tone.Synth({
      volume: 5,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.006, decay: 0.22, sustain: 0.04, release: 0.18 },
    }).connect(master);
    this.beepStop = new Tone.Synth({
      volume: 5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.006, decay: 0.26, sustain: 0.04, release: 0.22 },
    }).connect(master);
    this.thock = new Tone.MembraneSynth({
      volume: 6,
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.04 },
    }).connect(master);
    this.tick = new Tone.Synth({
      volume: 1,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.1, sustain: 0, release: 0.06 },
    }).connect(master);
    this.chime = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.18, sustain: 0, release: 0.12 },
    }).connect(master);
    this.buzz = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.22, sustain: 0, release: 0.12 },
    }).connect(master);
    // Electrical fizzle: a short burst of band-passed noise — the "spit" of a
    // neon tube losing current. Kept quiet so it reads as a crackle, not static.
    this.fizzle = new Tone.NoiseSynth({
      volume: -10,
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.05 },
    }).connect(new Tone.Filter({ type: 'bandpass', frequency: 2600, Q: 1.2 }).connect(master));
    // Metallic creak: a soft, low triangle that bends pitch as the screw gives.
    this.creak = new Tone.Synth({
      volume: -6,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0, release: 0.18 },
    }).connect(master);
    // Heavy door slam: a deep, fast-decaying membrane boom for the O hitting the
    // floor — lots of pitch drop, no sustain, like a slab landing.
    this.slam = new Tone.MembraneSynth({
      volume: 4,
      pitchDecay: 0.09,
      octaves: 7,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.12 },
    }).connect(master);
    // Electric neon judder: a low sawtooth hum through a bandpass, its amplitude
    // chopped by a fast tremolo so it reads as a buzzing sign shaken by the
    // impact rather than a clean tone.
    const neonShake = new Tone.Tremolo({ frequency: 21, depth: 0.9 }).connect(master).start();
    this.neon = new Tone.Synth({
      volume: -13,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.004, decay: 0.18, sustain: 0.3, release: 0.22 },
    }).connect(new Tone.Filter({ type: 'bandpass', frequency: 440, Q: 2.2 }).connect(neonShake));

    this.started = true;
  }

  /**
   * Schedule START and STOP target beeps `durationMs` apart on the audio clock.
   * Returns when each fires (ms from now) so the UI can align its ignition with
   * the audible start and time the phase change.
   */
  scheduleTargetBeeps(durationMs: number): { startInMs: number; stopInMs: number } {
    if (!this.started || !this.tone || !this.beepStart || !this.beepStop) {
      return { startInMs: LEAD_IN_MS, stopInMs: LEAD_IN_MS + durationMs };
    }
    const now = this.tone.getContext().currentTime;
    const startAt = now + LEAD_IN_MS / 1000;
    const stopAt = startAt + durationMs / 1000;
    this.beepStart.triggerAttackRelease('A5', 0.24, startAt);
    this.beepStop.triggerAttackRelease('E5', 0.28, stopAt);
    return { startInMs: LEAD_IN_MS, stopInMs: LEAD_IN_MS + durationMs };
  }

  /** Fire a one-shot sound immediately (low-latency feedback). */
  play(name: SoundName): void {
    if (!this.started || !this.tone) return;
    const t = this.tone.getContext().currentTime;
    switch (name) {
      case 'start':
        this.beepStart?.triggerAttackRelease('A5', 0.24, t);
        break;
      case 'stop':
        this.beepStop?.triggerAttackRelease('E5', 0.28, t);
        break;
      case 'tap':
        this.thock?.triggerAttackRelease('C2', 0.18, t);
        break;
      case 'count':
        this.tick?.triggerAttackRelease('E5', 0.07, t);
        break;
      case 'success':
        this.chime?.triggerAttackRelease('E5', 0.12, t);
        this.chime?.triggerAttackRelease('A5', 0.18, t + 0.12);
        break;
      case 'fail':
        this.buzz?.triggerAttackRelease('A3', 0.18, t);
        this.buzz?.triggerAttackRelease('E3', 0.22, t + 0.13);
        break;
      case 'zap':
        // Two close crackles + a dying high blip, like a tube popping out.
        this.fizzle?.triggerAttackRelease(0.07, t);
        this.fizzle?.triggerAttackRelease(0.05, t + 0.06);
        this.buzz?.triggerAttackRelease('A6', 0.05, t + 0.01);
        break;
      case 'creak':
        // A downward bend — the screw giving way and the letter swinging down.
        this.creak?.triggerAttackRelease('G3', 0.3, t);
        this.creak?.frequency.exponentialRampTo('D3', 0.4, t);
        break;
      case 'topple': {
        // The O tips over like a heavy door and slams; the sign judders with an
        // electric buzz on impact. Timed to the visual: a low hinge-creak as it
        // goes over, then a slam + neon shake at ~0.5s when it lands.
        this.creak?.triggerAttackRelease('C3', 0.5, t);
        this.creak?.frequency.exponentialRampTo('F2', 0.5, t);
        const land = t + 0.5;
        // The slam itself: a deep boom that drops in pitch like dead weight.
        this.slam?.triggerAttackRelease('C1', 0.4, land);
        // The sign shaking: a buzzing neon hum plus a few electrical crackles
        // riding the judder.
        this.neon?.triggerAttackRelease('A1', 0.5, land);
        this.fizzle?.triggerAttackRelease(0.07, land);
        this.fizzle?.triggerAttackRelease(0.05, land + 0.13);
        this.fizzle?.triggerAttackRelease(0.04, land + 0.26);
        break;
      }
    }
  }

  setMuted(muted: boolean): void {
    if (this.master) this.master.mute = muted;
  }
}

/** The app-wide audio engine. */
export const audio = new AudioEngine();
