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
| `test/data.ts` | the committed data (`src/data/`) made again from the tape, the ROM and the game in play; every block against the original's memory at the credits page and in each room's state (maps differ only in item cells and room 2); the 66 glyphs against the characters the game's character routine draws (credits scroller, ending, game over); every one of the 192 sprite frames, both ways round, at 8 shifts and near the right edge, drawn by the game's own routine `$8931` (rooms 0 and 5) against `src/sprite.ts` | 31 of 31 |
| `test/lockstep.ts` (+ `lockstep-core.ts`, `shake.ts`, `random-player.ts`) | the whole rebuilt game (`src/game.ts`: Monty, the six room scripts, items, score, lives, gauge) against the original running, **every pass**: Monty, the whole entity table (7 records), score and high score, lives, gauge, pass counter, the scripts' animation (cycle, counter), the items (records and count), the room's map (6 rooms; room 2 rewrites its own) and attributes (item ink, room 1's lights), every variable the six scripts keep, the picture in the HUD's pocket box, the beeper effects asked for, the outcome (playing, game over, ending) and the random bytes asked for (the original's R reads are fed in) | random players in every room, the scripts' state shaken, players at each exit, and placements round all 302 tile kinds: 0 differences (numbers in `docs/moley-plan.md`, stage 3) |
| `test/playthrough.ts` (+ `players.ts`, `bot.ts`) | a bot plays on the original and the rebuilt game is compared every pass: room 2 from its start to its exit (the puzzle, the prize, +400), room 5 from its start to the ending (four deliveries, +1000), and the whole game from room 0 to the ending (score 3490), and the whole game with no life to spare (killed in room 2: the game over) | 926, 606, 3963 and 1172 passes, 0 differences |
| `test/newgame.ts` | the first state of a game from the credits page, and of a second game after a first has been played to its ending (high score kept, maps and script variables as the first game left them) | no differences |
| `test/stray.ts` | the original's death in room 2 jumps to `$9904` or to the restart by the puzzle's counter (the one place the rebuild differs); the rebuilt game restarts the room | rule holds in 13 of 13 cases |
| `test/picture.ts` (+ `picture-core.ts`) | the rebuilt picture (`src/display.ts`: the Spectrum's screen memory changed by the original's own steps) against the original's screen memory, bitmap and attributes, in lockstep: every pass, and every frame the original shows (new, old, torn between, or different), the death and time-out pictures in order. Random players, shaken states, exits, Monty round every kind of tile, the bot in rooms 2, 5 and the whole game | slow set: see "The picture" in `docs/moley-plan.md`; 0 passes and 0 frames differ |
| `test/view.ts` | the picture on c64kit's renderer: Spectrum palette, black border, centred 256 x 192; ORIGINAL equals the screen; ENHANCED (no clash) equals ORIGINAL outside the sprites' boxes and shows every sprite pixel; the glide is even at every half frame, whole pixels when `snap`; no original needed | passes |
| `test/game.ts` | the rebuilt game alone: `snapshot()` and `restore()` bring it back exactly (38 snapshots, 60 passes played twice each), the seeded generator | passes |
| `test/flow.ts` (+ `flow-core.ts`) | the whole flow (`src/flow.ts`, `src/screens.ts`) against the original, every frame (same / a frame apart / torn / a screen being drawn / different): the credits page from boot (the jump key held through the wait, then pressed), a game started, the pass in which the last delivery is made, the card (a key held, and not), any key to the credits page, a second game; the passes in which the last life is lost (time out, hazards in rooms 0, 1, 3 and 4, the bot in room 2) with the death pictures, GAME OVER and the credits page; the rebuilt last pass is the original's, the R bytes are the ones it read | 2,847 frames: 1,774 same, 474 a frame apart, 443 torn, 156 in a screen being drawn, 0 different (a frame apart and torn are mostly the passes of the second game: the draw lands late; the credits page, the card and every death picture are the same, except that a game over's text and the credits scroller after it are a frame apart in 2 of 6) |
| `test/flow-steps.ts` | the flow and screens alone (no original): the scrollers' cadence and their text going round, who starts a game, GAME OVER's length and colours, the card's wait for keys, the high score kept, determinism, the view | 29 checks pass |
| `test/info.ts` | the info card's credits and description; not in the registry yet | passes |

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

## Rooms (proved: rooms.ts; the scripts: lockstep.ts)

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

The six rooms (their scripts are a jump table at `$927A`; a second table at `$926E` is each room's restart routine, see "How a pass ends"). Proved by `test/lockstep.ts`, `test/playthrough.ts` (all six played to the end) and `test/newgame.ts`:

| Room | Picture | Script | Items | Leaves by |
|---|---|---|---|---|
| 0 | Gremlin Graphics office, rope lifts, cassettes, monitors | `$9286`: entity 1 a lamp that kills, 2 and 3 walkers that drain, 4 a walker that kills, 5 a bobbing walker that drains, 6 the exit (a cassette) | 7 | the cassette hangs at x $64, y $10 and drifts right (1 pixel a pass, or one in 16 while items are left); at x $D8 it falls to the floor, shows 4 pictures, then is gone and the room kills; touched on the floor: items left kills, none left +200 and room 1 (`$934C`) |
| 1 | recording studio: ABLEX tape machines, a big reel-to-reel | `$9378` | 3 | a reel walks to and fro and kills; the machines light in sequence (below), two of the steps kill in front of the machine; then two reels spin for 100 passes and the exit object comes in along the top, sinks and kills at y $50; touched from y $38: items left kills, none left +300 and room 2 (`$9549`) |
| 2 | a cassette duplicating deck with hanging cassettes; a puzzle with pistons built by rewriting the map | `$95E4`, pistons `$97FC`, `$97B5`, puzzle `$9706` | 0 | stand on the one spot (x $2E, y $38) to start the puzzle; the prize at the right; +400 and room 3 (`$96E5`) |
| 3 | the M1: three lanes of cones and cars, a street lamp | `$9906` | 0 | the lanes wrap (`$9AC7`); bottom lane right edge: +500, room 4 |
| 4 | an office with a staircase of cassettes, a desk, a ghost | `$9B22` | 4 | the staircase collapses in steps; the exit opens for 100 passes (then Monty is killed); items all taken: +600, room 5 (`$9BBA`) |
| 5 | a street with traffic and the NEWS shop | `$9C49` with the traffic `$9CF4` | 0 | **Monty flies** (`$8D0E`: all four directions, 2 px a pass, x 4-$ED, y $1A-$70, no jumping): picks up from the pile at the left (`$9C8C`), carries it to the shop at the right (`$9CB1`; the HUD pocket shows it); the shop's picture grows over frames `$25-$28`; the fourth delivery gives +1000 and ends the game (`$9CDC`, `$A2A1` = $FF) |
| 6 | the Christmas card: "MERRY CHRISTMAS FROM MOLE" with a tree and Santa, "WATCH OUT FOR GREMLINS AMAZING RELEASES" | drawn by `$82DA` | | key to the credits page (`$81BC`) |

### The scripts (proved: `test/lockstep.ts`, `test/playthrough.ts`; `src/rooms/`, `src/primitives.ts`)

**A pass** (`$822B`): count (`$A2A0`), drain the gauge if due (room 2: every second pass unless the puzzle has started), Monty's move,
the scripts' animation step and the time-out check (`$9238`), the room's script, then (if the game is not over) the items (`$8643`) and
the picture; the first pass of a room is flagged (`$8108`, cleared at the end of the pass). **How a pass ends**: a death or a way out does
not return: it resets the stack (`LD SP,($95E2)`) and jumps to the room's restart routine, which enters the room again, puts Monty
at the arrival place (below) and jumps back to `$9238`, so **the new room's script runs from its start in the same pass**, with the
animation stepped a second time. `$9592` is the full death (sound 0, a life less, Monty's three death pictures, ending on none),
`$95C8` the short one (sound 1, no pictures; only the street lamp uses it); both clear Monty's state and phase and end with `JP (HL)`,
HL being the restart address the caller loaded. The arrival places (the restart routines, which an exit also uses after its score):

| Room | Monty at | also |
|---|---|---|
| 0, 1 | x 4, y $78 | |
| 2 | x 4, y $68 | the pocket box shows frame `$6F` |
| 3 | x $18, y 8 | pocket frame `$24`, Monty's state cleared |
| 4 | x $EE, y $78 | pocket empty, state cleared |
| 5 | x $28, y $70 | state cleared |

**Shared primitives**: the touch test `$87A7` (both distances under 16); `$9586` kills on touch; `$956D` drains one gauge step and sounds 3;
`$9E84` / `$9E92` put a thing at x, y with a picture from the cycle `$9ECC` (0 1 2 1, stepping every second pass) or the counter `$9ECD`
(0 1 2 3); a **walker** (`$9E5B`, `$9E32`: the same with the counter) is placed on the first pass, steps 2 pixels the way flags bit 7 says
with Monty's own wall and edge rules (`$8E65`, `$8E7C`) and turns round when the step is refused; the **bobber** (`$9DF3`) adds the
jump table's numbers to y from one counter (`$9E19`) shared by the whole game. Scripts keep their variables in the code's own bytes, set up
on the room's first pass **except** room 2's pistons, which keep their place and the map they have rewritten across lives and games
(the original does not reload its maps), and room 0's drift counter (`$9377`), which is never reset.

**Random numbers** are the Z80's R register and are read in two places only: `LD A,R` at `$861A` (the ink of each item as the room is
entered, `AND 7`, in the order the cells are met) and `$9ECE` (everything else: piston 1's wait, the cars' and the lamp's waits in room 3,
the traffic's waits, pictures and lanes in room 5). Every use masks the byte, so the rebuild asks a `Random` for a byte (`src/random.ts`).

**Items**: a record of 4 bytes at `$86D5` (x, y, attribute address, 0 when taken), count at `$86F5`; each pass (`$8643`, after the script) each item's ink
goes up one (`AND 7`), and one within 8 pixels of any of Monty's four corners (x, y; x + 8, y; x, y + 8; x + 8, y + 8) is taken: +35 (`$23`), sound 2, its attribute cell
$47, its map cell +4. Everything is back, in a new random ink, when the room is entered.

**Room 1** (`$93C2`-`$94E5`): six counters (`$94DF`, `$94E0`, `$94E3`, `$94E1`, `$94E4`, `$94E2`, filled to `$68`, `$18`, `$58`, `$18`, `$58`, `$28` in that order) each
cycle a block of attribute cells (bulbs and machines) one pass at a time; the steps that fill to `$58` also kill in a box in front of the machine
(x `$23`-`$4F` and `$52`-`$7D`, y `$3B`-`$48`) from the counter's 8th pass; sound 5 when the last is full (`$94DE` = 1). Then (`$94E5`) two reels
spin at x `$80` and `$70`, y `$18` (the first kills once the counter has reached 5, the second once it has reached 4), for 100 passes (`$94DE` counts to `$64`), then the exit object.

**Room 2** (`$95E4`, helpers `$97FC`-`$98CE`, puzzle `$9706`, prize `$965C`):
- **Piston 1** (`$97FC`; `$9900` its head's place in the map, `$98FE` direction, `$98FF` wait): a column of tiles starting under the ledge (row 10, column 4): each pass
  (when the wait, a byte counting down through zero, is over) the head `$F7 $F8 $F9` moves one row down and the row it left becomes shaft `$F4 $F5 $F6`, until the cell
  below the head is not empty; then (`$98FE` = $FF) the head goes back up a row a pass, clearing the row below, until the cell above is not shaft, and the wait is a
  random `R AND $7F OR $10` passes. It kills Monty if his columns (x / 8 + 2 minus the head's column, 0-4) cover it and his row is the head's or the one above.
- **The spot**: when Monty is at x $2E, y $38 (and the puzzle has not started) a reel appears at (`$38`, `$38`), the pocket empties and `$9904` (the puzzle's counter and, while it
  is not 0, the hold on the gauge) goes to 1. Each pass the counter goes up; from 10 (sound 5 once) the two reels (`$38`, `$38` and `$B8`, `$39`) spin and kill; at `$3C` a cassette
  rises from y `$80` to `$70` at x `$9A`, goes right 2 pixels a pass to x `$DC` and goes (`$9730`), the counter is 1 again, and the **prize** steps on: its first half (x `$DC`, y `$70`) shows `$21`, `$22`, `$23`, `$24` one
  round after another, then the second (y `$60`) the same, and one round after that `$97B4` is set.
- **The prize** (`$965C`): while a half shows `$21`-`$23` (or the first shows `$24` while the second is not there yet) touching it kills; when the second half shows `$24`,
  touching either half is the way out (+400). When `$97B4` is set **piston 2** (`$97B5`, `$9902`, column 27 from row 10) grows a row a pass and **kills Monty when it meets the
  floor** (6 passes): the prize must be taken before (it shows `$24` one round before `$97B4` is set, so there is time).
- Two walkers kill (`$969D`: entity 6 at y `$28`, x `$18`-`$52`, moving twice a pass; entity 7 at y `$70`, x `$80`-`$CC`); the gap in the floor (x `$5E`-`$A7`, y `$70` and below) kills.

**Room 3** (`$9906`, timers `$9B1C`-`$9B21`): a lorry (`$9930`) after its first 64 passes takes Monty as he walks on the top lane in x `$38`-`$57`, `$90`-`$AF` or from `$C8` (state 3, a pose; it
carries three pictures along the lane for 200 passes, then he is free and it waits 127 passes); a car crosses the middle lane to the right 4 pixels a pass and one to the
left 1 a pass, each draining the gauge, then waits a random `R AND $7F OR $14` / `OR $28`; the lamp (`$9A3E`) flashes (14 steps) when he is at x `$8C`-`$9B`, y `$60` or more, and if he is at x `$92`-`$97` during the flash he is hidden (state 4) and
at its end dies the short death. Lanes: `$9AC7`.

**Room 4** (`$9B22`): the walkers; the staircase animation (`$9BCE`): a pause of 100 passes, then rounds of 8 passes (the ghost's picture `$0A`-`$11`, the top cassette's `$24` down to blank, the exit's `$25` up) with 40 passes between; when the top cassette is gone the exit is open
for 100 passes (`$9C1A`), killing on the last.

**Room 5** (`$9C49`, `$9CF4`): five slots at `$9DDC` (4 bytes: lane and direction, picture base, wait) drive entities 1-5: a vehicle waits off the road (the byte counts down), is put at x 0 (y `$28 + 8 * lane`) or x `$EE`
(y `$60 - 8 * lane`) and drives across at lane + 1 pixels a pass, killing; past the far edge it parks at 0, 0 and gets a new wait, picture and lane. The pile (entity 6) and the shop (entity 7) are as the table says.

### Where the rebuild differs from the original

- **A death in room 2 can jump to the wrong place** (`test/stray.ts`). The kill by the prize's second half (`$9667`) calls the death routine with whatever HL holds; the puzzle's routine leaves it at `$9904`
  (the puzzle's counter) when the counter is 0 to 8 or `$3C`, and at the restart `$9556` otherwise. The death routine ends with `JP (HL)`, so in the first case the room is **not** restarted: the
  original runs the bytes at `$9904` (two counters, then room 3's script, with IX at the second half of the prize), Monty stays where he is and loses a life on every pass he still touches it. The rebuild restarts the room in every case; the lockstep runs stop at such a death. Chris decided (2026-10-17): fixed in both modes, ORIGINAL included; the room restarts as the authors meant.
- **An entity at x `$F0` or more on the bottom rows overruns the original's redraw table** (the picture does the sprite's spill into the next row, not the counters') (`$8A9C`, 576 bytes, end marker at `$8CDC`): its third cell column is the next row's first, the last row's is the marker, and the redraw loop then runs on through the
  code at `$8CDD` (found by shaking room 0's cassette to x `$F5`). No entity gets there in play (Monty stops at `$EE`, the traffic at `$EE`, the cassette at `$D8`); the lockstep shaking keeps entities out of it.

## Entities, sprites and drawing (read)

- **Records**: `$8121 + 4 * n`, n = 0..7: x (0-255), y (0-191), frame, flags. Frame `$BF` is "not there". Frames are 16 x 16,
  1 bit per pixel: 32 bytes at `$C000 + frame * 32` (16 rows of the left byte, then 16 rows of the right byte). Monty is
  frames 0-9 (walk 0-3 (`$9125` table, toggled each pass by `$90A3`), jump, climb), deaths `$B0-$B2`, passers-by and cars
  `$0A-$1F`, cassettes `$20`, a reel `$6F`, vehicles `$53-$5F`; see the sheet from `re/sheets.ts`.
- **Colour**: a sprite is one colour; it takes the attribute of the cell it is over. Sprites never change attributes.
- **Where they are drawn (proved: `test/data.ts`)**: not on the screen but into a copy of its bitmap 0xA000 higher, **`$E000-$F7FF`**
  (the 128K music's bytes, dead weight on a 48K). Each pass `$87C4` redraws the tiles of the 3 x 3 cells round every entity into that copy,
  `$8931` ORs the sprites in, and `$889C` copies the cells whose counter is 2 to the screen (a counter reaching 0 draws the tile map's tile
  on the screen instead). The routine starts a sprite in the wrong third for y $80 and over (the third bit of y is dropped), which no entity reaches.
- **Drawing (`$87C4`, per entity `$8931`)**: the 16-bit row is shifted by `x AND 7` (self-modified `JR` into a chain of `ADD HL,HL / ADC A,A`
  at `$897A`, one for each of the three screen bytes). The art is stored facing left: it is drawn as stored when bit 7 of the flags is set
  (he moved left) and mirrored otherwise, by swapping the two bytes of each row and bit-reversing them with the table at **`$FE00`**
  (checked: entry n is n with its bits reversed). It is put on the buffer as `buffer OR (b AND mask(buffer))` per byte, `mask` the table at
  **`$FF00`**, which is `NOT (v OR v << 1 OR v >> 1)` within the byte (checked for all 256) and is indexed by the byte *already there*, not by
  the sprite byte (found by `test/data.ts`; this file had it the other way round): a sprite pixel shows only where the background has no ink
  and none beside it, so figures go behind the scenery's ink and keep a one-pixel margin from it, and no mask data is stored. Room
  5 draws with OR only (`$8A38`). `src/sprite.ts` is this, as pure functions.
- **Animated tiles**: each pass (not in room 5, `$8279`) the main loop turns one row of the two conveyor tiles: `RRC ($DAA0)`, `RLC ($DAA2)`,
  `RRC ($DBD0)`, `RLC ($DBD2)`: tiles $55 and $7B, rows 0 and 2. Their pictures in the data are the first position of that cycle.
- **Erasing** (proved: `test/picture.ts`): no save-under. Each pass every cell an entity covers (3 x 3 from its top left cell, y without its bit 7) gets a counter of 2 in a table of 18 x 32 bytes at
  `$8A9C` (end marker `$8CDC`) and its tile is drawn from the map into the copy; the sprites are drawn into the copy; then the counters are walked: a 2 copies that cell of the copy to the screen and
  becomes 1, a 1 draws the cell's map tile on the screen (an empty cell for tile 0) and becomes 0. So after a pass 1 means "covered this pass" and a sprite leaves a cell at once, in the next pass. Nothing
  else touches the screen's play area but room entry (clears it, draws every tile) and an item being taken (its cell cleared). **The room scripts force redraws** by setting bit 0 of counters (`SET 0`, so the cell is drawn from the map
  that pass): room 1's conveyor (10 cells at `$8B4F`, every pass), room 2's deck (9 cells at `$8CB2`, every pass), the two pistons' old and new rows when they move (`$9868`, `$98AA`, `$97E1`), and rows 10-15 whole when room 2 is set up (`$98F9`). A rebuild that leaves these out
  shows the conveyor and the pistons frozen. The tile set has **250 tiles** at `$D800` (the pistons are `$F4`-`$F9`; the first extraction took 244). Sprite frames `$80`-`$88` are where the interrupt table sits (`$D000`-`$D100`, all `$5F`):
  no play shows them. A sprite at x `$F0` or more spills its third byte into the next row of the screen (`INC C`), which the rebuild does as the original does.
- **The HUD** is drawn when it changes and the rebuild makes it from the state every time, which gives the same picture: faces from `$50A1` (cell row 21, column 1, every 3 columns; blank faces first, then `lives` of frame 0; none drawn when lives is negative), the dial from `$509A` and `$509C` (row 20, columns 26 and 28; level `value AND $F0`, a negative value keeps level 0), the item box `$50B3` (row 21, column 19), the score at `$5067` (row 19, column 7: four blanks, then the digits without leading zeros, the last place always) and the high score at `$5072` (column 18, printed only when a game ends above it).
- **Dying** (`$9592`): the face goes, then Monty's pictures `$B0`, `$B1`, `$B2` each last 2 frames (a draw and a HALT take more than a frame), the empty one 25, and the room is entered. Before it the sound holds the picture for 2 frames. Running out of gauge first cycles the ink of the dial's cells (rows 18-23, columns 24-31, `$A2D1`) for 56 frames, one a frame, and leaves their paper cleared until a new game. Entering a room draws its tiles progressively, about 7 frames; the rebuild draws it at once (counted apart in the test).
- **Colour**: measured in `re/colours.ts`: 94 % of the pixels a sprite adds to the screen are in bright white, and it is the dominant colour of all 81 pictures seen in play; the rest is the clash with coloured cells. The border is black in play.
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

### The rebuild of this section (proved: `test/lockstep.ts`; `src/monty.ts`)

Details the rebuild had to get right, all now checked pass by pass against the original:

- A pass in any state but walking runs its own routine and **ends there, with no new picture** (`$8FD2` pops the return address): falling
  (state 1, `$8FBA`: y + 3, then the floor check), the jump (state 2, `$8D77`), the pose (3, `$9141`: frame `$9ECC` + $12, flags from where entity 2
  is) and hidden (4, `$9156`: frame `$BF`). So a jump shows frame 6 (chosen on its first pass) for its whole length; the table `$9129` (frames 6, 7,
  6, then 9 9 9 1 1 past the 19th) is only read at phase 0. Room 5 runs the flying routine and then the picture.
- **The floor check `$8F26`** has side effects and three results: floor (a tile of the floor set at his two feet points, x + 4 and x + 10, y + 16:
  a conveyor, $55 or $7B, also pushes him 2 right; he lands, y to a multiple of 8 unless a rope is at his top), rope (no floor; a rope at his top or his
  feet: nothing happens) or air (state 1). It is called from walking, from the rope code (which sets `$810B` unless floor), from falling and from the
  downward half of a jump. A floor found returns through `$8FA9` (the landing), which a `PUSH` at the start put on the stack.
- Walking sideways looks for walls at x - 2 (left) and x + 10 (right) over 2 rows (3 when y is not a multiple of 8); x 1 and 2 cannot move left,
  x + 2 of $EF and over cannot move right. The jump moves sideways with the keys held at take-off and a refused move puts nothing back, but **a ceiling
  hit puts x and y back to where the pass began** (the sideways move too) and the phase to 23 minus itself.
- The facing (flags bit 7) and the walking picture (`$90A3`: a toggle and a counter, 0 1 2 1) change only on passes that reach the picture; the cycle
  advances on every second pass in which he moved.
- Death (`$9592`) does not touch his position: the room's restart routine (`$926E`: rooms 0 and 1 at x 4 y $78, room 2 x 4 y $68, room 3 x $18 y 8, room 4
  x $EE y $78, room 5 x $28 y $70) sets it and jumps back into the script runner (`$9238`), which steps the scripts' animation (`$9EA0`) a second
  time; his frame is `$BF` until the next pass. A new game starts him at x 4, y $64 and he falls to the floor.
- Monty's logic uses no random numbers (no R register); the room scripts and the room entry do ("Random numbers" above).

## Score, lives, gauge, HUD (read)

- Score is 32 bit at `$8113`, added by `$9EE5` (DE = amount), shown as up to 4 digits at the HUD by subtracting the weights at
  `$A00B` (1000, 100, 10, 1). The values seen: **35 for an item** (`$868B`), exits **200, 300, 400, 500, 600** and the final **1000**
  (`$9356`, `$9550`, `$96E5`, `$9ADD`, `$9BBA`, `$9CE3`): all six rooms played through give 14 x 35 + 3000 = 3490, the most there is (`test/playthrough.ts`). The high score
  is updated at the start of the next game (`$9F43`), compared from the top byte down (proved: `test/newgame.ts`, a second game after the ending).
- Lives: five faces at the HUD (`$8740`, 3 cells apart from `$50A1`), `$810C` counts down; no extra lives.
- The gauge (E to F dial, drawn by `$876D` from `$D200`) is the time left in the room: `$7F` at entry, one step every 8 passes
  (the pass counter `$A2A0` ANDed with 7 is 0) = about 40 seconds. **Room 2** is different (found by writing the rebuild: `$822F`-`$8243`):
  a step on every second pass unless `$9904` is set by its script, so the time depends on the puzzle. (`$A2A2 + room` holds the masks 7, 7, $1F, 7, 7, 7;
  room 2's $1F is never used.) 8 drawn levels (`value AND $F0`). At empty the game kills Monty as above.
  Hazards that use `$956D` take one step from it.
- HUD (`$B500`, `$BD40`): a yellow panel with SCORE, HIGH, the faces, a box for the carried item (`$50B3`) and the dial.

## Title (the credits page), game over and ending (proved: `test/flow.ts`; `src/screens.ts`, `src/flow.ts`)

Frames below are 50 Hz frames counted from the one in which the routine is reached ("+n"); every number was measured on the original
and is what `src/flow.ts` uses. "The screen" is the Spectrum's screen memory, compared after every frame.

- **Credits page** (`$A0CE`). `$A500` first clears the whole screen (`LDIR`, 2 frames) and then unpacks the picture from `$A564`: 768
  attribute bytes, where bit 7 means "this cell has a bitmap" and 8 bytes of bitmap follow in a second stream after the attribute
  stream; it is whole at **+4**. The last three attributes (`$5AFD`-`$5AFF`) are then set to black (`$A0DA`), and the page looks for a
  Kempston joystick by reading port `$1F` 65,536 times (`$A0E9`, 46 T-states a read, 43.1 frames; `$8105` = 1 if bits 5-7 never came
  up): **the keys are not read for 43 or 44 frames** (from the unpacking, +48 after the trigger; after boot +47: the program enters the
  page at another point of the frame). Then the loop `$A106`: each frame after the HALT the scroller shifts its row, `$915F` reads the keys
  (bit 4 of the pass's key byte is the jump key: SPACE, Kempston fire if found, Sinclair 0), and if none is down the scroller counts
  and, every 8th frame, draws the next character. The first frame of the loop does not shift (the HALT comes after it), so the first
  character is drawn whole at the right edge. The scroller is cell row 23, 32 bytes of each of the 8 lines shifted left one pixel
  (`$8367`, a clear pixel comes in), the character is drawn in the last column from the ROM font (`$A2B5`); its text (`$A111`, 357
  characters) "Welcome Your Sinclair readers to the Monty game given with the magazine... Pre-defined keys are Z-left, X right, O up, K
  down, SPACE jump... Sinclair and Kempston JOYSTICKS don't have to be selected, just pick 'em up and use 'em... Press a JUMP key/button
  to start" goes round: the terminator is read as the first character and the pointer goes on from the second, so the stream is the
  text again and again. Black border (`$A0CF`). Only the jump key leaves it (Z, X, O, K do not).
- **Starting a game** (`$81BC` after `$A0CE` returns): the screen is cleared (`$A2A8`, 2 frames), the panel copied in, the score zeroed,
  room 0 entered (`$854A`, drawing over about 7 frames, the gauge put up full with it), faces drawn: the first pass begins **+10** after
  the frame in which the jump key was read. The pictures in between are the credits screen (its scroller one pixel further, as the
  frame shifts before it reads the keys), a cleared screen, the panel as copied (a gauge image that is not the full one) and the room
  with its attributes from the room's table (the items' colours are drawn later), piece by piece.
- **Death** (`$9592`): the sound (`$A06B`, 44 ms) holds the screen as it was for **3 frames** (2.2 frames: one death in 108 had 2),
  then Monty's three pictures 2 frames each and the empty one 25 (`$95BA`). The time-out first flashes the dial (`$A2D1`, 56 frames, the
  last for the sound's 3). The short-circuit death (`$95C8`, room 3) removes the face and plays the noise (`$A04E`, 265 ms) over the screen
  for **13 frames**. The restart routines (`$926E`) draw the item box at once for rooms 2, 3 and 4 (`$878A`), and `$854A` puts the full gauge up
  with the room. Total of a pass with a death: 41-44 frames (98-99 with a time-out).
- **Game over** (`$8292`, lives negative after a death): the room is entered again (**5 frames** after the last picture) and "GAME OVER !!"
  (12 characters, `$82AB`) is written at cell row 9, column 10 with attribute `$10 | (frame & 7)`, paper red and the ink going round
  the 8 colours, one step a frame, for **100 frames** (`$8297` loop: draw, HALT). The keys are not read. Then `$81BC`: the credits
  page, **+100 frames after the first text, or +101** (2 of 6 game overs; read as the first draw falling late in its frame; the flow
  uses 100, and the credits scroller is then a frame apart for as long as it runs, counted as "a frame apart"). Nothing is kept but the
  high score (which is compared and kept when the next game starts, `$9F43`).
- **The last delivery** (`$9CE0`): the script draws the pass once more (`$87C4`: the NEWS shop gets its last paper), adds +1000 (`$9EE5`)
  and waits 50 HALTs (`$9CE9`), then sets the end flag (`$A2A1`): the card comes **+51** after the pass began.
- **Ending, the Christmas card** (`$82DA`): the screen is cleared (2 frames), room 6 entered (32 x 24 cells, its own tile set: `$854A`,
  drawn over 4 frames), the cell `$591F` (row 8, column 31) set to black ink on black paper, the scroller (`$8391`, row 8, the text from
  "Coconut Capers - Featuring Jack The Nipper" to "Hill 19" and round) is started at `$838E`/`$838F`. First it waits until **every key is up**
  (`IN A,($FE)` with every half-row, `$82F4`; no joystick), then each frame: a character every 8th frame as on the credits page (the
  first in the frame the wait ends), and after the HALT the row shifts, **seven cells' attributes take a random step of paper**
  (`$835C`: `((R AND $38) + attr) AND $3F OR $40`, the cells `$59CF`, `$5A0F`, `$5A2E`, `$5A6F`, `$5A70`, `$5A8E`, `$5AB1`, 7 reads of R a
  frame), and any key at all goes to `$81BC` (the credits page again).
- Text on screen is drawn with the ROM's character set (`$A2B5`: `$3C00 + char * 8`): the 66 characters the game prints are in `src/data`.

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

- The effect of the original's wrong jump in room 2 ("Where the rebuild differs"): which entities and variables the stray run of room 3's script changes is read, not followed.
- Which tiles are lethal: none are; rooms 0 and 4 have floor and wall tests only and the lethal things are entities (proved by the scripts).
- Whether any key (other than SPACE) is read by the credits page; the key-scan routine at `$A341` and its tables at `$A3A0-$A4A0` are not called.
- Why GAME OVER sometimes lasts 101 frames and not 100 (read as the first draw straddling a frame boundary, not followed), and why the credits page after the program starts waits one frame less than after a restart (the T-state at which it is entered).
- Whether the credits page's `$A341` key scan is ever reached (`$A2F5` is the only caller and nothing calls it).

## Tools

`tools/zx/zxprobe.ts` (boot and drive), `tools/zx/zxdis.ts` / `disasm.ts` (Z80 disassembler, `--map` to list only executed
code), `re/profile.ts` (coverage, ports; `RANDOM=seed` plays at random; `MAP=` accumulates), `re/watch.ts` (watch addresses and
memory), `re/shots.ts` (a picture and a state of every room, `AT=` to enter by a room's own routine), `re/sheets.ts` (sprite and
tile sheets), `re/sounds.ts` (the effects), `re/music.ts` (the 128K music's register stream), `re/image.ts` (the pristine 64K image).
