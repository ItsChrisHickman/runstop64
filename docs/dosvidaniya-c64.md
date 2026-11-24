# Native C64 versions: the plan

Chris wants real Commodore 64 versions of our Monty games, as a goal after the web versions are polished: a **disk image
and a cartridge image** that run on a real C64 and in emulators. Two targets, in this order:

1. **Monty on the Run with our changes** (smaller, proves the toolchain): the original's own 6502 plus our changes, with the
   EASY / HARD switch every game has (AGENTS.md: the two differ only in the lives; every other change is on in both).
2. **Do Svidaniya Monty** (the big one): the same engine, our data, new mechanisms written in 6502, regions loaded as Monty
   crosses into them.

This is a plan, not a build. Sizes below are measured from our data (a throwaway script over `WORLD` / `MOTR`, method in
section 6) or estimated; estimates say so and are good to about +/-30% until step 1 measures them with a symbol table.

## The answers in short

- **Does it fit?** Yes, with little to spare. Monty on the Run with our changes needs about 6 KB more than the original has free; the
  hi-score code and table, the anti-hack screen and (if needed) the freedom-kit carousel give about 7-9 KB. Do Svidaniya Monty
  needs about 9-12 KB of new code and one region's data (9 to 14.5 KB) resident at a time, in the 22.5 KB the original gives
  to level data and decorations plus what the cut parts free. Pacific, China and Japan are the tight regions.
- **Biggest risks:** (1) the licence of the code we would build on; (2) the VIC bank's 176 sprite blocks, which the web
  build already fills; (3) frame time with several mechanisms at once, because MOTR does all its work in one interrupt;
  (4) tables with fixed sizes in the original's code (64 coins, 21 items) that Do Svidaniya Monty outgrows (282 coins).
- **Effort:** about 15-20 working sessions for Monty on the Run with our changes, 45-60 more for Do Svidaniya Monty.
- **Delivery:** a disk (fast loader, two seconds a region) and an EasyFlash cartridge (region copy under a quarter of a
  second); the cart is the easier of the two to test here.
- **Test it here first:** boot it on `tools/probe`, play by script, compare its state with the web engine.

## 1. Approach

### Build on MOTR's own 6502

Dave-Agent's reconstruction (`/tmp/motr`, clone of github.com/Dave-Agent/monty-on-the-run) has a `refactored/` source of 17,000
lines (names, namespaces, self-modifying code named) and a `byte-perfect/` source that assembles to the original program
(`reference.sha256`; `tools/motr-prg.mjs` already lays the original out from it without an assembler). Both use a small subset
of Kick Assembler: instructions, `.byte .word .text .fill .label .const .pc .namespace .macro .if`, `#import`. We take
the refactored source as the base, change and extend it, and our data replaces the original's tables in the formats our rooms,
tiles, decorations and sprites already use (`games/shared/monty/rooms.ts`: MOTR's own formats, which `buildRooms` writes).

**Decision for Chris (the policy so far was "only data is read, never its code": `games/montyotr/re/README.md`).** This plan
reverses that for the C64 build, which raises two things to settle before step 1:

- **Licence.** The reconstruction has no LICENSE file (all rights reserved by default), the code is Gremlin's 1985 program,
  and Rob Hubbard's driver is in it. The web remake took only data. A C64 disk made from the program's code is a derivative
  of it. The usual safe form: **release patches, not images** (a build script that takes the user's own `motr.prg` or the
  reconstruction and applies our changes; the reconstruction itself ships no binary either). That also holds for Do Svidaniya
  Monty, which runs on MOTR's engine. The alternative, a clean-room 6502 engine of our own, is roughly the whole of MOTR's code
  again (50-60 sessions) and is not planned. Ask Dave-Agent about the reconstruction's terms.
- **Two sources of truth.** The web engine (TypeScript) and the 6502 engine must agree. The web build stays the reference
  and the specification of every new mechanism; the C64 code is checked against it (section 6).

### Order

1. Toolchain: a Kick-subset assembler in TypeScript, the original rebuilt here and byte-compared; probe harness.
2. Monty on the Run with our changes (section 2), disk and cartridge.
3. Do Svidaniya Monty: engine generalised (regions), mechanisms (section 3), regions one at a time, as the web version was.

## 2. Stage 1: Monty on the Run with our changes (`games/montyotr/QOL.md`)

Hints are dropped (Chris: not useful here). The others, with sizes (code + data, estimated unless noted):

| Feature | How on the C64 | Size |
|---|---|---|
| EASY/HARD switch | one byte `easy` next to `cheatmode`; E on the pause screen; only the lives test it (5 bytes a test). Every other change below is on in both modes, so the extension rooms' cells are written into `room_exit_dest_tbl` (RAM, `$187A`) once | 60 B |
| Unlimited lives and continue (EASY) | the life-lost site skips the decrement when `easy`, and the lives digits are left off the score row; GAME OVER never comes, so no CONTINUE? prompt (HARD: game over to the title as it was) | 40 B |
| Back to room start, no death loops | a death restarts where Monty came into the room (the original already saves that position); we add "stable entry" bookkeeping: remember the last entry he had two seconds on his feet after (3 bytes and a frame counter) and use it on an early death | 150 B |
| Grace (150 frames after any resume) | a countdown byte tested in the death dispatcher; set by travel, back to room start, load | 60 B |
| C5 street: a crash restarts the room; hold fire for a longer hop | the crash handler reloads the current room (as a death does) instead of sending him to the tree; the hop's height/length table is selected by how long fire was held (patch of the C5 jump code) | 200 B |
| Ride the cloud | cloud's characters become a floor for Monty (the existing cloud code moves them 8 px at a time) | 130 B |
| Jetpack: only Monty is hit | the jetpack sprite's collision bit is masked out of the enemy-collision test | 40 B |
| runstop64's ten rooms (`$34`-`$3D`) | data only, in MOTR's formats: maps 971 B (RLE, measured), 10 room records 160, enemy records 52, decoration placements 44, 7 new decoration types 1,145, coins, 3 teleporters, sector names, 5 specials; the engine reads them as it reads any room; the only new code opens the way right of the start room | 2,600 B data, 80 B code |
| Pause screen, map, travel, back to room start | section 2a | 1,500 B |
| Save and continue | section 2b | 350 B |
| Freedom kit | no picking: the contents table preset to the five right items (jet pack, rope, passport, gas mask, barrel of rum: `fk_item_slot_idx` 1, 3, 11, 12, 15) and the pick step skipped; the carousel may stay | 60 B |
| Hi-scores | no name entry: the table is shown as the original ships it; the entry code (`CheckAndInsertHiScore`, `HiScoreNameInput`, `ProcessHiScoreName`), the 16 replacement names and the triggers go | frees 2-3 KB (estimate) |
| Title text | ENTER CONTINUE in the title's empty rows | 100 B |

Not ported: the ending's reward show and its routes (a web-only montage), smooth movement, touch controls, the saved-games screen.
Total new: about **3.5 KB of code and 2.7 KB of data, 6.2 KB**.

**What fits.** Free in the original: the dead tape-loader stub `$3E23-$3FF5` (0.5 KB), the dead music test harness
`$95A0-$95F9` (90 B), the bank's last 21 sprite blocks `$7AC0-$7FFF` (1.3 KB, measured: zero in the original). Freed by the
cuts: the hi-score code and its 1.4 KB table and replacement names, the anti-hack screen `$7100` (0.5 KB): about 4-5 KB
together with the 1.3 KB. Reserve: the freedom-kit carousel (code, 22 icons `$CC72`, attract graphics `$C9FA`): about 3 KB if
we also drop it. The 4 KB at `$D000-$DFFF` under the I/O area is RAM the game never uses, but it cannot hold anything the
running game reads (the game's interrupt needs I/O mapped in), so it is only a staging area. Verdict: **fits, margin about
2 KB, 5 KB if the carousel goes.** Step 1 replaces these estimates with measured section sizes from the symbol table.

### 2a. The pause screen, in 6502

MOTR has `PauseGameOnP`, a busy-wait inside the interrupt (SID volume 0) until P is pressed again. The map is the same
shape: another loop inside it. Nothing else runs while it is up, no raster work is needed, the VIC just shows what it is told.

- **The key: RUN/STOP.** Scan row 7 of the keyboard: write `$7F` to `$DC00`, read `$DC01`, bit 7 clear means pressed (RUN/STOP
  is the project's name). RESTORE's NMI (the original's "abandon game") is disabled so RUN/STOP+RESTORE cannot
  fall into the title by accident (on the cartridge it will mean "back to the menu", section 7).
- **What is saved.** The map is drawn on a *second screen* in the same VIC bank, so the playfield's screen RAM stays untouched:
  1 KB screen at `$7400` (inside the freed hi-score/anti-hack area; Do Svidaniya Monty finds 1 KB elsewhere in the bank, see
  section 4). Colour RAM (`$D800`, 1000 nibbles, fixed in hardware) is copied packed (500 B) to a buffer in main RAM, and the
  sprite enable (`$D015`), `$D018`, border/background and the zero-page words the map overwrites are saved (about 20 B). On
  exit all are written back and the frame continues. A pause then costs about 15,000 cycles each way, under a frame.
- **The charset.** The map is text: the game's own font (`$40-$7F`: letters and digits) plus four glyphs (a solid cell, a
  hollow cell, a cursor, a collected shimmer) written into four unused character codes for the duration and put back (32 B saved).
- **The map from the exit grid.** The grid is in RAM (`room_exit_dest_tbl`, 23 x 6; our rooms from row 2-5 columns
  19-22). One character a cell fits (23 columns of 40): a solid block coloured by the room's sector colour (a 10-entry table; the
  sector index is already per room), dark grey (the C64's colour 11) until visited, white flash on his room, the original's coin
  colours cycling on rooms with everything collected. "Visited" is one bit a room (the web's `found`; 62 rooms is 8 bytes), set
  by `LoadRoom`; "everything collected" compares the room's coin flags and items with the tables (about 100 B).
  Do Svidaniya Monty's world (29 x 7 of its 50 x 8) is shown through a window, two characters a cell, scrolled to the cursor's
  region as the web's map is (`regions`): moving the cursor into the next region scrolls the window there.
- **Under the map**: LIVES, ROOMS n/62, ITEMS n/20, CAKES, COINS (five-digit BCD to screen codes, the score's own routine),
  the sector name of the cursor's room (the existing `DisplaySectorName`), and the options: RETURN travel, B back to room
  start, E EASY (ticked when on), M music/effects, S save, RUN/STOP resume. LIVES only in HARD.
- **Travel through the game's own door.** A teleporter does: store Monty's x2, y, the exit column and map row, set
  `zp_room_exit`; `RoomLoop` then runs `LoadRoom` (`CheckTeleporterContact` is the model). Travel stores the *entry position of
  the picked room* (where he first came in: 2 bytes a room, recorded where `RoomLoop` already saves his position on a room
  change: 124 B table) and sets the same flag, with the teleporter dissolve played. Leaving the pause loop through that path
  rebuilds the playfield, so no screen copy is needed for travel. Back to room start is the same call with the current room's
  entry. After a pause that did not travel, nothing is rebuilt.
- **Cursor.** Joystick or cursor keys move over the visited cells (skipping empty ones).
- **Size.** About 1.5 KB: drawing the grid 150 B, cursor/input 200, panel text and numbers 450 incl. strings, option keys 150,
  save/restore of screen, colours and glyphs 250, visited/entry tables 130 B plus the `found` code, travel 120.

### 2b. Autosave

The web saves on every room entry; a disk cannot (seconds each). On the C64: **S on the pause screen saves, ENTER CONTINUE on
the title loads.** The state is small, about 100 B: room, exit cell, Monty's entry x/y, lives, score (5 BCD), coin flags
(64 bits), `si_collected_tbl` (20 items), kit, visited bits (8 B), `enhanced`, cheat. Disk: KERNAL `SAVE`/`LOAD` of one file,
done with the KERNAL banked in and interrupts off (the game runs with `$01 = $05`; it banks the KERNAL in only for
the save), scratching the old file first (`S0:` then `SAVE`; the 1541's `@0:` replace has a known bug). If no writable disk or no
drive answers, the screen says SAVE FAILED and play goes on. Cartridge: EasyFlash can write its own flash (one sector for the
save; its programming library writes it); on Ocean/Magic Desk carts there is no save (a short code could stand in). About 350 B.

## 3. Do Svidaniya Monty: what the web engine added beyond MOTR

Every item is a module in `games/montyotr/src` plus a list in `MontyData`. The 6502 version of each gets its code from the web
module (the specification) and a data record per instance, loaded with the region. Sizes are code estimates (bytes of 6502)
and the instance count in the world as built (rooms in all seven regions).

| Mechanism (web module, lines) | Notes for the 6502 | Code | Instances / data |
|---|---|---|---|
| Escalators (`escalators.ts`, 119) | a ride he cannot leave (like the lift's); path of cells over N frames; treads cycle characters | 450 | 3, 14 B each + tread frames |
| Icicles (`icicles.ts`, 78) | hang, shiver, fall 4 px a frame, break, regrow; sprites 1 and 2; kill like a crusher head | 350 | 5, 6 B each |
| Tunnels and trains (`tunnels.ts`, 104) | portals and pictures sweeping a room; thick walls, spans (bridge cars); draws characters every step | 700 | 8 (+ bridge cars), 12 B + picture rows |
| Cracking ice (`cracks.ts`, 39) | timer per cell run; 3 pictures | 220 | 2 |
| Lamp ledges and room effects | MOTR codes room effects in-line; a data-driven interpreter (conditions taken/kit; clear, place, openTiles, removeEnemy, wake) replaces that | 350 | 25 effects, 10 B each |
| charAnims (`charanim.ts`, 75) | scroll rings (rotate 8-byte characters one pixel, wrap over a ring) and cycle frames; the heaviest per frame (about 10,000 cycles for a long ring) | 380 | 26, 10 B + frames |
| Swimming (`swim.ts`, 27) | the jetpack's code with different rates; rooms flagged in the region header | 150 | 4 rooms |
| Rising lava (`lava.ts`, 54) | one rising run of cells, hold, drain | 300 | 1 |
| Pulses / torches / timed strikes (`pulses.ts`, 55) | cell block states idle, warn, live, spent by a period counter | 320 | 24 + torches |
| Dragon and multi-sprite creatures (`dragons.ts`, 85) | pieces on 6 sprites along one path. The TypeScript smooths with Catmull-Rom; the C64 uses a path table the build precomputes (a position a frame over a lap, about 700 B) and indexes it per piece with a gap | 250 | 1, about 700 B |
| Costumes as an overlay sprite (`items.ts` wear, `game.ts`) | sprite 7 over Monty with a per-frame offset table (36 frames) and a colour; the "worn" Monty is his frames with the head region cleared (a per-frame mask, about 40 B) | 200 | 6 costumes: 25 hat blocks (1.6 KB) each |
| Floats (`floats.ts`, 89) | a platform with a painted piece (a decoration) sliding along a span; carries Monty; cut at the span's ends | 450 | 5 |
| Cable cars (`cablecars.ts`, 107) | two cars of two sprites each, boarding on a foot, a bypass line | 500 | 1 |
| Parachute flight (`flight.ts`, 49) | the jetpack's code, slow sink, updrafts table | 220 | 3 rooms |
| Rolling boulders (`rollers.ts`, 57) | a sprite along a polyline, 4 pictures | 250 | 3 |
| Swinging vines (`vines.ts`, 84) | pendulum tip from a 64-entry sine table; the rope redrawn as characters every frame | 300 | 3 |
| Skewers (`skewers.ts`, 56) | a sprite following a creature slot through poses with kill boxes | 250 | 2 |
| Engine generalisation | a region loader and header, per-region room-id/grid mapping, a mechanism dispatcher over per-room lists, coin flags per region (below), completion (the finale) | 1,300 | |

Total **about 7.7 KB of new mechanism code plus 1.3 KB of engine changes, about 9 KB** (range 6.5-12 KB), added to the
3.5 KB of stage 1 that Do Svidaniya Monty shares (lives, pause, switch, save).

Engine changes that are not mechanisms and are easy to miss:
- **Coin flags.** MOTR keeps 64 coin flags (`room_entity_collected_tbl`, 64 entries `$02A6`). Do Svidaniya Monty has **282 coins**
  (Pacific 80, Andes 73, Rio 62), so flags are kept per region (a 96-flag buffer reloaded with the region) with 36 B of
  persistent bits for all regions.
- **Special items.** `si_collected_tbl` has room for 21; the world has about 43 items and foods: it moves to a larger table, so
  every operand that refers to `$0308` needs patching (the refactored source's labels make that a re-assembly).
- **Room-number special cases.** MOTR's code tests room numbers (C5 rooms `$31`+, jetpack rooms `$1D-$20`, room `$0C`'s bollard,
  `$1F`'s piledriver bases); Do Svidaniya Monty's region-local ids must not trigger them (data flags per region replace them).
- **Eight sprites a room** (no multiplexing in MOTR: sprite 0 the item, enemies up to four, Monty, mechanisms, sprite 7 the hat).
  The web data already names sprites; the budget test (section 5) must prove no room asks for more than eight at once.

## 4. Memory and multiload

### MOTR's map (`documentation/ARCHITECTURE.md` of the reconstruction)

| Range | Contents | Size |
|---|---|---|
| `$0002-$07FF` | zero page, enemy slots, score, coin/item flags, decor flags, screen scratch `$0400-$067F` | 2 KB |
| `$0800-$3FF5` | engine, front end, hi-scores, scroller (dead loader at `$3E23`) | 13.2 KB |
| `$4000-$7FFF` | VIC bank 1: charset `$4000`, screen `$4800`, sprite pointers `$4BF8`, enemy sprites `$4C00-$53FF` (4 slots x 8 frames, unpacked per room), Monty/lift/jetpack/C5/boat/flag/GAME OVER sprites `$5400-$70FF`, anti-hack `$7100`, hi-score table `$7300`, enemy types 32-34 `$7800` | 16 KB |
| `$8000-$95FF` | CBM80 header, Hubbard's driver, effects, song/pattern/instrument data | 5.5 KB |
| `$9600-$CFFF` | level-data index `$9600` (8 pointers: coins, kit icons, attract chars, tile library, room records, tile-map pointers, enemy-sprite pointers, enemy-record pointers), 52 RLE maps, 121 tiles, 24 enemy banks, enemy records, room records, kit icons, coin table | 14.5 KB |
| `$D000-$DFFF` | I/O (RAM beneath, unused) | 4 KB |
| `$E000-$FF72` | 97 decoration types and their placement list | 8 KB |

The level data is already **reached through pointers** (`room_tilemap_ptrs`, `room_enemy_ptrs`, `enemy_spr_ptrs`, the index at
`$9600`) and rooms through an offset table (`room_exit_offset_tbl`), so a region's data can be swapped in by loading its
file and rewriting the pointers, and a 50 x 8 grid is data, not code. The game's fixed tables (above) are the exceptions.

### Do Svidaniya Monty's layout

| Range | Contents | Size |
|---|---|---|
| `$0002-$07FF` | state, flags, scratch | 2 KB |
| `$0800-$3FFF` | engine core (MOTR's, minus C5, boat, freedom-kit picking, hi-score entry, arrested ending: about 4-5 KB freed, estimate) and new code | 14.3 KB |
| `$4000-$7FFF` | VIC bank: charset, screen, 4 enemy slots, Monty, items, hats, region sprites | 16 KB |
| `$8000-$95FF` | Hubbard's driver and the tune (a region's patch applied in place) | 5.5 KB |
| `$9600-$CFFF`, `$E000-$FF72` | the region's data, and any code that spills past `$3FFF` | 22.5 KB |

Code needed: about 8.5 KB kept engine + 3.5 KB stage 1 + 9 KB new = 21 KB, so **about 7 KB spills** past `$3FFF` into the data
zone, leaving **about 15.5 KB for a region**. The VIC bank has no room for code.

### A region's file (measured from our data, bytes in RAM)

Moscow, Siberia, China, Japan, the Pacific, the Andes and Rio. Each region's file is: maps (MOTR's run-length format: one byte
a run of up to 16; the original averages 104 B a room, ours 89-102), 16-byte room records, enemy records (7 B), coins (3 B),
items (4 B), crushers, decoration placements (4 B, room-ordered), the tiles it uses (8 B each), its decoration types (bitmap
8 B a character, a colour byte per character, 8 B of header), its creature banks (256 B a type, 128 where frames repeat), a
mechanism data estimate (400 B), the dragon's path (China, 700 B), the music patch, the hat staging (25 blocks, 1.6 KB) and
names/hint-less text (250 B).

| Region | Rooms | Maps | Records, coins, items, placements | Tiles | Decor types (B) | Creatures | + mech, tune, hat, text | **Total** |
|---|---|---|---|---|---|---|---|---|
| Moscow | 9 | 856 | 569 | 29 (232) | 27 (2,385) | 11 (2,304) | 400 + 350 + 1,600 + 250 | **8.9 KB** |
| Siberia | 9 | 895 | 1,016 | 22 (176) | 31 (2,101) | 9 (2,048) | 400 + 172 + 1,600 + 250 | **8.7 KB** |
| China | 9 | 863 | 2,756 | 25 (200) | 45 (4,020) | 11 (2,304) | 700 + 400 + 505 + 1,600 + 250 | **13.6 KB** |
| Japan | 11 | 1,123 | 986 | 44 (352) | 51 (5,411) | 12 (2,432) | 400 + 476 + 1,600 + 250 | **13.0 KB** |
| Pacific | 17 | 1,543 | 2,994 | 32 (256) | 50 (4,792) | 13 (2,304) | 400 + 314 + 1,600 + 250 | **14.5 KB** |
| Andes | 12 | 1,070 | 894 | 22 (176) | 24 (2,256) | 12 (2,432) | 400 + 424 + 1,600 + 250 | **9.5 KB** |
| Rio | 11 | 1,066 | 851 | 30 (240) | 32 (3,265) | 11 (1,664) | 400 + 313 + 1,600 + 250 | **9.6 KB** |

Total about 78 KB for 78 rooms (the plan said about 70; the Pacific is 17). Free per region: **about 15.5 KB**, so **the
Pacific, Japan and China fit with 1-2 KB spare, and nothing fits twice**: one region at a time, no double buffering. Two cheap
savings if it is tight: group decoration placements by room (a room byte once, not 4 B a placement: China 598 B, Pacific 563 B saved)
and keep a shared set of the decoration types several regions use resident. On disk the files are crunched (about 55%: the maps
and bitmaps compress well), so all seven regions are about 43 KB on disk plus the resident game, well inside a 170 KB side.

### How a region is loaded

- **Trigger.** Walking off a room that belongs to another region (the room's region number is in the grid's data) starts
  `LoadRegion(n)`: music off, screen blanked (the room's transition), the region file read into the data zone, tables/pointers
  rewritten, the tune patched, the hat/costume blocks put in place, the sector names loaded, the target room built by
  the ordinary `LoadRoom`. Going back across the border loads the first region again. Travel from the map to another region
  does the same.
- **Disk.** KERNAL `LOAD` is about 0.3-0.4 KB a second on a 1541: 13 KB would be half a minute. A **fast loader** with crunching
  (Krill's Loader, Spindle or Sparkle; check each licence; assembled on Chris's Mac, we only link it) makes it **1-3 seconds**
  from a crunched 6-8 KB, a pause with the screen blank, as in any multiload game.
- **Cartridge.** Region data copied from a bank, section 7: under a quarter of a second.
- **Costumes.** The hat in force stays resident across regions (the pool of 25 blocks is shared by all hats); the region's own
  hat is staged in its file and copied over the pool when the item is taken, no disk access. Loading a save into a region needs
  the worn costume: each region's file has the previous region's hat too (3.2 KB) or a small separate file per costume.
- **Sprite bank.** In the web build the bank is **already full: all 176 blocks from `$50` to `$FF` are non-zero** (84 blocks
  added by the world: 25 the hat pool, 59 items, icicles, cart, dragon, boulders, canopy, sun, cable car, skewer poses;
  they sit on MOTR's C5, boat, jetpack, flag and hi-score/anti-hack blocks). On the C64 the same blocks are reused, so what
  remains is a **block map**: which block holds what, per region, with the C5/boat/jetpack/GAME OVER sprites gone from
  Do Svidaniya Monty. If the shared set (Monty 36 frames, dissolve, GAME OVER, hat pool, finale) plus any one region does not
  fit in 176, the region's own sprites come with its file and overwrite a window of blocks.

## 5. The C64 budget to hold now in the web build

Each is checked by a test over `WORLD` in the web build (a new `test` listed in `tools/tests.mjs`) so a region cannot grow
past what a C64 holds. Current worst values are measured.

| Budget | Limit | Why | Today (worst) |
|---|---|---|---|
| Decoration kinds in one region | **255** (the type is a byte in a region's list) | MOTR's list is 4-byte records with a one-byte type | 51 (Japan); **the world has 280 in all: fine, the limit is per region**; the web's `decorRooms` is 16-bit and must stay a per-region index for the C64 |
| Decoration characters in one room | **100** (`$9B-$FE`), counting each type once | MOTR copies a type's bitmap into the next free characters; past `$FE` it draws garbage | 101, China room `$19` (**one over: fix now**); 97 Japan `$1C`, 96 Pacific `$35`, 95 Rio `$46` |
| Decoration types in one room | 16 | the per-room decor setup list | 16 (Siberia) |
| Tiles in a region | 48 (each 8 B) | 4 pointers wide in the region header | 44 (Japan) |
| Distinct tiles in a room | 8 | MOTR's room has codes 1-8 | 8 |
| Creature types in a region | 14 (each 256 B) | creature bank budget | 13 (Pacific) |
| Creatures in a room | 4 | four enemy slots, 8 frames each | 3 |
| Sprites in use in one room | 8, counting item, creatures, Monty, hat, mechanism sprites (dragon 6, cable car 4, icicles 2, boulder 1, skewer 1) | no multiplexing | to be counted: **the dragon room uses sprites 0 to 6** |
| Sprite blocks | the block map fits `$50-$FF` (176) with the shared set resident | the VIC bank | 176 of 176 already used in the web bank; a count of the blocks the pointers reach is needed |
| Coin flags in a region | 96 (all regions 282 persistent) | flag buffer | 80 (Pacific) |
| Specials (items and foods) in the world | 64 | the new `si_collected_tbl` | about 43 |
| Region footprint | **14,336 B** (14 KB) RAM | measured table above; 15.5 KB free minus a 1 KB margin | 14.5 KB (Pacific): **trim 200 B or group placements** |
| Rooms in a region / in the world | 17 / 255 | room id a byte | 17 / 78 |
| Mechanism instances per room | per-kind caps (2 icicles, 4 tunnels, 8 pulses, 4 floats) | fixed-size room lists | to be set from the data |
| Frame time | the worst room's mechanisms under 15,000 cycles (of 19,656) | MOTR does all in one interrupt | to be estimated by counting characters redrawn a step, per room |

The proposed test prints the table of a region's footprint and fails past the limits above; Do Svidaniya Monty's current
state fails two (China's characters, the Pacific's footprint), each a small fix.

## 6. Toolchain and testing, nothing installed here

**Assembling.**
- **Choice: a Kick-subset assembler in TypeScript** (`tools/asm/`, about 800-1,000 lines: two passes, labels and
  namespaces, `.byte .word .text .fill .pc .label .const .macro .if`, expressions with `<` `>`, `#import`). The reconstruction's
  sources use only that subset (counted: 12 directives; no scripting). Its first test is the one the reconstruction
  states itself: assemble `byte-perfect/src` and compare with `reference.sha256` (and with `/tmp/motr.prg` from
  `tools/motr-prg.mjs`), then assemble `refactored/src` and compare the region guards. Our new code is written in the same
  syntax in new files beside the reconstruction's. Runs here, niced, in milliseconds, and is the check every commit
  runs (the repo's rule: checks on goshow.me first).
- **Fallback:** Kick Assembler (Java 17+, `just build-all`) on Chris's Mac for a build the TS assembler cannot make yet; the
  same files, handed over like `scripts/needs-mac.sh`. No Java, VICE, acme, 64tass or cc65 is installed here.
- **Disk and cartridge writers** are file formats, also in TypeScript: `.d64` (35 tracks, directory, BAM: about 150 lines)
  and `.crt` (a 64-byte header and 8 KB CHIP packets, about 80 lines).

**Testing on `tools/probe`** (it boots `.prg`/`.d64`, serves KERNAL LOAD from the disk, models VIC raster and CIA, renders PNGs):
- **Boot and play by script** with joystick and key input; assert on memory (zero page `zp_room_id`, Monty `$35/$36`, the
  enemy slots `$0200`, `si_collected_tbl`), on screen RAM, and on rendered frames.
- **Frame by frame against the web engine** wherever the logic is the same: for MOTR the web engine is already checked against
  the original; run both from the same state with the same input and compare Monty, enemies and the screen's characters each frame
  (where our changes differ: listed and masked). For each new mechanism, the web module is the specification: same room, same
  input, same cell/sprite output per frame (the probe's `decodePicture` renders both with one function).
- **Multiload.** The probe has no drive, so a build flag gives **a KERNAL-`LOAD` loader** for tests (the probe serves it from the .d64);
  the fast loader is checked on Chris's Mac with VICE. The cartridge path is tested here: add EasyFlash bank registers to the probe
  (the probe already resets into a cartridge; about 60 lines), which tests region copies at speed.
- **Known gaps.** The probe is not cycle-exact and has had model gaps (AGENTS.md: extended colour mode, sprite-background
  collision reads). Frame time (section 5) and the loader need VICE (a cycle-exact `x64sc`) and a real C64 on the Mac side: a
  committed script that builds the images and reports back over SSH, as for CaptureM360.

## 7. Delivery: disk and cartridge

**Disk.** One `.d64` side per game: boot loader, resident game, region files (crunched), a save file. Fast-loader risks:
emulators with a virtual drive (no true-drive emulation) ignore fast loaders unless the loader falls back to KERNAL; Krill's
Loader does. Real hardware needs the user's write-enabled disk for saves.

**Cartridge (instant loading).** Region data copied from cartridge banks into RAM, no loader.

| Format | Banks | Fits | Saves | Emulators |
|---|---|---|---|---|
| **EasyFlash** (CRT type 32) | 64 banks of 16 KB (ROML `$8000` + ROMH `$A000`), 1 MB | everything below | **writable flash** | VICE, many others; real EasyFlash/EasyFlash 3 |
| Ocean type 1 (CRT type 5) | up to 64 banks of 8 KB (512 KB) | everything below | none | VICE and most |
| Magic Desk (CRT type 19) | 8 KB banks, ROML only | everything below | none | VICE, common |

Sizes: Monty on the Run with our changes about 64 KB resident + its tune + extension rooms 3 KB: 4-5 banks of 16 KB. Do Svidaniya
Monty: resident (21 KB code + 16 KB bank + driver 5.5 KB) about 45 KB, regions 78 KB uncompressed (no crunching needed on a
cart: it is a copy), together about 125 KB, 8 banks. Both games and a menu: **about 210 KB, a fifth of an EasyFlash**, under
half of an Ocean cart. **Recommendation: EasyFlash**, for the space, the flash saves, and because Ocean and Magic Desk
add nothing we need.

- **How the game runs from it.** On reset the cart's boot code (EasyFlash starts in Ultimax mode from bank 0's ROMH, per its
  programmer's guide) copies a stub into low RAM, switches the cartridge off (all RAM, as MOTR wants: it hides BASIC and KERNAL
  and owns `$8000-$BFFF` and `$E000-$FFFF`) and copies the game's resident image from banks to RAM (64 KB takes about
  1 second: a 16 KB copy is 230,000 cycles). The stub stays in RAM (the bank register is in I/O). `LoadRegion` then
  is a stub call: select the bank, map ROM, copy, unmap, about a quarter of a second for 14 KB.
- **Differences from the disk build.** No loader, no crunching, a CBM80 header is the cart's own (MOTR's anti-hack `$8000`
  header is removed either way: reset would show THAT WAS SILLY).
- **A menu cartridge, RUN/STOP 64.** Bank 0 holds the menu (about 2 KB of 6502: the project's font and the title, a list read
  from a directory: name, first bank, byte count, load address, entry, flags); a game's wrapper loads its image as above and
  starts it. Needs: (1) a directory format, written by one TypeScript script (`tools/crt`) from the games' images and a
  list; (2) each game given a way home: RUN/STOP+RESTORE (the NMI) re-enables the cartridge and resets, which the games'
  own NMI (abandon game) otherwise uses; (3) the game cleared of dependencies on a KERNAL that has been banked in (MOTR and
  Do Svidaniya Monty have none); (4) the licence question again: a menu carrying other people's originals is a private
  collection, not something to publish (the translated games run on the *originals'* binaries, which are not ours).
  Games from the translated set (Auf Wiedersehen Monty, Entombed...) would need the same wrapper work each; none is planned.

## 8. Music

Hubbard's driver runs natively: it is MOTR's own code, in RAM at `$8012-$8565`, with its data at `$8566-$9553`, played by
the game interrupt. The region tunes are **data edits** (`games/montyworld/src/music/`: a scale shift of every pitched note,
new settings for the lead instruments, and a pattern replaced by a folk-tune break of the same length in ticks). Measured:
the changed bytes of the .sid (5,694 B) are Moscow 277 (a longer break: the file is 76 B larger), Siberia 172, China 505,
Japan 476, Pacific 314, Andes 424, Rio 313.

- **The region file carries a patch list**: runs of (address, length, bytes) over the song data, applied after the load with
  music off (about 60 B of code to apply). The driver's code and tempo are untouched, so the original tune is the base.
- A longer replaced pattern (Moscow's Korobeiniki break) appends to the pattern area: `$9554` onwards holds the music API
  and the area up to `$95FF` is dead (90 B), so appended patterns must fit in the region's own data zone and the pointer is patched; or the
  patterns table is moved (data only). Measure each break's size when the tune is exported.
- The patch is built by the same TypeScript (`retune`) that the web version uses, so the C64 plays what the web plays.
- Sound effects stay the original's (`sfx_tbl`), music/effects choice as the original (the C= key on the title).

## 9. Steps and effort

A session is about a day of agent work with Chris's check-ins; the web build is the reference throughout.

| Step | What | Sessions |
|---|---|---|
| 0 | Decision on licence and release form (patches); ask Dave-Agent | 0 |
| 1 | Toolchain: the Kick-subset assembler (reproduces `reference.sha256`), symbol table export, probe harness that boots MOTR, a state-comparison harness against the web engine, `.d64` and `.crt` writers | 4 |
| 2 | MOTR with our changes, small rules: the EASY/HARD switch, lives, grace, no death loops, C5, cloud, jetpack, kit, hi-score cuts; each with a probe test | 5 |
| 3 | The ten extension rooms as data and their way in | 2 |
| 4 | Pause screen, map, travel, back to room start, save (disk, then flash) | 5 |
| 5 | Packaging: disk (fast loader on the Mac), EasyFlash cartridge, probe's cartridge banks | 3 |
| | **Monty on the Run with our changes** | **about 19** |
| 6 | Data exporter: `MontyData` to region binaries and header; region loader; generalised grid, flags, tables (coins, items, room-id cases) | 8 |
| 7 | The mechanisms (section 3), about 17 modules at 1-2 sessions each including their probe test against the web module | 20 |
| 8 | Regions one at a time: export, budget fit, play by the bot on the probe, Chris plays: Moscow first (escalators, icicles), 7 x 1.5 | 10 |
| 9 | Costumes, hats, region tunes, finale and ending, title, info | 7 |
| 10 | Disk and cart for Do Svidaniya Monty; the menu cart | 4 |
| | **Do Svidaniya Monty** | **about 49** |

Chris plays each stage before the next, as the regions were. If stage 1 shows the toolchain or the licence is a dead end, we stop
before the big build, as the Moscow gate did for the web version.

## 10. Risks, most serious first

1. **Licence and release form** (section 1): decides whether any image can be published, and whether patches are enough.
2. **Sprite bank.** The web bank has all 176 blocks in use; the real count of blocks that need to be resident at once is not
   known. A region may need a window of its own sprites in its file. Count first (the budget test).
3. **Frame time.** MOTR runs everything inside one interrupt of 19,656 cycles. The heaviest rooms (tunnels redrawing many characters,
   a ring of scrolling characters, a dragon, a float) plus Monty, four creatures and music could overrun; effects would be missed
   frames, a slowed tune. Mitigations: do character work every other frame (as `charAnims` do), precompute paths
   (dragon), cap instances per room, measure on `x64sc`.
4. **Memory.** The Pacific, Japan and China sit within 1-2 KB of the space; the new code's size is a +/-30% estimate. Mitigations:
   group decoration placements, share decoration types, drop the carousel, crunch nothing in RAM (crunching only helps transit).
5. **Self-modifying code and fixed tables** in MOTR (the refactored source names its operands, so relocation is by label; it
   is correct only if the refactored build is verified equal in behaviour to the byte-perfect: its README says it is not byte-equal and the
   reconstruction's own title code changed pixels once, as `re/README.md` records).
6. **Emulator and real-hardware differences we cannot test here**: the fast loader, EasyFlash writes, a real 1541, PAL/NTSC
   (MOTR is PAL: 50 Hz, 19,656-cycle frames). Chris's Mac and a real C64 test these.
7. **Two engines to keep equal** (web and 6502): each new mechanism has its test against the web module; a web change
   to a shipped region must be repeated.

## Measuring method

Region numbers come from a throwaway script over the web build's `WORLD` value (rooms of each `*_ROOMS` list: RLE length of each map in MOTR's run
format, records, placements, distinct tiles and decoration types used with their bitmaps, creature banks by type, the bank's changed
blocks against MOTR's, the costume blocks, the tunes' byte differences) and the original's own tables from the reconstruction's
`documentation/ARCHITECTURE.md` and `DATA_FORMATS.md`. Re-run it when the budget test exists (it becomes that test).
