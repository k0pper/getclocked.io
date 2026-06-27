# CLAUDE.md — working in this repo

Guidance for AI agents (and humans) extending getclocked.io. Read this first, then the relevant [docs/](docs/).

## The one rule that explains the architecture

**`packages/game-core` never learns _when_ anything happened.** It is pure: no DOM, no timers, no audio, no `performance.now`, no `Math.random` (RNG is seeded). It is handed elapsed-millisecond numbers and asked to generate / score / format / advance. **`apps/web` owns every clock.** Keep that boundary and most decisions follow. Anything reusable by the future multiplayer _server_ lives in `game-core`; anything touching time, sound, or the DOM lives in the app.

## Where things live

| Area                                       | Path                                   |
| ------------------------------------------ | -------------------------------------- |
| Scoring / RNG / durations / reducer (pure) | `packages/game-core/src/*`             |
| Phase machine (the conductor)              | `apps/web/src/game/useRoundMachine.ts` |
| Audio engine (Tone.js, lazy)               | `apps/web/src/audio/engine.ts`         |
| LED clock / buzzer / pips / ghost text     | `apps/web/src/components/*`            |
| Screens (title / game / results)           | `apps/web/src/screens/*`               |
| Design tokens + LED utilities              | `apps/web/src/styles/globals.css`      |
| Tunable timing/input constants             | `apps/web/src/lib/constants.ts`        |

## Non-negotiable patterns

- **rAF → refs/DOM, never `setState`.** The LED clock animates at 60fps by mutating `textContent`/`opacity` on a ref. Driving that through React state would re-render the tree every frame. `setState` is for discrete phase transitions only. (See `LEDClock.tsx`, and `.agents/skills/vercel-react-best-practices`.)
- **The audio clock is the authority for the target interval.** Both target beeps are scheduled as a pair on `ctx.currentTime` (`engine.scheduleTargetBeeps`), so the gap the player _hears_ equals `T` exactly — `setTimeout`/rAF would drift or throttle. Measurement of the player's guess uses `event.timeStamp` / `performance.now()`.
- **One physical press = one logical tap.** `Buzzer.tsx` de-dupes pointer + Space, ignores key-repeat, and only fires while armed/live.
- **Reduced motion is respected** everywhere; it must never change timing/scoring, only visuals.
- **Pure logic is TDD'd.** Add a failing Vitest in `game-core` first, then implement. Test behaviour through the public API.

## How to add things

- **New scoring rule / duration tweak:** edit `game-core` (it's config-driven — `DEFAULT_SCORING`, `DEFAULT_DURATION_CONFIG`), add tests, done. The app picks it up.
- **New game-feel tuning (no logic change):** the constants in `apps/web/src/lib/constants.ts` (ignition window, lead-in, coalesce window, max-guess) and the scoring config are the knobs.
- **New UI component:** hand-roll with Tailwind + `cn()` and (for variants) `class-variance-authority`, matching `Button.tsx`. shadcn is set up (`components.json`, `cn`, lucide) — run `pnpm dlx shadcn@latest add <x>` from `apps/web` when a primitive genuinely saves work, then restyle it (don't ship defaults).
- **New sound:** add to `engine.ts`; keep it soft (triangle/sine, gentle envelopes).

## Vendored skills (`.agents/skills/`)

Reference material, already curated for this stack. Consult before guessing: `frontend-design` (visual identity — avoid templated looks), `tonejs`, `web-realtime-socket-io` (for multiplayer), `shadcn`, `vercel-react-best-practices`, `tdd`, `playwright-*`.

## Gotchas (learned the hard way — see docs/DECISIONS.md)

- **Node must be `>=22.13`.** Vite 8 / ESLint 10 / jsdom 29 require it. The repo pins `22.23.1`.
- **pnpm version churn purges `node_modules`** with a TTY prompt; `.npmrc` sets `confirm-modules-purge=false`. If an install hangs, that's why.
- **Supply-chain policy (`minimumReleaseAge`)** rejects packages published <~24h ago. The pinning rule is _latest stable that's ≥24h old_ — that's why `eslint` is 10.5.0 and `prettier` 3.8.5, not the absolute latest.
- **StrictMode double-invokes** effects/initializers in dev. Effects are idempotent and timers are cleaned per-phase; don't put side effects in `setState` updaters.

## Commands

`pnpm check` (typecheck + lint + test) is the gate. `pnpm dev` to run, `pnpm test` for logic, `pnpm e2e` for the smoke test.
