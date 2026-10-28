# How Blackwyche was ported

The same way as Entombed (see `../../entombed/re/README.md`), with the shared
native-port kit in `games/shared/native`:

- `engine.json`: the engine (everything outside $6000-$66FF), from the title snapshot.
- `room-XXXX.json`: each room's block of code and data, translated from where it's
  stored in the image (the table at $9D7A gives each room's block; the decks' block
  is the one at $6000 to begin with). Rooms $C ($FB20) and $D ($F890) and the end of
  $17's ($F690) are in the kilobyte the image lacked (build/README.md); with it put back
  every room's block is translated (`test/rooms.ts`).
- Checks: `games/shared/native/test` (`verify.ts blackwyche`, `lockstep.ts blackwyche`,
  `explore.ts blackwyche`, `travel.ts blackwyche`).

## The ship (the pause map)

`src/ship.ts`, built by `re/ship.ts` (`nice -n 15 node tools/test.mjs games/blackwyche/re/ship.ts`)
from the game's own data and code; drawn by `src/map.ts`.

- **Decks.** Five ($9D78, 1 the top). Each has two long parts ($1ECD 0 and 1), nine screen-wide
  panels each: the table at $6E43 (18 a deck; $73 a door, $76 the left end, $79 the right end).
  Deck 5's first part has a door drawn as wall ($6E8C is $70) until the game opens it ($12A5,
  when four of the things are found).
- **Halls.** Walking off a part's end ($08 going right, $1A going left: $245F/$24CB) leads into a
  hall of two screens ($1ECD 2 or 3; its panels from $1504/$150A; its room from $148D), and out
  of a hall ($0A/$0B going down: $25F3) onto a part. Part 0's right end and part 1's left are
  hall 2's two sides; part 1's right end and part 0's left are hall 3's: each deck goes round,
  hall 3, part 0, hall 2, part 1 and back to hall 3, and the map draws it so (the line under).
- **Cabins.** A door's panel leads into a cabin ($2648, going down onto char 9): $9DC2 picks it by
  deck, part and door, giving its room ($341C) and picture ($1ECF). `re/ship.ts` runs $9DC2 for
  every deck, part and door: 27 cabins (rooms $18, $21 and $22 serve two each). In a cabin $1EE5
  is the door ($10A7 notes it); $1F88 is which of the cabin's three screens he's on.
- **Ways between decks**, which keep the part and door: going up onto char $14 (a ladder) or onto
  $19/$2A/$20 (a hole) starts a climb ($1360, $1EC7 1 or 2): the old block out ($11CD), the deck
  changed ($116C/$1182, with $131F swapping the deck pictures between deck 1 and the rest), and
  $10A7 in to the cabin there. A cabin's block can also drop him ($342A, then $2DAD, the same way
  down). `re/ship.ts` finds the ladders (a picture with a hole over one with a ladder: 5 pairs)
  and the trapdoors (the blocks with `sta $342A`: 6). Some floors have holes of spaces ($20),
  which the pictures can't tell from floor; where one leads to no cabin, $9DC2 picks none, and
  the room, its block and the picture the climb chose ($88 down, $8B up) stay: a place under (or
  over) that cabin, which the map draws (with the way) once he's been there.

## Travel back (the pause map)

`src/travel.ts`; checked by `games/shared/native/test/travel.ts blackwyche`.

**Blocks.** Each hall and cabin brings its block of code, swapped into $6000 ($11CD, from where
the table at $9D7A keeps it; $500 bytes, but the blocks are kept overlapping: room 1's at $C000,
room 2's at $C110), so swaps only undo newest first; the character set swaps with it ($1082,
$3800 <-> $B800). The game itself always swaps the old block out before the next comes in (out a
door, a ladder, a trapdoor: $11CD twice), so the chain of blocks in over the decks' own is one
deep; the map keeps it as it watches play (`followChain`: a room's block came in over the decks'
own if the decks' code is now where that room's block is kept, else over the last one's), and
travel undoes it newest first, going only when the oldest block's home holds the decks' own code
(else it refuses, changing nothing).

**What the map notes.** On first standing in a place (not climbing, falling, jumping, striking,
losing or going through a door), `location`: which place (a deck's part, a hall, or a cabin by
deck, part and door, with its room and picture), and where he stands and how the strip is
scrolled (`DECK`: the panel, scroll, his place along it, his sprite, which ways he's stopped, the
steps of the way he's going).

**Going**, in the main loop between frames: out of where he is as the game leaves it (a cabin by
its door, $253F: the door's panels put back, the block and characters swapped back; a hall at its
end onto the deck, $2662), older swaps undone newest first; onto the target's deck as the game
changes decks ($131F between deck 1 and the rest, $1193 the colours); then in, as the game goes
in: onto a part as a game starts ($2A8F the part's panels, $0D03 drawn, the decks' block's start
$6003); into a hall from the deck's end ($2482: $2A8F, $1082, $148D, $11CD); into a cabin through
its door ($2648: $2A8F the panels, $1082, $10A7, $11CD; where $9DC2 has no cabin, the room and
picture noted stay, as the climb left them); and his place put back as it was. Energy, time, the
things found ($9D60-$9D79) and everything in the blocks (swapped, never copied) are left as they
are.

**Checked** (`games/shared/native/test/travel.ts blackwyche`): ten routes found by automatic play (Go-Explore on the native
port, recording the input; `re/routes.json`) walk to 41 of the ship's places on all five decks:
all ten long parts, eight of the ten halls, 22 of the 27 cabins, and the place under cabin $09
(a hole of spaces in its floor). From the routes' ends, five arrivals spread along each route and
a few seconds' random walking on from each, every place is travelled to, with round trips: 5,220
travels, all good: after a frame his place, the panels and the playfield (screen and colour) are
the walked arrival's; with the halls and cabins left the game's way every code byte of every
block is home and the character sets are the source's; the progress bytes are as they were;
random play after runs on with no 6502 fallbacks. Walking on with the same input for 400 frames
ends where walking on from the walked arrival does 3,730 times of 3,840; the rest are arrivals
in the trapdoor cabins ($21, $0A, $0B), whose block drops him at once with its own timing (the
block's state is carried, not restarted). Where he's arrived falling, travel is refused with
memory untouched (107). `games/shared/native/test/pausemap.ts blackwyche` goes to each of the 41 places through the
front end (pause, a tap, Enter).

Not reached by the automatic play (drawn dark on the map until found; travel there works the
same way): deck 5's halls ($17, $12) and cabins $04 (deck 1), $1B (deck 3), $1F, $0D and $0C
(deck 5; $0C behind the hidden door).

## Things to find (the maps)

Each room's block takes its thing itself: a collision with Pendragon (or his sword) where he
stands, its found flag at $9D60-$9D79, and its name (the table at $9C38, 14 letters each, number
in $342F) on the status line. Some need others first. The four pieces of map ($9D64, $9D65,
$9D66, $9D79) open a door on deck 5 ($1289 puts panel $73 at $6E8C, run each time he goes in
or out of a place, when all four are found) into room $C, the captain's cabin (its end: $342C = 2).
Where, and what the game asks for (each read from the room's block, and played in
`test/guided.ts`; coordinates are VIC ones: $341F/$3420 are his sprite's, y a cabin's depth: up the
screen is smaller, and his feet are 42 lower; the sword is sprite 3, and a swing is three
positions over about 19 frames: at his left (x - 18, y + 23), (x - 18, y - 7), then
x-expanded (x - 32, y + 7); he can't strike in the air, and a jump goes straight up):

- room 4 (deck 1, back part, door 3): the piece (sprite 6, a small yellow roll on the upper-left
  shelf, at (76, 125)) must be struck once with the sword (USE SWORD, which works once the magic
  sword is found in room 2: walk into it at the front); struck ($638F 1), it flashes and *falls*
  ($3409 goes from $7D to $AA), then it's taken ($9D64), with no touch of his own needed. **Where
  the sword reaches it:** only from the front left of the cabin. The sacks block the floor behind
  them (the floor starts at column 12-13 on rows 14-16, and at column 1-3 on rows 17-19), so from the
  back (y up to 142) the blade stops 7 pixels short (x 127) or 2 rows under it (x 119). In front
  of the sacks (y 144 on, rows 17-19) the swing reaches it facing left from x 96-105, facing right
  from x 47-53 or up from x 49-56: walking down to the front, then left to x 104 and X took it,
  here and in the original (the translation and the original code run in lockstep from a state in
  that cabin, 258 passes identical); it is not out of reach, and not a port fault;
- room $11: the piece (sprite 4) flashes all the time ($6000 sets its colour from the timer each
  frame) and is taken by touching it (Pendragon and sprite 4: $3414 bits 2 and 4) only with the
  telescope ($9D70, room $A: jump into it, $3427 = 1), the sextant ($9D71, room $D, at the back,
  y < $7C) and the compass ($9D72, room $B, y < $7B, on foot) found;
- room $12: with the bell, the book and the candle ($9D61-$9D63), strike its guard (sprite 4)
  while his y is under $86 and the sword is within 8 pixels of the guard's x: *16 frames* of that
  ($631C, a swing is several of them: about three swings), then walk into the piece (sprite 6),
  on foot, y under $78 ($9D66). Without the rite nothing counts;
- room $17: with $9D74 found and $9D73 at 2, touching both creatures (sprites 4 and 6, and no
  other: $3414 is exactly $54) with y under $90 starts a count of 32 frames, then another 32
  while the piece falls, then it is his ($9D79);
- the book (room $10, block $DD60): needs the key ($9D67) *only*: the check of the bell ($9D61)
  at $60D0 is four NOPs ($EA) in both images of the game, so the book can be taken first.
  Touching sprite 4 (the book, in a door) with y under $9A for 32 frames ($6144), the key in hand;
- the bell (room $15, block $D080): the sword on sprite 4 (dark grey in the wall) with y under
  $8A, 32 frames of contact in all ($6128, reset on coming in); its x depends on the side he
  comes in from ($342D: 1 going right off a deck's end, the bell is off to the right, 2 going left,
  it is at x $80);
- the mirror (room 8, block $F1D0): the sword on sprite 4 (yellow lines on the yellow sacks) with y
  at $9A or more (the front), 32 frames in all ($6199, reset on coming in) makes it his ($9D73 =
  1, sprite 5); the same counter then runs on to 128 (96 frames more) *in that room* and $9D73
  becomes 2 (used: it shines);
- the captain (room $C, block $FB20): one sword hit on sprite 4 with his x under $A5 (and his
  x's high bit clear) sets $633B to 1 (the end: 2, 3 the sprites go, then $342C = 2). Only the
  lower plank at the left end reaches him (x 159-166, y 120-127, facing left);
- a trapdoor ($342A set): room 8's sprite 6 touched with y under $8B (rooms $0A, $0B, $1D and the two
  cabins of $21 each have one: `src/ship.ts` WAYS).

What the rest are for (the same reading; `src/guided.ts` THINGS has each):

- the **seaweed** (room 5) and the **pearl** (room $14, the oyster is sprite 6, the pearl sprite 4):
  touched without the seaweed the oyster closes ($6155 sound, the pearl hidden for a moment);
  with it the pearl is his;
- the **skull** (room $E): the room drains his energy (about 14 in 5 seconds) unless the pearl
  ($9D69) is in hand; nothing stops him taking it; the **crossbones** (room $13) asks for nothing;
- the **key** (room $F, sprite 6) is given only with the skull and the crossbones ($9D6D,
  $9D6E) found; the book then needs the key;
- the **gunpowder** (room 3), the **anchor** (room 7: the cannon, sprite 0, touched at the front
  (y $A5 on) with the gunpowder in hand fires ($6252 2), the chest (sprite 1) blows ($6255 1, then 2
  after 64 frames), then the anchor is his) and the **comb** (room 9: with the anchor in hand,
  touching sprite 4 brings the comb down ($3405 up to $B0));
- the **doubloons** (rooms 3/6 and $1E, sprite 1; the second only while jumping, $3427 = 1) put
  his energy back to 100; the **bucket** (room $20), the **water** (room $1F, needs the bucket) and
  the fire in the bucket's room (sprite 0, which hurts unless the water is in hand: $9D75 becomes 2
  and the fire is out) are for no map piece.

### Where the things are kept (the pause screen's ITEMS, `src/items.ts`)

The game keeps no inventory and shows only the last thing found (the status line, "YOU HAVE FOUND
...", from the name table at $9C38, 14 ASCII letters each, 20 names). What he has is the found
flags: $9D60-$9D76 and $9D79 (cleared at a new game by $0A73; 1 taken, 2 where the game goes on
to use it: the mirror $9D73, the water $9D75; $9D6B is never set) and the magic sword's $342B.
24 things under 20 names: four pieces of map ($9D64-$9D66, $9D79) and two lots of doubloons
($9D6A, $9D6C). Each room block takes its thing with `lda #n, sta $342F` (n the name's number from 1)
and a store to its flag: bell $9D61, book $9D62, candle $9D63, gunpowder $9D60, key $9D67,
seaweed $9D68, pearl $9D69, skull $9D6D, crossbones $9D6E, anchor $9D6F, telescope $9D70, sextant
$9D71, compass $9D72, mirror $9D73, comb $9D74, water $9D75, bucket $9D76. `test/items.ts` scans
the image's code for exactly those pairs, and plays the route that takes the gunpowder and the
skull (status line and flag), then checks the pause screen (map page 2, side panel ITEMS n/24).
(SEEN on that page counts the map's places, not things.)

## Combat and controls (src/combat.ts)

As Entombed's (`../../entombed/re/README.md`, "Combat and controls"; it's the same engine).
Pendragon is sprite 2, his sword sprite 3 ($279F draws it, $1ED0 is 1 while it's out); the
collisions read are kept at $3414. On the decks the engine itself ($6B35) takes the sword's
blows on its three creatures (sprites 4-6, close enough in depth): each goes from 1 to 2 ($6C5E,
$6C64, $6C6B), turns grey and floats away, and a new one comes later: those are `kill` hooks.
The cabins' blocks have their own creatures and things to cut (`strike`s, judged destroyed or
hit from the next frame's picture). Hurts: as in Entombed, a hurt flag set where a creature
touches him (the decks' $6C4E, each block's own, found by the routine calling the hurt sound
$379B), then after the flash the damage ($3417); in the block at $D7B0 both at once (`also`).

His steps into the picture are $1CCF and $1DAD; $236B works out whether up ($2177) and down
($2175) are open for the way he faces ($216F), at offsets $153B/$153C, from the character at
$0400 + 40 * ((depth - $153C) / 8) + ($341F - $153B) / 8: floor ($01, $03, $15-$17) clears them;
facing up it takes the cabin's door out ($05), starts a ladder ($14) or the stairs down ($20, $19,
$2A); facing down the ways to the decks' other parts ($0A, $0B) and a cabin's door in ($09),
drawing the next place at once. The 8-way assist looks the character up the same way and runs
$236B and the step only onto floor; at a door or stairs the diagonal is straight that way until
he's through. A step also moves him a pixel more where $236B found it so ($1ED2), as his handling
does. The deck rocks him a little
as it goes, so the controls test looks for any step that way in the first frames.

Checked by `games/shared/native/test/combat.ts blackwyche` and `controls.ts blackwyche`.

## Smaller additions

- **Trapdoors stay open** (`src/trapdoors.ts`, `test/trapdoors.ts`, ENHANCED): each trapdoor is a sprite of boards in its
  cabin's block; on giving way the block copies the hole's shape ($5280) over the boards (or sets room $0B's sprite pointer
  to its copy) and sets $342A. Coming back in, the block draws the boards again; the assist puts the hole back. Remembered
  with the saves. Room $21's two cabins have theirs where he comes in, so those still drop him at once.
- **The captain's blow counts once** (`src/captain.ts`, `test/captain.ts`, ENHANCED): the soul in the skull's eye (room $C, block
  $FB20) needs one blow: $622B stores 1 in $633B (the end: 1 the soul flashes and a note rises, 2 it floats up, 3 it is gone, then
  $342C = 2). $620C reads the sword's touch every frame and runs that store whatever the state is, so a sword still touching as 1
  gives way to 2 puts it back to 1; and 1 only leaves for 2 when its note's counter $633E is exactly $20 (the counter drives both
  voices' high byte, $D408/$D40F, 7 up to $20 is 106-480 Hz), which the extra frames of contact have gone past: it counts on to $FF
  (3.8 kHz) and wraps, half a minute. Swinging on freed nothing in 100 swings in the original. The hook at $622B (a no-op once
  $633B is not 0: the first blow counts) is the whole change; the game's own sound is untouched, and no sound of ours is added
  (the `hit` effect on the second SID is a short noise sweep, 1800 to 700 Hz).
- **Up a ladder, stay up** (`test/ladder.ts`, ENHANCED): Up held as the climb ends is ignored until released.
- **Mends** (`src/mends.ts`, `test/mend.ts`): saves are machine snapshots, so putting the missing kilobyte back in the game
  image (`build/README.md`) did not reach saves made before it, which still held the hole and crashed at the same door. A
  mend (`mends` in `runNative`) names the part's hash as the old image had it and is applied to a save on resuming it, only
  on an exact match.
- **Place names** (`src/names.ts`): the game names none of the ship's places; these are ours, on the pause map.

## GUIDED (ENHANCED: src/guided.ts, src/guided-lines.ts, `test/guided.ts`)

Played through, the puzzles read as random: things hidden in a wall, a sack, a door; no reason given for needing anything;
the captain's door from nowhere. GUIDED (one assist, ENHANCED's, on by default) has Pendragon say what he makes of things on the status line and marks what he can
take. It reads the game's memory and writes only the status line's text; ORIGINAL is untouched.

- **The status line** is the game's message line: $0773, 32 characters in screen memory (row 22,
  columns 3-34), drawn from the table at $6D0B (message 1 is SEARCHING FOR THE CAPTAINS SOUL, 2 GAME
  NOW ON PAUSE, 3 YOU HAVENT FOUND THE SWORD YET; `$3418` says which to draw next frame, then 0). A
  thing found has the game wipe $0772-$0794 and write YOU HAVE FOUND <name> for 160 frames ($3419 is 1
  while; $341A is the timer), then it draws $341B's message (1) again; the sword message waits 48
  frames ($1515). So "the game's own message is on the line" is `$3419 | $3418 | $1515`, and
  `$3418 = 1` has the game draw its own line again. The lettering is the game's cut-out set:
  A-Z (screen codes 1-26), the digits ($31-$39, $3A is 0) and a colon ($3B): no apostrophe, comma
  or full stop (the game itself writes CAPTAINS, HAVENT). `games/shared/native/narrate.ts` does the
  rest (parts, balance, queue after the game's message, putting the game's line back).
- **What the game asks for** (`THINGS`, the order is the order NEXT suggests them in) is the section
  above, found in each room's block. Sprites are marked where the VIC has them (the middle of the
  opaque pixels, `spriteSpot`), hidden or not: the bell dark grey in the wall, the mirror in the
  sacks' yellow, the book in a door.
- **The door** on deck 5 (part 0, panel 1, $6E8C) is the game's own panel $73, put there by $1289
  when all four pieces are found. Showing it from the start would be a real door he can walk into
  (the captain's cabin, and its end, straight away): sealing it would need a 21st room picture
  (the map and the rest of the code all know the game's 20) or rewriting screen cells the
  deck's scroll redraws at every step. Instead he says A SEALED DOOR. FOUR MARKS UPON IT, once, when it
  is on the screen (`$1F87`/`$1F88`, the two panels shown, one is 1) and the pieces are not all his.
- **The book before the bell** is not blocked, because the game doesn't ask for the bell (four NOPs at $60D0). The book
  taken first says THE RITE BEGINS WITH THE BELL after its found message instead.

