import type { SVGProps } from 'react';

/**
 * Hand-drawn, on-theme line icons — not vendor logos. They share one visual
 * language with the rest of the app: thin rounded strokes, `currentColor`, sized
 * in `em` so they track the text they sit beside.
 */
const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** A spacebar keycap with the ⎵ glyph — "you can also press space". */
export function SpaceKeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="1.5em" height="1.5em" {...base} {...props}>
      <rect x="2.5" y="7.5" width="19" height="9" rx="2.4" />
      <path d="M7 12.5v1.6M17 12.5v1.6M7 14.1h10" />
    </svg>
  );
}

/** A retro camera — stands in for Instagram without aping its logo. */
export function CameraGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" {...base} {...props}>
      <rect x="2.5" y="6.5" width="19" height="14" rx="3.4" />
      <path d="M8.3 6.5l1.1-2.1h5.2l1.1 2.1" />
      <circle cx="12" cy="13.4" r="3.6" />
      <circle cx="12" cy="13.4" r="0.9" fill="currentColor" stroke="none" />
      <path d="M17.8 9.6h0.01" />
    </svg>
  );
}

/** A tiny CRT terminal with a `>_` prompt — stands in for GitHub, dev-side. */
export function TerminalGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" {...base} {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.8" />
      <path d="M2.5 8.4h19" />
      <path d="M7 12l2.6 2-2.6 2" />
      <path d="M12.6 16.2h4.4" />
    </svg>
  );
}
