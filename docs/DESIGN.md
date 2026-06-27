# Design System

The visual identity and how it's encoded. Tokens live in `apps/web/src/styles/globals.css` (Tailwind v4 `@theme`).

## Identity

**The world:** the inflatable game-show **booth** + an LED gym/boxing round-timer + an arcade buzzer (straight from the reference reels). Dark, focused, tactile.

**The anti-cliché rule:** a green-on-black LED clock is _exactly_ the "near-black + single acid-green accent" look the `frontend-design` skill flags as generic AI. So green is **scoped to the LED display only**; the identity is spent instead on a **multi-LED scoreboard** palette, segmented DSEG typography with ghost segments, and a tactile buzzer. The free design axes don't get spent on a default.

## Palette (semantic multi-LED)

Green/amber/red aren't decoration — they **encode score quality** (structure as information).

| Token                                 | Hex                   | Use                                               |
| ------------------------------------- | --------------------- | ------------------------------------------------- |
| `--color-void`                        | `#07090F`             | deep blue-black arena base                        |
| `--color-void-raised`                 | `#0E121C`             | panels                                            |
| `--color-void-deep`                   | `#04050A`             | recessed LED screen                               |
| `--color-seam`                        | `#1B2230`             | bezels, dividers                                  |
| `--color-led-green`                   | `#34F36B`             | the clock, "go", good scores — **display-scoped** |
| `--color-led-amber`                   | `#FFC53D`             | action (buzzer armed, CTAs), mid scores, "listen" |
| `--color-led-red`                     | `#FF4D4D`             | danger, "got clocked", bad scores                 |
| `--color-bone`                        | `#ECEFF4`             | UI text                                           |
| `--color-steel` / `--color-steel-dim` | `#5B6675` / `#353D4A` | secondary / muted                                 |

Atmosphere: a layered radial-gradient booth wash (amber from above, green from below, central lift) on `body`; LED bloom via `led-glow-*` text-shadow utilities; recessed screens via the `led-screen` utility.

## Typography

Deliberate four-role pairing — not the default serif-display:

| Role                       | Face               | Where                                                                     |
| -------------------------- | ------------------ | ------------------------------------------------------------------------- |
| Display (`--font-display`) | **DSEG14 Classic** | the `GETCLOCKED` wordmark, rank reveals (14-segment renders the alphabet) |
| LED (`--font-led`)         | **DSEG7 Classic**  | the `MM:SS:CC` clock + the big final score                                |
| Sans (`--font-sans`)       | **Space Grotesk**  | UI, buttons, captions                                                     |
| Mono (`--font-mono`)       | **JetBrains Mono** | millisecond data, the breakdown (tabular figures)                         |

**Ghost segments:** DSEG text renders the all-segments-on glyph (`8` for digits, `~` for letters) faintly behind the lit characters, so unlit segments stay visible like real hardware (`GhostText.tsx`).

## Signature elements

1. **The buzzer** (`Buzzer.tsx`) — a graphite obsidian dome with an LED ring that shifts amber (armed) → green (live), squash on press, ripple, and a soft `MembraneSynth` thock. The emotional centre, thumb-reachable.
2. **LED power-on** — the wordmark and clock _boot_ like hardware: ghost segments, a flicker warm-up, bloom; the clock ignites (digits running up) then fades to dark each interval.

## Motion

`motion` (framer-motion) for screen transitions, the title power-on, result reveals, and the score count-up; **raw rAF** for the 60 fps LED loop (never React state). Reduced motion is honoured globally (a CSS damper) and per-component (discrete states, instant reveals) — it never changes timing or scoring.

## Components

`LEDClock` (imperative, rAF) · `Buzzer` (input + feel) · `RoundPips` (per-round score LEDs) · `GhostText` (segmented LED text) · `Button` (cva variants: `primary`/`amber`/`ghost`). shadcn is configured (`components.json`, `cn`, lucide) for when a primitive is worth adding — restyle, don't ship defaults.

## Quality floor

Mobile-first portrait, scaling to a centred desktop "arena"; safe-area insets; visible keyboard focus; `aria-live` phase/score announcements; reduced-motion respected; OG image + favicon for shareable link previews.
