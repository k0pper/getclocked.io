/**
 * App-layer timing & input constants (the real-time stuff that lives outside
 * the pure game-core). All values are plain numbers of milliseconds unless
 * noted; tune freely — none of these change scoring, only feel.
 */

/** Round intro card shown before the target beeps. */
export const INTRO_MS = 1200;

/** Lead-in on the audio clock before a scheduled target beep fires. */
export const LEAD_IN_MS = 240;

/** How long the LED "ignites" (counts up, visible) before fading to dark. */
export const IGNITION_MS = 440;

/** For very short targets the ignition compresses to this fraction of T. */
export const IGNITION_MAX_FRACTION = 0.45;

/** Fade duration of the ignition once the visible window ends. */
export const IGNITION_FADE_MS = 260;

/** Cross-channel de-dupe: a pointer + keyboard from one physical press. */
export const COALESCE_MS = 60;

/** Anti-bounce: minimum gap between the start tap and the stop tap. */
export const MIN_TAP_GAP_MS = 30;

/** Hard cap on a reproduction; longer ⇒ void + replay the round. */
export const MAX_GUESS_MS = 12_000;

/** Beat after the stop beep before the player is prompted to reproduce. */
export const PRE_PROMPT_MS = 550;

/** Beat shown on the round-result reveal before the player can continue. */
export const REVEAL_MIN_MS = 700;

/** localStorage key for the personal best (versioned so we can migrate). */
export const PERSONAL_BEST_KEY = 'getclocked:pb:v1';
