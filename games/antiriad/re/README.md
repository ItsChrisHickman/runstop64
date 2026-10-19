# The Sacred Armour of Antiriad (C64): how it was ported

A native port: the game rewritten in TypeScript from the original's own code (read in a
disassembly of the running game: there is no source or disassembly anywhere else) and data
(extracted by address, `../build/README.md`). The port keeps the game's state where the
original keeps it (zero page, the sprite tables at $0200-$030F, the panel's variables at
$0661-$06B7; named in `src/vars.ts`), so it can be compared with the original byte for byte,
and a save is a C64 machine snapshot. It runs on c64kit's model of the C64's chips in native
mode (the VIC-II with its raster splits and collisions, the CIAs' timers, the SID's register
writes): the routines are TypeScript, no 6502 does the game's work. Only the music driver
(Richard Joseph's player and his tunes, $AFC5-$C1A9 with tables at $F3xx-$F5xx) runs on the
6502 core, as every runstop64 game's music is the original's own player.

## The original

One file on the disk, `ANTIRIAD` (184 blocks), a crunched one-filer (BASIC `SYS 2080`); its
unpacker ends with a reset into a "cartridge" at $8000 (CBM80), the game's entry $8009.

| Address | What | Port |
|---|---|---|
| $8009 | start: VIC bank 1, $01 = 5, init ($8D77), the music driver's init ($B43F), the title, the game | `src/game.ts` `program` |
| $8053 | the main loop: room changes, animated characters, the stone, background collisions, back to the armour, the panel's lights and bars, energy, the ending | `game.ts` `mainLoop` |
| $8071-$8421, $8BB9 | the title sequence (arch, credits page, tunes) and its text printer | `src/title.ts` |
| $852C-$8989, $869C | drawing a room: 4x8 blocks of 4x4 characters, the neighbours' edge columns, its graphics set, colours | `src/rooms.ts` |
| $86E2-$8841, $88A7-$892F, $8C30 | a room's sprites (from $CA16), the armour if it's here, animated characters ($FBAB, scripts at $06BC) | `src/setup.ts` |
| $AE41 | the interrupt: raster lines $FA (the playfield's registers, the sprites, then a frame of the game's logic), $32 (the message scroller, the score), $B2 (the panel: its charset, sprites, power-up, messages); sprite collisions; CIA timers A and B (the music) | `game.ts` `irq`, `raster`, `bottom` |
| $9076-$97E6 | the joystick (every 7th frame), out of the armour and in it | `src/hero.ts` |
| $98A5-$9A5B | moving the sprites; the hero against the room (floors, ceilings, walls: by the colour of the character, tables at $CE12, $CE1C) | `hero.ts`, `src/sprites.ts` |
| $9E0E-$9F47, $A23A | sprite animations (scripts at $FCA6) and the sounds tied to their frames | `sprites.ts` |
| $9F4A-$A239 | dissolving and materialising (masks at $0800) | `src/fades.ts` |
| $A8A0-$AA67 | movement scripts ($C683): records of directions, speeds, counts, commands; homing in | `sprites.ts` |
| $A44C-$A89F | collisions: sprite-background (what hurts, $CE2C), sprite-sprite (parts of the armour, the recharge cell, the teleporter, the empty armour, creatures) | `src/collisions.ts` |
| $A260-$A351 | dying, rejuvenating, the game over | `game.ts` |
| $89C2-$8AD8, $AA68-$AE40, $8EB0-$8F66 | the panel: lights, bars, energy drain, the scroller ($C1AA messages), the score's rolling digits, the power-up, its sprites | `src/panel.ts` |
| $9825-$9893, $8AD9-$8B6A | the power centre (room 0) and the ending | `hero.ts`, `game.ts` |

Rooms: 69 ($00-$44), on a grid 15 wide and 14 deep by their exits ($F25A: right, left, down,
up); the port's map lays them out from the exits, which gives C64-Wiki's map coordinates
(H1 the power centre, I14 the armour, C13 the Gravity Displacer, K11 the Pulsar Beam, H8 the
Implosion Mine; the Particle Negator's room $06 comes out at G5 where C64-Wiki says K5: that
level's four rooms wrap round, and the wiki draws them further right). Radiation: a level per
room ($F7A6, two bits).

## How it was ported, and checked

1. **Booted** the d64 in `tools/probe` (`--dump-at` dumps the RAM the moment the CPU first
   reaches $8009), and ran it with random input recording which code runs: $8053-$B499.
2. **Disassembled** (`tools/re/disasm.mjs`, with that coverage as entry points: 6,182
   instructions) and read it all, routine by routine; the extractor keeps everything but
   $8000-$AFC4.
3. **Wrote each routine in TypeScript** from the 6502, keeping its state at the original's
   addresses and its order of work. Rooms first, checked straight away (below), then the
   interrupt, sprites, the hero, collisions, the panel, the title.
4. **Checked against the original running** (`test/`, from two snapshots of it, `fixtures.ts`):
   - `rooms.ts`: all 69 rooms drawn by both: screen, colour RAM, the room's characters and
     their colours, multicolour registers: **69/69 identical, byte for byte** (from both
     snapshots); then each goes into the room its own way, and two frames after it's drawn the
     pictures (every pixel, sprites and all) are the same as the original's within a frame:
     69/69 (out of the armour), 61/69 without sprites and 54/69 with them in it (the panel's
     interrupts take more of the original's time there; the rest are animated characters
     and sprites two frames out).
   - `lockstep.ts`: both played with the same joystick, every frame compared (the sprites the
     VIC drew: place, shape, colours; the characters on screen; the game's memory). Scripted
     walking, jumping, throwing: 500/500 frames' sprites and characters identical. Random play
     within a room (8 runs, 8,636 frames, out of the armour): characters identical in every
     frame (10 a frame apart), sprites identical in all but 16 frames (a thrown stone a frame
     out). In the armour (8 runs, 2,329 frames: flying, bumping, firing, stepping out):
     characters identical, sprites identical but in 55 frames: the original's interrupt
     rewriting a sprite's shape (dissolving, materialising) while the beam draws it, which
     shows torn or a frame late. Across room changes the two part: a room takes them a frame
     apart to draw, so the same joystick reaches them at different moments (in the armour, at
     3 pixels a frame, they're soon tens of pixels apart, and one can seem to have gone through
     a wall the other bounced off: a reported "flying through walls" was checked this way).
   - `logic.ts`: the game's logic frame by frame of logic, timing taken out: the original's
     frames of logic ($AF45-$AF63) are counted with the joystick each read, and the port's are
     fed the same. Tal's and the armour's place, direction, animation and speeds after every
     frame of logic: 19 scripted runs (the walls left and right in the armour, and in rooms of
     six levels; on foot) all identical (9,254 frames of logic), and random play (12 runs,
     16,063 frames of logic, on foot and in the armour) identical, two runs until a hit landed a
     frame apart (the VIC's collisions, which the original notices when its interrupt and main
     loop get to them). Sweeps of every room ($02-$44, four places each, random flying: 268
     runs, 155,068 frames of logic; and $02-$22 again with the energy and life compared, 132
     runs, 74,052) found no difference in movement or the walls: every run was identical, or
     first differed in the Pulsar Beam meeting a wall (97), a hit or the energy (48) a frame
     apart.
   - `transitions.ts`: into every room from both snapshots: 120 of 136 room changes take as
     many frames as the original's, the rest one frame more or less; in the armour with a
     message scrolling on the panel, 58 of 68 (the scroller's time is modelled: the original
     takes 1,400 cycles a frame more for it, so its rooms take one or two frames longer to draw).
   - `controls.ts`: ENHANCED's fire and jump buttons, each against the original's own move from
     the same moment (the walking jump, the standing jump, the throw, the armour lifting): the
     same frames.
   - `empty.ts`: the armour out of energy, in ORIGINAL against the original running (it never
     lands let go or pushed the way it flew; held backwards it turns, lands and Tal steps out
     within a frame of each other, 39 against 40), and ENHANCED's way out (sets down, out, away, back in;
     in the first ten rooms too).
   - `frontend.ts`: the front end headless (title, a new game, a room change and its autosave,
     the pause map (rooms not to travel to as Tal is now drawn dark, and not offered) and travel
     back, ENHANCED and its two buttons, game over and CONTINUE?); `soak.ts`: 40,000 frames of a
     random player from power-on (5 games), nothing stops.
   - `centre.ts`: the power centre. Landing on the pedestal with the Implosion Mine against the
     original (14 runs, logic frame by logic frame as `logic.ts`, the same in every frame: the mine
     set off in 10, missed in 4) and the ending; the armour's way in from below and travel back
     there; Tal's death outside the armour (no travel while he's dying or dead, or the game is over)
     and a save of a game gone on past its game over put right (below); `won.ts`: after the end,
     through the front end (the moment the mine is set off saved, the title's ENTER CONTINUE into New
     Game+, the ending again from there: below).

## What was learned

- **The C64 model had gaps, again.** Sprite collisions never raised the VIC-II's interrupt
  (this game learns of every hit by interrupt: in the probe the original could not be hurt
  or pick anything up). Fixed in `packages/c64kit/src/c64/machine.ts`, with collisions now
  optionally found line by line as the VIC draws (`collisionsPerLine`, which this game needs:
  found at the frame's end they arrive at the wrong moment). Native mode had three bugs that
  only showed with 6502 code called from an interrupt (here the music): the time before the
  call was counted twice (the music ran 30% fast), a timer firing during the call was lost,
  and a call running past the frame's end captured sprites twice and lost the frame.
- **The original's timing is part of its behaviour.** Its frame of logic runs in the $FA
  interrupt and takes until somewhere between line 285 and the next frame's line 80; the main
  loop runs whenever the interrupts let it. A port that takes no time sees the same moments
  differently: a stone hitting a wall while the original's main loop is still busy with Tal's
  feet (29 raster lines) is not noticed by the original; the panel's charset switch lands a
  line after the raster interrupt; a room takes the original 5 to 14 frames to draw, during
  which nothing moves. The port models these where they show (the collisions kept latched as
  long as the original takes, the raster line, the room's drawing time from its cycles and
  what the interrupts leave each frame, sprite shapes written at the next frame's start), and
  compares with the original allowing for the rest (a frame either way).
- **Compare at the right moment.** Memory sampled at a frame's end catches the original in
  the middle of its interrupt; the checks sample it when its logic is done.
- **Line the two lists of snapshots up by frames of logic, not by video frames.** The original
  takes a memory snapshot only after a frame of logic, and runs none while it draws a room (5-14
  frames), so its list is shorter by those frames. Comparing the port's every video frame against
  it goes wrong from the first room change on, by the length of the draw; the port is sampled in
  the frames it ran logic in (`Game.afterLogic`). Also not memory differences: `$6f` (the collisions latched while
  the handler runs, taking the original's time: the original's snapshots are never inside it), and
  the animated characters' timers (`$248-$24F`, `$91`: whichever of the two gets round to
  reloading them from 0 first). What is left: the port is a frame ahead of the original at a room
  change (the original's logic ran a frame later), and the joystick, read every 7th frame of
  logic, then lands on a different frame of the game, so the two part for good (seed 7: Tal moves
  off 7 logic frames apart after the room change at frame 1124). That is the documented room-change
  parting, not a bug (logic.ts, which feeds the same joystick per frame of logic, is 9254/9254):
  lockstep now counts the frames the same until they part and fails if that is before any room
  change (seed 7: 1244 frames, parting at frame 1247 after the room change at 1124).
- **Read the operand's mode.** `ADC #$74` is not `ADC $74` (the panel's spinning display took
  its shapes from the screen until the lockstep showed it).

## Bugs in the original (kept)

Seen in the code: room J13's way down leads to room $45, which doesn't exist (unreachable in
play); the radiation warning's timer uses the wrong index when voice 3 is busy ($ACBB); a shot
or stone hitting a wall stores its animation delay as its movement script ($A483, an `LDA #0`
overwritten by the next load). All kept, as they are harmless; none is fixed as an option yet.

## The power centre: how the ending is set off

`$9825` (every frame of logic, in room 0) cycles the colour of the light in the dome and of the
pedestal's top (characters $C9-$CB, row 12, columns 18-20) through 1-7, a frame each; `$9850`: with
the armour standing ($B2), the Implosion Mine's found bit (`$0681`, set by picking the mine up: it is
"primed" by being found, nothing else arms it) goes to `$B1`, the countdown starts and the ending
follows, if the character under its feet is one of the power centre's ($CE30: $C9-$CB). Under its
feet is the row below `($0201 - $10) / 8`, the row the floor check ($8FA3) stands it on: so the
armour must have landed on the top itself. But the top's flashing colours are floor ($CE12 lists the
colours a hero goes through) only in 5 and 7: reaching it in another, the armour sinks into the top
and lands a row lower on the pedestal's body ($A3, $BD, $A4), where the mine isn't set off; it can
take off and come down again. In the original about half of all landings work (`centre.ts`: 10 of 14;
a sweep of 189 landings from three places: 105 in both). The port does the same frame for frame.

## Travel and death

Travel needs Tal alive and the game not over (`Game.canTravel`; the map offers nowhere otherwise), as the game's own
teleporter takes him only standing ($A643). Picked while he is dying ($A6), lying dead ($A8) or coming back ($AA), travel
would make him appear with no life left, so he died again at once; from the last death it would undo the game over: Tal up
and about with `$7E` set (so never dying again: $A31E), "YOU HAVE DIED" going round on the panel (message $90 has no end:
it goes round until the game starts again), and nothing to end the game (the fire that ends it, $92C9, is for him lying
dead: walking or standing it throws or jumps, in the armour it's the Pulsar Beam). In the armour into the last two rooms
travel does what coming in by an edge does ($84F0: without the Particle Negator the energy goes). A save of a game gone on
past its game over is continued on loading as CONTINUE? would have (`main.ts` `repairSave`).

## After the end

In the original the ending's fire starts a new game at once (after the restart ported from $8BAB, `$7F` is still set by that
fire, so the title skips straight to the music fading and the game; its end message says as much: PRESS FIRE TO PLAY AGAIN;
not checked against the original running). Here the moment the mine is set off is saved, and the ending's fire goes to the
title as T on the pause screen does (it waits, ENTER CONTINUE); a CONTINUE? there would only loop back to the pedestal.
That save, loaded, goes on as New Game+ (`src/plus.ts`): `$B1`, the
countdown and its message cleared, life and rejuvenations full, and travel to the first screen (the
first of the two the original starts in, `$C5DB`), in the armour. New Game+ is kept in the save as a
mark at `$8100` (memory the original's code used, as the new messages at `$8000`), with its panel
message (number `$16`: the original's table stops at `$15`, so `messageAt` gives its address) and a
'+' in an unused panel character (`$E7`). Each frame it fills the armour's energy and, while no
message is going by, writes NEW GAME+ into the message window's characters; each room's radiation
(`$75`) is 0, and the interlock (`$961D`) doesn't hold. A save from before the mine was set off
carries on from there as it is.

## Not yet checked against the original

Ported but only checked in passing (they run in the random lockstep when they come up, and nothing has differed there, but
no scripted check reaches them): picking up the armour's four parts and the recharge cells, their messages and the panel
showing them; the teleporters; creatures that drop bombs and generators; the Pulsar Beam against creatures; the title
sequence. (The Implosion Mine, the power centre and the ending are checked: `centre.ts`.) Next: scripted runs to each, from
fixtures of the original at those places. Possible additions: hint sparkles (where the parts are) as an assist, and the pause
map marking the parts' rooms once found.

## The ending's reward (ENHANCED)

After the game's own ending (the mine goes off, the screen dissolves, "THE OPPRESSORS ARE DEFEATED") and its fire, ENHANCED shows
a reward (`src/ending.ts`, the show `games/shared/ending/show.ts`, `test/reward.ts`; credits and their sources `credits.md`). The
places are the game's own engine on games of its own, resumed from three states made by playing the game itself (`src/stage.ts`
`Bases`: a new game, the armour worn for the first time with its power-up, Tal out of it again); Tal is driven by a pilot
(`src/pilot.ts`) that gives the same input as a player's (`src/controls.ts`, shared with `main.ts`): steps of what is held for how
long or until something is so (Tal at a place, the armour landed, a part found), steering by looking at the game. Where the
original puts things matters: the armour's ledge in room $3F is closed on its right by a pillar; the dotted chains in rooms
$3E and $3F are the energy barriers, which the armour can't cross (Tal can); the armour arriving from below comes in at the
bottom of the room, over the panel, so the montage's flights go sideways; the credits' row is screen row 16 (between the
playfield and the panel's first row), which the game leaves empty, apart from the ending's flashing of the whole screen.
`re/play.ts` plays the places headless (where Tal goes, when each is done, a sheet of frames), `re/cast.ts` records the parade's
cast onto a sheet, `re/messages.ts` dumps the panel's messages.
