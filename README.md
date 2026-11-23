# best-card-game-entry

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/masbagusyutl/best-card-game-entry/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/masbagusyutl/best-card-game-entry/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Tidebound — Duel of the Rising Tide: a complete, original two-player card duel in the browser. Every card moves a shared tide; at high tide Sun cards strike +2, at low tide Moon cards strike +2, and Storm cards bend the tide itself. You duel Captain Mirelle, harbour against harbour, with a hand of readable cards, a visible tide gauge, and a win and a loss screen.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — the game is static files under game/.

---

<sub>Entered on [make.fun](https://make.fun/?ref=y7at578k&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>

## How to play

You duel **Captain Mirelle**, harbour against harbour (30 ♥ each). First harbour to 0 loses.

**The tide is everything.** A shared tide gauge runs from −5 (low, moonlit) to +5 (high, sunlit). Every card moves it when played. At **high tide (+3 or more)** Sun cards strike +2; at **low tide (−3 or less)** Moon cards strike +2. Play to own the tide, not just to hit hard.

**Each turn:** draw 1 card, gain 3 shells ● (max 10), play as many cards as you can afford, then end your turn. Drawing from an empty deck costs 2 ♥ (fatigue).

**The cards** — 15 unique cards, 2 copies each in a 30-card deck:

| Element | Mark | Plays |
|---|---|---|
| Sun ☀ | gold, tide ▲ | Solar Flare, Ember Cutlass, Sunken Gold (draw 1), High Noon, Coral Spark (heal 2) |
| Moon ☾ | silver-blue, tide ▼ | Moonlit Tide, Deep Current, Pearl Dive (heal 2), Eclipse, Tidepool Lure (draw 1) |
| Storm ⛈ | violet, tide tricks | Maelstrom (flip the tide), Anchor Drop (still it to 0), Siren's Call (draw 2), Storm Surge (shove to an extreme), Gull's Gambit (free — discard 1) |

Elements are told apart by colour **and** shape (☀ / ☾ / ⛈ glyph on every card), never by text alone.

**Keys:** click a card to play it · **E** end turn · **P** pause · **M** sound · **N** new game. Your career record (wins, losses, streak) is saved in the browser. Sound is synthesised in code (WebAudio) — no audio files.

**Captain Mirelle** is greedy but tide-aware: she scores every card by its damage, by how it drags the tide toward the element she holds most of, and by its effect — and she will flip the tide on you if you let her own it.

## Files

- `game/index.html` — the table
- `game/css/table.css` — the deep-sea look: tide gauge, card faces, overlays
- `game/src/rng.js` — seeded random (mulberry32) + shuffle; a match replays exactly from its seed
- `game/src/cards.js` — the 15-card pool, deck builder, tide bonus rules
- `game/src/tide.js` — the tide gauge: clamp, favour, flip/still/surge
- `game/src/engine.js` — the pure state machine: turns, plays, damage, win/lose
- `game/src/ai.js` — Captain Mirelle's brain
- `game/src/audio.js` — synthesised sound effects (WebAudio, no files)
- `game/src/view.js` — DOM rendering, input, overlays, screenshot staging
- `game/src/main.js` — boot, save/pause/keyboard, `?shot=` scenes
- `tests/playthrough.mjs` — headless full-match playthrough: 30/30 matches end with a winner, 0 invariant failures, same seed replays identically
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — local static server for play-testing
- `shots.json` — the four screenshot scenes (`?shot=start|play|lowtide|victory`)

## Screenshots

Four real renders of the game running in desktop Chrome, under `screenshots/`: the title screen over the live table, a high-tide duel (Sun favoured), a low-tide duel (Moon favoured), and the victory screen. Take them again with `node /tmp/shot-tools/shoot.mjs .` (Playwright + system Chromium, outside this repo).

## Checks

```sh
node tests/playthrough.mjs   # 30 headless matches, invariants + determinism
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand-in program, run twice: same bytes
```
