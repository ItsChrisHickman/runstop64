# Do Svidaniya Monty: the Andes and the Amazon's room map

Region 6 (docs/dosvidaniya-plan.md). Built 2026-11-21 from the pre-production design and its art (`games/montyworld/src/art/andes-*.ts`), after it was checked against the plan's "Lessons from Chris's play" and changed
where it fell short (the "As built" section says where). Rows 0 (top) to 19, columns 0-31, as in docs/dosvidaniya-moscow.md; Monty stands on a floor row F with his body on F-2 and F-1, and a way out at a side is open at
the same rows as the way in of the next room. Every number was a starting value for the bot to check.

The region's entry is the Pacific's last room: the cargo plane's hold, whose rear door the parachute opens (columns 30-31, rows 14-15: the jump). Its exit is the east edge of the last bank, where Rio's harbour begins
(shut with a sign until Rio is built).

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points the Andes take:

- **A room crossed twice at two heights** (`$04 $06 $09 $0C $0D`): the terraces (T1 and T2: the top terrace and the plateau, then the low path and the lane under them, joined by T1's ladder and by T2's), the riverboat (the
  cargo deck under its cabin, the top deck over it, joined by one ladder; the top deck is shut off from the cargo deck's east, a dead end with an empanada).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the cave in the cloud (M: the panpipes, over a pit of mist), the hat stall's roof (V: the chullo), the Inca tunnel's shelf (X: the machete, behind a
  Mole Crusher).
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, key 1 `$14`, item 3 sees off the wasp in `$19`): the panpipes see off the spitting llama that plugs the tunnel to the well, the machete
  cuts the tangle over the forest floor's gap, the chullo is what the riverboat's captain wants.
- **A chain of items, each a dead end away from the next gate**: chullo (V), panpipes (M), machete (X), then the boat in the chullo.
- **Open shafts** (`$1D-$1F`, the jetpack): the three flight rooms, one under another. Unlike Monty on the Run's jetpack, the drop is not the end of a line: the last flight room's gap lands on the first terrace on foot.
- **Water pits and stepping stones** (`$07`): the mist pit's stone in the cave, the forest stream's logs, the piranha river's logs between the vines.
- **Loops** (the review found the first build a tree with no loop, five rooms in a chain at its end; now two):
  - *Machu Picchu*: T1's top terrace, east onto T2's plateau, down T2's ladder (col 5) to the lane's west end, west into T1's low path (three terraces to climb), up T1's ladder (col 4) to the top terrace: two rooms crossed
    twice (the gate, the llama's tunnel, is east of all of it).
  - *The forest and the tunnel*: the forest's ground, the rope up to the boughs, the topmost bough out east through a door (rows 6-7) onto the tunnel's high ledge (floor 8), a drop to the tunnel's floor, out west low (rows 16-17)
    into the forest again. Both ways between CF and X at two heights, one way round.
  The river half after it (B, P, R) is a chain by its nature (a river is crossed once); the boat's top deck is the side trip.

## Part 2: the Andes and the Amazon

Twelve rooms in a block of four columns (30-33 of the exit grid) and six rows (2-7). The pre-production design had thirteen in a block four by four; the drop became a shaft three rooms high (the sky falls, it does not
shuffle sideways), the bridge dead end and its way east of the terraces were dropped, and the forest was joined to the tunnel and the boat, not to the terraces (a rope from the terraces down into the forest let a player
reach the machete and the boat without the panpipes: the way in to the forest is now only the tunnel's, past the llama).

```
          30                     31                    32                  33
row 2   F1 JUMP FOR JOY
row 3   F2 OUT OF THIN AIR
row 4   F3 CONDOR COUNTRY
row 5   T1 NO PROBLLAMA        T2 ROCK AND ROLL       V MARKET FORCES     M MIST OPPORTUNITY
row 6   CF CLOUD NINE          X THE INCA TUNNEL
row 7   B THE RIVER QUEEN      P VINE AND DANDY       R THE RIVER ENDS   (Rio, shut)
```

Joins (rope = a rope both ways, drop = one way down, gate = an item):

- Entry: the hold's rear door (gate: the parachute), east of it, into F1's tail ramp (rows 14-15, floor 16). F1 to F2 to F3: the open bottom of each room into the top of the next, a drop. F3's gap to T1's top terrace: a drop.
- T1-T2: two walks, high (the top terrace into the plateau, rows 3-5) and low (the low path into the lane, rows 16-17). T1: a ladder (col 4) joins its two lanes; T2: a ladder (col 5) joins the plateau to the lane's west end. T2-V: the steps down to the landing, out east high (rows 10-11) onto
  V's first roof, both ways. V-M: low (rows 16-17).
- T2 lane to X: the well (a floor gap in a two-cell-high tunnel, a rope in it: he takes hold of it as he crosses and presses down), down onto X's rope, which climbs back up the well to the lane (gate: the panpipes, for the llama in the
  tunnel's mouth). X-CF: low (rows 16-17) and high (rows 6-7: CF's top bough into X's ledge). CF-B: a gap in the forest's floor
  under a tangle, a rope down to the boat (gate: the machete). B-P: the stern, east, low (rows 13-14, gate: the chullo, for the captain on the cargo deck). P-R: east, low (rows 13-14). R: east, the end of the region.
- Walls (no way): the flight rooms' sides, T1's west (rows 3-17), the boat's west above the jetty, the cave's east, the forest's and the tunnel's west and east ends but their doors, R's east (a sign: RIO COMING SOON). The mechanisms
  test checks every side of every room: open from the third row down only where a join is.

**Names** (plain first, a pun where it lands, no Z, no Bond): JUMP FOR JOY, OUT OF THIN AIR, CONDOR COUNTRY, NO PROBLLAMA, ROCK AND ROLL, MARKET FORCES, MIST OPPORTUNITY, CLOUD NINE, THE INCA TUNNEL, THE RIVER QUEEN,
VINE AND DANDY, THE RIVER ENDS. (The design's EAR YE EAR YE, BRIDGE TOO FAR, INCA-PACITATED and SNAPPING UP BARGAINS did not land, in Chris's sense of the plan: the puns that do are the llama, the boulders, the
market, the mist, the cloud, the vines and the boat.)

### The rooms

**F1 JUMP FOR JOY** (flight). In at the left on the plane's tail ramp (floor 16: the hold's door; the plane's tail is the wall above and below it). Off the ramp's end the canopy opens. An updraft (cols 9-11) lifts him back up
to glide to a snowy spire at the right (cols 19-24, an empanada on its tip); the cliff at the right (cols 28-31), peaks and a far range below, clouds. The bottom is open (cols 4-18 and 25-27): he sinks out of it into F2.
Coins on a line to follow. No creatures: the first flight room teaches the sink, the steering and the updraft.

**F2 OUT OF THIN AIR** (flight). The canyon: cliffs close in at each side, a ridge rises mid-room (cols 11-20, crest row 9, coins above it), an updraft each side of it (cols 5-7 and 22-24), a condor crossing at the top and
another diving in the right-hand canyon. The right canyon has a floor (it would drop him into F3's overhang): out at the bottom of the left canyon (cols 5-10).

**F3 CONDOR COUNTRY** (flight, the climax). A rock overhang hangs at the right (cols 18-29, rows 0-5) over a shelf (cols 22-27, floor 8) with an empanada; two updrafts (cols 13-15 and 19-21), a ledge at each side, two condors on
circuits (row 5 left, row 12 right). Down through the gap between the ledges (cols 8-23) onto T1's terrace.

**T1 NO PROBLLAMA** (Machu Picchu's lower terraces). The drop lands on the top terrace (floor 6) through a gap in the mountain's rock roof (cols 8-23: nothing solid is drawn where he falls), which runs east out high into the plateau; a ladder (col 4) goes down through the
terraced wall to the low path (floor 18), which climbs three terraces (floors 16, 14, 16) where two llamas graze and wink on the flat (Jeff Minter's) and runs east out low into the lane. Coins on both.

**T2 ROCK AND ROLL** (Machu Picchu proper). The plateau at the left (floor 6: the temple gate and the sacred stone, a ladder down to the lane, Huayna Picchu behind at the right); three boulders roll off its lip down the steps (floors 8, 10) to
the landing (floor 12) and into a heap of rubble short of the doorway, the way out east high into the village. The lane under the terraces (floor 18) comes in from T1's low path: an empanada and a coin, then a low tunnel (cols 11-22, two cells high: no jumping) where the
spitting llama paces the mouth; the well (cols 19-21, a rope in it) is inside it, east of the llama, and goes down into the Inca tunnel. East of the well the lane ends in rock. Huayna Picchu is a steep green spire
rising from behind the steps (scenery tiles, ground to sky: he walks in front of it); a heap of rubble at the landing's end is where the boulders end.

**V MARKET FORCES** (the mountain village). In from the landing on the first roof (floor 12, a stone hut and pots); the roofs step down (floors 14, 16) to the lane (floor 18) under the market's awnings, a guinea pig pen and
stalls, which runs east out low to the cave. A ladder (col 20) from the lane goes up to the hat stall's roof (floor 9): the chullo and a coin. A guinea pig scurries on the lane.

**M MIST OPPORTUNITY** (dead end, the cave in the cloud). In low from the village; mist rises from a pit (cols 9-13) crossed on a stone in its middle; the floor climbs in three steps (floors 16, 14, 12) to a ledge at the
right where the panpipes lie. A bat overhead and a guinea pig. Out the way he came.

**CF CLOUD NINE** (the cloud forest). In from the Inca tunnel at the right (low). The ground (floor 18) runs west over a stream (stepping logs) past a jaguar to a tangle over a gap in the floor at the left (cols 4-7: the
machete cuts it; a rope hangs through to the boat); a rope (col 15) climbs from the ground to the boughs (floors 8, 13, 12) that run across above, the topmost out east through a door (rows 6-7) into the Inca tunnel's ledge, a sloth and a toucan on them. Coins on the boughs.

**X THE INCA TUNNEL** (under the terraces). In by the rope from the well (cols 19-21); a tunnel of dressed stone lit by torches, golden idols, a bat, a Mole Crusher hanging from the ceiling between the rope and the stairs of
blocks up the east end (floors 16, 14, 12) to a shelf with the machete (so the machete is behind the crusher). Out west, low, into the forest, or by a ledge (floor 8, rows 6-7) in the west wall from the forest's boughs.

**B THE RIVER QUEEN** (the riverboat, a side view). In by the rope from the forest on the jetty at the left (floor 16), a plank across to the cargo deck (floor 15) under the cabin; a ladder (col 7) goes up to the top deck
(floor 8: the pilot house, the funnel, a macaw, the lifebuoy, an empanada), which ends at the aft house (cols 24-25, up to row 4: not to be walked off, not to be jumped onto: a dead end). The captain paces the cargo deck
under the cabin (a lane two cells high, shut from the top deck: no way past him; the mechanisms test proves it by the bot's search) and steps aside for a local hat. Out east at the stern, low, under the paddle wheel.

**P VINE AND DANDY** (the piranha river). The boat runs aground. A wide brown river (the floor is water, deadly) from the stern's bank at the left (floor 15) to a mud bank at the right with an empanada; three vines hang from
the canopy and swing, two logs float between, piranhas leap and a sloth hangs under the canopy. The skill room.

**R THE RIVER ENDS** (the last bank). In from the mud bank at the left (floor 15); the bank climbs a muddy stair (floors 13, 11, 9) to a high bank (floor 8) under the boughs with an empanada; an anaconda coils on the second
step, a pool (cols 6-9) between it and the stair has a piranha and a pink river dolphin. The quay's lights glimmer beyond; the way east is shut with a sign (RIO COMING SOON).

### Items, gates, doubling back

- **Chullo** (V, the hat stall's roof): the costume (below), what the boat's captain wants (B). **Panpipes** (M, the ledge): taken, the spitting llama in T2's tunnel is gone (`removeEnemy`). **Machete** (X, the shelf):
  taken, the tangle over the forest floor's gap is cut away (`clear`) and a rope hangs through it (`place`). **Empanadas** (F1's spire, F3's shelf, T2's lane, B's top deck, P's bank, R's high bank): the food in place of the cupcake.
- Critical path (the least): F1 F2 F3 T1 T2 (the plateau, down the steps) V (the chullo) M (the panpipes) V T2 (up the steps) T1 (the ladder down, the low path) T2 (the lane, the tunnel, the well) X (the machete) CF
  (the tangle's gap) B (past the captain) P (the vines) R. A player who skips an item is stopped at its gate and must go back: the machete is in the tunnel he has already walked through.
- The chullo does nothing before the boat; the region's other gates are items, not the hat. No timed warps.

### The new mechanisms (data in `MontyData`, Monty on the Run's value leaves them empty)

**The parachute drop (F1, F2, F3; `flights`, `games/montyotr/src/flight.ts`).** In a flight room Monty hangs under an open canopy (a sprite over him, sprite 2, three pictures leaning the way he steers) and flies as the
jetpack does, slowly: with no stick the canopy lets him sink a pixel every other frame (a cell in 16 frames, a room's height in about six seconds), held down he dives a pixel a frame, sideways he steers at his walking pace,
and up he cannot go by himself. An **updraft** (a column three cells wide, drawn as stacked wisps of air) lifts him a pixel a frame while any of his box is in it, so he rises until his box is wholly above its top row and
glides on. Rock stops him as a wall does: he rests on a ledge (the canopy folds), walks off it and the canopy opens. The condors are Monty on the Run's creatures (a patrol, deadly). Flight is the room's flag, not a rule of
the game. A death starts him again at the room's entry.

**Rolling boulders (T2; `rollers`, `games/montyotr/src/rollers.ts`).** Three boulders (sprites 1, 2 and 6) on one path of the room: off the plateau's lip, along its floor, a fall of two rows at each edge, down the steps and along the landing into a heap of rubble short of the doorway, a pixel a frame, 360 frames to a period and 120 apart, so there is always one somewhere on the steps, seen all the way from the plateau. Death on touch (as a crusher's head); a hop clears one.

**Swinging vines (P; `vines`, `games/montyotr/src/vines.ts`).** A vine is thirteen cells of rope tile hanging from the canopy at columns 8, 16 and 24 down to the banks' floor, swinging like a pendulum (five cells out at the tip, 96 frames a swing, a
third of a swing apart), redrawn over the room's empty cells as it goes. He takes hold of one as of any rope, by walking into it or falling onto it (Monty on the Run's ropes are not taken in a jump), so it swings over the
bank's edge at the height of his body, he steps onto it and is carried with it while he hangs on (nothing held sideways); he steps off sideways onto a log or the far bank as it swings over, or lets go by jumping, and goes
the way the vine is swinging if he holds no direction. A fall into the river is deadly.

### Creatures (twelve, none in more than two rooms)

| Creature | Rooms | What it does |
|---|---|---|
| condor | F2, F3 | white, a circuit across the room (or a dive), wings in four frames |
| llama (winking) | T1 (two) | grazes along a terrace, one eye winks, a toothy chew; Jeff Minter's, nodded to |
| spitting llama | T2 | paces the tunnel's mouth, ears laid back; seen off by the panpipes |
| guinea pig (cuy) | V, M | scurries; round and bright, a face like a pot |
| cave bat | M, X | flaps across the cave |
| jaguar | CF | paces the forest floor, spots, a big grin |
| toucan | CF, B (the macaw: the same picture in red) | white, on a bough, the great beak |
| sloth | CF, P | hangs, slow, a goofy smile |
| captain | B | the riverboat's gate: a peaked cap, a beard and a pipe, a striped jersey; paces the cargo deck, steps aside for the chullo |
| piranha | P, R | leaps from the water |
| anaconda | R | coils on the second step |
| pink river dolphin | R | leaps in the pool |

### Costume: the chullo

The Andean knitted hat with ear flaps and a peaked crown with a tassel and a woven band, drawn in light red as its own sprite over Monty, small, above his eyes (its ear flaps two rows deep at the sides), his face showing (`art/andes-hat.ts`; `wearing` in
`art/costume.ts` puts it on all 36 of his pictures). It lets him blend in on the riverboat.

### Foods: empanadas

A half-moon pastry with a crimped edge, golden (colour 7), in place of the cupcake (200 points); six, one in each of F1, F3, T2, B, P and R. The pause screen counts them with the other regions' food as SNACKS.

### The tune

The Andean minor pentatonic on G (G Bb C D F; Hubbard's other notes move to the nearest: G# down to G, A up to Bb, B down to Bb, C# down to C, Eb down to D, E up to F, F# down to F), the lead panpipes (a triangle wave
with a short attack, a long sustain and a slow vibrato), the runs a charango (a bright short pulse of a quarter width, no sweep), the stabs, drums and bass Hubbard's. Tempo Hubbard's. In the code a `RegionTune` as the
others' (`music/andes.ts`). No folk melody is quoted.

### ENHANCED hints (one line each, 32 letters at most)

- On taking: PARACHUTE: FOR A LONG DROP; A CHULLO: LOOK LIKE A LOCAL; PANPIPES: MUSIC CALMS LLAMAS; MACHETE: HACKS THROUGH VINES.
- On coming into a room without what it wants: T2: THE LLAMA IS CROSS: CALM IT; CF: THE UNDERGROWTH IS TOO THICK; B: THE CAPTAIN CARRIES LOCALS ONLY.

## As built (2026-11-21)

The twelve rooms are in `games/montyworld/src/andes.ts` (ids 55-66, sectors 55-66; the Pacific is untouched but for its hold: the sign is gone and the door's gutter cells open with the parachute), art in `art/andes-*.ts` and
`art/world.ts`, the tune in `music/andes.ts`, the bot's route in `test/andes-route.ts`, the pictures in `test/andes-shots.ts` and `andes-map.ts`. Where the build differs from the design above (and from the pre-production design):

- **The engine** gained, as data (Monty on the Run's value leaves them empty and plays as before: its trace and title tests pass unchanged): `flights` and the canopy (`flight.ts`), `rollers` (`rollers.ts`), `vines` (`vines.ts`), and
  an optional `rows` on a map region (the pause map of a region shows its own rows: the Andes' six of the grid's eight, the earlier regions' three).
- **Twelve rooms, not thirteen**, in a block six rows high: the drop is a shaft of three flight rooms (F1, F2, F3 one under another: entering at the hold's door rows 14-15 left no height to fly in a room on its own row, so the
  sky is stacked and falls), and the bridge dead end (K) is gone. The exit grid is 8 rows now (50 by 8); saves keep their shape (the grid in a save is only read for the C5 street's cell), so the format stays 1 and old saves load.
- **The forest is behind the tunnel.** The design joined the cloud forest to the terraces by a rope, and so reached the machete and the boat without the panpipes. The forest is now entered from the Inca tunnel only, and the tunnel from
  the well, which the spitting llama guards: the chain is a chain. The tangle's gap is four cells wide (a three-wide gap with the rope in the middle left him standing on the rope's top with a solid cell under his third column).
- **A ladder's shaft and a gap are three cells wide at least** (his box is two wide and unaligned three): T1's ladder through the wall was one wide at first and he could not go down it.
- **The vines hang to the banks' height and are taken by walking into them.** Monty on the Run's ropes are not taken in a jump (the shared rule: no rope while `montyAction` is a jump), so the first design, vines hanging high over the
  river to be jumped at, could never be taken. They are thirteen cells long now, swing five cells at the tip over the bank's edge, he walks onto one, is carried with it by its line (not by the cell it is drawn in, which jumps a cell
  at a time) and steps off onto a log or the far bank as it swings over. The bot finds the crossing.
- **The review's fixes** (2026-11-22): no apostrophe in a name or a hint (the font has none: it draws a block; the last room is THE RIVER ENDS); every side that leads nowhere is walled; the flight rooms' open bottoms and T1's roof over
  the landing columns are open air (nothing solid is drawn where he falls); T1/T2 stepped green terraces with Huayna Picchu a scenery spire; the loops above; the boat's top deck shut off from the cargo deck's east (the drop that
  bypassed the captain); a rope in the well (the room flipped between T2 and X every three frames while up was held); the pause screen's icons wrap onto a second row (17 key items ran into the T TITLE line) and shrink the map
  cells to make the room; creatures redrawn (a white condor, a captain in a cap with a pipe, a low-necked spitting llama, a toucan).
- **Creatures** (twelve kinds, none in more than two rooms): a range counts steps of the creature's own pace, so a patrol of 130 at speed 2 is 260 pixels, not 130: the condors' circuits were five times too long at first and
  went through the walls. And a creature patrolling the only way is a wall: a llama on the plateau and an anaconda on the first bank were taken out of the ways (the bot's cold run found each: with the creature adjacent in a lane
  that is the only way, every move dies); the anaconda coils on the second step, the llama is T1's (two) only. The macaw is the toucan's picture in red.
- **The flight** (`FLIGHT.sink` 2): the lift ends when his box is wholly above the updraft's top row (a coin above the column's top needs a glide from it, not the column). F2's right-hand canyon has a floor (its open bottom led into
  F3's overhang rock). The canopy folds on a ledge; the condors' dive in F2 is a vertical patrol.
- **Items** take the bank's blocks the world never shows: the original's item blocks $95-$97 (the chullo, the panpipes, the machete), the last free block $FF (the empanada), the jetpack's $76-$78 (the canopy's three pictures), $98-$9B
  (the boulder's four); the earlier regions' free blocks and the hats' pool are all taken. No new tiles.
- **Walking pace and the gates.** The tunnel is two cells high so the spitting llama is a wall (no jumping a creature in it), the cargo deck under the cabin likewise for the captain; both gates are proved by the mechanism test.
- **The boat** floats on the river now (water under the hull); the paddle wheel is a picture, it does not turn, and no landscape slides past (the design's `charAnims`): left out, as the ship's portholes were.
- **The tune**: the minor pentatonic with panpipes and a charango, no folk melody.
- **Saves**: the format stays 1.

Checks (all pass): `games/montyworld/test/andes.ts original|enhanced` (the bot plays 101 checks' worth of legs from the plane's hold to the last bank taking all 73 coins, the chullo, the panpipes, the machete and the six empanadas,
slow set; about 8,000 frames each in ORIGINAL and ENHANCED), `andes-mechanisms.ts` (75 checks, fast: the flight and its canopy, the boulders, the vines, the three gates, the chullo, the joins both ways, the hints, the map, a save in each room
and an old one), `andes-layout.ts` (212), `music-andes.ts` (9); the earlier regions' tests count the whole world's totals now (67 rooms, 220 coins, 34 finds, 17 key items, 17 snacks); all of Monty on the Run's pass (trace and
title with /tmp/motr.prg included).
Pictures: /root/projects/runstop64-shots/andes/ (`room-*.png` from the real engine with Monty in them, `sheet.png`, `compare-*.png`, `flight.png`, `boulders.png`, `vines.png`, `riding-a-vine.png`, `llama-*`, `captain-*`,
`tangle-*`, `andes-map.png`).

**What to look at in play**: the flight (is the sink slow enough to steer, the updrafts easy to find, the condors fair), the boulders (a hop over one on a step), the vines (the grab by walking into one and the step-off), the
llama's tunnel and the captain's deck as gates, the village and the boat as places (the plainest), and the condor, the toucan and the spitting llama, which are still the roughest creatures.

## Art (pre-production, 2026-11-21)

Made as data in `games/montyworld/src/art/`: `andes-tiles.ts`, `andes-decor.ts`, `andes-creatures.ts`, `andes-items.ts`, `andes-hat.ts` (and its costume), added to `world.ts` after the Pacific's so indexes never move. The only
change since: the decorations `cloud` and `cloudBig` are `skyCloud` and `skyCloudBig` (China's plate had a `cloud`). Previews: `/root/projects/runstop64-shots/preprod-andes/`.

## Decisions for the builder (2026-11-21)

- 13 rooms was fine; the build has twelve (see above).
- The rougher creatures (condor, toucan, spitting llama) were to get a second pass to the Siberia set's standard: tried for the condor, not better than the first, left as drawn.
