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
| `test/lockstep.ts` (+ `lockstep-core.ts`, `random-player.ts`) | the rebuilt game (`src/game.ts`: Monty, the coal, the score, the objects, the six enemies of every room, the crusher, the retractable floor, the gates, the conveyors, room 17's chain, the room 16 scene, the edges, death) against the original, **every pass** (see "Monty" and "The enemies..."): the original runs from a state and at the start of each pass the rebuilt game takes the same ports and runs its pass; compared are Monty's whole state, the room, lives, arrival place, score, the 64 coal flags, the object, the six enemy records, the crusher, floor, gates and chain, the seed, the 6144 bytes of screen, the attributes, the picture buffer and the coal mask, the beeps and the outcome. The original's interrupt routine is called by the harness twice a pass (below), with the parts not being tested patched out of its code. Random players from random places in all 21 rooms (standing, in each state of a jump, falling), round every colour of every room, round every piece of coal and object, with a tool beside every enemy, among enemies made chasers, taking the pieces that open each gate, jumping out of room 17, and beside all 44 ways out | about 256000 passes, 0 differences (slow set; a short run of about 80000 in the fast set) |
| `test/opening.ts` | the opening scene pass by pass (below) | 0 of about 8600 passes differ |
| `test/death.ts` | the death with the original's own interrupts and the whole death tune: the picture rising (`src/death.ts`) every frame from the death picture on, and how long a death takes (within 15 frames: the interrupt routine inside the notes costs what the picture it draws costs) | 0 of 1070 frames differ |
| `test/screens.ts` | game over and the ending: the verse typed and scrolled (`src/screens.ts` `VersePrinter`), frame by frame, the screen when the typing is over, the typing's length (154 and 1010 frames) and the 510-frame wait | 0 frames wrong (the scroll's torn lines allowed to differ) |
| `test/picture.ts` | the picture through the renderer (`src/view.ts` over c64kit's stand-in) against the ULA's picture of the original's memory, every pass, in ORIGINAL; ENHANCED's scenery and sprites | 0 of 1432 differ |
| `test/sound.ts` | the sound's use of the audio (the tunes, the queue of beeps, stopping) and the title tune's length against the original's | within 1 % |
| `test/frontend.ts`, `test/info.ts`, `test/loops.ts` | the front end headless (title, options, opening, map, travel, saves, continue, grace, the switch, ENTER CONTINUE, NEW GAME?, touch), the info card, ENHANCED's no death loops | pass |
| `test/schedule.ts` | the two clocks: the original with its own interrupts against the original with the routine called at the rebuilt game's two points, the same random player from the same place (room, Monty's place and flags, lives, score every pass) | 146 of 150 runs of 60 passes identical |
| `test/falls.ts` | the fatal fall: 1176 drops, a counter of 32 or more at the landing kills, 30 does not | 4 of 4 |
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

### The opening scene (pseudo-room `$2C`, `$CD41`; proved: test/opening.ts)

The house, the pit head, the tree and the water: Monty starts at x `$D8`, y `$4F` on the right, and **the scene has no wall**: the ground is cells 2-29 of the screen, so he falls off it at either end (and through y 15, below which the original looks the row up past the end of its row table). The scene is drawn by `$EF7E` from a table at `$F14B` (28 x 20 character codes of the scene's own glyphs at `$7C00`, and a colour for each cell) into the cleared picture buffer. Its loop (`$CD98`) is about a frame long: `HALT` (`$FF5B`), the animation `$CB93` (the pot at x `$2F` steaming until Monty passes x `$40`, then the wife walking out of the house from x 1; the bird across the top at y `$AF` going left from `$78` to `$70`, where the acorn starts to fall at x `$68` from y `$9F` to `$4F`, lies for four pictures and becomes the pot's picture, and the bird comes back to x `$80`), the touch test, the input, Monty's routine. **x `$40` is the gift** (`$CDC4`: the 64 coal flags get bit 7, room 0's third and fourth enemies become relays, the pot's picture) and **x `$E0` is the way out into room 0 at x `$18`, y `$27`**, which Monty reaches walking *right* from `$D8` (or wrapping round the left). The scene's own **interrupt routine** (`$CDEF`, set at `$CD66`) turns the water (`$90A8` on y 63) and, every fourth time, draws the picture in the top right corner (`$EF2E`, screen only). Its variables (`$CD32-$CD40`, `$CE19`, `$EF77`) start as the tape has them and only the pot and the wife are put back by the scene's start, so a second visit goes on where the last left off; the record of the last room (`$C42A`) is still what the physics reads, with the water's colour `$75` put in the deadly class (`$CD93`). Leaving room 0 by its left edge returns to the scene.
**Dying in the scene does not hang** (the first reading did): `$8D7F` plays the whole 24-note death tune (`$8DA0`; about 1000 frames, the screen frozen) because what ends it early (the death picture rising, `$8EDD`, which sets `$9179` = `$FF`) belongs to the interrupt routine `$8F9F`, which the scene does not run; then the scene starts again. The rebuilt game gives the scene's death the room's own. Proved: the scene, about 8600 passes compared with the original from its start, from placements and from room 0, 0 differences (the pass of a death and of a fall below the screen is where the comparison stops).

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

Since stage 3 the rows that say *read* for `$5C7B-$5C7C`, `$832E`, `$848C-$849B`, `$8751-$8964` (the enemies), `$89D4-$8D51` (Monty), `$8D52-$8D58`, `$8DCD-$8EDC` (the crusher), `$8EDD-$9051` (the interrupt routine except the shake), `$90A8`, `$90BD-$9147`, `$9148`, `$919D`, `$9228-$9298`, `$935C-$9408`,
`$940C-$952C` (the room loop and the exits), `$952F-$96D8` (the object and the coal), `$96D9-$97BF` (the room 16 scene), `$C42A-$C629` (the room's copy: the records `$C527` crusher, `$C596` enemies, `$C622` floor), `$F64D-$F788` (the gates), `$FD9B` (the generator), `$FBB4-$FC3B` and `$FD25-$FD7A`
(the enemies' attribute painting; the rest of that area is for the other effects and not used by the main game) are **proved**: the rebuilt game's `src/*.ts` do what they do and the lockstep compares the results; their addresses are in the comments of those files. Still *read* only: the opening scene (`$CB93-$CE18`, `$CD41`), the title and menu (`$D290`, `$8000`), the death's shake (`$8EDD`) and tune (`$8D7F`), game over and the ending.

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

## Monty (proved: test/lockstep.ts, test/falls.ts; `src/monty.ts`, `src/input.ts`, `src/game.ts`)

Everything here is compared with the original on every pass (the original with its world emptied of everything but Monty: no enemy, crusher,
retractable floor, object or coal in any room, the interrupt routine a return, the death tune one note): his whole state (`$5C7B`, `$832E`, `$848C`,
`$848E`, `$848F`, `$8492`, `$8494`, `$8498`, `$849B`, `$8D52`-`$8D58`, `$8D7D`-`$8D7E`), the room, lives, arrival place and score, the 6144 bytes of screen, the 768
of attributes, the picture buffer and the attribute buffer, the footstep beeps, the input byte as `$82A6` made it, and the outcome:
about 216000 passes from random places in all 21 rooms (standing, in each state of a jump, falling), round every colour of every room, and beside each of the 44 ways out
(and sweeps where a way out was hard to reach), on all three controls with keys of the others pressed too: 0 differences.

- **The input byte `$832E`** (`$82A6`, proved): bits 0-2 direction (0 up, 1 down, 2 left, 3 right, 4 none), bit 7 jump. Keyboard: Q, A, O, P (port `$FBFE` bit 0, `$FDFE` bit 0, `$DFFE` bits 1 and 0) and any of
  SPACE, SYMBOL SHIFT, M, N, B (`$7FFE`) for the jump; Kempston `IN $1F` bits 3 2 1 0 and 4; Sinclair interface 2's left joystick, `$F7FE`: 4 up, 3 down, 1 left, 2 right, 5 fire (the menu's
  choice, `$82A3`; 3 for anything but 1 and 2). Up beats down beats left beats right when several are held. **With no direction held the byte is left as it was**: Monty's pass puts it back
  to 4 at its end, but a death skips that, so the first pass after a death can move him a step the way the last pass pointed. With no Kempston plugged in port `$1F` reads `$FF`, which is
  up and fire at once.
- **A pass** (`$89D4`; the order is proved): the cell test for sprites first (below, `$9298`), then the input, then Monty: (1) falling (bit 0 of `$8D52`): two pixels down, the counter two, the two rows he left put back;
  else (2) in a jump (`$848F` not 0): the jump pass; else (3) the jump key: facing = the direction, `$848F` = direction + 1 (1 up 2 down 3 left 4 right 5 none), bit 1 set, and the jump pass; else (4) on a rope (bit 2): a new
  direction only turns him, up climbs two pixels (y up), down descends two, anything else walks; else (5) walking: no direction, nothing; a new direction only turns him (the facing changes and the walk frame
  advances, he does not move); the same direction moves two pixels (left: the walk frame counts up, right: down), up and down do nothing off a rope. Then every pass ends the same way (below).
- **The jump** (`$8A63`, proved): a pixel sideways in the jump's direction (left and right only; the jump cannot be steered), the next step of the 32-step arc (17 up, 17 down: `$869C`), the pitch of the footstep one up while the
  step is not negative, one down when it is (and a step down sets bit 7 of `$8D53`: "in the air"), the walk frame on, his picture chosen from the jump's direction, the two rows above and below put back, a footstep (BEEPER, DE 1, HL the pitch);
  then **the end of the pass runs, then the count `$8498` (when it wraps to 0 the jump is over: direction 0, fall counter 0, arc and pitch reset, bit 1 of `$8D52` and bit 7 of `$8D53` cleared), and then the end of the pass runs again**:
  `$8AD3` is `CALL`ed but ends with `JP $8B34`, whose `RET` returns to the count, which also ends in `JP $8B34`. So a jump pass looks at the cells and draws him twice, and a landing (below) in the first look has its count, then the second look.
  A jump does not end on landing as such: it ends when its count does, or when a landing resets it.
- **The end of every pass** (`$8B34`, proved): the cell classes (below; a deadly one is `JP $946E` at once); if he is not jumping y is forced odd and x even; **what is solid stops the move**: bit 7 (floor along his top row) and he moved up: y put back; else bit 6 (the bottom row)
  and he did not move up: y put back; then bit 5 (left column) and he did not move right: x put back; else bit 4 (right column) and he moved right: x put back; then he is drawn (`$EBE0`, `src/sprite.ts`) where he is and the input byte is set to 4.
- **The cell classes** (`$8B90`, `$8C3D`, proved): the room's four colours (`$C51A`: floor, deadly, rope, a fourth) are looked for in the **attribute memory `$5800`** at the cells of his box: it is 2 or 3 cells wide (3 when x is not a multiple of 8) and 2 or 3 high (3 when `191 - y` is not a multiple of 8)
  and the four edges (top row, bottom row, left column, right column) each give the index of the first colour that one of their cells has, scanned left to right or top to bottom, or 4 for none (`$8D54`-`$8D57`); an index of 3 is
  treated as 0, **so the fourth colour is a floor too**. Bits 7, 6, 5, 4 of `$8D52` are the edges whose index is 0. **A deadly index (1) on any edge is death, tool or not.**
  Rope (bit 2): the rope colour at the cell 8 pixels in from his left and one pixel below his top, or at the 16-bit sum `(y, x) + $F108` (a row above his bottom: the carry from x goes into the row). **What holds him up is the picture, not the attributes**: the OR of the
  screen's bytes (2 or 3 of them from column x >> 3) on the pixel row just under his feet (`y - 16`): anything drawn there, coal, a sprite, the floor, holds him; with nothing there he is falling (unless jumping or on a rope).
- **Landing** (`$8C0D`, proved): with bit 7 of `$8D53` ("in the air": set by walking off, or by the downward half of a jump) set and something under his feet: bits 0, 1 of `$8D52` and bit 7 of `$8D53` are cleared and **the fall counter decides**: 32 or more
  and he dies (`CP $20`); otherwise the counter, the jump's direction and count, the arc and the pitch are reset.
- **The fatal fall** (`test/falls.ts`, 1176 drops from every room's heights: 821 landings with a counter of 2 to 30, 205 deaths by the fall with 32 or more; a counter of 30 survived and one of 32 died): the counter goes up **2 a falling pass only** (in `$8B1F`: two `INC (HL)`) and a fall pass moves him 2 pixels,
  so a fall of 16 passes (32 pixels, four rows) kills and one of 15 does not; the landing pass counts (the counter is its second step). It is reset at every landing and at the end of every jump. A jump does not touch it, and neither does a rope (descending a rope is not falling). **The fan map's "jump sideways and hold down to fall further" is not in the code**
  (guess, from 216000 passes with nothing left over).
- **Resting y** is odd (proved): every pass not in a jump does `y OR 1`, `x AND $FE` before the stops.
- **Edges** (`$9452`, `$94D9`, proved: all 44 ways out): after Monty and the object check, x = 0, x = `$F0` (exactly), y below `$21` or y from `$AF` leave the room: the tool is lost (bit 3), x = 0 comes into the left room at x `$EE`, x = `$F0` into the right at x 2, y from `$AF` into the room above at y `$23`,
  below `$21` into the room below at y `$AD`; the new room's number is simply the exit table's entry (a room with none leads to itself and he comes in on the other side of it); his place is also his new arrival place (`$964B`). The room is entered again (`$940C`) in the same pass: copied, drawn, the score and lives printed, the screen kept as the picture.
- **Entering a room** (`$9551`, proved): `$FDD5` draws the room into the picture buffer and the attribute buffer, `$C62A` copies them to the screen and attributes, the object and the coal are drawn (`$952F`, `$95B3`), the score (`$91E8`) and the lives (`$949E`) are printed, `$D254` copies the screen to the picture buffer, so those are part
  of the picture. The two rows above and below the room are never drawn by `$FDD5`: they hold what was printed there. **`$95B3` runs every pass and first clears the attribute buffer `$CF54`**: it is not a buffer of the room's attributes but the coal mask: `$FF` in the cell of each piece still there, 0 elsewhere.
- **The room 16 scene** (`$96D9`, proved at its result): entering room 16 (every entry, a death included) with y below `$41` runs a scene that ends with Monty in room 17 at x `$C0`, y `$A1`, which is also his arrival place, the fall counter and the jump count cleared and nothing else (his jump, if any, goes on: **the arc's place is not cleared, so a jump
  it interrupts reads on past the end of its table after (32 - place) more passes unless he lands first, and the original then draws him off the screen and crashes. The rebuilt game ends such a jump (a documented difference, `Game.divergence`), and the lockstep run stops there**). Jumping out of the top of room 17 (the gap at x `$C0`) comes through this scene again.
- **The touch test** (`$9298`, proved with Monty alone): six pixels, each compared on the screen and in the picture buffer: his place plus `$0000`, `$010A`, `$F100`, `$F8FF`, `$F810`, `$F10F` as 16-bit sums (his top left corner, a point above his head, his bottom left corner, one beside his middle on each side, his bottom right corner; the carry from x goes into y). A difference is a touch: death
  (with a tool in hand: stage 3). **His own picture must not reach those points; a pixel of it left on the screen would kill him**, and the lockstep proves it does not (the death picture included: it is drawn at `$8D7F` and `$D254` keeps the screen, so it is in the picture until the room is drawn again).
- **Dying** (`$946E`, proved: the state after it): the death picture (`$FFE0`) is drawn where he died and the screen kept as the picture (`$D254`), the screen shakes and the tune plays (`$8D7F`; Plan 4 and 6 model them), a life is taken (`$9474`: `DEC (HL)`; the pokes' "infinite lives" turns it into a `NOP`), the lives line is redrawn; with none left it is game over (`$947C` jumps to `$F817`);
  otherwise Monty is put back at the arrival place with the fall counter, both flag bytes, the arc, the jump direction and the jump count cleared (**not** the pitch, the walk frame, the facing or the input byte) and the room entered again (the coal and enemies are as they were, **no rooms reset on death**).
- **Conveyors push? No code was found.** The rows are rotated by the interrupt routine, which the harness stops: settled in stage 3 with it running.

## The enemies, the coal, the objects and the interrupt's things (proved: test/lockstep.ts; `src/enemies.ts`, `coal.ts`, `object.ts`, `crusher.ts`, `floor.ts`, `gates.ts`, `conveyors.ts`, `chain.ts`)

All of this is compared with the original on every pass with everything kept in the original (the lockstep above, each part added in turn: nothing differed at any stage). The
timing of the interrupt routine, which is what the last four need, is "The two clocks" below.

- **Enemy records** (`$8751`, every pass, proved: about 250000 passes, 76 tool kills, relays, and chasers made of the data's enemies): six a room, 20 bytes at `$C596`, copied from the room's record when the room is entered (so a death or a way out puts them all
  back; the room table itself is only changed by the opening scene, `Game.enemySource`):
  `+0` state: **0 patrols, 1 chases, 3 is none, anything else (the data uses 2; room 17 has `$80`) is a relay**; `+1..+8` the frame sets for directions 0, 1, 2, 3 (four frames of 32 bytes each, as addresses);
  `+9` the colour of its cells; `+A` its **link**: the number of the record a relay wakes, and a chaser's strength; `+B` direction (0 up, 1 down, 2 left, 3 right); `+C,+D` x, y; `+E` the length of its leg in passes; `+F` the animation counter; `+10` passes left in the leg; `+11` its step in pixels (0: it stays and counts).
  **A patrol** moves `+11` in its direction (0: y up, 1: y down, 2: x left, 3: x right), counts the leg down, draws frame `(counter >> 1) & 3` of the set for the direction, and when the leg is over turns (0 and 1 are a pair, 2 and 3 the other) and loads the other set.
  **A relay** is the same until the pass in which `+10` is 1: then it does not move or draw; it becomes none (3), `+10` is put back to `+E`, it **wakes the record it links to by making its state 2** (a record may link to itself), and its place goes back to where its leg began (`step * (E - 1)` the other way): so the data's chains time the pickets and falling things (one runs its leg, vanishes, wakes the next). An enemy
  with step 0 is a timer: it counts `+E` passes with a blank picture. **A chaser** (state 1: the data has none, the code does) takes a random byte (`$FD9B`) each pass and, when the byte is above its strength, aims at Monty (towards him in x, or in y if he is farther that way); it looks at the way ahead
  (the picture buffer: 16 rows of the column just beyond it, or the two bytes of the row just beyond) and a wall turns it round. Everything is drawn with `$EBE0` over the picture (nothing is erased: the pictures have margins) and **a patrol paints the colour attributes of its cells** (2 x 2 when `x AND y AND 7` is 0, else 3 x 2 going up or down, 2 x 3 going left or right) and puts the room's blank colour `$47` on the cells it has left:
  Monty's classes are colours, so an enemy's cells are cells of its colour. A chaser's picture sets that the data leaves junk in (`$FF80`) are memory the rebuilt game does not have: a chaser is made only of records with all four sets (the test says so), and one that looks at a row off the screen ends the run.
- **A touch** (`$9298`): `touched()` above. Without a tool it is death. **With a tool** (`$92DF`): the tool is gone (bit 3), the pick-up beep, the enemy he is touching (`$9327`: the first of the six, in order, that is not none and is within 15 pixels of him in x and in y: the sums go through `AND $F0`) gets the blank picture in all four sets and the room's blank colour, **all six enemies take a step again** (the routine `$8751` is called once more, which also takes a random byte for each chaser), and then it is none. If none is that near (his touch was a leftover picture) the same happens to nothing.
- **The object** (`$952F`, `$927E`, `$9568`; proved: 21 taken in the runs): one per room at most (the record at `$0FA`: x, y, frame, `$7A00 + 32 * (frame - 1)`; most rooms have one). It is drawn when the room is entered and kept in the picture. Standing **exactly** on its x and y after his pass takes it: bit 3 of `$8D52` (a tool), the pick-up beep, 16 rows of two bytes cleared in the picture buffer and a blank picture blitted: the record's frame is cleared (the copy; entering the room makes a new copy, so the object is there again). Leaving the room by an edge clears the tool bit (`$94DD`), a death clears all the flags: **a tool lasts only until the room is left or he dies**.
- **Coal** (`$95B3` every pass and at the room's start, `$935C` every pass; proved: 243 pieces taken in the runs, the score and the flags after each): five pieces a room at most (`$115` on: id, column, row); a flag at `$964D + id` (bit 7 still there, low 7 bits the worth). `$95B3` clears the attribute buffer to a mask and, for each piece there, steps its cell's attribute (`((attr OR 7) + 1) AND $78`: ink black, the paper one on: the piece flickers through the colours, and Monty's classification sees those colours),
  sets the mask `$FF` in the cell and draws the room's piece picture (`$10D`, 8 rows) turned inside out in the picture buffer and the screen. `$935C` looks at eight points of his box in the mask (his top left, top middle, top right, middle left and right, and left, middle, right of the row below his feet): the first in a piece takes it: mask and cell attribute back to the room's blank colour, the flag's bit 7 cleared, the beep, the worth added to the score (printed on the screen), the piece drawn away. **Coal is the only thing that scores**; the most is 3392.
- **The crusher** (`$8DCD`; proved: 62 crushings and 859 thuds in about 83000 passes): the record at `$C527` is the column (a cell, not a pixel), y (2 a step), the lowest and the highest y, a wait and a direction (bit 0 set: going down); column and y both 0 is none. While it waits the wait counts down. Going up it moves 2 and is drawn until its y is past the highest; then it turns and waits a random `(byte AND $7F) + 1`. Going down it first looks at the row `y - 9` (`$9148`: three bytes from its column, screen against picture buffer: anything of Monty's there is death) and then moves 2 and is drawn
  until its y is not above the lowest; then it turns with a thud (DE 2, HL `$066A`). It is drawn (9 rows of 3 bytes, the pictures at `$8E7A` for down and `$8E80` for up) into the picture buffer as well as the screen (Monty stands on it) and the bright bit of its cells is set and cleared (`$8E9B`). **The pokes' "no crushers" is a `RET` at `$8DCD`.**
- **The retractable floor** (`$8F31`, `$9052`, `$9058`; proved: it moved in the runs of the rooms that have it, 0, 2, 3, 8, 9, 15, 18, 19, 20): seven bytes at `$C622`: two pieces, the left (x1, y1) and right (x2, y2), the left's lowest and highest x, and a direction bit (bit 7 of `+6`). Each step the left end moves right and the right end left (growing) or the other way (shrinking), putting (or taking) a column of
  three pixels one wide from row y down into the picture buffer and the screen (the code patches itself between `OR (HL)` and `CPL; AND (HL)`); at the end it turns and starts the other way in the same step. Monty stands on what is there.
- **The gates** (`$F64D`, `$F6A6`, `$F71A`, `$F6FD`; proved: 106 rows cleared in the runs): when exactly **16, 32, 48 or 64** pieces have been taken (the flags with bit 7 clear), the gate of room **6, 11, 15 or 20** opens: a column of cells (7, 5, 5 and 4 high: at column `$10`, `$14`, `$1F`, `$18`) is cleared one pixel row of each cell at a step, eight steps, and then their attributes become the room's blank colour. Only if Monty is in that room when the count is reached: otherwise the gate is marked done (`$F7D1` bits 5, 4, 3, 2) at once and **stays as the room draws it**;
  so the piece that makes the count has to be taken in the gate's room (the first gate's, room 6, has piece 15; room 15 has pieces 43 to 46 and piece 47, which comes 48th if they are taken in the order of their numbers, is in room 16: the game can be played so that a gate never opens). The routine's state is `$F7D1` (bit 0 "open now", the four done bits), `$F7D4` (the row) and `$F7D5` (the count), kept across rooms.
- **The conveyors and the water** (`$8FC7`-`$9045`, `$90A8`; proved): in rooms 8, 9, 10 and 11 (11 has six) a run of bytes on three pixel lines of the screen (not of the picture buffer) is turned one bit left each step: the first byte of each line is rotated and the rest of the run made equal. **Nothing carries Monty along**: no code reads them, and he stands on them in the runs without moving (settled, "guess" in the first reading).
- **Room 17's chain** (`$90BD`; proved): two pictures of 8 rows of 2 bytes at `$4841` and `$4861` (the top left of the room), a ring of 32 bytes (`$910B-$912A`) turned two bytes a step; it remembers (`$912B`) the object frame it last saw and draws the blank picture over the chain when the room's object is not what it remembered (so when the tool, object 15, is taken, or on the first step) and does nothing while the frame is 0 and remembered.
- **Deadly cells**: a class 1 attribute on any edge of his box kills him at once (`$8BCB`), tool or not (see Monty).

## The two clocks (proved: test/lockstep.ts, test/schedule.ts; re/timing.ts)

The original's **interrupt routine** (`$8F9F`, IM 2) runs 50 times a second: room 17's chain, the retractable floor, the gates, the crusher, the conveyors (and, while Monty dies, the shake, which Plan 4 models). The **main loop** (`$943C`: `HALT`, then the enemies, the coal, the touch test, the input, Monty, the object and the exits) runs 25 times a second: a pass is longer than a frame. Measured from the original running with a random player (`re/timing.ts`): **two interrupts fall in every
pass**, one as the `HALT` ends (at `$943D`, always) and one somewhere inside the pass, at the time of the next frame: in the enemies' blits in a room with many enemies, in Monty's routine, or in the beeper's wait (the jump's footstep disables interrupts, and then the model's frame interrupt, which is only offered for 32 T-states, is lost: no catching up).
The model is not cycle-exact (no contention), so where the second falls is not the real machine's anyway. **The rebuilt game runs its interrupt twice a pass, before the pass and before Monty's routine** (after the input is read), and the lockstep calls the original's own routine at those two points, so that the logic is compared exactly (the part of the routine that is not kept is patched out of the original's code, which is also how each stage was
added in turn). `test/schedule.ts` then compares the original's *own* schedule with that one: the same random player in the same place, the original with its real interrupts and with the routine called at the rebuilt game's two points: **146 of 150 runs of 60 passes are the same pass for pass** (the room, Monty's place and flags, lives, score), and the 4 that part company do so at pass 20 or later, when a floor or a crusher decided a step the other way. That is the difference between the original and the rebuilt game
that the rebuilt game has by design (the same to within a step of a floor or a crusher in 3 runs of 100), and QOL.md does not need it.

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

- the opening scene (`$CD41`: Monty at x `$D8`, y `$4F`, the water, the bucket, the gate at x `$40`, its own interrupt `$CDEF`, the hang when he dies there; it also writes room 0's third and fourth enemy states, 3 at the start and 2 once past x `$40`) and what `$C850`-`$C88x` do: Plan 5;
- the death sequence's effects (the shake `$8EDD`, the tune `$8DA0`, its length with the real interrupt): Plans 4 and 6 (its logic is proved);
- the title, the options menu's flow, game over's 510-frame wait and the ending's scrolling verse: Plan 5;
- whether a gate that is marked done while Monty is elsewhere can be opened by anything (it cannot: proved by the code and the lockstep, not by a whole game played);
- the whole game played through by a bot (Plan 3's last check) needs the opening scene.

Settled in stages 2 and 3 (each with its check, above): the fatal fall rule (32 or more, 2 a falling pass), the conveyors push nothing, the retractable floor's pattern and the gates, room 17's animation, the whole enemy movement and the chase rule and relay chains, the touch box (six pixels), the coal values and the maximum score (3392), and
that the 'dying' state of the first reading was a relay.

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

**Progress** (what the commits say; each part was proved against the original before the next was started):

- Phase 1 (everything else as data): **done and proved** (`test/data.ts`, 41 checks): the sprites, Monty's frames, the death picture, the title picture, the font (38 glyphs through the game's two character routines), the texts (menu, score, lives, the game-over and ending verses), the jump arc, the 64 coal values, the two tunes (title: 273 records, not the 201 first read), the crusher's pictures and room 17's ring, `BEEPER`'s timing as a formula
  (`src/beeper.ts`: every note, every footstep pitch), the blitter and `$8452` (`src/sprite.ts`), `$FD9B` (`src/random.ts`), the row table as the screen layout. Not as data but as a formula or a table of constants: the row table, the conveyors' runs (`src/conveyors.ts`) and the gates' places (`src/gates.ts`), each read from the code and proved by the lockstep.
- Phase 2 (Monty alone): **done and proved** (`test/lockstep.ts`, `test/falls.ts`): the input byte for the three controls, walking and turning, the 32-pass jump (with its doubled end of pass), falling and the fatal limit (32), ropes, the cell classes, the edges and arrivals, the death, the room 16 scene, the touch test. The open items: the fall-limit rule (settled), the conveyors' push (none), the box (the cells' 2 x 3 and the touch's six pixels).
- Phase 3 (the things that move): **done and proved except for the whole-game play-through**: the six enemies of every room (patrols, relays, chasers, the tool), the crusher, the retractable floor, the conveyors, room 17's chain, the tools, the coal and the score, the four gates; the two clocks (the interrupt twice a pass, `test/schedule.ts`). Left of the plan's list: the opening scene (`$CD41`), and the bots through each room and the whole game (21 rooms, the ending), which need it.
  The random numbers are `$FD9B`'s generator, owned by `src/random.ts` (the lockstep takes the original's seed at the start and compares it every pass).
- The opening scene (phase 3's last part): **done and proved** (`test/opening.ts`, 0 of about 8600 passes differ), with its interrupt routine, the bird and the acorn, the gift and the way out.
- The bots through each room and the whole game (`test/bot.ts`, `test/playthrough.ts`): **work in progress**. The bot (a map of each room for Monty alone, then a best-first search on copies of the game) takes the opening, rooms 0 to 7 and room 8's first piece of coal; room 8's other piece (up in the cavern) needs a way in from room 7 at a height the search has not found, and the rest of the game is not tried. The keys it finds will be pressed on the original pass by pass; until then the whole game is covered by the random and placed players of `test/lockstep.ts` and `test/opening.ts` and by `test/mechanics.ts`.
- Phase 4 (the picture): **done**: the screen is the original's byte for byte every pass (`test/lockstep.ts`) and the renderer's picture equals the ULA's picture of it (`test/picture.ts`); the death's rising picture (`test/death.ts`); ENHANCED's scenery (the screen without the sprites) and sprites in one colour each, gliding.
- Phase 5 (flow and screens): **done**: title, options (our keys), the opening (its death no longer freezes), game over and the ending's verses typed and scrolled as the original does (`test/screens.ts`); after game over or the ending the game goes to the title (the original to a new game's options).
- Phase 6 (sound): **done**: the tunes and effects from BEEPER's timing (`test/sound.ts`, `test/data.ts`).
- Phase 7 (the front end): **done** (`src/main.ts`, `map.ts`, `save.ts`, `info.ts`, `touch.ts`; `QOL.md`); ENHANCED has unlimited lives, no deaths from falls, no death loops, no colour clash and smooth motion. Left: the coal count, sparkles, and the reward (Chris's decisions: no air steering). The rebuilt game already keeps the screen as the original does (`src/field.ts`, compared byte for byte every pass), which Plan 4 starts from.

## A cross-check: the fan map

World of Spectrum's `Wanted-MontyMole.gif` (saved in the main checkout's `build/downloads/`, a map made in 1999 after Crash's) agrees with the world above: the shaft down the left, the tunnel along the bottom,
the pipe tunnel with the railcart, then the castle at the right. Its captions give the **intended rules**, which the code enforces generically: the bucket must be taken outside the miner's house or the coal is invisible (proved
here: the coal flags are only set by the opening scene); each room's object is a tool ("the whip-like object allows Monty to collect the candle", "the wooden club allows Monty to collect the small fish", "the scissors
allow Monty to collect the devil guarding the coal"): in the code a carried tool lets one touch of an enemy kill the enemy instead of Monty (`$92DF`), which is how these work; crushers can be walked through while their base does not touch him on the way
down; and "you can make Monty fall further than usual by jumping sideways and holding the down key" (so the fatal-fall rule has a jump-and-down exception: to read in phase 2). Treat the captions as hints, the code as the rule.
