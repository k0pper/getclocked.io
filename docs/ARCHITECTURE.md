# Architecture

## Monorepo

```
getclocked.io/
├─ packages/game-core/      # pure, deterministic logic — no DOM, no timers, no audio
│  └─ src/  units · rng · duration · scoring · format · reducer  (+ *.test.ts)
├─ apps/web/                # the React client — owns ALL real-time concerns
│  └─ src/
│     ├─ game/useRoundMachine.ts     # phase machine + orchestration
│     ├─ audio/engine.ts             # Tone.js singleton (lazy), audio-clock scheduling
│     ├─ components/                  # LEDClock · Buzzer · RoundPips · GhostText · Button
│     ├─ screens/                     # Title · Game · Results
│     ├─ hooks/usePersonalBest.ts
│     ├─ lib/  constants · scoreColor · utils(cn)
│     └─ styles/globals.css           # Tailwind v4 @theme tokens + LED utilities
└─ docs/ · .agents/skills/
```

`game-core` is consumed as TypeScript source (its `exports` points at `src/index.ts`); Vite/Vitest transpile it, so there's no build step and types flow across the boundary.

## The boundary (the load-bearing decision)

> **`game-core` never learns _when_ anything happened.** It receives elapsed-millisecond numbers and returns generated targets / scores / formatted strings / next state. **The app owns every clock.**

- **Pure (`game-core`):** branded units (`Ms`/`Score`/`Seed`), seeded RNG (`mulberry32`, `deriveSeed`), `generateTargets`, scoring (`roundScore`/`finalScore` + ratings), formatting, and a `gameReducer` that advances rounds given a measured `guessMs`.
- **App (`apps/web`):** `performance.now()`/`event.timeStamp`, the rAF ignition loop, the Tone.js graph + audio-clock scheduling, pointer/keyboard input + de-dup, Page Visibility, reduced-motion, and the React phase machine.

The phase machine is deliberately **not** in `game-core` — it's inseparable from timers and audio. `game-core`'s reducer tracks only round progression and results, which is the genuinely pure part a multiplayer server reuses.

## Real-time design

1. **Target interval `T` is defined on the Web Audio clock.** `engine.scheduleTargetBeeps(T)` schedules START at `ctx.currentTime + leadIn` and STOP at `+ T`. The gap the player hears equals `T` exactly — immune to Tone's look-ahead and to background-tab `setTimeout` clamping. `setTimeout`/rAF only drive _visual_ phase changes (and a hidden tab voids the round anyway).
2. **The guess `G` is measured on input.** `pointerdown`/Space `keydown`, timestamped with `event.timeStamp` (same time origin as `performance.now()`). Never `click`.
3. **The LED clock animates via refs/DOM.** A single rAF loop writes `textContent`/`opacity`; React renders the phase shell once. `setState` happens only at discrete transitions, guarded so stale timer callbacks no-op.

## Data flow

`App` generates a random `seed` → `GameScreen` mounts `useRoundMachine(seed)` → `initGame(seed)` pre-generates the 7 targets → each round the machine schedules beeps, measures the tap pair, dispatches `RECORD_GUESS` to the reducer, and reveals the result → on completion the finished `GameState` is handed back to `App` → `ResultsScreen` derives the final score, rank, breakdown, and records the personal best.

Because the whole run is reproducible from `seed` alone, results are shareable/replayable and server-verifiable.

## Multiplayer roadmap (next phase)

The seam is already in place:

- **Server-authoritative scoring:** the server runs the _same_ `game-core` code. It holds `seed` + configs, sends only the seed (or per-round derived seed) to clients, and recomputes `roundScore` from submitted `guessMs` (+ optional raw tap timestamps). `deriveSeed(root, i)` lets it verify one round in isolation.
- **Anti-cheat:** reject implausible `guessMs`, flag `hidden`/`blur` rounds, optionally keep a tamper-evident input trace.
- **Transport:** socket.io rooms (see `.agents/skills/web-realtime-socket-io`), state/presence in Redis (Upstash).
- **App changes:** add `react-router` for `/room/:id`, and a shared store (Zustand) for room state.

## Deployment

- **Frontend → Vercel** (GitHub integration): root directory `apps/web`, framework Vite, build `pnpm build`, output `dist`, SPA rewrite to `/index.html`. Auto-deploy `main`, preview deploys on PRs. CI (`.github/workflows/ci.yml`) gates with typecheck + lint + test + build.
- **Multiplayer server (future) → NOT Vercel.** Serverless functions can't hold persistent WebSockets, so the socket.io server goes on a persistent host (Fly.io / Railway / Render) with Upstash Redis. The frontend stays on Vercel and connects out.

## Testing

- **`game-core`:** Vitest (node env), TDD, behaviour through the public API — determinism snapshots, scoring properties (monotonicity, deadzone, bounds, scale-invariance), format boundaries. ~98% coverage.
- **`apps/web`:** Vitest (jsdom) for component/hook logic; a Playwright smoke test drives title → a round → results in a real browser.
