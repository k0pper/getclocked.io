import { cn } from '@/lib/utils';

type LedColor = 'green' | 'amber' | 'red';

const COLOR: Record<LedColor, { text: string; glow: string }> = {
  green: { text: 'text-led-green', glow: 'led-glow-green' },
  amber: { text: 'text-led-amber', glow: 'led-glow-amber' },
  red: { text: 'text-led-red', glow: 'led-glow-red' },
};

export interface GhostTextProps {
  /** The lit text. */
  value: string;
  /** `led` (DSEG7 digits) or `display` (DSEG14 alphanumerics). */
  variant?: 'led' | 'display';
  color?: LedColor;
  /** Sizing/extra classes for the whole stack. */
  className?: string;
  /** Accessible name; defaults to `value`. Pass `''` to hide decoratively. */
  ariaLabel?: string;
}

/**
 * Renders DSEG text with faint "ghost" segments behind the lit ones — the
 * all-segments-on glyph (`8` for 7-seg digits, `~` for 14-seg) dimmed underneath
 * the real characters, so unlit segments stay visible like a real LED display.
 */
export function GhostText({
  value,
  variant = 'led',
  color = 'green',
  className,
  ariaLabel,
}: GhostTextProps) {
  const ghost =
    variant === 'led'
      ? value.replace(/[0-9]/g, '8')
      : value.replace(/[A-Za-z0-9]/g, '~');
  const font = variant === 'led' ? 'font-led' : 'font-display';
  const labelled = ariaLabel ?? value;

  return (
    <span
      className={cn('relative inline-block leading-none', font, COLOR[color].text, className)}
      role="img"
      aria-label={labelled || undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <span className="absolute inset-0 select-none opacity-[0.12]" aria-hidden>
        {ghost}
      </span>
      <span className={cn('relative', COLOR[color].glow)} aria-hidden>
        {value}
      </span>
    </span>
  );
}
