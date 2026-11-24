# Do Svidaniya Monty: the reset (Siberia to Rio)

Chris finished the game on 2026-11-22. Moscow, China and Japan play well; from Hawaii on it gets worse. Rooms were built to a
checklist by agents working in parallel, and passing tests is not the same as fun. This file sets the bar for rebuilding the back
half. Part 1 is the study of Monty on the Run and the room budget. Moscow, China and Japan stay exactly as they are.

Everything below about Monty on the Run (MOTR) was read from its own data (`games/montyotr/src/data/motr.json`: tile maps, exit
grid, coin table, joins, `ROOM_EFFECTS` in `motr.ts`) and checked against room pictures. Cells are (column, row) in the 32 x 20
playfield. `docs/dosvidaniya-moscow.md` part 1 has the full join study and the route to the jetpack. This part does not repeat it.

## Part 1

### (a) What makes MOTR fun

**One route that winds and doubles back.** From the start ($00) the way goes west along the house's high lane ($01-$05), drops
through a floor into a sealed high corridor ($0C, $0D) to a dead end ($0E), hairpins down a rope and comes back east-to-west
along the low lane of the same two rooms. A top loop ($04 up to $06, east through $07-$09, down a rope into $01) brings you back
into a room you already crossed, at another height. On the way to the jetpack 22 rooms take 28 steps, and six rooms are crossed
twice ($0C $0D $12 $19 $1A $17). Ten rooms have two ways through at different heights, sealed from each other.

**The lock comes before the key, and the key is off the path.** Each gate is seen first, and its item lies in a dead end or a
doubling back:
- the cake in $0D opens $0C's wall;
- the key in the dead end $13 opens $14;
- the spray in $17 sees off $19's wasp;
- item 5, in the dead end $1B behind that wasp, puts the floor into $1C.

No item gates just a coin.

**Each room asks one thing.** About 3 creatures, 2 of them long up-and-down patrols, with about 8 ledges on 6 levels: a small
climb, not a corridor (`docs/dosvidaniya-room-audit.md`). Half the rooms are "climb past the patrols". A third add a hazard
crossing (water or spikes between ledges). A machine (crusher, lift, teleporter) is in at most a third.

**The way you move changes every 3 to 15 rooms.** In play order, with the share of each room's picture that is solid:

| sector | rooms | what it is | solid |
|---|---|---|---|
| The House (with Jow-An's hall and Pie Are Square) | 15 | interiors, ropes, the loop, two lifts | 21-47% |
| Escape Tunnel | 5 | the tightest stretch: a well down to a dead end and back | 34-48% |
| Sewerage Works | 9 | the first big open space, pipes in every direction | 12-28% (the open block) |
| The Ultimate Experience | 3 | jetpack shafts, no ropes | 34-40% |
| Tree Stump | 4 | outdoors, open sky ($20 is 84% air) | 15-30% |
| Sir Clive's C5 | 5 | a vehicle | 0-19% |
| Das Boat | 10 | open air over water, the finale | 7-41% |

It goes tight, then open, then flying, then outdoors, then a vehicle, then the sea. Every change is a new way to move, not new
scenery. The last sector, the boat, is the biggest after the house.

### (b) Coin patterns (MOTR's own placements)

MOTR has 64 coins in 52 rooms. 14 rooms have none, 18 have one, 14 have two, 6 have three, and no room has more than three.
Every coin sits on a floor, within a jump of one, in the pipe lattice, or in a jetpack room's air. They fall into these patterns:

1. **Teaches the jump.** In $00, the start, the only coin is at the top of three small flowerpot steps (14,9), well away from
   the room's two creatures. It is the first jump you make, in a safe place.
2. **Tops a climb.** In $05 it is on the highest ledge (18,3) and at the top of the rope (7,5). In $0A it is on the top-left
   ledge (5,4). In $1B it is on a block beside the rope's head (23,5). In $01 it is on a pocket ledge at the head of the
   right-hand rope (29,6).
3. **One per height.** $11 has one in its high lane and one in its low lane, in the same column ((23,4), (23,14)). $01 has three
   at three heights ((29,6), (13,12), (6,18)). Crossing the room twice pays twice.
4. **Seen now, reached later.** In $0D the coin (11,14) and the cake are in the low lane, which you see from the sealed high
   corridor on your first crossing. You reach them only after the hairpin in $0E, coming back along the low lane.
5. **At a hazard's edge.** In $12 the coin is on the post on the far side of the deadly pit (23,15). In $0D it is on the step beside
   the deadly tiles (11,14). In $2A it is on the ledge over the deadly pool (16,10). In $28 it is on the ledge over the sea that
   fills the room's floor (28,12).
6. **Guarded.** In $26 the coin is on the deck between two walkers (10,14). In $0F it is in the top-left pocket where a creature
   starts (2,4). In $13 it is at the foot of the stair, on a creature's patrol (12,17).
7. **In a pocket off the route.** In $0E it is in a niche right of the pipes (26,12). In $13 it is in a sealed alcove between two
   walls (19,12). A short detour, never a long one.
8. **Inside the structure.** In the sewer the coins hang in the pipe lattice. $15 has three, taken only by climbing round the
   pipes (13, 9 and 6 cells above any floor). $18 has one at the top and one at the bottom of its far wall ((3,1), (3,16)).
9. **Tests the new move.** In the jetpack rooms the coins sit in hollows you must steer into: in $1E it is inside a ring of rock
   (13,10), and in $1F it is at the foot of a two-cell shaft (10,16).

Three coins is the ceiling, and a room with nothing to say has no coin (14 rooms). Coins never form a line, and they never fill
a floor.

**Where we are.** Moscow to Japan follow this: 67 coins in 38 rooms, 1 to 3 a room. From the Pacific on it breaks: the Pacific
has about 80 in 17 rooms, the Andes 73 in 12 and Rio 62 in 11, so 3 to 7 a room and 215 in 40 rooms. That is more than all of
MOTR, in fewer rooms. That is why the coins "feel random".

### (c) The sewer

**Where it sits.** It is the 14th room of the shortest route, 16 steps in. It comes straight after the Escape Tunnel, the most enclosed rooms in the
game (34-48% solid, one-shaft wells), and before the jetpack.

**How it is built.**
- **The gate.** You come in from the tunnel's $12 through the gated chamber $14. Its inner wall needs the key from the dead end
  $13, and its left wall needs the cake in $14 plus the gas mask.
- **The open block.** Six rooms form a 3 x 2 block: $15, $16 and $17 below, $18, $19 and $1A above. They are joined floor to
  ceiling at nearly the whole width: $18/$15 across 26 columns, $19/$16 across all 32, $1A/$17 across 24. Side by side they are
  open over 15 to 19 rows. Before it, every way up or down is a 3 or 4 column shaft. The six rooms read as one big
  chamber.
- **Pipes, not ledges.** The pipes are rope cells laid as a lattice: 34 to 139 rope cells a room, against 0 to 39 in the house.
  You climb in any direction. The open-block rooms are only 12-28% solid, with fewer ledges (median 5) and levels (4) but long
  climbs.
- **Pockets off the chamber.** $1B is up a 3-column gap from $19: a dead end with item 5. $1C is the way out west, with no floor
  until you have item 5.
- **The puzzle inside the space.** Take the spray in $17. That clears the wasp in $19, so you can reach $1B for item 5. Item 5
  floors $1C. Then you go out to the jetpack. You cross $19, $1A and $17 twice.

**What it does for pacing.** Through the whole house and tunnel the screen has been walls and shafts. Then the edges fall away, you can go anywhere,
you get a little lost, and you find your bearings by the pipes. It is the release after the tunnel. It is also a puzzle
(three items across six open rooms), not a corridor.

**For the Amazon.** Build a 2 x 2 or 3 x 2 block of river and canopy, joined at full width like the sewer, with vines and lianas
as the lattice (the `vines` mechanism exists). Put one small puzzle inside it, and make the rooms before it the tightest of the
region.

### (d) The room budget

Current rooms (`games/montyworld/src/*.ts`, one `cell:` per room):

| region | now | target | why |
|---|---|---|---|
| Moscow | 9 | 9 | unchanged |
| Siberia | 9 | 6 | the train as the set piece with a real puzzle on it (3 cars), then 3 rooms ashore (forest/yeti, mine, the border) |
| China | 9 | 9 | unchanged |
| Japan | 11 | 11 | unchanged |
| Pacific | 17 | 5 | the ship and one island done well: a winding island route with one swim that is a puzzle, not a corridor |
| Andes and Amazon | 12 | 8 | the parachute drop (2), Machu Picchu (2), the Amazon as the open block (4) |
| Rio | 11 | 6 | the last level: the hardest fair rooms and the best set piece, calm backgrounds |
| **total** | **78** | **54** | MOTR has 52 |

The cuts are 24 rooms, all from Siberia onward. MOTR's sector sizes run 15, 5, 9, 3, 4, 5, 10. A region of 5 to 8 rooms is
enough for a route that doubles back once and holds one gate. If more has to go, the Pacific drops to 4. The Pacific's first
room keeps its join with Japan as it is on Japan's side.

### (e) Rules for the rebuild

1. **Fewer, stronger rooms.** Each room asks one thing (a climb past patrols, a hazard crossing, or a machine) and earns its
   place. A room that is only scenery goes. MOTR's recipe holds: about 3 creatures, 2 of them up-and-down; 6 levels; ropes; a
   mechanism in a third of rooms at most.
2. **The route winds.** Each region needs:
   - a room crossed twice at two heights;
   - a dead end that holds an item;
   - a gate seen before its key;
   - one "seen now, reached later";
   - one loop back into a room you already know.

   Draw the region's exit grid and the route first.
3. **One real puzzle and one signature set piece a region.** The set piece is where the region's rooms are built round it. The
   later regions get the best ones. Siberia's train needs a reason to go through it (a gate on board, a car you cross twice),
   not just a ride.
4. **A new way to move per region**, as MOTR changes sector by sector: tight, then open, then flying, then outdoors. Put the
   region's most enclosed rooms just before its most open.
5. **Coins have reasons.**
   - 0 to 3 a room, about 1.2 on average, and none where there is nothing to say.
   - Each coin uses one of the patterns in (b), and you can name which one.
   - No lines of coins, no coins strewn along a floor, no coin in the air without the lattice or a flight to reach it.
   - A region of 6 rooms has about 7 to 10 coins.
6. **Calm backgrounds, strong contrast.**
   - MOTR's pictures (checked room by room) have no backdrop at all: black behind everything. Colour goes on what you stand on,
     what kills you, and a few objects (a clock, a picture, a lamp post, a plant). Start from black and add a backdrop only where
     it tells the place.
   - Backdrops are darker and use fewer colours than anything solid, with no hard top edges that look walkable. Keep little
     detail directly behind where Monty plays.
   - Monty, creatures, items and hazards must read at a glance on every backdrop they cross. Monty's own colours against the
     backdrop come first: Rio's greens hid him.
   - Busy art never stands in for play. Detail goes into the landmark and the set piece, sparingly.
7. **The game ramps up.** The last region plays like the last level: the hardest fair rooms, the tightest timings, the best set
   piece, the finale. It must not be a quieter or busier copy of the earlier ones.
8. **Plain names, no new hint text, no filler statistics.** Keep the gate hints that exist or delete them. Never add more.

## Siberia (the Trans-Siberian)

Nine rooms go down to six. Moscow, China and Japan do not change. G keeps its cell [2,7] and its east opening into China's wall (floor 17,
rows 14-16). China's tower [1,8] is solid all down its west side (columns 0-1, rows 0-19), so a room at [1,7] only needs a solid east
edge on our side. Nothing shifts.

### Which proposal, and why

Two proposals were judged. **The base is proposal A, "the way under the sleeper starts in the dining car".** It makes getting through the
train itself the puzzle, using the parts Chris named: the ticket, the inspectors, the roof, the tunnels, the hatches and the coal. Proposal
B, "the lamp behind the inspector", is a sound MOTR-style double lock, but its locks and keys are in the mine and the cave. Its train stays a
one-way roof run and its cars are only shelters, which is the walk Chris found too easy. From B this plan takes five things:

- a shelter on B's roof that does not reach the corridor;
- the stoker going up and down the coal, in place of new coal slides;
- the yeti's cave entered clear of the yeti's floor path, with a solid outer edge;
- a watchtower for the border guard;
- its notes on falls, saves and edges.

Scores (A first, then B): MOTR-style route and puzzle 4 / 3. Chris's notes 5 / 3. Calm art 4 / 4. Coins 4 / 4. Ramp 4 / 4. Budget 5 / 5.
Buildable 4 / 5.

One claim in A did not hold up and is replaced. A has the mountain "chase you west" on the way back. In the engine, a room's tunnel
cycle starts when he enters the room (`rest`, then the first sweep `offset` frames later, then `warn`), and the mountain comes from the
right at a cell every 10 frames. So by the time it reaches the pine, he is long gone west. Behind him it is not a chase. The timed test is
the trip out to the pine, with one shelter on the way (below).

### The route

```
           col 4                  col 5                     col 6                  col 7
row 0      .                      Y YETI OR NOT             .                      .
                                  dead end: TICKET
                                    ^ the pine (cols 20-21, both ways)
row 1  I=> A THE GRAVY TRAIN      B SLEEPER HIT             C COAL COMFORT         M MINE ALL MINE
           ROOF ===============>  ROOF, closet hatch 10 ##bunker##  (the roof ends)
             | hatches 12, 25     (sealed from below)                cab roof
             v (both ways)                                            | ladder 24
           INSIDE ============>   CORRIDOR ==[INSPECTOR]==> POCKET > coal > TIPPLE ===> GANTRY (high, east)
                    open gangway                                                            | ladder 27
                                                                      GALLERY <== cart <====+ (low, west)
                                                                        | rope 5
row 2      .                      .                         .                      G BORDER LINE CASE ==> China
```

**The joins:**
- I to A: the roof, rows 6-8 (unchanged). A's left side is still shut at rows 15-16 (Moscow's carriage).
- A to B: the roof, plus the inside gangway at rows 15-16. The gangway is open, with no inspector.
- B to Y: the pine. It goes through Y's floor gap at columns 19-22, at least 3 wide, the same opening on both sides.
- B to C: the inside gangway only, rows 15-16, where the inspector stands. The roof is shut at rows 2-8 by the tender's coal bunker.
- C to M: high, rows 1-3, along the tipple over the locomotive. Both edges are shut everywhere else.
- M to G: the rope at column 5, through M's floor gap at columns 4-6. G's rope is already at column 5.
- G to China: unchanged.

**Play order:**
1. From Moscow onto A's roof. The first mountain teaches the hatch: two rungs down a hatch ladder, let the rock pass, climb out.
2. On to B's roof. You see the bunker that ends the roof. Below, in the cutaway, you see the inspector in the corridor's far gangway, and
   one hatch, the closet at column 10.
3. Optionally, go back to A, down a hatch, and east through the open gangway into B's corridor. THE INSPECTOR CHECKS TICKETS. You see
   that the corridor and B's roof never meet.
4. B's roof: shelter in the closet for one sweep, then go for the pine and climb it before the next sweep covers it.
5. Y: read the yeti's loop, climb to the TICKET under the icicle, then go back down the pine.
6. Back along B's roof to the closet or to A, and down one of A's hatches.
7. Through A's inside into B's corridor (B at its second height, the third time you cross it). The inspector steps aside. Go into C's pocket.
8. C: climb the coal past the stoker to the cab roof, then up the ladder to the tipple and east.
9. M: east along the gantry, down the ladder, then west on the cart over the flooded working and down the rope.
10. G: across the cracking ice of the Amur, stopping only on the sandbar, then east out to China.

**Rule 2 of the reset, checked:**
- Rooms crossed twice at two heights: A (roof, then inside), B (roof out and back, then the corridor), and M (the gantry east, then the
  gallery west).
- A dead end with an item: Y holds the ticket.
- A gate seen before its key: the bunker and the inspector are both on screen as you enter B, before you go up the pine.
- Seen now, reached later: M's west-dock coin, seen from the gantry and reached by the cart.
- A loop back into a known room: B's roof, back to A, under it, and into B's corridor.

### The puzzle

**The way under the sleeper starts in the dining car.** Four facts lock together:
- The roof ends at the tender's coal.
- The corridor is shut by the inspector.
- B's roof and corridor are sealed from each other, and the two lanes meet only through A's hatches.
- The ticket is off the train, up the pine, and the pine is reached only from B's roof, under the mountain.

What you work out: get the ticket from the tree, then go back to the dining car to get under the sleeper. You get the ticket by timing, and
you cross every car more than once, at both heights.

**The engine pieces exist.** The inspector in B's east gangway is a figure filling the doorway. The ticket sends him off with `removeEnemy`
on his slot plus the gangway's `clear`, as the Kremlin guard. GANGWAYS keeps only B's column 30 and C's column 1.

**The border barrier stops being a gate.** You cannot reach G without the ticket, so delete its effect and its hint. Draw it raised.
It is a payoff, as the ushanka's was.

### The set piece: the roof run of the Trans-Siberian

- **A teaches it:** one mountain, two well-spaced hatches, nothing else on the roof.
- **B tests it.** There is one hatch, at column 10, into a sealed closet (a luggage cupboard: a 3-wide ladder well, rows 10-12, on a
  closet floor at row 13, walled at columns 8 and 12). Rows 14-16 below it stay the corridor's clear way, and the closet never reaches
  it. Tune B's `rest` and `offset` with the bot:
  - the entry to the pine's top in one go must lose by a few cells;
  - sheltering in the closet for one sweep, then going, must reach the pine's top with about 40 frames to spare.
- **C is the locomotive.** You climb off the moving train to the tipple.
- **The big yeti** is the region's one big creature, in its own den.

Mechanisms in the region: the tunnels (A, B, the set piece), the cart (M) and the cracking ice (G), plus the gangway's `clear` and the
yeti. The snow falls and the lamp's `place` go, and C gets no coal slides.

### Rooms: kept, moved, cut

| room | id | cell | verdict |
|---|---|---|---|
| THE GRAVY TRAIN | 9 | [1,4] | kept, reworked (the gangway is open; the inspector moves to B) |
| SLEEPER HIT | 10 | [1,5] | kept, reworked (no corridor hatches; the closet; the pine; the gangway inspector) |
| COAL COMFORT | 11 | [1,6] | kept, reworked (the bunker; the ticket leaves; the ladder to the tipple) |
| PINE TO BE WILD | 12 | [0,5] | cut (its climb is B's pine) |
| YETI OR NOT | 13 | [0,4] to [0,5] | kept, moved above B, holds the ticket |
| MINE ALL MINE | 14 | [0,6] to [1,7] | kept, moved; the tipple, the hairpin, the cart |
| SHAFT OF DARKNESS | 15 | [0,7] | cut, with the lamp, its `place` effect and TOO DARK TO SEE THE LEDGES |
| BAIKAL TO BASICS | 16 | [1,7] | cut; its cracking ice goes to G, and the nerpa and fishing hut go |
| BORDER LINE CASE | 17 | [2,7] | kept, rebuilt as the frozen Amur |

There is no fourth car: [1,7] is the mine's.

**Notes for the builder:**
- China's ids (18-26) and sectors (18 on) must not move. Give the retired ids 12, 15 and 16 stubs, or build the room table by id. The
  coordinator's whole-reset id plan decides.
- Rooms move, so bump the save format.
- The lamp leaves `progress.keyItems`, and item numbers are settled under the same plan.

### Room by room

**A THE GRAVY TRAIN** (it teaches the move)
- **Layout:** as now. The roof is at row 9, with hatches at columns 12 and 25 and ladders down to floor 17. The mountain comes from the
  right. The west pocket, closed by Moscow's carriage, holds the pelmeni. The east gangway is open into B's corridor.
- **Creatures:**
  - the conductor (the inspector sprite), a long, slow walk along the car;
  - the samovar hopping up and down on the counter by hatch 25's foot, so the climb down there is timed.
- **Coin (1):** on hatch 12's ladder, two rungs below the roof, about (12,11). It teaches the jump: it is where you stand while the
  mountain passes.
- **Background:** the moon and stars on rows 0-1. The horizon behind the roof lane (rows 5-8) is dark-blue mountains and dark-green pines,
  with no white peaks. Dim the poles and wires, and drop the smoke band. The far wall is one dark tone, with dark window frames and
  only two windows. Keep the RESTAURANT board.

**B SLEEPER HIT** (the set piece's test)
- **Roof:** row 9, columns 0-29, with only the closet hatch at column 10. The pine's trunk at columns 20-21 rises from the cutting to
  the top edge (`coversClimbs`, as now). At columns 30-31, rows 2-8, is the tender's tall coal bunker. It is solid 'T' with coal
  decoration over it, because the palette is full at 8. It must read as the gate: black coal with a bright edge.
- **Corridor:** floor 17, from the open west gangway to the inspector in the east gangway, with one berth ledge at row 13, east of the
  closet. The route test must prove there is no path between the roof and the corridor inside B.
- **Creatures:**
  - the provodnitsa, a short, fast walker by the berths;
  - the inspector in the gangway, who stays still and leaves when you have the ticket;
  - plus the mountain. There is no owl.
- **Coins (2):** one in each lane, in column 27, like MOTR's $11.
  - (27,7) on the roof by the bunker, at the hazard's edge where the mountain comes in.
  - (27,15) in the corridor in front of the inspector, guarded by the provodnitsa's patrol.
- **Background:** the cutting's banks in one dark colour with no bright edges, dark-green pines, the moon, no smoke, and three windows
  at most.

**C COAL COMFORT** (the tender and the locomotive)
- **The way in:** the inside gangway at floor 17, rows 15-16, into the pocket. The left side above it, rows 2-9, is the bunker, shut.
  The rim's hatch and the rope up into [0,6] go.
- **The climb:** the pocket (17), then coal steps (15, 13), then the heap's crest (11). Down into the trough (15), then coal up by the
  cab (13, 11), then the cab roof (10). The ladder at column 24 goes up through a 3-wide gap in the tipple's deck (row 4), then east at
  rows 1-3 into M. The right edge is shut below row 4 (the boiler and wheels, as now).
- **Creatures:**
  - the stoker (the miner sprite) going up and down the coal steps, columns 6-7, rows 10-16;
  - the samovar here goes.
- **Coin (1):** on the heap's crest, inside the stoker's reach. It is guarded.
- **Background:** the one room where the locomotive's smoke drifts back (dark grey), plus the moon. The wagon's boards are dark brown,
  and the tipple's timber and legs are dark behind the line. The cab and boiler stay the bright solids.

**Y YETI OR NOT** (the dead end with the ticket)
- **Layout:** today's cave and the yeti's loop, mirrored so the way in is the pine's floor gap at columns 19-22. Shift the loop so it
  never crosses the gap or its first ledge: arriving never drops you into its lane. All four outer edges are solid rock.
- **The climb:** a stair to the ice bridge (row 9), then the ice ledges up the frozen waterfall to the high stash. The TICKET is under
  the icicle. The second pelmeni goes.
- **Creatures:** the yeti and the icicle. (Its randomness is being fixed elsewhere.)
- **Coin (1):** on the middle of the ice bridge, on the yeti's loop. It is guarded: take it while the yeti is on the floor.
- **Background:** black, with dark-blue rock (not light blue). The waterfall narrows to 2 cells of dark cyan. The ice ledges are bright
  white-cyan, so they read as solid. One or two stalactites.

**M MINE ALL MINE** (the hairpin; the region's most enclosed room, just before its most open)
- **The way in:** the tipple's gantry, timber at row 4, columns 0-25. The left edge is open at rows 1-3 and shut below. The whole
  east edge is solid.
- **Layout:**
  - a 3-wide gap at columns 26-28, with a ladder at column 27 down to the gallery (row 18);
  - the east dock at columns 21-31, with two timber ledges at rows 16 and 14 stepping up from it;
  - the flooded working at columns 8-20, with the cart (the existing bouncing float, its span set to 8-20);
  - the west dock at columns 0-7, with the floor gap at 4-6 and the rope at column 5 down to G.
  - A fall into the water restarts on a dock, never in a trap.
- **Creatures:**
  - a miner walking the east dock at the ladder's foot, so the climb down is timed;
  - a bat going up and down over the working, which you ride under;
  - a bat going up and down through the gantry's lane at about column 14.
- **Coins (2):**
  - on the west dock, about (2,16): seen now from the gantry, reached later by the cart;
  - on the top timber ledge: it tops a climb.
- **Background:** black. Rock only at the edges, in dark brown. The water is dark blue. Monty Mole's coal bucket stands on the east dock.
  No scattered seams or props in the play area.

**G BORDER LINE CASE** (the release: the frozen Amur, which really is the border)
- **Layout:**
  - the village bank (columns 0-8), with the rope's foot and one cabin; keep the overhang clear of columns 4-6;
  - the ice on row 17 at columns 9-14 and 18-23, cracking (the lake's CrackSpec moved to row 17, the same timings, patches of 6);
  - a sandbar island at columns 15-17;
  - the far bank at columns 24-31, with the barrier at 28-29, drawn raised, and a drawn watchtower beside it;
  - water at rows 18-19.
  - The palette is S, K, I, J, H, W, R and B: 8 codes.
- **What you do:** keep moving on the ice and stop only on the island, to wait for the reindeer and the guard.
- **Creatures:**
  - the reindeer pacing the far bank to the ice's edge;
  - the guard going up and down the watchtower's ladder, down to the ground lane.
- **Coin (1):** on the island, the only place you can stop. It is at a hazard's edge.
- **Background:** black night and a few stars. The far bank's low hills are dark, and the ice is pale. Keep ROAD TO CHINA only where it
  is not behind play.

### Totals

- **Coins:** 8 in 6 rooms (A 1, B 2, C 1, Y 1, M 2, G 1), each with a named pattern from (b). None are in a line or strewn.
- **Items:** the ticket (Y) and the pelmeni (A).
- **Hints:** no new text.
  - Keep THE INSPECTOR CHECKS TICKETS on B only, and keep the ticket's take hint.
  - Delete the gravy and border lines, and both of the lamp's hints.
- **Creature kinds:** inspector, samovar, miner (C, M), yeti, bat, reindeer and guard. No kind is in more than two rooms. The wolf, bear,
  owl and nerpa go.
- **Decoration kinds:** this only goes down (pine boughs, the fishing hut and the snow lumps go). The bunker's coal and the tipple
  reuse the coal and timber kinds.
- **Ways to move:** sheltering and dashing on a moving roof across two lanes, timing a big creature, climbing coal, riding a cart, and
  keeping moving on ice.

### For the builder

1. Merge main first, and stay off the other agents' fixes:
   - the tunnel's edge-to-edge bricks;
   - the backdrops' first and last columns;
   - Coal Comfort's black squares;
   - the yeti's randomness;
   - coin holes;
   - the region tune.
2. Measure with the bot:
   - B's closet-then-pine timing (one go fails, one shelter succeeds by about 40 frames);
   - a death on B's roof restarts with the cycle from its start, plus grace.
3. Every climb (the pine, the hatches, the closet, the tipple ladder, M's gaps) meets the climbs.ts norm: 3 wide or more, the same
   opening on both sides. Every one, and the cart and M to G, go both ways, so nothing can softlock.
4. Effects in data.ts:
   - drop the lamp's `place` and the border barrier;
   - add the ticket's `removeEnemy` for B's gangway inspector;
   - move CRACKS to G at row 17;
   - SIBERIA_PULSES becomes empty (the engine code stays);
   - retarget MINE_CART.
5. Tests to rewrite: siberia-route (the legs above), siberia-mechanisms, siberia-map, the shots, joins/edges/climbs, creature contrast,
   and train.ts's tender animations.
6. Moscow's and China's tests pass unchanged. moscow.ts and china.ts are not touched.

## the Pacific (cargo ship, Hawaii, cargo plane)

This replaces the earlier Pacific plan (a7faaad) after a second round of proposals. The 17 rooms on main (20 on the v2 branch
`worktree-agent-a4e02a7d7dc2e04df`) go down to 5. Moscow, China and Japan do not change. The first room keeps cell [2,17] and STERN
WARNING's west edge exactly, so Japan's port is untouched: the landing is at floor 13 on columns 0-3.

### Which proposal, and why

**The base is proposal B, "set-piece first".** Its puzzle is the MOTR shape: the breakers on Waikiki's beach are the gate. You see
the gate and the snorkel (its key) together, and you work out the way round by the ship. It keeps THE ROAD TO HANA, which Chris
named, and rebuilds it with a forced stop. It ends on the region's hardest room, a run from rising lava to the plane, which drops
straight into the parachute sequence Chris liked best. It builds on the reset/pacific branch, so most of the mechanisms it needs exist.

Proposal A is sound but weaker:
- It gates the way with bolt cutters and a chain, and the Hilo guard with the lei. That is "costume plus guard" again, which Moscow,
  China and Japan already use.
- Its main new engine piece (a drifting current band) does what reset's `currents` surge already does.
- Its last room is a walk to a door, so the region does not ramp up.

From A this plan takes three things:
- **The swim is a U, not a choice of lanes.** You cross C twice at two heights: west in the top lane against the surge, then east in
  the deep lane past the morays. B's "choose a lane" let a player skip half the room.
- **The pull-in before each bridge** on the road, where the wait happens, with the coin in it.
- **Lahaina at the road's foot and Hana at its head**, so Maui reads west to east as Chris knows it.

Kept from the first Pacific plan: no surface line in the swim room (the dive gap is its only opening above, so nothing bounces), the
cracking crust, a yellow or white magma blob (orange vanishes on lava) and the late-game lava speed.

Scores, A first, then B:

| | A | B |
|---|---|---|
| MOTR-style route and puzzle | 3 | 5 |
| Chris's notes | 4 | 5 |
| Calm art | 4 | 4 |
| Coins with reasons | 4 | 5 |
| Ramp | 3 | 5 |
| Budget | 5 | 5 |
| Buildable | 4 | 4 |

### The route

```
            col 17                    col 18                      col 19
row 2   Japan ==> A THE CARGO SHIP ==deck/hold==> B WAIKIKI        E HILO ==rows 14-15==> Andes [2,20]
                   landing, hatch, hold,          lanai (high),      lava basin, climb, rim,
                   engine room, deck              beach (low)        apron, plane's hold
                                                  | breakers,        ^ cargo net, cols 24-27
                                                  | cols 25-29       |
row 3                                           C THE CHANNEL ==rows 13-17==> D THE ROAD TO HANA
                                                  (the one swim)             (three levels)
```

**The joins:**
- **Japan to A:** the landing at floor 13, as now.
- **A to B, twice:** the hold (floor 18) onto Waikiki's beach, and the deck (floor 9) onto the lanai.
- **B to C:** the breakers at columns 25-29, deadly until the snorkel, then a dive through C's only ceiling gap at the same columns.
- **C up to B's pocket:** the pier piles at columns 8-9 climb out of the sea into a dead end under the pier.
- **C to D:** a swim doorway at C's east edge, rows 13-17, onto D's shallows at floor 18 (Lahaina's slipway).
- **D to E:** the cargo net at Hana's jetty, columns 24-27, up through D's ceiling. The opening is at least 3 wide with the net centred.
- **E to the Andes:** the plane's rear door at rows 14-15, the contract the Andes' jump room already has. The Andes' first room moves
  to [2,20].
- **B's east wall and E's west wall are solid.** They are side by side but not joined.

**Play order:**
1. **A:** off the landing. The landing is a well deck walled east by the bridge's base, too far below the main deck to jump. Drop
   through the hatch (columns 6-8) into the hold and walk east.
2. **B, low:** along the beach to the breakers (A MOLE CANNOT SWIM THAT FAR). The snorkel is on the surf shack's roof shelf, out of
   reach from the sand.
3. **A again:** back west along the hold to the engine room, through the grating between the two Mole Crushers. Up the ladder at
   column 2 to the deck, then east under the crane's swinging crate.
4. **B, high:** along the lanai past the three torches, taking the lei at the luau stage. At the east rail, a rope goes down onto the
   shack roof for the snorkel. Drop to the sand (back on a beach you know) and dive through the breakers.
5. **C:** in at the top right. West along the top lane against the surge, from coral lee to coral lee. Down the west drop-off, then
   east along the deep lane past the morays and the sunken crate (the musubi). Out at the slipway.
6. **D:** east on the bottom level, west on the middle, east on the top to Hana's black sand. Up the net.
7. **E:** you come up under the plane and can see it, but you can't reach it. West into the basin; the lava starts behind you. Climb
   the winding route up the left, run east along the rim, and take the rope down to the apron. In the plane, climb the net to the high
   rack for the parachute. It opens the rear door, and you jump into the Andes.

**Rule 2 of the reset, checked:**
- Rooms crossed twice at two heights: A (hold, then deck), B (beach, then lanai) and C (top lane, then deep lane).
- Dead ends holding items: the shack roof (snorkel), the sunken crate (musubi) and the high rack (parachute).
- A gate seen before its key: the breakers and the snorkel, seen together from the sand.
- Seen now, reached later: the snorkel on the roof, and the pier pocket's coin, seen behind the piles from the beach and reached from
  the sea. In E, the plane itself.
- A loop back into a room you know: beach, hold, deck, lanai, roof, then back onto the beach.
- Tight before open: the ship (the most enclosed room) comes before Waikiki, and Waikiki before the open water.

### The puzzle: the sea is the gate

From the start, water kills Monty: the bilge in A, then Waikiki's surf. The snorkel turns the sea into the way on. You see it first,
out of reach, beside the gate it opens. The way to it is back through the ship you just crossed, at the other height. That is the
shape of MOTR's cake and wall.

Deep water needs the snorkel (Chris's bug). C is reached only through the breakers, which drown him without it (v2's swimGate), so
there is no way to swim without the snorkel.

The lei gates nothing. You take it at the luau and wear it round the neck, as Chris asked. The guard and the bolt cutters are cut.

### The set piece: HILO, the run for the plane (room E)

You arrive right under the goal, and the only way to it is away from it, under pressure, and back over the top. It is the hardest
room in the region, and it hands straight over to the parachute drop.

### Rooms

**A THE CARGO SHIP** [2,17]. Arrival banner "HAWAII: OAHU", as it is now. The tightest room of the region.
- **Layout:**
  - The ship is drawn in section.
  - The landing is at floor 13. The hatch at columns 6-8 drops into the hold, which runs at floor 18 to the east edge.
  - The engine room is at the hold's west end: a grating between two Mole Crushers, with the bilge gap under it.
  - The ladder at column 2 climbs to the deck (floor 9), which runs east under the crane's jib to the edge.
- **What you do:** The first pass, east, is easy. The second, back west, asks for the crusher timing, then the ladder, then jumping
  the crate on the deck.
- **Creatures:**
  - the crane's crate, sweeping the deck;
  - the parrot over the hatch (vertical), so the drop needs timing.

  The crushers are the room's machine.
- **Coin (1):** on the grating step between the crushers (at a hazard's edge).
- **Background:** black. The hull and decks are navy and grey. Aloha Tower is one dark-grey silhouette, upper left, with nothing
  behind the lanes.

**B WAIKIKI** [2,18]. The open room after the hold, and the puzzle room.
- **Layout:**
  - **Low lane, the beach (floor 18):** east from the hold past the surf shack (the snorkel is on its roof shelf) to the breakers at
    columns 25-29. At the left, a pocket under the pier sits behind the piles, reached only from the sea.
  - **High lane, the lanai and the luau stage (floor 8):** east from A's deck past the three torches, on their current timing. The lei
    is on its stand on the stage. At the east rail, a rope goes down onto the shack roof.
  - The lanes meet only by that rope and the drop off the roof.
- **Creatures:**
  - a tern diving straight down over the beach and climbing back (vertical);
  - the hula dancer on the lanai, beyond the lei's stand (horizontal).
- **Coins (2):**
  - In the 3-cell gap between the second and third torch (at a hazard's edge). You take it while waiting out the flame.
  - In the pier pocket (seen now, reached later, and a pocket off the route).
- **Background:** black. The sand is yellow, the lanai pale grey, the torches as they are. Diamond Head is a low, dark single-colour
  silhouette at the far right only, with no walkable-looking top edge. It is kept away from Monty's lanes, so he never stands against
  green.

**C THE CHANNEL** [3,18]. Arrival banner "HAWAII: MAUI". The one swim room, made worth it.
- **Layout:**
  - Rows 0-7 are black sky, with Molokai's sea cliffs dim grey on the horizon. They are never behind a swim lane.
  - The sea is below row 8 (reset's raster split, so coins and items show). There is no surface line. The dive gap at columns 25-29 is
    the only opening above.
  - **Top lane (rows 9-12):** the surge comes in sets running east, against you (reset's `currents`, about 90 frames on and 120 off).
    Kelp leaning and a stream of bubbles show a set at once. Three coral heads give lees; you go from lee to lee between sets. A reef
    wall at the right seals the top lane from the exit, so you have to go west.
  - **The west drop-off** leads down to the deep lane. The pier piles at columns 8-9 climb from the top lane into B's pocket.
  - **Deep lane (rows 14-18):** calm, past two moray holes and the sunken crate, east to the slipway doorway at rows 13-17.
- **Creatures:**
  - the turtle, rising and sinking between the heads (vertical, across the top lane);
  - one moray, using v2's pulse: its eyes blink before it lunges (the second hole is empty and is the lee);
  - the reef shark, on a slow pass in the deep lane.
- **Coins (2):**
  - In the hollow behind the middle coral head (tests the new move): you steer into the lee between sets.
  - At the moray's hole mouth (guarded).

  The Spam musubi is in the sunken crate: the reason to dive.
- **Background:** black air over one flat dark-blue sea. The coral is in solid colours, with no kelp forest and few bubbles.
- **Swimming:** v2's happy crawl: a horizontal body, a clear stroke, mask and snorkel, bubbles.

**D THE ROAD TO HANA** [3,19]. The timing room, with a forced stop.
- **Layout:**
  - The cliff road runs on three levels joined by bamboo at the bends: bottom east (floor 18), middle west (floor 12), top east
    (floor 6).
  - Lahaina's slipway and banyan are at the foot, left. Hana's black sand and jetty are at the top right, where the cargo net climbs
    through the ceiling (columns 24-27).
  - Each bridge has a pull-in before it, with a yield sign.
- **The bridges:**
  - **Bridge 1** (bottom, 10 cells): a car comes from behind, eastbound. You clear it at a run or wait in the pull-in.
  - **Bridge 2** (middle, 18 cells): cars come both ways, alternating, and the bridge is too long to cross in one gap. Halfway there is
    a raised refuge, 3 cells wide and 2 high above the lane. You must hop onto it and let the car pass under. This is the forced stop.
  - **Bridge 3** (top): an oncoming car plus the waterfall's spray across the deck (a `pulses` strike). You wait in the pull-in for both
    to clear.

  Running fast no longer works.
- **Creatures:**
  - a coconut falling from a palm at the right bend onto the bamboo (vertical);
  - a nēnē on the top level's verge.
- **Coins (2):**
  - On the refuge, the reward for stopping (at a hazard's edge).
  - At the head of the right bend's bamboo, under the coconut (tops a climb, guarded).
- **Background:** black. The cliff rock is dark brown, as walls only. There is one pale-blue waterfall at each bend, and the spray is
  the hazard. No jungle fill behind the lanes.

**E HILO** [2,19]. Arrival banner "HAWAII: THE BIG ISLAND". Kilauea's flow under the airport, and the set piece.
- **Layout:**
  - You come up the net into a dock under the apron (floor 19, columns 22-28).
  - A low passage runs west into the basin (columns 0-15). Stepping past its lip starts the lava. It rises a row every 40 frames up to
    row 6, holds 150 frames, then drains a row every 12. It never kills on entry. The fairness check tunes it.
  - The climb winds left, right, left. The first stepping ledges are cracking crust (`cracks`), then a ledge with a timed steam vent,
    then a chimney with the magma blob.
  - The rim (floor 4) runs east under the plume. A rope at column 17 goes down onto the apron (floor 16, columns 16-31). The rock wall at
    columns 15-16 seals the apron from the lava.
  - The plane is in section: a side door, a cargo net up to the high rack with the parachute, and the hoisted crate sweeping the roller
    floor. The rear door is in the east wall at rows 14-15, with the red jump lamp, shut until you have the parachute.
- **Creatures:**
  - the magma blob, yellow or white, bobbing in the chimney (vertical);
  - the hoisted crate in the hold.

  The lava, the crust and the vent are the machine.
- **Coin (1):** on the highest crust ledge the lava reaches, just under the rim (at a hazard's edge). You can take it only while you
  are ahead of the flow.
- **Background:** black. Kilauea's plume is dark grey, high on the left. The lava is red under a yellow crest, the plane white and the
  apron grey. Ledges are brighter than anything behind them.

### Totals

- **Coins:** 8 in 5 rooms (1, 2, 2, 2, 1), each with a named pattern from (b). There are no lines of coins and none in open air.
- **Items:**
  - the snorkel (the gate);
  - the lei (a costume, gates nothing);
  - the Spam musubi;
  - the parachute (the rear door).
- **Creature kinds:** crate, parrot, tern, hula, turtle, moray, shark, coconut, nēnē and magma, 10 in all. That is down from v2's 16,
  and the crate is the only kind used in two rooms. The decoration kinds fall with the cut rooms.
- **Mechanisms:**
  - crushers (A);
  - torches (B);
  - surge (C);
  - cars both ways and spray (D);
  - lava, crust and vent (E).
- **Hint text:** none added. The existing snorkel and parachute hints stay as they are.

### What happens to the old rooms

- **A THE CARGO SHIP:** STERN WARNING and BOX CLEVER are merged. The engine room and hold come from STERN, the crane crate from BOX.
- **B WAIKIKI:** SURF AND TURF and LEI OF THE LAND are merged, with v2's THE FEAST, DIAMOND HEAD and THE LOOKOUT. PIER PRESSURE is cut.
  Aloha Tower stays as A's silhouette.
- **C THE CHANNEL:** replaces CLAM DOWN, MOLE-OKAI, KELP WANTED, THE SEA CAVE and FISH OUT OF WATER. Molokai is the cliffs on the
  horizon. The sea-cave bounce goes with its room.
- **D THE ROAD TO HANA:** kept and rebuilt. HANA BANANA folds into its top right, which removes the stuck right side. WHALE OF A TIME is
  cut: its brig becomes Lahaina's slipway, and the floating palm goes.
- **E HILO:** MAUNA KEA-OS, HILO GOODBYE and HOLD YOUR HORSES are merged. COFFEE BREAK is cut.
- **Cut with v2:** the serpent, the gatehouse guard, the bolt cutters and the chain.

### Notes for the builder

- **Merge v2 first** (`worktree-agent-a4e02a7d7dc2e04df`), then reset/pacific. Keep the swim frames, swimGate drowning and its test,
  the float-ceiling fix and `test/no-bounce.ts`, the arrival banners, `roomBlocks`, the moray pulse, the surge, the raster-split sea,
  crust, vents, the hoisted crate and save migration for the cut rooms.
- **Japan:** A's west edge must match Japan's port exactly. Nothing changes in `japan.ts`, its art, joins, music or tests.
- **Engine additions** (data only, empty for Monty on the Run, whose fast tests and trace must stay green):
  - a direction per tunnel mouth, so cars come both ways (today a car always goes the way Monty goes);
  - a column range for `risingLava`, if it fills the whole width today.
- **Contrast:** check Monty, the turtle, the shark and the magma blob against their backdrops with `creature-contrast.ts`.
- **If the Pacific must drop to 4:** fold C into D. The breakers drop into a short reef swim along D's bottom level, with the surge and
  one moray, onto Lahaina's slipway. This keeps the snorkel gate, the road and the run for the plane, and gives up the two-height swim.

## Rio (the last level)

The current 11 rooms go down to 6 play rooms plus the beach, which is the ending's stage: 7 in all. Moscow, China and Japan do not
change. Rio's first room meets the Amazon's east edge at [7,32] as it is today (rows 6-7, floor 8). If the Amazon's rebuild moves its
exit, only Corcovado's west edge follows.

### Which proposal, and why

Two proposals were judged. **The base is proposal A, "play first".** Its route is the better MOTR route:
- Lapa is crossed twice at two heights, on the street and then on the track.
- The loop runs Lapa, Sugarloaf, back into Lapa, back into Sugarloaf.
- One item, the crank, is used twice: it works the cable car's winch, then it arms the Sambadrome's lever. That is a puzzle shape LESSONS
  asks for and no region has yet.
- It keeps the favela as a room of its own, the region's tightest, just before Lapa's open arches.
- It cuts the steward. The steward is the "costume plus guard" gate that Moscow, China and Japan already use, and LESSONS says not to end
  every region with it.

Proposal B, "set-piece first", has two strong ideas:
- The churrascaria's crank springs a trapdoor that drops Monty into a room he could only look at.
- The headdress is seen from the street and reached by dropping through the track.

But B gates the Sambadrome with the steward and the headdress again, and it folds the favela into Corcovado, so the climax loses its
tight-before-open beat. In B's showdown the lever is up in the booth, far from the mallet, so the moment Monty pulls it is watched from
above, not felt from just in front of the agent.

Scores (A first, then B):

| measure | A | B |
|---|---|---|
| fun like MOTR: route, puzzle, rooms that ask something | 5 | 4 |
| Chris's notes | 5 | 4 |
| calm, readable art | 4 | 5 |
| coins with reasons | 5 | 4 |
| ramp | 5 | 4 |
| budget | 4 | 5 |
| buildable | 4 | 4 |

A's budget scores lower because the beach makes it 7 rooms, not 6 (see the budget below). Both need the same new engine piece, the
pursuer.

From B this plan takes six things:
- **Night.** Rio is played at night: black sky, as in MOTR. Colour goes on floors, hazards and one landmark per room. The ending's
  fireworks then read on black. The sun and the sea's mask sprites go, which frees two sprites for the ending.
- **The agent is white on black** (wide hat, long coat), so he reads against Rio's black. A's dark suit would vanish. He stays A's
  customs officer (see the open calls), and `creature-contrast.ts` checks him against Monty's light grey.
- **The pursuer's spec:** a ring buffer of Monty's x, y and picture, about 600 bytes at 160 frames. He appears only after Monty has
  passed a set column (the entry ledge's end). He passes through creatures.
- **No text decoration in the Sambadrome.** The crusher's glyphs overwrite the letters P to Z, so the room carries no signs.
- **The cable car needs no engine change.** `cablecars.ts` already rides any line between two stations.
- **The reward show's places** swap the floats for a lap of the Sambadrome.

B's trapdoor is not taken. In A the crank's dead end is left the way it was entered, past the gauchos again in reverse, and that second
reading of the skewers is the room's point. A one-way fall would skip it.

### The route

```
         col 33               34                   35                    36                 37                 38
row 6                                         W STEAK YOUR CLAIM
                                                   || ladder col 5 (both ways)
row 7    C OPEN ARMS ==hi==> F HOUSE OF COLOUR ==lo==> L THE LAPA ARCHES ==lo (street)== S SUGAR RUSH ==hi (car)== D THE SAMBADROME ==lo==> B RIO OR BUST
         ^ hi from the Amazon                          L ===hi (track)===============  S (climbers' ledge)       (bars until the squash)
```

**The joins:**
- The Amazon to C: west, high, floor 8, as today.
- C to F: east, high.
- F to L: east, low.
- L to W: up a ladder at column 5, from the west part of the track.
- L to S: east, low (the street to the beach) and east, high (the track to the climbers' ledge).
- S to D: east, high, from the cable car's top station.
- D to B: east, low. Bars close it until the squash.

**Walls close the other edges:**
- L's west edge, rows 0-15: the townhouse, as now.
- S's east edge, low: the cliff.
- D's west edge, rows 9-17: the stand's wall.

W is the churrascaria at the top of the Lapa arches, at the tram's end: Santa Teresa, where the bonde really goes.

**Play order** (11 steps through 7 rooms):
1. C: climb past the Redeemer and out at his east hand.
2. F: down through the favela.
3. L, the street: the track and the restaurant's ladder are high above. He can see them and cannot reach them.
4. S, low: the cable car's winch is dead behind the red bars under CLOSED.
5. S: climb the climbers' rope to the granite ledge.
6. L, the track, going west: ride the tram across the gap.
7. W: get the crank past the gauchos, then back past them to the ladder and down to the track.
8. L: drop through the gap to the street. This is one way: no rope or ladder joins the street to the track.
9. S, low: the crank works the winch. Ride up.
10. D: the showdown.
11. B: the ending.

There is no soft-lock. A drop through the gap before he has the crank lands on the street, and the street leads back to the rope.

**Rule 2 of the reset, checked:**
- Rooms crossed twice at two heights: L (the street going east, the track going west) and S (the sand, then the cable).
- A dead end holding an item: W (the crank).
- A gate seen before its key: the winch.
- Seen now, reached later: the track and its coin, from L's street. Also the snack on the Redeemer's west hand, from the forest.
- A loop back into a known room: L to S, up, back into L, back into S.
- Tight before open: F (about 40% solid) comes before L's wide arches. W, indoors, comes before S's open-sky ride, and S before D, the
  biggest open space of the region.
- The new way to move: riding (the tram, the cable car), then being chased.

### The puzzle: the crank, used twice

- **The gate.** The cable car's winch has lost its handle. The existing gate effect (the `clear` of the red bars, with the CLOSED sign)
  is re-keyed from the key to the city to the crank. The existing hint THE CABLE CAR STATION IS LOCKED stays.
- **The aha.** The handle is the crank of the churrascaria's spit, up at the top of the arches. He sees the track from the street, and
  he reaches it only round the loop: the climbers' rope at Sugarloaf, then west along the track on the tram.
- **The second use.** The same crank fits the Sambadrome's control booth, and that makes the lever live.
- **The headdress gates nothing.** It sits on the Sambadrome's drum riser and he wears it into the dance at the end.

**Hints:**
- Keep: THE CABLE CAR STATION IS LOCKED, and A HEADDRESS: JOIN THE PARADE.
- Delete: KEY TO THE CITY: OPENS DOORS, FEATHERS FOR THE STEWARD: GO UP, and ONLY DANCERS PASS THE STEWARD.
- Add none.

### The set piece: the showdown in the Sambadrome (D)

**The agent** follows Monty's exact path about 3 seconds behind (about 150 frames; the bot tunes it).
- He replays Monty's recorded position and picture, delayed. Touching him kills.
- He appears after Monty has passed the entry ledge's end.
- A death restarts Monty at D's entry, and the agent starts again. A fitted crank stays fitted.

**The tension.** Monty can never turn back, and if he stands still for 3 seconds the agent reaches him. Every wait for a patrol costs
something, so each patrol's cycle must fit inside that slack with about a second to spare.

**The trick:**
1. Lap 1: down to the avenue and under the giant float, whose stamping head is held up.
2. Walk into the lever. It is dead and only rattles.
3. Climb the right-hand stand to the booth. The crank fits, the booth lights up and the head lifts to ready.
4. West along the lighting gantry, and down the rope just west of the float.
5. East under the float again, and stop just past the head, at the lever.
6. Wait for the agent to follow him under it, and step into the lever.

**The squash.** The two crusher shafts drop together as one head, once: a cartoon squash, the agent flat, his hat popping off. The head
rises again, the bars at the avenue's east end lift, and the way to the beach is open.
- Pulled too early, it stamps on nothing and re-arms, and he goes round the loop again with the agent behind him.
- Standing under the head when it falls squashes Monty.
- The timing is read: the window is the moment the agent is under the head.

```
D THE SAMBADROME (approximate; # solid, = gantry, H ladder, | rope, C crusher head held up (two shafts), : shafts and float skirt,
L lever, X bars, h headdress, o coin, d drummer, a dancer)
          1111111111222222222233
01234567890123456789012345678901
........d.......................  0  the drummer bounces over the riser
..........................######  1  booth roof
.................a..............  2  dancer on the gantry
................................  3
.......hh....|============####H#  4  gantry and booth floor (the crank's socket)
.......hh....|................H.  5
.......###...|................H.  6  the drum riser (a two-row step), the headdress on it
.......###...|................H.  7  (west edge open rows 0-7: the cable car's top station)
###H########.|....o...........H.  8  entry ledge; a coin on the float's top
##.H.........|.######.........H.  9  the float's top (floor 9)
##.H.........|..CCCC..........H. 10
##.H.........|..CCCC..........H. 11
##.H.........|..::::........###. 12
##.H.........|..::::............ 13
##.H.........|..::::.....H##.... 14
##.H.........|..::::.....H...... 15
##.H.........|.:....:.L..H....XX 16
##.H.........|.:....:.L..H....XX 17
################################ 18  the avenue
################################ 19
```

- **Creatures:** the drummer bouncing over the riser (vertical, short) and a samba dancer on the gantry (horizontal, short and fast).
  With the agent that is three things to read.
- **Coin (1)** on the float's top: guarded, and a choice under pursuit. Off the float's west end it costs only time. Off its east end
  his path, and so the agent's, never passes under the head, and a lap is lost.
- **The headdress** on the drum riser, a two-row hop off the entry ledge, just past the ladder down.
- **Background:** black, a few grandstand lights, one dark-blue outline of the Apoteose arch at the top right, away from the lap. The
  float carries the colour and the detail.

### Rooms: kept, merged, cut

| room now | id | cell now | becomes |
|---|---|---|---|
| QUAY TO THE CITY | 67 | [7,33] | cut. Rio starts at Corcovado |
| SUGARLOAF SUMMIT | 70 | [6,35] | cut |
| MONKEY BUSINESS | 72 | [6,37] | merged into OPEN ARMS: Tijuca is Corcovado's own slope. A second green forest after the Amazon repeats the Amazon, and green is what hid Monty |
| FLOAT YOUR BOAT | 76 | [7,38] | merged into THE SAMBADROME. The floats mechanism moves to Lapa as the tram |
| OPEN ARMS | 71 | [6,36] | **C OPEN ARMS**, [7,33]: Corcovado with Tijuca at its foot |
| HOUSE OF COLOUR | 73 | [7,36] | **F HOUSE OF COLOUR**, [7,34]: the tightest room |
| THE LAPA ARCHES | 68 | [7,34] | **L THE LAPA ARCHES**, [7,35]: crossed twice, the tram |
| STEAK YOUR CLAIM | 74 | [6,33] | **W STEAK YOUR CLAIM**, [6,35]: the skewers, the crank |
| SUGAR RUSH | 69 | [6,34] | **S SUGAR RUSH**, [7,36]: the cable car |
| BEAT THE DRUM | 75 | [7,37] | **D THE SAMBADROME**, [7,37]: the showdown. The steward goes |
| RIO OR BUST | 77 | [7,39] | **B RIO OR BUST**, [7,38]: the ending's stage |

- Rio's map region becomes columns 33 to 38. Cells [6,33], [6,34], [6,36], [6,37] and [7,39] are freed.
- Rooms, cells, coins and items change, so the save format bumps once, with the whole reset. A save in a retired room loads at the next
  kept one: 67 and 72 into C, 70 into S, 76 into D's entry.
- The key to the city and the steward go.

### Room by room

Floors are rows; Monty's body is on rows F-2 and F-1. Every room is at night on black.

**C OPEN ARMS** (Corcovado, with Tijuca at its foot; the entry room is a climb over the landmark)
- **Layout:**
  1. In high at the west on the forest canopy (floor 8; dark green solids along the bottom left).
  2. Down to the forest trail (floor 14).
  3. Up onto the Redeemer's pedestal (floor 12).
  4. Up the maintenance ladder on his east side (column 19) to the east arm (floor 4).
  5. Along the arm to the hand, step off to a ledge (floor 8), and out east, high.
- **The detour:** a second ladder on his west side (column 12) climbs to the west arm. Its hand holds a snack, a churrasco skewer: in a
  pocket off the route, at the top of a climb. Monty never walks over the head.
- **Why it is fun:** he climbs the statue itself. Its arms are the floors, the highest place in the game: MOTR's "inside the structure".
- **Creatures:** a vulture on a long up-and-down patrol at columns 21-22, rows 0-12, crossing the east arm (time the crossing); a marmoset,
  short and fast, on the forest trail.
- **Coins (2):** on the trail inside the marmoset's patrol (guarded); on the east hand's tip, where he steps off as the vulture passes (at
  a hazard's edge).
- **Background:** black sky. The statue is white and is the solid he climbs, so it is never behind his body. The ladders are brown,
  beside the robe. No hills.

**F HOUSE OF COLOUR** (the favela; the tightest room, about 40% solid)
- **Layout:** it switchbacks down like MOTR's well.
  1. In at the top west (floor 8) on a pink roof.
  2. Down a step to a yellow roof (floor 10).
  3. A ladder (column 17) down to an alley (floor 14) that runs back west.
  4. A ladder (column 8) down to the lane (floor 18).
  5. The lane runs east under an overhang of houses, and out low.
- **Colour** goes into the house blocks, the solids he stands on: pink, yellow, light blue and green, with dark windows. The space
  between is black. One washing line, not every alley.
- **The snack** (the second churrasco skewer) is behind a water tank at the alley's west end: a pocket off the route.
- **Creatures:** a kite (new) hanging and bobbing at column 15, rows 0-7, over the step down between the roofs (vertical); a macaw flying
  along the alley, short and fast; the football bouncing in the shaft beside the lane (vertical).
- **Coin (1):** at the shaft's foot, under the football (guarded).

**L THE LAPA ARCHES** (crossed twice, at two heights)
- **The street** (floor 18) runs west to east under the aqueduct. The arches are dark grey, behind him, darker than anything solid. The
  track deck on top (floor 8) is bright white and solid. Everything stands on something: the arches stand on the street.
- **The track:** its west part (columns 2-11) holds the ladder up to W (column 5) and a coin. Then a six-cell gap (columns 12-17). The
  east part (columns 18-31) runs into S's ledge.
- **The tram** is the floats mechanism, running east to west over the gap, through the screen's edges. He waits at the edge, steps on and
  rides across. The old bonde creature goes.
- **Coming back:** he drops through the gap to the street, one way.
- **Creatures:** a bat dropping and rising in one arch bay (columns 20-21, rows 9-17, vertical, new); the capoeirista cartwheeling along
  the street (long, slow); the tram, the mechanism.
- **Coins (2), one per height:** on the track's west part at column 9 (seen from the street on the first crossing, reached on the
  second); on the street in the bat's bay (guarded).
- **Background:** black. The townhouse closes the west edge at rows 0-15, as now.

```
L (approximate; T the tram on the east part, o coins, b bat)
##...H..........................  0   townhouse; the ladder at col 5 up into W
##...H..........................  1-4
##...H..................TTTTT...  5
##...H..................TTTTT...  6   east edge open rows 6-7 (the track to S)
##...H...o..............TTTTT...  7
##==========......==============  8   the track: west part | gap (the tram's span) | east part
##.:...:...:..:...:..b:...:...:.  9-15 dark-grey arches; the bat in one bay
.....................o..........  16  west and east open, rows 16-17
................................  17
################################  18-19 the street
```

**W STEAK YOUR CLAIM** (the churrascaria; one idea, the gauchos' skewers)
- **Layout:** in up through a hole in the floor (column 5) onto the dining floor (floor 18). Gaucho 1 paces columns 8-16. Two-row steps
  (floors 16 and 14) climb to the grill platform (floor 12). Gaucho 2 paces a short lane at the grill. The spit and its crank are at the
  dead end (columns 26-29).
- **The skewers** are the existing ones (`skewers.ts`): a 96-frame cycle, the middle half deadly, the two gauchos half a cycle apart.
  Read one, pass, read the other. With the crank he reads them again in reverse.
- **Coin (1):** on the floor between the two arcs at column 17 (guarded).
- **Art, calm:** walls and ceiling, a black interior, a red tiled floor, two tables, two lamps, the grill (its turning meat and flames
  stay) and one CHURRASCO sign. The diners, wine racks, plumes, curtains and the COSTUMES sign go.
- **No vertical creature,** on purpose: it is a mechanism room, as MOTR's are.

**S SUGAR RUSH** (the cable car, visited twice)
- **Layout:** in low from the street onto Praia Vermelha's sand (floor 18). A ladder (column 8) up to the lower station's shelf (floor
  14), with the winch behind the red bars under CLOSED. The climbers' rope (column 4) climbs from the sand to a granite ledge (floor 8,
  columns 0-6) and out west, high, onto Lapa's track. With the crank, the car rides from the shelf to the top station (floor 8, columns
  24-31) and out east, high.
- **The car** is as built: one car, 160 frames.
- **Creatures:** a vulture's long up-and-down patrol crosses the cable halfway (columns 18-19). The ride cannot be left, so he chooses
  when to board. The builder checks that a creature touching him on the ride kills, as on the escalators. A marmoset, short and fast, on
  the top station's platform past where the car sets him down.
- **Coin (1):** at the east end of the climbers' ledge (tops a climb).
- **Background:** black sky. Sugarloaf as a dark-blue silhouette at the far right, not light grey, because Monty is light grey. The sea a
  dark-blue band above the beach line. The cable and the stations crisp and bright. The churrascaria's wall, the stilts and the lawn go.

**B RIO OR BUST** (the ending's stage)
- **The room:** in low from D. A night beach: black sky, a dark sea band, sand, two palms, a deckchair with the açaí bowl on a side table a
  few steps in, the floodlit Redeemer and Sugarloaf small across the bay. No coins, no creatures.
- **The finale** (rewrites `finale.ts`):
  1. Touching the bowl sits Monty in the chair: a seated picture, or the chair drawn over his legs.
  2. Three scoops, as now.
  3. The Sambadrome's dancers and the drummer walk on from the left.
  4. Fireworks burst in turn over the bay, as cycling characters.
  5. Monty gets up and dances in his headdress: frames left and right and small hops on the tune's beat.
  6. GAME OVER, and in ENHANCED the reward show.
- **Sprites:** 0 the bowl, 1 and 2 the dancers, 3 Monty, 4 the drummer, 5 the headdress, 6 and 7 free (a second drummer, or the biggest
  firework). The sun and the sea's mask go with the sunset.

### Totals

- **Coins:** 8 in 6 rooms (C 2, F 1, L 2, W 1, S 1, D 1, B 0), down from 62, each with a named pattern from (b). None in a line, none along
  a floor, none in the air.
- **Items:** the crank (W), the headdress (D, a costume, no gate), the bowl (B). Snacks: 2 (C, F), down from 6.
- **Creatures:** vulture (C, S), marmoset (C, S), macaw, football and kite (F), capoeirista and bat (L), two gauchos (W), drummer, dancer
  and the agent (D). None is in more than two rooms, and every room but W has a vertical patrol. The crab, the steward and the bonde
  creature go.
- **Ramp:** C is a climb with one timing. F is a tight descent through stacked patrols. L is the route puzzle and boarding the tram. W
  reads two swings, twice. S times the boarding. D is the pursuit, where every wait costs time, then the delay trick and the finale. The
  hardest fair room is the last.
- **Decoration kinds:** Rio's 50 drop to about 20. Gone: three sky-fleck kinds, the clouds, four washing sets, plumes, wine racks,
  diners, curtains, two stand kinds, bunting, balloons, the surdo, stilts, the lawn, the scope, the flag, the rail. New: the stamping
  float, the lever, the booth, the bars, the tram, the fireworks.
- **The reward show's places:** the cable car, the churrascaria, the tram on the arches, a lap of the Sambadrome with the squash, the
  beach.

### Notes for the builder

**Engine work.** All of it is data, empty in Monty on the Run's value, so MOTR plays identically and its fast tests and trace stay
green.
1. `pursuers`: room, delay, sprite, the column that wakes him; a ring buffer of Monty's x, y and picture. He resets on entry and on
   death, passes through creatures, kills on touch, and can be squashed.
2. A crusher held by a lever: it stays up until a lever cell is touched while armed, stamps once, then rises and re-arms. The fall kills
   Monty or squashes the pursuer where their boxes overlap. The two shafts move as one head. Check the banks against the crusher-leftover
   fix on main.
3. The booth arming the lever: a room effect keyed on carrying the crank, like the existing `place` effect.
4. The squash sets a hidden, uncounted item, so the existing `clear` effect lifts the bars.
5. Floats running over air between two columns, for the tram.
6. The finale rewritten: the seated pose, the troupe walking on, the fireworks, the dance, at night.

**Other notes:**
- Rewriting means `rio.ts`, `rio-pointers.ts`, Rio's layout and mechanisms and its legs, and re-recording its routes. The world counts
  (rooms, coins, finds) change. Moscow, China and Japan files stay untouched.
- If the floats-over-air work fails, the tram becomes a lift-like platform sliding across the gap on its own clock; the route does not
  change.

### The budget

Rio has 6 play rooms and the beach: 7. With Moscow 9, Siberia 6, China 9, Japan 11, the Pacific 5 and the Andes and Amazon 8, the game has
55 rooms, the top of Chris's 50 to 55. The beach stays as a room: it is the ending's stage and costs only art. So the Pacific's optional
6th room (THE ROAD TO HANA) stays out unless another room goes.

### Open calls for Chris

1. **Who the agent is.** The plan's pick is the customs officer, after the man with no passport. The story says Intermole only works in
   Europe, and the customs officer is the story's own thread. He moves like Spy vs Spy, and he is white on black.
2. **The coin on the float's top.** Dropping off its east end loses a lap. It may be a welcome trick or too subtle.

## the Andes and the Amazon (parachute into Peru, Machu Picchu, the Amazon)

The region's 12 rooms (13 with the old branch's LLAMA DRAMA) go down to 8: the drop (2), Machu Picchu (2) and the Amazon as an open
2 x 2 block (4). Moscow, China and Japan do not change. The joins at both ends are the ones already merged on `reset/andes`:
- **In:** F1 is at [2,20], entered west from the cargo plane's rear door (PAC.plane, [2,19], rows 14-15, the ramp at floor 16).
- **Out:** Rio's OPEN ARMS at [5,23] is entered west off the kapok room [5,22] at rows 6-7, floor 8.

The old branch `worktree-agent-ad1fe42a19dbcc6bf` is already merged into `reset/andes`, so build step 0 is to work from `reset/andes`
with main merged in. `reset/andes` round 1 (2bd41af) already has most of this grid; the changes from it are listed under "Changes from
round 1" at the end.

### Which proposal, and why

**The base is proposal B, "built around the set piece".** It makes the Amazon a puzzle, not a fetch:
- **The one-way liana.** You can climb down to the machete but never back up the same way, so the vines over the piranha river must be
  crossed, and they come at the right moment. In A the lianas go both ways, so the machete is a walk there and back.
- **It has more of the route shapes the study asks for:** two gates seen before their keys, and rooms crossed twice in both halves of
  the region.
- **It keeps one hazard idea per room** (F2 drops the rockfall and keeps the condors).

A's best ideas are grafted on:
- **Climbing against the boulders.** In T2 you climb the steps toward the Intihuatana against the boulders, with one-cell notches to
  duck into. That is a machine you play, not a roll you hop once.
- **F2's two chutes**, a condor diving in each, so you steer one line between dives. This is the "improve it a little" Chris asked for.
- **Seeing the llama from above** through a light well from the plateau, before you meet it.
- **A1/A2 and A3/A4 joined at full height or width**, like the sewer's 3 x 2 block.

Dropped from both:
- **The captain and the boat as the last gate.** The way out into Rio is high, off the kapok's crown, so a moored boat cannot be the
  exit. "A costume shown to a guard" is also the gate Moscow, China and Japan already end on, and LESSONS says not to end every region
  with it. The chullo stays as the region's costume, with no gate.
- **The anaconda as a second panpipes gate**, the market, the mist cave, LLAMA DRAMA's ferry and herd, and the estuary.

Scores (A first, then B):

| measure | A | B |
|---|---|---|
| fun like MOTR: route, puzzle, rooms that ask something | 4 | 5 |
| Chris's notes (parachute kept, Amazon as the open space, Machu Picchu reads) | 5 | 5 |
| calm, readable art | 5 | 4 |
| coins with reasons | 5 | 5 |
| ramp | 4 | 4 |
| budget | 5 | 5 |
| buildable in this engine | 4 | 4 |

### The route

```
            col 19            col 20                         col 21                          col 22
row 2   [plane's hold] =r14-15=> [F1 JUMP FOR JOY]
                                   | sink out of the open floor
row 3                            [F2 CONDOR COUNTRY]
                                   | the east chute lands on the top terrace
row 4                            [T1 THE TERRACES] ==high, floor 8==> [T2 MACHU PICCHU]
                                   chullo in the guardhouse   <==low, floor 18==> plateau, boulder steps up to the
                                   (top terrace)                                  Intihuatana: the panpipes (dead end);
                                                                                  below: the lane, the tunnel (spitting
                                                                                  llama), the crusher, the well
                                                                                    | the well's liana, one way down
row 5                                                           [A1 THE CANOPY] <==full height==> [A2 THE KAPOK] ==r6-7, floor 8==> Rio [5,23]
                                                                  | west liana: ONE WAY DOWN        || lattice up the kapok's flank
row 6                                                           [A3 THE RIVER] <==river and banks==> [A4 THE ROOTS]
```

The joins:
- **A1/A2** are open side to side over about 13 rows.
- **A2/A4** are open floor to ceiling across about 24 columns, with the lattice running through.
- **A1 to A3** is a single liana at the west. Its foot hangs above A3's west bank, higher than a jump reaches. You climb down and drop
  off, but you can never climb back up.
- **A3/A4** join at river and bank height.

The way through:
1. Out of the plane, through F1 and F2, onto T1's top terrace. The chullo is in the guardhouse there: the region's costume, a step off
   the landing.
2. East along the high lane into T2's plateau. Through the light well you see the spitting llama pacing the tunnel mouth below: the
   gate, seen before its key.
3. Up the steps against the boulders to the Intihuatana and the panpipes, a dead end.
4. Back west along the high lane, then down T1's terraces to the low path. T1 is now crossed a second time, at another height.
5. East along the lane into T2. The llama is calmed. Through the tunnel under the crusher, then down the well into A1. T2 is also
   crossed twice.
6. A1 is the release into the open space. East through the full-height join, A2's crown branch is choked by the tangle: the way out,
   seen first.
7. Down through A1's floor you see the machete on A3's west bank: seen now, reached later.
8. Down the west liana and drop onto the bank. You take the machete, a dead end.
9. The only way back is east on the vines over the piranha river into A4, then up the lattice on the kapok's flank into A2.
10. Climb the kapok past the anaconda, cut the tangle and go out east into Rio.

How it meets the study's rules:
- **A room crossed twice at two heights:** T1 and T2. A2 too, if you go to look at the tangle first.
- **A dead end that holds an item:** the Intihuatana (the panpipes) and A3's bank (the machete).
- **A gate seen before its key:** the spitting llama, and the tangle.
- **Seen now, reached later:** the machete, and T2's tunnel coin.
- **A loop:** T1 high, T2 high, T1 low, T2 low; and A1, A3, A4, A2, back into sight of A1.
- **Tightest before most open:** T2's tunnel is two cells high, with the crusher and a three-column well. The block straight after it is
  about 12 to 25% solid.

### The region's one puzzle

The tangle shuts the only way out. The machete that cuts it lies where the one-way liana leaves you, and the only way back is the vine
crossing. It is built like the sewer, with the key off the path, the lock seen first, and the set piece made compulsory by the
geometry, all inside the open space. Before the block, the panpipes and the spitting llama are Machu Picchu's simple lock and key, like
MOTR's key for $14.

Every effect already exists:
- `calmedBy` for the llama;
- `clear` for the tangle (THE UNDERGROWTH IS TOO THICK stays as it is);
- the `vines` mechanism;
- rope tiles for the lianas.

The mechanism tests must prove three things:
- you cannot climb back up the west liana from A3;
- the tangle blocks the exit until it is cut;
- the llama blocks the tunnel until it is calmed.

### The signature set piece: the Amazon block

It is the first space in the game with no edges, after the region's tightest stretch. The order of space through the region is: the sky
(open, flying), the terraces (walled, about 35 to 45% solid), the tunnel (the tightest), then the block.

The lianas are a climbing lattice of roughly 40 to 100 rope cells a room. The vine swing over the piranha river is at its heart and is
crossed once, when it matters. The parachute stays as the region's new way to move. It is tightened, not grown.

### Room by room

**F1 JUMP FOR JOY** [2,20] (flight; the lesson)
- **Layout:** out of the tail ramp; one updraft (cols 9-11) and the snowy spire; the floor open west of the spire, so you sink into F2.
  Remove the band of clouds and keep two small dim ones high up, clear of every flight line.
- **What you do:** learn to sink, steer and ride the updraft. Nothing here kills you.
- **Creatures:** none.
- **Coins (1):** on the spire's tip, reached only off the top of the updraft. It tests the new move.
- **Background:** black sky, brown rock, white only for snow, updraft wisps dim.

**F2 CONDOR COUNTRY** [3,20] (flight; the drop's test)
- **Layout:** the gorge closes into two chutes either side of a pinnacle. An updraft in the east chute reaches the shelf under the
  overhang. The east chute lands on T1's top terrace. The west chute ends on a side ledge, from which you walk off and try again.
- **What you do:** steer one line between two diving condors. Catch the updraft between dives to reach the shelf.
- **Creatures (2):** a condor diving up and down in each chute, out of phase. There is no rockfall: one hazard idea per room.
- **Coins (1):** in the east chute between the condors' dive lines (guarded, and it tests the move).
- **Empanada:** on the shelf under the overhang.
- **Background:** black, brown rock, no clouds behind the chutes.

**T1 THE TERRACES** [4,20] (Machu Picchu's farming terraces)
- **Layout:**
  - The landing is the top terrace (floor 8), with the guardhouse and its thatch roof.
  - The high lane runs east into T2's plateau.
  - Below, stepped terraces (floors 10, 12, 14) fall to the low path (floor 18), which runs east into T2's lane.
  - There is no ladder. You go down by the terrace steps.
- **What you do:** cross high on the way to the panpipes, then come back down the steps and cross low.
- **Creatures (3):**
  - a llama grazing the broad terrace (horizontal);
  - a cuy hopping on the last step (vertical);
  - a condor diving in the gap below the high lane (vertical), so you time the walk along it.
- **Coins (2):** one on the high lane and one on the low path, in the same column. That is one per height, so crossing twice pays twice.
- **Item:** the chullo, in the guardhouse (the costume, with no gate).
- **Background:** black sky; the terrace tops one muted green and the dry-stone faces one ochre; one dark two-colour range at the very
  top, nothing behind the play rows.

**T2 MACHU PICCHU** [4,21] (the landmark, with the Inca tunnel as its lower lane)
- **Top half:**
  - The plateau (floor 8) has a light well looking down onto the tunnel mouth.
  - Steps climb east (floors 6, 4) to the Intihuatana, where the panpipes lie.
  - Boulders roll down the steps at you every 120 frames. A one-cell notch in each step is where you duck one.
  - Huayna Picchu stands behind as a dark two-colour silhouette with no flat tops that look walkable. It is the room's one landmark.
- **Bottom half:**
  - The lane (floor 18) comes in from T1.
  - The tunnel (two cells high under the lintel, dressed stone, two torches) has the spitting llama in its mouth.
  - Past the llama, the Mole Crusher, then the three-column well whose liana drops into A1.
- **What you do:** climb against the boulders, see the gate from above, come back for it with the panpipes, then the region's
  tightest stretch.
- **Creatures:**
  - the spitting llama, which is the gate (its spit is a timed pulse);
  - a cave bat diving up and down in the well;
  - the boulders and the crusher are machines.
- **Coins (2):**
  - in the top step's notch nearest the Intihuatana (at a hazard's edge);
  - just inside the tunnel past the llama: seen when you meet the gate, reached after the panpipes.
- **Empanada:** at the lane's west end.
- **Background:** black sky; detail goes only into the Intihuatana and Huayna Picchu.

**A1 THE CANOPY** [5,21] (the arrival into the open space)
- **Layout:**
  - The well's liana ends on a high bough.
  - Below it is a lattice of lianas and short boughs, open at full height east into A2.
  - In the west, the one liana hangs through the floor into A3.
  - A gap in the floor shows the machete on A3's bank.
- **What you do:** the release. You get a little lost, find your bearings by the lianas, see the tangle east and the machete below.
- **Creatures (2):**
  - a sloth creeping up and down a liana (vertical; it blocks the climb);
  - a toucan on the top bough (horizontal).
- **Coins (1):** hung between two lianas mid-room, taken only by climbing across the lattice (inside the structure).
- **Background:** black; leaves as solid canopy in the top two rows only; the lianas thin green lines; nothing green behind Monty
  (Rio's lesson).

**A2 THE KAPOK** [5,22] (the great tree; the way out)
- **Layout:**
  - The kapok's trunk fills the middle, with buttress boughs either side.
  - The crown's branch runs east off the room to Rio (rows 6-7, floor 8), choked by the tangle.
  - The room is open below into A4 across about 24 columns, with the lattice running up the flank.
- **What you do:** see the tangle from A1 on arrival; come back up from A4 with the machete; climb past the anaconda and cut your way
  out.
- **Creatures (2):**
  - the anaconda coiling up and down the trunk across the jumps (vertical);
  - the jaguar pacing the crown's bough (horizontal).
- **Coins (1):** at the root of the crown branch by the trunk, the top of the climb.
- **Background:** as A1. The trunk is the one big shape, and its bark is darker than the boughs you stand on.

**A3 THE RIVER** [6,21] (west river; the dead end and the skill crossing)
- **Layout:**
  - The west bank (floor 15) is where the liana leaves you, with the machete.
  - East of the bank the brown river is a deadly floor, crossed by the vine from the fig, then two rotten logs that crumble under a
    pause (the branch's crumbling stones), then the channel.
  - The river runs on into A4.
- **What you do:** the region's skill moment, forced once, on the way back.
- **Creatures (2):** two piranhas leaping in arcs, each on its own period (vertical).
- **Coins (1):** on the second log beside the leaping piranha (at a hazard's edge).
- **Item:** the machete.
- **Empanada:** in the niche under the fig's root, a step off the bank.
- **Background:** black above; a dark river band with one light crest; leaves only at the very top, where the vines hang from.

**A4 THE ROOTS** [6,22] (east river; the way back up)
- **Layout:** one vine and a log over the river's west part (an easier stretch after A3), the east bank (floor 15) under the kapok, and
  the lattice up its flank into A2.
- **What you do:** finish the crossing and start the climb back into the canopy.
- **Creatures (2):**
  - a piranha leaping under the vine (vertical);
  - the pink river dolphin rising by the bank (vertical).
- **Coins:** none. The room's job is the crossing out.
- **Background:** black, a dark river band, the roots in brown.

### Totals

- **Rooms:** 8.
- **Coins:** 9 (1, 1, 2, 2, 1, 1, 1, 0), down from 73. Each has a named pattern from (b), and none are in a line, along a floor or in the
  air without a flight or the lattice to reach them.
- **Empanadas:** 3 (F2, T2, A3), down from 6. The pause screen's food total comes from the data.
- **Items:** the panpipes (T2), the machete (A3), and the chullo (T1, the costume).
- **Creatures:** condor (F2, T1), llama (T1), cuy (T1), spitting llama (T2), cave bat (T2), sloth and toucan (A1), anaconda and jaguar
  (A2), piranha (A3, A4) and dolphin (A4). None is in more than two rooms, and every room with creatures has a vertical patrol. The
  macaw and the captain go.
- **Decoration kinds:** only removed (the market, the mist cave and geysers, the estuary, the boat). No new tiles, so the kinds count
  goes down.
- **Hint text:** none new. CALM IT and THE UNDERGROWTH IS TOO THICK stay as they are. LOCALS ONLY goes with the captain. The branch's
  PERU and AMAZONAS signs are optional.
- **Ramp:** F1 is safe. F2 times two dives. T1 times a dive on a lane. T2 climbs against the boulders and runs the crusher. The Amazon
  holds the one-way puzzle and the vine crossing. Rio, after it, is harder.

### Changes from round 1 on `reset/andes`

- **The machete moves** from the kapok's walkway to A3's west bank, and A1's west liana is made one-way (its foot out of a jump's
  reach). Today the machete is a climb in the room that holds the gate.
- **The panpipes stay by the Intihuatana.** The boulders roll down the steps against the climb, with one notch per step.
- **The terraces' empanada on the cliff ledge goes.** T2's plateau no longer runs out west onto it. T1's two coins sit one per height
  in one column.
- **Coins and snacks are recounted** to the totals above. F1 loses its diving condor, so it teaches the move safely.
- **Bot routes and proofs** are recorded again for the new route, in both modes.
