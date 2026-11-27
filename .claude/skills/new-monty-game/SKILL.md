---
name: new-monty-game
description: Start or build a new Monty Mole game on Monty on the Run's engine (a MontyData value run by runMonty), after Do Svidaniya Monty. Use before planning a new Monty game, scaffolding one (tools/new-game.mjs), laying out its regions on the exit grid, or reviewing one against Chris's rules, so the engine and the rules are not re-derived.
---

# A new Monty game on the kit

What Monty on the Run (`games/montyotr`) and Do Svidaniya Monty (`games/montyworld`) taught us (2026-11-20 to 11-27), distilled.
The why behind every rule is `games/shared/monty/LESSONS.md` (read it once, before designing); the how is
`games/shared/monty/README.md`. This skill is the order of work and where things are. For a room: skill `monty-room`; for a new
mechanism: skill `monty-mechanism`; to ship: `runstop64-ship`.

## 1. Scaffold it (minutes, not a day)

```sh
nice -n 15 node tools/new-game.mjs <id> "<Title>"     # games/<id>/, registry entry (listed: false), tests.mjs entry, docs/<id>-feedback.md
nice -n 15 npm run --silent typecheck
tools/wait-turn.sh && nice -n 15 node tools/test.mjs games/<id>/test/walk.ts
```

It writes the smallest game that boots: `src/start.ts` (a region: `ROOM` ids, `SECTORS` names, `SECTOR_COLOURS`, one `room({...})`
literal), `src/data.ts` (the `MontyData` value: `buildRooms` over the rooms, Monty on the Run's look with Do Svidaniya Monty's art after
it, every mechanism list empty), `src/main.ts` (`runMonty(host, GAME, { codec })`), `src/info.ts`, `test/walk.ts`. Load it at `#<id>`.
It borrows montyworld's room writer (`src/layout.ts`) and art (`src/art/world.ts`): a second game imports them or moves them to
`games/shared/monty` first (README "Where the kit lives"), never copies them. Say so when the borrowing starts to bend a file.

## 2. What is shared, what a game declares

| Shared, written once | A game declares |
|---|---|
| The engine (`games/montyotr/src/game.ts`, items, map, save, ending, title), `MontyData` (`montydata.ts`) | One `MontyData` value (`motr.ts` and `games/montyworld/src/data.ts` are the two models) |
| The session `runMonty` (`session.ts`): pause, map, travel, autosave, continue, EASY/HARD, touch | `main.ts`: `run(host)`, its `CODEC = montyCodec(name, format, older)` |
| `RoomSpec`, `buildRooms`, `extendTiles` / `extendEnemies` / `extendBank` (`games/shared/monty/rooms.ts`) | Region files: rooms as literals naming their id, mechanism entries naming their room |
| Each mechanism: a module in `games/montyotr/src` reading a list of the value | The list's entries, per region, concatenated in `data.ts` |
| Bots: `search`, `play`, `newGame(data, enhanced)` (`games/shared/monty/test/bot.ts`); legs from recorded routes (`legs.ts`, `--record`); no-way proofs (`proofs.ts`) | Its legs (`route.ts`, `<region>-route.ts`), a routes folder (`test/routes`, `routes-dir.ts`, `search.ts`) |
| Room scoping: `--room` on `tools/test.mjs`, `RoomScope` (`scope.ts`), the planner (`affected.ts`) | `test/scope.ts` (`REGION_ROOMS`, `SCOPE`, `prints()`), `test/affected.ts` |
| The reward show (`games/shared/ending/`), the parade or `procession` | `ending` (places, routes, cast, credits), `completion` (the finale) |
| Hubbard's driver and tune; a region's version is a `RegionTune` (`montyworld/src/music/region-tune.ts`), crossings at the phrase | `music.tuneFor`, one version per region, `test/music-<region>.ts` |

Copy montyworld's wiring as you grow (its `test/scope.ts`, `route.ts`, `mech-kit.ts`, `shots-kit.ts` are the templates). Item effects are
`roomEffects` (`RoomEffect`: clear cells, place a tile, remove a creature, `at` for a gate used on the spot); hints `hints.take` and
`hints.wanted` (the reason, in the story, 32 characters); costumes `costumes`. Rooms are appended in the order made: a shipped room's
tables never move (montyworld's `ADDED_ROOMS`); a change to them bumps the codec's format with a migration (`save-migrate.ts`).

## 3. The order of work

1. **Plan with Chris, region by region, before building** (`docs/<id>-plan.md`, model `docs/dosvidaniya-plan.md`): the story, the
   route, each region's places, set pieces (one or two nobody forgets: plan them first), items, costumes, food, mechanisms. Expect him
   to correct geography and order; follow it exactly.
2. **Lay the regions out on the exit grid.** Study Monty on the Run's grid first (`docs/dosvidaniya-moscow.md` Part 1: how its rooms
   open and join). A region is a block several rooms high, not a row: start one way, go down, circle back up, cross rooms twice at
   different heights, a dead end with an item, the lock met before the key. One table owns regions and columns (montyworld's
   `src/regions.ts`); the map and the music read it. A region's way out is the next one's way in at the same cell and rows.
3. **Write the region doc** (`docs/<id>-<region>.md`, model `docs/dosvidaniya-moscow.md`: the rooms each its own shape; items, gates,
   doubling back; the mechanisms; decisions for Chris). Chris approves it.
4. **Build the rooms** (skill `monty-room`; its challenge recipe), the region's mechanisms (skill `monty-mechanism`), its tune, food,
   hints, the bot's legs in both modes taking everything, and its `<region>-mechanisms.ts` in `SCOPE.section`s.
5. **Render and look** (Chris does not check by eye; you do):
   `nice -n 15 node tools/test.mjs games/montyworld/test/rooms-sheet.ts /tmp/claude-0/renders/<job> --room <ids or region>` (every
   creature's path traced) and `room-stats.ts` against the recipe. A new game needs its own copy of the sheet's game import.
6. **Two adversarial reviews** (design and play; engine and correctness), fixes, the one test per change, then the coordinator's gate.
7. **Chris plays it.** His notes go in as rows of `docs/<id>-feedback.md` (one row per room, quoted, status open / in pass / done
   (commit) / his call), not only into chat. A fix marks its row done with the commit once the render shows it. New lessons go
   back into LESSONS.md, so the next game inherits them.

## 4. The rules Chris taught (dated in LESSONS.md)

- **Monty on the Run is the benchmark**: Monty's moves are its own (walk, jump arc, ropes, no steering in the air). No mechanic it
  lacks for Monty; a world's machines (icicles, trains, boulders) are fine, and info/hint QOL is welcome. Climbs are easy.
- **Regions wind and double back** like MOTR's, never a corridor, never AWM's open map; an "aha" per region (seen, reached later);
  an item never gates just a coin, and a gate is never optional.
- **Challenge as MOTR builds it** (its rooms, measured: `games/montyworld/test/room-stats.ts`, `docs/dosvidaniya-room-audit.md`):
  median 3 creatures (2 of them long up-and-down patrols, ~8 cells; a vertical creature in 94% of rooms, no room of walkers only),
  8 ledges on 6 levels, 2 ropes or ladders, 1 coin, a mechanism in a third of rooms, each room one thing of its own. At least two
  puzzles a room of jumps and creatures together, mixed speeds, hard both ways. Measure every region against it.
- **Colour changes room to room**, place-true, no grey by default, creatures standing out from what they cross
  (`creature-contrast.ts`); MOTR led brown in 6 of 34 rooms, our first pass 41 of 84.
- **A place reads at a glance** (would a stranger name it?); backgrounds only on the horizon, no full-screen fill; no words on the
  scenery; nothing floats; a landmark once; what looks like a floor is one.
- **Names** plain and evocative first, a pun only when it lands, no Bond puns; hints give the reason in the story.
- **Costumes** are worn, small on his head above the eyes, his face always showing (`art/costume.ts` and its test).
- **Music**: Hubbard's driver and tune; a version changes scale and instruments, never the tempo; the intro note for note; the
  song never restarts between regions.
- **No unasked cuts** (2026-11-24): a redesign adds and improves; removing or shrinking a room or set piece needs his OK, one by one.
- **A death restarts in the same room, as he came into it** (2026-11-22), never the previous room, never a "last safe spot".
- **EASY or HARD only, about the lives** (2026-11-24); every other help on in both; `assists: ['lives', 'respawn', 'hints']`.
- **It fits a real C64**: a byte per kind, 256 characters, 8 sprites a room, a region within budget (`budget.ts`).
- **The game ramps up**: fewer, stronger rooms (8 to 10 a region), the best set pieces late, the late regions built with as much care.
- **Credits** written for the game, sourced; a new game and a tribute, never a fan game, no filler statistics.

## 5. Testing it (AGENTS.md "Testing is a budget")

One test while iterating, scoped: `nice -n 15 node tools/test.mjs games/<id>/test/<region>-mechanisms.ts --room <id>`. A room's change
runs its room tests and its region's sections, not the world; bots and `--record` only when a route or gate changed, for the legs
through it. `node tools/affected.mjs` (no `--run`) before a commit, `npm run gate` once per batch by the coordinator. A new test goes in
`tools/tests.mjs`; every room-level test reads `SCOPE`, every part of a mechanism test is a `SCOPE.section([rooms], what, body)`
naming every room it enters (over-naming is safe).
