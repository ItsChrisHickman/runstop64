# Do Svidaniya Monty: open edges, creatures and colours (the whole-game challenge pass's audit)

The audit for the challenge pass (Chris, 2026-11-26; his notes are in docs/dosvidaniya-siberia.md, -china.md, -japan.md,
-pacific.md, -andes.md and -flight.md). It looks, it does not change anything. Measured on main at 48948626 by a one-off script
(`games/montyworld/test/pass-audit.ts`, committed with the re-check; `--room` narrows it) that:

- renders every room and checks its four edges against the exit grid and the room across each one,
- replays every region bot's recorded routes (ENHANCED) from their kept leg states, to find the way through each room (none died
  on the way, so the states matched the rooms),
- measures each creature's sweep over 900 frames,
- counts the colours of every room's picture with the sprites out, next to Monty on the Run's rooms measured the same way.

**Re-checked 2026-11-27 after the release merged into this branch** (main at ff8a7353: Siberia's train as a path puzzle and the
locomotive's steam valve, Viktor's chases announced, the % complete and THE FULL MONTY). The only rooms whose layout or creatures
changed are Siberia's; every other region file is as audited, so their rows stand. Siberia and SIBERIA YOU LATER were measured again
(`nice -n 15 node tools/test.mjs games/montyworld/test/pass-audit.ts <out> --room moscow.station,siberia`: the script now takes
`--room` and then replays only those regions' routes). Siberia's rows are **no longer provisional**. The engine files behind the
shared faults (icicles.ts, rollers.ts, swim.ts, cameos.ts, layout.ts) are unchanged, so section 4 stands. What changed:

- **Edges:** none. COAL COMFORT's new vestibule and the cab roof leave its sides as they were: east joins MINE ALL MINE at row 3 both
  ways (the cab roof's beam), west joins SLEEPER HIT at rows 8 and 16 both ways; the tender's sky has no rope up. The train cars'
  bottom rows are still the track bed (left as they are).
- **Creatures:** SLEEPER HIT's guard now covers 24% of the way (was 13%). COAL COMFORT: the stoker paces 3 cells clear of the cab's
  doorway and the cab-roof bat is now a 5-cell vertical patrol (it was a walker that closed the roof); both short and at one speed
  each, the bat barely on the way (4%, n1). BORDER LINE CASE's walker covers 32% (the route changed). The steam valve's blast is a new
  hazard in COAL COMFORT (a pulse, not a creature: challenge.ts counts it).
- **Colours:** COAL COMFORT now leads with red, dark grey and green (it shared 2 of 4 with SLEEPER HIT, now 1 of 3); the train cars
  are otherwise the same brown, red and yellow.
- **New engine pieces a region job can reuse** (skill monty-mechanism): `switches` (levers.ts `switchUpdate`: a box that flips a
  hidden find, saved) and a pulse's `calmedUntil`; a pursuer's `announce` (the name flashes red as he steps in, green as he is
  escaped). And main now has `test/challenge.ts`, the challenge floor (two hazards a room unless `CALM`, the failing rooms listed in
  `PENDING`), and `test/recipe.ts`, the one owner of a room's creature records. challenge.ts notes Moscow's walkers patrol only 2 or
  3 cells and Chris called it perfect: so the patrol lengths below are not a fault on their own; placement on the way, density and
  mixed speeds are.

Re-check renders: `/tmp/claude-0/renders/pass/audit/recheck/` (all-siberia.png; the creature-path sheet of the train rooms
`train-sheet.png/sheet.png`); the Siberia rooms in `rooms/` and `all-siberia.png` are refreshed.

Contact sheet of the open edges: `/tmp/claude-0/renders/pass/audit/sheet.png` (yellow bar: no room that side; red: a join
that reads wrong). Every room: `/tmp/claude-0/renders/pass/audit/rooms/<id>.png`, `all-<region>.png`.

## 1. Open edges

How the edges were checked: for each side, the edge column's cells (row 2 down). A side is open where Monty can stand at the
edge (a floor with two rows of room over it), where most of the column is open, or where water or lava runs off it. Each open
side was then checked against the grid cell beyond it, and against the room there: whether it is open at the same rows.
Pictures were looked at for edges the cells do not show (sky or sea drawn to the edge).

### Where an edge reads open and leads nowhere

| # | room | side | where it is in the real place | recommendation |
|---|---|---|---|---|
| 1 | $2a LEI OF THE LAND [1,18] | W | Waikiki's beach, running west from the luau toward the hotels and the Ala Wai | **New room $63 at [1,17]** (Chris asked for it). Waikiki's beach west of the luau: the beach boys' stand, outrigger canoes on their racks, surfboards stood in the sand, the Duke's statue. A bonus challenge: canoes carried along the sand by two beach boys (walkers at different speeds crossing the way), the surfboard rack as a climb, a coin at its top. **Chris to decide** whether the snorkel moves here (his note) or stays on Diamond Head's rim (his earlier story). Its bottom must be solid: THE CARGO SHIP below has open sky in its top row. Its east side meets the luau's floor at row 18; its west side stays closed (SHOGUN'S HALL is at [1,16], closed on that side). |
| 2 | $5c THE SUMMIT [1,22] (**built 2026-11-27: ON THIN ICE, 101**) | W | The summit plateau west of the domes: cinder cones, Lake Waiau, snow | **New room $65 at [1,21]**: Lake Waiau among the cinder cones. Bonus room: the cones as steps; a snow crust that cracks under him (the cracking mechanism, as Mauna Loa's crust uses); nene geese crossing the cones; coins on the far cone. Its bottom must be solid: KAIHALULU below has open sky in its top row. Its west side ([1,20]) stays closed. |
| 3 | $5c THE SUMMIT [1,22] (**built 2026-11-27: SEEING STARS, 102**) | E | The ridge of telescopes (Keck's twin domes, Subaru, Gemini) | **New room $66 at [1,23]**: the telescope ridge. Bonus room: domes whose slits open and shut on a timing (to pass through, or to ride up on), Keck's guide-star laser as a timed beam across the way, a coin on each twin dome. Its bottom must be solid: AKAKA FALLS below has open sky in its top row. Its east side stays closed: column 24 is the flight's gap. |
| 4 | $33 COFFEE BREAK [4,23] (**done 2026-11-27: the farm's lava-rock wall**) | E | The Kona and Hamakua farm slope, which runs on to the coast | **Closed, for a reason in the place.** Chris: "no way that could work based upon the map": column 24 is the flight's gap, and the Big Island ends here. Fold it into Chris's redesign: the farm's lava-rock wall, or the gulch's edge with a fence, at the east edge, so the way on (up the rope) is the only way. |
| 5 | $2b CHANNEL SURFING [3,18] | W | The sea back toward Oahu's south shore | **New room $64 at [3,17]**: Hanauma Bay, the snorkellers' reef bowl, a bonus swim room (swimRooms). Shoals crossing the bowl at two depths, a moray up and down out of the coral, the coins at the far side of the reef. Or, more cheaply, close it (Koko Head's lava wall rising out of the sea at the west edge) and show the way east (Molokai ahead, the current's arrows). His note offers both; the LESSONS rule ("an edge that runs off into nothing gets a bonus room") favours the room. Above it is THE CARGO SHIP, whose bottom row is solid. |
| 6 | $49 HOUSE OF COLOUR [6,29] | E (rooftop) | The church tower at the top of the favela | The joins are good: joins.ts `--room 73,71,68` walks all 11 standable edges both ways, none one-way. The roofs (floor row 8) run west to the edge and meet OPEN ARMS's hilltop at the same height, and the lane (rows 16-17) is the way east to Lapa. What reads wrong is the top: the tower's top (row 4, cols 29-31) is open to the east edge into a one-cell slot beside Lapa's townhouse wall (Lapa col 0, rows 0-3). It can't be reached from the roofs (four rows up), and the open sky over the roofs runs on past the tower. **Close it**: the tower's steeple to the top of the room, and Lapa's townhouse wall out to its edge. Then the roofs read as ending at the church, and the way on is visibly down the ladder to the lane. If Chris meant the roofs' west end instead, it is walkable both ways into OPEN ARMS. |
| 7 | $58 DIAMOND HEAD [1,19] | E | The top walk at the Fire Control Station's foot, on the rim | **Closed, for a reason in the place**: the rim's far side drops into the crater. The station's wall, or a rail and the crater's edge, at the east edge. ([1,20] is free, but a room there would sit between Oahu and the Big Island's new rooms.) |
| 8 | $59 THE LOOKOUT [0,19] | E | The station's roof and bunker, on the summit | **Closed, for a reason**: the summit bunker's wall to the edge, or a parapet. |
| 9 | $59 THE LOOKOUT [0,19] | W | The view out over Waikiki and the sea (open air, not walkable: the rim walk ends at the railing) | **Keep the view** (it is the room's point, and Chris asked what he is looking at). Draw the railing at the walk's west end, and the cliff falling to the sea under it, so the edge reads as the edge of a lookout. |
| 10 | $35 HILO GOODBYE [3,23] | E | Hilo's airfield running east to the bay | **Closed, for a reason**: column 24 must stay empty (the flight's gap). The airport's fence, or the hangar's wall, at the east edge; the biplane is the way on. |
| 11 | $23 NINJA HIDEOUT [0,16] | E | The top of the hideout's wall (row 4) | **Closed**: [0,17] is in Hawaii's columns. Take the wall up to the ceiling, or put a roof beam over it. |
| 12 | $37 JUMP FOR JOY [2,25] | E | The snowfield on the ridge where the jump starts | **New room $67 at [2,26]**, as part of the longer drop Chris asked for (five or six rooms, two lines down). The glacier's ridge east of the jump is the start of a second line down: [3,26] and [4,26] are free, and MACHU PICCHU [5,26] below them has an open top row with no room above it. The drop could be ids $68 [3,26] and $69 [4,26], ending in Machu Picchu's sky. The Andes' drop redesign decides this. If it does not take the second line, close the edge with the ridge's rock rising to it. |
| 13 | $53 THE INCA BRIDGE [5,27] | E (lower half) | The gorge under the bridge (rows 11-19 open air east of the drop to BRANCHING OUT) | **Closed, for a reason**: the gorge's far rock wall at the lower right. The drop stays the way down. ([5,28] is in Rio's columns, over OPEN ARMS.) |
| 14 | $4d RIO OR BUST [6,34] | E | The top of the beach building (row 11): the end of the game | **Closed**: the building's wall to the top (the Copacabana Palace, or the fort at the beach's end). Minor. |

### Edges checked and left as they are

| room | side | why it stays |
|---|---|---|
| $0 MOSCOW MOLE [1,0] | W | The start room's open street, deliberate: Monty on the Run's start is open and players simply cannot go back (edges.ts). |
| $2d LAND AHOY / $30 THE SEA CAVE | E / W, row 7 | Sky over the sea's surface meets the cave's rock. It is out of a swimmer's reach (swim.ts surface), and joins.ts exempts it. Reads closed. |
| $5 SIBERIA YOU LATER, $9 THE GRAVY TRAIN, $a SLEEPER HIT | S | The track bed under the rails: open cells in the bottom row that he cannot get down to. |
| $4f, $50, $51 (the flight) | W, E, S | A flight: the plane comes in and leaves by the edges. |
| Every China and Japan room except NINJA HIDEOUT; every Siberia room (re-checked after the release); the other Andes and Rio rooms | all | No open side without a room, and no join open on one side and shut on the other. |

### Proposed new rooms (ids after the highest used, $62; cells checked free on the exit grid)

| id | cell | region | place | kind | joins to check when built |
|---|---|---|---|---|---|
| Siberia | - | - | none needed (re-checked after the train and the steam valve) | - | - |
| China | - | - | none needed | - | - |
| Japan | - | - | none (NINJA HIDEOUT's east is closed) | - | - |
| $63 | [1,17] | Hawaii | Waikiki's beach, west of the luau | bonus challenge, maybe the snorkel (Chris to decide) | bottom solid over THE CARGO SHIP's sky; east meets the luau at row 18 |
| $64 | [3,17] | Hawaii | Hanauma Bay, west of CHANNEL SURFING | bonus swim room (or close the edge instead) | top against THE CARGO SHIP's solid bottom; east meets the channel's sea |
| $65 | [1,21] | Hawaii | Lake Waiau and the cinder cones, west of THE SUMMIT | bonus challenge, coins | bottom solid over KAIHALULU's sky; east meets the summit at row 15 |
| $66 | [1,23] | Hawaii | The telescope ridge, east of THE SUMMIT | bonus challenge, coins | bottom solid over AKAKA FALLS's sky; east closed (column 24) |
| $67 | [2,26] | Andes | The glacier ridge east of the jump: a second line down | part of the longer drop | west meets JUMP FOR JOY at row 10; down through [3,26] |
| ($68, $69) | [3,26], [4,26] | Andes | The second line's drop rooms into MACHU PICCHU's open top | if the drop redesign takes them | MACHU PICCHU's top row is open |
| Rio | - | - | none (close HOUSE OF COLOUR's tower top and RIO OR BUST's end) | - | - |

## 2. Creature audit

### Monty on the Run measured the same way

The same sweep measure on Monty on the Run's 34 recipe rooms (the house, the tunnel, the stump, the boat):

| | walkers: patrol (cells) | walkers: speed (px/frame) | vertical: patrol | vertical: speed | creatures moving at 3+ px/frame |
|---|---|---|---|---|---|
| Monty on the Run | 10 | 2 (up to 4) | 8 | 2 (up to 4) | 24 of 107 |
| Do Svidaniya after Moscow | 5 | 2 (never more) | 5 | 1 (never more than 2) | 0 of 113 |

room-stats.ts's patrol lengths understate both games by half for walkers, because its sum divides by 16. These numbers are
measured sweeps. The finding is the speed: **every walker of ours moves at 2 and every vertical creature at 1**, so no room
has a fast creature among slow ones. Monty on the Run mixes 1 to 4 in most rooms (THE HOUSE $0: 2 and 3; $1: 2, 4, 2; $2: 3, 2, 2, 4).
Our patrols are also half as long. Speed is a byte of each creature's record, so it is cheap to vary.

### Per room

Kind, patrol cells @ speed (px/frame), then the share of the recorded way through the room that the creature's sweep reaches,
then the nearest its box came to Monty's on the route. The boxes are generous: n0 means they met, which the bot timed. A
creature reaching under 3% of the way is **off the way**. "walk 0@0" is a figure that never moves (a scripted actor or a
dragon's part). The recipe: three creatures, at least one a long vertical patrol across the levels he climbs, mixed speeds, on
the way. (MOSCOW's SIBERIA YOU LATER, which Chris named: walk 3@2 8% n8; walk 3@2 0% n18: one creature barely on the way, the
roof's never.)

| region | room | name | creatures: kind, patrol cells @ px/frame, % of the way its sweep covers, nearest px on the route | against the recipe |
|---|---|---|---|---|
| siberia | $9 | THE GRAVY TRAIN | walk 12@2 23% n0; up-down 4@1 22% n0 | 2 moving, no long vertical |
| siberia | $a | SLEEPER HIT | walk 8@2 24% n0; up-down 0@0 3% n64; driven 2@1 2% n0 | 2 moving, no long vertical, 1 short (≤3 cells) |
| siberia | $b | COAL COMFORT | walk 3@2 15% n0; up-down 5@1 4% n1 (+ the steam valve's blast) | 2 moving, no long vertical, 1 short (≤3 cells) |
| siberia | $d | YETI OR NOT | none | 0 moving, no long vertical |
| siberia | $e | MINE ALL MINE | up-down 13@1 8% n0; up-down 13@1 13% n0; walk 4@2 5% n0 | meets the recipe |
| siberia | $11 | BORDER LINE CASE | walk 3@2 32% n0; up-down 6@1 15% n0 | 2 moving, 1 short (≤3 cells) |
| siberia | $5f | OFF THE BEATEN PATH | walk 4@2 0% n8 | 1 moving, no long vertical, 1 off the way, one speed |
| china | $12 | ALL WALL AND NO PLAY | walk 2@2 8% n0; up-down 2@1 0% n5 | 2 moving, no long vertical, 2 short (≤3 cells), 1 off the way |
| china | $13 | BACK ALLEY BEIJING | walk 7@2 16% n0; up-down 2@1 11% n0 | 2 moving, no long vertical, 1 short (≤3 cells) |
| china | $14 | THE WATCHTOWER | walk 7@2 19% n0; up-down 2@1 3% n0; up-down 3@1 10% n0 | no long vertical, 2 short (≤3 cells) |
| china | $15 | MIND THE BATTLEMENTS | walk 8@2 0% n24; up-down 3@1 12% n0; up-down 2@1 6% n0 | no long vertical, 2 short (≤3 cells), 1 off the way |
| china | $16 | NOODLE MARKET | walk 0@0 0%; up-down 0@0 0% | 0 moving, no long vertical |
| china | $17 | THE FORBIDDEN CITY | walk 5@2 18% n0; walk 4@2 19% | 2 moving, no long vertical, one speed |
| china | $18 | THE EMPEROR'S ROOFTOPS | walk 7@2 31% n0; up-down 4@1 3% n0 | 2 moving, no long vertical |
| china | $19 | WILLOW PATTERN | walk 6@2 0% n8; walk 5@2 6% n0; walk 7@2 0% n16 | no long vertical, 2 off the way, one speed |
| china | $1a | DOWN THE RIVER | walk 4@2 0% n6; up-down 8@1 10% n23; walk 11@2 16% n0 | 1 off the way |
| china | $52 | HEAVEN CAN WAIT | none | 0 moving, no long vertical |
| china | $60 | DON'T ROCK THE BOAT | none | 0 moving, no long vertical |
| japan | $1b | THE FISH MARKET | walk 2@2 0% n24; walk 5@2 36% n0 | 2 moving, no long vertical, 1 short (≤3 cells), 1 off the way, one speed |
| japan | $1c | NEON STREET | walk 3@2 35% n0; walk 2@2 0% n64; up-down 2@1 0% n16 | no long vertical, 3 short (≤3 cells), 2 off the way |
| japan | $1d | PACHINKO PARLOUR | walk 4@2 17% n0; up-down 4@1 22% n0; walk 3@2 5% n0 | no long vertical, 1 short (≤3 cells) |
| japan | $1e | THE CROSSING | walk 8@2 0% n26; up-down 2@1 2% n0 | 2 moving, no long vertical, 1 short (≤3 cells), 2 off the way |
| japan | $1f | BULLET POINT | none | 0 moving, no long vertical |
| japan | $20 | MOUNT FUJI | none | 0 moving, no long vertical |
| japan | $21 | KOI POLLOI | up-down 7@1 5%; up-down 7@1 6%; walk 3@2 10% n0 | 1 short (≤3 cells) |
| japan | $22 | THE LAST MOLE | up-down 5@2 7% n0; walk 10@2 0% n12 | 2 moving, no long vertical, 1 off the way, one speed |
| japan | $23 | NINJA HIDEOUT | walk 3@2 12%; walk 4@2 17% n0 | 2 moving, no long vertical, 1 short (≤3 cells), one speed |
| japan | $24 | THE SHOGUN'S HALL | up-down 2@1 12% n0 | 1 moving, no long vertical, 1 short (≤3 cells), one speed |
| japan | $25 | SAYONARA SAILOR | walk 5@2 25% n0; up-down 7@1 11% n0 | 2 moving |
| japan | $61 | SHOOT FOR THE MOON | walk 9@2 13% n0 | 1 moving, no long vertical, one speed |
| japan | $62 | GONE WITH THE WIND | up-down 6@1 12% n0 | 1 moving, one speed |
| hawaii | $26 | THE CARGO SHIP | up-down 5@1 7% n0; up-down 4@1 9% n0; driven 4@1 5% n5 | no long vertical, one speed |
| hawaii | $29 | WELCOME TO HONOLULU | walk 7@2 16% n0; up-down 6@1 7% n0 | 2 moving |
| hawaii | $2a | LEI OF THE LAND | walk 2@2 17% n0; up-down 5@1 3% n0; up-down 5@1 0% n17 | no long vertical, 1 short (≤3 cells), 1 off the way |
| hawaii | $58 | DIAMOND HEAD | none | 0 moving, no long vertical |
| hawaii | $59 | THE LOOKOUT | none | 0 moving, no long vertical |
| hawaii | $2b | CHANNEL SURFING | up-down 4@1 0% n44; walk 2@2 30% n0 | 2 moving, no long vertical, 1 short (≤3 cells), 1 off the way |
| hawaii | $2d | LAND AHOY | walk 12@2 32% n1; up-down 5@1 0% n42 | 2 moving, no long vertical, 1 off the way |
| hawaii | $2e | WHALE OF A TIME | up-down 2@1 17% n0; walk 5@2 18% n0 | 2 moving, no long vertical, 1 short (≤3 cells) |
| hawaii | $2f | THE ROAD TO HANA | walk 2@2 6% n0 | 1 moving, no long vertical, 1 short (≤3 cells), one speed |
| hawaii | $30 | THE SEA CAVE | walk 15@2 28% n0; walk 7@2 15% n0 | 2 moving, no long vertical, one speed |
| hawaii | $57 | KAIHALULU | walk 2@2 18% n0 | 1 moving, no long vertical, 1 short (≤3 cells), one speed |
| hawaii | $31 | SHELL GAME | none | 0 moving, no long vertical |
| hawaii | $5a | KONA | walk 5@2 26% n0 | 1 moving, no long vertical, one speed |
| hawaii | $5b | MAUNA KEA | walk 3@2 7% n0 | 1 moving, no long vertical, 1 short (≤3 cells), one speed |
| hawaii | $5c | THE SUMMIT | walk 1@2 5% | 1 moving, no long vertical, 1 short (≤3 cells), one speed |
| hawaii | $5d | AKAKA FALLS | walk 7@2 6% n0 | 1 moving, no long vertical, one speed |
| hawaii | $34 | MAUNA LOA | up-down 5@1 5% n0 | 1 moving, no long vertical, one speed |
| hawaii | $33 | COFFEE BREAK | walk 1@2 0% n24 | 1 moving, no long vertical, 1 short (≤3 cells), 1 off the way, one speed |
| hawaii | $35 | HILO GOODBYE | walk 3@2 15% n0 | 1 moving, no long vertical, 1 short (≤3 cells), one speed |
| andes | $37 | JUMP FOR JOY | walk 0@0 0%; up-down 0@0 0% | 0 moving, no long vertical |
| andes | $38 | OUT OF THIN AIR | walk 22@2 26% n42; up-down 9@2 0% n64 | 2 moving, 1 off the way, one speed |
| andes | $39 | CONDOR COUNTRY | up-down 12@1.2 34% n0; walk 6@1.9 30% n0; walk 0@0 0% | 2 moving |
| andes | $3a | NO PROBLLAMA | up-down 5@1 18% n0; walk 1@2 13% n0; walk 5@2 22% n0 | no long vertical, 1 short (≤3 cells) |
| andes | $3b | MACHU PICCHU | walk 5@2 7% n0; up-down 5@1 7% n0 | 2 moving, no long vertical |
| andes | $53 | THE INCA BRIDGE | up-down 10@1.3 19% n0; walk 0@0 0% | 1 moving, one speed |
| andes | $3e | THE CANOPY | up-down 8@1 25% n0; up-down 11@1 24% n11 | 2 moving, one speed |
| andes | $54 | CLOUD NINE | walk 4@2 13% n0; up-down 6@1 8% n1 | 2 moving |
| andes | $3f | BRANCHING OUT | up-down 7@1 20% n0; walk 5@2 20% n0 | 2 moving |
| andes | $55 | VINE AND DANDY | walk 4@2 0% n44 | 1 moving, no long vertical, 1 off the way, one speed |
| andes | $42 | UP THE CREEK | up-down 5@1 12% n0 | 1 moving, no long vertical, one speed |
| andes | $41 | THE ROOTS | none | 0 moving, no long vertical |
| andes | $40 | THE RIVER QUEEN | walk 16@2 24% n8; walk 8@2 17% n0 | 2 moving, no long vertical, one speed |
| andes | $5e | THE RIVER ENDS | walk 1@2 10% n0; up-down 3@1 3% n0 | 2 moving, no long vertical, 2 short (≤3 cells) |
| sky | $4f | THE MAIL RUN | none | 0 moving, no long vertical |
| sky | $50 | STORMY WEATHER | none | 0 moving, no long vertical |
| sky | $51 | ON HIS TAIL | driven 9@1 - | 1 moving, no long vertical, 1 off the way, one speed |
| rio | $44 | THE LAPA ARCHES | walk 19@2 31% n0; up-down 7@1 11% n0 | 2 moving |
| rio | $47 | OPEN ARMS | up-down 12@1 4% n0; walk 3@2 7% n0 | 2 moving, 1 short (≤3 cells) |
| rio | $49 | HOUSE OF COLOUR | up-down 4@1 11% n0; up-down 10@1 0% n25; up-down 3@1 4% n0 | 1 short (≤3 cells), 1 off the way, one speed |
| rio | $4a | STEAK YOUR CLAIM | walk 3@2 0% n36; walk 7@2 65% n0 | 2 moving, no long vertical, 1 short (≤3 cells), 1 off the way, one speed |
| rio | $46 | BEAT THE DRUM | up-down 4@1 6% n2; walk 4@2 5% n0; walk 1@2 3% n0 | no long vertical, 1 short (≤3 cells) |
| rio | $4c | FLOAT YOUR BOAT | none | 0 moving, no long vertical |
| rio | $4b | SPY VERSUS MOLE | up-down 3@1 4% n0; walk 6@2 2% n0; driven 0@0 0% n0 | 2 moving, no long vertical, 1 short (≤3 cells), 1 off the way |
| rio | $4d | RIO OR BUST | walk 0@0 0%; walk 0@0 0% | 0 moving, no long vertical |

**No creatures at all:** YETI OR NOT, HEAVEN CAN WAIT, DON'T ROCK THE BOAT, BULLET POINT, MOUNT FUJI, SHELL GAME, DIAMOND HEAD,
THE LOOKOUT, THE ROOTS, FLOAT YOUR BOAT, and the flight's two first legs. Chris named most of them (HEAVEN CAN WAIT, DON'T ROCK THE
BOAT, BULLET POINT, MOUNT FUJI, SHELL GAME, DIAMOND HEAD, THE LOOKOUT).

**Worst against the recipe** (rooms with creatures; fewest on the way, short, off the way, no long vertical):

1. **ALL WALL AND NO PLAY** (China): a 2-cell walker and a 2-cell vertical creature, the vertical one never on the way.
2. **NEON STREET** (Japan): three creatures of 1 to 3 cells, two off the way.
3. **THE CROSSING** (Japan): an 8-cell walker that never comes near the way (n26), and a 2-cell vertical creature.
4. **WILLOW PATTERN** (China): three walkers, two off the way, one speed (the koi should leap: Chris).
5. **COFFEE BREAK** (Hawaii): one 1-cell creature, off the way.
6. **SPY VERSUS MOLE** (Rio): two creatures, one a 3-cell shuttle, on 2-4% of the way.
7. **OFF THE BEATEN PATH** (Siberia): one 4-cell walker, off the way (n8).
8. **MIND THE BATTLEMENTS** (China): an 8-cell walker off the way (n24), vertical creatures of 2 and 3 cells.
9. **THE LAST MOLE** (Japan): the 10-cell crane flies off the way (n12, as Chris said); one 5-cell koi.
10. **THE ROAD TO HANA, MAUNA KEA, THE SUMMIT, AKAKA FALLS, MAUNA LOA** (Hawaii): one creature each, 1 to 7 cells.
11. **VINE AND DANDY** (Andes): one creature, off the way (n44).
12. **BEAT THE DRUM, STEAK YOUR CLAIM** (Rio), **THE FISH MARKET, LEI OF THE LAND, CHANNEL SURFING**: a short or off-the-way
    creature in each (LEI's second vertical creature n17, CHANNEL SURFING's n44, STEAK's walker n36, FISH MARKET's walker n24).

Nearest the recipe: MINE ALL MINE (two 13-cell verticals), THE CANOPY (8 and 11), CONDOR COUNTRY (12, on 34% of the way),
THE RIVER QUEEN (16 and 8, both on the way), THE LAPA ARCHES (19 and 7), NO PROBLLAMA, BRANCHING OUT, PACHINKO PARLOUR. Even
these have one speed.

## 3. Colour audit

The playfield with every sprite out. **Count** is the colours covering 64+ pixels. **Main** is the colours over 8% of the
coloured area, by area. **Shared** is how many of a room's main colours its grid neighbours also use as main colours.

| | colours a room (count) | main colours | black | main colours shared with the next room |
|---|---|---|---|---|
| Monty on the Run (recipe rooms) | 7.5 | 3 | 75% | **33%** (median, room to room) |
| Do Svidaniya (every room) | 8 | 3 | 72% | **50%** (median, to each grid neighbour) |

The colour **count** is not short: Moscow 9, Hawaii 9, Rio 9.5, China and Japan 8. The low ones are Siberia (6), the Andes (5)
and the flight (3). What Chris sees is the **change from room to room**, and **which colours lead**:

- **Brown is a main colour in 41 of our 84 rooms, against 6 of Monty on the Run's 34.** Dark grey leads in 18 against 2, and
  red in 36 against 6.
- **Monty on the Run's leading colours are the ones we rarely lead with**: cyan leads in 9 of 34 rooms (ours 4 of 84),
  light green in 8 (ours 4), purple in 6 (ours 4).
- **Neighbours repeat**: the Andes' rooms share 2 or 3 of 3 to 4 main colours with each neighbour (green, brown, dark grey,
  orange throughout; JUMP FOR JOY to CONDOR COUNTRY are the same brown and white). Moscow's metro rooms are the same white,
  light blue and cyan. The train cars repeat brown, yellow and red. Hawaii's middle (WHALE OF A TIME, ROAD TO HANA, KAIHALULU)
  is brown with blues. Monty on the Run's next room usually changes its leading pair (THE HOUSE $0 red and brown, then $1 purple,
  pink and cyan, then $2 purple, green and blue, then $3 yellow and dark grey).
- The pass's colour work (LESSONS: "each room its own palette, different from its neighbours'"): pick each room's two leading
  colours so neither is a neighbour's leading pair. Lead with cyan, light green, purple and pink more, and brown, dark grey and
  red less. The Andes and Siberia first (fewest colours, most repeats), then the metro pair and the train cars.

| room | name | count | main colours (by area) | black % | main shared with grid neighbours |
|---|---|---|---|---|---|
| $0 | MOSCOW MOLE | 6 | green red brown white | 68 | $1 3/4 |
| $1 | SNOW PLACE LIKE HOME | 9 | white red brown yellow | 80 | $0 3/4, $2 2/4, $6 2/4, $7 1/4 |
| $2 | SEEING RED | 9 | red white pink | 71 | $1 2/3, $5 1/3, $3 2/3, $8 1/3 |
| $3 | ONION DOME SWEET DOME | 6 | white red yellow | 84 | $6 2/3, $4 2/3, $2 2/3 |
| $4 | KREMLIN GREMLINS | 3 | red white | 67 | $3 2/2, $5 1/2 |
| $5 | SIBERIA YOU LATER | 10 | red yellow grey | 74 | $2 1/3, $9 3/3, $4 1/3 |
| $6 | STUCK LIKE GUM | 9 | red white | 75 | $3 2/2, $1 2/2 |
| $7 | ESCALATING TENSIONS | 8 | white lblue cyan | 72 | $8 3/3, $1 1/3 |
| $8 | UNDERGROUND MOVEMENT | 9 | white lblue cyan | 70 | $7 3/3, $2 1/3 |
| $9 | THE GRAVY TRAIN | 6 | brown yellow red grey | 72 | $5 3/4, $a 4/4 |
| $a | SLEEPER HIT | 9 | red brown blue yellow grey | 65 | $9 4/5, $b 1/5, $d 1/5 |
| $b | COAL COMFORT | 9 | red dgrey green | 70 | $a 1/3, $e 0/3, $5f 1/3 |
| $d | YETI OR NOT | 5 | blue white lgrey | 74 | $a 1/3 |
| $e | MINE ALL MINE | 6 | brown | 65 | $b 1/1, $14 0/1, $11 1/1 |
| $11 | BORDER LINE CASE | 6 | brown blue white lblue | 82 | $5f 2/4, $12 1/4, $e 1/4 |
| $5f | OFF THE BEATEN PATH | 6 | brown green white | 70 | $11 2/3, $b 2/3 |
| $12 | ALL WALL AND NO PLAY | 8 | grey brown green | 65 | $11 1/3, $13 0/3, $14 1/3 |
| $13 | BACK ALLEY BEIJING | 8 | pink red orange | 75 | $12 0/3, $60 2/3, $16 3/3 |
| $14 | THE WATCHTOWER | 9 | grey orange | 72 | $e 0/2, $16 1/2, $15 1/2, $12 1/2 |
| $15 | MIND THE BATTLEMENTS | 9 | grey lgrey cyan white | 71 | $52 0/4, $14 1/4 |
| $16 | NOODLE MARKET | 8 | pink red orange | 77 | $14 1/3, $17 1/3, $52 2/3, $13 3/3 |
| $17 | THE FORBIDDEN CITY | 6 | red white | 75 | $16 1/2, $1a 1/2, $18 1/2, $60 1/2 |
| $18 | THE EMPEROR'S ROOFTOPS | 6 | red yellow orange | 76 | $52 3/3, $19 0/3, $17 1/3 |
| $19 | WILLOW PATTERN | 8 | lblue blue | 76 | $18 0/2, $1a 1/2 |
| $1a | DOWN THE RIVER | 7 | brown red blue | 82 | $17 1/3, $1b 3/3, $19 1/3 |
| $52 | HEAVEN CAN WAIT | 6 | orange red yellow | 78 | $15 0/3, $18 3/3, $16 2/3 |
| $60 | DON'T ROCK THE BOAT | 9 | red dgrey pink green | 77 | $13 2/4, $17 1/4 |
| $1b | THE FISH MARKET | 8 | blue red orange brown | 78 | $1a 3/4, $1c 1/4 |
| $1c | NEON STREET | 12 | yellow blue grey | 73 | $1b 1/3, $1e 1/3, $1d 0/3 |
| $1d | PACHINKO PARLOUR | 9 | red purple brown | 63 | $1f 0/3, $1c 0/3 |
| $1e | THE CROSSING | 12 | lblue blue purple | 80 | $1c 1/3, $21 1/3, $61 2/3, $1f 1/3 |
| $1f | BULLET POINT | 8 | lblue grey | 73 | $1d 0/2, $20 0/2, $1e 1/2 |
| $20 | MOUNT FUJI | 9 | brown blue white yellow | 76 | $1f 0/4, $25 1/4, $21 1/4, $62 2/4 |
| $21 | KOI POLLOI | 8 | green white red lblue | 73 | $1e 1/4, $24 1/4, $22 3/4, $20 1/4 |
| $22 | THE LAST MOLE | 6 | lblue green white grey | 80 | $61 2/4, $23 1/4, $21 3/4 |
| $23 | NINJA HIDEOUT | 7 | green brown red | 74 | $22 1/3, $24 1/3 |
| $24 | THE SHOGUN'S HALL | 6 | brown white | 47 | $21 1/2, $23 1/2, $25 1/2 |
| $25 | SAYONARA SAILOR | 10 | lblue red orange white | 71 | $20 1/4, $26 3/4, $24 1/4 |
| $61 | SHOOT FOR THE MOON | 7 | blue brown lblue green lgreen | 72 | $22 2/5, $1e 2/5 |
| $62 | GONE WITH THE WIND | 4 | brown white cyan | 76 | $20 2/3 |
| $26 | THE CARGO SHIP | 12 | red orange lblue | 78 | $25 3/3, $29 3/3 |
| $29 | WELCOME TO HONOLULU | 9 | yellow lblue red brown orange dgrey | 71 | $26 3/6, $2e 3/6, $2a 4/6, $2b 3/6 |
| $2a | LEI OF THE LAND | 9 | orange yellow red brown | 80 | $58 2/4, $29 4/4 |
| $58 | DIAMOND HEAD | 8 | lgrey orange lblue brown green | 80 | $2a 2/5, $59 1/5, $2e 3/5 |
| $59 | THE LOOKOUT | 8 | blue grey orange | 51 | $58 1/3 |
| $2b | CHANNEL SURFING | 9 | blue brown dgrey red | 35 | $2d 3/4, $29 3/4 |
| $2d | LAND AHOY | 11 | blue dgrey red | 37 | $2b 3/3, $30 2/3, $2e 2/3 |
| $2e | WHALE OF A TIME | 10 | brown orange red green blue | 64 | $29 3/5, $2f 2/5, $58 3/5, $2d 2/5 |
| $2f | THE ROAD TO HANA | 10 | brown lgrey lblue green | 76 | $2e 2/4, $57 2/4, $30 1/4 |
| $30 | THE SEA CAVE | 9 | blue dgrey brown | 19 | $2d 2/3, $31 2/3, $2f 1/3 |
| $57 | KAIHALULU | 10 | brown lblue | 60 | $2f 2/2, $5b 0/2, $31 1/2 |
| $31 | SHELL GAME | 10 | dgrey blue red lblue | 43 | $30 2/4, $5a 1/4, $57 1/4 |
| $5a | KONA | 11 | orange grey red yellow | 83 | $31 1/4, $35 2/4, $5b 2/4, $34 2/4 |
| $5b | MAUNA KEA | 7 | pink orange red white | 73 | $57 0/4, $5d 0/4, $5c 2/4, $5a 2/4 |
| $5c | THE SUMMIT | 5 | pink white | 78 | $5b 2/2 |
| $5d | AKAKA FALLS | 7 | brown lgreen lblue | 76 | $5b 0/3, $35 1/3 |
| $34 | MAUNA LOA | 9 | brown lgrey yellow red | 71 | $33 1/4, $5a 2/4 |
| $33 | COFFEE BREAK | 7 | brown dgrey | 45 | $34 1/2, $35 1/2 |
| $35 | HILO GOODBYE | 10 | dgrey blue orange lgreen red | 47 | $5a 2/5, $5d 1/5, $33 1/5 |
| $37 | JUMP FOR JOY | 5 | brown white grey | 75 | $38 1/3 |
| $38 | OUT OF THIN AIR | 5 | brown | 60 | $37 1/1, $39 1/1 |
| $39 | CONDOR COUNTRY | 5 | brown white | 57 | $38 1/2, $3a 1/2 |
| $3a | NO PROBLLAMA | 6 | orange brown green | 65 | $3b 3/3, $39 1/3, $54 2/3 |
| $3b | MACHU PICCHU | 7 | orange blue brown green | 54 | $3a 3/4, $53 2/4, $3e 3/4 |
| $53 | THE INCA BRIDGE | 5 | brown grey green | 77 | $3b 2/3, $3f 2/3 |
| $3e | THE CANOPY | 4 | green dgrey orange brown | 69 | $54 3/4, $3f 2/4, $3b 3/4, $42 2/4 |
| $54 | CLOUD NINE | 7 | dgrey green lgreen brown | 71 | $3e 3/4, $3a 2/4, $55 2/4 |
| $3f | BRANCHING OUT | 5 | green brown | 71 | $3e 2/2, $47 1/2, $53 2/2, $41 1/2 |
| $55 | VINE AND DANDY | 5 | green brown blue orange | 72 | $42 1/4, $54 2/4 |
| $42 | UP THE CREEK | 6 | yellow green dgrey | 71 | $55 1/3, $41 3/3, $3e 2/3 |
| $41 | THE ROOTS | 6 | yellow dgrey green blue | 71 | $42 3/4, $40 2/4, $3f 1/4 |
| $40 | THE RIVER QUEEN | 9 | white dgrey brown green | 66 | $41 2/4, $5e 3/4, $47 2/4 |
| $5e | THE RIVER ENDS | 5 | brown green dgrey | 52 | $40 3/3, $49 1/3 |
| $4f | THE MAIL RUN | 2 | blue | 84 | $50 1/1 |
| $50 | STORMY WEATHER | 4 | blue dgrey | 74 | $4f 1/2, $51 2/2 |
| $51 | ON HIS TAIL | 3 | blue dgrey | 81 | $50 2/2 |
| $44 | THE LAPA ARCHES | 7 | dgrey red grey | 68 | $49 0/3, $46 0/3, $4a 1/3 |
| $47 | OPEN ARMS | 7 | green white | 54 | $3f 1/2, $49 1/2, $40 2/2 |
| $49 | HOUSE OF COLOUR | 11 | pink green lblue | 48 | $47 1/3, $44 0/3, $5e 1/3 |
| $4a | STEAK YOUR CLAIM | 6 | red brown | 66 | $44 1/2 |
| $46 | BEAT THE DRUM | 12 | orange purple blue | 71 | $44 0/3, $4c 2/3 |
| $4c | FLOAT YOUR BOAT | 12 | orange pink blue yellow red | 73 | $46 2/5, $4b 2/5 |
| $4b | SPY VERSUS MOLE | 14 | orange purple blue | 74 | $4c 2/3, $4d 1/3 |
| $4d | RIO OR BUST | 8 | white blue lblue lgrey | 80 | $4b 1/4 |

## 4. Shared faults to fix once in the engine

| fault | where in the code | where it shows | the one fix |
|---|---|---|---|
| **Icicles only hit a player who stops** | `games/montyotr/src/icicles.ts`: arms when his box is over its column, shivers `WARN` = 24 frames, then falls. The file says so: "running straight under one is safe". | Moscow: SNOW PLACE LIKE HOME (2), ONION DOME SWEET DOME (2), KREMLIN GREMLINS (1). Siberia: YETI OR NOT (1), OFF THE BEATEN PATH (1). Hawaii: THE SEA CAVE's stalactites (2). Japan: GONE WITH THE WIND (2). | Two data options on `IcicleSpec`, chosen per icicle. `lead`: arm a few cells ahead in the way he is going, so walking on runs into the fall and the shake is the warning. `period` with a phase: drip, fall and re-form on its own clock with no trigger, staggered over the way, so a run under a row of them is a choice of moment (Chris's "fall on their own, like the crushers"). |
| **A taken pickup leaves a black box over a coloured backdrop** | The region layouts keep the item's 2 x 2 cells (and every coin's cell) out of the backdrop fill: `fillWhere`'s `keep` in `games/montyworld/src/layout.ts`, used through `horizon`, `seaOf` and `keepOf`. `Game.clearCell` then restores the backdrop behind a taken thing, and there is none, so the cell is black before and after. The engine already draws a coin over a backdrop (`drawCoinsOverBackdrop`), so the coin keeps are not needed. An item is a sprite with `priority` set (behind the background's pixels), which is probably why its cells were carved out. | Items: THE LOOKOUT (the snorkel: Chris's "black holes in the blue"), THE SEA CAVE (musubi), SHELL GAME (musubi), WHALE OF A TIME (Lahaina's find), MAUNA LOA (the moon rock and the vent), COFFEE BREAK (the coffee). Coins: every room built with a keep list (about 50 uses in pacific.ts, 2 each in andes.ts, art/japan-scenery.ts and art/siberia-sky.ts). backdrop-holes.ts passes because it compares with the room as drawn, which is already black there. | Stop keeping coin and item cells out of the fill (keep only real pieces). Draw a room's item sprite in front where its cells are backdrop (clear its priority bit there). Extend backdrop-holes.ts: no black cell under an item or coin inside a filled backdrop. |
| **Water a snorkeller can swim in still kills** | Swimming exists only in whole `swimRooms` (CHANNEL SURFING, LAND AHOY, THE SEA CAVE: `games/montyotr/src/swim.ts`). Every other water is a deadly tile (class 4), or a deadly pulse, whatever he carries. | After the snorkel (THE LOOKOUT): KAIHALULU (the surf's pulses up the sand, the cove's pool), KONA (3 cells of shallows), WHALE OF A TIME (20 cells, Lahaina's harbour), AKAKA FALLS (3, the plunge pool), SHELL GAME (38, the channel: deadly by design, so it must read as something deadly), WELCOME TO HONOLULU (10) on the way back. He still carries the snorkel in the Andes: THE RIVER QUEEN (56), UP THE CREEK (47), THE ROOTS (49), VINE AND DANDY (86), CLOUD NINE (16), THE RIVER ENDS (16); and Rio's FLOAT YOUR BOAT canal (38). | One rule in the engine: a water class (tile codes the data names as water) that is deadly without the swim gate and swum (or waded, if shallow) with it, in any room: swimMove inside a body of water, not only in whole swim rooms. A deadly thing in water is drawn as what it is (breakers, a jellyfish, coral, piranhas) on a tile of its own. **Chris's call**: whether the Amazon's rivers stay deadly (the piranhas as the reason) or become swims. |
| **Viktor's border cameos pop up beside Monty and run away** | `games/montyotr/src/cameos.ts` `walkOn` (the move is in from an edge, hold a pose, back out the same way), and the border cameos in `games/montyworld/src/viktor.ts` (`border(...)`: "goes back the way he came"). BORDER_CLEAR keeps him 10 cells off, but turning back still reads as running from Monty. | SIBERIA YOU LATER (on the Kremlin's tower top, then off), ALL WALL AND NO PLAY (Chris's note), THE FISH MARKET (Chris's note), OPEN ARMS. The same picture problem: GONE WITH THE WIND's tengu, which uses the cameo machinery and reads as Viktor (Chris). And the flight's ON HIS TAIL, where the plane appears on top of Monty: a pursuer, not a cameo. The train's and the cargo ship's chases were reworked on lane-release (merged 2026-11-27: he steps in at Monty's door, announced, and is knocked off), and ON HIS TAIL's plane is now announced as it comes into sight; the border cameos are as they were. | A cameo move that is a thwarted chase: he runs on from behind, toward Monty, and is stopped short at a barrier the cameo names (a gap, a door that shuts, a ledge, a crowd). He shakes his fist (a pose) and stays there, or fades, until Monty has gone; never a walk back the way he came. One change to `CameoMove` (a `stop` column and a `fist` pose, no `to`), then the four border specs. |
| **One roller per path where several are wanted** | `games/montyotr/src/rollers.ts`: a `RollerSpec` is one boulder on one sprite, coming round every `every` frames. Several on a path mean several specs, each with its own sprite, as MACHU PICCHU's three boulders a third of a period apart. Tunnel cars are the same: one car per `TunnelSpec`. | MOUNT FUJI (one snowball every 460 frames: Chris wants several, the Donkey Kong barrels), DIAMOND HEAD (one rock, every 420; Chris wants it dropped anyway), THE LAPA ARCHES (one stone). Tunnels: THE ROAD TO HANA's cars (one a tier, resting between runs; Chris wants constant traffic, two on a tier). | `count` and `apart` (frames) on `RollerSpec`, and on `TunnelSpec` for a lane's cars. The engine places the extra copies on the room's free sprites; budget.ts checks that the sprites are there (MOUNT FUJI has no creatures, so it has four). |

Where they stand (the mechanics job, branch pass-mechanics): icicles, `lead` and `period` on `IcicleSpec` (63cd3f6d); the black boxes, `underFinds` in
layout.ts' `room()` and a find over a backdrop drawn in front (be379195), in a colour that stands apart from it (the snorkel yellow, 6b32eed5); the border cameos, `CameoStop` (63cd3f6d), gone if Monty comes back within its `clear` (6b32eed5); several rollers, `rollerTrain` (MOUNT FUJI's
three snowballs, Machu Picchu's boulders; tunnels' `count` not done: THE ROAD TO HANA is the Hawaii job's). The water is open: every water a snorkeller meets
outside the swim rooms reaches the room's foot, so wading shallow water does not cover it; swimming in a body of water is an engine piece of its own, and the set pieces that need deadly water (the vine crossing, the canal's floats, overboard) need it drawn as what kills: each room's pick with its region job.

## Decisions for the pass (2026-11-27, Chris asleep; his to overturn)

- **The snorkel stays at THE LOOKOUT** (his own story); LEI OF THE LAND's west room ($63, Waikiki's beach) is a bonus room.
- **THE SUMMIT:** both bonus rooms ($65 Lake Waiau and the cinder cones, $66 the telescope ridge).
- **CHANNEL SURFING west: closed** by Koko Head's lava wall, not a bonus swim room (Chris: "we don't need to go overboard
  with the swimming levels"; the swim is Oahu to Maui only).
- **JUMP FOR JOY east: the second line down** ($67-$69, landing in MACHU PICCHU's open top): Chris asked twice for a longer
  parachute drop; two lines down with a coin on the harder one.
- **Everything else** as recommended above (closed for a reason of the place; HOUSE OF COLOUR's steeple taken up).
- **Water:** a snorkeller swims in any water; water that kills must show why (the Amazon's piranhas and rapids, a rip of
  white breakers, coral). Plain blue never kills him once he has the snorkel.
- **Speeds:** mix them as Monty on the Run does (1 to 4 px a frame within a room, about a quarter of creatures at 3+), and
  patrols at its lengths (walkers about 10 cells, verticals about 8).
- **Colours:** fewer brown-led rooms, more cyan, light green and purple; each room's leading colours differ from its
  neighbours'.
