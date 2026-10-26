# Handoff: start here

For a session picking up runstop64. Read `AGENTS.md` first (the rules, the shared modules, the lessons); this file is only the
state of things and what is waiting on Chris. Last updated 2026-10-26, after the cleanup pass.

## State

All eleven games are live, built and checked, and the project is near finished. What is left is Chris playing it and the few
open questions below; nothing big is under construction.

- **Live** at https://goshow.me/runstop64/ (`npm run deploy`). Repo ItsChrisHickman/runstop64, cloned at
  /root/projects/runstop64. The games and how each was made are in `GAMES.md`; every change from the original is in the game's
  `QOL.md`.
- **ENHANCED in every game** is quality-of-life for a modern playthrough, one switch (E on the pause screen), on by default.
  It has unlimited lives and continues (except the three Pendragon games without lives: see below), and a reward show on
  winning. No invincibility. The Pendragon games draw him as Dragonskulle does (`games/shared/pendragon/figure.ts`).
- **Gone on purpose:** Auf Wiedersehen Monty's shield item (the original's confusing "nothing hurts me" leaf; old
  saves load with the flag dropped), the Pendragon games' full health on entering a room, Bounder.
- **Smoothing** is sideways only: a sprite glides between ticks horizontally and is drawn at the latest tick vertically, so a
  figure stands on its floor (`Smoothed` in `packages/c64kit/src/loop.ts`, `games/awm/test/ground-vertical.ts`). V shows whole-pixel steps.
- **Saves:** every stored save has `{ game, format }` (`games/shared/saves.ts`). The day a game's save bytes change, bump its
  codec's `format` and let `unpack(bytes, format)` read the old one; the old-format fixtures
  (`games/shared/test/fixtures/saves`) keep proving players' saves load. About 1.4 M of the ~5.2 M characters a browser gives are
  used by all eleven games' current and previous saves, so they are not compressed; a failed write shows a line in the overlay.
- **No state libraries;** schemas are in-house (`S`). The architecture review's work (`docs/architecture-review.md`, a record
  of 2026-10-16) is done.
- **History** was squashed to one commit on 2026-10-16 (Chris asked: no old history); a backup is in
  `/root/projects/runstop64-history-2026-10-16.bundle`.

## Where things are

- **Auf Wiedersehen Monty's originals** (disk image, program, snapshots) are gitignored in `games/awm/build/` of the main
  checkout, and `npm run build` makes its .sid from `play.ram` there. A fresh clone or worktree needs them rebuilt first
  (`games/awm/build/README.md`); its tests that need them are skipped without them.
- **Monty on the Run's title test** needs the original program laid out from the reconstruction
  (`games/montyotr/re/README.md`, "Where the data comes from").
- **Moley Christmas's originals** (tape, 48K ROM, exercisers) are gitignored in `games/moley/build/`
  (`games/moley/build/README.md`). Its build history is `docs/moley-plan.md`; its logic is `src/game.ts` (`Game.pass` is the
  original's main loop), the picture `src/display.ts`, `src/look.ts`, `src/view.ts`, the flow `src/flow.ts`.
- **Chris's saves.** He exports them from the info card ("Export save (debug)"); load one with
  `games/shared/test/load-save.ts` (`AGENTS.md`, Tools). He play-tests on his phone and PC and sends photos and saves; those
  find the real bugs.
- **Dragonskulle's rules the game never explains** (the three bridges' wizards, the dragons, the cloak and its second coming, the
  graves, the starfish) are read, proved on the translation and the original, and turned into ENHANCED hints:
  `games/dragonskulle/re/README.md` section 9, `src/rules.ts`, `re/rules/` and `test/rules.ts`.
- **Karnath's hints** are live: sparkles on the pieces and the way to the obelisk, Pendragon's lines on the status line, the
  pieces counted on the pause screen (`games/karnath/re/README.md`, "Hints"; `re/hints/check.ts`).
- **The fast test set is slow** (it was ~11-13 minutes). It is being cut so `npm run verify` stays under 10 minutes; until
  then run the typecheck, `check:strict` and the tests for the code you touch (`tools/tests.mjs` lists them all).

## The reward show (one for all eleven games)

Every game ends ENHANCED with a reward after the game's own ending: a montage of the game's places with the hero running
through and doing something that fits (the game's own engine, driven by input), Super Mario World-style credits over it (the
makers, then sourced fun facts, then `PORT_CREDITS`: "rebuilt for the browser by CHRISTOPHER HICKMAN with Claude"), the game's
creatures walking across the places and named once each, THE END with stats, the game's music. Won is kept apart from the saves,
W on the pause screen once won, `?ending` on the page. Sources for every fact are in each game's `re/credits.md`; never invent
a credit. It runs 60 to 75 seconds (3000 to 3900 frames; each game's test checks it).

- **One module, two reels:** `games/shared/ending/`: `show.ts` (`RewardShow`), `timeline.ts` (the pure clock: a credit line is
  `CREDIT.slot` 90 frames, a name `NAME.slot` 40, THE END 250), `figures.ts`, `pilot.ts`, `credits.ts`, and `machine-reel.ts` (the
  translated-machine reel: Blackwyche, Dragonskulle, Karnath, Entombed, Thing on a Spring, JSW2). The native rebuilds (Monty, AWM,
  Starquake, Moley, Antiriad) give a `Reel` and a `Place` list to `RewardShow` themselves.
  Test kit: `games/shared/test/ending-kit.ts` (`playShow`/`checkShow` for the machines, `CastWatch` and `BandWatch` for all).
- Weak spots: Entombed and Thing scenes with the hero mostly standing or bouncing (routes not found by search:
  `re/ending/route.ts`, `re/ways.json`); visitors stand at the hero's feet at the moment they enter, so on a stair or in a jump they
  may float a little. JSW2's scenes are cut short of their found ways (never longer: the test checks). Moley plays the first
  part of each screen's puzzle.
- Creature names are ours where the games name none; Chris may want to change them.

## Open questions (found in the cleanup pass)

- **Blackwyche, Karnath and Entombed have energy, not lives**, so ENHANCED's unlimited lives have nothing to refill there: dying
  still ends in the game's end and CONTINUE? (both modes). Making it "back to the start of the room at full energy, no
  prompt" is Thing on a Spring's `vitals.lifeEnds` (needs the hook address of each game's end, found in its translation). Chris
  to say if he wants it.
- **Starquake** still has its own ENHANCED assist FULL ENERGY IN EACH ROOM (the Pendragon games' room-entry refill is gone).
  Keep or drop is a product call.
- **Thing on a Spring** oil out is a lost life back at the room's start with full oil (`vitals.lifeEnds`); the dragon flashes on
  each counted stone in Dragonskulle (`native/colour-cycle.ts`). Both are waiting on a playtest.

## Waiting on Chris

- **Playtests:** the endings, the Dragonskulle figure in Karnath/Entombed/Blackwyche, Thing on a Spring's lives, the dragon flash,
  vertical position without smoothing on a phone.
- **Blackwyche GUIDED:** his notes on the draft lines (he wanted the prose less clumsy; `games/blackwyche/src/guided-lines.ts`).
- **Karnath hints:** his notes on the lines (`games/karnath/src/hint-lines.ts`).
- **JSW2:** the ENHANCED "a lot easier" set (double jump, ropes that hold, unlimited lives, room-entry grace, gentle touch,
  item sparkles) and the pause map laid out by the exits are built, waiting on Chris to play them (`games/jsw2/QOL.md`); the
  reachability sweep is not.
- **Antiriad:** a second quest; a one-page plan first.
- **Saves design:** move the F1 saved-games screen to the overlay as a plain list. Propose first.
- **Older:** Monty warp to the Ultimate Experience; Starquake hints.

## Next

1. Chris plays; fix what he finds (photos and saves).
2. The faster test suite lands, then `npm run verify`, then the coordinating session merges, pushes and deploys.
3. Decide the open questions above, then call it finished.
