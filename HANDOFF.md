# Handoff: start here

For a session picking up runstop64. Read `AGENTS.md` first (the rules, the shared modules, the lessons); this file is only what
is next and what is waiting on Chris. Last updated 2026-10-18.

## Where things are

- **Live** at https://goshow.me/runstop64/ (`npm run deploy`). Repo ItsChrisHickman/runstop64, cloned at
  /root/projects/runstop64. The ten games and how each was made are in `GAMES.md`.
- **Auf Wiedersehen Monty's originals** (disk image, program, snapshots) are gitignored in `games/awm/build/` of the main
  checkout, and `npm run build` makes its .sid from `play.ram` there. A fresh clone or worktree needs them rebuilt first
  (`games/awm/build/README.md`).
- **Monty's title test** needs the original program laid out from the reconstruction (`games/montyotr/re/README.md`, "Where
  the data comes from"); the last copy was in a scratchpad that is gone.
- **Chris's saves.** He exports them from the info card ("Export save (debug)"); load one with
  `games/shared/test/load-save.ts` (`AGENTS.md`, Tools). He play-tests on his phone and PC and sends photos and saves; those
  find the real bugs.
- **Known HD issues** are listed in `docs/hd-view.md`.
- **Dragonskulle's rules the game never explains** (the three bridges' wizards, the dragons, the cloak and its second coming, the
  graves, the starfish) are read, proved on the translation and the original, and turned into ENHANCED hints:
  `games/dragonskulle/re/README.md` section 10, `src/rules.ts`, `re/rules/` and `test/rules.ts`.

## Next

- **Moley Christmas** (ZX Spectrum only): plan stages 1-6 are done in worktree commits (`docs/moley-plan.md`); the game logic, the picture, the whole flow and the front end are complete, the game is in `games/registry.ts` and playable with its sound.
  Data: `games/moley/re/extract.ts` writes the committed `src/data/*.ts`. The logic: `src/game.ts` (`Game.pass` is the original's main loop, 25 a second; `Observer` tells the picture what happens). The picture:
  `src/display.ts` (the Spectrum's screen memory changed by the original's own steps; `takeShots` gives the death and time-out pictures), `src/look.ts` (ORIGINAL exact, ENHANCED no colour clash), `src/view.ts` (`MoleyView` on c64kit's renderer:
  Spectrum palette, black border, 256 x 192 centred in 320 x 200; `look` is the flag for the front end; smooth motion through `ViewStep` and `render(alpha)`; `present(step, frame)` puts a flow step on it). c64kit got `Palette` (default C64, every other game unchanged).
  **The flow (stage 5):** `src/flow.ts` `MoleyFlow.step({ keys, any })` is the whole game: credits page (`src/screens.ts`: the picture, scroller, GAME OVER, the card), play, GAME OVER, the Christmas card, back to the credits page. A step is a pass in play
  (2 frames) and a frame or a held picture elsewhere; it says how many 50 Hz frames to hold the picture. `flow.highScore` is the one number to save; `new MoleyFlow(rng, { game, display })` starts in play (continue).
  Tests: `test/flow.ts` (every frame against the original: credits page, starts, the card, game overs, second games: 0 different), `test/flow-steps.ts`, `test/picture.ts` (every pass and frame against the original: 0 differ), `test/view.ts`, plus stage 3's lockstep and playthrough (now with a game over); `re/frames.ts` and `re/screens.ts` write PNGs, `re/colours.ts` measures the sprite colour (white).
  Room 2's wrong-address jump: Chris decided, fixed in both modes (the room restarts). **Stage 6 (the front end) is done:** `src/main.ts` runs `MoleyFlow` and `MoleyView` through `runPort` (pause screen with `src/map.ts`'s map of the six screens, travel, autosave per screen in `src/save.ts`, continue, back to screen start, the ORIGINAL/ENHANCED switch, touch: stick + JUMP), in the Spectrum's colours with our own font (`src/font.ts`, `src/colours.ts`; `PauseColours` in `games/shared/native/pause.ts` is the shared hook for a non-C64 palette). ENHANCED = no clash, smooth motion, items-left count in the pocket box, steering in the air (`Game.enhanced`), sparkles on the puzzles and ways out (`src/hints.ts`, `test/hints.ts`; Chris could not find room 2's spot). Docs: `games/moley/QOL.md`, `docs/moley-plan.md` stage 6.
  **Stage 7 (sound) is hooked up:** `main.ts` drives `MoleySound` (`afterStep`, `sync`; the shared audio keys unlock it and M mutes).
  The originals are gitignored in `games/moley/build/` of the main checkout (`games/moley/build/README.md`).

- **Karnath ENHANCED hints** (live): sparkles on the pieces and the way to the obelisk, Pendragon's lines on the status line, the pieces counted on the pause screen (`games/karnath/re/README.md`, "Hints"; `re/hints/check.ts`). Waiting on Chris: his notes on the lines (`src/hint-lines.ts`).

- **Architecture work,** from `docs/architecture-review.md` (2026-10-16): its order of work is done (strictness holes + the
  `node:test` runner; generated code out of git + dead code; the small shared pieces; `runPort`, the continue-flow reducer and
  typed `Found`; the save envelope and the registry). Finding 10 (AGENTS.md too long) was settled by the doc cleanup
  (45 KB to 19 KB). No state libraries; schemas are in-house (`S`).
- **Saves:** every stored save has `{ game, format }` (`games/shared/saves.ts`). The day a game's save bytes change, bump its
  codec's `format` and let `unpack(bytes, format)` read the old one; the old-format fixtures
  (`games/shared/test/fixtures/saves`) keep proving players' saves load. Storage measured at ~1.4 M of the ~5.2 M characters
  a browser gives for all ten games' current and previous saves, so they are not compressed; a failed write shows a line in the overlay.
- **The HD tests in the slow set** (`*/test/hd.ts`) pass under the runner (70-212 s, ~510-560 MB each, run alone). Rooms are built in the worker; what is left is in `docs/hd-view.md` (Entombed's big right-edge slants and a thin ribbon between tiers; Karnath's stair hatch).
- **History:** squashed to one commit on 2026-10-16 (Chris asked: no old history); a backup is in `/root/projects/runstop64-history-2026-10-16.bundle`.
  From here: fewer, larger commits with plain messages.

## Endings (2026-10-18, Chris's top wish)

Chris wants every game to end with a reward, ENHANCED only, after the game's own ending: a montage of the game's places with the
hero running through and doing something (the game's own engine, driven by input), Super Mario World-style credits during it
(makers, then sourced fun facts, then `PORT_CREDITS`: "rebuilt for the browser by CHRISTOPHER HICKMAN with Claude"), a parade of
the characters with names, THE END with stats, the game's music; won kept apart from the saves, W on the pause screen once won,
`?ending` on the page. Sources for every fact in each game's `re/credits.md`; never invent a credit. He OK'd doing them all
without waiting for his review.

- **Done (live):** Blackwyche, Dragonskulle, Staff of Karnath, Entombed, Thing on a Spring (`games/shared/native/ending.ts`,
  test kit `games/shared/test/ending-kit.ts`; Entombed has no music, so `tune: 'effects'`); Monty on the Run
  (`games/shared/ending/` for the `runPort` rebuilds, test `test/reward.ts`). Weak spots: some Entombed and Thing scenes have
  the hero mostly standing or bouncing while credits run (routes not found by search: `re/ending/route.ts`, `re/ways.json`).
- **To do:** Auf Wiedersehen Monty, Moley Christmas, Starquake, Antiriad (on `games/shared/ending/`, like Monty), JSW2 (on
  `native/ending.ts`). Then **merge the two ending modules** (they duplicate the credits timing, the figure recording, the parade,
  THE END and the skip): one shared show, with a translated-machine reel and a native-engine reel.
- Creature names are ours where the games name none; Chris may want to change them.

## Also done 2026-10-18

- Pendragon games: no full health on entering a room; continues stay unlimited and give full health.
- Thing on a Spring ENHANCED: no oil boosts; oil out is a lost life back at the room's start with full oil (`vitals.lifeEnds`).
- Dragonskulle ENHANCED: the dragon flashes on each counted stone (combat `react` event, `native/colour-cycle.ts`).

## Next after the endings

- **Cleanup pass** (Chris OK'd): dead code, drift between shared modules (the two endings first), this file and AGENTS.md
  trimmed to what is true. The fast test set takes ~11-13 min: move the slowest checks to the slow set or start them from
  saved states so `verify` stays under 10 minutes.
- **HD** leftovers above.

## Waiting on Chris

- **Blackwyche GUIDED:** his notes on the draft lines (he wanted the prose less clumsy; `games/blackwyche/src/guided-lines.ts`).
- **JSW2:** the ENHANCED "a lot easier" set (double jump, ropes that hold, unlimited lives, room-entry grace, gentle touch,
  item sparkles) and the pause map laid out by the exits (every exit side by side or a dotted connector) are built, waiting on Chris to play them (`games/jsw2/QOL.md`); the reachability sweep is not.
- **Antiriad:** a second quest; a one-page plan first.
- **Saves design:** move the F1 saved-games screen to the overlay as a plain list. Propose first.
- **Playtests:** the endings, Thing on a Spring's lives, the dragon flash, the HD fixes.
- **Older:** Monty warp to the Ultimate Experience; Starquake hints.
