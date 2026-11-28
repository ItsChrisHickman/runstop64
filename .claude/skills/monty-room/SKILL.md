---
name: monty-room
description: Build, change or review a room of Do Svidaniya Monty (games/montyworld) - its layout, creatures, enemy puzzle, mechanisms, edges or colours. Use before touching a region file (moscow.ts, siberia.ts, china.ts, japan.ts, pacific.ts, andes.ts, rio.ts, sky.ts) or judging a room's challenge, so the engine is not re-read from scratch.
---

# A Do Svidaniya Monty room

What every room agent kept re-deriving (2026-11-27: of 391 runstop64 agent transcripts, 100+ opened `game.ts`, `montydata.ts`
and `data.ts` to learn the same few facts). Read this, then only the room you are changing.

## Read only this much

1. `games/shared/monty/LESSONS.md`: the sections **Challenge as Monty on the Run builds it**, **Rooms glimpsed first and reached
   later**, **A pattern to read, not a shuttle to hop** (and the region's own doc, `docs/dosvidaniya-<region>.md`, for its notes).
2. The room itself: `grep -n "id: ROOM.<key>" games/montyworld/src/<region>.ts` and read that `room({...})` literal and the
   mechanism entries naming the same room (`room: ROOM.<key>`).
3. `games/shared/monty/README.md` sections 2 and 3 only if you need a mechanism you have not used.

Do **not** open `game.ts`, `montydata.ts` or `data.ts` unless the change is to the engine (a new mechanism is a new module and a list
in `MontyData`, never a special case in `game.ts`).

## The room format (games/montyworld/src/layout.ts)

`room({ id, cell: [row, col], sector, palette, paint(g), shut?, coins?, cake?, item?, item2?, decor?, creatures?, crushers?, teleporter? })`.
The playfield is 32 x 20 cells; `palette` maps letters to `[tile, colour]`; `paint` draws with `g.box` / `g.clear`.
Keep each room and mechanism entry a literal naming its room id: the change detector maps lines to rooms by it.

A creature: `{ who, col, row, way, speed, range, colour? }`.
- `col`, `row`: its top left cell where it starts; `way`: `'right' | 'left' | 'up' | 'down'`, the way it heads first (it starts at the
  end it walks away from).
- `speed`: pixels a step; `range`: steps before it turns. **Patrol length in pixels = speed x range** (a cell is 8 px). They move
  every other frame.
- Monty on the Run mixes speeds 1 to 4 (24 of its 107 creatures at 3 or more); most of ours sit at 1-2. Its median room has
  3 creatures, vertical patrols about 8 cells, walkers about 10, 8 ledges over 6 levels (`room-stats.ts` measures both games).

- Sprites: 0 and 1 are the room's finds, 4-7 the creatures (slot n is sprite 4+n), but **sprite 7 is the costume's** wherever
  Monty wears a hat (every room after Moscow): three creatures at most (rio-mechanisms.ts fails a fourth). A Viktor border cameo
  takes a creature slot of its room (`viktor.ts` `PLACES`), so such a room keeps one free. Rollers and skewers name their sprite.
- A walker in a passage under four rows high cannot be jumped (his jump climbs two rows over a body two rows tall): never put one
  there (Chris on a narrow arm: "almost impossible to jump over"). A ladder or a tread over its patrol is the place to wait.

Edges: an open edge cell that meets a wall in the room beside is a trap; close it with `shut` (`joins.ts` checks every join).
Water only kills outside whole swim rooms: never show water a snorkeller would expect to swim in and then drown him.

## The challenge recipe (Chris, playtesting the regions after Moscow: "Russia was perfect", the rest "ridiculously easy")

- At least two puzzles a room, each made of jumps **and** creatures together; three creatures is the norm, one is a fault.
- Creatures cross the way he must go: a patrol he can avoid without trying, or that cannot reach him, is decoration. A creature
  that is "impossible to hit" is as wrong as one impossible to pass.
- Mix speeds and patterns: a fast one low, a slow one crossing it on another axis; two creatures crossing on different periods
  so the gap has to be read and waited for. Hard **both ways** through the room.
- Long patrols that sweep the ledge (Chris on HONOLULU: "should go much further left and right and be faster"); never a shuttle
  of a few cells that is merely annoying to hop (THE INCA BRIDGE).
- Patience and exact jumps: a gap to time, then a jump that must be exact.
- Several ways through neighbouring rooms (MOTR's pair of rooms with three paths): an easier path for whoever doubles back
  and goes up through the middle.
- Mechanisms run on their own (icicles fall on a cycle, cars keep moving, waves come several at a time), not only when he stops.
- A room seen first and reached later; colour changes room to room (not brown again: brown led 41 of our 84 rooms, MOTR 6 of 34).
- A room that looks walkable left or right must either lead somewhere or read as closed: decide where the room would be on the map.

## Look at it, then test one thing

```sh
# the rooms as drawn, every creature's path traced over 8 s (white), its start (yellow), and speed / range / patrol per creature
nice -n 15 node tools/test.mjs games/montyworld/test/rooms-sheet.ts /tmp/claude-0/renders/<job> --room <ids or region.key>
# the challenge floor (at least two hazards a room, as Monty on the Run's): take a fixed room off PENDING in challenge.ts
nice -n 15 node tools/test.mjs games/montyworld/test/challenge.ts --room <id>
# what meets him as he steps in at an edge (creatures fresh, as on every entry): frames alive standing / walking, and the jump windows
nice -n 15 node tools/test.mjs games/montyworld/test/entry-probe.ts <room id> <col> <floor row> [left|right]
# the recipe numbers against Monty on the Run's
nice -n 15 node tools/test.mjs games/montyworld/test/room-stats.ts
# the one test for the room (its region's mechanisms, scoped)
tools/wait-turn.sh && nice -n 15 node tools/test.mjs games/montyworld/test/<region>-mechanisms.ts --room <id>
node tools/affected.mjs          # the plan before a commit; read it, don't run it blindly
```

Look at the sheet yourself (Read the PNG): a creature whose trail does not cross his way, or a trail a few cells long, is the fault
to fix. Then the testing rules in AGENTS.md (one test while iterating; the full gate is the coordinator's, once per batch).
