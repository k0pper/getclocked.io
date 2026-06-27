# getclocked.io

**How good is your sense of time?** A hidden clock runs between two beeps — reproduce the interval blind, by feel. Seven rounds, one score. Nail it and you're _dialed_; whiff and you _get clocked_.

A browser game inspired by the "guess the time" TikTok/Instagram trend, built to be fast, tactile, and shareable.

> **Status:** Singleplayer v1 (this repo). Realtime multiplayer (socket.io + Redis) is the planned next phase — the architecture is already laid out for it. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## The game

1. A soft **beep** starts a hidden interval `T` (150 ms – 10 s). The LED clock ignites for a moment, then fades to dark.
2. A second **beep** ends it. You just heard how long `T` was.
3. **Tap the buzzer** to start your reproduction, **tap again** to stop. The gap between your taps is your guess `G`.
4. Score is based on `|G − T|`, weighted by _relative_ error (a 200 ms miss on 10 s is great; on 200 ms it's a disaster).
5. After 7 rounds you get a single **0–10** score and a rank, from `TIMELORD` to `GOT CLOCKED`.

## Tech stack

React 19 · Vite 8 · TypeScript 6 · Tailwind v4 · Motion · Tone.js · Vitest · Playwright · pnpm workspaces. Deployed on Vercel.

Every dependency is **pinned to an exact version** (rationale in [docs/DECISIONS.md](docs/DECISIONS.md)).

## Quickstart

**Prerequisites:** Node `>=22.13` (this repo pins `22.23.1` via [`.nvmrc`](.nvmrc)) and pnpm `11.9.0` (auto-provisioned by Corepack via the `packageManager` field — or `npm i -g pnpm@11.9.0`).

```bash
pnpm install      # install the workspace
pnpm dev          # run the web app (http://localhost:5173)
pnpm test         # run all unit tests
pnpm build        # production build of apps/web
```

## Scripts (run from the repo root)

| Script                      | What it does                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev`                  | Vite dev server for `apps/web`                                                                      |
| `pnpm build`                | Type-check + production build                                                                       |
| `pnpm test`                 | Vitest across the workspace (run once)                                                              |
| `pnpm coverage`             | `game-core` coverage report                                                                         |
| `pnpm typecheck`            | `tsc --noEmit` in every package                                                                     |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                                                                   |
| `pnpm e2e`                  | Playwright smoke test (needs `pnpm --filter @getclocked/web exec playwright install chromium` once) |
| `pnpm check`                | typecheck + lint + test (the CI gate)                                                               |

## Structure

```
packages/game-core   Pure, deterministic game logic (no DOM/timers). Fully unit-tested.
apps/web             The React client (UI, audio, real-time orchestration).
docs/                PRD, decisions, game design, architecture, design system.
.agents/skills/      Vendored reference skills (design, tone, shadcn, react, tdd, playwright).
```

## Deployment

Frontend deploys to **Vercel** via the GitHub integration. Root directory `apps/web`, build `pnpm build`, output `dist`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#deployment) for the exact settings and the multiplayer hosting note (Vercel can't host the future persistent socket server — that goes on Fly/Railway).

## Documentation

- [docs/PRD.md](docs/PRD.md) — product vision, scope, success metrics
- [docs/GAME-DESIGN.md](docs/GAME-DESIGN.md) — mechanics, scoring math, tunable constants
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — structure, the game-core/app boundary, real-time design, multiplayer roadmap
- [docs/DESIGN.md](docs/DESIGN.md) — visual identity, tokens, type, motion
- [docs/DECISIONS.md](docs/DECISIONS.md) — every notable decision + reason, and the pinned-version table
- [CLAUDE.md](CLAUDE.md) — how to extend this codebase (with or without AI)
