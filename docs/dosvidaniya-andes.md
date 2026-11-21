# Do Svidaniya Monty: the Andes and the Amazon's room map

Region 6 (docs/dosvidaniya-plan.md), pre-production: design and art as data, no engine or room code. Read docs/dosvidaniya-moscow.md
(how Monty on the Run's rooms open and join) and docs/dosvidaniya-siberia.md (the method, the bar, and the lesson: a place is drawn
as itself, never rooms with words on). Rows 0 (top) to 19, columns 0-31; Monty stands on a floor row F with his body on F-2 and
F-1, and a way out at a side is open at the same rows as the way in of the next room. Every number is a starting value for the
bot to check.

The region's entry is the previous region's last room: the cargo plane's hold (the Pacific), whose open door is the jump. Its exit
is the east edge of R, where Rio's harbour begins.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points the Andes take:

- **A room crossed twice at two heights, the lanes sealed from each other** (`$04 $06 $09 $0C $0D`): the terraces (T1, T2: the low
  path and the top terrace, to and fro), the riverboat (the cargo deck and the top deck).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the cave under the market (M: the panpipes), the Inca
  tunnel (X: the machete), the rope bridge's far cliff (K: empanadas, a view). Three dead ends.
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, key 1 `$14`, item 3 sees off the wasp in
  `$19`): the panpipes see off the spitting llama that plugs the well down to the tunnel, the machete cuts the undergrowth over
  the jetty's rope, the chullo is what the riverboat's captain wants.
- **A chain of items, each a dead end away from the next gate**: panpipes (M) then machete (X) then, in the chullo, the boat.
- **A rope the whole room hangs on, ropes in a ceiling that lead to different places** (`$04`, `$10`): CF's two ropes (up to T1,
  down to the jetty).
- **Open shafts** (`$1D-$1F`, the jetpack): F1 to F3, the parachute drop. Unlike Monty on the Run's jetpack, the drop is not the end of
  a line: every landing is joined to the rest on foot, so nobody is stranded.
- **Water pits and stepping stones** (`$07`): the piranha river's logs between the vines.
- **Loops**: V-T1-CF-M-V (market, terraces, cloud forest, the cave, up again) and T1-T2-X-CF-T1 (under the terraces); and the
  long loop of the high terrace (T1 to T2 to K and back) against the low path (the llama's).

## Part 2: the Andes and the Amazon

Thirteen rooms, a block 4 wide and 4 high (columns a-d are the region's four columns of the world grid, after the Pacific's):

```
          a                       b                        c                        d
row 0   F1 JUMP FOR JOY      F2 OUT OF THIN AIR       F3 CONDOR CLUB              .
row 1   V  EAR YE, EAR YE    T1 NO PROBLLAMA          T2 ROCK AND ROLL         K  BRIDGE TOO FAR
row 2   M  MIST OPPORTUNITY  CF CLOUD NINE            X  INCA-PACITATED           .
row 3      .                 B  THE RIVER QUEEN      P  VINE AND DANDY        R  SNAPPING UP BARGAINS
```

Joins (rope = both ways, drop = one way down, gate = an item):

- Entry: the hold's door, west of F1, high. F1-F2 and F2-F3: flight, sideways (he may drift either way), no floor.
- F2 down to T1 (a landing on T1's top terrace), F3 down to T2 (a landing on its top terrace): **drops**. F1 has no way down but a
  rock spire with a coin and an empanada (a landing on the spire is the skilled one).
- V-T1: walk, low. V-M: a rope down through V's floor gap, both ways. T1-T2: two lanes: the low path (gated by the llama, below)
  and the top terraces (walk, high, open both ways).
- T1-CF: a rope down through T1's floor gap, both ways. T2-X: the well, a ladder (gated by the spitting llama). T2-K: walk, high.
- M-CF: walk, low. X-CF: walk, low. CF-B: a rope down through CF's floor gap behind the undergrowth (gated by the machete).
- B-P-R: east, low (the boat's deck, the vines, the river). R: east, the end of the region.
- Walls (no way): V-F1 (the hold's drop does not reach the market), K-R, T2 east beyond K, M-V west.

**Names** (puns, no Z, no Bond): JUMP FOR JOY, OUT OF THIN AIR, CONDOR CLUB, EAR YE EAR YE, NO PROBLLAMA, ROCK AND ROLL,
BRIDGE TOO FAR, MIST OPPORTUNITY, CLOUD NINE, INCA-PACITATED, THE RIVER QUEEN, VINE AND DANDY, SNAPPING UP BARGAINS.

### The rooms

**F1 JUMP FOR JOY** (flight). In: the left edge, high (rows 2-8): the plane's tail ramp stands out of the edge and Monty drops from
it, the chute opening on the first frame (the canopy is his, a sprite over him). The whole room is sky: a far range of snow peaks
drawn low (decorations), clouds as scenery that pass behind (not solid). A rock spire stands at the foot of the left side (cols
2-7, top row 15) with an empanada, and a coin hangs over its point. Out: right, rows 2-14 (all of it open), into F2. No floor: the
bottom is cloud. Creatures: none. The first flight room is the easy one; it teaches the sink and the steering.

**F2 OUT OF THIN AIR** (flight). In left, any height. A ridge of rock rises in the middle (cols 12-19, top row 12), a shoulder
too high to clear by sinking. An updraft stands left of it (cols 6-8: the wisps rise), and one on its right shoulder (cols 22-24):
the way is to float up the first, drift over the ridge, sink onto the second and be lifted again. A coin on the crest, one in
each updraft. The bottom right (cols 24-30, floor row 17) is a landing terrace: down to T1 by the floor gap at cols 25-27 (the
drop). Condors cross at two heights (see Creatures). Out: right, into F3; down at the gap, into T1.

**F3 CONDOR CLUB** (flight, the climax). Entry left or from F2's right edge. The condors (two, a high one and a low one on a
slow wide circuit, passing each other mid-room) make the timing; the rock is a hanging overhang at the right (cols 20-31, rows
0-6, with icicles) so the way is under it. Two updrafts, one in the middle and a weak one beside the right wall. Down by the
floor gap (cols 8-23, the whole middle): a drop onto T2's top terrace, the Machu Picchu terrace under it (the grand view).
Cloud scenery wheels past. A coin trail through the updrafts (a line to follow), the empanada on the overhang's lip.

**V EAR YE, EAR YE** (the mountain village market). Reached from T1 at the right (low, rows 14-17, the village's lane). The ground
lane (rows 14-17) runs the whole room under market awnings and past the stalls (textiles hung, pots, a guinea-pig pen); steps of
adobe roofs (rows 12, 9) lead up the left to the stall with the chullo hat, hung on a pole on the roof of the last house (a
dead end of the roofs, left: the chullo is the key item). A rope at col 22 through a floor gap (cols 21-23) goes down to M. A
Guinea pigs (cuy) scurry under the awnings. Items: the chullo (the costume). Coins on the awnings.

**M MIST OPPORTUNITY** (dead end, under the market). In: the rope from V, at the right (floor gap cols 24-26). A cave in the
cloud: stone steps down the left (rows 12, 14, 16), a mist that rises from a pit in the floor (deadly: the rock's gap, cols
10-13, crossed on a stone), vampire bats overhead. The panpipes (zampoña) lie on a ledge at the far left (row 9, reached by a rope
at col 3); a coin each end. Out: the way it came (the rope) and the walk east (low, rows 14-17) to CF, the loop's long way round.

**T1 NO PROBLLAMA** (the llama terraces, lower Machu Picchu). Crossed twice. The **top terrace** (row 8, cols 0-31, with the Inca
stairs down each side) is where F2's drop lands, and runs east out high (rows 3-7) into T2. The **low path** (rows 14-17) starts
at the left (from V), climbs two terraces (rows 14 then 12) to the llama herd's pen, a rope at col 27 climbs from it to the top.
Two llamas graze and **wink** (Jeff Minter's: they look out at us, one eye shutting, a nod); one terrace is too low to jump over
a llama without its pace, so they set the timing. A floor gap (cols 14-16) in the low path has a rope down to CF; its ceiling
gap is the top terrace's hole. East end: the low path meets T2's low lane at the right (rows 14-17): walkable once the way
there is open (it always is: this is the first crossing, T2's low lane being the second).

**T2 ROCK AND ROLL** (Machu Picchu proper, the rolling boulders). The great room: the terraces step up the whole left side (the
Inca terraces, a wide stone stair of seven steps, each one cell high and four cells deep, rows 16 down to 4), the Intihuatana
stone and a temple gateway stand at the top, Huayna Picchu's green spire rises behind on the right. Boulders roll down the
terraces on a set pattern (below). The top of the terraces is where F3's drop lands (cols 0-6, row 4); the low lane (rows 14-17)
runs from T1 at the left, under the terraces' feet, to the right wall. A well (cols 25-27, a floor gap in a stone ring, a ladder
down) leads to X; a spitting llama sits on the well's rim and spits across it on a timing until the panpipes are played. East,
out high (rows 3-5) over the rim of the terraces to K's cliff. Niches (alcoves in each terrace's wall, one cell deep) are the safe
places to wait. Coins on the steps, the empanada at the stone.

**K BRIDGE TOO FAR** (dead end). In: left, high. A rope bridge of planks (a floor, cols 6-24) over a gorge with a waterfall that
falls from the clouds, swaying (it is only drawn: it does not move him); two planks are missing (jump the gaps); a condor above
it. On the far cliff: empanadas and a coin and the finest view (Huayna Picchu's far side and the clouds). No way on (a rock wall).

**CF CLOUD NINE** (the cloud forest). Entered three ways: a rope from T1 down through the ceiling (gap cols 10-12), a walk from M
at the left (low), and a walk from X at the right (low). Giant ferns and tree trunks with moss, bromeliads on the boughs (branches
are floors, rows 8, 11, 14), a stream across the middle (water, deadly, a stepping log). A jaguar paces the low path, a sloth
hangs from the high bough (cols 14-18), a toucan sits on the bough, a mist rolls. At the bottom right
the undergrowth (a thick tangle, solid) grows over the floor gap (cols 18-20) that holds the rope down to the jetty. The machete
cuts the tangle (`clear`). Crossed twice at two heights: the high boughs from the ceiling rope to X's side, the low path under.

**X INCA-PACITATED** (dead end, the tunnel under the terraces). In: the ladder from the well (a gap in the ceiling, cols 8-10),
landing on a stone floor. A stone-lined tunnel of dressed walls (the Inca masonry: huge fitted blocks), niches with golden idols,
torches that flicker, a snake, vampire bats; a stair of blocks up the right (rows 15, 12) to a shelf with the machete (a long
blade in a stone). A Mole Crusher at cols 14-16 (the engine's own) stands across the tunnel, crossed on the way in and out. Out west (walk,
low) into CF, or back up the ladder.

**B THE RIVER QUEEN** (the riverboat, drawn as a boat). In: the rope from CF lands on the jetty at the left (rows 15-17). The boat
is a side view on the river: a wide white hull with a red waterline and its rows of portholes, the **cargo deck** (floor row 15,
crates, sacks, a hammock, the engine's coughing funnel in the middle), a ladder to the **top deck** (row 8: rails, the pilot house
with its wheel and a captain, a macaw on its perch, a lifebuoy), a paddle wheel at the stern turning in the brown water (it is
drawn, and slowly turns by `charAnims`). The captain stands at the gangway on the cargo deck and lets him pass in the chullo
(`removeEnemy`): without it a sign reads FARES FOR LOCALS. The boat sails on: banks slide behind it (scenery: palms, huts on
stilts) as the train's windows did. Out east at the deck's end (both decks open: low rows 14-16, high rows 5-7), into P. Creatures:
a macaw (the pilot house), a dolphin leaping beside the hull (the river).

**P VINE AND DANDY** (the piranha river, vines). The boat runs aground: the way on is across a wide river (the floor is water,
deadly, the whole width, cols 4-27) from the stern's bank at the left (floor row 15, cols 0-3) to a mud bank at the right (cols
28-31). Three vines hang from the canopy and swing; piranhas leap from the water. Two floating logs at the middle (floor, cols
13-15 and 20-22) are the resting places. (the swinging vine: below). Crossed once: this is the region's skill room. A toucan
perches; a sloth hangs from a vine's top.

**R SNAPPING UP BARGAINS** (the river's end, the exit). In: left, at the mud bank. The bank winds up a muddy stair (rows 15, 12, 9)
under overhanging boughs to a high bank (row 7); an anaconda coils across the low path and rears on a timing, a dolphin leaps in
the shallows beside, piranhas snap in the stream below the stair. A mooring post with a rope the whole way, and the quay's lights
glimmer beyond: the exit is the right edge, high (rows 5-7), onto Rio's harbour. A last coin and empanada.

### Items, gates, doubling back

- **Chullo** (V, the hat stall): the costume (below), what the boat's captain wants (B). **Panpipes** (M, the ledge): play (the item's
  effect is to see off the spitting llama: `removeEnemy`) at T2's well. **Machete** (X, the shelf): cuts the tangle over the jetty's rope
  in CF (`clear`). **Empanadas** (F1's spire, F3, K, T2, R): the food in place of the cupcake.
- Critical path (the least): F1 F2 T1 V (the chullo; M: the panpipes, back) T1 T2 (the well) X (the machete, back) CF B P R east.
  Landing in F3 instead: T2 first, the well fails until the panpipes: go west (T1 low lane back, V, M), return: the planner has the
  loop. A player who lands anywhere reaches every item (the ropes go both ways).
- The chullo does nothing before the boat; the region's other gates are items, not the hat. No timed warps.

### The new mechanisms (data, built later)

**The parachute drop (F1, F2, F3, the game's flying section; Monty on the Run's jetpack redeemed).** In a flight room Monty has a
canopy (a sprite over him: art/andes-items.ts, its two sway frames; his own picture is his rope-climbing one's hands-up) and his gravity
is the chute's: he sinks 1 pixel every 2 frames (a cell in 16 frames: a room's 160 pixels in 320 frames, 6.4 s) and steers left or
right at 1 pixel a frame by the stick (up is nothing, down folds the chute for a 2-pixel-a-frame fall: a quick dive). **Updrafts**
are columns 3 cells wide that lift him 1 pixel a frame while he is in one (net 1 pixel up, since the chute still sinks) up to the
column's top, a handful of wisps drawn rising in it (`charAnims`: scrolling characters, upward); not a minigame: the line of coins
shows the way and the rock is solid (he stops and stands on a ledge, walks off and the chute opens again; the rock never kills him: only
the condors and a few spikes of ice do). **Condors** (the creatures): a big bird on a slow circuit, wings flapping in four frames, a
dive each pass: they are Monty on the Run's creatures (a path, 8 frames, deadly), and are what the player steers round. Entry to
flight is automatic on leaving the hold's door and on stepping off any ledge in a flight room; it ends on touching a floor tile.
The same rule at a ledge in any other region would be wrong: flight is a room flag (`flight: true` in the room's data, with its
updraft columns `updrafts: {room, col, cols, top}[]`). Dying from a condor puts him back at the room's start with the chute open
(as the jetpack's deaths do). In ORIGINAL the chute's sink is the same; ENHANCED adds the coin trail's glimmer as a hint.

**Rolling boulders (T2).** Three boulders, `rollers: {room, path: [{col,row}...], speed, every, phase}[]`: each starts at the top
terrace (col 4, row 4) and rolls down the seven steps of the terraces (a step is four cells across, one down): 1 pixel every 2 frames
along a step, falls the cell at its edge (8 frames), and continues; it leaves at the bottom (col 24, row 16) and is gone 16 frames,
then rolls again `every` 540 frames, offset 0, 180 and 360: so on each terrace one passes every 180 frames (3 s) and takes about 130
frames to cross a step, so there is a margin of 50 frames and he sees it coming from the stair above (it is drawn from the top) and
cannot be hit while standing in a niche. A boulder kills on touch (Monty hops one over: a hop clears a boulder: 16 pixels, his jump
reaches 24). Works from every side: the boulders' path is the same whichever step he is on; the niches are on both sides of the
steps. Its picture: a round grey-brown rock with a stern face (Indiana's, never named), four rolling frames.

**Swinging vines (P).** Three vines hang from pivots at the canopy (cols 8, 16, 24; row 1), each 60 pixels long (a line of three
segments), and swing like a pendulum through ±40 degrees with a period of 96 frames (`vines: {room, col, top, length, period,
amplitude, phase}[]`, phases 0, 32 and 64 so one is always near). He grabs a vine by jumping into it from a platform or by stepping onto
it from a log (touching its segments while in the air: the vine takes his hands, as a rope does), then rides it until he presses jump
(he lets go and arcs in the vine's direction at that moment, as his hop does) or reaches a platform (he steps onto it). It works from
every side: the same vine is grabbed from the left bank going right and from the right bank going left; at its extremes the tip is
over the bank's edge, and the vines' arcs overlap the logs. A piranha leaps in the water under: the vines never touch the water (a fall
is deadly: the river). Segments are sprites in several angles (art/andes-items.ts `vineSegment(angle)`), the leaf bunch at the tip.

### Creatures (twelve, none in more than two rooms)

| Creature | Rooms | What it does |
|---|---|---|
| condor | F2, F3 | the circuit; wings in four frames, a hooked beak, a white ruff |
| llama (winking) | T1, T2 | grazes along a terrace: one eye winks, a toothy chew; Jeff Minter's, nodded to |
| spitting llama | T2 | on the well's rim, spits across it on a timing; seen off by the panpipes |
| guinea pig (cuy) | V, M | scurries in the shade; round and bright, a face like a pot |
| vampire bat | M, X | flaps across the cave |
| jaguar | CF | paces the low path, spots, a big grin |
| toucan | CF, P | on the bough, the great beak |
| sloth | CF | hangs from the high bough, slow, a goofy smile |
| anaconda | R | coils and rears across the low path |
| piranha | P, R | leaps from the water |
| pink river dolphin | R | leaps in the shallows |
| captain | B | the riverboat's gate: stands at the gangway, arms folded, and steps aside for the chullo |

(The macaw of B is the toucan's colour variant: the same picture, a red colour record; the dolphin leaps there too.) Monty on the
Run's 27 kinds are in 5.5 of its 52 rooms; these are in 1.4 of thirteen.

### Costume: the chullo

The Andean knitted hat with ear flaps and a peaked crown (a conical top with a tassel and a woven band), drawn in red with a white
pattern and long ear flaps with braids, as the ushanka is a costume sprite over Monty (art/andes-hat.ts; `wearing` in art/costume.ts
puts it on all 36 of his pictures). Its colour is light red (10). It lets him blend in at the riverboat.

### Foods: empanadas

A half-moon pastry with a crimped edge, golden (colour 7), in place of the cupcake (200 points). F1's spire, F3's lip, T2, K and R.

### The tune

The Andean minor pentatonic (G, Bb, C, D, F: Hubbard's tune's other notes move to the nearest of these: the raised fourth C# to C, the
major third B to Bb, the sixth Eb to D, the second G# to G, the major seventh F# to F), the lead a pan-pipe (a hollow breathy
noise-over-triangle: a triangle wave with a short attack, a high vibrato slower than the balalaika's, an octave down for the breath),
the stabs charango-like (a bright short pulse of 25%, the pulse-width sweep off), the drums and the bass Hubbard's. Tempo Hubbard's.
In the code a `RegionTune` as Siberia's (`music/siberia.ts`): `tonic: 7` (G), `shift` the table, `instruments` the lead pipe. No folk melody
is quoted.

### ENHANCED hints

One line each, as the items' hints are in `data.ts`:

- chullo: BLEND IN ON THE RIVERBOAT. panpipes: THE LLAMA WILL SETTLE FOR A TUNE. machete: CUTS THE TANGLE IN THE CLOUD FOREST.
- rooms: T2's well: THE LLAMA WANTS A TUNE; CF's tangle: THE UNDERGROWTH WANTS A BLADE; B's captain: THE CAPTAIN WANTS A LOCAL'S HAT.
- flight: FOLLOW THE COINS; AN UPDRAFT LIFTS YOU.

## As built

(Empty until the region is built.)

## Art (pre-production, 2026-11-21)

Made as data in `games/montyworld/src/art/`: `andes-tiles.ts`, `andes-decor.ts`, `andes-creatures.ts`, `andes-items.ts`, `andes-hat.ts` (and its
costume), none in `world.ts` yet (the builder adds them to `WORLD_*` after China's, so indexes never move). Previews:
`/root/projects/runstop64-shots/preprod-andes/` (`test/andes-sheets.ts`, `andes-rooms.ts`, `andes-hat-shots.ts`).

## Decisions for the builder (2026-11-21)

- 13 rooms is fine (the game grows past 55 rooms; Chris liked bigger regions in Hawaii).
- The rougher creatures (condor, toucan, marmoset, spitting llama) get a second pass when the region is built, to the Siberia set's standard.
