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

The previous 17 rooms (20 on the v2 branch `worktree-agent-a4e02a7d7dc2e04df`) go down to 5. Moscow, China and Japan do not change. The
first room keeps cell [2,17] and STERN WARNING's west edge exactly, so Japan's port is untouched: the landing is at floor 13 on columns
0-3, the hull is below it and the sky is open above it.

### Which proposal, and why

Two proposals were judged. **The base is proposal A, "the sea is the wall".** It keeps Chris's islands in his order (Oahu, Maui, the Big
Island), the luau on Oahu with the lei round the neck, and the cargo plane from Hilo. It builds the region as a U (east along the top, down
into the sea, east along the bottom, up into the sky), and it starts with a three-pass hairpin through the ship, which is MOTR's
$0C/$0D/$0E. Proposal B, "the Big Island by night", has the stronger single idea, a set piece previewed from a sealed overlook. But it
cuts Oahu and the luau that Chris asked for. Its puzzle is "a lamp shows the ledges", and that is the shape the Siberia plan has just cut
(SHAFT OF DARKNESS). It also relies on the player reading black as dark rather than empty, which B itself flags as a risk.

From B this plan takes six things:
- **The preview of the set piece.** Hilo's lava is seen first from safety, before the climb (below). B's overlook becomes the top of the
  Hana room's headland, looking across at the glow.
- **Cracking crust** on the first stepping ledges over the lava (the `cracks` mechanism), as the set-up trap.
- **Faster lava for the late game:** a row every 40 frames, held 150, drained a row every 12. The fairness check tunes it.
- **A yellow or white magma blob**, because today's orange one vanishes on orange lava.
- **The nēnē** on Hilo's apron, guarding the last step, so the set piece has a second creature.
- **No surface line in the swim room.** Its only opening above is the dive gap, so it has nothing to bounce on (Chris's sea-cave bounce),
  and the v2 no-bounce test covers that gap.

Scores (A first, then B): MOTR-style route and puzzle 4 / 4. Chris's notes 5 / 3. Calm art 4 / 5. Coins 4 / 4. Ramp 4 / 4. Budget 5 / 5.
Buildable 4 / 4. A's one engine addition (swim currents) is data, like the flight's updrafts, and MOTR's value is empty.

### The route

```
            col 17                     col 18                       col 19
row 2   Japan's port ==> A THE CARGO SHIP ==> B WAIKIKI                E THE CARGO PLANE ==> Andes
        (unchanged)       deck, hold, bilge    beach, lawn, stand        roller floor, net, rear door
                                                || dive, cols 26-30       ^ belly ladder
                                                vv (snorkel)              |
row 3                                         C HANA ====== low east ==> D HILO
                                                (swim)                    (lava climb)
```

**The joins:**
- Japan to A: the landing at floor 13, as now. Nothing changes on Japan's side.
- A to B: the bilge lane's bow cargo door, low, onto Waikiki's pier.
- B to C: the sea gap at Waikiki's bottom right, columns 26-30. It is deadly surf until he has the snorkel; then he dives through C's
  ceiling gap at the same columns. That is C's only opening above.
- C to D: swim out at C's east edge, low, onto Hilo's lava-rock shore. The shore's columns are outside the lava's span.
- D to E: the belly-door ladder from the apron at the top of D into the hold, through an opening 3 or more wide with the ladder centred.
- E to the Andes: the rear door at rows 14-15, the contract the Andes' jump room already has. The Andes' first room moves to [2,20].
- B's east side and E's west side are walls. B and E are side by side but not joined.

**Play order:**
1. A: east along the deck under the crane, down the hatch, west along the hold between the two pistons, down the ladder, east along the
   bilge over one gap of water, out of the bow door. That is one room crossed three times at three heights.
2. B: east along the beach to the sea. A MOLE CANNOT SWIM THAT FAR. On the beach stand's roof is the snorkel, too high to reach from the
   sand.
3. Up the palm at the sea's edge to the hotel's luau lawn. West along the lawn, timing the torches, taking the lei on the stage. Off the
   lawn's west end, drop onto the stand's roof for the snorkel. Down to the beach, east to the sea again, and dive.
4. C: in at the top right. West along the top lane under the headland. Down the west drop-off (the sea cave and the musubi are off it).
   East along the bottom lane against the surge, from coral head to coral head. Out at the bottom right.
5. D: out of the sea onto the shore, where the lava starts rising. Climb the zig-zag to the apron and up the belly ladder.
6. E: the rear door is shut (THE DROP IS FAR TOO HIGH). Up the cargo net to the high shelf and west to the parachute. Back down, across
   the roller floor between the crate's rolls, and out of the rear door.

**Rule 2 of the reset, checked:**
- Rooms crossed twice at two heights: A (three times), B (beach, lawn, beach again) and C (top lane, then bottom lane).
- Dead ends holding items: the stand's roof (snorkel), the sea cave (musubi) and the high pallet (parachute).
- Gates seen before their keys: the sea in B and the rear door in E.
- Seen now, reached later: the snorkel on the roof, seen from the beach and reached from the lawn above. Also Hilo's glow, seen from C's
  top lane before the climb.
- A loop back into a known room: the drop off the lawn's end lands him back on the beach he has already walked.
- Tight before open: the ship (35-45% solid, three lanes) comes before Waikiki's open sky, and Waikiki before the open water.

### The puzzle

**The sea is the wall.** From the start, water kills him: the bilge in A, then Waikiki's surf. The snorkel turns the water into the way
on. It is in plain sight on the stand's roof and out of reach. The only way up is the palm at the edge of the sea that just stopped him,
and from there the lawn leads back west, over the beach, to a drop onto the roof. He meets the lock first and finds the key by working
out the way round. That is the shape of MOTR's cake and wall.

**Deep water needs the snorkel** (Chris's bug). Without it the surf at the gap is deadly, as v2's swimGate drowning already does. C is
reached only through that gap, so there is no way to swim without it.

**The lei gates nothing.** Moscow, China and Japan already use "costume plus guard", and LESSONS says to vary the puzzle's shape. The lei
is taken at the luau and worn round the neck, as Chris asked. The lei guard and the bolt cutters with their chain are cut.

**The engine pieces exist:** a `clear` on the gap's surf when the snorkel is taken, the swimGate, the pulses (torches), the Mole Crushers
(the pistons) and the roller (the crate in E).

### The set piece: Hilo, the lava chasing him to the plane

- **The preview.** From C's top lane, under the headland, the east end of the room shows Hilo's red glow through a gap in the rock: the
  set piece seen before it is played, as MOTR shows the low lane from the high corridor.
- **The room is built round it.** The plane's white belly runs across the top of the screen from the first frame: the goal is in sight.
- **The lava** (`risingLava`, existing) is in the basin at columns 6-24, from row 19 up to row 10. It rises a row every 40 frames, holds
  150 and drains a row every 12. It starts when he enters, and the entry shore is outside its columns.
- **The climb zig-zags:** west, then east, then west, so the lava gains on him at every turn. The first stepping ledges are cracking
  crust that breaks under a standing foot (about 20 frames): keep moving.
- **The last ledge** has one steam vent (a pulse) just above the lava's top row, so the timing comes when the pressure is highest.
- **Restart** is in the room: the lava resets when he restarts at his last safe spot.

**The new way to move: swimming with a surge** (C). One small engine addition, as data: `currents` in a swim room, boxes with a direction
and an on/off period, pushing him a pixel a frame while he is in one, like the flight's updrafts. `swim.ts` reads it. Monty on the Run's
value is empty, so it plays identically.

### Rooms: kept, merged, cut

| room now | id | becomes |
|---|---|---|
| STERN WARNING, BOX CLEVER | 38, 39 | **A THE CARGO SHIP** (id 38, [2,17]). The cutters, chain, shark and musubi go |
| PIER PRESSURE | 40 | cut. Aloha Tower goes small into A's backdrop |
| SURF AND TURF, LEI OF THE LAND, THE FEAST (v2) | 41, 42 | **B WAIKIKI** (id 41, [2,18]): the beach, the luau lawn, the stand |
| DIAMOND HEAD, THE LOOKOUT (v2) | | cut. Diamond Head stays as Waikiki's one far landmark |
| CLAM DOWN, KELP WANTED, THE SEA CAVE, FISH OUT OF WATER, HANA BANANA | 43, 45, 48, 50, 49 | **C HANA** (id 49, [3,18]), the one swim room. It keeps the moray in its hole (v2 pulse), the sea-cave pocket and the black sand. The serpent and the wreck go |
| MOLE-OKAI, WHALE OF A TIME, COFFEE BREAK, THE ROAD TO HANA | 44, 46, 51, 47 | cut |
| MAUNA KEA-OS, HILO GOODBYE | 52, 53 | **D HILO** (id 52, [3,19]). The snow shelf and the gatehouse guard go |
| HOLD YOUR HORSES | 54 | **E THE CARGO PLANE** (id 54, [2,19]), rebuilt |

`swimRooms` becomes [HANA] only. Retired ids get stubs or the table is built by id, as the coordinator's whole-reset id plan decides.
Rooms and coins change, so the save format bumps, and a save inside a cut room migrates to the nearest kept room. Arrival banners (existing
text): HAWAII: OAHU on the ship, MAUI at Hana, THE BIG ISLAND at Hilo. MOLOKAI goes.

**Hints:**
- Keep: WITH A SNORKEL HE CAN SWIM; A MOLE CANNOT SWIM THAT FAR (Waikiki only); A LEI: TRAVELLERS WEAR ONE; PARACHUTE: FOR A LONG DROP;
  THE DROP IS FAR TOO HIGH.
- Delete: CUTTERS BITE THROUGH CHAINS, THE RAMP IS CHAINED SHUT, DEPARTING TRAVELLERS WEAR A LEI.
- Add none.

### Room by room

**A THE CARGO SHIP** (the ship in section, moored at Honolulu; the tightest room of the region)
- **Layout:** in at the left on the landing (floor 13, as now), a jump up to the deck (floor 11). The deck runs east past the funnel and
  the bridge to the bow rail. A hatch ladder near the bow goes down to the hold lane (floor 15), which runs west under the deck. At the
  hold's west end a ladder goes down to the bilge lane (floor 19), which runs east over one 3-cell gap of bilge water (deadly) and out of
  the bow's low cargo door. You see the bow door from the deck and cannot get down to it.
- **Creatures:** the captain's parrot (vertical, between the funnel and the bridge); a crate on the crane's hoist (vertical, just before
  the hatch). The two pistons in the hold are Mole Crushers, the room's mechanism (banks $10 and $22 with two in one room; check against the
  crusher-leftover fix on main).
- **Coins (2):** on the funnel's catwalk, up a short rung ladder off the deck (tops a climb); in the hold lane between the two pistons
  (guarded).
- **Background:** black. One dark-blue band of harbour water behind the waterline. Aloha Tower small and dark far behind the bow. The hull
  red and the decks bright, because they are what he stands on.

**B WAIKIKI** (Oahu: the beach, and the luau on the hotel's lawn)
- **Layout:** in at the left on the pier, then sand (floor 18) east to the sea gap at columns 26-30. The beach boys' stand is at about
  columns 9-13, with its roof at about floor 12, too high to jump to from the sand; the snorkel sits on it. A palm (a rope) at about
  column 24 by the sea's edge climbs to the lawn (floor 7). The lawn is the terrace of the pink hotel, which stands on arches he walks
  under on the beach, so nothing floats. The lawn runs west from about column 27 to column 14 and ends over the stand's roof. On the lawn:
  two tiki torches (the existing pulses: low, warning, tall) and a small stage step with the lei.
- **Creatures:** a coconut dropping from a second palm's crown onto the sand and bouncing back (vertical, away from the climbing palm, so
  nothing hugs a rope's foot); a tern diving at the sea's edge (vertical); a hula dancer on a short patrol on the lawn's west half,
  guarding the drop.
- **Coins (2):** on the lawn between the two torches (at a hazard's edge); at the palm's crown where the rope meets the lawn (tops a
  climb).
- **Background:** black sky. Diamond Head as one muted dark silhouette far right, with no walkable-looking top edge. The hotel's facade
  dark under the bright lawn. The sea one dark-blue band, with light-blue surf only at the gap, which is the hazard. Sand bright yellow.

**C HANA** (Maui: Hana's coast in section; the one swim room, all water)
- **Layout:** across the top, the headland and the black-sand beach as solid rock, with no surface line in the room. In at the top right
  through the ceiling gap from Waikiki's dive (its only opening above). At the top lane's east end, a gap in the rock shows Hilo's glow.
  A long shelf of rock and coral at about row 10, from column 6 to the east wall, splits the room into a top lane and a bottom lane, which
  meet only at the west drop-off. The sea cave is a pocket off the drop-off, with the musubi inside. Out at the bottom right (east edge,
  low). In the bottom lane: three coral heads, and a surge that pushes west in sets (about 90 frames on, 120 off), shown at once by kelp
  leaning and a stream of bubbles. He shelters in a head's lee while a set runs and darts between sets.
- **Creatures:** a turtle rising to breathe and sinking back (vertical, mid column); a reef shark on a long slow patrol along the bottom
  lane; the moray in its hole by the cave mouth (v2's pulse: the eyes blink before it lunges).
- **Coins (2):** in a hollow in the middle coral head, swum into between sets (tests the new move); on the ledge inside the sea cave by the
  musubi (a pocket off the route).
- **Background:** water as one flat dark blue with no pattern. Coral bright pink and purple, rock brown, the black sand dark grey. Bubbles
  sparse. Check the turtle (light green), the shark (white or light grey) and Monty with `creature-contrast.ts`.
- **Swimming:** v2's happy frames (horizontal crawl, mask and snorkel, a clear stroke, bubbles).

**D HILO** (the Big Island: Kilauea's flow below the airport; the set piece)
- **Layout:** in at the left, low, out of the sea onto a lava-rock shore outside the lava's columns. The basin is at about columns 6-24.
  The climb: a rope up at the left to a ledge (floor 14); three stepping ledges east over the basin, the first two cracking crust; a rope up
  the east wall to a long ledge (floor 9) running back west, with the steam vent halfway; a rope up to the apron (floor 5) under the
  plane's belly; the belly-door ladder up through the ceiling. The lava's top row stays below floor 9's feet.
- **Creatures:** a magma blob, yellow or white, bobbing up out of the lava between the stepping ledges (vertical); the nēnē on a short
  patrol on the apron, guarding the ladder. The lava, the crust and the vent are the mechanism.
- **Coins (2):** on the middle stepping ledge over the rising lava (at a hazard's edge); at the top of the east-wall rope (tops a climb).
- **Background:** black sky. Kilauea's crater as a low dark red-brown silhouette with a muted plume, far left. The plane's belly light grey
  or white across the top right. Lava bright orange and yellow. Ledges brighter than anything behind them.

**E THE CARGO PLANE** (the hold, in flight)
- **Layout:** in at the front left, up the belly ladder onto the roller floor (floor 16). The rear door in the right wall at rows 14-15,
  with the red jump lamp, shut until he has the parachute. A cargo net (a rope lattice) climbs the fuselage side mid-room to a high shelf
  (about floor 6), which leads west to the high pallet at the front: the parachute. A loose crate chocked at the front rocks on a clock,
  then rolls the length of the floor to the door (`RollerSpec`, existing); its first roll is delayed, so arriving is safe. Caught on the
  floor, he hops onto a pallet.
- **Creatures:** a crate on the overhead hoist (vertical, between the net and the door; its second room after A's crane); a loose rooster
  on the pallets, a short patrol (Hawaii's feral chickens). The rolling crate is a trap, not a creature.
- **Coin (1):** hanging in the cargo net, taken only by climbing round it (inside the structure).
- **Background:** black. Sparse dark-blue fuselage ribs. One row of small portholes with clouds scrolling past (`charAnims`).

### Totals

- **Coins:** 9 in 5 rooms (2, 2, 2, 2, 1), each with a named pattern from (b).
- **Items:** snorkel (B), lei (B, costume, no gate), musubi (C), parachute (E).
- **Creature kinds:** parrot, crate, coconut, tern, hula, turtle, shark, moray, magma, nēnē, rooster. 11, down from v2's 16; only the crate
  is in two rooms. The decoration kinds fall with the cut rooms, which leaves headroom in the one-byte table.
- **Mechanisms:** crushers (A), torches (B), surge (C), lava, crust and vent (D), roller (E).

### Notes for the builder

- Merge v2 first and keep: swimPictures (the crawl with mask and snorkel), swimGate drowning and its test, the float-ceiling no-bounce fix
  and `test/no-bounce.ts`, arrivals, `roomBlocks` and the moray pulse.
- Drop from v2: the serpent, the waterfalls, Diamond Head and the Lookout as rooms, the feast as a room, the gatehouse guard and the cutters.
- A's west edge must match Japan's port exactly. Nothing changes in `japan.ts`, its art, joins, music or tests.
- The Andes' jump room moves to [2,20] and keeps its rows 14-15 tail-door contract.
- `currents` is the only new engine data. MOTR's fast tests and trace must stay green.
- **If a 6th room is allowed** (55 in all): THE ROAD TO HANA goes back in on Maui, before HANA, west to east as Chris knows it; the
  joins of C, D, E and the Andes are redrawn one column east then. It is rebuilt to Chris's notes: cars both ways, one-lane bridges with a forced stop at a yield, a car he must wait out, not outrun.
- **If the Pacific must drop to 4:** cut A. It has no item and no gate. Japan's port then opens onto Waikiki's pier, built at floor 13 to
  match. The cost is the tight-before-open beat.
