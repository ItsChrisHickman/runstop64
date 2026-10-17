# Auf Wiedersehen Monty: what the original does, and where

Notes on the 1987 game's code and data, and how the native rebuild in `src/` is checked against it. The source
image and how to rebuild the snapshot are in `build/README.md`. Everything here was read from the running game
(a snapshot of Monty standing in room 72, `play.state` / `play.ram`) with `tools/re/disasm.mjs` over a coverage map
(`re/coverage.ts`: the game played at random in every room, 600 frames each) and probes on c64kit's C64 model
(`re/trace.ts`, `re/watch.ts`). No disassembly of the game has been published; the labels are ours, and the
variable names are ours.

**Confidence.** *Proved* means a check compares the rebuild against the original running. *Read* means the code
was followed and the address and purpose are known, but no check covers it.

The rebuild is native TypeScript, not a translation: typed state shaped like the original's variables, one module
per concern (`monty.ts`, `enemies.ts`, `items.ts`, `lifts.ts`, `world.ts`, `rng.ts`, `game.ts`, `flight.ts` for the logic;
`picture.ts`, `screen.ts`, `panel.ts` for the picture; `title.ts`, `scroller.ts`, `closing.ts`, `program.ts` for
the flow; `main.ts`, `map.ts`, `save.ts` for the front end). The original stays the reference.

## Checks

Run `nice -n 15 node tools/test.mjs games/awm/test/<check>.ts games/awm/build/play.state ...` (arguments in each file's
header). All compare the rebuild with the original on c64kit's model, step by step or frame by frame.

| Check | Compares | Result |
|---|---|---|
| `rooms.ts` | all 80 rooms drawn from the data against the original entering each (its own routine $5581) | 80 of 80 identical |
| `flight.ts` | the flight (the key at a plane, the sky, the other plane) frame by frame: the picture, the variables the interrupts keep, the sky's rows, the sound requests | identical, see the flight's section |
| `sprites.ts` | the 256 sprite frames (straight or mirrored) against every entity image the VIC drew in 10 rooms | 16234 of 16234 |
| `lockstep.ts` | every logic step ($551A): Monty, the four enemy records, lift, items and collected bits, score, money, lives, progress, flags, random generator, the 576 cells, the sound requests (`SOUND=1`) | clean, see below |
| `picture.ts` | the 320 x 200 picture at every frame the original shows, both phases | see below |
| `sound.ts` | the .sid's SID register writes: 13 tunes (1500 frames each), 13 effects (200 each) | identical |
| `flow.ts` | the high score ($82FD) for 400 random cases, the title's two menu texts | identical |
| `title.ts` | the title at every frame from its first pass (F7, F1, the moles' walk, the scroller wrapping, fire) | 2649 of 2649 |
| `closing.ts` | GAME OVER and the ending's closing screen, letters' own colours masked | 440 of 440 per run, rooms 20, 55, 72, 77 |
| `program.ts` | title, fire, a game, last life lost or the ending, GAME OVER, title with the high score, a second game | 715 of 715, sound requests identical, both endings |
| `frontend.ts` | the shared front end (pause map, saves, travel, grace, ENHANCED); needs no original | passes |

`lockstep.ts` plans: `rand:N:seed` (a random player), `sweep:N:seed` (one random player in each of the 80 rooms),
`kinds:N:seed` (starts next to each kind of tile, item, enemy and lift, and at each edge), `deliver:N:seed` (walks into
the delivery, ending and script rooms from every side carrying what they want), `fly:N:seed[:a-b]` (boards the plane of each room, eight ways); `ROOM=n` / `ROOMS=a-b` limit them. Last
full results: `sweep:800:2` 64000 of 64000 steps; `kinds:120:1` 1316 of 1316 runs (157920 steps); `deliver:200:2` 128 of
128 runs (34040 steps); targeted runs of the toll, frames $55-$57, room 5 and the $1B-$1D scripts, all clean. The run
lists which of the original's entry points it reached: every enemy type except 5, every item effect, all four
deliveries, the shield, the scrambled controls, states $E-$13, the lift's kill and the progress gifts.

`picture.ts` classes a frame as *same*; *torn* (the original's logic wrote to the screen while the beam was drawing
it); *a frame apart*; or *different*. `sweep:300:1`: of 47782 frames, 47752 same, 21 torn, 7 a frame apart, 2
different (rooms 39 and 67: two writes at different moments plus a counter). `kinds:40:1`: of 103682, 103517 same, 114
torn, 46 a frame apart, 5 different. `deliver:60:2`: of 20252, 20243 same, 4 torn, 5 a frame apart, none different. (It
once had 159 different, all in one run, "into room 37 carrying items 3, 19, 10 at progress $40", a difference in the panel's colour at
row 6, column 29. That run begins in room 36, standing on an item, which the original takes in its first step: progress $41, the
first part of the way out drawn on the panel, and the item's colour left in its cells. The harness starts its rebuild after those
steps, so its picture never saw them: 801 pixels of the way out, and a colour that shows on no pixel. `makePicture` now takes both
from the original. The rebuild had one real difference behind the colour: it drew a room after the step that entered it, so an item
taken at his way in was never drawn, where the original draws the room at once (`$5581`) and the step then takes the item, which
keeps its colour; the game now tells the picture when a room is entered (`onRoom`), and `frontend.ts` checks it.) Frames
of a room being drawn are not compared: the original takes about six frames filling it in row by row, the rebuild
draws at once.

## Memory map

VIC bank 0; $01 = 5 (I/O on, ROMs off, the game owns $E000-$FFFF as RAM; $FFFE = $42A3, set at $4407).

| Address | What | Status |
|---|---|---|
| $0200-$03FF, $3A00-$3BFF | Sprite images, 64 bytes each, built by $66CA (two buffers, $08+n and $E8+n, swapped every logic step) | read |
| $0400-$07E7 | Screen: play area at columns 4-35, rows 0-17 (32 x 18); HUD below. Colour RAM $D800 | proved |
| $07F8-$07FF | Sprite pointers | read |
| $0800-$0A3F | The room's 576 cells (32 x 18, row-major, no snake) as the unpacker leaves them. The physics reads this, not the screen | proved |
| $0A40-$2A3F | Sprite frames (256 x 32 bytes) | proved |
| $2640-$2A3F | Item graphics (32 types x 32 bytes; 4 characters each, interleaved 2 + 2 by $6A09) | proved |
| $2A40-$323F | Tile graphics, 8 bytes per tile name (0-255) | proved |
| $3300-$33FF | 256 random numbers; the generator at $51F7 steps through them (index $5224 += $29 with a carry into $5225) | read |
| $3400-$353F | Enemy colours per room: 4 bytes x room | read |
| $3800-$3FFF | The character set: 0 blank, 1-15 the room's tiles, 16-46 fixed, 47-62 the room's 4 items, 63 the "$77" cell; $3900+ lift pieces ($84E4) | proved |
| $4003/$4004, $09/$0A | Pointer to the current room's data | read |
| $4000-$4120 | Game variables (below) | read |
| $45AD-$469C | The world grid (16 wide x 15 rows) of room numbers, $63 = none | proved (all 80 appear once) |
| $4457-$4477, $44B3-$45AB | The title scroller: variables (counter, 8 x-words, 8 y-words) and text (a letter a byte, ends in $00) | proved |
| $4A2F-$4A52 | Monty's state handlers, one word per state 0-$13 | read |
| $4F38 | Cell lookup (x, y in pixels of the play area) | read |
| $4F8A-$5004 | Jump and fall arcs (signed dy per logic step) | read |
| $579A | Colour index to colour RAM (00 06 02 04 05 03 07 01) | proved |
| $597C | Item colours, 4 bytes a type | proved |
| $5A69/$5AB9 | Room pointer table (lo/hi), 80 entries, built at start by $5A09-$5A62 scanning for $00 bytes from $8700 | proved |
| $5C3F-$5C80 | Entity table: 5 records of 13 bytes (Monty, 4 enemies) | read |
| $6947-$694A | Items carried (type or $FF); $693B-$693E the types of the room's 4 item slots; $693F... their list addresses | read |
| $6AB1 | Item effect handlers by type (32 words) | read |
| $6D2A | HUD addresses of the 4 carried-item boxes ($0401, $0425, $04C9, $04ED) | read |
| $6D6B | Colours of characters 47-62 (4 per item slot, set by $694F from the item's type) | proved |
| $6D7B | The item list: 236 entries of 3 bytes | proved |
| $703F | Enemies of each room: 16 bytes x room (4 x 4 bytes) | read |
| $8637-$8685 | HUD labels (SCORE, MONEY, HIGH, "EFFECTS ON MUSIC ON") | read |
| $852C | Lifts: 11 entries of 4 bytes (room, height, position, flag) | read |
| $85EA | Per-room music track number (80 bytes; 0 = keep the current) | read |
| $8700-$BDC0 | The 80 rooms (and in the tail of room 76 an unused 81st, below); $BE06 room $63 | proved |
| $BF00 | Bit-reverse table, built at start (sprite mirroring) | read |
| $C000-$CBFF, $E400-$F52F | Effect driver and music driver with their data; SFX trigger $85A6 (A = sound number) | proved |
| $F52F + 4 x room | The room-name banner text | read |

## Rooms

Pointer table $5A69/$5AB9: 80 rooms from $8700, consecutive. A room is 30 header bytes, then the RLE.

- Header bytes 0-14 are the names of tiles 1-15, bytes 15-29 their attributes.
- A tile's picture is 8 bytes at $2A40 + 8 x name. The name is also a class the physics reads (below). Attribute bits
  0-2: colour index (table $579A); bits 4-5: the ECM background of the tile's cells (1 red $D022, 2 green $D023, 3 white
  $D024; 0 black $D021; set at $5650-$5664: 0, 2, 5, 1).
- RLE ($58D4-$5979): a byte is `tile << 4 | count` (count 0 = 256; tile 0 = blank), cells laid out boustrophedon (even
  rows left to right, odd rows right to left), 18 rows of 32. The unpacker stops after 576 cells (the last run may run
  past; the byte after is normally $00).
- Animated tiles: a tile named $D2-$DA gets the cell code `name - $65` ($6D-$75), kept in the cell buffer so the
  physics and the animation find them; the draw ($570D) maps the code back to the tile's number. Each logic step $5818
  then rotates or scrolls the tile's 8 bytes in the character set: $D2/$D3 rotate left, $D4/$D5 right (conveyors),
  $D6/$D7 scroll up/down (waterfalls), $D8 both ways, $D9 left and scroll, $DA left and down, $DB down and right.
- Items ($694F, from the list at $6D7B: room (bit 7 set once collected), type | (cell & 7) << 5, cell >> 3): a room
  shows the first four uncollected entries, each a 2 x 2 block of characters $2F + 4 x slot (TL, BL, TR, BR), put into
  the cells before the draw; the type's 32 bytes of graphics go to those characters.
- Colour RAM: a cell's attribute; items' from $6D6B. `src/room.ts` does all of the above.
- Exits are not in the room. The world grid ($45AD) gives the neighbours: left/right = index -/+ 1, up/down = -/+ 16.
  $4E66 checks Monty's position each logic step: x < 4 left (enters at x = $EA), x >= $EC right (x = 6), y < 4 or >= $F0
  up (y = $78), y >= $7E down (y = 6); a neighbour of 63 puts him back where he was. Room 72 (start) is grid row 13,
  column 2.
- Unused data: room 76's $00 terminator is missing, so 164 bytes after its cells are another complete room (header +
  RLE) at $BB72 that no pointer reaches (the pointer builder scans for $00, so entries 77-79 start after it). Drawn by
  the game's own $5581 it is a stepped mound with a clump on top, scrambled (its tile names point at graphics the
  finished game uses for other things). No grid entry, enemy list or code reaches it; the rebuild leaves it out
  (`ROOMS[76].extra`).
- Room $63 ($BE06) is the title's picture, drawn at start-up ($40CB).
- Lifts (11 rooms: 3, 7, 14, 16, 30, 52, 55, 59, 61, 64, 65; table $852C) are drawn into the screen and colour RAM by the
  main loop ($83EE, 3 characters wide, chars $20-$28 from $84E4), not part of the room data; $838A sets one up on
  entering, $8558 moves it.

## The main loop ($5469)

Frame-synchronised on $4030, which the raster IRQ sets. The IRQ chain (vector $42A3) splits the frame at lines 0, $63,
$7D, $95, $B2, $C7, $C9: sprites on and ECM on ($D011 = $5B, $D018 = $1E: screen $0400, charset $3800) for the play
area at line 0; the HUD part below line ~$C9 has ECM off ($D011 = $1B), a green separator ($D020 = 5, $D021 = 1 for one
line); the music runs from the IRQs.

Two phases alternate each frame ($4007 toggled), so the **logic runs at 25 Hz** (Monty walks 2 pixels a logic step):

- Phase A, drawing ($5473): lifts ($83EE); animated tiles ($5818); $66CA once per entity builds the sprite images
  (frame `$5C46 + 13k`, mirrored if the flag byte `$5C48 + 13k` bit 7 is set).
- Phase B, logic ($54AE): $5C81 puts positions into the VIC (x + $38, y + $32; 9th bits in $D010); then in order $46AD
  Monty (input $61DA, move $46BC, classify $50D5, edge/exits $4E66, tiles $5005, $5312 the "$77" burn), $758F (the flight,
  below), $5ED0 enemies, $6A65 item pickup, $5D00 enemy collisions, $8558 lifts, $7682 (room events: the
  deliveries and scripts). Then the room-music check ($405D changes), lives and death ($5510-$5578).
- Input ($61DA): joystick port 1 or 2 ($DC01/$DC00, mapped through the table at $6283), else a scan of the keyboard
  matrix, as a direction/fire mask in bits 0-4 (1 up, 2 down, 4 left, 8 right, 16 fire); $403E remembers the direction
  a jump started with. SPACE is fire ((PA7, PB4), $6267); F1 and F7 are the title's menu keys ($6319 with $21, $24; a
  table of masks at $62A3/$62DE); RUN/STOP + left shift ($25, $28 together, $551A) leaves a game for the title. The
  movement keys were never read (the rebuild maps its own keys to the stick).
- Entering a room ($5581): $85CD (music), special cases for rooms $4D, $16, $2C, $3E, $0B (deliveries), tile graphics,
  $5E03 the room's enemies into the entity table, $65A3 the name banner, $838A the lift, $57A2 clears the play area,
  header to $400B, $58D4 unpacks, $694F items, $570D draws.

## Variables

| Address | Meaning |
|---|---|
| $402B | Room number. $4003/4: pointer to its data. $400B-$4028: its header |
| $5C3F, $5C40 | Monty's x (0-255, left edge of the play area), y (0 = top) in pixels. Entity record = 13 bytes from $5C3F + 13k (k = 0 Monty, 1-4 enemies) |
| $5C41 | Monty's sprite colour (1 white) |
| $5C46 / +7 | Sprite frame; $5C48 / +9 flags (bit 7 = faces left) or the enemy's signed speed |
| $5C4C.. | Enemy k: +0 x, +1 y, +2 colour, +7 frame, +8 type (1-17; 0 = none), +9 speed (signed), +10 counter, +11 control (bits 6-7 mode: frame animation; low 6 bits reload), +12 base frame |
| $4F87 | Monty's state. $4F88 the step within it (jump arc index, fall count). $4F86 a direction/blocked mask |
| $4040/$4041 | x, y at which he entered the room (where he restarts after a death); $4043/44 his state/step then |
| $4045/$4046 | His previous x, y (to undo a blocked step) |
| $4061 | Lives in the low 7 bits (bit 7 set while playing: starts $86 = 6; $7F means game over); drawn as 1-6 faces by $8322 |
| $404A-$404E | Score, 5 decimal digits, least significant first; added by $81FA (A = amount, 0-255); printed at row 23, column 6 |
| $4051-$4055 | Money, same, $820A; row 24 |
| $4067-$406B | High score; $4059/5A scratch |
| $405D | Progress: counts jobs done (items delivered, tickets); at $41/$82/$C3 the "LEAVE GIBRALTAR" bar grows and lives +1 (max 12) |
| $405E | Shield flag set by one item type ($6B22 copies $0143); $5D61 skips enemy hits while it is set |
| $4062 | Count of one pickup (type $1C, $5DDA) that stops a door/enemy |
| $4066 | The title's sound choice (F1 / F7) |
| $4064 | Current music track |
| $6947-$694A | The four carried items (type, $FF empty) |
| $6D7B+ | Item list; bit 7 of a room byte = collected ($5B8B clears them all at a new game) |

## Monty (`src/monty.ts`, `world.ts`, `tiles.ts`, `input.ts`, `rng.ts`, `game.ts`)

The logic step ($46AD): save x, y ($4045/6); read input; state 0 walks, else the state's handler ($4A2F); then the
sprite frame ($50D5), the animated-tile death check ($5005), the burn countdown ($5312), the room exits ($4E66). The
main loop then takes a life if a death finished ($4048) and puts him back at his entry place. The input table $6283
equals `decodeStick` for all 32 joystick values.

**Which byte of a tile means what** (name = header byte; the lookup $4F38 gives name 0 for cells >= $10 (items,
animated $6D-$75, burning $77), whose code is read separately, and for names $B0-$B3):

| Probe | Names |
|---|---|
| Under the feet ($47BE: x+4, x+10, y+16) picks a state | 1-5 Slip(9); 6-$F Spring(3) (only when he jumps); $10-$15 Slow(A); $16-$17 Stuck(B); $18-$1B Tube(C); $1C-$1E Kick(D); $70 Burn(6); >= $DC Dying(7); anything else in $1F-$DB nothing |
| Feet probe ($48A8) | any non-empty name is ground; none = Fall(8) |
| Side probe ($494F, x+12 going right, x+4 left, 2-3 rows) | $64-$68 Bounce(2); $69-$6E Zap(4); $6F Fire(5); $70 Burn(6); $71-$B3 plain wall; a cell with code $77 (burning) also blocks; blocked = move undone |
| Head probe ($4902: x+4, x+10 at y) | $64-$B3 ceiling; class Tube at the head puts him in Tube and ends the step |
| One-way floors ($49D8, via $499A) | $B4-$D1: up climbs through, down drops through ($4F86 bits: 4 head, 1 feet, 2 below) |
| Deadly ($5005, corners (x,y) (x,y+15) (x+15,y+15) (x+15,y)) | cell codes $6D-$76 (animated tiles) = Dying; $77 stops the check |

**States**: 0 Free (walk 2 px/step, no acceleration; fire = jump, up/down through one-way floors); 1 Jump (24-step arc
at arcs[$2B] from $4FB5: -4 -4 -4 -3 -2 -2 -2 -1 -1 -1 0 0 0 0 1 1 1 2 2 2 3 4 4 4, x steered by the start direction,
ceilings mirror the arc, lands on the first ground with dy >= 0, y snapped (y+5)&~7); 2 Bounce (names $64-$68: a jump
with the direction flipped); 3 Spring (arcs from index 0, higher arcs while the next entry is negative; 123 steps); 4
Zap (23 steps then a death); 5 Fire (a death after 41 steps, unless the first step finds the $6F tile no longer at his
side; it then clears the $6F tiles of column 0 near the row it ended on: the original's X register is 0 there); 6 Burn
(tile $70 under him becomes cell $77 for 20 steps, the burnt picture decays using 16 random numbers a step, then the
cells go empty); 7 Dying (14 steps); 8 Fall (3 px/step); 9 Slip (names 1-5: 11 in 256 per step, thrown sideways 24
steps); A Slow (moves every other step); B Stuck (10 in 256, 32 steps); C Tube (carried up, left/right steer, fire lets
go); D Kick (25 in 256, thrown into a jump); $E Knocked (an enemy hit); $F and $10 the $1B/$1C scripts' push and slide;
$11 the walk-in (the title's moles and a new game); $12 the forced walk of the toll; $13 the ending's walk (two figures
come beside him; after 256 steps the ending flag is set).

Oddities kept: the up+down test at $46E6 can never be true (only left+right together stand still); in Slip the left
move is decided by the cell code the right move last looked at; the spring reads one entry past the arc table (the $AD
at $5005). Deaths: Dying/Zap/Fire/Knocked set $4048 at their end; $4061 goes down one, bit 7 clear = game over.
Walk cycle 0,1,2,1 on every second moving step; the per-state frames are in `updateFrame`.

## Enemies, lifts, items, scripts (`src/enemies.ts`, `lifts.ts`, `items.ts`, `digits.ts`, `game.ts`)

Order of the logic step: the lift twice (the main loop draws in both phases), Monty, the flight, enemies, pickup,
enemies touching him, the lift's kill, the room scripts, the progress bar, then the lives.

**Enemies** ($5E03 loads, $5ED0 moves). The table gives per room 4 x 4 bytes: x high nibble / y low nibble x 8; type
(low nibble), speed (bits 4-6, sign bit 7); control; base frame. A record with frame $DF is empty. The counter starts as
the control's low 6 bits for types 0-2, nothing for 3-4 and 10, $1E for 5-9, the whole control byte for 11. Types: 1
patrol in x, 2 in y (both turn when the counter runs out and reload it from control & $3F); 3 patrol in x with a
vertical wobble (table $5FBB; turns when the counter equals the whole control byte); 4 in y with an x wobble on a
16-step beat; 5 walks then plays a sequence (no room has one); 6 walks, plays a sequence, walks back 30 steps and
vanishes; 7 a shooter (walks, plays a sequence, then makes its next record a type-11 falling projectile at x $28 or $C8
by a random bit); 8 a thrower (walks, plays a sequence, then by a random bit plays another or makes the next record a
type-12 missile flying until x passes $F0); 9 nothing; 10 plays a frame sequence (16 of them, $617E: $FE loops, $DF
hides) every second step. Animation by control bits 6-7: none, the two-frame flip ($5ECC), or the walk cycle 1 2 1 0
($5ECB). Random numbers: only the shooter, the thrower and the lift's rest. A shooter or thrower in the last slot would
write into the code after the table: no room has one.

**Touching him** ($5D00): |dx|, |dy| both under 12, by the enemy's frame: $DF/$D0/$D1 harmless and the whole check ends
(the first enemy decides), $80 sets $5DF6, $58/$59 in room 5 with item $0A in his hands gives item $13 and 6700 money,
$55-$57 with item $13 paid 600 and the check ends, $1C is the toll (item 3: 5500 money, else the forced walk, state $12,
until he has paid once), anything else hurts: nothing while the shield is up, states 8, 1, 3 and $C become Dying, 7
and $E stay, others become Knocked with the step cleared. The lift's kill ($8558 into $5D67) is the same without the
shield test.

**Lifts** ($838A, $83EE, $8558). Not in the cells (only drawn into the screen); a lift does not carry him. It grows one
character per step, rests at the top by a count, sinks, then rests a random 1-128 frames and kills him if he is within
30 pixels across and 12 down of its growing end, only while it grows. State: $8385 (bit 7: sinking), $8386 (frames to
the next move). Its tick runs twice per logic step.

**Items** ($694F places, $6A65 picks up). Touching the top-left cell at (x+3, y+2) does the type's effect: types 0 3 4 5 7
10 11 12 18 19 22 are carried (the first empty of 4 hands; with all four full the item stays); 1 shield ($85, from the
byte at $0143; score $4B); 2 points (score $23, money $32, progress+1); 6 26 28-31 score 4 x type + progress; 14 20
23-25 money 8 x type + progress; 13 17 27 a life (no limit); 15 the third enemy's picture becomes $A3; 8 progress,
score $BF and the walk-in state $11; 9 a random 1-31 and six helpings of $AD score; 16 a random 1-15 and four of $67; 21
score $B1 and progress (in room 2 only death). The two random bonuses also set $405B to the number and $405C to
$FF/$AA: for that many steps the controls are scrambled by the number (XORed into the input byte). Score and money are 5
decimal digits ($81FA/$820A add 0-255; the last digit is never reduced).

**Deliveries** at room entry ($5581): rooms $16 (item $0B, money 18), $2C ($0C, 4 x 250), $3E (7, 3 x 250), $0B (4, 3 x
100) each take the item, add 1 to progress and pay. Progress $41, $82 and $C3 give a life (up to 12). Entering room $4D
with progress $C3 puts him at (144, 64) in state $13: the ending. **Room scripts** ($7682): room $1B, touching the
frame-$80 enemy: state $F (pushed), the enemy gone, he takes its place; item 5 in his hands counts in $4060; room $1C:
with x >= $80, state $F and $4060 = 0 he slides (state $10: down to y $70, 24 steps, then room $1B with the death flag:
a life lost); room $1D lands him at (24, 32).

Oddities kept: the first enemy that touches him ends the check when it shows a harmless frame; the lift kills through
the shield; a shield from item 1 is never switched off; lives from items 13/17/27 have no limit; the toll is waived for
good after one payment; state $10 costs a life; the third enemy's picture is set by item 15 whatever it was doing.

## The picture (`src/picture.ts`, `screen.ts`, `panel.ts`)

The rebuild makes the frame the way c64kit's model captures the original's: a `FrameCapture` (25 text rows with the
registers they were fetched with, the sprites as the VIC starts them by raster line), so `C64View` draws it in the
browser and `renderPixels` in the checks, the same code both sides.

- The play IRQ ($6339, seven stages, vector set by $64CD): at lines 0, $63, $7D, $95 the side columns' sprites 6 and 7
  are put further down with other colours and pictures (eagles, pot, pillar), at $B2 every sprite is switched off, at
  $C9 the character set register and extended colour change for the panel. A stage writes its registers in the line
  after its own (entry and dispatch take about 70 cycles), so a capture sees them two lines below: that decides the one
  sprite that restarts at line 151 and the green band (row 19) keeping its extended colour.
- Sprites: Monty is sprites 0 (white, $D027 = 15) and 1 (black, one pixel right and down, the same picture); the
  enemies are 2-5. Entity k's picture is at buffer + 64 k; frames are drawn facing left and mirrored when the speed byte
  (+9) or Monty's flag has bit 7 clear. $5C81 sets X = x + $38, Y = y + $32 in phase B before the logic; $D010 bit 7 is
  always set; $D015 comes from $4049, which a room entry sets to $C0 and $5C81 to $FF, so the entities are missing for
  two frames after a room is drawn. The two buffers swap each logic step: pictures built in phase A are shown from phase
  B of the next, so both frames of a step show the records of the step before.
- The lift is drawn only when it moves ($8386 reaches 0): the 3 x (height/2) block at its hook cleared and coloured 1,
  3, 6, then body rows ($20-$22) and an end ($23-$25, or $26-$28 for an odd length). What the room had under it stays
  cleared until the room is drawn again.
- A changed cell is put on the screen as $5297 does (burning $77 becomes character $3F with the colour kept, gone becomes
  0 with colour 0, a taken item 0 with its colour kept); an item taken has its 2 x 2 characters cleared from the cell of
  Monty's probe ($6CEF).
- The panel: text is ASCII + $60 as screen codes ($651F); banner row 20 = the chain ($863A, green), the place at column
  4, the country ending at column 35; SCORE:, MONEY:, HIGH; score and money at column 6 of rows 23 and 24 (white,
  yellow), the high score at column 34 of row 24; five digits, leading zeros blank, printed only when they change; the
  lives as up to six faces ($F0-$F7, three left, three right; with 7 or more the extra ones come first, in the second
  face, $F8); the way-out picture in three parts at progress $41, $82, $C3 (bottom first, $6618); the four carried-item
  boxes at (1,0), (37,0), (1,5), (37,5), characters $10 + 4 box, drawn when an item is taken or given and emptied when
  handed over.

## Sound (`src/sound.ts`, `soundlog.ts`, `tools/extract-awm-sid.mjs`)

Two small drivers run once a frame from the tail of the play IRQ ($64C2: `JSR $E40F`, `JSR $C7F2`; the title's IRQ ends
there too).

- The music driver ($E400-$EA4F code, tunes to about $F500): $E409 starts tune A (0-12), $E40C stops it, $E40F is the 50 Hz
  tick. A tune ending in $FE stops itself (the jingles); $FF loops it (tune 0, the main theme, loops for ever).
- The effect driver ($C000-$CBFF): voice slots $C7E0-$C7E2 (a sound number, $FF idle), $C7E3 cuts the effect on voice A,
  $C7F2 is the tick, and it only plays while the music is stopped ($EA49 bit 7 set). $85A6 (A = a sound number $40-$4C)
  puts the number into the slot of its voice (table $85BD) and does nothing unless the sound flag $4066 is set; $48 also
  starts $49 on voice 1. (The driver patches its own code: calling $C7E3 with a junk A writes $FF into the middle of
  it; the checks call it with 0, 1, 2 as the game does.)
- $4066 is the title's choice, set by F1 (key $21, clears it: " MUSIC ON ") and F7 (key $24, sets it: "EFFECTS ON"). With
  it clear the title's tune (tune 0) starts at a new game and when Monty has finished walking in ($4B0A), and nothing
  else is asked for a room; with it set each room starts its tune ($85CD, table $85EA, 0 = go on, same tune = leave
  it) and the effects are asked for.

The .sid is built, not committed: `tools/extract-awm-sid.mjs games/awm/build/play.ram` copies the two drivers and their
data from the RAM dump and adds 80 bytes of glue at $CC00: init (A = song - 1: songs 1-13 are tunes 0-12 through $E409,
song 14 is the game with its effects), play ($E40F, $C7F2), `sfx` ($CC21: $85A6 without its flag test).

What the game asks, and when (`soundlog.ts`, compared with the original's calls at every lockstep step): effect $42
dying and the slide of room $1C, $43 a bounce and the spring landing, $45 a zap, $46 points and a carried item, $47
knocked and fire, $48 the push in room $1B, $4A a delivery, a bonus, the lucky item and a life, $4B a slip; tune 6 for the
walk-in item, tune 0 when the walk-in is over, the room's tune on entering it; voices 0 and 1 cut at the end of the push
scenes; the flight's: $48 once at the start of a hit, and voices 0 and 1 cut every frame that is no hit (with the effects chosen). Not asked for: $40, $41, $44, $49, $4C.

## The flight ($758F; `src/flight.ts`, `Game.boarding` / `land`, `Program.flightFrame`)

What the first notes called the shop is a **flight**: air travel between the airports, in a dogfight screen of its own. All of it
is *proved* by the checks at the end of this section.

**Boarding** ($758F, every logic step after Monty's). In order: Monty is within 12 pixels (x and y) of an enemy record showing
frame $D0 or $D1 ($7637; the two records side by side are a plane, type 0, scenery: $5D00 skips them); his state is not 7
(dying), $E (knocked) or $11 (the walk-in); the Commodore key is down (CIA1 port B bit 5 low, port A bit 7: `$6319` with A = $26;
the original has no text for it); a ticket (an item of type 0, 20 of them in the game) is in his hands, and is taken ($6CB9) *before* the
table is looked at: the table at $753F (a byte a room, $FF none) gives the room he flies to, so a plane in room $16 or $39,
which have none, takes the ticket for nothing. The table: 0 and 1 to each other, 5 > $28 > $11 > $A > $13 > 5, $D > $E > $31 >
$3D > $4B > $1A > $39, $14 > $D, $40 > 1. Then the banner is printed for room $4F (IN / FLIGHT: `$65A3`), and `$77E3` sets the
screen up: interrupts off, the item boxes' colour RAM saved ($80B8), the sky's map copied from $DD00 to the screen at $C000
(720 bytes, over code of an older driver nothing calls), colour RAM $09 for the 18 rows, the sprite registers, $7862 = $3C,
the clock $80A0/$80A1 = $08CA, and the IRQ vector at $77FC; then it waits for $809F.

**The screen** (a bank-3 text screen of its own: multicolour characters, 38 columns, `$D018 = $04`: screen $C000, characters $D000,
sprite pictures $D800 on, pointer $60 = his plane). Seven IRQ stages a frame, like the play chain's (`screen.ts`), at lines 0, $20,
$6A, $90, $96, $B4, $C1:

| Stage | Line | Does |
|---|---|---|
| 0 $7865 | 0 | colours ($D020/$D021 $0E, $D022 $0F, $D023 $0C), bank 3, mode, `$D016 = $10 or $3A` (scroll of the top band); the clouds: sprites 0 and 1 move 1 pixel, 6 and 7 two frames in three (counter $785D), x mod 504; the first places of sprites 0, 1, 6, 7 (y $46, $46, $4E, $32), the other plane (4, 5), his (2, 3); every fourth frame the planes' pictures (the other's by how his leans, or its explosion's) and his lean 0, 1, 2, 1 |
| 1 $7A02 | $20 | $3A steps 2 (6, 4, 2, 0); at 4 rows 0-6 shift a character left (the first round to the end) |
| 2 $7D50 | $6A | `$D016 = $10 or $3B`; the second pair of clouds (sprites 0, 1 two pixels a frame, 6, 7 as above) and their lower places (y $A0, $A0, $7F, $8C) |
| 3 $7D46 | $90 | `$D016 = $10` |
| 4 $7B1F | $96 | $3B steps 3, +8 and rows 7-11 shift when it goes negative |
| 5 $7C3A | $B4 | rows 12-18 shift a character every frame (8 pixels) |
| 6 $7E25 | $C1 | bank 0, `$D018 = $1F`, colours black, `$D016 = 8`; his controls, the other plane's path, the planes touching, the clock, the music ($E40F, $C7F2) |

The first IRQ of a flight is stage 0 alone: the set-up (`$8075`) writes $D012 = 0 after the IRQ it enabled has already run stage 0,
so the next frame begins with stage 1. That frame is the first with the sky in its bands; stage 0 alone makes the one before it, a frame of
sky and the leftovers of RAM, which the rebuild skips (as it skips the two frames of set-up). The picture of a frame: rows 0-17 from the
sky with the scroll of their band (row 7 is still the top band's: the IRQ writes `$D016` after the VIC has the row), row 18 on from the
play screen with the panel's mode, the border black from line $C2 (a cycle of timing in the original makes it $C3 in a third of the
frames: one picture line of the 38-column border, counted apart by the check).

**The game** (stage 6, with his controls from `$61DA`: the bonus scrambles them, and each look counts it down). His plane
($809C, $809D): right 3, left 2, up 2, down 2, left 1 more when neither left nor right, x 8 to $7F and y 8 to $76. The other
plane ($7860, $7861) flies one of four paths ($7709: a start in a corner, then legs of kind 1 (x and y by the speed), 2 (x), 3
(x, and y the other way) and 4 (y), a speed (signed) and a count; a kind of 0 ends the path and the next frame starts another, picked by
the random number, with its life $14 again). Touching, as the game measures it (a byte's difference taken as signed, then without its
sign): his nose ($809C + $1E) within 4 of its x and his y within 12 of its y is *his* hit (the effect $48 once, $4065 saying so;
$7863 down: at 0 it explodes: pictures $70 and $72 for four frames each, then a new path; 100 points, printed); its nose (its x + $1E) within 4 of
his x with the same y is *its* hit ($7862 down from $3C: at 0 he is shot down, $7864 and $809F). In no hit the voices 0 and 1 are cut
(`$C7E3`, every frame) when the effects are the sound chosen. While it explodes nothing touches. The clock ends the flight when $80A1 counts
down, 1995 frames.

**Coming down** (`$75D3` on, in the main loop after stage 6 set $809F): the boxes' colours back ($81BA), bank 0, sprites' priority and
expansion cleared, the play IRQ put back on line 0 ($64CD, the vectors and `$651E`), then if $7864 `$4048 = 1` (a death like any
other, at the end of the step), else `$402B = $402C`; `$5B1F` and `$5581` (the room drawn: about six frames); then Monty is put at the first
enemy record showing $D0 (`$5C3F/40` and his entry place `$4040/41`: a death in either room starts him at the plane). The rest of the step
goes on in the room he is in. `$4033` (his controls) keeps the last the flight read. A crash is not a death the safe start spares.

**What stays in the machine** between flights (nothing sets it when a flight begins; `SkyState`, kept by the game,
carried to the next game, kept by a save at format 2): the clouds' x ($784D-$785C) and their counters ($785D, $785E, $785F), $3B, the
two planes' places ($7860/1, $809C/D: the next flight starts his plane where the last left it), the lean $809E, the explosion $4063 and
the hit's sound $4065 (a new game clears those two, $5B39), the pointers $C3FA-$C3FD (his plane's, for the first four frames, are what
the last flight left: zero in a fresh machine, which shows a sprite made of the screen's bytes). `$3A`, the lives, the clock and the
path are set each time.

**Checks.** `test/flight.ts` flies the rebuild beside the original (the game boards at the same step: `Game`, `Picture.takeOff`, the
panel as `makePicture` has it) with the same stick each frame, and compares the 320 x 200 picture, the clouds, scrolls, planes, path,
life, clock, pointers, the 720 characters of the sky and the sound requests: idle (a whole flight, the clock to its end) 1995 of 1995 frames; random sticks with the effects chosen 900 of 900; steering to shoot the other plane down 600 of 600 (six planes) in room 5; being shot down after 348 and after 479 frames; three flights in a row from what each left in the machine 839 of 839: every frame the same picture but, in about a third of them, one line of the border (the narrower screen's 7 and 9 pixels, picture line 146) black in one and the sky's colour in the other, by a cycle of the interrupt's timing. `lockstep.ts fly:N:seed[:a-b]` boards the
plane of each room (with a ticket, holding the stick four ways, steering to shoot the other plane down or to be shot down, without a
ticket, with others as well) and plays on: `fly:20:1` over all 17 rooms with a plane: 136 of 136 runs, 3128 steps, 91 boardings and landings, 315 planes shot down, 13 crashes, the score, lives, rooms, Monty's place and entry, hands, the random generator, the sound requests (also with `SOUND=1`) and the machine's memory the same at every step. (Rooms $E and $11 have their plane in the air: Monty falls from it before the key is down, so no run boards there; $16 and $39 have no place to fly to, and take the ticket for nothing.)

## The title, GAME OVER and the flow (`src/title.ts`, `scroller.ts`, `closing.ts`, `program.ts`, `flow.ts`)

**The title** ($406E on; data `src/data/title-data.ts` from `re/title-data.ts`). $406E sets the title tune, the font
pointers of the bank 3 screen ($DFF8-$DFFF = $E2), restarts the scroller's text and sets the IRQ chain ($43FA, vector
$42A3); $5C1D clears the screen, $5581 draws room $63 (the temple with two pillars), and $4114 makes the four columns at
each side from its edge columns, mirrored. The menu is ten cells on row 14 from column 15 (characters $2F-$38, colour
RAM 1 turned on each phase A: a colour a frame cycling through all 16, black included). The loop at $418D has two
phases a frame as in play. A: the menu's colours, $5C81, $5818, F1 sets $4066 = 0, F7 sets it to 1; while the first
mole's state is 1 a wait counts down (3 + 3 x 256 passes of A, about 31 seconds), then state $11 and both moles'
pictures go into the buffer. B: buffer swap, $5C81 and, once the wait is over, Monty's own routine $46AD with state $11
(the walk-in: right, back left, stand, over and over; the same `walkInStep` as the game's), the second mole made from the
first (x = $EF - x, mirrored). Fire (the joystick's button on either port, or SPACE) starts a game ($428C on).

The title's IRQ chain, four stages a frame: line 0 ($42F1) sprites on, hires, unexpanded, bank 0, ECM text; $68 ($4319)
all eight sprites colour 1, the scroller steps ($4335-$43A5) and $4478 sets the eight sprites' registers; $C0 ($43AD)
`$D011` = $7B, bank 3, `$D018` = $70, sprites multicolour and expanded, colour $0F with $D025 = $0B, $D026 = 1; $F8
($43ED) the border opened and the music and effect drivers. The scroller is eight big sprites 50 pixels apart moving
left two a frame (x words at $4458, y at $4468: $E7, $D9, $D1, $CF, $D1, $D9, $E7, $FF), each y moving by twice a step of
the 24-step wave at $4FB5, a sprite that leaves at the left coming back at $190 with the next letter of the text at
$44B3 ($4457 a counter 0-23, $45AC the text index). The text: "AUF WIEDERSEHEN MONTY", the authors' names, "F7 EFFECTS
ON", "F1 MUSIC ON", "IF YOU WISH TO CHEAT THEN GET HACKING".

The lower part of the title's picture is black: the stage at $C0 writes `$D011` = $7B, ECM (bit 6) and bitmap mode (bit 5)
together, one of the VIC-II's invalid modes, which draws only black (the graphics data is still fetched, sprites still
show over it). The game uses the mode to blank the memory at $C000-$DF3F (sprite fonts and sound data) under the
scroller. c64kit's `decodePicture` draws an ECM + bitmap row black. The big letters' pictures are at $F880-$FFBF (sprite
pointer = character + $A4; GAME OVER uses the same).

The original takes 7 frames from $406E to the loop's first pass, drawing the room as it goes, and the interrupt chain
steps the scroller in each; the rebuild steps it `SETUP_FRAMES` = 5 times (6 after a game, because the play chain is
running) and does not compare the first frame, which runs late in its frame.

**GAME OVER and the ending** are one routine. The main loop leaves play at $5510 for $5568 on the ending's flag $402A
(the 256th step of state $13) or the last life lost ($555D). $4029 = $FF (the sprites' multicolour mask), then $3540
shows "GAME" and then "OVER" over the frozen picture of the room, each four expanded multicolour sprites (images at
$FAC0, $F940, $FC40, $FA40, then $FCC0, $FE80, $FD80, $FA40; x $5A, $8C, $BE, $F0, y $64) whose four colour registers
are stepped up and down by a busy loop of about 29 cycles an iteration for about four seconds a word, so the colours
change about twice a raster line: stripes along each letter. $82FD makes the score the high score if it is higher
(printed by $82C3); then $5422 sets up the title again. The picture is frozen (no tile animation, no lift) with the play
IRQ chain still running. A word lasts 131072 iterations of the loop, about 594 a frame, so 221 frames a word with the
title's music, up to 225 with the effects on (the music driver takes more cycles). The rebuild uses 221, cuts each
letter into its 21 rows and gives each row the colour the register would hold at its line; the original's stripe phase
follows the music driver's cycles, so the check masks the four colours and compares everything else, and skips the five
frames round the word change.

**The flow** (`Program.frame(controls)` once a frame, `test/program.ts`): title, fire, a new game in room $48 (6 lives,
Monty at (128, 104)), last life lost or the ending's flag, GAME OVER, $82FD, the title. What the original carries
between the parts, and the rebuild with it: the main loop's toggle ($4007) and the sprite buffers' state ($6701, $5C80;
$5B39 clears the beat $4037 and both buffers), the first mole's last picture ($5C46, $5C48), the random numbers
($5224/5: the first game starts at $DF, 4), the enemies' animation clock ($5ECA-$5ECF), the walk counters
($51DA-$51DE), the sound choice ($4066) and the scroller's positions. The first two passes of the main loop run back to
back in the frame the room is finished in, so the rebuild's start of a game runs two. RUN/STOP + left shift (back to
the title at any time) is not part of the rebuild; the front end has its own back to the title.

## Not built, and open

- Enemy type 5 (no room holds one): read, not run.
- Saves keep no `slotColours` (the colours the item boxes were drawn in).
- The original's room drawing (about six frames) is not modelled; nor are the frames either end of a flight (the set-up's two, the frame of stage 0 alone, and the one the play interrupts come back in).

## How the notes were made

- Coverage: `nice -n 15 node tools/test.mjs games/awm/re/coverage.ts games/awm/build/play.state games/awm/build/cov.bin 600`, then
  `node tools/re/disasm.mjs games/awm/build/play.ram labels.json --cov cov.bin --from 4000 --to ffff` (labels.json:
  `{"entry":[],"labels":{}}`).
- Variables: `re/trace.ts` (a joystick script, prints Monty's variables when they change); `re/watch.ts` (which instruction
  wrote an address).
- Data: `re/rooms.ts` writes `src/data/awm-data.ts` from the snapshot and says which rooms are not plain RLE + $00.
- After calling $5581 the model needs about 40 frames to catch up or the capture is empty (the checks run 40).
- The title and closing screen: `re/title-data.ts` writes `src/data/title-data.ts` from `build/title.ram` (the RAM when
  $406E is first reached); `re/title-cap.ts` prints what the original's VIC captures per frame (pokes `4048=1,4061=80`
  for game over, `402a=1` for the ending); `re/closing-probe.ts` counts the busy loop's iterations a frame;
  `re/start-probe.ts` holds fire and prints the variables; `re/title-dump.ts` prints the rebuild's captures the same way.
