# Handoff: start here

For a session picking up runstop64. Read `AGENTS.md` first (the rules, the shared modules, the lessons); this file is only what
is next and what is waiting on Chris. Last updated 2026-10-16.

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

- **Moley Christmas** (ZX Spectrum only): plan stages 1 and 2 are done in a worktree commit (`docs/moley-plan.md`). Data: `games/moley/re/extract.ts`
  writes the committed `src/data/*.ts`; `test/data.ts` proves it (and sprites, drawn by the game's own routine). Monty alone: `src/monty.ts`,
  `player.ts`, `gauge.ts`, `input.ts`, `cycle.ts`, `sprite.ts`, compared with the original every pass by `test/lockstep.ts` (fast and slow set in
  `tools/tests.mjs`); `src/info.ts` is written for the finished build and the game is not in `games/registry.ts` yet. The originals (tape, 48K ROM,
  exercisers, states) are gitignored in `games/moley/build/` of the main checkout (`games/moley/build/README.md` remakes them). Next is stage 3 (room
  scripts, enemies, items; feed the R register in lockstep). Chris's additions for stage 4: no-clash sprites and a C64-style palette, both ENHANCED
  items (ORIGINAL keeps Spectrum colours and the clash; no separate toggle), in the plan, neither built.

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

- **Blackwyche GUIDED:** his notes on the draft lines (he wanted the prose less clumsy; `games/blackwyche/src/guided-lines.ts`).
- **JSW2:** gentler collisions, rope grip, room-entry grace, and whether the bedroom should blink before it is visited
  (`games/jsw2/QOL.md`, "Proposed").
- **Antiriad:** a second quest; a one-page plan first.
- **Saves design:** move the F1 saved-games screen to the overlay as a plain list. Propose first.
- **Older:** Monty warp to the Ultimate Experience; Starquake hints.
