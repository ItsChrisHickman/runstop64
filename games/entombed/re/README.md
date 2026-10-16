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

Regenerate with `node tools/re/to-ts.mjs games/entombed/re/<file>.json`.

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
- `games/entombed/test`: `combat.ts`, `controls.ts`, `frontend.ts`, `grace.ts`, `hd.ts`, `map.ts`, `pictures.ts`, `stairs.ts`
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

## 6. The HD view (src/hd.ts, c64kit's hd/)

The C64/HD switch's HD view draws the same game as a lit 3D diorama made from its own picture:
nothing drawn by hand, the game's memory untouched (games/entombed/test/hd.ts plays the same
400 frames in both views and compares memory).

**Rooms as pieces (src/pictures.ts, re/pictures.ts).** Depth guessed from which characters are floor bent walls at
every step and smeared tiers into one flat floor, so the rooms are decoded instead. They are data, and it is Blackwyche's
engine (the chambers' blocks do not draw their rooms in code of their own): each room is a picture of 40 × 17
characters (rows 4-20 of the screen; the 16 rows of the room and the floor's front edge) at a page of its
own, laid out 768 bytes apart from $7000 in the game's memory, copied to the screen. Found by searching
the machine's memory for the screen's rows in each room (a corridor, then each of the 25 chambers), and
along the way:

- **the corridors' nine pictures** ($70, $73, $76, $79, $7C, $7F, $82, $85, $88) are what the maze
  tables hold: the byte a cell is the page of the picture drawn there ($7C and $7F the ends: a wall where
  the corridor stops). Walking along a corridor the picture of the cell he's at scrolls out and the next
  cell's in (two pictures side by side, either way round: `beside`, 56 pairs, read from the seven
  floors' tables); a corridor's end beyond the last cell shows a few columns of nothing (`overhang`).
  (Floor 2's cell (0, 1) holds $80, a byte of the tables' own layout, and floor 2's (1, 3) has no
  east-west corridor: pressing a way a cell hasn't draws the tables' next bytes as a picture. The map
  lists the one as a place; the checks skip it and don't press such ways.)
- **the chambers' thirteen**, one picture each, shared by twins: $8B (1), $8E (2, 10, 23), $91 (the
  stairs room: 3, 5, 7, 12, 15, 17), $9A (8), $9D (9), $A0 (4, 21), $A3 (11), $A6 (13, 24), $A9 (14),
  $AC (16), $AF (6, 18, 22), $B2 (19, 20), $B5 (25). The wider chambers scroll the screen along their
  picture a few columns either way, a column every 8 pixels he walks ($3212; seen: chamber 1 nine to the
  right, the stairs rooms three, 13 and 24 five to the left; at most nine is allowed, `overhang`), the
  engine drawing what's beyond the room's end itself, the picture
  otherwise as it is.
- the character set is the one at $3800 in every room, the picture the game draws it from.

games/shared/pendragon/decode.ts decodes each picture once (the same decoder as Blackwyche's and
Karnath's, which come out byte for byte as before): floor from the characters ($01 $0B $14 $1E $27 $31
$37 $3E $BE), the back wall one plane across the room, side walls along their slope, things at their
front, and each pixel on its piece's plane. What Entombed's pictures needed that theirs didn't
(`DecodeRules`, all off by default):

- `stacked`: the rooms have tiers and stairs, drawn as floor cells (a stair's steps, a raised walk
  joined to the floor below by a ramp of floor characters): a floor cell's height is the height of the
  face under *its own column* (rows of face, 8 pixels each, down to the next floor), not of the
  stretch it's joined to; before, a stairs room's tiers joined through their steps into one flat
  floor at the ground's height ("floating planks" in the HD view). Cells of the same height make a
  floor piece; a column with no ground floor has its back edge at its deepest top. A column with
  ground *and* a top above the ground's back edge (the stairs room's steps in the corridors, the
  chambers' tiers against the back wall) has the back wall stand on the top's back edge (the row it
  would be on at the ground's height), not on the ground's, which is in front of the top, under its
  face: with the wall at the ground's depth it hung over the stairs, a stair's depth in front of
  their gate (the arch 18 px from where the game takes him in: `checkHdCharacters`).
- the face under a floor cell (upright cells with floor above them in their column: what holds a
  tier up) is a wall at the depth of the floor under it (or, drawn down to the front, of the top above
  it), and not the back wall's own drawing: a frieze is drawn with the same characters in both, and
  claiming them for the back wall as it does for what stands in front of it interleaved two depths
  across the band.
- `holes` [$20] with `skyAbove`: $20 is both the void beyond a face and the blank over a room's top:
  a hole only under something drawn above it.

The pictures are checked against the running game (test/pictures.ts): along every junction of the seven
floors (82 walked the four ways, 360 frames each, travelling as the pause map does) and in all 25
chambers (walked right to the edge and back, about, 1400 frames each, stopping on a door), 12,802 frames
looked at, every one a window of the decoded pictures (or two side by side) with at most 8 of 680 cells
drawn otherwise (a torch's flame, a thing moved: 1.9 a frame), every picture seen; and the pieces
stand in the room (every wall between the floor's front and its deepest floor, every side wall on a
floor). What can't be drawn this way: ramps and the big slanted faces at some chambers' right edges
(the side of a stair mass reaching the picture's bottom: no foot to read a slope from) stand as flat
faces at their depth, and in a few of the stairs rooms a side wall is hatching stretched along it:
looked at in the stills (test/hd.ts: the corridor, the corridor scrolling, chambers 1, 3, 4, 8, 10, 13,
14 and 25, the dark 22 and 24) rather than modelled.

The pixel-level look is unchanged (below); `obliqueRoom` falls back to guessing depth from the
characters (the old builder, still in c64kit for Dragonskulle) wherever the band is none of the
pictures; none of Entombed's rooms is one.

**Lights.** The torches on the walls are 3×3 characters ($C3 and $B8 the sides, $4E, $2D, $1B the
middle column: the bracket in black, the flame round it in pair 2). Their flame pixels glow, a light
is put out from the wall at each $4E (the flame's top), flickering, with embers rising. Pendragon
(sprite 2) carries a soft light; the whip (sprite 3) is drawn with him. Sprites stand on the floor
found under their feet (a statue of several sprites as one), with a soft shadow.

**The look** is c64kit's `LOOK`, the same in every game (`docs/hd-view.md`). Here: indoors it is night, with warm
pools round the torches and him; all of it spreads only over what's drawn in a colour, so black stays black (the dark
chambers below).

**Steps in a wall** (a room not decoded, or the picture behind it). Where upright pixels side by side (or one above the other) stand at different
depths, a face joins them (`steps`), along the way the picture looks into the room: at rest the camera
sees none of it, moved it's the side of what stands nearer, so a step reads as a corner, never a seam
showing what's behind.

**Above the room.** The band is the picture's rows 4-20 (the room's own; the blank row 3 under the header is
no part of it). Where a chamber's picture shows nothing over its top (13's: the dark above its walls) that's
nothing, not a black wall, and what the camera opens there shows the C64's own picture, dimmed. The walls the picture cuts off (level along the top of
what's drawn) go on up past it, darkening, so where the tilt shows a little above a wall standing
further back (chamber 10's alcove behind the stairs, chamber 1's back wall) there's wall, not a black
dip. A wall's own top drawn lower down (a corridor's slanting side wall) is where it ends; a notch of
a few columns between walls carried on is carried on too (the lower camera sees over it: chamber 1).

**The dark chambers** (19, 22, 24). Their block's setup ($6003) blacks the room out: $D022/$D023 and
the colour RAM's pair-3 colour all 0 (colour RAM 8), the sprites' colours and multicolours too, and
$3240 = 0 (the room is dark). Using the torch there ($322F; the action at $18CB, refused where $3240
isn't 0) doesn't light it: it's a flash (`$2C5D`: sprite 7, a white ball, set behind the characters,
for about 30 frames), and the room stays black; $3240 only goes back to 1 on leaving (`$27DE`). The HD
view takes every colour as the game draws it now (live multicolours and colour RAM), so a dark
chamber is black in it too, with the torch or without; its wall torches, drawn black, neither glow
nor give light, and the dust shows only against something drawn. `test/hd.ts` checks chambers 22 and 24 dark and during the flash, and in every still that the HD picture is
black wherever the C64's is (games/shared/test/hd.ts, `checkHidden`).

**The flash is behind the room.** Being set behind the characters ($D01B), the flash shows only where
the room's characters have no pixel of their own (their background pairs): in the black room it
shows the room's shapes cut out of it, and Pendragon (sprite 2, before sprite 7 to the VIC) over it.
The tests' C64 pictures (tools/probe's `renderPixels`) first drew every sprite over everything, the
flash over him; the HD view stood it in the air in front of the room, a whole white ball. Both now
take the machine's order (c64kit's `drawSprites`; the HD view hides the flash's pixels the characters
hide wherever the camera puts it, `hiddenByCharacters`): checked on every still against the VIC's
rule worked out pixel by pixel (`checkC64Priority`: 572 of the flash's pixels behind the characters
in chamber 22) and that the HD picture shows none of them and most of the rest (`checkBehind`).

**From frame to frame** only what changed is made again (c64kit's `obliqueRooms`): the torches'
flames animate by changing their characters every few frames (the same places, new colours: about 2
ms), and a wide chamber's scroll (a pixel a frame) moves the room built before (0.2 ms: the picture
C64View decoded, compared) and builds it again off the main thread, in a worker (about 17 ms here),
the room coming back moved on by the scroll since. The room is drawn scrolled as far as the sprites
are drawn, between the game's frames too, and the camera never moves after him: room and sprites
locked together (games/blackwyche/test/hd.ts, `checkHdLockstep`). test/hd.ts walks chamber 3 to its
edges and back: 4 builds, 18 moves and 65 repaints in 600 frames.

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
walk until their puzzle is done and go through after it, and (the HD view on, `hdView.on`: the view only) at the
same frame to the same floor as with it off.

**HD.** The game's logic is the same in both views and the test above says so with the HD view on; what differed once
was the picture. In the corridors' stairs picture
($88) the back wall was decoded at the depth of the ground in front of the steps (z 32), so in HD the arch hung in
front of the steps' far end, 18 px above the gate it leads to, and he stood a stair's depth in front of it when the
game took him through. The wall now stands behind the steps (z 64, the left and right blocks' tops 48): the arch is a
doorway he walks up into. test/hd.ts: every stairway cell and gate (arriving and standing where walking up takes him
through) shows in HD where the C64 draws it, the arch against it. The pieces of the other pictures with tiers
against the wall (chambers 2, 4, 10, 13...) moved the same way (the wall behind the tiers). The chambers' left-hand
"ramp" (chamber 3) is a block with a step beside it, as the picture encodes it, not a slope.

Open (not built): nothing in the code is broken, but a gate that slides him away with no sign why reads as a bug. Either show a hint sparkle on the thing in the way in 5, 15 and 17
(15 has none today) with what it needs, or let the gate open in ENHANCED once he has walked into it
(keeping ORIGINAL as it was).
