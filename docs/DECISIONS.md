# Decisions

Every notable choice, with its reason. New decisions append here (most recent first within a section).

## Pinned versions

All dependencies are pinned to exact versions (`.npmrc` → `save-exact=true`). **Pinning rule:** the latest stable that is **≥ 24 h old**, to satisfy the environment's `minimumReleaseAge` supply-chain policy and avoid brand-new releases. That's why a few dev tools are one patch behind the absolute latest.

### Runtime / toolchain

| Package | Version | Why |
| --- | --- | --- |
| node | 22.23.1 | Vite 8 (`>=22.12`), ESLint 10 & jsdom 29 (`>=22.13`) require it; pinned in `.nvmrc` + `engines`. |
| pnpm | 11.9.0 | Workspaces; provisioned via `packageManager` + Corepack. |
| typescript | 6.0.3 | Strict shared config; `paths` without `baseUrl` (deprecated in TS 7). |

### apps/web — runtime

| Package | Version | Why |
| --- | --- | --- |
| react / react-dom | 19.2.7 | Latest stable. |
| vite | 8.1.0 | SPA build (no Next.js — see below). |
| @vitejs/plugin-react | 6.0.3 | React + Fast Refresh. |
| tailwindcss / @tailwindcss/vite | 4.3.1 | CSS-first `@theme`, no config file. |
| tw-animate-css | 1.4.0 | v4 animation utilities (replaces `tailwindcss-animate`). |
| motion | 12.42.0 | Screen/result/UI animation (framer-motion successor, `motion/react`). **Not** the LED loop. |
| tone | 15.1.22 | Audio engine; lazy-imported (kept out of the initial bundle). |
| class-variance-authority / clsx / tailwind-merge / lucide-react | 0.7.1 / 2.1.1 / 3.6.0 / 1.21.0 | `cn()` + variant components; shadcn primitives ready (`lucide` reserved for `shadcn add`). |
| @fontsource/dseg7-classic / dseg14-classic | 5.2.5 | LED clock digits / segmented wordmark (self-hosted). |
| @fontsource-variable/space-grotesk / jetbrains-mono | 5.2.10 / 5.2.8 | UI body / millisecond data. |

### Dev / test / lint

| Package | Version | Why |
| --- | --- | --- |
| vitest / @vitest/coverage-v8 | 4.1.9 | Unit tests + coverage. |
| jsdom | 29.1.1 | `apps/web` DOM env (game-core uses `node`). |
| @testing-library/react / jest-dom / user-event | 16.3.2 / 6.9.1 / 14.6.1 | Component tests. |
| @playwright/test | 1.61.1 | E2E smoke test. |
| eslint / @eslint/js | 10.5.0 / 10.0.1 | Flat config. **10.5.0, not 10.6.0** — the 10.6.0 release was <24 h old (policy). |
| typescript-eslint | 8.62.0 | TS lint (flat). |
| eslint-plugin-react-hooks / react-refresh / globals | 7.1.1 / 0.5.3 / 17.7.0 | React lint + globals. |
| prettier | 3.8.5 | Format. **3.8.5, not 3.9.0** — 3.9.0 was <24 h old (policy). |
| @types/react / react-dom / node | 19.2.17 / 19.2.3 / 26.0.1 | Types. |

> A `pnpm.overrides` pin for the transitive `electron-to-chromium` proved unnecessary: with `minimumReleaseAge` active, fresh resolution already picks a ≥24 h-old version, and the committed lockfile keeps it deterministic.

## Architecture

- **pnpm monorepo, not a single app.** A pure `game-core` package (a) makes timing/scoring trivially unit-testable in isolation and (b) is reused verbatim by the future multiplayer server for authoritative, anti-cheat scoring. Low overhead, clean seam.
- **No Next.js.** The product is a realtime multiplayer game; a Vite SPA + a separate socket server is the right shape (the user's call). Vercel hosts the static SPA.
- **No router (yet).** Three screens are a `useState` machine in `App.tsx`. Add `react-router` when multiplayer routes (`/room/:id`) arrive.
- **No global store (yet).** A `useReducer`-style flow over `game-core` plus rapid timing in refs is enough. Revisit Zustand for shared multiplayer state.
- **`game-core` ↔ app boundary:** pure logic only in the package; the React phase machine (timer/audio-coupled) stays in the app. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Real-time

- **Audio clock is the authority for the target interval `T`.** Both beeps are scheduled on `ctx.currentTime` a `T` apart, so the *heard* gap is exact regardless of Tone look-ahead or background-tab `setTimeout` clamping (≥1 s). rAF (paused when hidden, ~16.7 ms quantized) and `setTimeout` are unfit as the authority.
- **Measure the guess on input, not audio.** `pointerdown` + Space `keydown`, timestamped via `event.timeStamp` (same origin as `performance.now()`); never `click`. Output latency (e.g. Bluetooth) is a constant offset on both beeps, so the *interval* stays fair.
- **rAF → refs/DOM, never `setState`.** 60 fps LED updates must not re-render React. Phase transitions are the only `setState`.
- **Void + replay** a round on timeout (`MAX_GUESS_MS`) or tab-hidden, rather than scoring a 0 — kinder and keeps scores honest.

## Game design

- **Weber's-law (relative) scoring with a deadzone.** Perception of time is ~proportional to magnitude, so relative error is the fair metric across 150 ms–10 s; a 25 ms deadzone absorbs human tap jitter. Exponential falloff (`k=3.5`). All tunable. See [GAME-DESIGN.md](GAME-DESIGN.md).
- **Log-stratified durations.** One draw per log-equal band guarantees variety and a perceptually even spread, capping sub-250 ms "reaction-floor" rounds at one per game.
- **Seeded everything** (`mulberry32` + per-round `deriveSeed`) → reproducible runs and a verify-one-round seam for multiplayer.

## Design / identity

- **Multi-LED scoreboard palette, not single-accent neon.** A green-on-black LED clock is the literal generic-AI look the `frontend-design` skill warns against; green is scoped to the *display*, with amber (action) and red (danger/score) used semantically, plus DSEG segmented type with ghost segments and a tactile buzzer as the signature. See [DESIGN.md](DESIGN.md).

## Build / tooling

- **`.npmrc`: `confirm-modules-purge=false`** — pnpm rebuilds `node_modules` non-interactively (agent/CI have no TTY).
- **`strict-peer-dependencies=false`** — React 19 is new; some transitive deps still declare React 18 peers (warn, don't fail).
- **Tone.js lazy-imported** — `await import('tone')` on the Start gesture keeps ~80 KB gzip out of the title's initial load.
