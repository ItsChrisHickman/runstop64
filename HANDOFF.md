# Handoff: start here

For a session picking up runstop64. Read `AGENTS.md` first (the rules, the shared modules, the lessons); this file is only the
state of things and what is waiting on Chris. Last updated 2026-11-24.

**Active, 2026-11-24: Do Svidaniya Monty** (`games/montyworld`, `#montyworld`), Chris's original Monty game on Monty on the
Run's engine. Read `games/shared/monty/LESSONS.md` (his rules), `docs/dosvidaniya-reset.md` (the reset plan and what was built)
and `AGENTS.md`'s testing rules ("Testing is a budget": ~5 minutes of tests a change, the full gate once per batch; Chris is very sensitive to slow,
broad test runs and to many agents at once: at most four, one running region bots).

Live: Moscow, China, Japan (Chris says leave them be; only his own notes touch them); Siberia, the Pacific, the Andes/Amazon and
Rio rebuilt smaller (54 rooms); Viktor Vole, KGB, Monty's mirror (title intro, a too-late cameo at each border, his shadow in
THE LAST MOLE, escapes on the train and the cargo ship, the SPY VERSUS MOLE puzzle in Rio, squashed with Monty on the Run's
crusher death); the close-up beach finale and the carnival parade ending in a crusher on Viktor; the new title; region tunes
Hubbard-first, crossing in step at phrase ends with a volume dip; EASY/HARD everywhere; restart the room as he came in.

Open (2026-11-24, end of the long session): shipped today also the cover art on the info card, the Monty kit README
(`games/shared/monty/README.md`) and the C64 budget (decoration kinds in one byte, with a budget test). Not finished:
- **The pause map** (whole world, scrolling between countries, travel anywhere visited, items over two rows): built on branch
  `backlog/pause-map` (`.claude/worktrees/backlog-pause-map`, commit 095a262), not reviewed or shipped. Review, run its tests
  (its own `pause-map.ts`), ship.
- **The top-centre HUD** (Monty's face, three Spy vs Spy stars, Viktor's silhouette that lights when he's due via
  `encounterState(g)` in games/montyotr/src/pursuers.ts and `VIKTOR_FACE` in games/montyworld/src/art/viktor.ts; lives only in
  HARD): not started. If Chris OKs the flight, the tally becomes Monty 2 v Viktor 1 before the finale.
- **Unshipped playtest-round fixes** on `reset/andes` (3 commits) and `reset/pacific` (5 commits) from the reset workflow's later
  rounds: look at them (`git log main..reset/andes`), merge what's good.
Waiting on Chris: see "Questions for Chris" below. Not doing: Siberia's fourth
car (would shift China). The title/continue
prompt names the game's own touch button (JUMP) since 2026-11-24.

Proposed to Chris, awaiting his OK (2026-11-24): THE FLIGHT, Hilo to the Andes (~75 s), redeeming AWM's flight (games/awm/src/flight.ts:
40 s, one plane on a loop): Monty flies a yellow mail biplane (MOTR jetpack feel, no gun) over AWM-style parallax cloud bands;
leg 1 seabirds (gull Vs, a diving frigatebird with a screech tell, a slow albatross) and Kilauea's ash plume; leg 2 weather (storm
clouds that flicker before lightning, gusts shown by streaks, a waterspout), coins on safe lines and in risky gaps; leg 3 Viktor in
a black plane tails him copying his path, shaken off into flocks/clouds, and as the Andes appear clips Monty's tail: Monty bails
out and parachutes into the Andes (replacing the walk-into-the-plane cut). The HUD tally becomes Spy vs Spy: Monty 2 (train, ship)
v Viktor 1 (the plane), settled in SPY VERSUS MOLE. C64: parallax bands like AWM's, ~8 sprites. The title's chase varies each loop
since 2026-11-24 (Viktor trips on SIBERIA's dot, Monty ducks behind JAPAN, Viktor overtakes then backs off: `src/title-chase.ts`).
The pause map shipped 2026-11-24. Waiting on Chris: the tipsy moment's source (AWM quirks); a playthrough of the rebuilt back half. Not doing: Siberia's fourth
car (would shift China).

## Questions for Chris (ask these first; each has a recommendation)

**Decided 2026-11-24** (Chris, at the start of the next session):
- **The flight:** build it as proposed (yellow mail biplane taken at Hilo, no gun, seabirds then weather then Viktor's black
  plane; Viktor wins it, Monty parachutes into the Andes, the tally reads Monty 2 v Viktor 1 before SPY VERSUS MOLE).
- **The title chase:** vary each loop: built 2026-11-24 (Viktor trips on a place's dot, since the names sit off the route).
- **The music crossing:** `phrase` (the phrase end, no dip); `DEFAULT_CROSSING` in `games/montyworld/src/music/crossing.ts`.
- **The parade ground:** stays dark grey.
- **The top bar:** with the flight in, one of the three stars becomes Viktor's (it lights when he wins the plane round).

Still open:

5. **Viktor's red star:** he's one white sprite (the coat drawn in black outline, the star cut into his hat). Add a second
   sprite over him for a red star, or keep him one sprite (C64 sprite budget)?
7. **AWM's tipsy moment** (reversed controls for a few seconds): which item or place causes it in this game? (No answer yet.)
8. **China's coin chamber** in ALL WALL AND NO PLAY now opens on the first pass, so its "seen but not reachable yet" moment is
   gone. Bring back a one-way way in (reachable only when the route brings him back from the right)?
9. **A playthrough** of the rebuilt back half (Siberia from the train, the Pacific, the Andes and Amazon, Rio with Viktor and the
   new ending): his notes drive the next work.

## State

All twelve games are built and checked, eleven of them in the directory (Starquake was deleted on 2026-11-15: Chris found it confusing, endless rooms with nothing worth playing; Wanted: Monty Mole was taken off on 2026-11-07: Chris found the 1984 game itself poor; it still loads at `#montymole`, and `listed: false` in `games/registry.ts` is the one switch. Its remake, Wanted: Monty Mole Remix, is listed since 2026-11-08), and the project is near finished. What is left is Chris playing it and the few
open questions below; nothing big is under construction.

- **Live** at https://goshow.me/runstop64/ (`npm run deploy`). Repo ItsChrisHickman/runstop64, cloned at
  /root/projects/runstop64. The games and how each was made are in `GAMES.md`; every change from the original is in the game's
  `QOL.md`.
- **EASY or HARD in every game** (2026-11-24, in place of ORIGINAL/ENHANCED): one switch (E on the pause screen), EASY by
  default. EASY: unlimited lives and continues, no lives counter; HARD: the original's lives. The three Pendragon games with
  energy and Thing on a Spring (oil) have no lives: in EASY a death that has played out starts the room again at full health
  (`vitals.lifeEnds`), in HARD it ends the game. Every quality-of-life change and the reward show on winning are on in both. No
  invincibility. The Pendragon games draw him as Dragonskulle does (`games/shared/pendragon/figure.ts`).
- **Gone on purpose:** Auf Wiedersehen Monty's shield (the cracked copy's always-on "nothing hurts me" leaf, the commercial game's MONTY cheat; the leaf itself is back as a 75-point item; old
  saves load with the flag dropped), the Pendragon games' full health on entering a room, Bounder.
- **Smoothing** is sideways only: a sprite glides between ticks horizontally and is drawn at the latest tick vertically, so a
  figure stands on its floor (`Smoothed` in `packages/c64kit/src/loop.ts`, `games/awm/test/ground-vertical.ts`). V shows whole-pixel steps.
- **Saves:** every stored save has `{ game, format }` (`games/shared/saves.ts`). The day a game's save bytes change, bump its
  codec's `format` and let `unpack(bytes, format)` read the old one; the old-format fixtures
  (`games/shared/test/fixtures/saves`) keep proving players' saves load. About 1.4 M of the ~5.2 M characters a browser gives are
  used by all the games' current and previous saves, so they are not compressed; a failed write shows a line in the overlay.
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
  graves, the starfish) are read, proved on the translation and the original, and turned into hints:
  `games/dragonskulle/re/README.md` section 9, `src/rules.ts`, `re/rules/` and `test/rules.ts`.
- **Karnath's hints** are live: sparkles on the pieces and the way to the obelisk, Pendragon's lines on the status line, the
  pieces counted on the pause screen (`games/karnath/re/README.md`, "Hints"; `re/hints/check.ts`).
- **The fast test set is slow** (it was ~11-13 minutes). It is being cut so `npm run verify` stays under 10 minutes; until
  then run the typecheck, `check:strict` and the tests for the code you touch (`tools/tests.mjs` lists them all).

## The reward show (one for every game)

Every game ends with a reward after the game's own ending: a montage of the game's places with the hero running
through and doing something that fits (the game's own engine, driven by input), Super Mario World-style credits over it (the
makers, then sourced fun facts, then `PORT_CREDITS`: "rebuilt for the browser by CHRISTOPHER HICKMAN with Claude"), the game's
creatures parading one at a time, THE END with stats, the game's music. Won is kept apart from the saves,
W on the pause screen once won, `?ending` on the page. Sources for every fact are in each game's `re/credits.md`; never invent
a credit. It runs 75 to 125 seconds now (`SHOW_FRAMES` in the kit, 3500 to 6500 frames; each test prints its length): the credits
through the places, then the parade (Monty on the Run, 127 s with 24 creatures, is the longest; Moley and JSW2 the shortest).

- **One module, two reels:** `games/shared/ending/`: `show.ts` (`RewardShow`), `timeline.ts` (the pure clock: a credit line is
  `CREDIT.slot` 90 frames, a creature's walk `NAME.slot` 125, THE END 250), `figures.ts`, `pilot.ts`, `credits.ts`, and `machine-reel.ts` (the
  translated-machine reel: Blackwyche, Dragonskulle, Karnath, Entombed, Thing on a Spring, JSW2). The native rebuilds (Monty, AWM,
  Moley, Antiriad) give a `Reel` and a `Place` list to `RewardShow` themselves.
  Test kit: `games/shared/test/ending-kit.ts` (`playShow`/`checkShow` for the machines, `CastWatch` and `BandWatch` for all).
- Weak spots: Entombed and Thing scenes with the hero mostly standing or bouncing (routes not found by search:
  `re/ending/route.ts`, `re/ways.json`); visitors stand at the hero's feet at the moment they enter, so on a stair or in a jump they
  may float a little. JSW2's scenes are cut short of their found ways (never longer: the test checks). Moley plays the first
  part of each screen's puzzle.
- **The parade rule (2026-11-20, Chris: "a firehose", wanted Super Mario World's one at a time):** the creatures come after every
  credit line, one at a time: `sharesOf` gives the whole cast to the last place that has credits (and does not say `visitors:
  false`), whose timeline is its lines, then one `NAME.slot` (125 frames, 2.5 s) turn per creature. A creature's walk is exactly
  its turn (`walkOf`), so it crosses the whole picture alone, its name under it all the way, and the next comes on as it leaves
  (`CastWatch` checks never two on the picture, each named while alone). A place whose reel has a route (Moley, Monty Mole)
  goes on after the route with no key, so the last room stays alive under the parade. Where a hero's way is only so long and
  must not run out (JSW2: Willy left standing is at the guardians' mercy), a scene says `limit` (its way's frames) and the
  parade also crosses the scenes after the last line that say `parade` (`Place.visitors: true`, no lines): each takes the walks
  that fit (JSW2: room 34 after its lines, then rooms 24 and 47).
- **The credit row keeps a gap:** the text's cell has at least a pixel row of the game's black above and below it in every frame
  (`touching` in the kit; `BandWatch` and `checkShow` check it). Each game's `CREDIT_ROW` was moved to clear its playfield.
- Creature names are ours where the games name none; Chris may want to change them.

## Open questions (found in the cleanup pass)

- **Thing on a Spring** oil out is a lost life back at the room's start with full oil (`vitals.lifeEnds`); the dragon flashes on
  each counted stone in Dragonskulle (`native/colour-cycle.ts`). Both are waiting on a playtest.

## Waiting on Chris

- **Playtests:** the endings, the Dragonskulle figure in Karnath/Entombed/Blackwyche, Thing on a Spring's lives, the dragon flash,
  vertical position without smoothing on a phone.
- **Blackwyche GUIDED:** his notes on the draft lines (he wanted the prose less clumsy; `games/blackwyche/src/guided-lines.ts`).
- **Karnath hints:** his notes on the lines (`games/karnath/src/hint-lines.ts`).
- **JSW2:** the "a lot easier" set, now in both modes (double jump, ropes that hold, unlimited lives, room-entry grace, gentle touch,
  item sparkles) and the pause map laid out by the exits are built, waiting on Chris to play them (`games/jsw2/QOL.md`); the
  reachability sweep is not.
- **Antiriad:** a second quest; a one-page plan first.
- **Saves design:** move the F1 saved-games screen to the overlay as a plain list. Propose first.
- **Older:** Monty warp to the Ultimate Experience.
- **Wanted: Monty Mole Remix** (`games/montymoleremix`, in the directory): done and bot-proved; Chris finds the game itself not one of his,
  so it is left as is. Offered, not built: the tool kept across rooms and deaths until used, and a picture of it by the lives
  while held (the original loses it on leaving the room or dying, and shows nothing). His one-word answer was "Original" (read as: he
  had played in ORIGINAL); ask before building. The faithful Wanted bot's WIP is on branch `worktree-agent-a8fa738a703218e33`, unmerged.

## Next

1. Chris plays; fix what he finds (photos and saves).
2. The faster test suite lands, then `npm run verify`, then the coordinating session merges, pushes and deploys.
3. Decide the open questions above, then call it finished.
