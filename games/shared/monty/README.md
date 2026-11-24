# The Monty game kit: making a new Monty game

How a new game is made on Monty on the Run's engine, after Do Svidaniya Monty (`games/montyworld`). This file is the *how*;
`LESSONS.md` beside it is the *what and why* (the formula Chris taught us: read it first, design by it, review against it).
AGENTS.md has the rules, the shared modules table and the testing rules.

Where the kit lives today: the engine is `games/montyotr/src`, the shared pieces are here (`games/shared/monty`, its bots and
room scoping in `test/`), and some of the kit is still in Do Svidaniya Monty's folders (its room writer `layout.ts`, its music
`src/music/region-tune.ts`, its test kits `test/*-kit.ts`). A second game imports those or moves them here first; never copies them.

## 1. A game is one value

A game is a `MontyData` value (`games/montyotr/src/montydata.ts`) and a `main.ts` that calls `runMonty(host, data)`
(`games/montyotr/src/session.ts`). The engine, the session, the pause screen, the map, saves and the reward show are written
once; a second game is a second value, not a copy. Monty on the Run's own value is `games/montyotr/src/motr.ts`; Do Svidaniya
Monty's is `games/montyworld/src/data.ts` (with `src/main.ts` and its save codec). Register the game in `games/registry.ts`.

A new game's `assists` are all on (`['lives', 'respawn', 'hints']`): EASY/HARD changes only the lives (AGENTS.md).

## 2. Rooms

The room format is `RoomSpec` in `rooms.ts`: a 32 x 20 playfield map (eight tile codes a room, each a tile and a colour), coins,
cake, key items, decorations and signs, creatures, Mole Crushers, a teleporter. `buildRooms` turns a list of them into the
tables the engine reads; `extendTiles`, `extendEnemies` and `extendBank` add a game's own art after Monty on the Run's.

Rooms are not written as strings by hand. `games/montyworld/src/layout.ts` has `room()` and `Grid`: a palette of letters
(tile name and colour), a `paint(g)` of rectangles (`g.box`, `g.clear`), then coins, decor and creatures in playfield cells.
Each region is one file (`src/moscow.ts`, `siberia.ts`, ...) that:

- declares its room ids as a table (`export const ROOM = { start: 0, ... } as const`);
- writes each room as a literal naming its id (`room({ id: ROOM.start, cell: [1, 0], ... })`) and each mechanism entry as a
  literal naming its room (`{ room: ROOM.streets, col: 11, ... }`). This is what lets a changed line be traced to its room
  (`test/attribute.ts`), so keep it so;
- exports its rooms, sector names and map colours (`MOSCOW_ROOMS`, `SECTORS`, `SECTOR_COLOURS`).

The world's regions and their columns of the exit grid are one table, `games/montyworld/src/regions.ts` (`WORLD_REGIONS`); the
map and the music both read it. Rooms are appended in the order regions were made, so a shipped room's tables never move.
Art goes in `src/art/<region>-*.ts`, gathered in `src/art/world.ts`. Text goes through `lettering.ts` (`gameText`).

## 3. Mechanisms are data

Every mechanism beyond walking is a module in `games/montyotr/src` (`escalators.ts`, `icicles.ts`, `tunnels.ts`, `cracks.ts`,
`pulses.ts`, `rollers.ts`, `vines.ts`, `dragons.ts`, `floats.ts`, `levers.ts`, `pursuers.ts`, `cablecars.ts`, `planes.ts`, ...) driven by a
list in the `MontyData` value (`escalators`, `icicles`, `pulses`, `rollers`...; Monty on the Run's lists are empty). A region
declares its entries (`ESCALATORS`, `ICICLES` in `moscow.ts`) and `data.ts` concatenates them. What an item does is a
`RoomEffect` in `data.ts`'s `ROOM_EFFECTS` (clear cells, place a tile, remove a creature, when an item is taken); its hints are
`hints.take` and `hints.wanted` there (the reason, in the story); a costume is a `costumes` entry. A new mechanism is a new
module and a new list, never a special case in `game.ts` for one room. A flown sequence is rooms too: `planes` (Do Svidaniya Monty's flight, `src/sky.ts`) makes each leg a room, so deaths, saves and travel need nothing new; `ways` sends an edge's way out to a cell that is not beside it; `tally` draws a Spy vs Spy score in the score row.

## 4. Tests: the kit, and testing only the rooms you touched

The bots (`test/bot.ts`: `search`, `play`, `newGame(data, enhanced)`) search the game's own frames. A region's bot is a list of
legs (goals: `games/montyworld/test/route.ts` for Moscow, `<region>-route.ts` for the rest) played by `test/legs.ts`
(`runLegs`) from recorded routes in `games/montyworld/test/routes/` (`--record` after a route changes, `--full` to search
afresh); mechanism tests record their searches the same way (`test/proofs.ts`, `games/montyworld/test/search.ts`), the ways found
as routes that are played back and the searches that found no way as answers kept while their fingerprint holds (the engine and
every non-room source, the test-side code, the exact start, and every room of each region the search went into or borders on): a
change to a room searches that region's no-ways again, nothing else. `--record` once after a room or mechanism changes.

Room scoping (`test/scope.ts`): every room-level test reads `SCOPE`, and every part of a mechanism test is a
`SCOPE.section([rooms], what, body)` naming every room it enters, reads or can wander into (over-naming is safe). A game
declares its rooms once (`games/montyworld/test/scope.ts`: `REGION_ROOMS`, `SCOPE`, `prints()`) and its tests for the planner
once (`games/montyworld/test/affected.ts`). Then:

    nice -n 15 node tools/affected.mjs                               # the plan for this diff, with times (--run runs it, within the 10-minute budget)
    nice -n 15 node tools/test.mjs games/montyworld/test/climbs.ts --room moscow.streets

`tools/affected.mjs` maps changed lines to rooms and runs the room tests over them (joins, climbs, stands, edges, contrast,
crushers...), the region's mechanism sections and bot legs through them, and the cheap world-wide checks. The shared
helpers for writing a region's tests are `games/montyworld/test/mech-kit.ts` (a game with Monty placed in a room),
`climb-kit.ts`, `map-kit.ts` (the region's map as a picture) and `sheet-kit.ts` (art preview sheets).

## 5. Pictures

Look at every room as the engine draws it: `games/montyworld/test/shots-kit.ts` (`placed`, `shot`, `savePng`, `contactSheet`,
`compare` beside one of Monty on the Run's rooms). Each region has a `<region>-shots.ts` on it:

    nice -n 15 node tools/test.mjs games/montyworld/test/siberia-shots.ts /tmp/siberia-shots

Pictures check nothing; they are how a room is judged against LESSONS.md ("would a stranger name it?").

## 6. Music

Hubbard's own tune and driver, changed only in its data: a region's version is a `RegionTune`
(`games/montyworld/src/music/region-tune.ts`: a scale, scoops, instruments, breaks and fills, never the tempo; `retune` makes
the .sid). Moscow's is the model (`src/music/moscow.ts`). `src/music/regions.ts` gives each region of `WORLD_REGIONS` its tune
(`tuneForRoom`, the value's `music.tuneFor`), and `src/music/crossing.ts` changes version at the next phrase between regions.
Each version is checked by `test/music-<region>.ts` on `test/music-kit.ts` (`checkTune`).

## 7. The ending and the procession

The value's `ending` is a `MontyEnding` (`montydata.ts`): the montage's places (`games/montyworld/src/ending-places.ts`, routes
in `ending-routes.ts`, scenes in `ending-scenes.ts`), the cast, the closing credits, and the `procession`: troupes marching on
a plain ground after the credits (`games/shared/ending/show.ts`, its clock `games/shared/ending/procession.ts`; Do Svidaniya
Monty's carnival `parade`, with the villain's gag at its tail, is `PROCESSION` in `ending-scenes.ts`). Look at it with
`games/montyworld/test/parade-shots.ts`; `test/reward.ts` checks the show.

## A worked example: Moscow's Kremlin guard

The ushanka sends the Kremlin guard off, and Monty wears it from then on:

1. The room: `{ id: ROOM.kremlin, ... }` in `games/montyworld/src/moscow.ts`, the guard a creature pacing the arch; the
   ushanka an `item` in `{ id: ROOM.platform, ... }` in the same file (meet the lock before the key).
2. The effect: `{ room: ROOM.kremlin, when: [{ taken: USHANKA_ITEM }], removeEnemy: 0 }` in `ROOM_EFFECTS`, `src/data.ts`;
   the two hints in `hints.take` / `hints.wanted`; the worn hat in `costumes` (art in `src/art/hat.ts`).
3. The proof: the section `'the guard in the arch and the hat'` in `games/montyworld/test/mechanisms.ts` (the guard blocks the
   arch without the hat, is gone with it) and Moscow's bot (`test/moscow.ts`, legs in `test/route.ts`).
4. A change to the Kremlin room alone: `node tools/affected.mjs` plans those rooms' tests and sections, not the world.

## The order of work

From LESSONS.md's "How we build it": plan the story, route and set pieces with Chris region by region; build a region with its
bot in both modes; look at its shots; two adversarial reviews (design and play, engine and correctness); fix; test what the
change touches; ship. Write every new lesson back into LESSONS.md.
