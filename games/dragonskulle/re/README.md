# How Dragonskulle was ported

The same way as its three siblings (see `../../entombed/re/README.md` and
`../../blackwyche/re/README.md`): the same engine, translated with `tools/re/to-ts.mjs` and
run on the shared native-port kit in `games/shared/native`. GAMES.md records why it's
translated (a native Pendragon engine for all four may come later).

## 1. Translation

- `engine.json`: the engine (everything outside $6000-$6BFF), from the title snapshot
  (`../build/README.md`). Entries: the restart $0A00 (the title, then a game), the main loop
  $166D (it waits for raster line $D7 at $1FA5, as Blackwyche's does), the raster interrupt
  $2413, and $37AD (the hurt sound: only the blocks call it).
- `room-XXXX.json`: each place's block of code and data, translated from where it's stored. The
  game swaps a block into $6000 on every change of screen ($1137: the table at $9C02 gives where
  each block is kept, by the block number $341C that $0EB8 works out for the screen; $9C2C how
  many pages: 1 to 12). Unlike Blackwyche's, every change of screen swaps the old block back out
  first and then the new one in, so nothing chains. The block at $6000 to begin with is the one
  blocks 3 and 4 use (12 pages); block 0 swaps only its first page (from $FF00), so its version
  is that page over the rest of the first. Thirteen versions: $6000, $FF00, $C000, $C400,
  $CD50, $D870, $E010, $E460, $E900, $EF20, $F220, $F470, $F6E0 (some kept overlapping, as in
  Blackwyche).
- `callsMayWait: ["6000"]` (a translator option): the final room's block
  ($F6E0) waits for frames in its own code ($62A1, the end's delays), so the main loop's call
  of $6000 is `yield* callGen(0x6000)`: the loaded version's frames when it's one that waits.
  Before this, the native host's `call()` of a version that waits returned a generator nobody
  ran: the final room's code silently didn't run at all (lockstep from the final room showed
  it; no fallback did). Such a call is now noted with `NativeHost.fallbacks`.

Regenerate with `node tools/re/to-ts.mjs games/dragonskulle/re/<file>.json` (engine first).

## 2. The island

The island is a grid of screens: 17 columns by 24 rows of the table at $6E20, each cell the
page of the picture drawn there (0: nothing); row 0 is the beach, the rows go up into the
caves. He's on column $20A8 of row $20A9 (the row's cells are copied to $20AD). Some rows run
on as one long place the screen scrolls along ($20A7 the column the window starts at, $1277
and $127D the scroll): the beach ($76 $70 $73) and the corridors ($82 ... $7F, $A0 $88 $85).
The rest are a screen each ($8B, $AC, $A6, $A9, $A3). The block for a screen is worked out
only on a change of screen ($0EB8: by the picture for a few, else the table at $B400 of
column, row, block and a value), never while scrolling along a row.

Changes of screen: walking off the right ($E1) or left ($F4) edge character, up into the
picture onto $8B/$F3 (only once the way on, $3441, is open), down onto $E0; each the same
sequence: the screen off ($11E5), the old block out and the new screen drawn ($0EB8), the new
block in ($0DAB, $1137), the screen on ($120D).

## 3. Checks (games/shared/native/test)

- `verify.ts dragonskulle`: each translated routine patched into the running original and
  compared on every call (memory, registers, flags). 3,000 frames from the title and 1,500
  from each of 9 states deep in the caves: 0 differ, except calls of $24BB that change the
  screen: the original takes interrupts inside them (the change of screen enables them, $0DAB),
  which a single native call can't (the jiffy clock and the raster registers then differ); those
  are covered by lockstep. Overlay entries whose loaded version waits aren't checked by verify.
- `lockstep.ts dragonskulle`: the whole native game against the original from the same
  snapshot with the same input, memory compared at every pass of the main loop. From the title
  (1,500 waits: the title tune's bytes, $9AD6-$9AE8, aren't compared: the native title starts its
  tune again, `ignore`; the native start's setup waits on the title aren't counted,
  `titleSetupWaits`), and from native saves (the original makes the main loop's wait call that
  the save is in): 3,000 waits from each of 9 states along the recorded routes, and 2,000 from a
  state in each of the 13 blocks (blocks 3/4, 5, 7, 8, 9, 12, 14, 16 and the final room put
  there by a cheat: the game's own change of screen to that cell): all identical.
- `resume.ts dragonskulle`: saved and resumed copies identical for 1,500 frames.
- Coverage: automatic play on the native port (Go-Explore keeping each cell's inputs from the
  title, after a scripted beach: the starfish, round the rocks, into the caves) reaches 20
  screens of 9 blocks; every screen of the table, reached by the game's own change of screen,
  runs 400 frames of random play: all 13 blocks, no 6502 fallbacks.

## 4. Travel back (the pause map)

`src/travel.ts`, `src/map.ts`; checked by `games/shared/native/test/travel.ts dragonskulle`.

The map notes where he is (`LOCATION`: the cell, the scroll's column, his sprite's place, the
way he faces and its offsets, his place on the screen's map of characters) when he comes onto a
screen by a change of screen, not by walking along a scrolling row (the game works out a
screen's block only on a change of screen), nor where a game starts. Going: that place written
back, then the change of screen walking off an edge makes ($3441 = 1 as the edge code sets it,
then $11E5, $0EB8, $0DAB, $1137, $120D). Every change of screen swaps the old block out first,
so travel is offered from anywhere he's walking or standing (not in a jump, a throw, digging or
losing a life).

Checked from the routes (`re/routes.json`, found by the automatic play): 36 arrivals, 520
travels (122 round trips): after a frame his place is the walked arrival's, the playfield
(screen and colour) is, the screen's own sprites (all but his and the stone: creatures, the
starfish, the mound, the shovel, the dragons) are shown or not as walking in left them, with the
same image, within a few pixels; every code byte of every block is home once the block in is
swapped out, the progress bytes and the dragons killed ($72B0-$72B3) are as they were; walking on
with the same input for 400 frames ends where walking on from the walked arrival does (398 of
398); random play after runs with no 6502 fallbacks.

The other sprites' high x bits ($D010) are cleared on going. The game never clears them: a change
of screen hides the old screen's sprites (their y at 0, $0FDE) and clears only Pendragon's bit
($1002); most blocks' setups then write $D010 themselves, but some place their sprites by the low
byte alone, trusting what the screen before left. The shovel's room ($EF20) is one: travelled to
from where walking had left the bits of sprites 4 and 5 set (1,1, the first screen in the caves,
as walking up from the beach leaves it), its two ants were drawn 256 pixels right, off the
screen (the shovel, sprite 6, the same way, from a screen leaving its bit set). Walking in, the
bits are what the screen next door left: clear along the routes, and in every walk out of the
room and back in from 4,1 tried.

## 5. Combat and controls (src/combat.ts)

As the siblings' (`../../entombed/re/README.md`, "Combat and controls"). Pendragon is sprite 2;
his weapon is the magic stone (the STONE icon, action 3), sprite 3: $27F6 throws it ($1FEF 1
while he throws, 2 while it flies: it goes the way he faces, up and to the right facing up).
The collisions read are kept at $3414. Each block checks them for its own creatures: the stone
on one (sprites 0, 1, 4 or 5, by block) runs the code for that (`strike`, judged destroyed or hit
from the next frame's picture: the dragons take ten). The shovel room's stone checks on its two
creatures do nothing (they branch to an RTS): no hook. Hurts: a creature, a ray, a drop or the
gas touching him sets the block's hurt flag (found by the block's routine calling $37AD); then
six frames of flash ($37AB) and the damage ($3432), taken from the face going ($123E, 20 to a
face) and, when that's gone, a face becomes a skull ($1248: three per face lost; five faces are
the lives). In the gas rooms ($F220) the flag is set again while a flash is still counting: a
hurt starts only when none is (`when`).

His steps into the picture are $1DF7 and $1ECE (right $1CA5, left $1D4E), every other frame
when he already faces that way; $24BB (after his handling) works out which ways are blocked for
the way he faces ($2292: $229A up, $2298 down) from the character at the offsets $1281/$1282,
and takes him off the screen there. Diagonals are one of the four ways as in the siblings.

Checked by `combat.ts dragonskulle` (36 states along the routes, 54,000 frames of random fights:
529 hurts, 519 throws, 24 blows, all as the game did them) and `controls.ts dragonskulle` (80
diagonals as the original's four ways; with the assist 74 of 80 move both ways, 1,864 steps each
one straight up or down takes too; a diagonal towards each of 7 ways up or down goes where
straight goes; fire+left facing right turns him; no fallbacks).

## 6. Hints (re/hints, src/hints.ts)

The puzzles that move the game on, read from the blocks' code, are the beach's and the
shovel's (the rest of the way is fights: dragons to kill with ten stones, bridges cleared by
killing their creatures, and finding the way; the tombs to dig are luck, good or evil):

| Hint | Where | From the code | Done |
|---|---|---|---|
| touch a starfish | the beach (block $C000) | sprite 6 touching him with his y under $9A ($625E): $6273 stops the rays at the caves' mouth | $3441 = 1 |
| walk up to the shovel (or throw a stone at it) | its room (block $EF20) | the stone on sprite 6 within 8 pixels across and high enough ($6235); in ENHANCED also him touching it ($61EA, below) | $342F = 1 (the SHOVEL icon) |
| dig here for the cloak (with the shovel) | the beach, where he landed | digging (action 0, $3428) touching sprite 7, four times sixteen frames ($6294, $63D2) | $342E = 1, then $63A2 gives the CLOAK icon ($3430) |

`re/hints/check.ts` solves each by playing from states along the routes (steered at the sprite,
the shovel first set where a step needs it, as the game would have it), then replays the inputs
and checks with `src/hint-spots.ts` that the hint shows on that sprite until it's done (every
frame), that the game's own code does it, and that it's gone a second later; it renders each.

  nice -n 15 node tools/test.mjs games/dragonskulle/re/hints/check.ts /tmp/hints

### The shovel (for the player)

The shovel lies at the back of its room (cell 4,2, block $EF20; up from the first caves), between two
ant-like guards (sprites 4 and 5). He can walk up to it and touch it, but in the original only a stone takes it.

- Throw facing **up**. A stone thrown left or right flies along at his height and passes under it
  (never takes it: 0 of 1,474 standing places either way). Facing up, the stone flies up and to the
  right, 2 pixels each way a frame, after about 20 frames of wind-up.
- Stand **below and to the left** of it, on the diagonal up-right to it: the stone must touch it
  ($D01E) within 8 pixels across of it while above y $60 ($6235). From his sprite at x $87, y $89
  (left of the middle of the floor; one solve) the stone meets it at $C1,$5F. Sixteen standing
  places in each row he can stand on work (sprite x + y from $107 to $116): 99 of 1,474 tried.
- Throw **soon**: every 16 frames each ant takes a step towards it, 36 steps (11.5 seconds, $6110),
  and a stone that touches an ant as it meets the shovel doesn't take it ($6257, $6260). Once
  they're close it can't be taken (walking to the place and throwing from 380 frames after coming
  in works from 27 places, from 450 frames none) until he leaves and comes back (the room's setup
  puts them back apart, $6003).
- The ants hurt him only if he walks up to them at the back (his y under $60, not jumping, $61FF):
  they knock him back down ($341E = $80) and take energy. The stone passes through them.

Taken: the SHOVEL (DIG) icon is his ($342F = 1) and flashes ($62D7), and it's gone from the room
for good (the setup leaves it off, $6096). `../test/shovel.ts` checks this, with travel, against
the original.

Walking up to it is what a player tries, and he can: from the left half of the floor he walks up to
the back and his sprite touches it ($D01E: sprites 2 and 6) within about 5 seconds of coming in,
and still once the ants have closed in (then always touching an ant too, which hurts him only above
y $60). The original does nothing with that. **ENHANCED** takes it on touching (`../src/shovel.ts`):
a hook at $61EA (the room's check of the collisions it has just read into $3414) runs the code its
stone check runs on a hit, $6269-$628E (a routine of its own in the translation, `r_6269`: an
entry in `room-ef20.json`), when he and the shovel touch and it isn't his yet. So it's the game's
own taking (sprite off, $342F, the icon's flash, the sound, the score), at the frame's own moment;
the ant check after it goes on as ever. No easing of the ants is needed: touching works whenever
he gets there. `../test/shovel-touch.ts` checks it through the front end (walked to with the arrow
keys, ENHANCED; kept through travel, the autosave and a launch again; ORIGINAL: touching does
nothing, a stone takes it).

## 7. The action bar (src/main.ts: `BAR`, `dragonskulleLayout`)

The game draws its icons along the top (rows 0-2, its panel charset at $3000; a raster split
puts the playfield's at $3800 on rows 3-21 and $3000 back on 22-24 for the score and faces).
Action n ($12EB: 0 shovel, 1 cloak, 2 pause, 3 stone, 4 jump) has its icon in columns 7n+2 to
7n+4 and a hand pointing at it in 7n+5 to 7n+7 ($12EC = 7n), always there but coloured in only
where the hand is ($12CF: light red, else black). Fire uses the action ($16FF); one not found
yet ($342F + n is 0) flashes its icon ($12EE, from the panel's copy at $6D16). "Any other key"
moves the hand ($1296): one icon each 5 frames a key is held ($12ED), through PAUSE; PAUSE
($6CC0) waits for fire with the volume off and its frame flashing, as F7 does.

Z/X/C/V start their action one frame after the key, as Space does with the hand already there
(`test/frontend.ts` measures it, standing and walking). Enter (or any other key) moves the hand
one along the bar a press, by the same selection the direct keys use ($12CF off the old icon and
on the new, as $12A1 does); a key pressed during a hit-stop is kept for the next frame, not lost.

Shown: the picture is laid out (c64kit's layout.ts), not the game changed: the status line
(rows 22-24) to the top, the play area under it, then each icon with its hand (the game's own
characters and colours, so the hand and the flash are its own) in a slot of the bar at the bottom
in the keys' order, labelled below in the panel's letters, centred under the icon (the key white,
the action light grey; 3 lines between the icon and its label, 2 between the play area and the
icons). To make room, the play area's top four lines (y 24-27, the top half of row 3) are left
out: shown from y 24 is drawn from y 28. No character is ever drawn there in play (row 3 is always
fetched on line $4B, no fine scroll): checked on every frame of the 7 recorded routes plus 600
frames of random play after each, and on every screen of the island's table (161), each entered
by the game's own change of screen and played at random for 400 frames: 94,016 frames in play,
never a character pixel on y 24-31 (nor on row 21, y 168-175). Sprites reach there (Pendragon going
up off a screen, the creatures at the top of a cave: up to y 2, over the game's panel, as in the
original): they're drawn whole, and go with the play area (its move's `over` takes in everything
from y 0 to 175), so they show over the status line as they showed over the icons. The panels'
rows are scrolled 7 pixels ($D016 = 7): the moves and labels allow for it. Sparkles and effects
go with the part their middle is in (the faces' pulse to the top). The charset keeps its Z cut
out of a solid cell (code $1A, the only letter so): labels draw such a letter the right way round.
The title doesn't list the action keys (the bar labels them): the line that said ANY OTHER KEY TO
CHANGE ACTION is blank, and ENTER CONTINUE goes there.

The energy of the life under way ($123E, 20 at full; a hurt's damage, $3432, taken a point a
frame) shows nowhere in the original until it's gone and its face becomes a skull. The layout's
gauge (`energyFace`, c64kit's `Gauge`) shows it on that face, the leftmost not yet a skull
($1248 / 3): its lines 2-22 (its picture) empty from the top to dark grey, one line a point or so
(`emptiedLines`), drawn before the moves so it goes to the top with the status line. Checked
(test/frontend.ts) over random fights in both modes and a life's last points taken as a hurt
takes them: every level from 20 to 1 drawn as the energy says, the rest of the status line as the
game drew it, the skull and a full next face when a life goes; full again on coming onto a screen
(ENHANCED) and on continuing.

## 8. Found along the way

- The only copy that runs on the probe is the "1001" crack (`../build/README.md`); its title
  says "COPYRIGHT A.C.G. 1001". It could not be cross-checked against another copy; every
  screen of the table was run, as above, with no crash.
- The panels' font: Dragonskulle's title charset keeps its 0 at $3A (as the siblings' status
  lines do) with a picture at $30: `games/shared/continue.ts` tells that by the digits' rows.

## 9. The HD view (src/hd.ts, c64kit's hd/)

The HD view draws the same game as a lit 3D scene made from its own picture, as Entombed's does
(`../../entombed/re/README.md`, "The HD view"; `docs/hd-view.md`); `test/hd.ts` plays 400 frames in both
views and compares memory, looks at the beach, the skull rock, the cliffs further on, a cave and the
cave over the river along the first recorded route, and walks 3,000 frames of it (the island's rows
scroll: the room built before is moved, 649 frames of them). The beach shows the sky and the sea:
out of doors, in daylight (Entombed's "The look"); the caves are night, his light the only one. The
tilt-shift softens the cliffs above him as the HD-2D remasters soften their backdrops.

- **The play area** is character rows 4-20 (y 32-167) as the machine draws them. The front end's
  layout (`dragonskulleLayout`) shows them 4 lines higher, under the status line it moves to the
  top: the HD view takes the room's band from the layout's move (c64kit's `obliqueRoom` is given
  `renderer.layout`), and the sprites where C64View puts them, so the room is drawn where the picture
  shows the play area, with the status line above it and the action bar below as in the C64 view.
- **Floor:** the sand the floor check ($24BB, its list at $254B) stands him on: $3F (a solid block
  in the sand's colour), $12, $21, $62, $16, $29; and the pieces round the sand's edges and under the
  rocks lying on it, whose sand is the colour RAM's yellow (pair 3, `floorPair`). Marks smaller than
  a character lying on the sand (a starfish) are part of it.
- **Open:** the sky and the sea past the beach are the same $3F, in cyan and blue: nothing of the
  island (the picture shows there as it is, in its own colours, unlit, behind it).
- **Lights:** none in the picture; his own, in the caves a warm pool round him.
- **More sand:** the sand at the cliffs' foot, round the rocks and the starfish is drawn in
  characters the floor check doesn't list (26 of them, found by a scan along the first route: drawn
  with the sand nearly everywhere they're used, or beside the floor in most); they're edges now, so
  the sand there is floor: no more blocks of sand standing up at the cliffs or by him.
- **The cliffs' tops against the sea.** The sand's edge characters ($49, $4A, $5D, ...) are drawn at
  the cliffs' tops too, with their sand's pair in the sea's blue: read as floor, they made small level
  patches up on the cliffs, a staircase silhouette with dark lines along its steps. What's seen past
  the room now goes on from its own $3F blocks into whatever is drawn against it in its colour (c64kit's
  builder: the open part spread through pixels of its colour), so the sea comes down clean to the rock.
  The river under the river cave ($3F and its wave characters in the same blue) is now all seen as
  drawn, not half of it standing in blocks.
- **The cliffs as one face** (`ragged: 8`). The sand's back edge is drawn ragged, a pixel or two up and
  down and a character at a time, and every column of a cliff stood on it where it was: slabs a column
  wide at their own depths, with seams of the picture between them, and the cliffs coming forward along
  the right of the beach a stair of slabs. The builder now takes each column's faces (its upright
  pixels by depth: a cliff above the sand, rocks in front of it) and puts each where the same face goes
  on average over 8 columns either side: one face along the edge, upright. It's Dragonskulle's
  (`ragged` in its spec): the Pendragon rooms' walls stand on straight edges whose steps are real
  corners, and smoothing those bent them; Entombed, Karnath and Blackwyche don't set
  it, so their rooms are as they were (their stills the same but for the sprites). test/hd.ts looks at
  two more outdoor screens (under the skull rock, frame 800; the cliffs further on, frame 1200); a
  scrolled room moved is where a fresh build has it for 97.5% of its pixels (99.5% before: the face's
  average reaches 8 columns, so new columns coming in at an edge move the face near it).
- **The dig spot lies on the sand.** The shadow beside him on the beach wasn't his: it was sprite 7's,
  the spot to dig for the cloak, a solid 24×21 block in the sand's yellow over the sand's marks (on the
  C64 only the marks it covers missing show it). Standing up as a billboard it showed as a pale card
  with a shadow. A sprite drawn all in the floor's colour where it stands is now a patch of the floor
  in the HD view (c64kit's `patchOfFloor`): it lies on the sand, lit as the sand, no shadow. Shadows
  everywhere now go under the sprite's footprint (the columns whose lowest pixel is within 6 rows of
  its lowest: both feet of a stride), checked on every still (`checkShadows`).
