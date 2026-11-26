# Do Svidaniya Monty: the back half, rebuilt longer (plan, 2026-11-24)

This plan answers Chris's playtest of the back half (2026-11-24) and his notes after finishing the game. It brings back
what the 2026-11-23 reset cut and he misses, fixes what read wrong, and adds what he asked for. **It is for Chris to
approve region by region, in play order.** Nothing here is built, and nothing gets cut unless Chris OKs it by name.

Read with: `games/shared/monty/LESSONS.md` (especially "Never cut what he didn't ask to cut", calm rooms, coins with
reasons, Monty on the Run as the benchmark), `docs/dosvidaniya-reset.md` (the reset and what it cut) and
`docs/dosvidaniya-flight.md`.

**Pictures** (rendered from the game as it was before the reset, commit `44ea872`, and from main today):

| | Before the reset | Now |
|---|---|---|
| Hawaii | `/root/projects/runstop64-shots/back-half/sheet-old-pacific.png` (17 rooms) | `sheet-now-pacific.png` (4 rooms) |
| The Andes and the Amazon | `sheet-old-andes.png` (12 rooms) | `sheet-now-andes.png` (8 rooms) |
| Rio | `sheet-old-rio.png` (11 rooms) | `sheet-now-rio.png` (7 rooms) |
| The flight | | `now-sky/` |

Each folder beside the sheets (`old-pacific/`, `now-andes/`, ...) has every room on its own (`room-<id>-<name>.png`).

## What Chris said

- **Hawaii:** "extremely short and no longer feels like island hopping ... lava flow on a volcano level, yet you just have it
  in general for the big island. There's not enough hula, not enough beach, not enough swimming, the entire thing became
  way too fast." After finishing: "previously we had a lot more focus on going through multiple islands, including
  Molokai, and all that is gone now."
- **The cargo ship:** Viktor chased him after the first and second deaths, but not after the third. A death must not
  count as an escape.
- **Hana:** "I don't know what the flashing blue things are" (the surge warning). The swimming facing is another agent's fix.
- **The parachute drop** "was really fine before and for some reason you've cut it down to being a lot shorter": about
  one and a half rooms now; it fell through three.
- **Machu Picchu:** "I should be able to walk to the right at the top ... some sort of simple scenic room that doesn't
  serve any purpose other than maybe having a single item and then me having to double back." (The top level's left
  edge is a separate bug, being fixed.)
- **The rainforest:** "way too short ... The rainforest's second room is also called the rainforest and I should be able
  to walk left but I cannot. Feels like you left out a room or two." And: "at the jumping piranha, I have to jump into the
  next room to get across it. I appreciate adding more vines but I miss the old vine room as well. That one was really
  well done and I didn't ask you to get rid of it."
- **Rio:** "There wasn't enough carnival. I swear we had a really good carnival level before, with tons of dancers and
  all kinds of colours, and now the dancers were barely represented." And: "Going from SUGAR RUSH to SPY VERSUS MOLE just
  seems really weird. I should go down into Rio and go through carnival before that level."
- **The map:** "there should be space between Hilo, Hawaii and the Andes, because technically you take a plane to get
  there and it's not one room over."
- **After the win:** "if you have a new game it should retain the ability to jump around anywhere on the map. That's
  kind of like the unlocker that's the nice reward."

## 1. What existed before the reset, and what exists now

The rooms as they were at `44ea872` (the last commit before the reset; the Andes reset went onto main next, then the
Pacific's and Rio's merges). **Missed** marks a room or thing Chris named.

### Hawaii before: 17 rooms, four islands, three swims

The old route hopped: **Oahu** (the ship docks at Honolulu; the harbour, Waikiki, the luau) → wade out through the surf
into the first reef → **Molokai** → into the second reef → up the mooring rope to **Maui** (Lahaina, the Road to Hana,
the sea cave under it, Hana) → drop through Hana's cove into the third reef → swim to the **Big Island**'s coast (Kona,
the volcano, Hilo's airport, the cargo plane's hold) → the parachute drop.

| Old room (id) | Island | What it did | Now |
|---|---|---|---|
| STERN WARNING (38) | the ship | The stern in section: the landing from Japan, the deck, the engine room's two Mole Crushers, the bolt cutters. | merged into THE CARGO SHIP (38) |
| BOX CLEVER (39) | the ship | The bow: a canyon of containers, the crane's swinging crate, the flooded hold with a shark. | merged into THE CARGO SHIP |
| PIER PRESSURE (40) | Oahu | Honolulu harbour: Aloha Tower, the street under the warehouses and their roofs, a customs guard. | retired (Aloha Tower is Waikiki's arcade) |
| SURF AND TURF (41) | Oahu | Waikiki: the beach and the promenade, the snorkel shop's loft, surfboards, a surfer, deadly surf until the snorkel. **Missed: the beach.** | became WAIKIKI (41), beach and lawn in one |
| LEI OF THE LAND (42) | Oahu | The luau above Waikiki: three torches in turn, the roast pig, hula dancers on the stage, the lei on a shelf. **Missed: the hula.** | squeezed onto Waikiki's lawn: two torches, one dancer |
| CLAM DOWN (43) | crossing 1 | The first reef: coral heads, a rock arch, a turtle, an eel. **Missed: swimming, island hopping.** | retired |
| MOLE-OKAI (44) | Molokai | The quiet room: the old fishponds' curved walls over deadly water, the sea cliffs behind, a crab. **Missed: Molokai.** | retired (cliffs on a horizon) |
| KELP WANTED (45) | crossing 2 | The second reef: kelp, a manta, a turtle, up through the ceiling to Lahaina. **Missed: swimming.** | retired |
| WHALE OF A TIME (46) | Maui | Lahaina's whaling harbour: the brig, its mast and spar, an outrigger, a whale's tail. **Missed: island hopping.** | retired |
| THE ROAD TO HANA (47) | Maui | Three levels up a cliff, three one-lane bridges with a red car each, waterfalls, a pool dropping into the sea cave. **Missed: the bridges.** | retired |
| THE SEA CAVE (48) | Maui | A dead end of open water under the road, an eel and a manta. | retired |
| HANA BANANA (49) | Maui | Hana: the headland, the bamboo rope to the black sand, the cove that drops into the third reef. | id 49 is now HANA, the swim room |
| FISH OUT OF WATER (50) | crossing 3 | The third reef: the deep channel, a shark, a sunken anchor. **Missed: swimming.** | retired |
| COFFEE BREAK (51) | Big Island | Kona: the lava shore and the coffee terraces, a parrot, a magma blob, a musubi. | retired |
| MAUNA KEA-OS (52) | Big Island | The volcano: lava rising in the basin, ledges climbing ahead of it to the rim. **Missed: lava on a volcano.** | id 52 is now HILO: lava and airport in one |
| HILO GOODBYE (53) | Big Island | Hilo airport: the terminal roof, the apron, the customs guard, the cargo loader to the catwalk. | retired |
| HOLD YOUR HORSES (54) | the plane | The cargo plane's hold: swinging crates, the parachute. | retired (replaced by THE FLIGHT) |

**Hawaii now** (4 rooms in a U): THE CARGO SHIP (38) → WAIKIKI (41: the beach, the lawn, the luau's torches, the lei, the
snorkel on the stand's roof) → HANA (49: all water, the surge, the moray, the sea cave pocket) → HILO (52: lava under the
airport, the parachute on the rim, the biplane on the apron) → THE FLIGHT.

### The Andes and the Amazon before: 12 rooms

| Old room (id) | What it did | Now |
|---|---|---|
| JUMP FOR JOY (55) | Out of the plane's tail: the first flight room, an updraft to a snowy spire, no creatures (it teaches the drop). **Missed: the long drop.** | kept (55), with a condor |
| OUT OF THIN AIR (56) | The canyon: cliffs closing in, a ridge mid-room, an updraft each side, a condor crossing and one diving. **Missed: the long drop.** | retired |
| CONDOR COUNTRY (57) | The overhang over a shelf with an empanada, two updrafts, two condors; down onto the terraces. **Missed: the long drop.** | kept (57), the drop's second and last room |
| NO PROBLLAMA (58) | Machu Picchu's lower terraces, two lanes, the llamas. | kept (58), rebuilt |
| ROCK AND ROLL (59) | Machu Picchu proper: the boulders, the spitting llama, the well. | became MACHU PICCHU (59) |
| MARKET FORCES (60) | The mountain village: the roofs, the market, the chullo on the hat stall. | retired |
| MIST OPPORTUNITY (61) | The cave in the cloud: the mist pit, the panpipes. | retired |
| CLOUD NINE (62) | The cloud forest: a stream with stepping logs, a jaguar, the boughs with a sloth and a toucan, the tangle the machete cuts. | id 62 is now the canopy |
| THE INCA TUNNEL (63) | Under the terraces: torches, a Mole Crusher, the machete on a shelf. | id 63 is now the kapok |
| THE RIVER QUEEN (64) | The riverboat in side view: the captain who wants a local hat. | retired |
| VINE AND DANDY (65) | The piranha river: three swinging vines over a wide brown river, two logs, leaping piranhas, a sloth. "The skill room." **Missed: the vine room.** | id 65 is now the roots |
| THE RIVER ENDS (66) | The last bank: the muddy stair, the anaconda, a pool with a piranha and a dolphin. | id 66 is now the river |

**Now** (8 rooms): JUMP FOR JOY (55) → CONDOR COUNTRY (57) → NO PROBLLAMA (58) → MACHU PICCHU (59) → the Amazon's open
block, four rooms all named THE RAINFOREST: the canopy (62), the river (66), the roots (65), the kapok (63) → Rio.

### Rio before: 11 rooms

| Old room (id) | What it did | Now |
|---|---|---|
| QUAY TO THE CITY (67) | The harbour: the wharf's steps, a capoeirista, a football. | retired (agreed in the reset) |
| THE LAPA ARCHES (68) | The aqueduct crossed twice: the street, the tram's track. | kept (68) |
| SUGAR RUSH (69) | Sugarloaf's base and the cable car. | kept (69) |
| LOAFING ABOUT (70) | Sugarloaf's summit: granite domes, a cleft, marmosets. | retired (agreed) |
| OPEN ARMS (71) | Corcovado and the Redeemer. | kept (71), Rio's first room |
| MONKEY BUSINESS (72) | The Tijuca forest: boughs, a marmoset, a macaw. | merged into OPEN ARMS |
| HOUSE OF COLOUR (73) | The favela's coloured roofs. | kept (73) |
| STEAK YOUR CLAIM (74) | The churrascaria: the gauchos' swinging skewers. | kept (74) |
| BEAT THE DRUM (75) | The carnival's first room: the bateria's stepped risers with a drummer on top, samba dancers on the grandstands, bunting, the SAMBA sign. **Missed: the carnival, the dancers.** | id 75 is now SPY VERSUS MOLE (the Sambadrome) |
| FLOAT YOUR BOAT (76) | The parade avenue: floats carrying him across the channel in two lanes, the CARNAVAL banner, full grandstands. **Missed: the carnival, the colour.** | retired |
| RIO OR BUST (77) | The beach: the finale. | kept (77) |

**Rio now** (7 rooms): OPEN ARMS → HOUSE OF COLOUR → THE LAPA ARCHES (with STEAK YOUR CLAIM above it) → SUGAR RUSH → SPY
VERSUS MOLE → RIO OR BUST.

## 2. The proposal, region by region

The pattern everywhere: **restore** a room Chris liked from git (its layout, mechanism and creatures as they were),
re-place its coins to today's rule (each coin has a nameable reason, one to three a room), and **add** only where an
opening has nothing behind it. Restored rooms bring their art back from `44ea872` (`games/montyworld/src/art/`).

### Hawaii: island hopping again (13 rooms, four islands, three swims)

Play order. The set pieces: the luau's hula show, the Road to Hana's bridges, the run up Kilauea ahead of the lava.

**Chris, 2026-11-25:** "I really loved the three tiers with the cars driving through. It told a story. Hawaii was honestly very
well intended. Originally, it was an execution problem. The redone Hawaii did not feel very well thought through." So the
Hawaii rooms come back **as they were designed** (`804a838^`, the seventeen rooms of `8df967a` and after): the same layouts,
the same story, the same set pieces. The work is execution (art that reads, fair jumps, coins with reasons, exits that lead
somewhere), never a redesign. Above all THE ROAD TO HANA keeps its three tiers with the cars driving through them; it may stay
easy (a run-through is fine there: it is the story), and nothing below may turn it into a different puzzle.

**Chris's story is the route (2026-11-25; it overrides the table below wherever they differ).** In his words: "landing in
Honolulu, then climbing Diamond Head to get the snorkel that a tourist left behind, then snorkeling past Molokai to Lahaina,
Road to Hana, then more snorkeling from that beach (Kaihalulu Beach in Hana has red sand!) to the Big Island (Kona), which
would be a rocky beach with black sand", then "the map splits: Mauna Kea is on a path through the middle of the island, Mauna
Loa is a path on the southern part and has the lava; both paths in real life lead to Hilo", and "maybe Hilo should be the
coffee plantation". Also: "Calling a random underwater level that should be a connector between islands 'Hana' doesn't even
make any sense." The route, in order:

1. **THE CARGO SHIP** docks at **Honolulu**: the harbour (PIER PRESSURE's Aloha Tower quay; the cargo port, not Pearl Harbor,
   which is a navy base and a memorial).
2. **Oahu:** Waikiki's beach and the luau (SURF AND TURF, LEI OF THE LAND, more hula), and the climb up **DIAMOND HEAD**
   (restore the second pass's DIAMOND HEAD and THE LOOKOUT from git) to the crater rim, where the **snorkel** a tourist left
   behind lies at the lookout. The surf kills until he has it.
3. **The swim past Molokai** (the first crossing): open water with Molokai's sea cliffs behind (the old reef room; MOLE-OKAI's
   fishponds may be its shallows). Molokai is scenery here, not a land room.
4. **Maui:** come up at **Lahaina** (WHALE OF A TIME), **THE ROAD TO HANA** (its three tiers with the cars driving through, as it
   was), THE SEA CAVE under it, and **Hana** at the road's end: **Kaihalulu**, the red sand beach in its red cinder cove (HANA
   BANANA's place). Its cove is where he goes back into the sea.
5. **The swim to the Big Island** (the second crossing: FISH OUT OF WATER, the surge, the moray, the shark; today's HANA swim
   room renamed), out on to **Kona**: a rocky black sand beach (lava rock, tide pools).
6. **The island splits at Kona: two ways to Hilo** (Chris, 2026-11-25: "Kona Beach (black) leads to two different routes, Mauna
   Kea and Mauna Loa; the top route can go to Akaka Falls (waterfall!) and the bottom route can go to Hilo Coffee Farm; then
   both connect in Hilo, then go to the plane sequence"). Both real, both playable, the map showing the fork as two rows:
   - **The top way: Mauna Kea, then Akaka Falls.** Up through the middle of the island to the summit (the tallest point in the
     US): above the clouds, the observatory domes, the night sky with stars and the moon; then down the wet side to **Akaka
     Falls**, the tall waterfall in the rainforest gorge, into Hilo.
   - **The bottom way: Mauna Loa, then the Hilo Coffee Farm.** Along the south over Mauna Loa's lava (MAUNA KEA-OS's rising lava
     and cracking crust belong here, and only here), then the **coffee farm** (COFFEE BREAK's coffee moves here: the rows of
     coffee on the slope) into Hilo.
   Each way has coins of its own; neither is a dead end.
   **Both ways are needed, and they lock into each other** (Chris: "make an item from each route necessary"; "a moon rock that has
   fallen into the crater of Mauna Loa to give to someone blocking the path in Mauna Kea"; "a puzzle wherein we combine multiple
   paths creatively like Russia", whose opening "had ALL of the same hallmarks of the opening rooms in Monty on the Run"). Built
   on Moscow's rules (docs/dosvidaniya-moscow.md part 1): the gate is seen before its key, each key lies in a dead end or a
   doubling back away from its gate, the rooms form a loop, and one room is crossed twice at two heights.
   - **The loop:** Kona, the top way (Mauna Kea's climb, the summit, down beside Akaka Falls) to Hilo, and the bottom way
     (Mauna Loa, the coffee farm) back from Hilo to Kona. Every join both ways, so either way can be taken first.
   - **Mauna Kea is two rooms, the summit one screen** (Chris liked the dome, the telescope and the summit together): first
     the climb, cinder slopes and switchbacks rising out of the cloud layer; then, on the grid row above it, **the summit**:
     the cloud tops at the bottom, the bare red cinder ridge to the summit marker, two or three observatory domes, the big
     one's slit open with its telescope pointing out at the night sky (stars and the moon over the black upper rows, the only
     night in the game). The decor and lettering budgets decide how many domes fit.
   - **The moon rock (bottom way, a dead end):** from Mauna Kea's summit a shooting star is seen falling south (the story told
     in the picture). It lies in **Mauna Loa's crater**, down a pit off the bottom way past the lava; taking it wakes the lava,
     which rises behind him on the climb out (the run ahead of the lava).
   - **The astronomer (top way, the gate):** at the summit he stands on the big dome's catwalk, blocking its ladder, until
     Monty brings the moon rock; then he goes in to look at it (MOTR's guard sent off by an item, like the hideout's ninja).
     Up the dome: the telescope, and **the parachute** snagged on top. Seen first by a player who takes the top way first;
     he comes back for it.
   - **The coffee (bottom way):** the sack of beans on the farm's drying deck, up off the farm's lane (a climb, off the
     route): Monty flies the Pacific alone through the night, TOO SLEEPY TO FLY without it.
   - **The plane (Hilo):** two locks in the room name line, NO FLYING WITHOUT A PARACHUTE and TOO SLEEPY TO FLY.
   - **Crossed twice at two heights:** Akaka Falls: the high trail from the summit along the top of the gorge and the low lane
     by the plunge pool from Hilo, sealed from each other by the falls; a player crosses it once each way.
   So the shortest play: Kona, Mauna Loa (the rock, out ahead of the lava), the farm (the coffee), Hilo (the plane still
   locked), up past Akaka Falls to the summit (the rock to the astronomer, the parachute), back down the falls' other height
   to Hilo and away. Taken the other way round, the astronomer is the gate seen first, the whole loop the doubling back.
7. **Hilo**, where the two ways meet: the town's bayfront and the airfield, where the yellow mail biplane waits. Hilo connects
   back to Kona's side (the way out to the other mountain).
8. **The plane sequence** (the flight, then the three-room parachute drop).

Names follow places: a swim is named as a crossing, never after a town. Only the two ship rooms stay merged into THE CARGO SHIP,
and the cargo plane's hold stays cut (Chris asked). Kona keeps the beach; the coffee is the farm's, on the bottom way. Room count follows the story
(about 15 to 17), not a target.

| # | Room (id, cell) | Restores | What it asks (one thing) | Coins (reason) | Items | Creatures |
|---|---|---|---|---|---|---|
| 1 | THE CARGO SHIP (38, [2,17]) | kept as built | Three heights of the ship, with Viktor on your path; lead him under the crane's crate. | 2, as now | | parrot, crate, Viktor |
| 2 | WAIKIKI (41, [2,18]) | SURF AND TURF's beach | The beach: the snorkel lies on the beach stand's roof, seen from the sand and out of reach; the surf kills until you have it. Up the palm at the sea's edge into the luau above. | 2: top of the lifeguard tower (tops a climb); by the surf's edge under the coconut palm (at a hazard's edge) | snorkel (as now) | surfer with his board (walker), tern (diver), falling coconut |
| 3 | LEI OF THE LAND (42, [1,18]) | the old luau, with more hula | The hula show: three torches in turn and the dancers swaying across the stage; wait in the gaps. The lei on its stand at the west end; off the stage's end a gap drops onto the beach stand's roof below (the snorkel). | 2: between the second and third torch (hazard's edge); on the drummers' platform (tops a climb) | lei (moves here from Waikiki) | two hula dancers on the stage, a tiki; a line of dancing hula girls behind the stage as harmless scenery, swaying on the beat |
| 4 | CLAM DOWN (43, [3,18]) | the first reef | Learn to swim: in through the surf's gap above, round the rock arch, out low east onto Molokai. No current, gentle creatures. | 1: inside the arch (inside the structure) | | turtle (vertical), eel |
| 5 | MOLE-OKAI (44, [3,19]) | Molokai, as it was | The quiet room: hop the old fishponds' curved walls over the deadly water, the world's tallest sea cliffs behind. Banner HAWAII: MOLOKAI. | 2: on the highest wall (tops a climb); between two walls by the crab (guarded) | | crab, tern |
| 6 | KELP WANTED (45, [3,20]) | the second reef | Through the kelp past the manta; the mooring rope goes up through the ceiling to Lahaina; the sea cave lies east. | 1: deep in the kelp (inside the structure) | | manta, turtle |
| 7 | WHALE OF A TIME (46, [2,20]) | Lahaina | Climb the old brig's crates and mast to the spar (a dead end), then east along the quay past the outrigger. A humpback breaches in the harbour now and then: Hawaii's one big creature, harmless scenery. Banner HAWAII: MAUI. | 1: on the spar (pocket off the route) | musubi on the brig's deck | tiki on the brig, gull |
| 8 | THE ROAD TO HANA (47, [2,21]) | the old road as it was (`804a838^`): three tiers up the cliff, the cars driving through them | Keep the old room's layout and its cars on all three tiers (Chris loved it, easy as it was); only make it read and play cleanly: the one-lane bridges drawn so you see them, the cars' timing fair. Optional, only if the room stays itself: a pull-in before a bridge. A pool in the lowest level drops into the sea cave. | 2: on the refuge (the reward for stopping); at the head of the bend's bamboo under the coconut (tops a climb, guarded) | | coconut, nene; the cars are the mechanism |
| 9 | THE SEA CAVE (48, [3,21]) | the old cave | A dead end of open water, entered from Kelp Wanted or dropped into from the road's pool: the loop reef, Lahaina, road, cave. | 1: on the ledge under the stalactites (seen now, reached later: seen through the road's pool) | musubi (the reason to dive) | eel, manta |
| 10 | HANA (new 82, [2,22]) | HANA BANANA | Down the bamboo rope from the headland to Waianapanapa's black sand and its sea arch; the cove is the dive into the third crossing. | 1: on the ledge in the lava cave (pocket off the route) | | crab |
| 11 | FISH OUT OF WATER (49, [3,22]) | today's HANA swim room, moved to be the third crossing, with FISH OUT OF WATER's name | The hardest swim, last: the surge, lee to lee of the coral heads; the moray; the shark. Out low east onto the Big Island. | 2, as now | musubi in the sea cave pocket, as now | turtle, shark; moray (a timed strike) |
| 12 | HILO (53, [3,23]) | HILO GOODBYE's place, Hilo town and the airfield | Out of the sea onto Hilo's bayfront: the old wooden storefronts, east to the airfield where the yellow mail biplane stands (touch it: NO FLYING WITHOUT A PARACHUTE, the lock before the key). A rope up the bluff to Kilauea. Back later along the hangar's roof (the way down from the volcano) and onto the apron. Banner HAWAII: THE BIG ISLAND. | 1: on the hangar's roof (one per height) | | rooster, nene |
| 13 | KILAUEA (52, [2,23]) | the volcano where the lava belongs (MAUNA KEA-OS's role; today's Hilo crater) | The run ahead of the lava: in at the shore, the lava rises behind you, over the cracking crust, past the steam vent, up the east wall to the rim's high shelf for the parachute; down the lava tube at the east into Hilo's hangar roof. | 2: on the highest crust ledge the lava reaches (hazard's edge); at the rope's head on the rim (tops a climb) | parachute (as now) | magma blob |

About 20 coins over 13 rooms (the old Pacific had about 80; today's has 9). Snacks: three musubi. The lava, crust and
vent leave the airfield: they exist only in Kilauea. The rooster moves from the crater to Hilo's streets.

**Not proposed back** (Chris to name any he wants): BOX CLEVER and STERN WARNING (they live on, merged, in the cargo
ship), PIER PRESSURE (Honolulu harbour), COFFEE BREAK (Kona), HOLD YOUR HORSES (the flight replaced it).

**Fix: the cargo ship's pursuer (a death never counts as an escape).** Why the third time differed: the escape is
recorded the moment the crate knocks Viktor (`escape()` in `games/montyotr/src/pursuers.ts` sets the `until` find, here
`OVERBOARD`, at once). He is 192 frames behind, so the knock happens as Monty ducks under the crate and heads down the
hatch, easy to miss. Monty then meets the hold's two pistons and the bilge. A death before the crate (the first two)
restarts the room with the find untaken, so Viktor chases again. A death after it (the third) restarts the room with the
find already taken, so `pursuerInit` leaves him out. It was a real knock, unseen, then a death; to Chris it looked like
the death counted. The fix, in the shared engine (so the train gets it too): the knock plays at once (the tumble, a
splash), but the find is taken only when Monty leaves the room alive. A death in the room before that restarts the chase.
The tally's star lights on leaving. Proved by `viktor.ts --room` on the ship and the sleeper: knocked, then killed by a
piston, and Viktor is back after the restart; knocked, then out of the bow door, and he is gone for good.

**Fix: the surge reads as a current.** Today four short streaks flicker in light blue at row 13 for 30 frames before a
set (`SURGE_PULSES`). Nothing says "water moving west". Instead:
- The streaks run: white foam dashes along the whole lane over the heads, drawn as a character animation whose pixels
  shift west a pixel every two frames (Monty on the Run's own animated-character trick), shown only during a set. No flicker.
- The warning: the sea fans and kelp on the coral heads lean west for the half second before a set and stay bent while
  it runs (a two-picture decoration on the set's clock).
- A rush of bubbles from the east edge as a set starts, and a short whoosh (a kit effect).
Pictures by `pacific-shots.ts` through a set; the mechanism test unchanged (the current itself does not change).

### The flight's landing: the full three-room drop

| # | Room (id, cell) | Restores | What it asks | Coins (reason) | Items | Creatures |
|---|---|---|---|---|---|---|
| 1 | JUMP FOR JOY (55, [2,25]) | as it was: no creatures, it teaches the drop | Bailed out of the biplane: sink, steer, ride the updraft to the spire. | 1: the spire's tip (tests the new move), as now | | none (its condor moves to the canyon) |
| 2 | OUT OF THIN AIR (56, [3,25]) | the old canyon | Cliffs close in; ride an updraft over the mid-room ridge and out at the foot of the left canyon. The right canyon has a floor. | 1: over the ridge's crest (tests the new move) | | two condors, crossing and diving |
| 3 | CONDOR COUNTRY (57, [4,25]) | as now | The overhang and the shelf with the empanada; the two throats down onto the guardhouse roof or the terraces. | 1, as now | empanada, as now | two condors, as now |

Three rooms of falling, as before. Condors are in two rooms (the drop's second and third), the creature rule's limit.

**Chris, 2026-11-25:** "the parachute game (I wanted that longer; it's a neat mechanic but the actual implementation was lacking
on last night's playthrough; it was poorly used)." So the drop is a set piece that uses its mechanic, not three rooms of
sinking: each room asks something new of the steering (thread a gap between cliffs; ride an updraft to a ledge you could not
otherwise reach; dodge a diving condor's line; a coin that needs a line chosen from the top of the room), building room to room
like a short course, and the landing is a target worth hitting. Look at the old drop in git first (what worked) and play the
current one with the bot to see what is dull.

**Machu Picchu's boulders** (Chris: "the llama wants an item at the top of the screen and the boulders are running off the right
side even though I don't need to go there; it was kinda weird"): the boulders must roll down the way Monty has to climb to the
panpipes, the hazard of that climb, never off to a side he has no reason to visit.

**Cause and effect for every gate** (Chris: "the puzzles wherein I need an item to proceed aren't really cause/effect driven:
if you have the item, the obstacle doesn't exist... If you knew you knew, otherwise, huh?"). Every gate in these regions (the
spitting llama and the panpipes, the machete and the tangle, the astronomer and the moon rock, the biplane's two locks) works as
a visible event: the gate shows what it wants before Monty has it (the llama spits at him and the room line says why; a
picture of the wanted thing over the guard), and when Monty brings the item he USES it there and we see it happen (he plays the
panpipes, the llama sways and lies down; he cuts the tangle; he hands over the rock and the astronomer carries it in), never an
obstacle that is silently absent once the item is carried.

### The Andes: the scenic dead end off Machu Picchu

| # | Room (id, cell) | Restores | What it asks | Coins (reason) | Items | Creatures |
|---|---|---|---|---|---|---|
| | NO PROBLLAMA (58, [5,25]) | as now (the top-left edge fix is separate) | | as now | chullo, empanada | as now |
| | MACHU PICCHU (59, [5,26]) | as now; its top level now opens east | | as now | panpipes | as now |
| new | THE INCA BRIDGE (new 83, [5,27]) | new: the real dead-end trail cut into the cliff beside Machu Picchu | Walk out along the narrow cliff path, over the logs across the gap, the citadel small and far below behind you, to the end. Then double back. Nothing else to it, as Chris asked. | none | one empanada at the trail's end | a vizcacha on the path |

Only the top level of Machu Picchu's east side opens (the plateau's rows); its lane and tunnel stay shut.

### The Amazon: six rooms in a U, every opening leading somewhere

The canopy runs west along the top, the river east along the bottom: Monty on the Run's U.

| # | Room (id, cell) | Restores | What it asks | Coins (reason) | Items | Creatures |
|---|---|---|---|---|---|---|
| 1 | THE CANOPY (62, [6,26]) | as now, renamed | Down the well's liana onto the lattice and west along it. The lattice now runs on off the west edge (the opening Chris saw); the floor gap under the west liana closes (see questions). | 1, as now | | sloth, toucan |
| 2 | CLOUD NINE (new 84, [6,25]) | the old cloud forest | From the lattice down the rope to the ground, west over the stream on its stepping logs, and down the liana at the west into the river below. | 2: at the rope's head (tops a climb); between two stepping logs (hazard's edge) | | cock-of-the-rock (flier, Peru's bright orange bird), spectacled bear (walker) |
| 3 | VINE AND DANDY (new 85, [7,25]) | **the old vine room, as it was** | Three swinging vines and two logs over the wide brown river, piranhas leaping. In at the west bank (where the boat stood: the bank widens to take CLOUD NINE's liana), out on the east mud bank. | 2: on the two logs (hazard's edge; the old room's five coins in lines thinned to today's rule) | empanada on the east bank, as it was | piranhas, sloth, as they were |
| 4 | UP THE CREEK (66, [7,26]) | today's river, renamed | Now entered from the west (Chris's "walk left" opening): the vine from the fig, the rotten logs that give way, the channel's piranha, the sandbar. | 1, as now | empanada in the fig's niche, as now | dolphin, piranha |
| 5 | THE ROOTS (65, [7,27]) | today's roots, the crossing fixed | Two vines and a log over the river, two piranhas. **The fix:** the west bank widens from five cells to at least eight (or the first piranha moves east) so the run-up, the jump and the landing are all in this room; no jump starts in the room before. | 1, as now | | two piranhas |
| 6 | BRANCHING OUT (63, [6,27]) | today's kapok, renamed | Up the buttress boughs past the anaconda, the machete at the walkway's end, the tangle on the branch cut, east along the branch into Rio. | 1, as now | machete | anaconda, jaguar |

Every Amazon room has its own name now (the sewer-style shared name goes). The piranha fix is proved by the bot starting
at the roots' west edge, not by a run-up from the river.

**Bonus rooms, and the old rooms back as them** (Chris, 2026-11-25: "I believe that there's an opportunity in the Amazon too";
bonus rooms off the path are "an opportunity to try some new things and add some fun challenges"). The "not proposed back" list
is withdrawn: the old Amazon rooms MARKET FORCES, MIST OPPORTUNITY, THE INCA TUNNEL, THE RIVER QUEEN and THE RIVER ENDS come
back from git (`44ea872`), on the U where they fit the route, or as **bonus rooms off it** (not needed to finish, a striking
backdrop of the place like HEAVEN CAN WAIT, a challenge that tries something new with the existing mechanics, a coin or two
where the challenge ends). Natural ones: the river boat (THE RIVER QUEEN) moored off the river lane, the waterfall in the mist
(MIST OPPORTUNITY) off the cloud forest, the Inca tunnel as a hidden way between the Andes and the canopy. Any opening in the
Amazon that would lead nowhere gets a bonus room, never a wall.
**The Amazon's puzzle crosses its two lanes** (the bar is Moscow's opening and the Big Island's loop above): an item found on
the river lane opens the way on the canopy, or the reverse (e.g. the machete cut on the canopy drops a liana to a river
pocket; something from the boat is what the canopy's gate wants), each key in a dead end or a doubling back, the gate seen first.

### Rio: down into the city, through the carnival, then the showdown

As Chris asked: after Sugarloaf, down into the city and through the carnival, and only then SPY VERSUS MOLE.

**Chris, 2026-11-25: Rio is the final rush (this overrides the table below where they differ).** "It still didn't feel like a
final level. Final level should feel like a rush to the beach: bright colors, we exit the jungle to the Redeemer, down through
the colorful streets and houses, a carnival spectacular to the Spy vs Mole battle and then the beach. We kinda have it, but I
think that pacing is the problem... maybe we literally need to up the pace and have Monty literally on the run? Maybe there's
a mechanic wherein he gets an item and he truly is moving faster and maybe being pursued through all of this?" And: "The Sugar
thing, that's a rather weird thing to have; that's a wasted effort." So:

- **The route, downhill all the way:** out of the jungle to the Redeemer (OPEN ARMS, at the top), down through the colourful
  streets and houses (HOUSE OF COLOUR, THE LAPA ARCHES, STEAK YOUR CLAIM: the Selaron steps' tiles, Santa Teresa's tram and
  painted houses, Lapa's white arches), into the carnival spectacular (BEAT THE DRUM, FLOAT YOUR BOAT: the Sambadrome, floats,
  dancers everywhere, the grandstands), SPY VERSUS MOLE (as built: Chris liked it), then the beach (RIO OR BUST, Copacabana's
  wave pavement). **SUGAR RUSH and its cable car are cut** (Chris asked), and with them the crank and the winch if nothing else
  uses them; the way down from the Redeemer to the streets is walked.
- **Monty on the run, for real:** at the Redeemer Viktor arrives (the cause, seen) and the chase starts; Monty drinks a
  **guarana** (Brazil's own soda, the item, taken there; recommended) and RUNS: a faster walk for the rest of Rio, seen and
  heard (a quicker step, the tune's tempo up). Approved by Chris ("the perfect way to end the game ... we're not going to be
  recreating Sonic the Hedgehog speed-wise, but we're going to truly be making 'Monty on the Run'"): a modest boost (about one and a
  half times his walk), his jump arc unchanged, so it still plays like Monty. Viktor pursues him room to room down the hill, coming through each door a few
  seconds behind him (visible, heard, near misses, never a cheap catch), until SPY VERSUS MOLE ends it. Every room from the
  Redeemer to the showdown is designed for the running Monty: wide, bright, flowing, readable at speed, one idea each, no
  fiddly item gates (the pace is the point), coins on the racing line or a quick hop off it.
- Bright colours throughout: no grey (HOUSE OF COLOUR's grey middle goes), the carnival the most colourful screens in the game.

| # | Room (id, cell) | Restores | What it asks | Coins (reason) | Items | Creatures |
|---|---|---|---|---|---|---|
| 1-5 | OPEN ARMS, HOUSE OF COLOUR, THE LAPA ARCHES, STEAK YOUR CLAIM, SUGAR RUSH (71, 73, 68, 74, 69) | as now | the crank, the winch, the cable car up | as now | as now | as now |
| 6 | BEAT THE DRUM (new 86, [6,32]) | the old carnival room, with more dancers | **Down into the city:** out of the cable car's top station, down the hillside steps into the street where the samba school warms up; over the bateria's stepped risers with the drummer on top (time the beat), past the dancers, out low east. | 2: on the top riser (tops a climb); between two dancers (guarded) | skewer on the grandstand's step | drummer, two samba dancers in different colours; the grandstands full of dancing figures (harmless scenery on the beat, each a different bright colour) |
| 7 | FLOAT YOUR BOAT (76, [6,33]) | the old parade avenue | Ride the floats across the channel, three one way at street height and two the other way above; then up the grandstand's stairs at the east end and out high onto the Sambadrome's stand. | 2: on a lane B float (tests the new move); on the stage (pocket) | | samba dancer, a spinning baiana; dancers drawn on the floats |
| 8 | SPY VERSUS MOLE (75, [6,34]) | as built | Viktor's showdown, entered on the stand's ledge as now. | as now | headdress, as now | as now |
| 9 | RIO OR BUST (77, [6,35]) | as built | The finale and the parade. | none | the acai bowl | the troupe |

The floats mechanism (`floats`, today carrying only Lapa's tram) carries the parade floats again. The colour budget per
room (100 decoration characters) is the limit to watch: the grandstands' dancers are one small animated piece repeated,
not many kinds.

**Not proposed back:** QUAY TO THE CITY and SUGARLOAF SUMMIT (both cut by agreement), MONKEY BUSINESS.

## 3. The grid and the saves

### Where each region sits

| Region | Now (cols / rows) | After |
|---|---|---|
| Japan | 12-16 / 0-2 | unchanged |
| Hawaii | 17-19 / 2-3 | **17-23 / 1-3** (the luau on row 1 above Waikiki) |
| *the gap* | | **column 24 left empty: the flight is a jump on the pause map, not one room over** |
| The sky | 20-22 / 0 | **25-27 / 0** |
| The Andes and the Amazon | 20-22 / 2-6 | **25-27 / 2-7** (one row lower: the drop takes rows 2-4, Machu Picchu row 5, the Amazon rows 6-7) |
| Rio | 23-28 / 4-5 | **28-35 / 5-6** (one row lower, two columns wider) |

The exit grid is 50 by 8, so all of it fits. In detail:

```
          17          18          19          20          21          22          23        24     25           26           27           28 ...
row 0                                                                                             MAIL RUN     STORMY       ON HIS TAIL
row 1                 LUAU
row 2     SHIP        WAIKIKI                 LAHAINA     ROAD        HANA        KILAUEA          JUMP FOR JOY
row 3                 CLAM DOWN   MOLOKAI     KELP        SEA CAVE    FISH        HILO     (gap)  THIN AIR
row 4                                                                                             CONDOR CTRY
row 5                                                                                             NO PROBLLAMA MACHU PICCHU INCA BRIDGE  [Rio's STEAK at 30]
row 6                                                                                             CLOUD NINE   CANOPY       BRANCHING    OPEN ARMS ...
row 7                                                                                             VINE&DANDY   UP THE CREEK THE ROOTS
```

Rio: OPEN ARMS [6,28], HOUSE OF COLOUR [6,29], THE LAPA ARCHES [6,30] with STEAK YOUR CLAIM [5,30] above, SUGAR RUSH
[6,31], BEAT THE DRUM [6,32], FLOAT YOUR BOAT [6,33], SPY VERSUS MOLE [6,34], RIO OR BUST [6,35].

Joins to watch (`joins.ts` checks each once both sides are built): Waikiki's palm runs up into the luau at the same
columns; the luau's west gap drops onto the beach stand's roof; Waikiki's surf gap is CLAM DOWN's only opening above;
the road's pool drops into the sea cave; the sea cave's east side is shut (the third crossing is beside it); Hana's cove
opens into FISH OUT OF WATER's ceiling gap (cols 26-30, as today's room is drawn); Kilauea's and Hilo's east sides are
shut; the kapok sits under THE INCA BRIDGE now, so its top row needs a leaf fringe (a jump must not leave by the top).
`regions.ts` changes in one place, and the map and the music follow it.

### What moves, and how old saves still load

Saves change format once (format 3), because the coins' and finds' places in the tables follow the rooms' order and
rooms are added mid-list (and the lei moves to the luau). The reading follows the existing pattern:
- **Format 2 → 3:** a snapshot of today's tables (`save-format2.ts`, as `save-format1.ts` holds format 1's). Each coin
  flag matches by room and cell, each find by room and picture, a key item by picture alone, so no gate closes again.
  Generalise `fromFormat1` into one reader both formats use (one owner).
- **`RETIRED`** (`save-migrate.ts`) loses the rooms that come back and re-points the rest.
- A kept room whose cell moved needs nothing: `carryOn` puts him in today's cell for that room.

| Room | A save made there loads... |
|---|---|
| 38 ship, 49 swim room, 55, 57, 58, 59, 62, 63, 65, 66, Rio's kept rooms, the sky's 79-81 | in the same room at its new cell; where the cells changed, at the nearest place he can stand |
| 41 Waikiki | on the beach as now; a save on the old lawn (floor 7 and above) loads on the luau's stage (42) |
| 52 Hilo (format 2) | in Kilauea (52) at the nearest standing place; a save on the old apron loads on Hilo's apron (53) by the biplane |
| 42-48, 53, 56, 76 (format 1, the rooms that come back) | in the restored room: `RETIRED` no longer sends them elsewhere |
| 49 HANA BANANA, 50 FISH OUT OF WATER (format 1) | 49 → HANA (82); 50 → FISH OUT OF WATER (49) |
| 51 COFFEE BREAK, 54 the cargo plane | Hilo (53), on the shore and by the biplane |
| 62 CLOUD NINE, 65 VINE AND DANDY, 75 BEAT THE DRUM (format 1) | their restored rooms (84, 85, 86), not the rooms that took their ids |
| 64 THE RIVER QUEEN | VINE AND DANDY's west bank (85) |
| 39, 40, 60, 61, 67, 70, 72, 78 | unchanged |

Fixtures in `test/save-migrate.ts`: a format 2 save in every kept back-half room (Waikiki's beach and lawn, Hilo's basin
and apron), a format 1 save in each restored or re-pointed id. Each checks: the room is on the grid, he stands, the coins
and key items carry over.

### The C64 budget (`budget.ts`, `docs/dosvidaniya-c64.md` section 5)

Today: the world's decoration kinds are 201 of 255 (the room table's one byte); the fullest rooms hold 98 of 100
decoration characters (China), Rio's fullest 90, Hawaii's 54, the Andes' 20. The old Pacific at 17 rooms used 13 creature
types (the limit is 14 a region) and its footprint was 14.5 KB (the limit is 14 KB).
- **Hawaii at 13 rooms loads as two parts** on a real C64, as a multiload would: Oahu and Molokai (the ship to Kelp
  Wanted), then Maui and the Big Island. Each part stays within 14 creature types, 48 tiles, 17 rooms and 14 KB. In the
  web build this is a grouping in the budget test, not a change to the map or the music.
- **Decoration kinds:** the restored rooms bring back perhaps 40 kinds, about 240 of 255. Count after each region. If the
  world would pass 255, the kind's byte becomes per load (the C64's own model: a byte in a region's list); that is an
  engine change to agree first.
- Specials (items and snacks): the limit is 64 in the world; this adds about six.
- Rooms: the highest id becomes 86, well under 255.

## 4. Order of building

One region at a time; each step with its scoped tests (`nice -n 15 node tools/test.mjs <test> --room <ids>`, about 5
minutes a change), its pictures for Chris, and one bot re-record at the region's end. The full gate once at the end of
the batch, then the coordinator deploys.

1. **The two fixes** (small and separate): the escape is taken on leaving the room (`pursuers.ts`; `viktor.ts --room` ship
   and sleeper); the surge's look (`pacific.ts` and its art; pictures).
2. **The after-win travel** (section 5; may be built sooner, apart from this plan).
3. **The grid move and the format bump**, before any new room: `regions.ts`, the snapshot, the reader and the fixtures.
   Tests: joins, map, save-migrate. No room changes yet, so the routes need no re-record.
4. **Hawaii**, one island at a time: Oahu (Waikiki and the luau), the crossings and Molokai, Maui (Lahaina, the road, the
   sea cave, Hana), the Big Island (Hilo, Kilauea). Tests per room: pacific-layout, pacific-mechanisms, climbs, joins,
   creature-contrast, budget. Then one re-record of the Pacific's route.
5. **The drop** (OUT OF THIN AIR back, JUMP FOR JOY without its condor): andes-mechanisms and flight `--room 55,56,57`.
6. **THE INCA BRIDGE.**
7. **The Amazon** (CLOUD NINE, VINE AND DANDY, the names, the roots' bank, the canopy's floor). Then one re-record of the
   Andes route covering 5-7.
8. **Rio's carnival** (BEAT THE DRUM, FLOAT YOUR BOAT): rio-mechanisms, `viktor.ts --room 75`, the reward show's places.
   Then one re-record of Rio's route.

Also to update along the way: `world.ts`'s totals, `scope.ts` (it still files the sky under the Andes), `info.ts`'s room
list, the QOL and region docs, HANDOFF.md.

## 5. After the win

**Decided by Chris (2026-11-24): a new game after a win keeps the whole map for travel.** "That's kind of like the
unlocker that's the nice reward. Let the player play again, encounter Viktor again, but be able to jump around if they
need to."

- Once the game has been won, NEW GAME starts fresh in everything that is play: items, coins, snacks, costumes, gates,
  Viktor's encounters and the tally, lives (in HARD). It keeps the **map's found record**: every room visited in any
  game since the win stays a travel destination, shown on the pause map.
- How it fits the saves: the rooms visited already live apart from the game's save, in the map's progress (since the
  format change in `montyotr/src/save.ts`, "the rooms visited went into the map's progress; the save is the rest"). Add
  one flag to that progress, *won*, set when the ending plays. With it set, `beginNewGame` keeps the progress's rooms
  instead of clearing them; without it, a new game clears them as today. The save itself needs no new format. Travel's
  rule ("any room visited, from its entry") needs no change, because the visited rooms are simply still there.
- Travelling ahead of the story: to a room past a gate he has not opened yet, travel puts him there as it does today; the
  gates and items are the new game's, so a gate still wants its item. Viktor's rooms play him again, since his finds are
  the new game's. One rule to keep: travel never goes to the ending's room (already `untravellable`).
- CONTINUE after a win stays as it is today (back to the last room entered, so what's left can still be found).
- Test: a won progress plus NEW GAME has every visited room on the map and travellable, no item or coin taken, Viktor
  due on the train; an un-won progress plus NEW GAME clears the map as now.

The other options, kept as notes:
- **(a) A mop-up after the win:** CONTINUE opens the map with every room open and what is left to find marked, to play
  on to 100%. Small (a session): mostly the map's markings. Partly covered by the decision, since travel is open in a new
  game; the "what's left" marks could still be added to the pause map later.
- **(b) After a win the title offers only NEW GAME** (or NEW GAME and WATCH ENDING). Hours of work, but it throws away a
  won save's use. Not chosen.
- **(c) The reverse quest** (play back from Rio to Moscow as Viktor, chased by Freddie Ferret). Honest size: the route
  is built one way in many places (the parachute drop and the flight, the dives into the sea, the Amazon's well, the
  train's roof, Lapa's one-way gap, the cable car, China's and Siberia's drops), so most of the 60-odd rooms need a way
  back up or a replacement. Plus Viktor as a playable figure (his full set of pictures), Freddie as a new pursuer, the
  gates and hints reversed, a new ending. That is as big as building the back half again, several times this plan.
  Not recommended.

### The best ending (Chris, 2026-11-25; for the release plan, not this batch)

A % complete (rooms, coins, snacks and items, the bonus rooms' challenges, Viktor's chases escaped) and a best ending at 100%.
Viktor is never "caught": he is smashed, in SPY VERSUS MOLE's crushers. The best ending nods to the tradition (Metroid's suit-off
reward, Auf Wiedersehen Monty's beach girl) as Chris picked: **Monty's reveal and the beach together**. Staged as a reveal so
it reads as the nod: on Copacabana, every regional costume he wore flies off him at once (the chullo, the lei, the ninja hood,
the hats...), he stands there as bare as he always is (he is a mole), then snaps on a speedo and sunglasses, the first clothes of his own he has worn all game, strikes a pose, turns and walks away from the camera (the speedo seen from behind, the cheeky shot) up the beach past the crowd
(sunbathers in bikinis and trunks, umbrellas, volleyball) and settles on a towel beside a sunbather in a bikini. Fade out.
Cartoon, in the game's style, nothing more. The room's name, the 100% one: **THE FULL MONTY** (Chris: everything, and the bare joke).

## 6. Questions for Chris

Each has a recommendation; a yes to all lets the build start with Hawaii.

1. **Hawaii's thirteen rooms** as listed (four islands, three swims, the luau back above Waikiki, the Road to Hana
   rebuilt with its bridges, lava only at Kilauea, Hilo town with the biplane)? *Recommend: yes.*
2. **The ship:** Viktor's escape counts only once you leave the ship alive, and the same on the train? *Recommend: yes.*
3. **Old rooms not proposed back:** PIER PRESSURE, COFFEE BREAK, HOLD YOUR HORSES; MARKET FORCES, MIST OPPORTUNITY, THE
   INCA TUNNEL, THE RIVER QUEEN, THE RIVER ENDS; QUAY TO THE CITY, SUGARLOAF SUMMIT, MONKEY BUSINESS. Leave them out?
   *Recommend: leave out; name any you miss and it goes back the same way.*
4. **The canopy's floor:** close the gap under its west liana, so the way down runs west through CLOUD NINE and VINE AND
   DANDY (otherwise both are skippable)? The liana stays as the climb to its coin. *Recommend: yes.*
5. **The Amazon's names:** THE CANOPY, CLOUD NINE, VINE AND DANDY, UP THE CREEK, THE ROOTS, BRANCHING OUT? *Recommend: yes.*
6. **The scenic room:** THE INCA BRIDGE (the real dead-end cliff trail at Machu Picchu) with one empanada and a vizcacha?
   *Recommend: yes.*
7. **VINE AND DANDY's coins:** the room exactly as it was, but two coins on the logs in place of the old lines of five?
   *Recommend: two.*
8. **JUMP FOR JOY back to no creatures** (as it was, the room that teaches the drop), its condor moving to OUT OF THIN AIR?
   *Recommend: yes.*
9. **Rio's carnival:** BEAT THE DRUM (the walk down from Sugarloaf into the city and the bateria) and FLOAT YOUR BOAT
   (the floats), between SUGAR RUSH and SPY VERSUS MOLE, with dancers as creatures in each room and dancing crowds on
   the grandstands? *Recommend: yes.*
10. **Hawaii's big creature:** a humpback breaching in Lahaina's harbour (harmless scenery, the region's one)? *Recommend: yes.*
