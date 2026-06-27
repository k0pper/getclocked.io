export type LedColor = 'green' | 'amber' | 'red';

/** Map round/game points (0–10) to a scoreboard LED colour. */
export function scoreColor(points: number): LedColor {
  if (points >= 6) return 'green';
  if (points >= 3.5) return 'amber';
  return 'red';
}

export const LED_TEXT: Record<LedColor, string> = {
  green: 'text-led-green',
  amber: 'text-led-amber',
  red: 'text-led-red',
};

/* ── Continuous performance colour (red → amber → green) ──────────────────────
   For a single guess we want a smooth ramp, not the 3-bucket scoreboard colour:
   the closer the guess, the greener. Hue 0 (red) → 138 (green), eased so the
   middle leans through amber/orange rather than yellow-green. */
function perfHue(points: number): number {
  const t = Math.max(0, Math.min(10, points)) / 10;
  return Math.pow(t, 1.35) * 138;
}

/** CSS colour for a 0–10 score on the red→green performance ramp. */
export function perfColor(points: number): string {
  return `hsl(${perfHue(points).toFixed(1)} 88% 60%)`;
}

/** Matching LED bloom (text/box-shadow) for {@link perfColor}. */
export function perfGlow(points: number): string {
  const h = perfHue(points).toFixed(1);
  return [
    `0 0 0.04em hsl(${h} 88% 72%)`,
    `0 0 0.35em hsl(${h} 88% 60% / 0.6)`,
    `0 0 1.1em hsl(${h} 88% 60% / 0.4)`,
  ].join(', ');
}
