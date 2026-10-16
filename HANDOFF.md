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

- **Architecture work,** from `docs/architecture-review.md` (2026-10-16): Chris picks which findings to do. Suggested order:
  strictness holes + a `node:test` runner; generated code out of git + dead code; one shared port session (`runPort`);
  an explicit continue-flow state and typed `Found`; one save envelope. No state libraries (the review says why).
- **History:** squashed to one commit on 2026-10-16 (Chris asked: no old history); a backup is in `/root/projects/runstop64-history-2026-10-16.bundle`.
  From here: fewer, larger commits with plain messages.

## Waiting on Chris

- **Blackwyche GUIDED:** his notes on the draft lines (he wanted the prose less clumsy; `games/blackwyche/src/guided-lines.ts`).
- **JSW2:** gentler collisions, rope grip, room-entry grace, and whether the bedroom should blink before it is visited
  (`games/jsw2/QOL.md`, "Proposed").
- **Antiriad:** a second quest; a one-page plan first.
- **Saves design:** move the F1 saved-games screen to the overlay as a plain list. Propose first.
- **Older:** Monty warp to the Ultimate Experience; Starquake hints; Entombed, Karnath and Dragonskulle not checked for
  Blackwyche's ladder loop (Up held as a climb ends walks him back down).
