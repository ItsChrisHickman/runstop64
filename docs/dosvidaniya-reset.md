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
5. **At a hazard's edge.** In $12 the coin is on the post on the far side of the spike pit (23,15). In $0D it is on the step beside
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
