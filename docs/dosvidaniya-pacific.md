# Do Svidaniya Monty: the Pacific's room map

> **Rebuilt 2026-11-23 (the reset).** The region is now five rooms in a U, to the plan in docs/dosvidaniya-reset.md ("the Pacific"): A THE CARGO SHIP (38, [2,17]), B WAIKIKI (41, [2,18]),
> C HANA (49, [3,18], the one swim room), D HILO (52, [3,19], the lava set piece) and E THE CARGO PLANE (54, [2,19]). The puzzle is the sea (the snorkel on the beach stand's roof, reached from the
> hotel's lawn); the new move is swimming against Hana's surge (`currents`, swim.ts). The rooms are described in `games/montyworld/src/pacific.ts`; the route in `test/pacific-route.ts`, the
> mechanisms in `test/pacific-mechanisms.ts`. The Andes and Rio moved ten columns west (the Andes' first room is at [2,20]). Below is the earlier build, kept for its history.
>
> **Where the build differs from the plan.** Ten kinds of creature, not eleven: the ship's crane and the hold's hoist swing the same crate. Hana's three coral heads are the same
> height (the shark passes over him on every crossing; a taller middle head left no way past it), and the middle head's coin lies in a hollow under its overhang on the seabed.
> Hilo's lava is red under a yellow crest (the C64's orange read as earth). There is no far view of Diamond Head (it floated in Waikiki's sky); the cliff at the bay's east end
> stands for it.

Region 5 (docs/dosvidaniya-plan.md; Hawaii's order and its rooms are Chris's: he has been to all three islands). Built 2026-11-21 from the pre-production design and its art (`games/montyworld/src/art/pacific-*.ts`).
Rows 0 (top) to 19, columns 0-31, as in docs/dosvidaniya-moscow.md; Monty stands on a floor row F with his body on F-2 and F-1, and a way out at a side is open at the same rows as the way in of the next room. Every
number was a starting value for the bot to check; the "As built" section says what the bot changed.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points the Pacific takes:

- **A room crossed twice at two heights, the lanes sealed from each other** (`$04 $06 $09 $0C $0D`): the ship's two rooms (the deck over the hold, then the hold under it, joined by one ladder), Honolulu and Waikiki (the street
  and the beach, then the roofs and the promenade), Kona and Mauna Kea (the shore, then the terraces; the volcano's low way in and its snow shelf).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the engine room's pocket (the bolt cutters), the snorkel shop's loft (the snorkel), the luau (the lei), the hold's cargo shelf off the ladder (a musubi),
  Hana's sea-cave ledge (a musubi), the coffee farm's shed (a musubi), the plane's high pallet (the parachute). The start (STERN WARNING) and the exit (the hold's rear door) are the fixed points.
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, key 1 `$14`): the chain on the dock ramp wants the cutters (found in the engine room), the sea at Waikiki and Hana wants the snorkel
  (the shop's loft), the guard at Hilo wants the lei (the luau), the plane's rear door wants the parachute. Four gates.
- **Water and its fish** (kept from Monty on the Run): the three reefs and the cave are swum, by the jetpack's free movement slowed and buoyant. The bilge of the hold, the ponds of Molokai, the surf of Waikiki and Hana are deadly water.
- **A flight like the jetpack's** (`$1D-$1F`): the swim is the same movement at half the speed, which is why the reefs are open rooms with rock to weave among, as the jetpack's shafts are.
- **A rope that leaves a room the other side from where it came in** (`$05`, `$0A`): the luau's cliff rope, the slipway's mooring rope, the road's bamboo, the roof's rope at Hilo, the nets in the hold, the volcano's vine.
- **A lift** (`$05`, `$0D`): the cargo loader at Hilo carries him up to the catwalk over the plane.
- **A true loop** (Chris's brief: make one if the layout allows): the second reef, Lahaina, the road, and the sea cave (the road's waterfall pool drops into it, and it swims out to the reef) are a four-room cycle (one way: the drop).

## Part 2: the Pacific

Seventeen rooms (the plan's "about fifteen": the ship 2, Oahu 3, Molokai 1, Maui 3, the Big Island 3, three reef rooms, the sea cave and the plane's hold), a block 13 wide and 2 high at columns 17-29 of the exit grid, rows
1 and 2 (row 2 is Japan's, so the ship lines up with the port). The islands are in Chris's order, west to east. The trip is a ribbon in the order of play, but its map is a tangle: the ship's two lanes, the street and the roofs,
the shore and the terraces, the four-room cycle, and the sea joining rooms by their sides and ceilings.

```
        col 17     18      19      20       21      22       23       24       25        26       27       28       29
row 1     .         .       .    E LEI OF     .       .     I WHALE  J ROAD   K HANA      .        .        .        .
                                   THE LAND                 OF A TIME TO HANA  BANANA
row 2   A STERN   B BOX   C PIER  D SURF   F CLAM  G MOLE-  H KELP   L SEA    M FISH    N COFFEE O MAUNA  P HILO   Q HOLD YOUR
        WARNING   CLEVER  PRESSURE AND TURF DOWN    OKAI     WANTED   CAVE     OUT OF    BREAK    KEA-OS   GOODBYE  HORSES
                                                                                WATER
```

**Joins** (rope or swim = both ways, gate = an item): JAPAN-STERN walk (the gangway, gone behind him once aboard in the story; the port's way east is open, the ship is in the next room). STERN-BOX walk, twice (the deck lane, the
hold lane). BOX-PIER walk down the ramp (a chain: the cutters). PIER-SURF walk, twice (the street to the beach, the roofs to the promenade). SURF-LEI a rope up the cliff (a dead end). SURF-CLAM the sea (wading into the reef:
the snorkel). CLAM-MOLE, MOLE-KELP swim and walk. KELP-CAVE swim (a dead end). KELP-WHALE the mooring rope up the slipway. WHALE-ROAD walk. ROAD-CAVE the waterfall pool, a drop. ROAD-HANA walk. HANA-FISH the cove's pool (a
drop with the snorkel, a rope back). FISH-COFFEE swim to the coast. COFFEE-MAUNA walk, twice (the shore to the basin, the terraces to the snow shelf). MAUNA-HILO the rim onto the terminal's roof. HILO-HOLD the loader's lift and
the catwalk. Walls (no way): STERN's west is where the gangway was; HOLD's east is the rear door (the drop, the Andes: shut with a sign until they are built).

**Loops:** the ship's lanes joined by the ladder; Honolulu and Waikiki's two lanes; Kona's two lanes; and the four-room cycle reef-Lahaina-road-cave. Dead ends with items: the engine room's pocket, the shop's loft, the luau,
the hold's shelf, the cave ledge at Hana, the shed's ledge, the sea cave (coins), the high pallet.

**Names** (plain and evocative, a pun where it lands, no Z, no Bond): STERN WARNING, BOX CLEVER, PIER PRESSURE, SURF AND TURF, LEI OF THE LAND, CLAM DOWN, MOLE-OKAI, KELP WANTED, WHALE OF A TIME, THE ROAD TO HANA, THE SEA
CAVE, HANA BANANA, FISH OUT OF WATER, COFFEE BREAK, MAUNA KEA-OS, HILO GOODBYE, HOLD YOUR HORSES. (The design's ONE WAY OR HANA-THER needed explaining and is now THE ROAD TO HANA, plain; the plan's lesson.)

### The rooms

Each room says where it opens, what is in it, the items and gates, the creatures. Vehicles and set pieces are drawn as themselves (the plan's lesson): the cargo ship as a ship in section (its hull, decks, funnel, bridge, crane, the
engine room and its bilge), the brig at Lahaina with its mast and spar, the plane's hold as the inside of a fuselage (ribs, skin, roller floor, nets, pallets, the jump lamp), and the cargo plane itself on the apron
(`pacCargoPlane`, tail fin, flight deck, wheels) beside the loader.

**A STERN WARNING** (the ship's stern, in section). In: left on the landing (floor 13) from Japan's gangway; a jump up onto the main deck (floor 11) with the funnel and the bridge, an anchor and a life ring. Out right on the deck,
or right in the hold lane. A hatch (cols 27-29) with a steel ladder (col 28) down into the engine room: the grating (floor 18), two Mole Crushers and the bilge gap (deadly water under it) between the ladder and the pocket at the left (crates, floor 16) where
the bolt cutters lie. Dead end with an item: the pocket. 3 coins. Creature: the captain's parrot over the deck.

**B BOX CLEVER** (the bow, in section). In: left on the deck (floor 11) or in the hold lane (floor 18). The deck is a canyon of containers (floors 9, 7, 9) and the crane's crate swinging over the bow's end where the ramp is chained
until the cutters; the hold's gantries cross the flooded bilge (a shark in it) to a dead end; a cargo shelf off the ladder holds a musubi; a ladder (col 3) joins the two lanes. 7 coins. Creatures: the swinging crate, the shark.

**C PIER PRESSURE** (Honolulu harbour). In: left, down the ramp onto the pier's stub (floor 11). Two ways on: down the pier's steps to the dock yard's street under the warehouses (floor 18, the customs guard pacing it), or up
the rope from the first step onto the warehouses' roofs (floor 7, Aloha Tower, palms, a coconut). Out right, low or high. 5 coins.

**D SURF AND TURF** (Waikiki). In: left, low (the beach, floor 18) or high (the promenade, floor 7). Hotels, Diamond Head behind, the snorkel shop at the left with its loft (a rope up; the snorkel is on it), the surfboards in their rack; a rope
(col 14) joins the beach and the promenade; the cliff rope (col 28) climbs to the luau. At the right the beach ends in deadly surf until the snorkel, then in wading water that runs into the first reef. 5 coins. Creatures: a surfer, a hula dancer.

**E LEI OF THE LAND** (the luau; the costume's room; a dead end). In by the rope up through the floor at the right (col 28). The long house; the stage runs left past three torches whose flames take turns (a three-cell gap between
them to wait in), the roast pig at the entrance, to the steps up at the left and the lei on the high shelf. 4 coins. Creatures: a hula dancer, a tiki mask.

**F CLAM DOWN** (the first reef, a swim room). In: left from Waikiki's sea floor; out right to Molokai's landing. Coral heads and a rock arch to weave among, a rock hanging from the ceiling, kelp and sea fans. 5 coins. Creatures: a turtle, an eel.

**G MOLE-OKAI** (Molokai, the quiet room). In: left onto a stone landing (floor 19). The old fishponds' walls curve out (tops 17, 15, 13, 15) with the ponds' deadly water between them, the south shore's tall sea cliffs behind. Out right
onto the far shore. 5 coins. A crab on one wall: the only creature, no mechanism.

**H KELP WANTED** (the second reef). In: left from the landing; out right into the sea cave; up through the ceiling (cols 14-16) to Lahaina's slipway. Molokai's sea cliffs behind over the water, a rock with a cave under it. 5 coins.
Creatures: a manta, a turtle.

**I WHALE OF A TIME** (Lahaina's whaling harbour). In: by the mooring rope up through the slipway. The old brig lies in the harbour water at the left: crates up to its deck (a tiki mask guards it), a mast's rope to the spar (a dead
end with a coin); the quay runs east past an outrigger canoe to the road. A whale's tail breaches in the harbour. 4 coins.

**J THE ROAD TO HANA.** The road winds up the cliff in three levels (floors 18, 13, 8) joined by bamboo at the bends, over three one-lane bridges with a yield sign at each end; waterfalls down the cliff behind. In left on the lowest
level, out right on the highest. A car crosses each bridge, the way Monty goes. A gap (cols 24-25) in the lowest level is a pool under a waterfall: a drop into the sea cave. 6 coins. Creature: a coconut.

**L THE SEA CAVE** (a dead end of open water). In from the reef at the left, and from above where the waterfall's pool drops into it. Rock ceiling and walls, stalactites, a floor of rubble. 4 coins. Creatures: an eel, a manta.

**K HANA BANANA** (the road's end; Waianapanapa's black sand). In: left on the headland (floor 8). A bamboo rope (col 14) down the cliff to the black-sand beach (floor 18), a crab on it; a ledge in the sea cave at the right with a musubi. The way
on is the sea: the cove's pool (cols 20-22) is deadly surf until the snorkel, then a gap he drops into the third reef, with a rope to climb back. 4 coins.

**M FISH OUT OF WATER** (the third reef). In through the ceiling from Hana's cove; out right to the coast. The deep channel: reef on the floor, a shark's patrol, a sunken anchor. 4 coins.

**N COFFEE BREAK** (Kona). In: left on the lava-rock shore (floor 19). The coast runs east under the farm's slope (a parrot over it), or a rope (col 3) goes up through the hill onto the coffee terraces (floors 11, 9, 7) and the shed's
ledge (a musubi); a magma blob from the volcano on the terraces. Out right, low or high. 5 coins.

**O MAUNA KEA-OS** (the volcano, the climax). In low at the left (floor 19) or high on the snow shelf (floor 7, a rope down to the second ledge). Lava rises in the basin; the ledges climb ahead of it to the rim at the right (floor 9). Mauna Kea's snow behind, a lava
fountain, a magma blob on the snow shelf. 5 coins.

**P HILO GOODBYE** (Hilo airport). In at the left on the terminal's roof (floor 9, the control tower on it); the roof's rope down to the apron; a customs shed over the way with the guard pacing it, who lets him by in the lei; then the cargo loader
carries him up to the catwalk over the cargo plane. Out along the catwalk, high, into the plane. 4 coins.

**Q HOLD YOUR HORSES** (the cargo plane's hold). In from the catwalk onto the door's sill (floor 7); a cargo net down to the roller floor (floor 16); crates swing from their tracks over the lane and the pallets; the parachute lies on the high pallet.
The rear door in the right wall opens with it: the way on, the drop into the Andes, is shut with a sign until they are built. 5 coins. Creatures: two swinging crates.

### Items, gates, doubling back

- **Bolt cutters** (STERN, the engine room's pocket): the chain on BOX's ramp goes (`clear`). **Snorkel and mask** (SURF's shop loft): the water opens (`place` at Waikiki: the surf becomes sea; `clear` at Hana: the pool a gap, with a rope placed
  in it; the reefs' swimming itself is always on). **Lei** (LEI, the luau): the key item and costume; the guard at Hilo lets him by (`removeEnemy`). **Parachute pack** (HOLD, the high pallet): the rear door opens (`clear`) and it is the item the Andes need.
  **Spam musubi** (BOX's shelf, HANA's cave ledge, COFFEE's shed): the food in place of the cupcake.
- **Critical path:** A (the engine room: the cutters, back up the ladder or out along the hold lane) B (the hold lane's ladder up to the deck, along the stacks; the ramp is open) C D (the shop's loft: the snorkel; the cliff rope up) E (the
  lei, back down) D (wade into the sea) F G H (up through the slipway) I J K (the cove) M N O (the lava climb) P (the lei, the guard, the loader) Q (the pack, the door). A player who skips the luau reaches Hilo and is turned back by the guard:
  the sea and the road both go both ways, so the way back is a long swim and walk, which is why ENHANCED's hints name the lei as soon as Hilo's guard is met.
- Doubling back: the deck over the holds (A, B), the street and the roofs (C, D), the shore and the terraces (N, O), the reef, Lahaina, the road and the cave.

### The new mechanisms

All are data in `MontyData` (the engine reads them as it reads `tunnels`, `cracks` and `escalators`; Monty on the Run's value leaves them empty and plays as before); each reads at once from every side.

1. **Swimming** (F, H, L, M; `swimRooms`, `swim.ts`). In a swim room Monty moves as in the jetpack rooms (free in four directions, no jump, no fall) but at half the speed and buoyant: no input lifts him 1 pixel every 6 frames, up or down held 1 pixel every other
   frame, sideways his walking pace. He is drawn in his rope pictures climbing and his walk across. Rock and coral are walls, the seabed a floor, kelp and fans nothing; the creatures kill on touch. The sea is shut with deadly surf (a hazard tile)
   at Waikiki and Hana until the snorkel is taken. The reefs' rooms are the sea all through; there is no breath limit.
2. **Swinging cargo** (B, Q). A crate on its chain from a trolley on the crane's track, a creature of its own (`pacSwingCrate`, with a scowl and a hook): it sweeps its stretch of the lane on its patrol, at the height a creature walks, so he times it
   and jumps it, as Monty on the Run's creatures are. (The design's pendulum arc became a patrol: the engine's creatures already are the timing.)
3. **Torches** (E; `pulses`). Three torches, each a flame two cells wide and two tall in the lane: low (a small flame, safe) for 60 frames, flickering (the warning) for 30, tall and deadly for 48, settling for 12, a 150-frame period; they go off
   40 frames after one another, with a three-cell gap between. The engine's timed strikes with the flame's two tiles, no new code.
4. **One-lane bridges** (J; `tunnels` with a `span`). A red rental car, four cells by two, waits 150 frames off its bridge, flashes the bridge's near end for 32, then drives the 12-cell span a cell every 4 frames; the car goes the way Monty goes on that level
   (so a crossing that begins as it clears the far end is clear). The tunnel mouth gained an optional `span` (the columns it runs between).
5. **Rising lava** (O; `risingLava`, `lava.ts`). A row every 56 frames from row 19 to row 11 when he comes in, holds 150, drains a row every 12 and rises again; drawn in the room's characters over the basin's empty cells; deadly to what of Monty is in it.
   The ledges at row 11 and above are always safe; the climb outpaces it when played well, and it never kills on coming in.
6. **The loader** (P; `escalators`). The existing escalator with a landing straight above its foot: ten rows up in 100 frames, set down on the catwalk.
7. **The ship** (A, B). A set piece: the crushers are Monty on the Run's own; there is no moving sea in the portholes (see As built).

### The costume

The lei: worn as a haku lei, a crown of pink blooms on his head (a hat, as every region's costume is; the item you pick up is still the garland) (`art/pacific-lei.ts`), a sprite over him in light red, made by the same `wearing` as the ushanka (his 36 pictures with its place cleared and a black line round it). It replaces the
ninja hood; the guard at Hilo lets him by in it.

### The creatures (thirteen, none in more than two rooms)

Parrot (A, N), shark (B, M), crab (G, K), turtle (F, H), eel (F, L), manta (H), tiki (E, I), hula (D, E), surfer (D), coconut (C, J), guard (C, P), magma (N, O), swinging crate (B, Q). Bold cartoon characters in
`art/pacific-creatures.ts`.

### The food

Spam musubi (a block of rice, a slab of pink spam, a seaweed band; a generic tin, no logo), 200 points like the cake, in BOX's cargo shelf, HANA's sea cave and COFFEE's shed. The pause screen counts it with the other regions' food as SNACKS.

### The tune

Hubbard's tempo and driver, new data (`music/pacific.ts`, `music/regions.ts`). **Scale**: G major, the sunny scale of the islands' songs (China's and Japan's are pentatonic): the minor tune's G#, Bb, C#, Eb and F move up a semitone. **Instrument**: a ukulele for the lead (a
square-ish pulse with no attack, a quick decay and no sustain: every note a pluck). The walking ukulele bass, the slide at each phrase end, the shaker and a break from Aloha 'Oe are not in it: the break only if taken from a public score (none was to hand), as Siberia's, China's and
Japan's are without theirs.

### ENHANCED hints (one line each, 32 letters at most)

`take`: CUTTERS: "CUTTERS BITE THROUGH CHAINS"; SNORKEL: "WITH A SNORKEL HE CAN SWIM"; LEI: "A LEI: LOOK LIKE A TOURIST"; PARACHUTE: "PARACHUTE: THE REAR DOOR IS OPEN". `wanted`: BOX "THE RAMP IS CHAINED SHUT"; SURF and HANA "A MOLE CANNOT SWIM THAT FAR";
HILO "THE GUARD LETS TOURISTS BY"; HOLD "THE DROP IS FAR TOO HIGH".

## As built (2026-11-21)

The seventeen rooms are in `games/montyworld/src/pacific.ts` (ids 38-54, sectors 38-54; the earlier regions are untouched but for Japan's port, whose way east is open now), art in `art/pacific-*.ts` and `art/world.ts`, the tune in `music/pacific.ts`, the bot's route in `test/pacific-route.ts`,
the pictures in `test/pacific-shots.ts` and `pacific-map.ts`. Where the build differs from the design above:

- **The engine** gained, as data (Monty on the Run's value leaves them empty and plays as before: its trace and title tests pass unchanged): `swimRooms` (`swim.ts`), `risingLava` (`lava.ts`) and an optional `span` on a tunnel mouth (the car over its bridge). The torches are `pulses`, the loader an `escalators` ride with a landing straight above its foot, the swinging cargo creatures.
- **Walking pace.** Monty walks a pixel a frame (a cell in 8 frames) and a jump spans about five cells: the design's frame counts took him for half that. The bridges are 12 cells (96 frames to cross) against the 182 frames a car waits and flashes, so the crossing behind a car is generous; swimming sideways is the walking pace, up or down held a pixel every other frame (the jetpack's thrust is a pixel a frame), and the sea lifts him a pixel every sixth.
- **The map** is 13 columns by 2 rows (the design said 11 by 3): the stern is on row 2 to meet Japan's port, the hold is east of Hilo (not above it, so the loader's lift ends on a catwalk and he walks into the plane), and the reefs are east-west joins, not floor and ceiling ones (only the slipway, the waterfall's pool, the luau's rope and Hana's cove are vertical). A 17th room, the sea cave, makes the loop.
- **The sea.** At Waikiki the surf is wading water into the first reef (the snorkel places the sea tile over it); at Hana the cove's pool clears and a rope is placed over it (a rope over the surf let him walk across it: the mechanism test found it, so the rope comes with the snorkel). A swim room's doorways are five rows high (the sea lifts him: a doorway two rows high was a chore to hold). The chain across the ramp is eight cells: the two gutter columns that mirror the edge are cleared with it (the bolt cutters first left him stopped at the edge).
- **Swinging cargo** is a creature patrol (`pacSwingCrate`, the thirteenth creature; the design's arc over a gap needs a gap wider than a jump). **Torches**: three, the flames two cells wide in the lane (not four, not beside it). The musubi in BOX CLEVER is on a shelf off the ladder (the first build put it on a stack across the lane, so it was picked up in passing).
- **Creatures** (thirteen kinds, none in more than two rooms): the bot's cold runs found where a creature on a short ledge or in a narrow lane is a trap (the magma blob is on the snow shelf, the sea cave has one eel high up, the brig's tiki drifts over the water, no surfer on the quay): a two-cell creature on a four-cell ledge cannot be passed. The customs guard's shed is two cells high so he cannot be jumped.
- **Items** take the original's unused item blocks ($8F, $90, $91, $93, $94; the first aid kit, smoke stack and treasure pointers are left alone). Four new tiles (the chain gate, the flame, the small flame, the car's cabin and body: five) and the swinging crate.
- **Music**: G major (China's and Japan's are pentatonic) and a ukulele lead; no bass, slide, shaker or Aloha 'Oe break (no public score was to hand).
- **No moving sea in the ship's portholes** (the design's set piece): left out.
- **Saves**: the format stays 1.

Checks (all pass): `games/montyworld/test/pacific.ts original|enhanced` (the bot plays 117 checks' worth of legs from Japan's cargo ship to the hold taking every coin, the cutters, the snorkel, the lei, the parachute and the three musubi, slow set; about 14,000 frames and 210,000 states each, found cold), `pacific-mechanisms.ts` (83 checks, fast: swimming and the shut sea, the torches, the cars, the lava, the loader, the guard, the gates, the lei as a costume, the joins both ways, the hints, the map, a save in each room and an old save), `pacific-layout.ts` (233), `music-pacific.ts` (9); the earlier regions' tests count the whole world's totals now (55 rooms, 147 coins, 25 finds, 14 key items, 11 snacks); all of Monty on the Run's pass (trace and title with /tmp/motr.prg included).
Pictures: /root/projects/runstop64-shots/pacific/ (`room-*.png` from the real engine with Monty in them, `sheet.png`, `compare-*.png`, `torches.png`, `cars.png`, `lava.png`, `surf-shut/open.png`, `hana-shut/open.png`, `guard.png`, `lei.png`, `pacific-map.png`).

**What to look at in play**: the swim (the lift at doorways), the road's cars and their warning, the torches (a small flame in a big room), the lava's pace (the bot's climb takes about 340 frames against 56 a row), the luau and the road as places (the plainest), and the ship's stern (does it read as a ship?).

## Decisions for the builder (2026-11-21)

- Its entry row matches Japan's exit (room J, row 2 of the exit grid): done, the stern is on row 2.
- Loops from rooms crossed twice are enough on a 3-row grid, but make at least one true loop if the layout allows one: the sea cave makes one.
- The rising lava is the region's climax: it must chase him up the climb at a steady, learnable pace and kill if it reaches him (fair: it never kills on entry, and the climb always outpaces it when played well).
- The loader needs an upward ride: the existing escalator rides up as data.
- An Aloha 'Oe break (1878, public domain) is allowed only if it sounds like part of Hubbard's tune: left out (no public score to hand).

## Fixes after the first review (2026-11-21)

- Gates are now proved shut by `search()` (the chain: a wall to the sky above it; Waikiki's waves: two rows deep, the seabed under them is waves until the snorkel and sand after, gutter columns included). The joins check fails on any open row that meets a wall (pier, Hana, Hilo and the fish reef's left edge were walled to match).
- Swimming back west out of the reef with the snorkel is safe (the pool's gutter columns 32-33 are sea). The promenade is painted from column 0. The road's coconut patrols the top level's far end, well away from the doorway from Hana.
- Hilo: the apron's end is the plane's wall (cols 30-31, rows 8-16), the catwalk is the only way on; the loader's top has a stone railing at column 14, so the loader is a one-way lift up that reads so from the catwalk.
- The torches are two groups on one timing: embers (safe), a small yellow flame (the warning), then a tall red flame across both rows.
- Left for Chris: the route is still mostly in column order (no item found east opens a way back west; Hilo is still down then up); the plane's rear door leads nowhere until the Andes exist (its gutter cells stay shut so he cannot walk into the empty grid cell); the reefs' stone roofs, the ship/road/Hilo art notes.

## After the Andes (2026-11-21)

The plane's rear door (columns 30-31 and the two gutter columns, rows 14-15) opens the way east now: the parachute clears all eight cells and the sign that said THE ANDES COMING SOON is gone from the hold; the door leads onto the Andes' tail ramp (`docs/dosvidaniya-andes.md`). The parachute's hint reads PARACHUTE: FOR A LONG DROP.

## Pacific v2 (2026-11-22, after Chris played it)

Room ids stay; new rooms are appended after Rio's (78-80); coin and item counts of the first seventeen rooms are unchanged (so saves stay valid), new coins and finds are appended at the end of the tables.

- **Map**: the luau is two rooms. THE FEAST (78, above Waikiki: the cliff rope comes up into it; torches, the ladder to the deck, the earth oven, the pig, the coconut-shrimp table, a rope up to Diamond Head) and LEI OF THE LAND (42, moved to the cell above Clam Down: the show: the stage over a lagoon, drummers, hula dancers, the fire-knife dancer's leaps as the timing, the lei on its stand). Waikiki's sea is closed (a sea wall): the way east is the show's far lawn, whose last boards are deadly waves until the snorkel, then a dive (a rope hung in the gap) into Clam Down, so the lei is always won on the way. DIAMOND HEAD (79) and THE LOOKOUT (80) are an optional climb from the feast (a rope): the crater trail's switchbacks, the bunker's tunnel, the stairs with rocks tumbling down them (the tunnel is where to wait), a musubi and coins at the summit lookout; Diamond Head stands whole behind Waikiki with the lookout on its rim (seen from the beach first).
- **Engine (data-driven, Monty on the Run unchanged)**: `roomBlocks` (pictures put in the sprite bank while rooms are loaded: the bank is full, so the swim rooms borrow Rio's skewer blocks and the sea cave borrows China's dragon blocks), `swimPictures` (Monty's own swimming pictures, and the lei's crown on them), `arrivals` (name-row banners: WELCOME TO HAWAII: OAHU at Honolulu, HAWAII: MOLOKAI, MAUI, THE BIG ISLAND), and the sea's lift now stops short of a room's top (only a stroke up carries him out through a ceiling gap, so there is no screen bounce).
- **Rooms**: MOLE-OKAI's crab is a tern diving over the ponds; THE SEA CAVE is built round a sea serpent (a dragon of six pieces looping the cavern) with its way up at the top right (the pool's gap and rope on the road); THE ROAD TO HANA's cascades fall and splash (charAnims); KELP WANTED's top is the sea's surface and a moray's eyes blink in its hole before it lunges (pulses); FISH OUT OF WATER has a wreck to swim into and a clam with a pearl; bubbles rise in every underwater room; BOX CLEVER has a crane standing on the deck over the swinging crate and holds the bolt cutters (STERN WARNING's pocket has the musubi); WHALE OF A TIME's palm is planted; HANA BANANA has the banana-bread stand (a musubi), a wave sweeping the black sand on a timing and the cliff closing its right edge; PIER PRESSURE's roofs have rotten planks over an alley (cracks); HILO GOODBYE has a gatehouse whose corridor the lei guard blocks (the wall goes to the top of the room), the cargo plane drawn whole, the conveyor truck's slope he rides to the gantry along the plane's back; the hold's sill is at floor 12 to meet it.

## Chris's playtest notes (2026-11-26)

- **WELCOME TO HONOLULU:** "interesting. The enemy that runs around in the bottom should go much further left and right and
  be faster. The enemy that flies up and down doesn't really pose a threat, and the drop to the bottom right doesn't really
  tell me there's water down there." The floor walker's patrol runs most of the floor, faster; the vertical flier's patrol
  crosses the way he climbs (long, across the levels); the drop at the bottom right shows the water below (the sea's surface
  and a glint at the bottom of the shaft, or the harbour visible past the edge) so he knows where it leads.
- **LEI OF THE LAND** (the luau): "there should be a room to the left, because otherwise it just doesn't really make sense
  to go that way. I know the snorkel I think was over here before, but I feel like the snorkel should be in a room on the
  left. The little traps that go up and down are interesting, but the enemy that floats up and down is almost completely
  impossible to hit and there should be another enemy. The enemy on the right side that goes up and down is also
  impossible to hit." A room west of the luau (the way west leads somewhere); both vertical creatures' patrols moved onto
  the way he climbs (long, crossing his levels), and a third creature. Today the snorkel is at THE LOOKOUT on Diamond
  Head's rim (Chris's own story: "climbing Diamond Head to get the snorkel that a tourist left behind"); open question to
  Chris whether it moves to the new west room or the west room is a bonus room of its own.
- **DIAMOND HEAD:** "I love the level design but there's no challenge at all. And it's kind of the same idea as Mount Fuji
  with the rolling thing. But that's not executed well and it's too repetitive anyway." Keep the layout (the switchbacks
  up the crater wall); drop the rolling hazard (Fuji owns the Donkey Kong idea); give it a challenge of its own from the
  real trail: the dark tunnel through the rim, the steep stairs, the WWII bunkers and fire-control station, the birds over
  the crater (frigatebirds swooping across the switchbacks on paths), mongooses darting along the trail at speed; creatures
  crossing the switchbacks with mixed speeds, more than one puzzle (LESSONS: "Challenge as Monty on the Run builds it").
