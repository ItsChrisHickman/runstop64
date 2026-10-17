# Handoff: start here

For a session picking up runstop64. Read `AGENTS.md` first (the rules, the shared modules, the lessons); this file is only what
is next and what is waiting on Chris. Last updated 2026-10-17.

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

## Next

- **Moley Christmas** (ZX Spectrum only): plan stages 1-3 are done in worktree commits (`docs/moley-plan.md`); the game logic is complete and the picture is next.
  Data: `games/moley/re/extract.ts` writes the committed `src/data/*.ts`; `test/data.ts` proves it. The logic: `src/game.ts` (`Game`: one `pass` is the
  original's main loop, 25 a second; lives, score, items, gauge, `snapshot()`/`restore()` for saves), Monty in `src/monty.ts`, the six room scripts in `src/rooms/`
  over the shared primitives in `src/primitives.ts`, random numbers behind `src/random.ts` (`SeededRandom` in the game; the test feeds the original's R reads).
  `test/lockstep.ts` compares the whole game with the original every pass (entity table, score, lives, items, map, attributes, script variables, pocket, effects) and
  `test/playthrough.ts` plays rooms 2 and 5 and the whole game to the ending with a bot, all in lockstep with 0 differences; `test/newgame.ts` and `test/stray.ts`
  complete it (all in the fast set; the heavy lockstep is in the slow set). `src/info.ts` is written for the finished build and the game is not in `games/registry.ts` yet.
  The originals (tape, 48K ROM, exercisers, states) are gitignored in `games/moley/build/` of the main checkout (`games/moley/build/README.md` remakes them).
  **For Chris:** the original has a bug in room 2 (a kill by the prize's second half can jump to the wrong address; `re/README.md`, "Where the rebuild differs") that the
  rebuild does not copy: the room restarts as the authors meant. Say if ORIGINAL should repeat it (it costs a life a pass until Monty moves away). Next is stage 4 (the
  picture, compared with the original frame by frame; Chris's addition: no-clash sprites as an ENHANCED item, not built; both modes keep the Spectrum's own colours, a C64 or softened palette was tried and dropped).

- **Architecture work,** from `docs/architecture-review.md` (2026-10-16): its order of work is done (strictness holes + the
  `node:test` runner; generated code out of git + dead code; the small shared pieces; `runPort`, the continue-flow reducer and
  typed `Found`; the save envelope and the registry). Finding 10 (AGENTS.md too long) was settled by the doc cleanup
  (45 KB to 19 KB). No state libraries; schemas are in-house (`S`).
- **Saves:** every stored save has `{ game, format }` (`games/shared/saves.ts`). The day a game's save bytes change, bump its
  codec's `format` and let `unpack(bytes, format)` read the old one; the old-format fixtures
  (`games/shared/test/fixtures/saves`) keep proving players' saves load. Storage measured at ~1.4 M of the ~5.2 M characters
  a browser gives for all ten games' current and previous saves, so they are not compressed; a failed write shows a line in the overlay.
- **The HD tests in the slow set** (`*/test/hd.ts`) have not been run under the new runner; Blackwyche's grew past 980 MB.
- **History:** squashed to one commit on 2026-10-16 (Chris asked: no old history); a backup is in `/root/projects/runstop64-history-2026-10-16.bundle`.
  From here: fewer, larger commits with plain messages.

## Waiting on Chris

- **Moley Christmas:** whether ORIGINAL repeats the original's room 2 bug (killed by the prize's second half early in a puzzle round, Monty is not sent back and loses a life a pass; `games/moley/re/README.md`, "Where the rebuild differs"). The rebuild restarts the room.
- **Blackwyche GUIDED:** his notes on the draft lines (he wanted the prose less clumsy; `games/blackwyche/src/guided-lines.ts`).
- **JSW2:** gentler collisions, rope grip, room-entry grace, and whether the bedroom should blink before it is visited
  (`games/jsw2/QOL.md`, "Proposed").
- **Antiriad:** a second quest; a one-page plan first.
- **Saves design:** move the F1 saved-games screen to the overlay as a plain list. Propose first.
- **Older:** Monty warp to the Ultimate Experience; Starquake hints.
