# Do Svidaniya Monty: the Andes and the Amazon's room map

Region 6 (docs/dosvidaniya-plan.md). Built 2026-11-21 from the pre-production design and its art (`games/montyworld/src/art/andes-*.ts`), after it was checked against the plan's "Lessons from Chris's play" and changed
where it fell short (the "As built" section says where). Rows 0 (top) to 19, columns 0-31, as in docs/dosvidaniya-moscow.md; Monty stands on a floor row F with his body on F-2 and F-1, and a way out at a side is open at
the same rows as the way in of the next room. Every number was a starting value for the bot to check.

The region's entry is the Pacific's last room: the cargo plane's hold, whose rear door the parachute opens (columns 30-31, rows 14-15: the jump). Its exit is the east edge of the last bank, where Rio's harbour begins
(shut with a sign until Rio is built).

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points the Andes take:

- **A room crossed twice at two heights, the lanes sealed from each other** (`$04 $06 $09 $0C $0D`): the terraces (T1 and T2: the top terrace and the plateau, then the low path and the lane under them), the riverboat (the
  cargo deck under its cabin, the top deck over it, joined by one ladder).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the cave in the cloud (M: the panpipes, over a pit of mist), the hat stall's roof (V: the chullo), the Inca tunnel's shelf (X: the machete, behind a
  Mole Crusher).
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, key 1 `$14`, item 3 sees off the wasp in `$19`): the panpipes see off the spitting llama that plugs the tunnel to the well, the machete
  cuts the tangle over the forest floor's gap, the chullo is what the riverboat's captain wants.
- **A chain of items, each a dead end away from the next gate**: chullo (V), panpipes (M), machete (X), then the boat in the chullo.
- **Open shafts** (`$1D-$1F`, the jetpack): the three flight rooms, one under another. Unlike Monty on the Run's jetpack, the drop is not the end of a line: the last flight room's gap lands on the first terrace on foot.
- **Water pits and stepping stones** (`$07`): the mist pit's stone in the cave, the forest stream's logs, the piranha river's logs between the vines.
- **Loops**: T1 (top) to T2 (plateau) down the steps to the village and back up, T1's ladder down to the low path, the lane under T2 and the well (the llama's) to the Inca tunnel: the same two rooms crossed twice.

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
row 7   B THE RIVER QUEEN      P VINE AND DANDY       R THE RIVER'S END   (Rio, shut)
```

Joins (rope = a rope both ways, drop = one way down, gate = an item):

- Entry: the hold's rear door (gate: the parachute), east of it, into F1's tail ramp (rows 14-15, floor 16). F1 to F2 to F3: the open bottom of each room into the top of the next, a drop. F3's gap to T1's top terrace: a drop.
- T1-T2: two walks, high (the top terrace into the plateau, rows 4-5) and low (the low path into the lane, rows 16-17). T1: a ladder (col 4) joins its two lanes. T2-V: the steps down to the landing, out east high (rows 10-11) onto
  V's first roof, both ways. V-M: low (rows 16-17).
- T2 lane to X: the well (a floor gap in a two-cell-high tunnel), a drop onto X's rope, which climbs back (gate: the panpipes, for the llama in the tunnel's mouth). X-CF: low (rows 16-17). CF-B: a gap in the forest's floor
  under a tangle, a rope down to the boat (gate: the machete). B-P: the stern, east, low (rows 13-14, gate: the chullo, for the captain on the cargo deck). P-R: east, low (rows 13-14). R: east, the end of the region.
- Walls (no way): the flight rooms' sides, T1's west, the cave's east, the forest's and the tunnel's west and east ends but their one door, R's east (a sign: RIO COMING SOON).

**Names** (plain first, a pun where it lands, no Z, no Bond): JUMP FOR JOY, OUT OF THIN AIR, CONDOR COUNTRY, NO PROBLLAMA, ROCK AND ROLL, MARKET FORCES, MIST OPPORTUNITY, CLOUD NINE, THE INCA TUNNEL, THE RIVER QUEEN,
VINE AND DANDY, THE RIVER'S END. (The design's EAR YE EAR YE, BRIDGE TOO FAR, INCA-PACITATED and SNAPPING UP BARGAINS did not land, in Chris's sense of the plan: the puns that do are the llama, the boulders, the
market, the mist, the cloud, the vines and the boat.)

### The rooms

**F1 JUMP FOR JOY** (flight). In at the left on the plane's tail ramp (floor 16: the hold's door; the plane's tail is the wall above and below it). Off the ramp's end the canopy opens. An updraft (cols 9-11) lifts him back up
to glide to a snowy spire at the right (cols 19-24, an empanada on its tip); the cliff at the right (cols 28-31), peaks and a far range below, clouds. The bottom is open (cols 4-18 and 25-27): he sinks out of it into F2.
Coins on a line to follow. No creatures: the first flight room teaches the sink, the steering and the updraft.

**F2 OUT OF THIN AIR** (flight). The canyon: cliffs close in at each side, a ridge rises mid-room (cols 11-20, crest row 9, coins above it), an updraft each side of it (cols 5-7 and 22-24), a condor crossing at the top and
another diving in the right-hand canyon. The right canyon has a floor (it would drop him into F3's overhang): out at the bottom of the left canyon (cols 5-10).

**F3 CONDOR COUNTRY** (flight, the climax). A rock overhang hangs at the right (cols 18-29, rows 0-5) over a shelf (cols 22-27, floor 8) with an empanada; two updrafts (cols 13-15 and 19-21), a ledge at each side, two condors on
circuits (row 5 left, row 12 right). Down through the gap between the ledges (cols 8-23) onto T1's terrace.

**T1 NO PROBLLAMA** (Machu Picchu's lower terraces). The drop lands on the top terrace (floor 6) under a roof of cloud, which runs east out high into the plateau; a ladder (col 4) goes down through the wall to the low path
(floor 18), where two llamas graze and wink (Jeff Minter's) and which runs east out low into the lane. Coins on both.

**T2 ROCK AND ROLL** (Machu Picchu proper). The plateau at the left (floor 6: the temple gate and the sacred stone, Huayna Picchu behind at the right); three boulders roll off its lip down the steps (floors 8, 10) to
the landing (floor 12), the way out east high into the village. The lane under the terraces (floor 18) comes in from T1's low path: an empanada and a coin, then a low tunnel (cols 11-22, two cells high: no jumping) where the
spitting llama paces the mouth; the well (cols 19-21) is inside it, east of the llama, and falls into the Inca tunnel. East of the well the lane ends in rock.

**V MARKET FORCES** (the mountain village). In from the landing on the first roof (floor 12, a stone hut and pots); the roofs step down (floors 14, 16) to the lane (floor 18) under the market's awnings, a guinea pig pen and
stalls, which runs east out low to the cave. A ladder (col 20) from the lane goes up to the hat stall's roof (floor 9): the chullo and a coin. A guinea pig scurries on the lane.

**M MIST OPPORTUNITY** (dead end, the cave in the cloud). In low from the village; mist rises from a pit (cols 9-13) crossed on a stone in its middle; the floor climbs in three steps (floors 16, 14, 12) to a ledge at the
right where the panpipes lie. A bat overhead and a guinea pig. Out the way he came.

**CF CLOUD NINE** (the cloud forest). In from the Inca tunnel at the right (low). The ground (floor 18) runs west over a stream (stepping logs) past a jaguar to a tangle over a gap in the floor at the left (cols 4-7: the
machete cuts it; a rope hangs through to the boat); a rope (col 15) climbs from the ground to the boughs (floors 8, 13, 12) that run across above, a sloth and a toucan on them. Coins on the boughs.

**X THE INCA TUNNEL** (dead end under the terraces). In by the rope from the well (cols 19-21); a tunnel of dressed stone lit by torches, golden idols, a bat, a Mole Crusher across it west of the rope, and stairs of blocks up
the east end (floors 15, 12) to a shelf with the machete. Out west, low, into the forest.

**B THE RIVER QUEEN** (the riverboat, a side view). In by the rope from the forest on the jetty at the left (floor 16), a plank across to the cargo deck (floor 15) under the cabin; a ladder (col 7) goes up to the top deck
(floor 8: the pilot house, the funnel, a macaw, the lifebuoy, an empanada, a dead end). The captain paces the cargo deck under the cabin (a lane two cells high: no way past him) and steps aside for a local's hat. Out east at
the stern, low, past the paddle wheel.

**P VINE AND DANDY** (the piranha river). The boat runs aground. A wide brown river (the floor is water, deadly) from the stern's bank at the left (floor 15) to a mud bank at the right with an empanada; three vines hang from
the canopy and swing, two logs float between, piranhas leap and a sloth hangs under the canopy. The skill room.

**R THE RIVER'S END** (the last bank). In from the mud bank at the left (floor 15); the bank climbs a muddy stair (floors 13, 11, 9) to a high bank (floor 8) under the boughs with an empanada; an anaconda coils on the first
bank, a pool (cols 6-9) between it and the stair has a piranha and a pink river dolphin. The quay's lights glimmer beyond; the way east is shut with a sign (RIO COMING SOON).

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

**Rolling boulders (T2; `rollers`, `games/montyotr/src/rollers.ts`).** Three boulders (sprites 1, 2 and 6) on one path of the room: off the plateau's lip, along its floor, a fall of two rows at each edge, down the steps to the
wall at the right, a pixel a frame, 360 frames to a period and 120 apart, so there is always one somewhere on the steps, seen all the way from the plateau. Death on touch (as a crusher's head); a hop clears one.

**Swinging vines (P; `vines`, `games/montyotr/src/vines.ts`).** A vine is nine cells of rope tile hanging from the canopy at columns 8, 16 and 24, swinging like a pendulum (four cells out at the tip, 96 frames a swing, a
third of a swing apart), redrawn over the room's empty cells as it goes. He takes hold of one as of any rope and is carried with it while he hangs on (nothing held sideways); he lets go by jumping, and goes the way the vine
is swinging if he holds no direction. A fall into the river is deadly.

### Creatures (twelve, none in more than two rooms)

| Creature | Rooms | What it does |
|---|---|---|
| condor | F2, F3 | a circuit across the room (or a dive), wings in four frames |
| llama (winking) | T1 (two) | grazes along a terrace, one eye winks, a toothy chew; Jeff Minter's, nodded to |
| spitting llama | T2 | paces the tunnel's mouth, ears laid back; seen off by the panpipes |
| guinea pig (cuy) | V, M | scurries; round and bright, a face like a pot |
| cave bat | M, X | flaps across the cave |
| jaguar | CF | paces the forest floor, spots, a big grin |
| toucan | CF, B (the macaw: the same picture in red) | on a bough, the great beak |
| sloth | CF, P | hangs, slow, a goofy smile |
| captain | B | the riverboat's gate: paces the cargo deck, steps aside for the chullo |
| piranha | P, R | leaps from the water |
| anaconda | R | coils on the first bank |
| pink river dolphin | R | leaps in the pool |

### Costume: the chullo

The Andean knitted hat with ear flaps and a peaked crown with a tassel and a woven band, drawn in light red as its own sprite over Monty, small, above his eyes, his face showing (`art/andes-hat.ts`; `wearing` in
`art/costume.ts` puts it on all 36 of his pictures). It lets him blend in on the riverboat.

### Foods: empanadas

A half-moon pastry with a crimped edge, golden (colour 7), in place of the cupcake (200 points); six, one in each of F1, F3, T2, B, P and R. The pause screen counts them with the other regions' food as SNACKS.

### The tune

The Andean minor pentatonic on G (G Bb C D F; Hubbard's other notes move to the nearest: G# down to G, A up to Bb, B down to Bb, C# down to C, Eb down to D, E up to F, F# down to F), the lead panpipes (a triangle wave
with a short attack, a long sustain and a slow vibrato), the runs a charango (a bright short pulse of a quarter width, no sweep), the stabs, drums and bass Hubbard's. Tempo Hubbard's. In the code a `RegionTune` as the
others' (`music/andes.ts`). No folk melody is quoted.

### ENHANCED hints (one line each, 32 letters at most)

- On taking: PARACHUTE: FOLLOW THE COINS DOWN; CHULLO: BLEND IN ON THE BOAT; PANPIPES: A TUNE FOR THE LLAMA; MACHETE: CUTS THE TANGLE.
- On coming into a room without what it wants: T2: THE LLAMA WANTS A TUNE; CF: THE UNDERGROWTH WANTS A BLADE; B: THE CAPTAIN WANTS A LOCAL'S HAT.

## As built

(Filled in when the bot has played it.)
