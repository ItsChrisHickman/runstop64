# Moley Christmas: what the original does, and where

Notes on the 1987 ZX Spectrum game's code and data, read from the running original on our headless 48K model
(`tools/zx`: see `build/README.md` for the tape and how to remake the snapshots and dumps). No disassembly of the game has
been published; the labels and variable names below are ours, and every address is in the 64K the tape loads (`$6000-$FFFF`, started at
`$8100`). The 48K ROM is only used for the loader, for its font (`$3C00`-based, `$A2B5`) and, by the sound effects, as a
source of noise bytes (see Sound).

**Confidence.** *Proved* means a check compares our reading with the original running (`test/*.ts`). *Read* means the code
was followed and the address and purpose are known, but no check covers it yet. *Not understood* is said where it is.

**What the game is.** A free Your Sinclair cover-tape game, "Monty Free" in the loader's own text, by Teque Software
Development for Gremlin (Shaun Hollingworth and Peter Harrap wrote it; credits page: concept Paul Jackson, graphics P. Harrap,
music (128K) Benn Daglish). Monty the mole crosses **six screens** and the seventh is the Christmas card. In each of the first
five he takes the things lying about, avoids what moves, and reaches the exit; the sixth is a free-flying delivery to the
NEWS shop. One life lost = back to the start of that screen, five lives, an energy gauge that is a per-screen time limit.
Score on the HUD, high score kept while the tape is loaded. It is a single-load game: no level loader, everything is in the
40960-byte code block.

## Checks

Run `nice -n 15 node tools/test.mjs <file> ...`. They compare our model and our reading with the original; all are listed in
`tools/tests.mjs` with `needs` for the gitignored originals.

| Check | Compares | Result |
|---|---|---|
| `tools/zx/test/zex.ts zexdoc.com` / `zexall.com` | the Z80 core against Frank Cringle's exerciser (67 tests each, documented flags / all flags including X and Y) | 67 of 67 both, 46.7 billion T-states each (about 4 minutes each) |
| `tools/zx/test/cpu.ts` | T-states of 90 instruction forms, flags, interrupts (IM 1 and 2, EI delay, HALT), R, and that the disassembler and the CPU agree on the length of all 1520 opcode forms | passes |
| `tools/zx/test/machine.ts` | frame (69888 T, interrupt in the first 32), keyboard half-rows, Kempston, border and beeper T-states, ROM loader trap, .tap and .tzx, screen layout and colours, snapshot | passes |
| `tools/zx/test/rom.ts` | the real 48K ROM: FRAMES counts one per frame, the copyright line, J typed gives LOAD | passes |
| `test/boot.ts` | the tape loads through the ROM, the credits page comes up, a jump key starts play, 5 lives, the 2-frame main loop, 2 px steps, Monty's jump equals the table at `$8E12`, determinism, the saved states | passes |
| `test/rooms.ts` | all seven rooms drawn by the game's own routine (`$854A`) against a picture made from the data alone (map, attributes, tiles), byte for byte | 7 of 7 identical |
| `test/music.ts` | the 128K mode: the game finds the RAM, the player writes AY registers 0-10 every 2nd frame, none on a 48K | passes |
| `test/title.ts` | the credits picture the game unpacks (`$A500`) against one made from its data; the scroller's text | identical |

## How it runs (proved: boot.ts)

- **`$8100`** is `JP $8141`. `$8141` (DI) tests for 128K memory (writes through port `$7FFD`); on a 128K it copies the music
  player and tune from `$E000` into bank 1 and sets `$8112`. On a 48K `$8112` stays 0 and **there is no music**. It then
  builds the interrupt table: `I = $D0`, 257 bytes of `$5F` at `$D000`, so every interrupt vector is `$5F5F`, where it
  writes `JP $81A0`; `IM 2`. The interrupt routine `$81A0` only plays the music on a 128K and returns.
- **`$81BC`** (restart) sets `SP = $5E00`, calls `$A0CE` (the credits page, below), clears the screen (`$A2A8`), copies the HUD
  panel (`$B500` to `$5000`, `$BD40` to `$5A40`), zeroes the score, draws the lives and the gauge, enters room 0 (`$854A`,
  A = 0), sets Monty at x 4, y `$78`, lives (`$810C`) = 5, `$A2A1` = 0, and falls into the main loop.
- **Main loop `$822B`**: `HALT`, then one *pass*: bump the frame counter `$A2A0`; drain the gauge when `$A2A0` AND the room's mask
  (`$A2A2 + room`: 7, 7, `$1F`, 7, 7, 7) is 0 (`$8542`); update Monty (`$8CDD`); run the room's script (`$9234`); if `$A2A1`
  is set go to the ending (`$82DA`); if lives are negative go to game over (`$8292`); look for items (`$8643`); draw everything
  (`$87C4`). The pass takes more than one frame, so **the logic runs every 2nd frame, 25 passes a second** (proved: 95% of
  passes are exactly 2 frames apart; room changes take 3 or 4). This is the game's speed: Monty walks 2 pixels a pass,
  50 pixels a second.
- Drawing is **in place on the Spectrum screen, no double buffer**: tiles are written once when a room is entered; each pass the
  sprites are masked onto the screen and the cells they covered are put back two passes later (below).

## Memory map

| Address | What | Status |
|---|---|---|
| `$4000-$57FF`, `$5800-$5AFF` | Screen bitmap and attributes. Rows 0-17 (`y` 0-143) are the room, rows 18-23 the HUD panel | proved |
| `$5F5F`, `$D000-$D100` | Interrupt vector trampoline (`JP $81A0`) and its table (it sits over nine unused sprite frames, `$80-$88`) | read |
| `$6000-$6D7F` | The tile maps of rooms 0-5: 32 x 18 cells, one byte each, 576 bytes per room (`$6000 + room * 576`) | proved |
| `$6D80-$707F` | Room 6 (the Christmas card): 32 x 24 cells, 768 bytes | proved |
| `$7080-$80FF` | The attribute tables: 576 bytes per room 0-5 (`$7080 + room * 576`), 768 for room 6 (`$7E00`) | proved |
| `$8100-$8140` | Game variables and the eight entity records (below) | read |
| `$8140-$A4FF` | Code and small data (tables below) | read |
| `$A500`, `$A564-$B2BB` | Credits picture unpacker and its data (3416 bytes: 768 attribute bytes, then 8 bytes for each of 331 cells) | proved |
| `$B500-$BCFF`, `$BD40-$BDFF` | HUD panel bitmap (to `$5000`, 2048 bytes) and attributes (to `$5A40`, 192 bytes) | read |
| `$C000-$D7FF` | 192 sprite frames, 32 bytes each (frame `$BF` at `$D7E0` is blank) | read |
| `$D200-$D3FF` | Energy gauge images: 8 levels, each two frames (`$90-$9F`) | read |
| `$D800-$DF9F` | The room tile set: 8 bytes per tile, tile n at `$D800 + (n - 1) * 8` | proved |
| `$E000-$FAFF` | The 128K music player and tune: `$1B00` bytes are copied to bank 1 at `$C000` on a 128K (the last part of the copy is the first of the ending's tiles; dead weight on a 48K) | read |
| `$F800-$FDFF` | The ending's tile set (room 6) | proved |
| `$FE00-$FEFF`, `$FF00-$FFFF` | Bit-reverse table (to mirror a sprite) and sprite mask table, 256 bytes each (both checked against their formulas) | proved |

## Variables (`$8100-$8140`; read unless said)

| Address | What |
|---|---|
| `$8103` | address of the current room's tile map (`$6000 + room * 576`) |
| `$8105` | Kempston found by the credits page (`IN A,($1F)` 65536 times, bits 5-7 all 0) |
| `$8107` | the room, 0-6 |
| `$8108` | non-zero for the first pass of a new room (scripts set themselves up on it) |
| `$8109` | Monty's x, y at the start of the pass (put back if a move is refused) |
| `$810B`, `$811F` | Monty is on a rope going up / down (rope tiles `$08`, `$45`) |
| `$810C` | lives (5 at the start; a game ends when it goes negative; the HUD shows that many faces) |
| `$810D` | the energy gauge, `$7F` full, drawn from `$810D AND $F0` (8 levels); refilled on entering any room |
| `$810E-$8111`, `$8112` | high score (4 bytes, little endian) and the 128K flag |
| `$8113-$8116` | the score (32 bit); `$8118-$811B` is the scratch the decimal printer works in |
| `$811C` | Monty's state: 0 standing/walking, 1 falling, 2 jumping, 3 and 4 are used by room scripts (a forced move) |
| `$811D` | the jump's phase 0-23; `$811E` the direction pressed when the jump started |
| `$8121-$8140` | eight entity records of 4 bytes: x, y (pixels), frame, flags. Entity 0 is Monty; bit 7 of the flags = faces left |

## Rooms (proved: rooms.ts)

A room is a 32 x 18 map of tile numbers, an attribute table, and a script.

- **Tile map**: one byte per 8 x 8 cell, `$6000 + room * 576`, row by row. 0 is empty (nothing drawn); tile n is the 8 bytes at
  `$D800 + (n - 1) * 8`. Cell values `$EC-$EF` are **items** (four pictures); `$F0-$F3` are items already picked up, which
  the game turns back into `$EC-$EF` and redraws every time the room is entered, so everything is there again after a death.
- **Attributes**: the 576 bytes copied from `$7080 + room * 576` to `$5800`; ink, paper and bright per cell as the Spectrum
  has them. There is no flash. Item cells have their ink cycled every pass (`$8655`, 0-7) and set at random on entry
  (`LD A,R`).
- **Entering a room (`$854A`, A = room)**: sets `$8107`, resets the entities (all to frame `$BF`), `$8108` = FF, clears the
  room area (`$8709`), gauge = `$7F`, draws the map (tiles `$85A0`), scans for items (`$85DA`: up to 8 recorded at `$86D5`,
  4 bytes each: pixel x, y, attribute address; the count is `$86F5`). Room 6 is drawn over the existing screen without
  clearing it, with the other tile set, all 24 rows.
- **Tile meaning** is in code, not in a table (read): walking sideways is stopped by `$01 $3F $73` (`$8EFC`); a floor is
  any of `$01 $05 $06 $07 $3F $13 $18 $19 $1A $40 $41 $42 $55 $7B $73 $9B` (`$8F79`), and `$55`, `$7B` are special
  (`$8F47`); ropes are `$08`, `$45` (`$8EBF`); `$01 $3F` end a move up (`$8DDA`). Items are `$EC-$EF`.

The six rooms (their scripts are a jump table at `$927A`; a second table at `$926E` says where to restart each room after a
death or a time-out). Read, not proved:

| Room | Picture | Script | Items | Leaves by |
|---|---|---|---|---|
| 0 | Gremlin Graphics office, rope lifts, cassettes, monitors | `$9286`: entities 1-5 are a lethal and four draining or lethal walkers and bobbers, entity 6 is the exit (the hanging cassette, frame `$1C` from x `$64`, y `$10`, which drifts right) | 7 | touching the exit entity: with items left it kills, with none left +200 and room 1 (`$934C`) |
| 1 | recording studio: ABLEX tape machines, a big reel-to-reel | `$9378`, helpers `$94C3-$94E4` (bulbs and machines light in sequence) and the exit object that comes down at `$9526` (it kills if it gets to y `$50`) | 3 | touching the exit object: items left kills, none left +300 and room 2 (`$9549`); `$936A` is room 0's restart |
| 2 | a cassette duplicating deck with hanging cassettes; a puzzle with a rising and falling platform built by rewriting the map (`$97FC`, `$9800-$98FF`) | `$95E4` | 0 | a prize (+400) and room 3 at `$96E5` |
| 3 | the M1: three lanes of cones and cars, a street lamp; the lanes wrap (leaving right on one lane enters the next at the left, `$9AC7`) | `$9906` | 0 | bottom lane right edge: +500, room 4 (`$9ADD`) |
| 4 | an office with a staircase of cassettes, a desk, a ghost | `$9B22` | 4 | exit object, items all taken: +600, room 5 (`$9BBA`) |
| 5 | a street with traffic and the NEWS shop | `$9C49` with the traffic `$9CF4` | 0 | **Monty flies** (`$8D0E`: all four directions, 2 px a pass, x 4-$ED, y $1A-$70, no jumping): picks up from the pile at the left (`$9C8C`), carries it to the shop at the right (`$9CB1`; the HUD shows it); the shop's picture grows over frames `$25-$28`; the fourth delivery gives +1000 and ends the game (`$9CDC`, `$A2A1` = $FF) |
| 6 | the Christmas card: "MERRY CHRISTMAS FROM MOLE" with a tree and Santa, "WATCH OUT FOR GREMLINS AMAZING RELEASES" | drawn by `$82DA` | | key to the credits page (`$81BC`) |

Per-room scripts are 100-300 bytes each and use a handful of shared primitives (read): `$9E5B` and `$9E32` (a walker: step 2 pixels
and turn at a wall, flipping bit 7 of the flags), `$9DF3` (bob up and down by the table at `$9E1A`, the same numbers as the
jump), `$9E84/$9E92` (place an entity and set its frame from the animation phase `$9ECC`, which flips between two frames every
pass: `$9EA0`), `$9586` (touching Monty kills), `$956D` (touching Monty drains one gauge step and plays sound 3). The
random numbers are the Z80's **R register** (`$9ECE`: `LD A,R`), so they depend on the exact instruction timing.

## Entities, sprites and drawing (read)

- **Records**: `$8121 + 4 * n`, n = 0..7: x (0-255), y (0-191), frame, flags. Frame `$BF` is "not there". Frames are 16 x 16,
  1 bit per pixel: 32 bytes at `$C000 + frame * 32` (16 rows of the left byte, then 16 rows of the right byte). Monty is
  frames 0-9 (walk 0-3 (`$9125` table, toggled each pass by `$90A3`), jump, climb), deaths `$B0-$B2`, passers-by and cars
  `$0A-$1F`, cassettes `$20`, a reel `$6F`, vehicles `$53-$5F`; see the sheet from `re/sheets.ts`.
- **Colour**: a sprite is one colour; it takes the attribute of the cell it is over. Sprites never change attributes.
- **Drawing (`$87C4`, per entity `$8931`)**: the 16-bit row is shifted by `x AND 7` (self-modified `JR` into a chain of `ADD HL,HL / ADC A,A`
  at `$897A`, one for each of the three screen bytes). The art is stored facing left: it is drawn as stored when bit 7 of the flags is set
  (he moved left) and mirrored otherwise, by swapping the two bytes of each row and bit-reversing them with the table at **`$FE00`**
  (checked: entry n is n with its bits reversed). It is put on the screen as `(screen AND mask(b)) OR b` per byte, `mask` the table at
  **`$FF00`**, which is `NOT (b OR b << 1 OR b >> 1)` within the byte (checked for all 256): every sprite pixel clears itself and its neighbours
  to the left and right in the background first, so a figure has a thin outline of the cell's paper colour and no mask data is stored. Room
  5 draws with OR only (`$8A38`).
- **Erasing**: no save-under. Every cell an entity covers (3 x 3) gets a counter of 2 in a table of 18 x 32 bytes at
  `$8A9C` (end marker `$8CDC`); each pass counters are decremented and a cell reaching 0 is redrawn from the tile map
  (`$889C-$8900`, blank for tile 0). So a sprite leaves for two passes the cells it has left; for a rebuild this is just
  "tiles first, then sprites, every frame".
- **Collision** between entities is a box test (`$87A7`): |dx| < 16 and |dy| < 16. Items are tested against Monty's four corners (`$8643`: within 8).

## Monty (read, with the jump proved)

- **Input (`$915F`/`$9196`)** returns a byte with the same bits for every device: bit 0 right, 1 left, 2 down, 3 up, 4 jump/fire.
  Keyboard: **Z left, X right, O up, K down, SPACE jump** (`$9200`; the credits page says so), tried first; if nothing is
  pressed, Kempston on port `$1F` (only if the credits page found one, `$8105`), then Sinclair Interface 2 (keys 6 7 8 9 0,
  port `$EFFE`: 6 left, 7 right, 8 down, 9 up, 0 jump): "joysticks don't have to be selected". Left and right together, or up
  and down together, make the whole byte 0 (`$9182`).
- **Walking** (`$8E62`, `$8E79`): 2 pixels a pass left or right if the cell ahead is not solid, stopping at x 2 and `$EE`.
  Bit 7 of the flags is set when he moved left (`$9009`). The frame is chosen at `$9009`: walking frames 0, 1, 2, 1 advancing
  every second pass while he moves (`$90A3`, counters `$9124-$9126`), jump frames 6 and 7 by the phase (table `$9129`), rope
  climbing 3-5 going up and `$37-$39` going down, `$B0-$B2` dying.
- **Jump (proved)**: SPACE while on the ground (`$8D66`) sets state 2, phase 0 and remembers the direction; each pass adds the
  next number of the table at **`$8E12`** to y: `-4 -4 -4 -3 -2 -2 -2 -1 -1 -1 0 0 0 0 1 1 1 2 2 2 3 4 4 4` (24 passes, up 24 pixels,
  and back to the same ground), moving sideways 2 pixels a pass in the pressed direction meanwhile. Hitting a ceiling
  (`$01`/`$3F`) puts his position back and sets the phase to 23 minus the phase (`$8DCA`), so he starts to come down. The table at `$8E22-$8E29` (`-5 -5 -4 -4 -3 -2 -2 -1`)
  is a faster take-off that nothing was seen to use.
- **Falling**: no floor under (`$8F26`) gives state 1, y + 3 a pass until a floor tile is under his feet; then y is rounded down to
  a multiple of 8 (`$8FA9`). There is no fall damage.
- **Ropes**: on a rope tile O / K move y by 2 (`$8E99`, `$8EE3`), the rope also holds him against falling.
- **Death (`$9592`)**: sound 0, lives - 1, the face is removed from the HUD, Monty is drawn as frames `$B0`, `$B1`, `$B2` (a frame
  each), then blank for 25 frames, then the script's restart address is jumped to with the stack reset (so the room starts again:
  items back, Monty at the room's start point, as x, y: room 0 (4, `$78`), 1 (4, `$78`), 2 (4, `$68`), 3 (`$18`, 8), 4 (`$EE`, `$78`), 5 (`$28`, `$70`)).
  Causes: a deadly entity (`$9586`), a lethal tile (see scripts), the gauge running out (`$9246`: the screen's attributes
  are cycled by `$A2D1`, then the same death), touching the exit with items left, and a time-out in a script.
- **Game over** (`$8292`): lives negative; "GAME OVER !!!" at the top of the room, its colour cycling for 100 frames, then `$81BC` (the credits page again).
  Nothing is kept except the high score.

## Score, lives, gauge, HUD (read)

- Score is 32 bit at `$8113`, added by `$9EE5` (DE = amount), shown as up to 4 digits at the HUD by subtracting the weights at
  `$A00B` (1000, 100, 10, 1). The values seen: **35 for an item** (`$868B`), exits **200, 300, 400, 500, 600** and the final **1000**
  (`$9356`, `$9550`, `$96E5`, `$9ADD`, `$9BBA`, `$9CE3`): the largest score the code read so far can give is 14 x 35 + 3000 = 3490. The high score
  is updated at the start of the next game (`$9F43`), compared from the top byte down.
- Lives: five faces at the HUD (`$8740`, 3 cells apart from `$50A1`), `$810C` counts down; no extra lives.
- The gauge (E to F dial, drawn by `$876D` from `$D200`) is the time left in the room: `$7F` at entry, one step every 8 passes
  (every 32 in room 2) = about 40 seconds (about 160 in room 2), 8 drawn levels. At empty the game kills Monty as above.
  Hazards that use `$956D` take one step from it.
- HUD (`$B500`, `$BD40`): a yellow panel with SCORE, HIGH, the faces, a box for the carried item (`$50B3`) and the dial.

## Title (the credits page), game over and ending (read)

- **Credits page** (`$A0CE`): the Gremlin logo picture and the credits text, in the picture. It is unpacked by `$A500` from `$A564`:
  768 attribute bytes, where bit 7 means "this cell has a bitmap" and 8 bytes of bitmap follow in a second stream after the
  attribute stream. Below it a one-line scroller (`$A277`, text `$A111`, 8 pixels shifted per call by `$8367`) says "Welcome Your
  Sinclair readers to the Monty game given with the magazine... Pre-defined keys are Z-left, X right, O up, K down, SPACE jump...
  Sinclair and Kempston JOYSTICKS don't have to be selected, just pick 'em up and use 'em... Press a JUMP key/button to start".
  A jump key (`$A106` loop on `$915F` bit 4) ends it and starts the game. Black border (`$A0CF`).
- **Ending** (`$82DA`): room 6 over a cleared screen (the card), the Gremlin releases scroller (`$8391`, "Coconut Capers - Featuring
  Jack The Nipper ... Samurai Trilogy ... Compendium ... Gary Linekers Superstar Soccer ... Mask II ... Basil the Great Mouse
  Detective ... Blood Valley ... Alternative World Games ... Night Raider ... Deflektor ... Masters of the Universe - The Movie
  ... Tour de Force ... Gary Linekers Soccer Super Skills ... Hill 19") at `$481F` and attribute cycling on the HUD rows
  (`$835C`), until any key is pressed (`$82F4`-`$8357`: wait for all keys up, then for a key), then `$81BC`.
- Text on screen is drawn with the ROM's character set (`$A2B5`: `$3C00 + char * 8`): only the characters the game prints would
  need to come with a rebuild (the ROM cannot be shipped).

## Sound (proved the structure, read the sources)

- **48K: beeper effects only, no music.** Seven blocking routines (`$A017`, A = 0-6, table `$A0C0`; 0, 1, 2, 3 and 5 are called, 4 and 6 never): 0 death (`$A06B`, 59 toggles,
  44 ms), 1 time-out/short-circuit noise (`$A04E`, 1139 toggles, 265 ms), 2 pickup (`$A033`, descending bleeps, 30 ms), 3 energy hit
  (`$A086`, 2 ms click), 4 (`$A0AF`, not called), 5 mechanism blip (`$A09C`, 4 ms, called from rooms 1 and 2), 6 (`$A097`, not called).
  `re/sounds.ts` measures them. Effects 1, 3 and 4 use **bytes of the 48K ROM as the noise source** (`LD A,(HL)` from address
  0 or from R, ANDed with `$10`): a rebuild cannot copy the ROM, so it records each effect's speaker toggles on our model
  (a list of T-state gaps, about 1300 numbers for the five used) and plays that, which is exactly the original's sound.
- **128K: AY music** by Benn Daglish (proved on the model's optional 128K mode: `test/music.ts`, `re/music.ts`): one tune, started
  by the first interrupt after the 128K test, played by a 25 Hz driver (`$E000-$FAFF`, relocated to bank 1 at `$C000`; its per-step routine
  at `$C09D`, the tune at `$C75B`, AY writes through ports `$FFFD`/`$BFFD` at `$E034`). It writes registers 0-10 every second frame
  (tone, noise period, mixer = `$B8`, volumes), never the envelope, and the register image repeats after 9217 steps, about
  **6 minutes 9 seconds**; nothing selects another tune. The beeper effects are played over it on a 128K, and on a 48K the
  music is simply not there (the same game, `$8112` = 0).

## Not understood, and what to look at next

- The exact scripts of rooms 1 and 2 (the cassette lifts, the rising platform and its map rewriting at `$97B5`, `$9800-$98FF`) and
  who kills in each room: stage 3's job, with the entity table watched over time (`re/watch.ts --mem 8121:32`).
- Which tiles are lethal (rooms 0 and 4 have floor and wall tests only; the lethal things are entities).
- The random events (cars in room 3 and the traffic in room 5) use the R register, so lockstep needs R fed from the original.
- Whether any key (other than SPACE) is read by the credits page; the key-scan routine at `$A341` and its tables at `$A3A0-$A4A0` are not called.

## Tools

`tools/zx/zxprobe.ts` (boot and drive), `tools/zx/zxdis.ts` / `disasm.ts` (Z80 disassembler, `--map` to list only executed
code), `re/profile.ts` (coverage, ports; `RANDOM=seed` plays at random; `MAP=` accumulates), `re/watch.ts` (watch addresses and
memory), `re/shots.ts` (a picture and a state of every room, `AT=` to enter by a room's own routine), `re/sheets.ts` (sprite and
tile sheets), `re/sounds.ts` (the effects), `re/music.ts` (the 128K music's register stream), `re/image.ts` (the pristine 64K image).
