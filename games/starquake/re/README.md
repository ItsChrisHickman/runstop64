# Starquake (C64): how it was ported

A native port: the game rewritten in TypeScript from the C64 version's own
code (read in a disassembly of the running game) and data (extracted by
address, see `../build/README.md`). Nothing of the original runs except the
music and sound effect players, inside a .sid (as every runstop64 game's music
is the original's own player).

## The C64 version

Nick Strange's C64 version is a close conversion of Stephen Crow's Spectrum
game: the same rooms (the Spectrum's room table, big blocks and tile info are
at $E000, $F800 and $FC00, the same bytes but for a handful), redrawn for the
C64: a hi-res bitmap ($6000) with a colour byte per cell ($5C00, like the
Spectrum's attributes), and colour RAM ($D800, not shown in bitmap mode) as
each cell's *attribute*: bit 3 solid, bit 2 deadly, bit 1 sparkles/lift,
bit 0 an object. BLOB, the enemies, the hover pad and the laser are hardware
sprites (all behind the bitmap's pixels: $D01B = $FF). The screen is 40
columns, the room 32: the four columns either side show the neighbouring
rooms' edges (or, at the map's edges, a wall from $119F).

The program unpacks itself to $0C00-$4FFF (code, in modules each starting
with a jump table: $0C00 main loop, $1200 enemies, $21B0 sound effects (a
raster interrupt 4 times a frame), $2500 laser, $2800 items, $2F80 panel,
$3400 screens, $4030 screen drawing, $4300 BLOB, $49F0 platforms and sparks),
$5000-$5BFF sprites, $8010 a run-length unpacker, $9100 the music player,
$A000-$CFFF tiles, items, BLOB's frames, fonts, effects, $E000-$FCFF the map.

| Address | What | Port |
|---|---|---|
| $0C6E-$0E78 | main loop: room, BLOB, exits, deaths, screens | `src/flow.ts` |
| $0E7B, $10B0, $4194 | drawing a room and its tiles | `src/room.ts` |
| $1037 | a room's four colours (seeded by its number) | `room.ts roomColours` |
| $4054, $4066 | random numbers (two 16-bit generators, the game's seeds) | `src/rng.ts` |
| $4407 and on | BLOB: walking, falling, lifts, pad, platforms | `src/blob.ts` |
| $1212-$1B68 | enemies, plants, BLOB's fragments, the core's guardians | `src/enemies.ts` |
| $2946-$2EB5 | items: placing, bonuses, picking up, carrying | `src/items.ts` |
| $2500 | the laser | `src/laser.ts` |
| $2FB7-$33AA | the panel: score, lives, bars | `src/panel.ts` |
| $4C2D | the frame (sprites, sparkle, sparks, platforms crumbling) | `src/frame.ts` |
| $3400 module | teleports, doors, Cheops, the core, the end | `src/specials.ts` |
| $3966-$3AAC | text screens | `src/screens.ts` |

## Things worth knowing

- **Zero page is shared.** $78/$79 are BLOB's fall height and platform key,
  and also the room table pointer while a room is drawn: holding down into a
  room builds a platform at once (the pointer's high byte is left in $79).
  The screens reuse $76-$7B too; the port keeps BLOB's own fields and
  reproduces only what survives into play.
- **Carries matter.** The security door's and Cheops' symbols come from a
  random byte rotated through the carry left by the drawing just before
  (`drawTileGraphics` and `drawThing` return it).
- **Lists keep old entries.** Item places ($0902) and enemy spots ($036E)
  aren't cleared between rooms, and a count of zero is used as a mask ($FF):
  the port keeps fixed arrays.
- **The final count loses carries** past the tens ($32E1): the original's.
- **Timing.** The main loop does one pass per frame wait; on a real C64 a busy
  pass can take two frames. The port does one pass per 50 Hz tick.

## Checking

`test/` runs the original (on c64kit's C64 model, from a snapshot) beside the
port and compares them: every room, lockstep play (random walks and chosen
starts), a new game's setup, the text screens, the sound. See
`../build/README.md`.
