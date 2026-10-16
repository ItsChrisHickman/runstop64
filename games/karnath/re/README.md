# How The Staff of Karnath was ported

The same way as Entombed (see `../../entombed/re/README.md`), with the shared
native-port kit in `games/shared/native`:

- `engine.json`: the engine (everything but the two room-code regions), from the
  title snapshot. The main loop ($18CF) waits for raster line $D1.
- `castle-XXXX.json`: room code. Each room's code runs from one of three slots
  ($6000, $C000 or $C800, by the room's type, $B3E1), and the game swaps whole sets
  of them: the castle's two halves ($D800 <-> $6000-$68FF, $E100 <-> $C000-$CFFF) and
  the blocks at $F100 and $F900. Each version is translated from where it's stored.
  Any other combination is run by the runtime's 6502 safety net.
- Checks: `games/shared/native/test` (`verify.ts karnath`, `lockstep.ts karnath`,
  `explore.ts karnath`, `travel.ts karnath`).

## Travel back (the pause map)

`src/travel.ts`; checked by `games/shared/native/test/travel.ts karnath`.

**How the castle is kept.** Each level is a strip of three rooms in a char map (pages of
$400, a level every $C00) that scrolls sideways under four pointers ($7FE0/1, $7FE4/5,
$7FE6/7 the visible column, $7FEA/B), with his place on it ($25C1-$25C3, $3238, $7FE8/9,
the fine scroll $7FEE). The map is also where things change: pieces of the pentacle lie in
it (chars $D4/$D5; taken, $4F: $167C), locked doors are opened in it, and the doors between
rooms are opened in it while he's in them ($2AC9 saves what's under one at $B7CA, $2B2C
puts it back; $2A2C/$2A7E the tower doors). The room number $3235 is counted (+1/-1 through
a door, +3/-3 or a special case on the stairs: $2B7B/$2CE4), so in the original it can
drift from where he really is; travel keeps whatever it was.

The castle has four modes ($3219), each swapping in code, graphics and map by exchanges:
0 the lower half; 1 the upper half ($2E33 in, $2EF6 out: $1806 the map, $37B0 the code,
$D800 <-> $6000 and $E100 <-> $C000, and $69D0 sprites); $FF the dungeons ($1199 from room
2 and back: $F100 <-> $6000, the charset $B800 <-> $3800, $1723 the map, $6900); $FE Karn's
abode ($12E1 from the dungeons and back: $F900 <-> $6000, $6700/$6800, $C780, the map). The
game's restart ($6C8D) undoes them in that order, so they nest as 1 - 0 - $FF - $FE.

**Why the game's own way, not a snapshot.** Progress lives in the map and in the swapped
blocks, so an old snapshot of a room would bring back what was taken, and finding every byte
to carry forward around one would be guesswork; but what says *where he is* is a short list
of bytes, and the game has the code to draw a room from them. So travel is a change of
level to a place noted earlier:

1. On first coming into a room (its first frame with no spell in flight and no door open)
   the map notes `LOCATION`: mode, room, level type, the pointers, his place, his sprite and
   its frames ($25CD: the frames of the way he faces).
2. Going: a spell in flight ends ($2ECB, as on a change of level), an open door shuts
   ($2B2C/$2A7E, as on walking on); the mode changes by the game's own transitions, one step
   at a time (each draws a room on the way, drawn again below); the place is written back;
   the room is drawn from the map as it is now ($2C21, the draw every change of level uses),
   its name shown ($2F8E), his sprite set ($2772), and the level's creatures started as on
   coming into a level ($6A9F, or $6003 in the dungeons and abode); screen on ($18B3).

Energy, the clock, spells, pieces and everything in the map are left as they are; the swaps
carry the map and the blocks' contents with them.

**Checked** (`games/shared/native/test/travel.ts karnath`): five routes from the title, found by automatic play
(`re/routes.json`: Go-Explore on the native port, recording the input) walk into 24 of the
25 rooms (all but the crypt), in all four modes, taking pieces of the pentacle on the way.
From states along them (arrivals, the routes' ends, and a few seconds' random walking on from
each) the test travels to every room noted, with round trips: 1,286 travels. After a frame
his place is the walked arrival's, byte for byte; the playfield is drawn from the map, and
where it differs from the walked arrival's the maps differ there (a piece taken, a door
opened) or the walked screen wasn't the map (the original leaves a door it just shut drawn
open until it scrolls off); with the modes undone the game's way the map is the source's byte
for byte, and every code byte of every block is where it belongs; pieces taken before stay
taken; walking on with the same input for 400 frames ends where walking on from the walked
arrival does (979 of 979); and random play after runs on with no 6502 fallbacks. Coming in,
the creatures start as on a change of level (they can start on top of him, as there): 29% of
438 travels lost energy in the first two seconds, against 24% of walked arrivals.

The crypt ($17) wasn't reached by the automatic play; travel there works the same way.

## The map (the pause screen)

`src/map.ts`. The castle as the game keeps it: each level is a strip of three $400 blocks of the
char map (a level every $C00: $2B7B/$2CE4 move the pointers $7FE0-$7FEB by $0C pages and $B3E1
by one), scrolled under $7FE6/$7FE7. The lower floor (mode 0) has its three levels from $7000;
the upper floor (mode 1) is the same three levels $2400 on ($2E33 adds $24 to the pointers and
$0B to the room, $2EF6 takes them off); the dungeons (mode $FF, $1199) and Karn's abode (mode
$FE, $12E1) are swapped in over the first level's blocks ($1723; $137A, in $12E1). So the map has eight
strips, one under another (upper floor U3-U1, lower floor L3-L1, dungeons DN, abode AB), each 120
columns, with a tick where one block ends and the next begins. Where he is along a strip: the
view's left edge (($7FE7 - 4 - the level's first page) / 4 * 40 + $7FE6) plus his sprite's column.

Lit: the columns he's walked (in eighths), noted only where he's settled. Rooms: marked where he
came into each (where travel takes him), and picked, the room's name shows under the map (from
the game's own list at $0E2E, as $2F8E shows it). The room number is a count the game keeps
(+1/-1 through a door, the stairs' rules in $2B7B/$2CE4), and a door held open can move it on
while he stands still, so a room is marked where the game's count said it was when he came in.
The ways between levels he's taken are drawn where he took them: green the stairs (a level up or
down, the same floor), purple between floors, the dungeons and the abode. They're noted from
play (two settled moments on different strips, close in time and place), not from the char map:
the chars the stairs and doors are made of ($5E/$67/$63/$23 up, $A5-$A7 down, $6D, $CF, $B8,
$53/$66, read under his feet by $27BA) are also used in the pictures' walls.

## Combat and controls (src/combat.ts)

As Entombed's (`../../entombed/re/README.md`, "Combat and controls"): the moments are hooks in
the translations' configs. Pendragon is sprite 2; a spell in flight sprite 3 ($3216 is 1 while
one flies); casting ($1988) costs a point of energy (stored as damage to take, $322E, like a
hurt: the effects tell them apart by the hook). The collisions read are kept at $321A. Each
block of room code checks its own creatures: a spell does something only if it's the one that
works on that creature ($322C), and then the creature goes (most are put somewhere else at
once: a new one) or is only turned or checked; so the hooks there are `strike`s, judged
destroyed or hit from the next frame's picture. Hurts store the damage to take ($322E: 1, 5,
10 or 25) and start the block's own flash of him; the hooks are both stores (`hurt` first,
`also` the other), so "safe after a hit" cancels both. $662C is in two of the low slot's
versions (a spell's work in the upper castle, a hurt in Karn's abode): the hook tells them
apart by the block's first jump.

His steps into the picture are $2FD0 and $2FF0; $27BA (after his handling) works out whether up
($25CA) and down ($25C8) are open for the way he faces ($25C1), from the character at
$0400 + 40 * ((depth $3238 - $7FF3) / 8) + ($7FF4 - $7FF2) / 8: floor ($4F, $16-$18) clears them;
facing up it acts on doors ($67/$63/$23/$5E: $2A2C opens one while he faces it, and closes it
when he turns away; he then walks out through it) and on the ways to other levels ($6D, $CF,
$53/$66, $B8: frames of drawing); facing down on $A5-$A7. The 8-way assist looks the character
up the same way (`tiles` in src/combat.ts) and runs $27BA and the step only onto floor; at a door
or a way to another level the diagonal is straight that way until the room or level changes.

Checked by `games/shared/native/test/combat.ts karnath` and `controls.ts karnath` (from states
along re/routes.json).

## The HD view (src/hd.ts, c64kit's hd/)

The C64/HD switch's HD view draws the same game as a lit 3D diorama made from its own picture, as
Entombed's does (`../../entombed/re/README.md`, "The HD view"). Its rooms are built from the game's own
rooms as pieces (below), not guessed from the picture's characters: depth inferred from the characters (c64kit's
`infer`: which characters are floor, steps in a wall joined by faces, `slopes` for the dividers) bent every wall at every
post and smeared the doors' boxes across the floor. `test/hd.ts` plays 400 frames in both views and compares memory, looks at
seven rooms along the first two recorded routes (the lower guard room, the west tower's lower room, the east
tower's with its fireplace; the upper floor's treasury and a hall with a long dais; the dungeons; Karn's
abode), and walks the lower floor for 3,500 frames (the strip scrolling: only what changed made again).

- **The play area** is character rows 0-19 (y 0-159): the status panel is under it.
- **Floor:** the planks the floor check ($27BA, its list at $2835) stands him on: $4F, $16, $17,
  $18. The planks are brown (pair 1), orange (pair 2) and yellow (pair 3) with black (pair 0) lines.
- **Lights:** the candelabras ($58/$59, the candles, over their stands $6A/$6B) and the fires in the
  fireplaces ($B4/$B5): their yellow (pair 3) glows, with a light at each candelabra and along each fire.
  A room with many (the east tower's fire and candles) shares their light out (c64kit's
  `LOOK.flames`): lit, not blown out to white.
- Karnath's strip of rooms scrolls sideways a pixel a frame: the room built before is moved, as in
  Entombed's wide chambers. Known issue: c64kit's lockstep check, `checkHdLockstep`, isn't in `test/hd.ts` because along
  the lower floor it fails: the camera moves from the first frame's by about a thousandth once the room built first is
  replaced by the next, and the room drawn scrolled differs by up to 135 px from the picture's own scroll. It is the same
  with the rooms inferred as with them as pieces, and has not been looked into.

## The rooms as pieces (re/pictures.ts, src/pictures.ts, test/pictures.ts)

Karnath's rooms are not one picture each but **strips of rooms**: each level of the char map (see "Travel
back") is three blocks of 40 columns × 20 rows, $400 apart, and the screen shows 40 columns of the strip
scrolling along it (38 while it scrolls: the last two columns the screen doesn't show), a room 31 columns wide
with a diagonal divider (chars $55/$56/$54/$66/$53, a side wall) between it and the next. So a picture here
is a whole strip, 120 × 20 characters, eight of them (`src/strips.ts`, also the pause map's): the upper
floor's three ($9400, $A000, $AC00), the lower floor's three ($7000, $7C00, $8800), the dungeons' and Karn's
abode's (both swapped in over the first of the lower floor's at $7000). `re/pictures.ts` gets each from the
title's snapshot by the game's own changes of mode ($2E33, $1199, $12E1: `toMode` in src/travel.ts), so
nothing taken or opened is in them; the dungeons and the abode keep their characters in their own set.

What the pictures show (`decodePictures` with `karnathRules`, games/shared/pendragon/decode.ts):

- **Lower floor and dungeons:** a room is 16 rows, a top edge ($45/$33 bricks), the back wall, the floor and
  its front edge. The lower floor's rows 0-3 are the floor of the room beyond the back wall, seen over its top
  (`beyond`: floor joined to the picture's top); the dungeons' rows 0-3 are wall.
- **Upper floor:** a room is the first 16 rows (a top edge in row 0, the floor's front edge in row 15,
  `front`); rows 16-19 show the first rows of another room's wall. They're drawn, so they're one face under the
  floor's front edge (the floor stands 40 pixels up, as the rows under it make it).
- **The tops of boxes:** a door in a block standing against the wall, a bed, the long dais, the abode's maze
  of low walls are drawn with their tops in the floor's characters ($4F/$16/$17/$18): floor joined but not
  reaching the floor's front is a top (`raised`), a floor piece at the height of the face under it (rows of
  upright characters between it and the floor below, 8 pixels a row).
- 8 strips: 170 pieces in all (walls, side walls, tops, things). The routes never reach U3 and reach the abode
  (AB) for one frame, so those two are checked only against the game's own memory in their mode.

`test/pictures.ts` checks against the running game, along all five recorded routes (every 6th frame): every
frame in play (4,210) is a window of one of the strips, the cells the game draws otherwise (a spell, a door
opened, a piece taken) 4.5 a frame on average and 60 at most (of 800), and the strip is the game's mode's
(except in the 50 frames after the mode changes, while the room it came from is drawn); and the pieces stand
in the room: every wall between the floor's front and back, every side wall on a floor, every part of a thing
on its own foot (the invariants Blackwyche's test checks).

c64kit's `placePictures` (hd/placed.ts) takes pictures wider than the band: it tries each column the band can
start at (a window of the strip), where Blackwyche's pairs `beside` each other.
