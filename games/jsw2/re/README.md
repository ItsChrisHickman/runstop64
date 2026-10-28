# Jet Set Willy II: how it was ported

A translated port on the shared native-port kit (`games/shared/native`; the method is in
`../../entombed/re/README.md`) with the same cycle-counted timing as Thing on a Spring
(`../../thingonaspring/re/README.md`). What's particular to this game:

- **It times itself** with a busy delay ($4E95: 2,048 rounds of DEC/BNE) once per pass of its main loop, and draws in
  raster interrupts chained through the KERNAL's vector at $0314 ($4ACE and $4A18 on the title, $78CD and $7940 in play),
  which leave through the KERNAL's exit at $EA81. `engine.json` translates with `countCycles`; the port counts the
  interrupt's entry (7 cycles, and 18 in the KERNAL's $FF48) and that exit (22). The main loop's top ($4BAE) is a marker:
  saves are taken there.
- **The title runs on the original code** (`bootstrapUntil: 0x4BAE`): from the snapshot the emulated 6502 runs until the
  main loop starts, then everything is native (after a game over too).
- **Jumps go through a table of vectors** in the stack page ($01E2-$01FF, set by the loader, never written by the game):
  `constVectors` makes each `JMP ($01xx)` a direct jump, checked at run time. The stack starts below the table ($DF).
- **It returns through two calls** with `PLA PLA RTS` (at $56E0, $571E, $5CA6, and $62B2 with a pushed byte first): the
  translator follows the stack depth, so those pops take nothing (a JSR pushes nothing natively) and the RTS returns
  through the extra call (`cpu.unwind`).
- **It disables interrupts** (`SEI`) while it sets up the title after a game over; the cycle-timed host holds interrupts
  until `CLI`, as a 6502 does (the play interrupts would otherwise clobber the title's logo as it's drawn).
- **The joystick is in port 2**: port 1's lines are F1 (pause) and F3 (music) to it.
- Two undocumented opcodes ($02 at $4817 and $51F1) are operand bytes reached only on paths the game never takes; they're
  handed to the 6502.

Checks (`games/shared/native/test`): `trace.ts jsw2` (with the engine translated with `TRACE=1`: the main program,
instruction by instruction and cycle for cycle, against the original), `irqcycles.ts jsw2` (every interrupt handler, cycle
for cycle), `resume.ts jsw2`, and `verify.ts jsw2` with `CYCLES=1 GENERATORS=1`. Lockstep can't line up passes for a game
that times itself: an interrupt starts natively on its raster line, on a 6502 after the instruction in flight (0-6
cycles later).

## The game's data

- **Rooms and the map.** `re/mansion.ts` runs the game's own room loader ($62C5, room number in $13) for every room on a
  copy of the machine, reads each room's name (at the pointer in $73) and exits (left, right, up, down at $8169-$816C),
  and lays the mansion out (`re/layout.ts`, below) into
  `src/mansion.ts`: 136 rooms, all joined by exits, 26 x 18 places, `LINKS` (the exits the map draws as a stub, and a line when picked) and `UNENTERABLE`.
- **The map's layout** (`re/layout.ts`, `re/search.ts`, `test/layout.ts`). The mansion is not a consistent grid: of its 319 exits to
  another room (rooms nobody can enter left out) the layout draws 308 as two rooms side by side the way the exit leads, and 11 are
  links. Rooms start as blocks of one; the exits are taken in an order (those both rooms say first) and each joins its two blocks if
  the places it asks for are free, the blocks moved to meet (a Kruskal over places); what cannot be joined without two rooms on one
  place stays a link. Blocks that never join are put where they fit. The generator tries 1000 orders and keeps the cheapest links
  (a way there and back three, a one-way one, the exits among the start and the rooms next to it six times and never given up), then
  `re/search.ts` improves it: a simulated annealing over the places (a room, or it with the rooms joined to it by drawn exits cut
  at some, moves to where one of its exits asks it to go; 8 runs of 20 million moves, sheet at most 28 x 20). The cost is 19 (before
  the room below was left out: 12 links, cost 20); the annealing from eight different Kruskal layouts, even with a sheet of any
  size, always ends at 19, and the best sheet is 26 x 18 (the map's cell is 7 px).
  **What it must cost, at least** (`lowerBound`, `exactMinimum`): a loop of exits whose steps do not sum to zero cannot all be
  drawn, so one of its exits is a link; loops charged to their cheapest exit, the ones that share one using it up, give a bound of 12
  (7 loops: 129/130 joined on both sides, 6; and six one-way exits' loops, 2 to 24 exits long). The exact minimum if rooms could
  share a place (a branch and bound over the loops, per biconnected piece: 6 + 1 + 5) is also 12, but the layout it gives (129/130, 109 down, 87 left, 60 left, 60 down, 24 up, 89 down given up) puts 12 pairs of rooms on one
  place, so 12 is a floor, not a layout: the search's 19 gives up 63/64 (6) and three more one-way exits instead. Not proved
  optimal. The 11 links: two rooms joined on both sides (63/64, 129/130: one side by side, the other a link) and one-way exits
  (31 left to 32, 60 left to 44, 24 up to 93, 87 left to 88, 90 down to 28, 109 down to 120, 134 down to 135). (The generator runs the
  original's code by frames, a room let fall into by the way down as travel does: calling its loader alone waits for the raster
  interrupts, which a call does not run.)
  **A room Willy cannot walk into** (`UNENTERABLE` in `re/mansion.ts`): 136, The Beginning of the End, which only the bathroom's right exit
  leads to, and which only the game's own end enters (put to bed, Willy sleepwalks 33, 63, 64, the bathroom, 136). The bathroom's right side is a solid wall from floor to ceiling, and the original's code agrees: 120 random walks of
  3000 frames in the bathroom (the C64 model running the game's own code) reached x 326 at most, where a room with a way out on the
  right lets Willy through at x 328 (room 4 does), and left only through the toilet (to the drain). Its exits cost the layout
  nothing (and no exit to it is a link), and the map does not show it until Willy has been in it. The other rooms with a single
  way in (1, 45, 56, 69, 89, 90, 95, 96, 104, 119, 121, 128, 132-134) were looked at only by random walks of their way in, which
  proves nothing either way; they stay drawn.
  **The drawing** (`src/map.ts`): a link is a 3 px stub on its room's edge the way the exit leads, COL.lblue when both rooms have been
  in, else COL.blue. While the map's pick is on a room with a link, or on a link's destination, that link's dotted line is
  drawn from room to room and its other room lit in the same colour.
- **Items.** 178 items in 80 rooms (`re/items.ts` reads the loader: $8106 a room's count, the pairs at $8108 their cells;
  it writes `re/items.json` and `src/itemcounts.ts`). The game counts them in BCD ($8131/$8132). The ending check (room
  type 6, the Masters Bedroom, $7315) wants 160 or more, so 18 may be left. Per-room taken bits persist at $0A00 +
  2 x room (rooms under 128, high byte first) and $0B00 + 2 x (room - 128) (low byte first), all $FF at the start: item i
  is bit i, in $8104/$8105 while Willy is in the room and in that table once he leaves (`test/items.ts` collects every item
  and checks them). The Spectrum original has 175 items and needs 150 ([JSW2.TXT](https://sunsite.icm.edu.pl/packages/sinclair/docs/game-database/J/JSW2.TXT)).
- **Whether every item can be reached is not proved.** Go-Explore (`re/route.ts`) reaches only about 12 rooms in six minutes,
  so it says nothing about items. One real trick: The Hole With No Name's 4 items are reached only through the Secret
  Passage by jumping at the wall's top right.
- **What kills.** The death routine $51C7 has 11 call sites. A fall of 40 pixels or more (five character rows: the counter
  $82D7 counts 2 a step, against `cmp #$28` at $5465) kills on landing. Guardians, nasties and ropes are VIC hardware
  sprite collisions (bits of $D01E/$D01F read into $8304 every other pass), so a hit is any overlapping pixel. 8 lives.
  The clock ($82A1-$82A3, BCD; `re/clock.ts` measures its pace) kills at 24:00.
- **ECM.** Its rooms draw in the VIC's extended colour mode; c64kit's model had to learn that (floors, hardware
  collisions).

## The map's travel spots

Where Willy came into a room (the game notes it at $4C3A: $82A8 x, $82AC its high bit, $82A9 y, and starts him there
again after a lost life), if he came in on his feet, walking in at a side; else (through a room's top or bottom, or in a
jump) where he first landed. "On his feet" is two of his steps running with the jump, rise, rope and fall bytes ($82E4,
$8292, $835D, $82D7) clear: he moves only every few passes (the countdown at $8207, set again from the room's speed), and
only then does the game look for floor under him, so until his first step in a room (and when a life starts again) he
stands in mid-air with those bytes clear. A spot is kept once he has lived a second after it in the room, or left it
alive (a life lost there, the lives at $8096 one fewer, starts the room's spot again). The map is kept with each autosave
(`games/shared/continue.ts`), and notes what it sees before the autosave (`games/shared/native/play.ts`), so a save taken
on arriving by travel has him where travel put him.

`re/route.ts` finds a route a player might take (Go-Explore on the native port, input as a player gives it: walking or
jumping, never standing about; `re/routes.json`: 12 rooms, 18 arrivals), and `test/route.ts` walks it in the front end
with the keys held as a player holds them, then checks the rooms offered, picking (arrows, taps, Enter), travel to each
(where he was on the walk, on his feet, alive and still there 200 frames on) and the map kept with the autosave.

## ENHANCED

**No death loops.** Hades (room 7, ENTRANCE TO HADES) is only come into falling, through the hole in the floor of room 60
(ATTACK OF THE MUTANT DUSTYBINS), onto the skull, which kills. A death in a fall that began in another room starts Willy
again where it began ($51F9: the room at $7ABD and the spot at $7ABA-$7ABC, noted when a jump or fall starts, $592D): at the
hole's edge, where within a frame or so a collision kills him again (two lives for the fall, on the original's 6502 code
too; held left he falls in again, every life). The room's autosave is therefore taken when he has found his feet there
(`footing`: travel's own rule) and kept once he has lived a second after it; ENHANCED starts him from it after a death
before that (`play.ts` `safe`). Travel drops him in above the spot rather than at the top of the room's way down, so a fall
from Hades meets nothing in the drain (`test/deathloop.ts`).

**Safe landings.** The compare at $5465 reads its operand from memory (`smcOperand` in `re/engine.json`); ENHANCED sets it
to $FF, which the counter, counting in twos, never reaches. ORIGINAL keeps 40. What he lands on still kills (`test/falls.ts`).

**Running** brings Willy's own step on: he moves when his countdown ($8207, set again from the room's speed $81FF, 4, one
less in a jump) runs out, once a pass of the main loop ($53B5); one count more off a pass makes it twice as often walking,
so his jumps are the same jumps. Running the whole game faster was tried and dropped: the request was Willy running, not
the game fast-forwarding. Walking with and without it, the memory differs only in Willy's own bytes (`test/run.ts`). A step
brought on in a room's first pass died of the last room's collisions (the game reads the VIC's into $8304 every other pass,
and the step judges them at $5405: down the toilet, the bathroom's), so not while they'd kill; and not on a rope ($835D).

**A moment's grace** (`games/shared/grace.ts`): for 3 seconds after our front end puts Willy back into play he can't lose
a life. Every death (a collision judged at $5405, a fall too far at $53F7, the guardians', nasties' and ropes' own checks)
goes through $51C7, which takes the life ($51F4, `lsr $8096`) and starts him again; `engine.json` lists it under `"skips"`
and the translator (`tools/re/to-ts.mjs`) makes its entry ask `cpu.sk` whether to return at once, as an RTS would
(`NativeHost.onSkip`, set by `play.ts` from `grace: { skip: [0x51c7] }`). The collision stays in $8304 and is judged again
each pass, so the moment the grace ends it kills (`test/grace.ts`).

**A lot easier** (`src/easy.ts`, `test/easy.ts`; Chris asked for it: "just make the game a lot easier"). Each is the game's own bytes
put to a new use. *A second jump in the air* (`AirJump`, `games/shared/native/features.ts`): the jump begun again where he is: $8292
(non-zero while he rises) set, the step of its table ($8293, $8277 the heights, 19 steps) back to 0, $82E4 (non-zero while he falls)
and the fall count $82D7 cleared; with left or right held he turns first by the game's own routines ($56AB left, $56E9 right: $82AE
is 1 left, $FF right, they set his facing too). Once per airtime, on a fresh press with the airtime begun a frame before it.
*Ropes*: a rope is cells of type 9 and more in the screen RAM ($0400, codes & $3F: three cells wide per row, 36 shapes for each
swing, the beach's reaches 12 rows and 20 columns); $5E14 calls $6233 for such a cell under him, which takes hold only if $8305 bit 0
(the VIC's sprite-picture collision, read every other pass) is set, i.e. his sprite meets a rope's one pixel; $53E1 lets him drop after
three steps without it; and `cmp #$0e` at $54E1 (against his place along the rope, $835C) allows the jump off only on its lower part
(its operand is read from memory, `smcOperand`; ENHANCED sets it to 0). ENHANCED sets the report and the VIC's latch each frame, except for
45 frames after he lets go (or he is taken straight back). *Lives*: the byte $8096 filled again at each main loop wait, after the
arrival has seen a life go (a frame of this game rarely ends at that wait, so the end of a frame is no place for it). *A grace on
entering a room*: `entryGrace` (100 frames) from the death routine's own entry, which the grace skips at $51C7. *A gentle touch*:
sprite collisions are the model's frame-end ones (`C64.spriteOverlap`: opaque pixels shared), 14 for a guardian or nasty to kill.
*Sparkles*: the cells of the room's items (`ITEM_CELLS`, from `re/items.ts`) that the game's own bits say are still there.

## Not done

A reachability sweep (every item cell touched, and which need the Secret Passage trick): see `../QOL.md`.

## The ending

The game's own end (checked by running it): in the Masters Bedroom (room 34, room type 6, handler `$7315`, dispatched at `$6E94`) with 160 or
more items (`$8131/$8132`, BCD) the handler does `JMP ($01E0)`. That is not a vector `constVectors` makes direct, and in this image (a TCS crack)
`$01E0` holds `$023A`: `LDA $0201 / CMP #$B5 / BEQ / JMP $0205 / JMP ($01E2)`, where `$0201` is `$B5` (the check passes; the code at `$0205` it
skips fills memory with `$EA`: the crack's own self-destruct, never run), so it goes on through `$01E2`, which holds `$7387`. `$7387` is the
game's real end and nothing else in the game reaches it (`$01E2` is used only by the crack; the other vectors are the game's own). The crack
did not break the ending: the same routine runs, only through its trampoline. What broke was our translation: `$7387` was not an entry,
so it ran on the 6502 fallback, which cannot wait for a frame (a run of it froze the page).

What `$7387` does: it sets `$8073` and `$8217` to 1 (Willy's frame), and **returns at once unless he is standing on the bed** (`$82F6`, the
tile type under his feet, is 3, a conveyor: the bed is cells 2 to 5 of row 12, a block up from the floor, reached by a jump) or the end is
already under way (`$7EC4` is non-zero: set to `$FF` at the start of the sequence and by nothing else). So coming into the bedroom with 160
does nothing; he has to jump onto the bed. Then a loop of 2,048 steps (`$7EC6/$7EC7`, one game frame each: `$5B20` moves him on his own,
`$530B` draws) puts him to bed and sleepwalks him: out of the bedroom to the Top Landing (33), the rooms 63 and 64, the Bathroom (32), and out
of its right exit (a wall blocks it for a player: nothing else leads there) into **room 136, "THE BEGINNING OF THE END"**, about 1,890 frames
(38 seconds) from the bed. The room test at `$73BF` sets his frame for each stage (34: 1, 33: 7, 32: 9), and at `$88` (136) it puts him at x
`$30` and loops for good (`$7410`: `DEC $8292 / JSR $5767 / JSR $4E9A`): he bounces up and down on the spot and nothing returns to the main
loop, so the game's own end never reaches the title. There is no text; the end is that walk and the last room.

Sources on the ending (none describes the C64 sequence, which is from running the image): [JSW2.TXT](https://sunsite.icm.edu.pl/packages/sinclair/docs/game-database/J/JSW2.TXT)
(the Spectrum game: collect the flashing objects, "then make your way back to The Master Bedroom", 150 of 175 needed, "a surprise new ending
too"); the [BBC Micro JSW II page](https://jdawiseman.com/papers/games/jsw2/bbc/jsw2_bbc.html) (guide Willy to collect the items "before
midnight so that Maria will let him go to bed"); [SkoolKit's JSW notes](https://skoolkit.ca/disassemblies/jet_set_willy/reference/facts.html)
(the bed in the Master Bedroom is a conveyor); the [TASVideos JSW II run](https://tasvideos.org/8625S) (finishes by touching the bed).

Where the repeated drop seen on warping in came from: not the end at all. A warp into the bedroom enters by "the way down", the top of the
room, and the floor is 88 pixels below: a fall of 40 or more kills on landing, so ORIGINAL repeats the death and ENHANCED (with `falls`)
lands safe.

The port runs it natively: `$7387` is an entry in `engine.json`, and `repair` in `src/main.ts` sets `$01E0` to `$7387` (the vector the game's
own check evidently had before the crack put its trampoline there; an inference, no uncracked copy to hand), in the title and every save. The
ENHANCED reward ending (`src/ending.ts`, `games/jsw2/re/credits.md`) begins 300 frames after he has come to room 136 (`won` is "in room 136":
only this sequence leads there; `after` in `runNative`'s `ending`), so the game's own end is seen first. Saves cannot be made during the
sequence (the main loop's wait is never reached), so a save is never in room 136.
