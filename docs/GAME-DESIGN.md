# Game Design

The mechanic, the maths, and every knob. Pure logic lives in `packages/game-core`; the real-time orchestration is `apps/web/src/game/useRoundMachine.ts`.

## Round lifecycle

```
intro → target → prompt → reproduce → result → (×7) → done
```

| Phase       | What happens                                                | Buzzer    | Clock                           |
| ----------- | ----------------------------------------------------------- | --------- | ------------------------------- |
| `intro`     | "Round N" card (or "Replay")                                | idle      | dark                            |
| `target`    | START beep → hidden `T` → STOP beep (audio-clock scheduled) | idle      | ignites at start, fades to dark |
| `prompt`    | "Reproduce it"                                              | **armed** | dark                            |
| `reproduce` | started on the first tap; waiting for the stop tap          | **live**  | ignites on tap, fades           |
| `result`    | reveal target vs guess + score                              | disabled  | reveals target, glows by score  |
| `done`      | hand the finished game to the results screen                | —         | —                               |

## Target durations

- Range **150 ms – 10 000 ms**, **7 rounds** (`DEFAULT_DURATION_CONFIG`).
- **Log-stratified:** the `[log min, log max]` range is split into 7 equal bands; one log-uniform draw per band; order shuffled. This guarantees variety (always a short one and a long one), a perceptually even spread (humans judge time logarithmically), and **at most one** sub-250 ms "reaction-floor" round per game.
- Deterministic in the seed: `mulberry32` + per-round `deriveSeed(root, i)` (independent streams, so a server can verify round `i` without replaying earlier rounds).

## Scoring

Per round, with target `T` and guess `G` (`DEFAULT_SCORING`: `deadzoneMs = 25`, `k = 3.5`):

```
effErr  = max(0, |G − T| − deadzoneMs)     // input-jitter deadzone
relErr  = effErr / T                       // Weber's law: relative error is fair
points  = 10 · e^(−k · relErr)             // clamped to [0, 10]
final   = mean(points over 7 rounds)       // 0–10
```

**Why relative error:** by Weber's law, perceived time error is ~proportional to magnitude — 200 ms off a 10 s target is excellent, 200 ms off a 200 ms target is terrible. Relative error captures exactly that and is scale-invariant. **Why the deadzone:** human tap precision is ~20–50 ms; within 25 ms counts as perfect so a near-perfect attempt isn't punished for sub-perceptual jitter. Tap reaction latency largely cancels (it lands on both the start and stop tap).

**Curve feel** (deadzone aside): 10% off ≈ 7.2, 20% ≈ 5.0, 50% ≈ 1.7.

### Ratings & ranks

| Per-round (`roundRating`)                                       | Points                          |
| --------------------------------------------------------------- | ------------------------------- |
| `PERFECT` / `DIALED` / `SHARP` / `LOOSE` / `SLOPPY` / `CLOCKED` | ≥9.5 / ≥8 / ≥6 / ≥4 / ≥2 / else |

| Final rank (`gameRank`)                                                        | Score                           |
| ------------------------------------------------------------------------------ | ------------------------------- |
| `TIMELORD` / `CLOCKWORK` / `DIALED IN` / `ROOKIE` / `OFF-BEAT` / `GOT CLOCKED` | ≥9 / ≥7.5 / ≥6 / ≥4 / ≥2 / else |

Scoreboard colour (`scoreColor`): green ≥6, amber ≥3.5, red below.

## Edge cases (handled in `useRoundMachine`)

| Case                             | Handling                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| Player never taps stop           | Cap at `MAX_GUESS_MS` (12 s) → void + replay the round         |
| Tab hidden mid-round             | `visibilitychange` → void + replay (keeps scores honest)       |
| Tap during the target / ignition | No-op for measurement; ignition never gates input              |
| `T = 150 ms`                     | Ignition compresses to a fraction of `T` — a single glow flash |
| Space held (key repeat)          | `event.repeat` ignored                                         |
| Pointer + Space from one press   | Coalesced within `COALESCE_MS` (60 ms)                         |
| Double-tap bounce                | `MIN_TAP_GAP_MS` (30 ms) minimum between start and stop        |
| Audio fails / no device          | Sound is feedback only; the round proceeds regardless          |

## Tuning knobs

- **Logic (game-core, affect scoring):** `DEFAULT_SCORING` (`deadzoneMs`, `k`), `DEFAULT_DURATION_CONFIG` (`minMs`, `maxMs`, `rounds`). Pass custom configs to `initGame` to sweep them.
- **Feel (app, no scoring impact):** `apps/web/src/lib/constants.ts` — `INTRO_MS`, `LEAD_IN_MS`, `IGNITION_MS` / `IGNITION_FADE_MS` / `IGNITION_MAX_FRACTION`, `PRE_PROMPT_MS`, `COALESCE_MS`, `MIN_TAP_GAP_MS`, `MAX_GUESS_MS`.

After playtesting, `k` and `deadzoneMs` are the first dials to turn for difficulty.

## Accessibility

It's fundamentally an audio-timing game, so: reduced-motion path (discrete flash instead of count-up; timing unchanged), phase captions + `aria-live` announcements, full keyboard play (Space is the buzzer), visible focus, and never colour-only signalling.
