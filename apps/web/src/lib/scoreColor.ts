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
