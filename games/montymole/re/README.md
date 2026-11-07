# Wanted: Monty Mole: what the original does, and where

Notes on the 1984 ZX Spectrum 48K game's code and data, read from the running original on our headless Spectrum
(`tools/zx`; `build/README.md` says where the tape comes from and how to make the images, the states and the dumps). No
disassembly of the game has been published; the labels and variable names below are ours, and every address is in the
64K the tape loads (`$4000-$FFFF`, started at `$D290`). The 48K ROM is used by the game for the loader, for its beeper routine
(`BEEPER`, `$03B5`) and for nothing else: the game has its own font and its own screen routines.

**Confidence.** *Proved* means a check compares our reading with the original running (`test/*.ts`). *Read* means the code was
followed and the address and purpose are known, but no check covers it yet (the planned check is named). *Guess* is said
where it is one. *Not understood* is said where it is.

**What the game is.** Peter Harrap's first Spectrum game for Gremlin Graphics, and Gremlin's first game (credits and sources:
`credits.md`). Monty Mole crosses **21 rooms** of a South Yorkshire coal mine and then "Arthur's castle", collecting coal
(score) and objects, with **3 lives**, no extra lives, no timer and no energy. Rooms are single screens joined at their
edges (the world is one long path, below); everything that moves is a 16 x 16 sprite drawn over a background kept in memory;
what kills him is touching a moving thing, touching a "deadly" colour, a crusher, or falling four character rows. The one
protection is an object (the miner's tool, club, scissors and the other things the inlay and the fan map name: one mechanism, a carried tool) that lets him
survive one touch. The game ends when the last life is lost (a verse and a key) or when he leaves the last room by its right
edge (another verse, then the key).

## Checks

Run `nice -n 15 node tools/test.mjs <file> ...`. They compare our model and our reading with the original; all are listed in
`tools/tests.mjs` with `needs` for the gitignored originals.

| Check | Compares | Result |
|---|---|---|
| `test/boot.ts` | the tape loads through the ROM's loader (five calls), the title picture is the game block's first 6912 bytes, the game starts at `$D290`, the options menu text, key 1 then key 0 start a game in pseudo-room `$2C` (3 lives, score 0, Monty at x `$D8`, y `$4F`), and in room 0 the interrupt routine runs every frame and the main loop every second frame (25 passes a second) | passes |
| `test/rooms.ts` | all **21 rooms** drawn by the game's own routines (`$94C3` copies a record to `$C42A`, `$FDD5` draws it) against a picture made from the data alone (`src/room.ts` over `src/data/rooms-data.ts`): the room's 20 pixel-row groups of the picture buffer (`$D260`) and its attribute buffer (`$CF54`), byte for byte; the committed data against what `re/rooms-parse.ts` takes from the tape; the 512 bytes the game copies against the tape's record (play changes only enemy state bytes) | 43 of 43, 21 of 21 rooms identical |
| `test/data.ts` | the committed data (`src/data/`, made by `re/extract.ts`) against the tape (sprites, Monty's frames, title picture, font, jump arc, coal flags, both tunes, the texts re-encoded, the row table as a formula, the effects' operands) and against the original in memory (loading, title, play, room 0); the title picture is the screen at the title; the options menu, score and lives lines drawn from the font are the original's screen; every glyph is what `$80D1` and `$CB35` draw, and the original prints the texts' glyphs in order (menu, game over, ending); every sprite frame and Monty's 16 through `$EBE0` at 8 shifts, the edges and `$8452` against `src/sprite.ts`; `src/beeper.ts` against the model's speaker log; the title tune is played in the table's order | 38 of 38 |
| `test/mechanics.ts` | the rules tried on the original by poking (room, Monty's place, lives) and running with its own interrupt: **all 64 coal pieces** score the low 7 bits of their flag byte (`$964D + id`) and clear its bit 7; a death takes one life; the last life goes to game over (`$F817`); ten edges lead to the room the exit table says (7 right, 8 left, 2/4/11/19 up, 6 down, 16 right, 18 left) and room 20's right edge to the ending (`$F858`); room 16 below y `$41` runs the scene that puts Monty in room 17 at x `$C0`, y `$A1` | 15 of 15 |
| `re/poke.ts` | not a check: a probe to try things on the original (poke, jump to an address, hold keys, watch bytes, count visits, picture, save a state); the facts below marked "(probe)" were found with it | |

Planned, in `HANDOFF`-style order, under "Plan" at the end.

## How it runs

### Loading (proved: boot.ts)

BASIC line 10 (`CLEAR 24575`, `PAPER 3 : BORDER 3 : INK 3`... then `POKE 23659,0`, `LOAD "" CODE`, `RANDOMIZE USR 60000`); the 100-byte
loader at `$EA60` decrypts its own tail with the R register (`LD R,A` with `$83`, then `XOR (HL)` with R over 255 bytes), refuses to
go on if `$5C6B` (DF_SZ, which the BASIC line has just set to 0) is not 0, and calls the ROM loader for 49152 bytes at `$4000`. Then it
`RET`s to `$D290`, an address the loaded block has placed at `$5FE8`, where the stack is. Nothing in the block is encrypted.

### The title (read; `test/title.ts` is planned)

`$D290` is thirteen `NOP`s then the title: the picture is simply the screen as loaded (`MONTY MOLE`, a miner Monty with a bucket, a picket
and a Gremlin "GREMLIN GRAPHICS", `P.M.HARRAP`), and a tune plays while it waits for any key: `$D29D` walks a table at `$D5B9` of
4-byte records (duration, pitch) and calls the ROM's `BEEPER` (`$03B5`) with them, resting where the pitch is 0, until the byte after a record is
`$FF`; a key press between two notes ends it (`IN A,($FE)` at `$D2C5`). The tune is **273 records, 56 of them rests, 217 notes** (proved: the table ends at the first record whose second byte is `$FF`, `$D9FD`; the first reading, 201 notes to `$D8DD`, stopped early), a slow Colonel Bogey in D (read:
decoded with the ROM's own pitch formula, `437500 / (pitch + 30.125)` Hz). Then the screen is cleared, `$F7D6` is pushed as the return address and
`JP $D254` (the screen copy) leads to the options. After a game over, or the ending, a key brings the game back to `$F7D6`, not to the tune.

### The options menu (proved text, read code: boot.ts)

`$8000`: **1 KEYBOARD** (magenta), **2 KEMPSTON** (green), **3 SINCLAIR** (cyan), **0 PLAY GAME** (yellow) under a red "OPTIONS"; the game's
own letters: `$813B`, 8 bytes a glyph, glyph 0 a space, 1-26 A-Z, 27-36 the digits 0-9, `$11` an apostrophe (so "AREN'T" is `A R E N $11 T`),
`$1E` etc. The menu waits at `$800E`: key 0 returns (play), keys 1 2 3 set the control (`$82A3` = 1, 2, 3; the selected line flashes).
The control is read by `$82A6` into the **input byte `$832E`**: bits 0-2 the direction (0 up, 1 down, 2 left, 3 right, 4 none), bit 7 jump.
Keyboard: Q `$FBFE` bit 0, A `$FDFE` bit 0, O `$DFFE` bit 1, P `$DFFE` bit 0, and any key of the bottom-right group `$7FFE` (SPACE, SYMBOL
SHIFT, M, N, B) jumps. Kempston (`IN $1F`) and Sinclair (`$EFFE` / `$F7FE`) go through the same byte.

### Starting a game (`$F7D6`, read)

Clears the state (`$848F`, `$8498`, `$8D52`, `$8D53`, `$8D58`, `$F7D1`), lives `$964A` = 3, score digits `$9217-$921B` = 0, room `$9649` = `$2C`,
screen cleared, the options menu once more (`$8000`), then jumps to the room loop `$940C`. Room `$2C` (44) is **not a room**: it is the opening scene.

### The opening scene (pseudo-room `$2C`, `$CD41`, read; played in `play.state`)

The house, the pit head and the water: Monty (a black figure) starts at x `$D8`, y `$4F` on the right and walks left; the bucket (a small sprite, `$7780`, at x `$2F`,
y `$4F`) waits at the left beyond a gap of water crossed by a plank. A jump in the original rises exactly 17 pixels (probe: y `$4F` to `$60`) and moves 1 pixel a pass in
the direction held; with the left key held and no jump Monty walks to x `$B8` and falls into the water. When Monty passes x `$40` the scene (`$CDC4`) sets bit 7 of all 64
coal flags (`$964D`+), makes the enemies of room 0 alive (`$9BBE` and `$9BD2` = 2) and draws the bucket (`$7780`); at the left edge he goes into room 0 at x `$18`,
y `$27` (`$CDB5`; `build/README.md`'s `room0.state` starts there). Leaving room 0 by its left edge returns to this scene (room 0's left exit is `$2C`) and resets
the coal flags (`$CD41` clears bit 7), so **the coal can be collected again by going back through the house** (read). The opening has its **own interrupt routine**
(`$CDEF`, set at `$CD66`), not `$8F9F`: **dying in the opening hangs the original**: Monty in the water at x `$AC`, y `$4D`: the death tune loop (`$8DA0`) waits for the
interrupt routine's shake to finish (`$9179` = `$FF`), which the opening's interrupt routine never does; the program counter stays in `BEEPER` for good (probe: 900 frames).
Not understood: whether a plank is needed or only a jump from the right place (the probe fell in at x `$AC`).

### The main loop (`$940C`, `$943C`; proved: the rate; read: the order)

`$940C` sets SP to `$5FFE`, looks at the room number `$9649`: `$15` (21) goes to the ending (`$F858`), `$2C` to the opening scene (`$CD41`); otherwise it sets
interrupt mode 2 (`I` = `$C7`: the table of 257 bytes of `$5B` at `$C700`, so every interrupt goes to `$5B5B`, which holds `JP $8F9F`), copies the room's record to `$C42A` (`$94C3`), draws
the room (`$9551`: `$FDD5`, `$C62A`, the object, the coal `$95B3`, the score `$91E8`, the lives `$949E`, `$D254`), and falls into the loop at `$943C`: `HALT`, then one *pass*:
enemies (`$8751`), "scenery collision and the crusher floor" (`$935C`), coal (`$95B3`), "touch an enemy" (`$9298`), input (`$82A6`), Monty (`$89D4`), the object pickup
(`$927E`); then the exits (`$9452`: x = 0 or `$F0` or y below `$21` or from `$AF` go to the exit paths `$94D9`), and round again. A pass takes more
than a frame: **the logic runs every second frame, 25 passes a second** (proved: 249 passes in 500 frames in room 0), so Monty's two pixels a pass
are 50 pixels a second. The **interrupt routine `$8F9F` runs every frame (50 Hz)** and moves the crusher and the retractable floor, scrolls the
conveyor rows in rooms 8-11 and animates room 17; `$8D53` (bit 0: leave the interrupt alone) and its bit 1 (the death shake) steer it.
Room 16 has its own check (`$9437`, `$96D9`): when Monty is lower than y `$41` it runs a **transition scene** (`$96E1`: he rises into the castle, `$80` steps,
a sprite from `$6F80` beside him) and puts him in room 17 at `$A1C0` (x `$C0`, y `$A1`).

## Memory map

| Address | What | Status |
|---|---|---|
| `$4000-$57FF`, `$5800-$5AFF` | Screen bitmap and attributes. Rows 0-1 the score (`SCORE: 00000`), rows 2-21 the room (20 x 32 cells), rows 22-23 `LIVES: 3` | proved |
| `$5B5B-$5B5D` | `JP $8F9F`, the interrupt routine (IM 2: every vector is `$5B5B`; the opening scene's own routine is `$CDEF`, set by writing `$5B5C`) | read |
| `$5C7B-$5C7C` | **Monty's x and y** (the system variable UDG's two bytes). x 0-`$FF` pixels left to right; **y counts up from the bottom of the screen** (y 0 is the bottom line of row 23) | proved (rooms.ts uses the table; boot.ts the start place) |
| `$5C7D-$5CDD` | the death tune: 24 notes of 4 bytes (duration, pitch) for `BEEPER`: "Abide with Me" | read (decoded, not heard) |
| `$5CE1-` | the ending verse (the game's own letters, `$FF` ends a line, `$FE` the text) | read |
| `$6000-$7FFF` | **256 sprite frames**, 16 x 16 pixels, 32 bytes each (2 bytes a row, top row first, no attributes: a sprite takes its colour from the cells it is over, or its record's byte): enemies, hazards, Monty's frames for some rooms, objects (`$7A00` on: pickaxes, torch, tools...), the bucket at `$7780`, the crusher | proved (data.ts: the bytes; every frame through the blitter) |
| `$7800-$787F`... | Monty's frames in the castle rooms 12-17 (a second set: `spriteBase` `$7800`) | read |
| `$8000-$8140` | the options menu | proved text |
| `$813B-$826A` | **the font**: 38 glyphs of 8 bytes (0 space, 1-26 A-Z with glyph 17 an apostrophe where a Q would be, 27-36 the digits, 37 the colon); the text routine `$809D` takes a 5-byte record (column, pixel row from the bottom, length, colour, attribute row) and a string whose last glyph has bit 7; `$80D1` draws a glyph as 5 rows in a cell and 3 in the cell below (8 consecutive pixel rows when the row is 3 into a cell, as all are); the verse printer `$CB35` draws 8 rows in a column | proved (data.ts: every glyph through both routines) |
| `$826B-$82A5` | menu texts; `$82A3` the control (1 keyboard, 2 Kempston, 3 Sinclair) | read |
| `$832E` | the input byte (above) | read |
| `$8400-$8500` | Monty's drawing helpers: `$8395` (frame address: base + 32 x frame + `$80` x direction), `$8452` (restore the background under his feet) | read |
| `$848C-$849B` | Monty's frame pointer (`$848C`), x/y copies (`$8490`, `$8491`), jump arc pointer (`$8492`), pitch (`$8494`), the jump counter (`$8498`), his facing (`$849B`), the walk frame (`$848E`), the jump direction + 1 (`$848F`) | read |
| `$849C-$869B` | **Monty's frames**: 16 of 32 bytes: left x 4, right x 4 (the walk), then 8 for the rope | read (sheet looked at) |
| `$869C-$86BB` | **the jump arc**: 32 signed steps of y (rise `0 0 1 2 2 2 2 1 1 2 1 0 1 1 0 1 0 0 0 0 0`, fall `-1 x8, -2 -1 -2 -2 -2`...: 17 up, 17 down) | read (probe planned) |
| `$8751-$8964` | the enemies' movement and drawing (6 records at `$C596`) | read |
| `$89D4-$8D51` | Monty: walking, jumping, falling, ropes; `$8B90` classifies the cells under him; `$8D0F` matches attributes against the room's four classes | read |
| `$8D52-$8D58` | Monty's state flags (`$8D52`: bit 0 falling, 1 jumping, 2 on a rope, 3 **carries a tool**, bits 4-7 blocked right/left/down/up) and the four cell classes `$8D54-$8D57`, the fall counter `$8D58` | read |
| `$8DCD-$8EDC` | the crusher (record at `$C527`) | read |
| `$8EDD-$9051` | the interrupt routine `$8F9F` and the death shake; the retractable floor `$8F31`, `$9052`, `$9058`; conveyor scrolls `$90A8` | read |
| `$9148` | the crusher's touch test: three bytes of picture against the background | read |
| `$919D`, `$91E8` | add A points to the score; print `SCORE:` and the digits | proved (919D by a probe) |
| `$9217-$921B` | the score: five decimal digits, **units first** | proved |
| `$9228` | "does the picture differ from the background here?" (the sprite-touch test); `$9258` the attribute at a pixel; `$927E` the object pickup; `$9298` Monty against sprites | read |
| `$935C` | Monty against the coal: eight points of his box against the attribute buffer, which `$95B3` has cleared and set to `$FF` in each live coal cell (`$95E8`); on a hit it clears the cell, restores the cell's attribute (the room's tile 0), beeps, finds the coal record by column and row (`$93D8`), clears its flag and scores (`$9400`) | read; its effect proved (mechanics.ts) |
| `$9647-$9648`, `$9649`, `$964A`, `$964B-$964C` | scratch, **the room** (0-20, plus `$15` ending and `$2C` opening), **lives**, the room's arrival place | proved (boot.ts) |
| `$964D-$968C` | **the 64 coal flags**: bit 7 = the piece is still there; the low 7 bits are what it scores. The bytes are leftovers of the programmer's assembler source (ASCII: `A`, CR, `Z`, LF, TAB, `LD (NUTDROP),A`...), which makes some pieces worth 65 and 90 | proved for id 3 (10 points, probe); read for the rest |
| `$96AA-$96D8` | drawing and erasing a coal piece (`$C537`, 8 rows) | read |
| `$96D9-$97BF` | the room 16 to 17 transition | read |
| `$9A2A-$C429` | **the 21 rooms**, 512 bytes each | proved (rooms.ts) |
| `$C42A-$C629` | the current room's record | proved |
| `$C62A` | restore the screen from the buffer (attributes `$CF54` to `$5800`, picture `$D260` to `$4000`) | read |
| `$C700-$C800` | the interrupt vector table: 257 bytes of `$5B` (`I` = `$C7`), so every interrupt goes to `$5B5B` | proved (play.ram) |
| `$C850-$C8xx`, `$CAD1-$CB92` | the ending: animation state and the verse printer (`$CB03`: the game's letters, `$FF` a line break and the typing pause, `$FE` the end) | read |
| `$CB93-$CE18` | the opening scene and its sprites (`$CD41`...), the bucket (`$7780`) | read |
| `$CF54-$D253` | the attribute buffer (768 bytes; the room's rows at `$CF94`) | proved |
| `$D254` | copy the screen to the picture buffer | read |
| `$D260-$EA5F` | **the picture buffer**: the screen as it is without sprites; the room is drawn here, collisions read it, sprites are drawn on the screen from it | proved |
| `$D290-$D2E6` | the title: the tune loop; `$D5B9-$D9FC` the title tune (273 records) | proved (data.ts) |
| `$EA60-$EB5F` | **the row table**: 192 words, one for each pixel row y (y up from the bottom): the address of that row's byte 0 in the picture buffer, minus `$9260` (add `$9260` + x/8; the screen is the same minus `$9000`) | proved |
| `$EBE0-$ECDB` | the **sprite blitter**: x `$ECDE`, y `$ECDF`, image `$ECE0`: shifts a 16 x 16 image across three bytes into a 48-byte buffer (`$ECE4`) and writes `sprite OR picture buffer` on the 16 pixel rows from y down (y is the top row); three bytes from column `(x - 1) >> 3`, so at a shift of 0 the first byte is empty and restores the picture's. `$8452` puts the picture's 3 bytes back on two rows (y and y - 1) from column x >> 3 | proved (data.ts: `src/sprite.ts` `blit`, `restoreRows`: 2176 draws, edges) |
| `$EF2E`-`$EFC4`, `$F040-`, `$F64D-$F6FD`, `$F7C7`, `$FBED-$FC3B`, `$FD9B`, `$FDD5-$FE85`, `$FEA2` | the screen routines of the room-end effects, the random byte (`$FD9B`: an LCG on `$5C76`), **the room drawing (`$FDD5`)** and the "attribute under Monty's feet" test | read |
| `$F04B-$F0FA` | the game-over verse | proved text |
| `$F7D6` | start a new game | read |
| `$F817` | game over (screen cleared, the verse printed by `$CB03`) | read |
| `$F858` | the ending (`$CAD1`) | read |
| `$FF00`-`$FFFF` | `$FF5B` is the `HALT` the loop waits on | read |

## Rooms (proved: rooms.ts)

21 records of 512 bytes from `$9A2A`: `room * 512 + $9A2A`. The game copies the current one to `$C42A`. Taken apart (`re/rooms-parse.ts`, the offsets
are from the record's start):

| Offset | What | Status |
|---|---|---|
| `$000-$0EF` | the map: 20 rows of 12 bytes; 3 bytes make 8 cells of 3 bits, most significant first: a tile number 0-7 | proved |
| `$0F0-$0F3` | four attribute values the physics looks for in the picture (`$C51A`): class 0 `$8D54` **floor** (and class 3 is treated as 0: floor too), class 1 **deadly**, class 2 **rope** (climbable) | read |
| `$0F4-$0F5` | where Monty's 16 frames are for this room: `$849C` (rooms 0-11, 18-20), `$7800` (12-17) | read |
| `$0F6-$0F9` | the room up, down, left, right; its own number where there is no way out (`$C520-$C523`); room 0's left is `$2C` (the opening), room 20's right is 21 (the ending) | proved (a graph with no conflicts, below) |
| `$0FA-$0FC` | the object: x, y, sprite frame number (0 = none): a picture from `$7A00` + 32 x (n - 1) drawn each time the room is entered; stand on it exactly to take it (bit 3 of `$8D52`: the tool) | read |
| `$0FD-$102` | the crusher: x, y (current), lowest y, wait, direction (bit 0), highest y; x = 0 and y = 0 is none | read |
| `$103-$10C` | unused (zero in all 21 rooms: `rooms-parse.ts` refuses a room that has anything there) | proved |
| `$10D-$114` | the 8 pixel rows of the piece to collect in this room (a lump of coal in the mine, other things in the castle) | read |
| `$115-$123` | five coal records of 3 bytes: id (the game-wide piece number 0-63), the column and row (screen cell, so rows 2-21) | read (a probe collected id 3) |
| `$124-$16B` | the room's 8 tiles: 9 bytes each (attribute, then 8 rows); tile 0 is blank | proved |
| `$16C-$1E3` | six enemy records of 20 bytes (below) | read |
| `$1E4-$1F7` | unused (zero) | proved |
| `$1F8-$1FE` | the retractable floor: 7 bytes (below) | read |
| `$1FF` | unused (zero) | proved |

The picture (`$FDD5`): row `r` (0-19) of the map is drawn at screen row `r + 2`; each cell's 8 rows go to the picture buffer through the row table and its attribute
to `$CF94 + row * 32 + col`. The two rows above and the two below are the score and lives. What `$FDD5` leaves in the buffers is exactly `drawRoom` in `src/room.ts`.

### The world (proved: a graph; the layout is read from it)

21 rooms in one long path, every exit reciprocal, no conflicts when laid out on a grid (column, row; row 0 at the top):

```
 col: 0    1    2    3    4    5    6    7    8    9
row 0 [ 0]
row 1 [ 1]
row 2 [ 2]
row 3 [ 3]
row 4 [ 4]
row 5 [ 5]                                          [20]--> the ending
row 6 [ 6]                [12] [13] [14] [15] [16] [19]
row 7 [ 7] [ 8] [ 9] [10] [11]                 [17] [18]
```

(0 to 7 is a shaft going down; 7 to 11 along the bottom; 11 up to 12; 12 to 16 along; 16 down to 17 and along to 18, up to 19 and 20; 16 also
reaches 19 directly, to its right. The left of room 0 is the opening scene; the right of room 20 is the ending.) By eye, from the pictures `test/rooms.ts` writes: rooms 0-6 are a red rock shaft with
ropes and platforms, 7-11 brick tunnels with pools of water and rails with wheels (rooms 8-11 are where the interrupt routine rotates rows), 12-16 caverns of red and blue rock
with cyan pipes (these use Monty's second frame set, `spriteBase` `$7800`, and so does 17), 17 is blue stone with brick and chains, 18-20 are blue stone and brick over a fire floor
(18), then room 20, the **castle** with its battlements and turrets, whose right edge is the ending. Room 16's scene lifts Monty from the pit into 17 (above). This table is also the pause screen's map.

## Drawing

- The game keeps the screen twice: the **picture buffer** at `$D260` (no sprites) and the real screen. A room is drawn into the buffer
  (and the buffer is copied to the screen, `$C62A`); every sprite is drawn **on the screen** over the buffer's bytes (`$EBE0`): the blitter ORs the sprite
  onto the buffer's bytes and writes the result to the screen; to erase a sprite it copies the buffer's bytes back (`$8452` for Monty's feet,
  `$8E50` for the crusher). Collisions read the buffer (what is solid) or compare screen with buffer (what a sprite is touching, `$9228`).
- Sprites move in single pixels in x, whole pixels in y; the original flickers when drawing (no double buffer), which the rebuild will not.
- Attributes: the 768 bytes at `$5800` are the buffer's `$CF54`; the collision classes are *attribute values*, found by matching the attribute under Monty's feet
  against the room's four class bytes (`$8D0F`), so **what is solid is a colour**: a platform is solid because its tile's attribute equals the room's floor byte.

## Monty (read; the planned check is `test/lockstep.ts`)

- **Walking**: input direction 2 or 3 moves x by 2 a pass; the walk frame `$848E` counts 0-7 (the picture `frame >> 1`: four a direction, `$8395`), his facing `$849B`
  changes when the key does. Up and down (codes 0 and 1) only do something on a rope (`$917A`: y by 2 a pass).
- **Jumping**: the jump key (bit 7 of the input) sets `$848F` to the direction + 1 (5 for none) and bit 1 of `$8D52`; each pass (`$8A63`) he moves x by 1 in his direction
  (none for a standing jump) and y by the next step of the arc (`$869C`, pointer `$8492`), and the counter `$8498` counts the passes; the jump cannot be steered; it ends at the end of the arc or on landing. **The rise is 17 pixels** (proved by a probe in the opening: y `$4F` to `$60`). A blocked head (a ledge above) cancels the rise (read: `$8B46-$8B5E` put y back). Each pass makes a footstep sound (`$8B06`).
- **Resolution** (`$8B3A-$8B45`, probe: resting y is always odd, `$27`, `$31`, `$51`...): when he is not in a jump every pass forces y odd (`SET 0`) and x even (`RES 0`), so Monty walks on a 2-pixel grid in x and the odd rows of y.
- **Falling**: when the cells under his feet are not floor (class 0 or 3) he falls 2 pixels a pass (`$8B1F`) and the fall counter `$8D58` goes up 2 a pass: **landing after
  32 or more pixels (4 character rows) kills him** (`$8C1E`: `CP $20`; the pokes' "fall from any height" changes this byte). Walking off a ledge he falls straight down.
- **Ropes**: standing in a class 2 cell sets bit 2: up/down climb 2 a pass with the other eight frames, left/right leave.
- **Edges**: x = 0 goes to the left room (arrives at x `$EE`), x = `$F0` to the right (arrives at x 2), y below `$21` or from `$AF` up or down (arrives at y `$23` or `$AD`), by the room's four
  exits; where there is none (own number) he is put back. (Read from `$94D9-$952C`.)
- **Dying** (`$946E`): the screen shakes and the death tune plays (`$8D7F`: ROM `BEEPER` with the table at `$5C7D`), a life is taken (`$9474`: `DEC (HL)` on `$964A`;
  the pokes' "infinite lives" turns it into a `NOP`), the lives line is redrawn (`$949E`); with none left it is game over (`$947C` jumps to `$F817`);
  otherwise Monty is put back at the room's arrival place (`$964B`, the place he came in by; the coal and enemies are as they were, **no rooms reset on death**) and play continues.

## Enemies, objects and hazards (read)

- **Enemy records**, six a room, 20 bytes at `$C596` (copied from the room): `+0` state (0 alive, 2 dying, 3 none), `+1..+8` four frame-set pointers (one for each way it moves),
  `+9` attribute (colour), `+A` a number that is also how strongly it chases (`$8885`: against a random byte it either goes its way or heads for Monty),
  `+B` direction (0-3), `+C,+D` x, y, `+E` steps in a leg, `+F` the animation frame (0-7, counted every pass), `+10` steps left in this leg, `+11` step size.
  A patrolling enemy walks `+E` steps, then turns; the "flying pickets", hairsprays, fish, coal drills and bricks are all this record with different
  sprite pointers. **A touch** (`$9298`: six points of Monty's box against what has been drawn) kills Monty unless he carries a tool (`$92DF`): then the tool
  goes, the enemy dies (state 3) and Monty goes on.
- **The object** (record at `$0FA`): standing exactly on its x, y (`$927E`) sets bit 3 of `$8D52` (carrying a tool), beeps (`$956E`) and removes it (`$9568`: probe in room 1, object `$10` at x `$78`, y `$37`: `$8D52` 0 to 8, `$C526` 16 to 0). One per room at most. Leaving the room by an edge clears the bit (`$94DD`: `RES 3`), so **a tool lasts only until the room is left**; entering a room copies its record again, so the object is there again.
- **Coal**: five pieces a room at most (`$115` and following); a flag byte at `$964D + id`; touching the piece's cell (`$935C`) scores the flag's low 7 bits
  (`$9400`: `CALL $919D` with that value), clears bit 7, erases the picture, and beeps. **Coal is the only thing that scores.**
- **Deadly cells**: a class 1 attribute under any of his four cell corners kills him at once (`$8BCB`), tool or not.
- **Crusher** (`$8DCD`): a 16 x 16 thing that moves 2 pixels a pass in y between its two limits (`$C527+2` and `+5`), waits a random while at each end (`$FD9B`), draws itself with `$EBE0`,
  and kills on contact: the touch test (`$9148`) compares three bytes of picture with the buffer. The pokes' "no crushers" is a `RET` at `$8DCD`.
- **The retractable floor** (`$8F31`, 7 bytes a room): a bar that grows from both ends and shrinks again, drawn into the picture buffer and the screen (`$9052`, `$9058`)
  so the physics sees it. ("The constantly disappearing floor.")
- **Conveyors and water** (`$90A8` from the interrupt routine, rooms 8, 9, 10, 11): rows of the picture rotate a pixel a frame (the interrupt routine, `$8FAC`-`$9045`). No code that carries Monty along a conveyor was found, so it may be only the picture (guess; the lockstep in phase 2 settles it).

## Lives, score, panel

- **Lives** `$964A`: 3 at the start; a death takes one; no way to gain one. The panel's bottom rows print `LIVES: n` in the game's letters (`$949E`: n is `lives + $1B + $80`).
- **Score** `$9217-$921B`: five decimal digits, units first; only coal adds to it (the sum of the 64 flags' low 7 bits is the most the whole game gives).
  `SCORE: 00000` is printed by `$91E8` (digit + `$1B` is the glyph). There is no high score.
- **The panel**: no gauge, no pocket; a carried tool shows nowhere (read: it is only bit 3 of `$8D52`; the picture does not change).

## Sound (read)

All sound is the ROM's `BEEPER` (`$03B5`, `$03B6` = the same with DE and HL as parameters): the title tune (273 records, 217 notes), the death tune (24 notes),
a footstep or jump tick (`$8B06`), the crusher's thud (`$8E28`: DE 2, HL `$066A`), the "touched while carrying a tool", coal and object beeps (`$92F4`, `$93D5`,
`$956E`: DE `$31`, HL `$0376`). **There is no AY or 128K music** (`credits.md`). The rebuild plays them as beeper effects the way Moley Christmas does (`renderToggles`);
every sound is a call of `BEEPER` with DE and HL, so there is no recording to keep: `src/beeper.ts` computes the speaker's flips from the routine's own timing (proved against the model for every note of both tunes, the three effects and all 256 footstep pitches); the footstep is DE 1 at pitch `$8494` (starts `$FA`, up one a rising pass, down one a falling pass, 8 bits), the thud DE 2 HL `$066A`, the pick-up (coal, object, a tool touch) DE `$31` HL `$0376`.

## Title, game over, ending (read)

- **Title**: the loading screen with the Colonel Bogey tune, any key; then the options menu (above).
- **Game over** (`$F817`, probe: lives 1, `$946E`): the screen is cleared to black with the score line (`SCORE: 00000`) kept at the top and no lives line; the verse is typed in **yellow**
  in the lower half, from `$F04B`, a line at a time (`WHY DID MONTY DIE SO FAST / AREN'T 3 LIVES ENOUGH TO LAST / THE HAZARDS THAT CONFRONT A MOLE / IN HIS SEARCH FOR PRECIOUS COAL`, a gap, `DON'T LET MONTY DIE IN VAIN / PRESS A KEY AND TRY AGAIN`);
  any key goes to `$F7D6`, and **with no key at all the game starts again after about 510 frames** (`$F853`: `HALT HALT` 255 times). A new game puts the lives to 3 and the score to 0 and shows the options
  again; **the coal flags and the enemies' states are not reset except by the opening scene** (read).
- **The ending** (`$F858` -> `$CAD1`, probe: room 20, right edge): the room number becomes 21; the screen is cleared to cyan on black with the score kept on top and **a 36-line verse in four-line stanzas**
  (`$5CE1`: `OUR GALLANT MOLES COMPLETED THE TASK THROUGH PICKETS THICK HIS LUCK DID LAST ... PLAN HIS ESCAPE`) is typed in cyan a line at a time, the whole text scrolling up a row as each line is added
  (`$CB63` copies rows with `LDIR` while it waits for the interrupt); a longer pause at each `$FF` (`$CB15`); when the verse is over (about 1500 frames) any key, or a wait, goes to `$F7D6`
  (the options menu, room `$2C`). Monty does not appear; there is no score bonus.

## Credits

`credits.md` (sources for every line). In short: Peter M. Harrap (creator and programmer), Gremlin Graphics, Monty Mole created by Ian Stewart, cover art David Bracher,
the title and death tunes are arrangements of Colonel Bogey and Eventide, 1984.

## Not understood yet (to settle in the phases below, each with a check)

- the exact timing of the opening scene's gate and how the room 0 start is reached from it in a real game (the probe's hold stuck at x `$20`);
- the pattern of the retractable floor and the conveyors in each room (`$C622` values per room, `$90A8` callers by room);
- room 17's animation (`$90BD`, called from the interrupt routine) and what `$C850`-`$C88x` do;
- the full set of the enemy movement cases (`$87A6-$8827`), the chase rule (`$8885`) and the enemy "dying" animation (`$8969`);
- the collision box of Monty against sprites (`$9298`: six points) and against deadly cells (four corners) against what the sprite shows;
- whether any coal can be collected from the wrong side (flags are per game, not per room: the second visit to a room has the pieces taken before gone, proved by the flags, not by a check);
- all 64 coal values (the junk bytes) and the maximum score.

## Plan

Phase 1 (this one) is done: the tape, the headless boot, the states, the notes above, `credits.md`, the 21 rooms as data and proved, the rules that were cheap to prove. The
rebuild is native TypeScript like Moley Christmas (`docs/moley-plan.md` is the model; the Spectrum palette `PauseColours`, the beeper `renderToggles`, `tools/zx` and the lockstep
method are all there), in these phases, in order. Each ends with a check that compares the rebuild with the original running, and none is "done" without it.

1. **Everything else as data** (`re/extract.ts`, `src/data/*.ts`, `test/data.ts`): the 256 sprite frames (`$6000`), Monty's two frame sets (`$849C`, `$7800`), the objects (`$7A00`), the font (`$813B`, 8 bytes a
   glyph: only the glyphs the game prints), the texts (options, game over, ending verse, `SCORE:`, `LIVES:`), the title picture (the first 6912 bytes of the game block: bitmap and attributes),
   the jump arc (`$869C`), the row table (`$EA60`: formula, not data), the 64 coal values (`$964D`: the programmer's leftover bytes, kept as data), the two tunes (`$D5B9`, `$5C7D`) and each beeper effect as toggle gaps
   (recorded from the model running each routine, `renderToggles` as Moley's `re/sounds.ts` does). Check: regenerated identical; every sprite frame drawn by the game's own blitter (`$EBE0`) equals `src/sprite.ts` at
   all 8 shifts; the glyphs equal what the game's character routine draws; the title picture equals the original's screen at the title; the tunes decode to the notes the model's speaker log shows.
2. **Monty alone, in lockstep** (`src/monty.ts`, `src/input.ts`; `test/lockstep.ts` against the original from `room0.state` and placements): the input byte (keyboard, Kempston, Sinclair), walking, the jump (arc, direction, head blocked), falling and its
   fatal limit (settle: 32 pixels?), ropes, the cell classes from the room's four attributes (floor, deadly, rope, and how class 3 differs), the conveyors' push, edges and the exit paths (`$94D9`), arrival places, the death (what it
   needs: a flag, then the original's tune, shake and the life). Compare every pass: x, y, `$848B`-`$849B`, `$8D52`-`$8D58`, the room, lives. Random players in every room, then placements round each kind of cell (the Moley method).
   Unknown to settle first: the `$8D52` bit meanings (4-7), the conveyor push, whether Monty's box is 16 x 16 or smaller, the exact fall limit (a probe: drop him from each height onto a known floor).
3. **The things that move** (`src/enemies.ts`, `src/crusher.ts`, `src/floor.ts`, `src/items.ts`): the six enemy records (legs, turning, the four directions' frames, the chase rule against `$FD9B`, dying `$8969`), the crusher (`$8DCD`), the retractable floor
   (`$8F31`), the conveyors and water (`$90A8` from the interrupt, rooms 8-11), room 17's animation (`$90BD`), the tools (`$927E`, `$92DF`), coal (`$935C`, the flags, the score `$919D`), the room 16 scene (`$96D9`), the opening scene
   (`$CD41`), all at their own rates: the main pass every 2nd frame, the interrupt routine every frame (so the rebuild has two clocks, as the original does). The random numbers are `$FD9B`'s generator on the seed `$5C76`: the rebuild owns its
   own copy (`SeededRandom`) and the lockstep feeds the original's values. Check: the whole state (every entity record, the crusher, the floor, flags, score, lives, tool, the random seed) after every pass and every interrupt, random players in
   every room and shaken states (as `games/moley/test/lockstep.ts`), then bots through each room and the whole game (21 rooms, the ending) as `playthrough.ts` does.
4. **The picture** (`src/display.ts`, `src/look.ts`): the Spectrum screen as the original keeps it: the picture buffer, the attribute buffer, the sprites ORed on, the erasing from the buffer, the shaking of death, the retractable floor
   and conveyors written into the buffer, the score and lives text. Check: the 6912 bytes of screen memory equal to the original's after every pass and every interrupt; every frame the original shows is the pass's new picture, the
   one before, or torn between (`test/picture.ts`, Moley's classes); entering a room (the original takes about 3 frames to draw; the rebuild draws at once). ENHANCED look (as Moley's): no colour clash, whole sprites over the scenery,
   gliding at 50 Hz; ORIGINAL exact.
5. **Flow and screens** (`src/screens.ts`, `src/flow.ts`; `test/flow.ts`): the loading picture, the options menu (its three control lines rewritten to ours: keyboard / gamepad / touch, the original's lettering), the opening
   scene (with the fix for its hang: Monty in the water dies like anywhere else, in both modes: say so in QOL.md), play, game over (the verse typed in yellow, the 510-frame wait), the ending (cyan verse scrolling) and back to the options. Check: every frame
   from the tape's start to the options, a game, a game over and the ending against the original (same / a frame apart / torn / being drawn / different), the typing of the verses, the colours.
6. **Sound** (`src/sound.ts`, `src/beeper.ts`, `src/music.ts`): the two tunes and the effects as 1-bit audio by `renderToggles` (as Moley's `src/sound.ts`); the title tune loops until a key; the death tune is the "Abide with Me" dirge played before each respawn
   (the `$8DA0` loop; its length is measured in this phase). Check: the effects' toggle gaps equal the model's speaker log at 22050, 44100 and 48000 Hz (`effects.ts`), the tune's notes, the queueing (`sound.ts`).
7. **The front end** (`src/main.ts`, `src/map.ts`, `src/info.ts`, `src/save.ts`, `src/touch.ts`, `src/controls.ts`; the game is registered in `games/registry.ts`, `tools/tests.mjs` gets its tests): runs on `runPort` like the other
   rebuilds. Pause screen with the **map**: the 21 rooms on the grid in "The world" above (visited rooms drawn, coal collected `n of 64` as the progress), travel to any room visited (enter at the room's arrival place, `$964B`), autosave on entering each room,
   CONTINUE, NEW GAME? over a save, **back to room start** (the arrival place; the room's coal as it was), phone scaling, touch controls (stick left/right, up/down for ropes, a jump button), the Spectrum palette (`PauseColours`), the info sheet with
   `credits.md` (Wikipedia links for the game, Gremlin, the two tunes), the ORIGINAL / ENHANCED switch (E), grace after our front end puts him back (150 frames). The save is the game's whole state (coal flags, enemy states, tool, score, lives, the room).
   Check: `test/frontend.ts`, `test/info.ts`, `games/shared/test/registry.ts`; saves round-trip; travel puts Monty where the original would.
8. **ENHANCED and `QOL.md`** (the standard format: Always rows first, `ENHANCED:` rows after, then "Not changed"): ENHANCED is quality of life for a modern playthrough and has **unlimited lives** (`LIVES_ASSIST`: a death takes no life, so no game over; ORIGINAL
   keeps three lives, no extra lives, and game over), no colour clash, sprites that glide; candidates to discuss with Chris (product decisions): air steering in the jump (the original's jump cannot be steered), hints (sparkles on the room's coal and
   the tool; the pause screen's `n of 64`), a visible carried tool (it shows nowhere in the original). Always (both modes): pause, map, travel, autosave, continue, back to room start, touch, the hang in the opening fixed.
9. **The reward** (`src/ending.ts`, `src/ending-scenes.ts`, `test/reward.ts`, `test/ending.ts`): winning in ENHANCED earns the shared show after the game's own ending verse: a montage of the 21 rooms (Monty, driven by routes found by search, doing what fits:
   collecting coal, riding the conveyors, the crusher passing), credits typing in a row the picture leaves empty (`credits.md`'s sourced facts, then `PORT_CREDITS`), the game's creatures (the six enemy kinds, from the sprite frames) walking
   through and named once each, THE END with numbers (score of 64 coal, the most there is) and Colonel Bogey. 60 to 75 seconds; `readWon`/`keepWon`, W on the pause screen once won, `?ending`. Check: `games/shared/test/ending-kit.ts`.
10. **Close** (`GAMES.md`, `README.md` and `HANDOFF.md` updated; `tools/tests.mjs` lists everything; `npm run verify`): the game is in the loader (one plain directory line next to the other Monty games), the size under the others'; a play-through on a phone by Chris
    is what finds the real bugs (as `HANDOFF.md` says for every game).

**Order and why.** Data first (nothing else can be checked without it), Monty alone (the physics decides the rest, and it is where a rebuild goes wrong), then the world's things, the picture, the flow and sound, the front end, ENHANCED, the reward. Phases
2 and 3 are the long ones (Moley's equivalents took the most checks); 4 is mostly bookkeeping once 3 is exact because the original draws in place and our picture is the same bytes.

**Risks.** The original's collision uses the picture (pixels of the buffer and of the sprites), so two-pixel differences in a sprite or a shift will show as a different death: the picture phase and the lockstep share the `src/sprite.ts` blitter, so they stay in agreement.
The original has a hang (the opening) and an unbounded table (the coal values are source text): both are decisions for QOL.md, not silent fixes. The random generator is a system variable's LCG; the lockstep needs its seed fed. The model is not cycle-exact, which matters only for
the order of the interrupt routine against the main loop within a frame: settle it from measured counts (as Moley did), compare allowing a frame either way. Nothing in the game needs 128K or AY.

## A cross-check: the fan map

World of Spectrum's `Wanted-MontyMole.gif` (saved in the main checkout's `build/downloads/`, a map made in 1999 after Crash's) agrees with the world above: the shaft down the left, the tunnel along the bottom,
the pipe tunnel with the railcart, then the castle at the right. Its captions give the **intended rules**, which the code enforces generically: the bucket must be taken outside the miner's house or the coal is invisible (proved
here: the coal flags are only set by the opening scene); each room's object is a tool ("the whip-like object allows Monty to collect the candle", "the wooden club allows Monty to collect the small fish", "the scissors
allow Monty to collect the devil guarding the coal"): in the code a carried tool lets one touch of an enemy kill the enemy instead of Monty (`$92DF`), which is how these work; crushers can be walked through while their base does not touch him on the way
down; and "you can make Monty fall further than usual by jumping sideways and holding the down key" (so the fatal-fall rule has a jump-and-down exception: to read in phase 2). Treat the captions as hints, the code as the rule.
