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

## How the game is won

Found by reading the code, then played in the port **and** in the original (the C64 model running the game's own code)
from the same state: `games/karnath/test/pentacle.ts` (17 checks, both agree).

**The aim.** Sixteen pieces of the pentacle are carried, one at a time, to Karn's abode, and the staff is destroyed.
The game's own words are on its status line: `PIECE OF PENTACLE FOUND`, then `CARRYING PIECE OF PENTACLE` the whole time one
is carried ($1044 + $1C * n: 1 SEARCHING, 2 FOUND, 3 CARRYING, 4 `PIECE OF PENTACLE DEPOSITED`, 5 `YOU HAVE FOUND A CROSS`, 6 GAME NOW
ON PAUSE), and at the end `THE STAFF OF KARNATH HAS BEEN DESTROYED... CONGRATULATIONS`. Nothing tells you where to take it.

- **Sixteen pieces** ($6E79 compares the count at $6FFF with $10). Ten lie in the map as two characters ($D5 then $D4) at $7089,
  $72DF, $79E2, $864C, $8DF3, $91FD, $9641, $9D70, $A196 and $AEB7 (put back by the restart, $6CB6); six are sprites in rooms, each
  with a flag of its own at $321D-$3222 so it comes once: the lower castle's $C000 block ($3220, $3221), the upper floor's $E100 block
  ($321F, $321E, $3222) and the dungeons ($321D; its piece is sprite 1, taken by touch, $6248). (Read, not played: which rooms they
  are, and what makes the ones in the $C000 and $E100 blocks come: IBRAHIM, spell 8, on the thing in the room is read as the key for
  $CFCD in the lower castle, $CD36.)
- **One at a time.** Walking into a map piece, or touching a sprite one, sets $322F to 1 ($167C, the four directions' floor checks
  call it: $2895, $28E4, $29D2, $2A0F) and nothing more can be picked up while it is 1 (every pickup tests it). It stays 1 until a piece is
  deposited (or the game is restarted: $0A59). A piece is never put down anywhere else. There is no way to drop it.
- **Where it goes: Karn's abode** (the abode strip, AB on the pause map). You enter from the dungeons (DN) through the door $B8 at the
  right end of the dungeons, so you come into the abode at its **right** end (strip column about 111), and the obelisk is at the
  **far left** (column 6 to 20): a tall yellow stone with runes, sprite 6, which only comes on to the screen as the view scrolls to it
  (it is at screen x 114, y 96 with the view at the far left). The abode is a maze of low walls, about 100 columns to cross.
- **How: cast BARACATA (spell 7) at it while carrying a piece.** $6E40 (called every frame in the abode, from its spell handler at
  $683C): spell (sprite 3) touching sprite 6 ($321A and $48 = $48), a piece carried ($322F is 1) and $322C is 7: then $322F is 0, the
  message is 4, the count at $6FFF goes up by one and energy is 100 again ($6E7D). A different spell does nothing; so does
  BARACATA with nothing carried (both in the test, the port and the original). Cast it facing the obelisk, level with it (the spell
  flies straight along the floor he stands on: the test goes up the screen to where it flies through the stone).
- **After the sixteenth** ($6E90): the staff appears in a shrine over a pentagram (sprites 5, 6 and 7, `$D015` = $EC), and for as long as it stays: **MENHIR (spell 5) at the staff wins** ($6F62: spell on sprite 6 or 7 with
  $322C = 5 sets $6FFF to $11; the main loop then runs the finish at $9FA0 and restarts at $12); **any other spell at it kills
  him** ($6FFD = 1, the same as running out of energy). So: choose MENHIR before casting at the staff.
- **The clock** ($1548): the status panel's clock starts at 06:00 PM and a game minute is 2,880 frames (about 58 seconds: $3239 times
  $323A); at 12:00 ($07C6 reaches the digit 2, $15B6) $6FFD is 1: he is lost. About 5.8 hours of play. ENHANCED (src/clock.ts):
  the hook at $15B6 puts an hour of 12 back to 11:59 (and $3236/$3237 to 0) before the check, so midnight never comes and a save
  already past it plays on (re/hints/check.ts: lost in ORIGINAL, held in ENHANCED, from 11:59 and from 12:00).
- **Energy**: running out of it ($6FFD = 1) ends the game too; the pieces carried or deposited are not saved from it (a lost game is
  a new one: continuing from the last screen, ours, keeps $6FFF, $322F and the map as they were).

### Why it could not be done in the port (fixed)

The abode's code is not all in the block that comes in with it. $12E1 also swaps pages that belong to the rest of the game: $6800 with
$6700 (all of a page), then $C780 with $6800 (128 bytes): so in the abode $6700 holds what the lower castle keeps at $6800, and **$6800
holds the abode's spell handler** (the code the lower castle's image keeps at $C780: spell 1 on its sprites 0 and 7, and its
last act is the call of $6E40). The translation of the abode (`castle-f900.json`) took $6700-$68FF from where the title snapshot has
them, the lower castle's, so it ran the wrong code for $6640, $6750, $6778, $67C7 and $6807: the obelisk did nothing, and neither did
anything else the handler does. Now `patch` (a new key of `tools/re/to-ts.mjs`) lays those pages out as the abode has them. The test
compares every routine of the version loaded with the bytes it runs from (122 versions in 61 states: the routes, and the abode):
only the abode differed, in those five routines. `$6E40` is a translated entry now too (it was running on the 6502 net).

## Getting into the abode (the right side of the map)

The abode (AB, the last row of the pause map) is the part towards the right of the map that cannot be finished, for two reasons:

1. **The way in is at its right end and the obelisk is at its left**, about 100 columns of low walls away; Go-Explore reached the left
   end only after thousands of tries (`games/karnath/test/fixtures/abode-obelisk.state` is where it did), and the pause map lights only
   the columns walked, so it showed one lit cell at the right end and nothing to aim for.
2. **In the port, the obelisk did nothing** (above).

To get there: take the dungeons' door $B8 at the right end of DN (the way the first route does), then walk left through the abode
(he goes up and down the screen by going up and down, which also moves him sideways a little); the obelisk is the tall yellow stone
with runes, the first thing you see as the left end comes into view.

## The spells (read from the code; the look and the change are tested: `test/spells.ts`)

**Every spell looks the same.** Casting ($1988) puts the one spell sprite, 3, flying (image $23, white); $322C (1 to 10, shown by $150E
from the names at $0FF4) is only what the creature code compares when the spell touches it. A spell does something to a creature only if
it is the one that works on it, so "the same thing every time" is the original's: what changes is what dies.

| # | Spell | What it works on (the sprite of the creature, in the block that runs the level) |
|---|---|---|
| 1 | FORTHRIN | most things: lower castle $6000 block (sprites 5, 7), level 2 $C000 (5, 1), level 3 $C800 (0, 6), upper floor $D800 (0), $E100 (1, and 0 on the top level), the dungeons (0, 5) |
| 2 | THROBIN | upper floor $D800: sprites 5 and 7 |
| 3 | KNOSSOS | upper floor $E100: sprites 0 and 5 |
| 4 | OMPHALOS | upper floor $D800: sprite 7 |
| 5 | MENHIR | the staff, at the end |
| 6 | AEOLUS | level 2 ($C000): sprite 4 |
| 7 | BARACATA | the obelisk in the abode, to deposit a piece |
| 8 | IBRAHIM | level 3 ($C800): sprite 7; upper floor $D800 sprite 6, $E100 top level sprite 7; the dungeons: sprite 6; and the thing that gives up a piece in level 2 (see above) |
| 9 | STOLV | upper floor $E100: sprites 6 and 7 |
| 10 | YEROBAS | upper floor $E100 top level: sprite 4 |

(Which block runs which level: `$B3E1` 1, 2, 3 calls $6000, $C000, $C800 in the lower castle; the upper floor swaps $D800 and $E100 in.
The dungeons' floating **red skull** (sprite 7, double size, at height 99) has no spell that works on it in the dungeons' block: it
is a hazard to keep away from, as it flies along its corridor, not a fault: the same in the original and in the port.)

**Changing spell.** The original changes it on "any other key" only after that key has been down for 16 frames **in all**
(`$236F` counts them, $1BFB, and is cleared only when it reaches 16, so the frames of several quick taps add up): a tap of a few
frames, which is what a key press or the touch SPELL button gives, took five or six presses. Now the keys that move the hand on
(Enter, the touch SPELL button, any other key that reaches the game's keyboard) are the front end's: one press, one spell on
(`actions.next`, as Dragonskulle's bar does), whatever the frame and with a spell flying. 1-9 and 0 pick a spell as before.

## Creatures after travel (fixed)

**His place along the strip** ($3214/$3215, in pixels, counted as he walks) is what the level's creatures are placed from: $3653
turns a column of the map into a screen x from it and from his sprite's x, and the level's start ($6003 and the others, called by
$6A9F) uses it. Travel kept it as the one he had where he came from (the travel test even listed it as "progress"), so after a warp the
knights of the lower guard room, the skull, everything a level starts, were placed off the screen or in the wrong room's place: "all
the bad guys have gone", until a new game ($0A00 puts it back). It follows from what a location holds: his place along the strip =
the view's first block (its column of 40) * 320 + the view's column * 8 - the fine scroll ($7FEE and 7) + his sprite's x - 57. This
holds in all 22,479 settled frames of the routes. `go` now puts it ($3214/5 are in the travel test's place bytes), and a save made after
a travel is put right when it is resumed (`repair` in `runNative`, `repairStripX`): if it is more than 48 pixels from what the scroll
and sprite say. `test/travel-creatures.ts`: in six rooms (2, 1, 16, 21, 20, 14) a walked arrival shows creatures and the travelled one
shows none before the fix; none lost after it, in 120 travels.

**What automatic play has not reached** (Go-Explore on the port, 25,000 tries of 150 frames from the 24 arrivals, keeping states that
put him in a new column, height or carrying state; the cells are 8 columns of a strip; this is "not found", not "cannot be reached"):
the crypt ($17, never entered; it is the room above the lower floor's third room, $2E33 adds $0B to the room number); the strips'
far right ends (columns 112-119) on every floor but L1 and DN; the middle of U3, U2 and L3 (columns 64-87 / 72-87), and **the right
end of L2 (columns 88-119, where a piece lies at $864C)**; and in the abode all but its right 40 columns (reached by directed search:
the fixture state). The port and the original behave the same at the right end of L1 (`south tower lower`, the tower door $5E/$67/$63/$23
at columns 109-112 above the floor: from the same state, going up and left-then-up end at the same place in both), so that is
the game's geometry, not a fault of ours. Open: whether L2's right end and the crypt can be entered, and how; the pause map's lit
cells (walked columns) will show you where you have not been.

## Hints (ENHANCED: src/hints.ts, src/guide.ts, src/hint-lines.ts; checked by `re/hints/check.ts`)

The goal is never told in the game (see "How the game is won"), so ENHANCED says it: the pieces marked, the way a piece carried goes
marked, the staff marked, and Pendragon's short lines on the status line (`Narrator`, the same as Blackwyche's GUIDED). Everything is
read from what the game keeps; nothing is written but the status line's characters.

- **The status line.** Row 22 of the panel, 28 characters from $0775, drawn once by $6A21 from the message table ($1044 + $1C * n):
  `$3231` is the message to draw next frame, `$3232` is 1 while a message of the moment is up ($3233 counting down from $F0: PIECE
  FOUND, DEPOSITED), `$3234` is the one it goes back to (1 SEARCHING, 3 CARRYING). Ours waits while any of those says the game's is up or
  coming, and puts the game's back by setting `$3231 = $3234`. The lettering is the Pendragon engine's (`games/shared/pendragon/status.ts`).
- **Triggers** (a snapshot of `$322F` carrying, `$6FFF` laid, `$3219` mode each frame): carrying 0 to 1 says the first
  piece's story (laid 0) or a reminder; `$6FFF` going up says N OF 16, and at 16 the staff's lines (no warning of midnight: ENHANCED's clock stops
  at 11:59); coming into the abode carrying says
  the obelisk is at the far left. A line not wanted any more (a piece laid before the reminder's turn) is dropped. After the game is won or lost
  nothing is said.
- **Sparkles.** `$322F` clear: every map piece in view (`$D5 $D4`, ten in all, read from the maps) and every sprite showing the piece's picture
  (`$5800`, which the game copies into the sprite of each piece it keeps in a room, and takes off the screen when it is taken; unchanged all along the
  routes). Carrying: `$CF` and the DOOR signs (`$A5 $A6 $A6 $A7`) on the floor's front edge (row 19 on the lower floor, 15 on the upper; the same sign
  is also painted along the top edge of some rooms, row 4, which is not marked) in the castle's two floors, `$B8` in the dungeons, the obelisk (sprite
  6) in the abode. After the sixteenth: the staff (sprite 6 of the shrine) until the game is won or lost. A cell's place is `8 * column + the fine
  scroll`: the scroll as the frame leaves it (`$7FEE`), because the game works after it has drawn, so the picture drawn next uses it (the same as
  the sprites' registers); cells under the 38-column border are not there (`games/shared/native/spots.ts`).
- **Found on the way.** There are seven pieces lying as sprites, not six: `$321C` (the upper floor's first level, in the $D800 block: `$62A8`
  takes it on sprites 1, 2 and 5 touching, $26) as well as `$321D` (dungeons), `$321E $321F $3222` (the $E100 block), `$3220 $3221` ($C000). With the
  ten in the map that is seventeen for sixteen needed. **The kitchen's piece** (level 2, `$3220`) is guarded: it hurts him unless `$C754` is 1, which
  AEOLUS (spell 6) cast at it ($C5DE, `$321A = $18`) sets for 80 frames; `check.ts` plays it: AEOLUS, then touch. The balcony's piece (`$321C`) hovers
  above a bed he can't walk onto from where the routes stand; the bot did not take it.
- **Checked** (`re/hints/check.ts`, about a minute): the cells against the decoded picture of the next frame, 10,296 frames carrying (6,999 with a
  sign or door in view, 105 the dungeons' far door) and 5,864 not carrying (3,219 with a piece in view), 0 differing; the way down through a front sign
  (level 3 to 2) and the `$CF` into the dungeons by playing; the kitchen's piece taken by the game's own code on a bot's play (94 frames), the hint on its
  sprite on all of them, gone after; a map piece on route 0 (level 3); the abode from the obelisk state (the obelisk on every frame it is in view, the
  staff after the sixteenth, gone on MENHIR, none when the wrong spell kills him); through the front end the status line (the game's FOUND line first,
  never covered, then the four lines, then the game's CARRYING back; DEPOSITED then N OF 16; the sixteenth's staff lines), ORIGINAL showing none of
  it (no sparkle, the game's lines only); midnight lost in ORIGINAL and held at 11:59 in ENHANCED, the pause screen's count, and the far door into the abode with its line.
- **Not done.** The hint of the spell that works on a creature (the README's spell table was read from the code and the kitchen's AEOLUS played, but
  the table's other rows are not proved by play, so no hint is made from them). Of the seven sprite pieces only the kitchen's was taken by the bot; the
  others are marked by their picture (the same code path) but unplayed. The line on coming into the dungeons carrying (`LINES.dungeons`) is written and
  not exercised in the front end.
