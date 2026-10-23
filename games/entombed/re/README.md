# How Entombed was ported

No disassembly or source of Entombed existed, so this port was made from the
game itself (the "Vanilia & Florasoft" crack on archive.org; see
`../build/README.md` for the snapshot it starts from).

## 1. Translation

`tools/re/to-ts.mjs` translates 6502 routines into TypeScript, one function
per routine, exactly: the registers and flags live in `games/shared/native/cpu.ts`, memory is
the C64's own (`ram`, or `rd`/`wr` for anything that may be I/O), control flow
is rebuilt as blocks and loops, and flag updates nobody reads are dropped.
Each line keeps the original instruction as a comment.

- `engine.json`: the engine (everything outside $6000-$66FF).
- `room-XXXX.json`: room code. Each chamber brings a $700-byte block of code
  and data that the game swaps into $6000 (stored at $XXXX in the image; the
  corridor block is the one at $6000 to begin with). `src/rooms.ts` picks the
  module for whichever block is loaded.
- The wait for raster line $D7 (`$2098`) becomes `yield`: one frame. Loops that
  poll hardware or interrupt-updated RAM (`volatile`) yield too.

Regenerate with `npm run gen` (`tools/gen.mjs`; `src/gen/` is not committed and is rebuilt when a config or `.state` changes).

## 2. Native runtime

`src/native.ts` runs the translated main loop on c64kit's model of the C64's
chips (VIC-II, SID, CIA) with no CPU: each tick runs a frame of game logic at
raster line $D7, as the original did, then lets the frame's raster time pass;
the raster interrupt (the original's handler, translated) splits the screen.

## 3. Checks

- `tools/re/test/run-fuzz.mjs`: every documented opcode in every addressing mode, translated and run against c64kit's 6502
  from thousands of random states. All 137 forms match.
- `games/shared/native/test/verify.ts entombed`: each translated routine patched into the running original; on every call
  the native version and the original run from the same state and must leave identical memory, registers and flags.
- `games/shared/native/test/lockstep.ts entombed`: the whole native game against the original from the same snapshot with
  the same input, memory compared after every pass of the main loop (title, play, restart, running out of air, explored
  rooms).
- `games/shared/native/test/explore.ts entombed`: Go-Explore style automatic play, to reach rooms to test from.
- `games/entombed/test`: `combat.ts`, `controls.ts`, `frontend.ts`, `grace.ts`, `map.ts`, `stairs.ts`
  (below).

## 4. Hints (`re/hints/`)

The hints assist (sparkles over the places in a chamber where something can be done and
hasn't been yet) is read from the chambers' code and checked by playing, not placed by hand.

How the game keeps its puzzles: each chamber's block (at $6000 while he's in it) has its own
state (counters, steps), set up again each time he goes in; what's done for good is kept in
global flags: the items he finds ($322A-$322F; the whip is needed to whip, the torch to use it in
the dark chambers: a flash, the room stays black), the scrolls read ($3235-$323B), chambers done ($37F9-$37FF) and the way
out ($3230). Most things are done by touching a sprite (the hardware collisions, $D01E, kept
in $3214), with the whip (sprite 3) or by standing somewhere. The wider chambers scroll a
little when he walks near an edge: $3212/$3213 is where he is as if they hadn't.

- `chambers.ts`: a state inside each of the 25 chambers, entered as the game does: from the
  start of a game, travel to the floor (as the pause map does), then a door (the game's
  $10D2, walking up into it) or, for the chambers the stairs lead to (3, 5, 7, 12, 15, 17),
  down the stairs from the floor above ($1496). Flags of things done elsewhere can be set
  first (the items a chamber needs), as its setup reads them.
- `find.ts`: plays a chamber Go-Explore style (air and ankhs topped up) watching all of
  memory, and lists the bytes that take only a few values: where each first changed, what he
  was doing, and the inputs that got there. It points at what to read in the chamber's code.
- `activators.ts`: what can be done in each chamber, from its code: each step's goal (bytes
  and values), when its hint shows (`until` a byte is done, `when` what it needs holds: the
  items, the steps before it) and roughly where. Not hints: monsters, doors and stairs, what
  happens by itself (offering the idol in 15).
- `solve.ts`: does each chamber's steps by playing (Go-Explore steered towards the step, told
  apart by where a monster in the way is, using the whip and torch only once he has them, and
  on through counters), keeping the inputs from the chamber's state and where Pendragon was
  when each was done: `solved/chamber-NN.json`.
- `gen.ts`: writes `src/hints.ts` from those (each step's spot: the middle of Pendragon's
  sprite, on the unscrolled screen; or a moving sprite, for a falling stone); `src/hint-spots.ts`
  is the game's side: the chamber's hints not done, whose needs hold, moved with the scroll.
- `check.ts`: replays each step from its chamber's state and checks with the game's own hint
  function that just before it's done its hint shows where Pendragon is, that the chamber's
  code then does it, and that the hint has gone a second later; renders each chamber with its
  hints ringed (and each step's moment) to look at.

The scripts' headers say how to run each: `solve.ts <chamber> <out.json>`, `gen.ts > src/hints.ts`, `check.ts <outdir>`.

What the chambers hold (33 hints in 20 chambers, all checked):

| Chamber | Hints (the step's done flag) | Needs |
|---|---|---|
| 1 | the way out, on the left ($3230 = 2) | the way open ($3230 = 1) |
| 2 | the magic whip ($322E) | |
| 4 | the bowl of fruit ($322A) | the knot of Isis |
| 5 | jump at the back on the left, 41 times: the stone moves ($37FD = $29) | |
| 6, 22 | scroll 3 ($3237), scroll 5 ($3239) | 22: the torch |
| 7 | the pools in order: left, middle, right, left, middle ($62C6, $37FE) | (him seen) |
| 8 | the right pot, the left pot (whipped: $6291, $6292), the knot of Isis ($322B) | the whip |
| 9 | stand where the two creatures meet: the book of the dead ($322C) | the fruit |
| 10 | the small idol ($322D) | |
| 11 | catch a falling stone (on it), carry it to the right edge; seven: scroll 1 ($3235) | |
| 12 | touch the casket: the cobra goes ($37FF) | the book |
| 13, 24 | scroll 7 ($323B), scroll 6 ($323A) | 24: the torch |
| 14 | whip the ball off the walk: the lift goes down ($640F); the ankh ($37F9) | the whip |
| 16 | whip the five scarab bells in order ($6329): the torch ($322F) | the whip |
| 17 | whip the statue out of the way ($37FC = $20) | the whip |
| 19, 20 | scroll 2 ($3236), scroll 4 ($3238), at the back on the left | 19: the torch |
| 25 | push the ball along the walk ($6553), whip it into the river: the way out opens ($3230) | the whip |

No hints in 3, 18, 21, 23 (only monsters, doors and stairs) or 15 (the idol is offered by
itself on going in with it). Chamber 9 is on floor 4 at column 8, past the corridors' end:
`chambers.ts` goes in by its door all the same.

## 5. Combat and controls (src/combat.ts)

The effects over fights, their sounds and the combat assists (games/shared/native/combat.ts)
and the 8-way controls (games/shared/native/controls.ts) work from moments in the game's own
code. Those instructions are listed under `"hooks"` in the translations' configs (engine.json,
room-XXXX.json): the translator makes each report reaching it (`cpu.hk`), so nothing generated
is edited by hand, and a regenerated file differs only by those calls.

What the code does in a fight:

- **Collisions.** The game keeps the sprite collisions it read each frame at $3214 (Pendragon is
  sprite 2, the whip sprite 3). Checks compare the whole byte, so a collision of three sprites
  can count where one of two doesn't.
- **The whip.** $291F starts it ($20CF is 1 while its frames run; the direction is the way he
  faces, $2365: 1 right, 2 left, 3 up, 4 down). Only the corridors' monsters can be destroyed,
  by three routines of the corridors' block called from the engine: $660B (monster 0, its state
  $6C8B, when the collisions read are exactly $0D), $667A (monster 1 or 6, $6C98: $0E or $4C;
  the one monster is drawn as sprite 1 in front of him or sprite 6 behind) and $6697
  (monster 7, $6C9F: $8C). **These three had never been translated**: nothing in the block's
  own code calls them, so the translator didn't find them, and they ran on the 6502 safety net
  every frame in the corridors. They're entries of room-6000.json now (each checked against
  the 6502 from thousands of states: memory, registers and flags the same). In the chambers
  the whip moves things for the puzzles (chambers 8, 14, 16, 17, 25); no chamber's creature
  can be destroyed.
- **Hurts.** A monster touching him sets a hurt flag (the corridors' $6C8C, set by $6BDE at
  $6C4B, $6C5D or $6C6F; each chamber block that has monsters has its own, found by the block's
  routine that calls the hurt sound $35AC); for 16 frames he flashes and the sound rises, then
  $323E takes a step off an ankh ($6CC0). The hooks are the stores of 1 into those flags, so
  "safe after a hit" stops a hurt where it would start (the store is made a 0).
- **His steps into the picture.** Up and down are $1EF8 and $1FC8, run every other frame by
  his handling ($1864) once he faces that way; $2550, after his handling, works out from the
  character under his feet (at offsets $17FF/$1800 that depend on the way he faces) whether up
  ($236D) and down ($236B) are open, and takes doors and stairs. A diagonal counts as one of
  the four ways (up+right up, up+left left, down+right right, down+left down). The 8-way assist
  looks up the character as $2550 does (`tiles` in src/combat.ts: floor $37/$01/$27/$14 and the
  step $3D; acted on facing up or down: the corners $31/$0B/$1E, $2DA1, and the ways into chambers
  and to other floors $AB/$64/$AC/$3E/$BE), runs $2550 faced up or down and the step, at the main
  loop's wait, only onto floor, and at a corner or a way through is straight that way until he's
  round or through (then a diagonal again, past any other till the stick changes).

How the controls feel, measured from the stick (the three games alike; compared with Monty,
whose moves answer the next frame): walking sideways starts on the first frame, a pixel a frame,
and turning round is immediate; into or out of the picture he steps every other frame, the first
step two frames after the push (Karnath three), a pixel up and one sideways (the floor is drawn
in perspective); a strike (the whip, the sword, a spell's cast) stops him for 9 to 12 frames, and
holding fire strikes again as one ends. What the assist changes is the diagonals and
turning to strike; the pace, the strike's stop and its frames are the game's.

Found along the way: **travel left the whip's sprite off.** The corridors' setup ($6003, run
when a chamber's block is swapped out) turns on sprites 2 and 3; travel then turned the screen
off and on again ($C1A1, $C1C9), which leaves only sprite 2: the whip worked but didn't show and
couldn't touch anything until a chamber's setup turned it on again. `entombedMap.go` now puts
back the sprites as the setup left them.

Checked by `test/combat.ts` (random fights on every floor and in 16 chambers: every monster
destroyed is reported once, where it was drawn, and gone the next frame; every hurt and swing
once; nothing else), `test/frontend.ts` (play.ts as the browser runs it: the options page,
effects and sounds, hit-stop, invulnerability gaps, knockback, EFFECTS off) and
`test/controls.ts` (diagonals in the corridors of every floor and in chambers: the original's
four ways, both ways at once with the assist, every step one straight up or down takes too,
jumps, turning to strike).

## 6. The dark chambers

**The dark chambers** (19, 22, 24). Their block's setup ($6003) blacks the room out: $D022/$D023 and
the colour RAM's pair-3 colour all 0 (colour RAM 8), the sprites' colours and multicolours too, and
$3240 = 0 (the room is dark). Using the torch there ($322F; the action at $18CB, refused where $3240
isn't 0) doesn't light it: it's a flash (`$2C5D`: sprite 7, a white ball, set behind the characters,
for about 30 frames), and the room stays black; $3240 only goes back to 1 on leaving (`$27DE`).

**The flash is behind the room.** Being set behind the characters ($D01B), the flash shows only where
the room's characters have no pixel of their own (their background pairs): in the black room it
shows the room's shapes cut out of it, and Pendragon (sprite 2, before sprite 7 to the VIC) over it.
The tests' C64 pictures (tools/probe's `renderPixels`) take the machine's order (c64kit's `drawSprites`),
checked against the VIC's rule worked out pixel by pixel.

## The pause map

The map (src/map.ts) shows all seven floors at once: a map of one floor at a time was confusing, and the map's
point is travel (the tomb is a lot of hallway walking). Each floor is drawn only over the cells its corridors use (floor 6
uses three rows of its five), in reading order, as many to a row as fit, all at one scale; the
biggest that fits is 8 pixels a cell (rows 1-2, 3-5, 6-7; the height binds: 17 cells and two
gaps). A window of four floors would only reach 9-11, so all seven it is. The picked box fits
round its junction (`MapPlace.r`). test/map.ts checks it from a save on floor 6 (phone-size stills
with an out-dir).

## The stairs (floor changes), and "impassable" gates

The stairs on the rooms with the gates to other floors can look impassable. In general they aren't; three of the six are
shut until a puzzle is done, in the original too.

How a floor changes ($2550's floor check, run facing up): walking up into **$3E** in a corridor cell
($2719) takes the floor down one (`dec $37F7`, then $1496 picks the cell the stairs lead to, a
chamber, and the foot of the stairs); walking up into **$AC** in that chamber ($26FA) takes the
floor up one ($1397) and puts him back in the corridor cell. Every floor has one such corridor cell
(floor 1's goes to floor 0, chamber 25, the way out; 2:4,1, 3:4,0, 4:2,0, 5:3,0, 6:7,2, 7:3,0), and
the chambers the stairs lead to are 3, 5, 7, 12, 15 and 17 (one picture, the stairs room: the gate
`AC AC AC` in the back wall, the way back out `BE BE BE BE` at the front, pools `48` between).

- **3, 7, 12: the gate is free** (a monster hurts him at the foot of the stairs in 3).
- **5, 15, 17: something stands in front of the gate and pushes him back** (the chamber's own
  code, run every frame: when the sprite collisions $3214 are him and that sprite, and his y is above
  a line, `inc $3220`), so walking up into the gate just slides him away from it. 5: a stone, sprite 6
  at $C3 + $37FD, moves right for each of 41 jumps on the stone at the back on the left ($37FD = $29;
  this step is hinted); 15: an altar, sprite 7; carrying the small idol from chamber 10 ($322D = 1)
  into 15 offers it by itself and the altar clears (15 has no hint); 17: a statue, sprite 4, at
  $C0 + $37FC, whipped away ($37FC = $20; hinted).

The original's own 6502 does exactly this (`games/shared/native/test/lockstep.ts` from each
chamber's state holding up: 298 passes identical, 3 climbs to the next floor, 5, 15 and 17 stay put).
test/stairs.ts walks every stairs cell and gate in the translated game, the original's 6502 and the
front end (keyboard, ORIGINAL and ENHANCED, and the 8-way diagonals just before the stairs): all
seven corridor stairs and gates 3, 7 and 12 go through in every way; 5, 15 and 17 stay shut by any
walk until their puzzle is done and go through after it.

Open (not built): nothing in the code is broken, but a gate that slides him away with no sign why reads as a bug. Either show a hint sparkle on the thing in the way in 5, 15 and 17
(15 has none today) with what it needs, or let the gate open in ENHANCED once he has walked into it
(keeping ORIGINAL as it was).

## The ending's routes (re/ending/route.ts)

The ending (src/ending.ts) has Pendragon do each chamber's puzzle on a new game of its own, so what he presses has to be what the
puzzle takes. `re/ending/route.ts` finds it: a search over what the show's Director can do (hold a way, leap with a way held, whip
facing a way; after each he is let to land and come to rest), each tried on the game itself from the state the last left it in, the
cheapest in frames first (nearer the target first where one is given), until the puzzle's own byte says it is done: the five bells
($6329 to 5, in order), the statue ($37FC), the pots ($6291), the book ($322C), the cobra ($37FF), the way out (up to the door). The
steps it prints (rests he need not take out, runs of one way joined, each checked by replaying the whole route as the show plays it)
are pasted into the scene. Chambers 2, 5, 7 (the third pool), 14, 6 and 11's caught stone were not found by it (the tiers there
need leaps from places it does not reach in a few thousand states) and are not scenes. Chamber 11 is a scene all the same: he leaps
up its walkway while the bird drops stones.

The win is `$3230` = 2 (walking out of chamber 1 with the way open, $3230 = 1 and $1609 = $79; the game then shows its "congratulations"
screen for about 400 frames and goes to the title). The game has no music (the title is silent: its SID is touched once, volume 0),
so the ending's sound is each place's own (`tune: 'effects'`).
