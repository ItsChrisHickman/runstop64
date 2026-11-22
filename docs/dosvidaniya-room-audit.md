# Do Svidaniya Monty: room audit against Monty on the Run

Chris: a lot of levels were two enemies to avoid and run through, fine for the pace but a missed opportunity; Monty on the Run
kept a consistent ratio of creatures and platforms to a room (the sewers aside) and it was a winning formula. This audits every
room against that ratio and proposes one unique idea for each room that needs one, without overdoing it.

Everything is measured by `games/montyworld/test/room-stats.ts` from the engine's data (`nice -n 15 node tools/test.mjs
games/montyworld/test/room-stats.ts` prints every table, including each region's full one; a report, not a check).
Method: tile classes give ledges (runs of 3+ floor cells with nothing solid on them), levels (distinct ledge rows) and rope
pieces; enemy records give a creature's kind, patrol length in cells and floor row; mechanisms are the data's lists plus
crushers and teleporters; the "one thing" is the first of: a mechanism, a hazard crossing (8+ deadly cells), an item gate (a
room effect), a vertical creature, an item stash, a climb (8+ rope cells or 5+ levels), else none. MOTR draws stairs and steps
as many small ledges, so the counts compare like with like (the same measure on both games), not against an eyeballed count.

## 1. Monty on the Run's recipe

52 original rooms. Set aside: the 9 sewer rooms (as Chris says), the 5 C5 street rooms, the 4 jetpack rooms and the ending
dock, leaving 34 recipe rooms. Median (quartiles; min to max):

| per room | MOTR recipe rooms | sewers |
|---|---|---|
| creatures | 3 (3-4; 1-4) | 4 |
| of them vertical (up-down) patrols | 2 (1-2; 0-4) | 2 |
| of them horizontal walkers | 1 (0-2; 0-3) | 1 |
| fliers in the air | 0 (0-0; 0-3) | 1 |
| ledges (3+ cells) | 8 (6-10; 1-12) | 5 |
| levels (distinct ledge rows) | 6 (5-7; 1-9) | 4 |
| ropes and ladders | 2 (1-3; 0-10) | 1 |
| coins | 1 (0-2; 0-3) | 1 |
| special items | 0 (0-1; 0-1) | 1 |
| mechanisms | 0 (0-1; 0-2) | 0 |
| solid share of the picture | 31% (25-42) | 28% |

- **Three creatures, two of them going up and down.** A vertical creature is in 32 of 34 rooms; rooms of walkers only: 0 of 34.
  Vertical patrols are long (median 8 cells, 3-19); walkers are short (median 4.5 cells); speeds are 1-2 pixels a step.
  Creatures are on different floors in 22 of 34 rooms (a walker low, the others crossing the levels above).
- **Eight ledges on six levels:** a room is a small climb, not a corridor. 31 of 34 have 3+ levels, 30 have a rope or ladder;
  about a third of the picture is solid, two thirds is air to jump through.
- **Few mechanisms:** 11 of 34 rooms (crusher 5, lift 2, teleporter 2, rising cloud 1, bollard 1; one has a crusher pair). The
  rest are carried by their creatures and their shape.
- **The "one thing"** (recipe rooms): a vertical-creature room 10, a hazard crossing 10 (water or spikes between ledges), a
  crusher 5, a lift 2, a teleporter 2, an item gate 2, the cloud 1, the bollard 1, an item stash 1. Half the rooms are
  "creatures plus climb", a third add a hazard or a machine, a few are a puzzle.
- **Sewers (set aside):** fewer ledges (median 5) and levels (4) and long ropes (median 45 rope cells), the vertical shape.

## 2. Do Svidaniya Monty, measured the same way

78 rooms; world medians against the recipe:

| | MOTR | Do Svidaniya |
|---|---|---|
| creatures | 3 | 2 |
| ledges | 8 | 5 |
| levels | 6 | 3 |
| ropes | 2 | 1 |
| coins | 1 | 3 |
| rooms with a vertical creature | 32/34 (94%) | 19/78 (24%) |
| rooms of horizontal walkers only | 0/34 | 33/78 (42%) |
| rooms with a mechanism | 11/34 (32%) | 34/78 (44%) |

Do Svidaniya has more mechanisms than MOTR (its world-tour machines) but fewer creatures, about two thirds the ledges, half the
levels, almost no vertical patrols, and two rooms in five are walkers only. Per region (medians; rooms with a vertical creature;
rooms with a mechanism):

| region | rooms | creatures | ledges | levels | vertical creature | mechanism |
|---|---|---|---|---|---|---|
| Moscow | 9 | 2 | 5 | 4 | 3 | 6 |
| Siberia | 9 | 2 | 6 | 3 | 2 | 4 |
| China | 9 | 2 | 6 | 5 | 5 | 3 |
| Japan | 11 | 2 | 5 | 3 | 4 | 3 |
| Pacific | 17 | 1 | 5 | 4 | 1 | 9 |
| Andes | 12 | 2 | 4.5 | 3.5 | 3 | 6 |
| Rio | 11 | 2 | 4 | 3 | 1 | 3 |

China is nearest the recipe (5 levels, vertical creatures in 5 of 9). The Pacific is thinnest (median one creature, one
vertical patrol in 17 rooms; its swim and tunnel rooms carry it). Rio has one vertical creature in 11 rooms and five item
stashes.

Flags: **thin** = under 3 levels or 3 ledges (MOTR's lowest tenth); **light** = one creature or none and no mechanism;
**h-only** = only horizontal walkers and no mechanism (Chris's "two walkers and run"); **bare** = h-only and nothing else
to do (no item, gate or mechanism); **repeat** = the same one thing as the room before; **none** = nothing the room is about.
Totals: thin 21, light 9, h-only 20 (6 bare), repeat 8, none 1. Thin rooms that are deliberate set pieces (a flight, the
floats, the dragon, the cable car, timed strikes) keep their machine as the room's one thing; below they get at most a small
addition. `$id` is the room id.

### Moscow
| room | creatures | ledges/levels | one thing | flags |
|---|---|---|---|---|
| $0 MOSCOW MOLE | up/down 3 | 5/5 | vertical creature | light |
| $2 SEEING RED | 2 walkers, up/down 4 | 3/2 | vertical creature | thin |
| $4 KREMLIN GREMLINS | walk 3 | 6/2 | icicle | thin, repeat |
| $5 SIBERIA YOU LATER | 2 walkers | 2/2 | climb | thin, h-only, bare |
| $8 UNDERGROUND MOVEMENT | walk 2 | 5/5 | escalator | repeat |

Not flagged: $1 and $3 (icicles), $6 (a crusher), $7 (an escalator). Runs: icicles in $1, $3, $4; escalators in $7, $8.

### Siberia
| room | creatures | ledges/levels | one thing | flags |
|---|---|---|---|---|
| $a SLEEPER HIT | walk 4 | 7/3 | train tunnels | repeat |
| $b COAL COMFORT | walk 3 | 10/6 | item stash | light, h-only |
| $10 BAIKAL TO BASICS | 2 walkers | 1/1 | cracking ice | thin |
| $11 BORDER LINE CASE | 2 walkers | 4/3 | item gate | h-only |

### China
| room | creatures | ledges/levels | one thing | flags |
|---|---|---|---|---|
| $16 NOODLE MARKET | none (the dragon) | 3/2 | dragon | thin |
| $17 THE FORBIDDEN CITY | 2 walkers | 6/5 | item gate | h-only |
| $19 WILLOW PATTERN | 2 fliers, walk 4 | 5/2 | timed strikes | thin |
| $1a DOWN THE RIVER | 3 walkers | 2/1 | hazard crossing | thin, h-only |

### Japan
| room | creatures | ledges/levels | one thing | flags |
|---|---|---|---|---|
| $1b THE FISH MARKET | 2 walkers | 7/6 | hazard crossing | h-only |
| $1c NEON STREET | 2 walkers | 8/3 | climb | h-only, bare |
| $1e THE CROSSING | 2 walkers, up/down 2 | 3/2 | vertical creature | thin |
| $1f BULLET POINT | none | 4/2 | tunnel (train) | thin |
| $22 THE LAST MOLE | up/down 5, air 5 | 2/2 | hazard crossing | thin, repeat |
| $23 THE CASTLE | 2 walkers | 7/7 | item stash | h-only |
| $24 THE SHOGUN'S HALL | walk 1, up/down 2 | 2/2 | timed strikes | thin |
| $25 SAYONARA SAILOR | 2 walkers | 6/5 | hazard crossing | h-only, bare |

### Pacific
| room | creatures | ledges/levels | one thing | flags |
|---|---|---|---|---|
| $28 PIER PRESSURE | 2 walkers | 5/3 | none | h-only, bare, none |
| $29 SURF AND TURF | 2 walkers | 4/3 | hazard (surf) | h-only |
| $2a LEI OF THE LAND | 2 fliers | 2/2 | timed strikes | thin |
| $2c MOLE-OKAI | walk 1 | 6/4 | hazard crossing | light, h-only, bare |
| $2e WHALE OF A TIME | up/down 3 | 3/3 | hazard crossing | light |
| $31 HANA BANANA | walk 2 | 4/3 | item gate | light, h-only |
| $36 HOLD YOUR HORSES | 2 walkers | 4/4 | item gate | h-only |

### Andes
| room | creatures | ledges/levels | one thing | flags |
|---|---|---|---|---|
| $37 JUMP FOR JOY | none | 1/1 | flight | thin |
| $38 OUT OF THIN AIR | air 11, up/down 11 | 1/1 | flight | thin, repeat |
| $39 CONDOR COUNTRY | 2 fliers | 3/3 | flight | repeat |
| $3a NO PROBLLAMA | 2 walkers | 7/4 | climb | h-only, bare |
| $3c MARKET FORCES | walk 2 | 5/5 | item stash | light, h-only |
| $3d MIST OPPORTUNITY | air 12, walk 2 | 5/4 | item stash | repeat |
| $3e CLOUD NINE | 3 walkers | 6/4 | hazard crossing | h-only |
| $3f THE INCA TUNNEL | air 6 | 2/2 | crusher | thin |
| $40 THE RIVER QUEEN | 2 walkers | 3/3 | hazard crossing | h-only |
| $41 VINE AND DANDY | 2 up/down, air 2 | 4/2 | vines | thin |

### Rio
| room | creatures | ledges/levels | one thing | flags |
|---|---|---|---|---|
| $44 THE LAPA ARCHES | walk 6 | 5/3 | item stash | light, h-only |
| $45 SUGAR RUSH | walk 1, air 6 | 2/2 | cable car | thin |
| $46 LOAFING ABOUT | 2 walkers | 5/3 | item stash | h-only |
| $47 OPEN ARMS | air 8 | 3/2 | item stash | thin, light, repeat |
| $4a STEAK YOUR CLAIM | 3 walkers | 3/2 | skewers | thin |
| $4c FLOAT YOUR BOAT | none | 2/1 | floats | thin |
| $4d RIO OR BUST | none | 2/2 | item stash | thin, light |

Runs of one thing: Moscow's icicles and escalators; Siberia's two train tunnels ($9, $a); Japan's hazard crossings ($21, $22);
the Andes' three flights ($37-$39) and two item stashes ($3c, $3d); Rio's item stashes ($44, $46, $47, $49).

## 3. Proposals: one idea a room

The recipe's own move is a vertical patrol over several levels, so the cheapest cure for a flat room is one vertical patrol (on
a rope, between two ledges) and one more level, and the rest are single tricks, not piles. All use what exists (creatures,
crushers, lifts, teleporters, ropes, ledges, room effects): no engine change, and each adds a level or a patrol, not length, so
the pace stays brisk. Where a room is a deliberate set piece the idea is small.

### Moscow
- **$0 MOSCOW MOLE:** the first room shows both kinds of creature: a walker on the lower floor under the up-down one, and a
  second level to climb to the coin.
- **$2 SEEING RED:** a raised tier: the GUM arcade's ledge above the walkers, a rope up from the square, the up-down creature (a
  pigeon flock) crossing between the tiers.
- **$4 KREMLIN GREMLINS:** a rope up the Spasskaya tower to a belfry ledge; the icicle timing becomes the top of the room, the
  guard walks below.
- **$5 SIBERIA YOU LATER:** a lift to the departure board: it carries Monty to a second platform with a porter's trolley (an
  up-down creature) on the rail above, in place of two walkers on two floors.
- **$8 UNDERGROUND MOVEMENT:** a crusher pair as the turnstile gate at the foot of the escalator, timed before stepping on.

### Siberia
- **$a SLEEPER HIT:** a different second tunnel: the train passes under while Monty works across the carriage roofs, up a rope
  from the track.
- **$b COAL COMFORT:** the stash guarded: a coal wagon (up-down) on a hauled track in front of the ledge with the lamp, the
  stash seen from below first.
- **$10 BAIKAL TO BASICS:** on top of the cracking ice, a fisherman's hole with a bobbing fish (an up-down hazard) between
  cracks; one rock ledge to rest on.
- **$11 BORDER LINE CASE:** a searchlight as a vertical patrol on the watchtower (time the approach), and the guard hut's roof
  as a second ledge with a coin.

### China
- **$16 NOODLE MARKET:** keep the dragon as the one thing; a rope to a stall roof with the coin above the dragon's path.
- **$17 THE FORBIDDEN CITY:** one walker becomes a lantern on a rope (an up-down patrol) between two courtyard ledges.
- **$19 WILLOW PATTERN:** keep the timed strikes; add the pagoda's eave as a level with a coin.
- **$1a DOWN THE RIVER:** a cormorant (an up-down diver) at the middle log and a rope to the junk's mast ledge; one walker out.

### Japan
- **$1b THE FISH MARKET:** one walker becomes a crab on a stall shelf above, the other stays below; a hanging fish on a rope is
  the way up.
- **$1c NEON STREET:** a neon sign (an up-down creature) scrolling on a pole between the bar's levels, with a rope up the pole.
- **$1e THE CROSSING:** barriers that drop on the road (a crusher pair) to time, the up-down creature a salaryman on a
  footbridge above.
- **$1f BULLET POINT:** a conductor walking the platform edge and a footbridge level over the track with a coin; the train
  stays the one thing.
- **$22 THE LAST MOLE:** the second hazard crossing in a row becomes the run's one vertical climb: three ledges linked by
  ropes over the water.
- **$23 THE CASTLE:** a seen-but-unreachable stash: the lantern is on a ledge you see from the first floor and reach only when
  the route returns; one walker becomes a samurai on the stairs (up-down).
- **$24 THE SHOGUN'S HALL:** the dais as a ledge above the strikes with a coin, by a rope.
- **$25 SAYONARA SAILOR:** a crane hook (an up-down creature) over the gangplank, and the cargo crates as one more ledge.

### Pacific
- **$28 PIER PRESSURE (nothing a room is about):** a timed falling hazard: a fishing net dropping over the planks, as an
  icicle does, and a ledge on the pier's lamp post.
- **$29 SURF AND TURF:** a surfer riding in and out as an up-down creature at the water's edge, one ledge on the lifeguard
  tower.
- **$2a LEI OF THE LAND:** keep the strikes; a rope to a palm ledge with a coin.
- **$2c MOLE-OKAI:** a rope up the sea cliff and a crab on the lower beach; the hazard crossing stays.
- **$2e WHALE OF A TIME:** the whale breaching as the up-down creature, a walker on the rocks, and a ledge between two hazards.
- **$31 HANA BANANA:** a monkey on a rope (an up-down patrol) guarding the banana stash; the gate stays.
- **$36 HOLD YOUR HORSES:** a three-level stack of crates with a rope and an up-down hoist chain; one walker out.

### Andes
- **$37-$39 (three flights in a row):** make $38 a ground room: a climb to a condor ledge, the llama on a high trail. Keep $37
  and $39 as the flights.
- **$3a NO PROBLLAMA:** a falling rock as a vertical patrol on the trail and a rope to the high trail.
- **$3c MARKET FORCES:** a porter carrying a pot (an up-down creature) between two awning ledges, the empanada above.
- **$3d MIST OPPORTUNITY:** the second stash in a row becomes the "aha": the item is seen across a gap and reached only from
  $3e's rope on the way back.
- **$3e CLOUD NINE:** one of the three walkers becomes a condor (an up-down patrol) between two cloud ledges.
- **$3f THE INCA TUNNEL:** the single crusher becomes a pair a few cells apart: a rhythm to learn.
- **$40 THE RIVER QUEEN:** a leaping piranha (an up-down creature) between the log ledges in place of a walker.
- **$41 VINE AND DANDY:** vines stay the room; one ledge in the middle to rest on, with a coin.

### Rio
- **$44 THE LAPA ARCHES:** a lower arch row with a samba drummer on the steps (an up-down creature) and a second rope.
- **$45 SUGAR RUSH:** a monkey (an up-down creature) on the ledge by the upper station to time before boarding.
- **$46 LOAFING ABOUT:** a twist on the stash: the loaf is seen on the first visit and opened from the other side.
- **$47 OPEN ARMS:** a wisp of cloud as an up-down patrol between the statue's arms and two ledges at different heights, the
  room's one new thing.
- **$4a STEAK YOUR CLAIM:** a raised grill ledge with a rope above the skewers.
- **$4c FLOAT YOUR BOAT:** leave it; one coin on a float's deck.
- **$4d RIO OR BUST:** leave it; the finale stays quiet: one up-down gull and two ledges at most.
