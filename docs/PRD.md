# getclocked.io — Product Requirements

## Why

A trend on TikTok/Instagram has people estimating, to the millisecond, how much time passed on a digital clock between two moments — then guessing or reproducing it. It's simple, visceral, competitive, and endlessly clippable. `getclocked.io` turns that instinct into a polished browser game built to be picked up by streamers (ohnepixel-tier) and to spread as short clips and shared scores. The name is the hook: be precise and you're *dialed*; miss and you *get clocked*.

## Audience

Mobile-first, social-native players (TikTok/Twitch/Discord), streamers and their chat, and anyone who wants to test a weirdly specific skill. Plays in seconds, shares in one tap, reads instantly on a phone held vertically.

## Core mechanic (singleplayer v1)

A pure **auditory interval-reproduction** game. Per round:

1. Two soft beeps mark a hidden interval `T` (150 ms – 10 s). The LED clock briefly *ignites* (digits running up from 0) then fades dark — it never reveals the final number.
2. The player taps a buzzer to start their reproduction and taps again to stop. The gap is their guess `G`.
3. The round is scored on `|G − T|`, relative-error weighted (see [GAME-DESIGN.md](GAME-DESIGN.md)).
4. The target and the player's time are revealed; the clock glows green/amber/red by score.

Seven rounds → one **0–10** score and a rank (`TIMELORD` … `GOT CLOCKED`). A personal best is kept locally.

## In scope for v1

- The full singleplayer loop: title → 7 rounds → results.
- Distinctive, animated, mobile-first UI; sound design; reduced-motion + keyboard paths.
- Per-round and final scoring, ranks, score-coloured breakdown.
- Personal best (localStorage), share (Web Share / clipboard), social link previews (OG image).
- A pure, fully-tested `game-core` package and a clean seam for multiplayer.

## Out of scope for v1 (roadmap)

- **Multiplayer (next phase):** 1v1 "mog battle" (à la ommogle) and lobbies, on socket.io + Redis, with a persistent server (Vercel can't host it — see [ARCHITECTURE.md](ARCHITECTURE.md#deployment)). The seeded, server-reproducible `game-core` already supports authoritative scoring.
- Accounts, global leaderboards, daily seeds/challenges, cosmetics.
- Game-mode variants (visible-then-reproduce, speed mode, survival).

## Success signals

- **Shareability:** a result that's screenshot- and clip-worthy; one-tap share; rich link previews.
- **Pick-up-ability:** understandable in one round, replay in one tap.
- **Feel:** the buzzer and the LED reveal are satisfying enough to repeat. Sub-second load to an interactive title.

## Principles

- Mobile-first, thumb-reachable, instantly legible.
- Every screen earns its animation; nothing reads as a template (see [DESIGN.md](DESIGN.md)).
- Fairness is real: relative-error scoring + input deadzone, and the heard interval is exact.
- Documented decisions over cleverness — the codebase is meant to be extended by AI ([CLAUDE.md](../CLAUDE.md)).
