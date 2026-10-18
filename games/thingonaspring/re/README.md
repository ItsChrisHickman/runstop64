# How Thing on a Spring was ported

With the shared native-port kit (`games/shared/native`, see `../../entombed/re/README.md`
for the method). Thing on a Spring is built differently from the Pendragon games:

- **It times itself.** The main program paces itself with delay loops (the delay at
  $41BB costs X × 3332 cycles), and its raster interrupts (one for the title at $7254,
  one for play at $42B0, set through the vector at $FFFE with the KERNAL switched out)
  do much of the work, waiting inside themselves too. So `engine.json` translates with
  `countCycles` (every instruction adds its cycles), the delay as a wait with that cost,
  and loops let time pass once a raster line's worth has run. The runtime runs it with
  `timing: 'cycles'`: interrupt handlers run as coroutines that suspend the main
  program, and time passes a raster line at a time so they arrive on time. Timing is
  kept to within a raster line (interrupts land between, not inside, instructions' work).
- **It rewrites its own code** in seven places (`smcOperand`, `smcOpcode`): addresses in
  indexed loads/stores, and an INC/DEC switch in the music driver. `tools/probe --smc`
  finds them from a boot.
- Restart is the title routine ($735E), as after a game over; the main loop is $4371,
  and saves are taken at its delay call ($4377), with the delay time still owed.

Checks: `games/shared/native/test` (`verify.ts thingonaspring` with `GENERATORS=1`,
`resume.ts thingonaspring`).

## The factory (for the map and travel)

Read from the code (the main loop $4371-$4447, the movement $4893, the room objects $5875),
then checked by playing:

- **Where Thing is.** Level $5F (0-3: I-IV) and screen $5E along it: 0 is the lift, odd
  screens are corridors (all alike, $78 = 120 characters long, decorated at random, $4D3E),
  even screens are rooms: $20 = $5E / 2 - 1 + 4 * $5F (0-15; 15 is the goblin's). A room's
  length is its byte in the table at $4C95. Each screen is a strip wider than the picture: its
  map is built into pages $E000-$F4FF (a page a row, a byte a column) from the level's data
  ($1280, $15A0, $15C0 by room) and scrolled sideways ($19 the column, $17 the fine scroll);
  Thing's sprite x is $1D * 2, his y $1E; the movement code reads the map at $462E's column
  and row ($1D - 12) / 4 + $19 (one more left of the middle), ($1E - $64) / 8.
- **Between screens.** Doorways are characters $32/$33 in the map. Walking right through one
  ($4AC6 finds it) sets $92 = 1, $5D = 1, $63 = 1; left ($4B40), $92 = 0. The main loop steps
  $5E on or back, builds the screen and puts Thing at its left end if he faces right ($60
  positive), else its right end ($4C1F). Screen 0 goes off into the lift's own loop ($6D82;
  it only moves with switch 1 on, $0371) until he walks out onto the next level's first
  corridor ($700E). A doorway works whichever way it's walked through, so a doorway in the
  middle of a room leads on or back depending on the way he's going.
- **Travel** (src/travel.ts) is that path pointed at a screen: $5F set, $5E one short (or one
  past), $92/$60 the way he'd walk, $5D and $63 as a doorway sets them, and what he was doing
  (bounce, fall, tube, spring, scroll under way) cleared, so he comes in on his feet.
- **The ways between screens** (re/ways.ts, re/ways.json): Go-Explore from every screen's two
  ends at once (each entered the game's own way, with every switch on), noting each time Thing
  walks into another screen. 68 ways in 9000 episodes; nothing reaches past each level's
  eighth screen from inside it (the ninth corridor and beyond are only reached from starts put
  there, so the map shows screens 1-8). With ENHANCED on (ENHANCED=1, re/ways-enhanced.json,
  same seed and length) it finds all of them but one between two screens past the eighth, and
  13 more (80).
- **Things in rooms** ($5875): a room shows one thing at a time as sprite 7: its jigsaw piece
  (if it has one, $039F + room, bit 7 when taken; picture $D3, place $5830), else its oil can
  ($03AF + room; $D4, $5810; taking it fills 80 units of oil, $90), else its switch ($5850 +
  room gives which, 0-4, bit 7 when taken; $D5, place $5860 by switch; it sets $0370 + switch).
  A new game ($57A9) puts the 9 pieces in 9 of rooms 0-14 at random. The switches are in level
  I's rooms and level II's first: 0 springs ($5344), 1 the lift, 2 the live wires only now and
  then ($5505: off, they're live all the time), 3 the poles ($76), 4 the tubes up ($53F5). With
  all 9 pieces ($CC = 0) the goblin's room shows the goblin's stop (at column $AB); touching it
  ends the goblin ($CD = 2, $61CF) and the game.

## Oil

Oil is $8F (0-255; the gauge: $5627 in rooms, $56F0 in corridors; below $30, Thing and the
gauge flash). It's taken by $56B4: one unit every third call ($C9), every call for a creature's
touch in a room, three a call in the goblin's room; it's called every 128 frames ($573D), on
touching a creature (sprite collisions, $59FB), live wires and hot pipes ($2E, $31, $6A, $6B
while $8C), and bumping a ceiling. Running out sets $1C (the end, $65C1). A refill counts $90
down, a unit a frame ($56A1). $039D = $FF is the game's own cheat (no oil taken): not used.

## Oil out: the game's end, and ENHANCED's life lost

Oil out ($56E2) sets $1C and $63; the main loop ($4396) sees $1C and runs the death ($65C1: the flashing
and fading, 64 steps with sound), which ends at $669F with $D2 = 0 and on to $6A6B → $7DE1: the high score
and the title. ($D2 non-zero is the goblin's end, by $6241.) $669F is a hook. In ENHANCED it asks the shared
`vitals.lifeEnds` (shared/native/play.ts): once the death has played out, the latest autosave (the room as
he came into it) is carried on as CONTINUE? would, with `fullHealth` (oil $FF), no prompt, no title; the
shared grace follows. In ORIGINAL the game's end goes on, and CONTINUE? also gives `fullHealth`.

## ENHANCED (src/assists.ts)

Thing's movement ($4893): $55 a bounce (steps up from $487B, index $56), $53 a fall (steps
down from $486A, up to 8), $5B/$5C the way he's going (left/right, bit 7), $07-$0B the joystick
(left, right, up, down, fire; bit 7 held now, shifted down each read), $72 belts, $76 poles,
$7A slopes, $83 springs, $87 tubes. ENHANCED works between frames on these, and at three
moments the translation reports (`hooks` in engine.json, `cpu.hk` → `NativeHost.onHook`):
$4A9B / $4ABB (a wall has just turned him round: landing help, or air control's stop). Its checks: test/assists.ts (each part
against the original from the same moment with the same joystick, and 210,000 frames of
random play from every screen with each part and all of them: no more frames inside a wall
than the original's own play, no hangs, no fallbacks).

Checks of the map and travel: test/travel.ts (58 ways walked and the lift ridden from each
level, then 4215 travels and 688 round trips from 64 sources: where he arrives is where walking
in put him, the room's map the same, nothing the game keeps changed, refused where it isn't
offered with memory untouched, 264,600 frames of play after with no fallbacks);
test/frontend.ts (the pause screen, the map noting screens, travel by keys and taps, ENHANCED's
switch, hints, continue).
