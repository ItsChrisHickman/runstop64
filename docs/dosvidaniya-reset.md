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
