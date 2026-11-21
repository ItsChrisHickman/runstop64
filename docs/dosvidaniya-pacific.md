# Do Svidaniya Monty: the Pacific's room map

Region 5 (docs/dosvidaniya-plan.md; Hawaii's order and its rooms are Chris's: he has been to all three islands). Pre-production only: this design,
the art as data (`games/montyworld/src/art/pacific-*.ts`) and the preview pictures (`/root/projects/runstop64-shots/preprod-pacific/`, made by
`test/pacific-sheets.ts` and `test/pacific-rooms.ts`); no engine or room code. "As built" at the end is left empty for the build. Rows 0 (top) to 19,
columns 0-31, as in docs/dosvidaniya-moscow.md; Monty stands on a floor row F with his body on F-2 and F-1, and a way out at a side is open at the
same rows as the way in of the next room. Every number is a starting value for the bot to check, as in Moscow's and Siberia's pages.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points the Pacific takes:

- **A room crossed twice at two heights, the lanes sealed from each other** (`$04 $06 $09 $0C $0D`): four pairs here: the ship's two rooms (the deck over
  the containers, then the holds under it), Honolulu and Waikiki (the street, then the promenade's roofs), Lahaina and the Road to Hana (the quay, then the
  rigging), Kona and Mauna Kea (the lava-rock shore, then the coffee terraces).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the engine room's pocket (the bolt cutters), the snorkel shop's loft (the snorkel),
  the luau (the lei), Hana's black-sand cove, the coffee farm's shed, the hold's last pallet (the parachute). Six; the start (STERN WARNING) and the exit (the hold's open
  door) are the fixed points.
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, key 1 `$14`): the chain across the dock ramp wants the cutters (found in the
  engine room, a dead end under the deck), the sea at Waikiki wants the snorkel (the shop's loft), the guard at Hilo wants the lei (the luau). Three gates.
- **Water and its fish** (kept from Monty on the Run): the three reef rooms are swum, by the jetpack's free movement slowed and buoyant (below). The water tiles
  of `$07` are deadly, as the harbour's, the surf's and the hold's bilge are.
- **A flight like the jetpack's** (`$1D-$1F`): not here (the parachute drop is the Andes'), but the swim is the same movement at half the speed, which is why the
  reefs are open rooms with rocks to weave among, as the jetpack's shafts are.
- **A rope that leaves a room the other side from where it came in** (`$05`, `$0A`): the luau's cliff rope (up from Waikiki), the Road's waterfall rope, the nets in the hold.
- **A lift (`$05`, `$0D`)**: the cargo loader at Hilo, which carries him up into the plane.

## Part 2: the Pacific

Sixteen rooms (the plan's "about fifteen": the ship 2, Oahu 3, Molokai 1, Maui 3, the Big Island 3, three reef rooms, the plane's hold), a block 11 wide and 3
high at columns 0-10 of the region (the world's grid is 3 rows high). The islands are in Chris's order, west to east, each at its own height so the block
winds. The trip is a ribbon in the order of play, but its map is a tangle: four pairs of rooms are crossed twice, six dead ends hold items, and the sea
joins rooms by floor and ceiling as well as by their sides.

```
        col 0     col 1     col 2     col 3     col 4     col 5     col 6     col 7     col 8     col 9     col 10
row 0     .         .         .      LEI OF       .         .         .         .         .         .         .
                                      THE LAND
row 1   STERN     BOX       PIER      SURF AND     .       WHALE OF  ONE WAY   HANA        .         .       HOLD YOUR
        WARNING   CLEVER    PRESSURE  TURF                  A TIME    OR HANA-  BANANA                        HORSES
                                                                      THER
row 2     .         .         .      CLAM DOWN  MOLE-OKAI  KELP        .      FISH OUT  COFFEE    MAUNA     HILO
                                      (reef)               WANTED            OF WATER  BREAK     KEA-OS    GOODBYE
                                                           (reef)            (reef)
```

Ship (cols 0-1), Oahu (2-3, the luau above Waikiki, reef 1 below it), Molokai (4), reef 2 (5), Maui (5-7, Lahaina over its reef), reef 3 (7, under Hana), the Big
Island (8-10, the plane's hold over Hilo). Eleven columns: the plan's width for the region was about eight (see the open questions).

**Joins** (rope/swim = both ways, gate = an item): STERN-BOX walk, twice (the deck, and the holds under it). BOX-PIER walk down the ship's ramp (a chain: the
cutters). PIER-SURF walk, twice (the street low, the promenade high). SURF-LEI a rope up the cliff (a dead end). SURF-CLAM the sea (a floor gap, swim: the snorkel).
CLAM-MOLE swim to the quay. MOLE-KELP swim to the quay. KELP-WHALE up through the surface at the slipway. WHALE-ROAD walk, twice (the quay, the rigging). ROAD-HANA walk.
HANA-FISH the cove's cliff and the sea (a floor gap: swim). FISH-COFFEE swim to the quay. COFFEE-MAUNA walk, twice (the lava-rock shore, the coffee terraces). MAUNA-HILO
the summit's rim onto the terminal's roof. HILO-HOLD the cargo loader's lift. Walls (no way): STERN west is the gangway to Japan, shut once he is aboard (the
ship casts off: it is not a place he can return to); HOLD east is the open door (the drop, the Andes). The reefs' ceilings are open sky and each has one gap up to a land room
where it is under one (SURF over CLAM, WHALE over KELP, HANA over FISH).

**Loops:** the four crossed pairs (each a loop of two rooms by two separate ways), and inside the rooms: the engine room's ladder and the hold's ladder (A and B are
one loop: the deck lane out, the hold lane back, the ladder between), the luau's stage and shelf, Mauna Kea's two lanes in. The sea is not a loop on this grid: the reef rooms are in a line with
the islands' rooms above or beside them. A true four-room cycle needs a seventeenth room (the 2x2 block at column 6 row 2 is empty: a Maui sea cave or a lava tube at Hana would fill it, with the Road's waterfall
plunging into it); it is not drawn (open questions).


**Names** (puns, no Z, no Bond): STERN WARNING, BOX CLEVER, PIER PRESSURE, SURF AND TURF, LEI OF THE LAND, CLAM DOWN, MOLE-OKAI, KELP WANTED, WHALE OF A TIME,
ONE WAY OR HANA-THER, HANA BANANA, FISH OUT OF WATER, COFFEE BREAK, MAUNA KEA-OS, HILO GOODBYE, HOLD YOUR HORSES.

### The rooms

Each room says where it opens, what is in it, the items and gates, the creatures. All vehicles and set pieces are drawn as themselves (Chris's lesson, the plan): the cargo
ship as a ship in section (its hull, decks, holds, funnel, bridge and crane, the sea at the waterline: `pacific-decor.ts` `pacFunnel`, `pacBridge`, `pacCrane`,
`pacEngineBlock`; the plates and containers in `pacific-tiles.ts`), the plane's hold as the inside of a fuselage (ribs, skin, roller floor, nets, pallets), and
the plane from outside on the apron (`pacCargoPlane`, fifteen characters long: tail fin, tailplane, engine on its wing, the hump of the flight deck, the wheels).

**A STERN WARNING** (the ship's stern, in section). In: left, on the deck (floor row 8, open rows 5-7), by the gangway from Japan's port (the last room of region 4), which
is gone when he is aboard (the engine's `from` boarding moment as the train's: the quay slides away, the sea in the porthole starts to move). The hull is drawn round the room: its sides
and belly of riveted plates (`pacHullPlate`) down to the keel (rows 15-17), the waves under it (rows 18-19), the funnel (`pacFunnel`, red with a band, smoke at its mouth) and the bridge
(`pacBridge`, its windows and radar) standing on the main deck, a life ring and an anchor. Out: right on the deck (rows 5-7, to BOX), or right in the holds (rows 10-13, floor row 14,
through the hull's bulkhead door) to BOX's hold. A hatch in the deck (cols 21-23) with a steel ladder (col 22) down into the engine room: grating (floor row 14), the engine block and its
flywheel (`pacEngineBlock`), a steam gauge, a pipe along the ceiling; two Mole Crushers (the engine's own, the plan: the engine room's pistons as its crushers; cols 9-11 and 17-19, over the
grating: one in each half) stand between the ladder and the dead end at the left, the pocket (rows 10-13 at cols 2-5) where the bolt cutters lie on a ledge. The bilge gap (cols 15-17,
deadly water under it) is in the grating between the crushers. Dead end with an item: the pocket. 3 coins (the deck, the grating, under the pipe). Creature: the captain's parrot, on the
deck, flying the width of the bridge.

**B BOX CLEVER** (the bow, in section). In: left on the deck (floor row 9, open rows 6-8) or left in the holds (floor row 14). The deck is a canyon of containers, three high in colours (orange, green; the
corrugated sides and door ends: `pacContainer`, `pacContainerDoor`), a rail, the crane's gantry at the right (`pacCrane`, the plan's swinging cargo on the ship's cranes: see mechanism 2) over the gap between two stacks (a
box on a chain sweeps the gap on a timing); the deck lane is a climb over the stacks (rows 8, 6, 4: steps of the stacks' tops) and a jump over the crane's gap, down to the bow at the right, where the dock ramp is
**chained** (the chain tiles across the right edge at rows 6-8, the gate: the cutters). The hold lane under the deck: a flooded hold (floor row 14 at the left, then bilge water, deadly, cols 12-27, rows 14-15) with gantries over it (rows 12 and 11) and a shark
cruising the bilge, the hatch's ladder (col 9) up to the deck, and a Spam musubi on the cargo stack at the left (dead end pocket, rows 10-13). Out: the hold lane has nothing on its right (the bulkhead), only the ladder up. The
shape: a lane over the top, a lane under it, joined by one ladder, crossed twice (STERN to here on deck, back through the holds). 4 coins. Creatures: the shark (bilge), a bouncing coconut on the deck (spilt cargo).

**C PIER PRESSURE** (Honolulu harbour). In: left, down the ship's ramp (rows 6-8, once the chain is cut). The ship's bow at the left edge, the pier's planks (`pacBoardwalk`, floor row 9), then Aloha Tower
(`pacAlohaTower`, its clock) standing up behind, palms, warehouses, the harbour's water (deadly waves) below the pier at the left; the customs guard in an aloha shirt (`pacGuard`) paces the pier. Out: right, **two ways**: the
street (floor row 17, rows 14-16 open at the edge) by a flight of steps down the pier's end and across the dock yard past stacked pallets, and the promenade's roofs (rows 6-8) along the warehouses' tops by crates and a
ladder. 3 coins, the guard (creature), a crab.

**D SURF AND TURF** (Waikiki). In: left, low (street, rows 14-16) or left, high (the roofs, rows 6-8), from PIER. Waikiki's beach (sand, floor row 16 at the left); hotels behind (`pacHotel`), Diamond Head's long ridge
over them (`pacDiamondHead`); at the left the snorkel shop (`pacSnorkelShop`, thatch, the mask on its board over the counter), its loft reached by a ladder: the snorkel on the shop's shelf (a dead end pocket
off the promenade lane). Surfboards in their rack (`pacSurfboards`), a beach umbrella, a hibiscus; at the right the sea: the beach ends in a pool of deadly surf (`pacWaves`, cols 23-31) which is the way down
to the reef **with the snorkel** (a `place` effect on taking it opens the water: the waves become open sea and the floor gap down to CLAM is a swim); without it the waves kill. A rope up the cliff's flank at the left (ceiling gap cols
4-5) to LEI. Shape: two lanes in, a hut to visit, a cliff to climb, a sea to dive into. 4 coins. Creatures: a surfer riding along the water, a hula dancer on the beach.

**E LEI OF THE LAND** (the luau; the costume's room; a dead end). In: through the floor at the left (the cliff rope from SURF). The long house of thatch, its bamboo posts; the stage of boards (floor row 13) across two raised platforms, a fire pit at the middle with the
roast pig on its spit (`pacRoastPig`), four tiki torches in a row along the stage (`pacTikiTorch`, their flames are the timing: mechanism 3) and a totem at each end (`pacTotem`); hula dancers sway on the platforms (`pacHula`), a tiki mask drifts over the pit (`pacTiki`);
the lei hangs on a bamboo hook on the high shelf at the far right (rows 6-8: the dancers' platform over the last torch). Route: the stage's lower lane along the four torches (floor row 17, the sand), up the right platform by crates to the shelf, take the lei, and back. 3 coins.
The lei is the region's key item: Monty is wearing it from then on (his own pictures with the lei drawn on, `pacific-lei.ts`).

**F CLAM DOWN** (reef 1, under Oahu's south shore). Swim room: rows 0-6 are air with the quay at each side (floor row 7, three columns wide), the sea's surface at row 7, water rows 8-17, seabed row 18-19. In: through the
ceiling from SURF (gap cols 24-30). Out: the right quay (rows 4-6) to MOLE-OKAI. The reef: coral heads and rock arches (`pacReefRock`, `pacCoral`) to weave among, a green kelp forest (`pacKelp`), a sea fan (`pacSeaFan`); turtles and an eel; coins hung in the rock arches. A
sunken boat's ribs at the left (decoration, solid ribs). 5 coins. Creatures: turtle, eel.

**G MOLE-OKAI** (Molokai: one room, the quiet one). Two quays, no way up: In: left (rows 4-6, a stone landing, floor row 7 at cols 0-4). The south shore's old fishponds: a long dry-stacked wall of rounded lava stones
(`pacWallStone`) curving out from the shore in two arcs to make ponds (water, deadly, shown between the walls), the walls' tops the platforms (floor rows 7, 9, 11, a step each way), with the sea cliffs of Molokai
(`pacSeaCliff`, `pacSeaCliffB`: tall green, folded) standing behind the whole room in the upper half as the backdrop. Nothing is fast here: a crab walks a wall's top; the way is jumps between the ponds' walls (the ponds' gaps are the water,
one cell, then two). Out: right (rows 4-6) at the far shore to KELP WANTED. A breather by design: one creature, five coins, no mechanism.

**H KELP WANTED** (reef 2, between Molokai and Maui). Swim room as F. In: the left quay (from MOLE). Out: the right quay is shut by rock; the ceiling gap (cols 14-17) up into WHALE at the slipway. Molokai's tall sea cliffs
**behind** it (`pacSeaCliff`, the left third of the room, over the water, rising out of the surface), the channel's open water to the right, Lanai's low shape far off (the plan); manta and a turtle; an air pocket (a
rock arch holding bubbles) in the middle. 5 coins.

**I WHALE OF A TIME** (Lahaina's old whaling harbour). In: through the floor at the slipway (the surface of KELP at the gap cols 14-17), or left from nothing. Two ways onward: the quay (floor row 15, a stone sea wall, the harbour's water at
the left, a whaling brig's hull at anchor with a whale's tail breaching behind it, `pacWhaleTail`, outrigger canoes, `pacOutrigger`) to the right (rows 12-14), and the rigging: ropes up the brig's masts (cols 6 and 9) to a spar (row 7) and along the
rigging (floor rows 7, 9) to the right edge, high (rows 4-6): two lanes. A tiki carved post (`pacTiki`) and a surfer ride the quay. 4 coins.

**J ONE WAY OR HANA-THER** (the Road to Hana). A winding road drawn as one (asphalt with its dashes, `pacRoad`; stone-arched one-lane bridges over gullies, `pacBridgeDeck`; a yield sign, `pacLaneSign`; waterfalls
down the cliff behind, `pacWaterfall`; a bamboo forest, `pacBambooClump`, with bamboo stalks to climb, `pacBamboo`). In: left (rows 12-14, the road). Out: right (rows 6-8) onto Hana, up the road's bends: a hairpin
of the road in three levels (floor rows 15, 11, 7) joined by its bends, the bridges (three) crossing three gullies on the way up (mechanism 4: the cars take turns); a coconut falls from a palm. The Road's waterfalls are scenery.
down the cliff beside it, falling out of sight. 4 coins.

**K HANA BANANA** (Hana, the road's end; Waianapanapa's black sand). In: left (rows 6-8) from the road, onto a headland. Black basalt cliffs (`pacBasalt`), a lava-rock shore, the black-sand beach in a cove at the bottom (`pacBlackSand`, floor row 17), the sea
cave (a gap in the cliff). Rope down the cove's cliff at the left (a cliff ladder, bamboo), the beach; a crab on the sand. A banana palm; a dead end pocket on the sand cave's ledge holds a Spam musubi. The way on is the sea: the cove's pool (floor gap, cols 20-26, a swim down: the snorkel) into FISH. 4 coins.

**L FISH OUT OF WATER** (reef 3, Maui to the Big Island). Swim room. In: through the ceiling from HANA (gap cols 20-26). Out: the right quay (rows 4-6) to COFFEE BREAK. The deep channel: open water with
reef only on the floor and a shark's patrol; a sunken ship's anchor and chain; manta, eel. The roughest water: two creatures that cross. 4 coins.

**M COFFEE BREAK** (Kona: the Kohala-Kona coast and its coffee farms). In: left quay (rows 4-6, from the reef). The leeward coast: black lava rock and white sand coves (low lane, floor row 17, `pacBasalt` and `pacSand`), lava rocks (`pacLavaRocks`), and above the coast the farms on the slope: terraces
of coffee trees (`pacCoffeeTree`) and sacks (`pacSacks`), on steps climbing the hill (floors 13, 10, 7) to the farm shed at the top left where a Spam musubi lies (dead end). A magma blob crawls the low lane (it is from the volcano: lava creeping to the sea). Out: right low (rows 14-16) or right high (rows 5-7, the terraces' top) to MAUNA: two lanes. 4 coins.

**N MAUNA KEA-OS** (the volcano). In: left, low (rows 14-16: the lava-rock shore) or left, high (rows 5-7: the coffee terraces' top) from COFFEE. A tall crater room: a basin of lava at the bottom (mechanism 5: it rises), a climb of black ledges (`pacCrust`, `pacBasalt`)
up the crater's wall to the top where Mauna Kea's snow cap stands (`pacSnow`, `pacMaunaKea` as the backdrop); lava fountains (`pacLavaFountain`) at both sides; bamboo and vine ropes between ledges. The two lanes in: the low lane enters at the basin's floor (the lava starts to rise at once: a hurry), the high lane enters at
the snow's edge (the way back down is a drop into the climb). Out: the summit's right rim (rows 2-4) onto Hilo's terminal roof. 5 coins. A magma blob on the ledges.

**O HILO GOODBYE** (Hilo airport; the guard's room). In: left high (rows 2-4), the terminal's roof. A control tower (`pacControlTower`) at the left, the apron below (floor row 17), palms, a rental-car yield sign; the **cargo plane stands on the apron** (`pacCargoPlane`: tail fin at the left, the engine slung under its wing, the hump of the
flight deck and its cockpit windows, the nose to the right, wheels on the tarmac) and the cargo loader beside the nose door (`pacLoader`: its scissor lift is the way up into the plane: the platform at floor row 14 carries him up through the ceiling gap (cols 24-26) into the hold (mechanism 7)). The guard (`pacGuard`)
paces the tarmac in front of the loader: he lets Monty by when he is in the lei (`removeEnemy`, as Moscow's guard and the ushanka); without it he turns him back. Route: the roof's stairs (ropes, rows 3-17) down to the apron, along the plane's belly (pallets stacked at the tail to climb), the loader. 3 coins.

**P HOLD YOUR HORSES** (the cargo plane's hold). In: through the floor on the loader's lift (gap cols 24-26). The inside of a fuselage drawn as one: the ribs curving overhead (`pacRib`, `pacFuselage` skin with its rivet rows), a roller floor (`pacHoldFloor`, floor row 16), cargo nets
hung over pallets, climbable (`pacNet`), pallets and crates strapped down (`pacPallet`, `pacStrap`), two crates swinging from the ceiling tracks (mechanism 2), a round window (`pacPorthole`), the red jump lamp (`pacJumpLamp`) by the door at the right. The parachute pack lies on the high pallet at the right (a dead end pocket
behind the second swinging crate); taking it opens the rear door (a floor gap in the right quarter, `place`): the way out is a drop into the sky: region 6 (until it is built, the door is shut with a sign: THE ANDES COMING SOON). A stowaway parrot rides the hold. 3 coins.

### Items, gates, doubling back

- **Bolt cutters** (STERN, the engine room's pocket): cut the chain on BOX's ramp (`clear`). **Snorkel and mask** (SURF's shop loft): open the water (`place`; the swim in F, H, L; the waves at SURF's right and HANA's cove). **Lei** (LEI, the luau):
  the key item and costume; the guard at Hilo lets him by (`removeEnemy`). **Parachute pack** (HOLD, the last pallet): opens the door (`place`) and is the item region 6 needs (the drop). **Spam musubi** (BOX hold, HANA's cave, COFFEE's shed): the food in place of the cupcake.
- Critical path: A (the engine room: the cutters, back up) B (the deck lane, cut the chain) C D (the shop loft: the snorkel; the cliff rope up) E (the lei, back down) D (the sea) F G H (up through the slipway) I J K (the cove) L M N (the lava climb) O (the lei, the guard) P (the pack, the door).
  A player who skips the luau reaches Hilo and is turned back by the guard: the sea and the road both go both ways, so the way back is a long swim and walk, which is why ENHANCED hints name the lei as soon as the snorkel is taken (below).
- Doubling back: the deck over the holds (A, B), the street and promenade (C, D), the quay and the rigging (I, J), the shore and terraces (M, N).

### The new mechanisms

All are data in `MontyData` (the engine reads them as it reads `tunnels`, `cracks` and `escalators`), built later; each reads at once from every side and works from every side.

1. **Swimming** (F, H, L; `swim: {rooms}[]`). In a swim room Monty moves as in the jetpack rooms (free in four directions, no walking) but at half the speed and buoyant: no input drifts him up 1 pixel every 6 frames, down 1 pixel every 2 frames while held, sideways 1 pixel every 2
   frames. He draws in a swim pose (his rope pictures, arms out). The surface (row 7) is the top of the water: at it he is in air (he can stand at a quay on floor row 7 and walk out). The sea is open only with the snorkel (`place` effect on the item, the entry gap's deadly waves tile becomes open sea); without it the gap's waves kill. Creatures: any contact kills (event 1).
   Rock and coral are solid (class 1), the seabed a floor, kelp and sea fans nothing. No breath limit.
2. **Swinging cargo** (B 1, P 2; `swings: {room, pivot, length, amplitude, period, phase}[]`). A crate (a 16 x 16 sprite) hangs on a chain from a pivot on the ceiling or crane jib and swings on an arc: pivot x, chain length 6 cells (48 pixels), half-width 7 cells (56 pixels), period 128 frames. It kills like a crusher's head on touch. At each end of the swing it is over the far side
   of the gap for 49 frames (|x| beyond 20 pixels), enough for a jump (28 frames in the air) across the gap in its middle: stand on the ledge, watch it go the other way, jump as it passes the end. The chain is drawn as links (up to four small sprites in a line, or the engine's own
   line) so it reads as a pendulum from any side; BOX's crane has a trolley and its chain (`pacCrane`) as the picture beside it, the box under the hook. Two in the hold at different phases (64 frames apart) so the second is crossed while the first is at its far end.
3. **Fire jets** (E 4; `flames: {room, col, row, rows, period, phase, warn, burn}[]`). Each tiki torch is a bowl with a two-row column above it. Cycle 150 frames: 60 low (a small flame in the bowl: safe, the bowl a floor he may stand on), 30 warn (the flame grows to one row, flickers), 48 burning (two rows: deadly like a crusher), 12 dying. The four torches
   run a wave: phases 0, 40, 80, 120 frames, so the fire runs along the stage from left to right at about the pace Monty walks (a cell in 8 frames = 1 px a frame; the torches are 12 cells apart, 96 pixels = 96 frames, so he walks with the wave behind him if he goes when the first is dying and arrives
   when the next is low). Reads at once: the flame's height is the danger. Works from every side (the torch is fire on both of its sides).
4. **One-lane bridges** (J 3; `traffic: {room, row, from, to, speed, warn, wait}[]`). Three bridges, each 12 cells long over a gully with a yield sign at both ends; a car (a 16 x 16 sprite, the red rental car) drives over each on its own cycle: waits off-screen 180 frames, its headlamps flash at the entry for 32 frames (the warning), drives across at 2 pixels a frame (48 frames for the span),
   waits off the other end, comes back. Monty on the span when the car arrives is killed by it (event 1) or stands on the layby (a 3-cell bay in the bridge's middle, drawn as a stone refuge on the parapet, `pacBridgeDeck` with a gap, where the car cannot touch him). The three bridges are in phases 0, 60 and 120 frames so they are crossed in turn (two he can cross in one go).
5. **Rising lava** (N; `risingLava: {room, col, cols, baseRow, topRow, stepFrames, holdFrames, drainFrames}[]`). The basin's lava (`pacMagma`, its crest `pacMagmaCrest`, deadly: two tiles under his feet kill him, as Monty on the Run's) starts at row 18 when he enters and rises one row every 40 frames to row 8 (400 frames, a little over six seconds), holds for 120 frames, drains at a row a 10 frames
   and starts again. The climb to the rim has about eleven jumps and a rope or two, which a clear player makes in about 270 frames (the bot measures); the lava is always rising behind him so the room reads at once: wait on a high ledge and it comes. Not a kill-on-enter: a player who is caught on a low ledge has a rope up. It stops rising at row 8, so the top third of the room is always safe: the snow's ledges and the exit.
6. **Boarding the plane** (O to P). The loader's lift (`lifts`, an ascending ride): step on its platform, it rises 12 rows at 1 pixel a frame (96 frames), the hold's floor gap receives him. The engine's lift is a ride down in Monty on the Run; this one is the same state machine upward (or the escalator's ride, `escalators` with a vertical slope: the builder's choice).
7. **The ship** (A, B). Not a mechanism but a set piece: the sea in the portholes moves as the train's windows' scenery does (`charAnims`), so the ship reads as under way: waves slide under the hull's sea (rows 18-19) and the funnel's smoke drifts. The two crushers are Monty on the Run's own.

### The costume

The lei: a garland of pink blooms hung in a U round his neck, tied with a bow at the front (`art/pacific-lei.ts`: `LEI`, `LEI_RISE` -7 (below the top of his head, at his neck), `LEI_COLOUR` 10; made by the same `wearing` as the ushanka: his 36 pictures with the lei's place cleared and a black line round it, and the lei a sprite over him in pink; the preview is `lei.png` in the art folder). It replaces the ushanka; the guard at Hilo lets him by in it. (The
rice hat of China and the ninja hood of Japan come off the same way.)

### The creatures (twelve, none in more than two rooms)

Parrot (A, P: the captain's, flying), shark (B, L), crab (G, K), turtle (F, H), eel (F, L), manta (H, L), tiki (E, I), hula (D, E), surfer (D, I), coconut (B, J), guard (C, O), magma (M, N). Bold cartoon characters in `art/pacific-creatures.ts`; sheets at 4x and 8x in the preview folder. (The plan's seagull and
coconut shrimp are left out, and the brief's 8-12 is met: twelve.)

### The food

Spam musubi (a block of rice, a slab of pink spam, a seaweed band; a generic tin, no logo), 200 points like the cake, in BOX's hold pocket, HANA's sea cave and COFFEE's shed.

### The tune

Rob Hubbard's tempo, unchanged. The scale: the major pentatonic (C D E G A) with the fourth added only in the bass; the lead a plucked ukulele (a short pulse with a fast decay, no sustain, repeated notes), the bass a walking ukulele bass (root and fifth, a triangle), a slide on the end of each phrase (a steel guitar's glissando: the lead's
pitch bends down a tone over six frames on the phrase's last note), a shaker on the noise voice at the quarter notes (a short high noise). A short phrase of Aloha 'Oe (public domain, Liliuokalani, 1878) as the break, only if its notes are taken from a public-domain score, not from memory (as Siberia's folk break was left out for that reason); the build decides. Music file as `music/pacific.ts`, with
the column's version in `music/regions.ts`.

### ENHANCED hints (one line each, shown on the item, as Siberia's)

- Bolt cutters: THE CHAIN ON THE SHIP'S RAMP IN BOX CLEVER.
- Snorkel and mask: THE SEA AT SURF AND TURF IS OPEN NOW. A LEI GETS YOU PAST THE GUARD AT HILO.
- Lei: THE GUARD AT THE AIRPORT TAKES YOU FOR A TOURIST.
- Parachute pack: THE PLANE'S REAR DOOR IS OPEN.
- Musubi: no hint (food).

## As built

(empty: written when the Pacific is built)

## Open questions

- **The region is 11 columns wide**, not the plan's about 8: three columns wider than planned. The block is 3 rows because the exit grid is, so the order Chris asked for (Oahu, reef, Molokai, reef, Maui west to east, reef, Big Island west to east) makes a ribbon; the vertical joins keep it winding.
  Fewer columns would mean overlapping islands (Maui over Molokai, say) which makes the map read less as the trip it is.
- A four-room cycle needs a 17th room (a Maui sea cave or a lava tube at Hana, at column 6 row 2). It is not drawn; it can be added.
- Rising lava stops at row 8, so it is never a kill-on-enter room (a player caught low has a rope): confirm the plan's "the climax" wants the harsher version (lava reaching the rim and a deadline).

## Decisions for the builder (2026-11-21)

- Its entry row matches Japan's exit (room J, row 2 of the exit grid).
- Loops from rooms crossed twice are enough on a 3-row grid, but make at least one true loop if the layout allows one.
- The rising lava is the region's climax: it must chase him up the climb at a steady, learnable pace and kill if it reaches him (fair: it never kills on entry, and the climb always outpaces it when played well).
- The loader needs an upward ride: extend the engine's lift to ride up as data (MontyData), Monty on the Run's lifts unchanged.
- An Aloha 'Oe break (1878, public domain) is allowed only if it sounds like part of Hubbard's tune.
