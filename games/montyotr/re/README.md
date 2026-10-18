# Monty on the Run: notes on the port

Monty is the native port the others follow (see AGENTS.md and GAMES.md): the original's data
extracted by `tools/extract-motr.mjs` into `src/data/motr.json`, its code rewritten in
`src/` with the reconstruction's zero-page names, its title checked frame for frame against
the original program (`tools/motr-prg.mjs`, `test/title.ts`). This file records what isn't
obvious from the code.

## Where the data comes from

Monty's data (`src/data/motr.json`) is extracted from Dave-Agent's annotated reconstruction,
[Dave-Agent/monty-on-the-run](https://github.com/Dave-Agent/monty-on-the-run). Only data is read, never its code. Clone the
reconstruction anywhere (say `/tmp/motr`) and run `npm run extract:motr -- /tmp/motr`.

The reconstruction has a refactored source and a byte-perfect one, and the refactored one changed pixels of the title's MONTY
logo, so the extractor checks what it reads against the original's own bytes (`tools/motr-prg.mjs` lays the original program
out from the byte-perfect source, no assembler needed). The same program is what `test/title.ts` runs on the probe as the
reference for the title: `node tools/motr-prg.mjs /tmp/motr /tmp/motr.prg`, then
`nice -n 15 node tools/test.mjs games/montyotr/test/title.ts /tmp/motr.prg`. The reconstruction's comments need checking against its code too: its "cursor up/down" for the name
entry is RETURN.

## runstop64's rooms (ENHANCED)

Ten rooms that aren't in the original, `$34`-`$3D` (the original's go to `$33`; `$30` is the
ending), in cells of the exit grid it leaves empty:

```
          col 19  col 20  col 21  col 22
row 2                     [$00]   [$34]   dev room (right of the start)
row 3                             [$35]   the way down
row 4     [$39]   [$38]   [$37]   [$36]   warp gates: Pie Are Square, the C5, the jetpack; hub
row 5     [$3D]   [$3C]   [$3B]   [$3A]   playground: vault, crushers, pool; under the hub
```

**Format.** `src/data/runstop64-rooms.ts` holds them as typed records in the original's own
terms, so they're read by the game's own code with no special cases:

- `map`: the 32 × 20 playfield as text, one character per cell: `.` empty, `1`-`8` the room
  codes the tilemaps use; `tiles` (tile library indexes) and `colours` for codes 1-8, as the
  room definition table has them. A tile's collision class comes with it (`tileProperty`).
- `coins` (playfield column, row), `decor` (screen column, row, a decoration type, or a sign),
  `crushers` and `teleporter` (screen coordinates, as the piledriver and teleporter tables),
  `enemies` (screen cell where the sprite starts, then the record's own fields: colour index,
  direction flags index, type, speed, range), `theme` (room_metadata_tbl), `sector`.
- Signs are decorations whose characters are the charset's capitals cut out of a board, its
  ends rounded like the street's MPL ST. sign (`signType` in data.ts). `(` is the game's
  apostrophe (as in its "DRIVE SIR CLIVE(S C5"). The sector names avoid Z: the game's small
  letters stop at Y (its name display starts a new word after one).

**Merging.** `data.ts` puts them in the original's tables after its own entries (coins,
decorations and their types, crushers, teleporters and their destinations), or at their ids in
the tables indexed by room (room theme, sector index: bytes past the original's 52 rooms that
nothing read). Everything the original's rooms read is unchanged (`test/runstop64-rooms.ts`
compares it with motr.json). The only way in is the grid: `Game.roomAt` shows
`extensionGrid`'s cells with the `rooms` assist on (ENHANCED), and while Monty is in one of
the rooms (switched to ORIGINAL there, their ways stay open until he's out). Saves keep the
original's grid; a save made in one of the rooms, continued in ORIGINAL, starts him in the
start room (`save.ts restore`).

**Things that mattered.**

- The C5 rooms were "`$31` and up" in the original (its last rooms): `isC5Room` names them.
- A teleporter's dissolve shows Monty's sprite where he touched the beam (its shadow isn't
  moved during the sequence), in the new room, and the collision latched on its last frame
  counts once he's free: an enemy passing that spot in the destination kills him on arrival
  (the original's teleporters too). Each warp's beam is placed so that spot is clear of the
  destination's enemies (Pie Are Square's left side has a falling enemy).
- The game's enemies move on through a dissolve, so the warp into the C5 street comes straight
  in, as travel and walking in do; warps bring Monty in on foot (`c5Arrive(C5_START)`).
- Monty can't jump over an enemy on the floor (20 pixels up, too briefly above a 16-pixel
  sprite), and he grabs a rope only walking or falling into it, not jumping. The playground's
  enemies cross the way up and down (pass under them when they're up) or patrol a shelf.
- **Coins and cake.** At most two coins a room, and a cupcake (the original's food item: frame base 3, pointer $91, 200 points; `cake` in the room's record, merged into si_spawn_tbl after the original's 20, so `siCollected` grows with it) in five rooms. Its big CAKE ($BF, room $01) is the original's cheat prize (taking it turns cheat mode on), so not that one. The test takes each one by play (a search with the enemies and crushers moving), which is what found the vault's two coins on the teapot's shelf unreachable: they're off it now.
- **Warps land as the way in leaves the rooms.** $1D's only way in is across $1C, whose floor is put in by the joystick ($1B): `teleporter.found` lists the items a destination's way in has taken, and the warp marks them found (no score). And a death before two seconds on his feet in a room (ENHANCED, `Game.respawn`) goes back to the last room entry that had them: walking into a room onto an enemy's path ($09 from $08) or over a hole was a death loop.
- `test/runstop64-rooms.ts` proves the rooms by play: a breadth-first search over the game's
  own frames (the game copied at each step; enemies and crushers part of the state) from each
  way into each room to every exit.

## The ending's montage (ENHANCED)

`src/ending.ts` runs the game's own engine (`Game`, a second one of ours, never the player's) through twelve rooms, Monty
driven by a route (`src/pilot.ts`: runs of a stick held, as text) found by `re/routes.ts`: a beam search over the game's own
frames (the game copied at each step, `src/game-copy.ts`) from where he comes into the room to the thing the scene says (an
item, coins, the C5 driven, the treasure), the nearest-the-goal states kept at each depth, the crushers' timing seeded. The
search only finds the routes: the show replays them as input, and `test/reward.ts` replays each in a game with no grace and
checks it does what the scene says without a death. In the show a moment's grace is on all the same (the crushers' timing is
random there). Rooms with a way that goes round, or too many creatures, had no route within the search's limits and are not
in the montage (the sewers' pipe rooms, the dock's way down to the treasure: that scene starts on the ledge beside it).
Sources of the credits: `re/credits.md`.

Facts found on the way: a standing place is a floor under Monty's 2x2 characters (`blockedBelow` looks at row +2); the dock
room's treasure is at x2 $40, y $9A and the ending runs 612 frames from his touch to GAME OVER; the enemy table's types 32-34
are one creature (a plane towing GOOD LUCK!, three sprites moving together in room $23); type 31 is room $30's, which has no
cell on the exit grid.
