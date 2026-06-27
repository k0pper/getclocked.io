import type { Ms } from './units';

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
const pad3 = (n: number): string => n.toString().padStart(3, '0');

/**
 * LED stopwatch format `MM:SS:CC` (centiseconds) — what the digital clock shows.
 * e.g. 150ms → "00:00:15", 4213ms → "00:04:21", 10000ms → "00:10:00".
 */
export function formatClock(totalMs: Ms): string {
  const t = Math.max(0, Math.round(totalMs));
  const minutes = Math.floor(t / 60_000);
  const seconds = Math.floor((t % 60_000) / 1000);
  const centis = Math.floor((t % 1000) / 10);
  return `${pad2(minutes)}:${pad2(seconds)}:${pad2(centis)}`;
}

/**
 * Human seconds with millisecond precision for results, e.g. 4213ms → "4.213".
 * No unit suffix — the UI adds "s".
 */
export function formatSeconds(totalMs: Ms): string {
  const t = Math.max(0, Math.round(totalMs));
  const seconds = Math.floor(t / 1000);
  const millis = t % 1000;
  return `${seconds}.${pad3(millis)}`;
}

/**
 * Signed millisecond delta for the reveal, e.g. +142 / -30 / 0.
 * Positive = too late (guess longer than target), negative = too early.
 */
export function formatSignedMs(deltaMs: Ms): string {
  const rounded = Math.round(deltaMs);
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`; // negative already carries '-', zero prints "0"
}
