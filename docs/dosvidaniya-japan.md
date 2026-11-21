# Do Svidaniya Monty: Japan's room map

Region 4 (docs/dosvidaniya-plan.md): designed 2026-11-21 (the study, the map, the rooms), built the same day (the rooms below are as built; "As built" says where the build
differs from the first design and why). Read with docs/dosvidaniya-moscow.md (Monty on the Run's routes, the numbers) and docs/dosvidaniya-siberia.md (the method). Rows 0 (top) to
19, columns 0-31; Monty stands on a floor row F with his body on F-2 and F-1, and a way out at a side is open at the same rows as the way in of the next room. The code is
`games/montyworld/src/japan.ts` (ids 27-37), the art in `games/montyworld/src/art/japan-*.ts` (every name starts `jp`, so it cannot clash with another region's);
`games/montyworld/test/japan-sheets.ts` draws the art and `japan-shots.ts` the rooms.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md and docs/dosvidaniya-siberia.md. The points Japan takes:

- **A room crossed twice at two heights, the lanes mostly sealed from each other** (`$04 $06 $09 $0C $0D`): the quay and the
  warehouse roof (A), the street and the rooftops (B), the crossing and its overpass (D), the platform and the underpass under it (E).
- **A four-room loop** (the loop `$01 $09 $08 $07 $06 $04` leaves its hub by a rope and comes back three rooms along): B, C, E, D:
  down B's stairs to the parlour, along the underpass to the platform, up D's subway rope to the crossing, back west along the street.
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the parlour's prize shelf (the daruma), the crossing's
  overpass (the fish food), THE LAST MOLE (the hood, the only way in is the rope in the garden's pergola), the castle roofs (sushi).
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, item 3 sees off `$19`'s wasp): the
  platform's shutter wants the daruma (found in C, the room the player reaches only after seeing the shutter), the pond's koi want the
  fish food (found in D's overpass, five rooms back), the castle's guard wants the hood (the only item a long way off the path).
- **A rope that leaves a room on the other side from where it came in** (`$05`, `$0A`): the mountain rope comes up through the garden
  floor at the left, the way on is the castle gate at the right, and the hood's rope goes up from the far bank.
- **A long rope** (`$05`, 14 rows): D's subway stairs, 13 rows down to the platform.
- **Mole Crushers** are the engine's own (the parlour's claw machine is a crusher: its head is the engine's); **water and its fish**
  are the pond and the leaping koi (as `$07`'s water pit and fish); lifts are not used here.

## Part 2: Japan

Eleven rooms (ten and the hidden one), a block 5 wide and 3 high at columns 12-16 of the exit grid (the columns below count from
Japan's first, c0). The way in is at A (row 1, beside China's junk), the way out is at J (row 2: the Pacific's first room will be at row 2 of column 17).

```
          c0                  c1                   c2                   c3                 c4
row 0     .                   .                    .                 L THE LAST MOLE    H TIERS OF JOY
row 1   A CATCH OF THE DAY   B NEON AND ON        D SCRAMBLE FOR IT  G KOI POLLOI       I SHOGUN AND ON
row 2     .                 C PARLOUR TRICKS      E BULLET POINT     F FUJI-TIVE        J SAYONARA SAILOR
```

Joins (walk both ways; rope = both ways; gate = an item): A-B walk twice (the quay, low; the warehouse roof, high). B-D walk twice
(the street, the rooftops/overpass). B-C a rope down (the stairs to the parlour). C-E a walk, low (the underpass). D-E a rope down
(the subway stairs). E (underpass) to E (platform) two ropes (the platform's stairs). E-F a walk, high, through the platform's end,
shut by a shutter (gate: the daruma). F-G a rope up. G-L a rope up (the hood's pocket). G-I a walk (the castle gate). I-H a rope up.
I-J a rope down, past the guard (gate: the hood). Walls (no way): D-G, F-J, A-C, D's east, G-H, L-H. Loops: B-C-E-D-B (four rooms), and
the two lanes of A-B, of B-D and of E.

**Names** (puns on the place, no Z, no Bond): CATCH OF THE DAY, NEON AND ON, PARLOUR TRICKS (pachinko), SCRAMBLE FOR IT (Shibuya's
crossing), BULLET POINT, FUJI-TIVE, KOI POLLOI, TIERS OF JOY (the castle's roofs), SHOGUN AND ON, SAYONARA SAILOR, and the hidden
room, exactly THE LAST MOLE.

### The rooms

Floors: "low" rooms (harbour, street, parlour, crossing, port) stand on row 17 (his body on rows 15-16: a way out at the side is open at rows 15-16), the rooftops and the overpass on
row 7 (open at rows 5-6), the platform, the mountain, the garden and the hall on row 14 (open at rows 12-13). A jump rises about 20 pixels (two rows and a bit), so every step
up is two rows; a way is open only where the opening is at least as tall as he is (a corridor two rows high is no place for a jump or a creature he must pass).

**A CATCH OF THE DAY** (the fishing harbour at dawn; the junk lands). In: left, low, on the **junk's deck** (cols 0-9: the red hull, the mast and the great battened sail standing up
the left); a 3-cell inlet of water (deadly) between the junk and the cobbled quay; the quay runs right under a covered market (a stall with a striped awning, barrels, lanterns; the Great Wave behind).
Out: right, low to B; right, high (rows 5-6, floor 7) to B's roofs. A stair of crates (floors 15, 13, 11, 9: three cells each) climbs through the market's roof (floor 7, cols 8-29), whose west end
(cols 8-12) is a dead end with a **sushi**. A crab on the quay, a sushi roll on legs trots the roof. 2 coins.

**B NEON AND ON** (Tokyo's street and its rooftops). In: left low (the street) and left high (the roof) from A; out: right low and right high to D. Shop fronts (rows 8-13, cols 6-29) seal the two lanes
from each other but for a **drainpipe** at the left (col 4, rows 7-16); two pits between the roofs (cols 11-13 and 24-26: a jump over each, two rows deep); in the street a floor gap (cols 20-22) with a
rope down (the stairs) to C. Tall neon boards stand on the roofs. A sushi roll trots the first roof, a waving lucky cat the middle one. 2 coins.

**C PARLOUR TRICKS** (a pachinko parlour; a dead end but for the way out east). In: by the stairs' rope through the ceiling (col 21); out: right, low, to E's underpass. A hall of machines (cols 15-28: lit
backs over the machines), a loud carpet, a lantern ghost floating along the ceiling, a robot and a lucky cat on the carpet. West a prize counter: a stair of steps (floors 15, 13, 11) up to the **prize shelf** (floor 9,
cols 2-6) with the **daruma**, behind the **claw machine's housing** (cols 11-14) whose Mole Crusher drops across the lane (col 12, crossed on the way in and again on the way out). 2 coins.

**D SCRAMBLE FOR IT** (the crossing). In: left low (the street) and left high (the overpass) from B. Out: the subway's rope (down to E) and back. The street (zebra stripes, traffic lights, a sumo wrestler pacing it, a
vending machine) has a subway gap (cols 22-24, rope col 23) and a pocket east of it; the **overpass** (rows 7-8, with a giant video screen and a neon board over it) runs along to the **fish food** and ends
by a rope (col 29) that comes down to the street east of the gap. A toy robot walks the overpass, a spinning umbrella bobs over the gap. 3 coins.

**E BULLET POINT** (the bullet-train platform). Two lanes: the **underpass** (low, two rows high; in from C at the left, a coin pocket at its east end) and the **platform** over it (floor 14), joined by two stairs
(ropes through the deck, cols 8-10 and 19-21). The crossing's rope (col 23) lands on the platform. The platform's east end is shut by a **roller shutter** (cols 28-29) until the daruma; open, it walks on east to F.
Two **bullet trains** sweep the platform lane in turn (below). A departure board, signal lamps, a vending machine. 2 coins (one in the underpass, one on the platform). No creatures: the trains are its danger.

**F FUJI-TIVE** (Mount Fuji's foot and slope). In: left, mid, from the platform past the shutter. The pilgrim's trail in switchbacks: the first ledge east (floor 14), two steps up (12, 10), the second ledge back west
(floor 8), one step (6) and the chain (col 5) up through the ceiling to G. Mount Fuji behind, a tea hut, a pine. A tanuki on the first ledge, a crane flying over the snow. 3 coins.

**G KOI POLLOI** (the temple garden on the mountain's shoulder). In: the chain through the floor gap at the left (cols 4-6); the bank runs right past a cherry tree in blossom, the temple hall and its bell to the **koi pond**
(cols 16-24): a plank at the bank (floor 14) and, once the koi are fed, two more that float up in a zig-zag (floors 13 and 14) with a one-cell gap between, and **two koi** leaping out of the water at the first two gaps (one rising as the other falls). The far bank has the castle gate on the right
(mid) and a **pergola** (a step and a ledge) up to a bamboo rope (col 28) through the ceiling to L. A tanuki on the temple steps, a spinning umbrella. With the fish food the koi are gone and the planks are there; without it the far bank is seven cells off. 2 coins.

**L THE LAST MOLE** (hidden: a dead end off G's pergola; a homage to The Last Ninja with nothing copied). In: the rope up through the floor (gap cols 27-29). A moonlit pond (deadly) crossed on **six stepping stones**
(2 cells each, two cells of water between, at floors 14, 13, 14, 12, 13, 14 so each is a jump up or down), a **bonsai garden** on a shelf, a **stone dragon** coiled behind and a **shrine** on its plinth (floor 14, far left) with
the **ninja hood**. A crane in the moonlight; a koi leaps out of the water between two stones. 1 coin over a gap.

**H TIERS OF JOY** (the castle's roofs, a dead end). In: the rope from I's ceiling (col 4). The keep behind; six eaves climb in a zig-zag (floors 15, 13, 11, 9, 7, 5, each overlapping the one before, so he jumps up through it),
two ninjas pacing the lower ones; the top tier has a **sushi** between golden shachi. 3 coins.

**I SHOGUN AND ON** (inside the castle: the gate hall). In: left, mid, from G's gate. Tatami floor between white plaster and black lattice walls, hanging scrolls and lanterns; **three pairs of sliding paper doors** (cols 6, 12, 18)
in the partitions; a lantern ghost floats over the second space (the spaces between the doors are four cells wide: no walker in them). Past the third door a low corridor (two rows high, cols 20-26) where the **guard** (a samurai in a great helmet) paces so that no one can pass him:
at its end a floor gap (cols 24-26) and the rope down to J. In the ninja hood the guard steps aside. A rope up at col 4 (to H). 1 coin.

**J SAYONARA SAILOR** (the port; the way out). In: the rope from I (col 25) onto the quay. A container quay (a stair of containers up to the west with a coin on the top one, a gantry crane, bollards, the Great Wave behind), a sumo dockworker
and a crab on it, and at the east the **cargo ship's hull** with a gangway step up to its deck, whose way east is shut with planks and a sign (PACIFIC COMING SOON) until the Pacific is built. 2 coins.

### Items, gates, doubling back

- **Fish food** (D's overpass: a paper sack of pellets with a fish on it): the koi in G leave the pond and the pond's other two planks float up (`removeEnemy` twice and a `place`). **Daruma** (C's prize shelf: the round red wishing doll, one eye painted): the platform's shutter in E rolls up (a `clear`).
  **Ninja hood** (L, on the shrine): the guard in I steps aside, and Monty wears the hood from then on (the costume). **Sushi** (A's roof stub, H's top tier): the bonus food, 200 points.
- **The critical path** (the shortest way out): A (the stair of crates, the roof), B (the roof, the drainpipe down), the street's stairs into C (the claw's lane twice, the daruma), the underpass to E, up a stairs, up the rope to D (the street,
  the rope to the overpass, the fish food, back down), down the subway rope to E, east along the platform past the trains (the shutter rolled up) to F (the switchbacks, the chain), G (the pond, the pergola and rope up), L (the stones, the
  hood, back the same way), G (the castle gate), I (the doors; the guard steps aside), J (the gangway). A first-time player sees the shutter before the daruma, the koi before the food, the guard before the hood: each gate is seen before the item that opens it.
- **Loops and dead ends:** one four-room loop (B, C, E, D), the lanes of A, B, D and E crossed twice, the garden's two ropes (the chain in, the pergola's rope up) and the castle's (up to H, down to J). Dead ends with items: C's prize shelf, D's overpass, A's roof stub, H's roofs, L.
  The start (A) and the way out (J) are the fixed points. Nothing needed from China or the earlier regions' items (the rice hat comes off when the hood goes on).

### The two mechanisms

**The bullet train** (E; the engine's `tunnels`, which gained a `picture`). A train 24 cells long and 6 tall (rows 8-13 on the platform lane, taller than any jump) sweeps the room, a cell every 3 frames (168 frames across the room and its own length):
a stepped nose (the front cells have no roof) and five cars of white with a row of windows and a blue band over wheels, drawn in the room's own characters (the four tiles `jpTrainBody`, `jpTrainWin`, `jpTrainBand`, `jpTrainWheel`, passable: it is a
picture, not a wall). Two trains, the up one from the right (nose left) and the down one from the left, each on a 300-frame cycle (29 frames quiet, 100 frames in which its entry edge flashes white, then the sweep), 150 frames apart. What of Monty is
in its cells when it reaches him dies (event 1, as a crusher's head); the underpass and the stairs' ropes below the deck are safe. The dash from the second stairs to the way out (80 frames) fits between trains at about one start in four.
Data: `tunnels: {room, from, code, cols, top, bottom, step, rest, warn, offset, picture}[]` (the two records of `TRAINS`, `japan.ts`). (The design drew the signal lamp flashing and the board's arrow; the flashing edge is the warning, the lamp and board are scenery.)

**Sliding paper doors** (I, three pairs; the engine's `pulses`, which gained an `offset`). A doorway 2 cells wide and 3 tall (rows 11-13): **open** for 80 frames (the pocket edge), the lattice **shakes** for 24 (the warning), **shut** over a panel's
leading edge for 8 (deadly to what is in the doorway: a crusher's head) and then a wall of paper for another 48 until the 160-frame period is round (a shut door is solid: waiting at one is safe). The doors shut 40 frames after one another from the first
(offsets 0, 120, 80: a pulse starts part way through its period), so a walker who passes the first as it opens finds the next open as he comes. The design's `shoji` record is a `pulses` record whose shut look is a wall.

**The costume** is the engine's `Costume.over` (the plan: the ushanka's way): the hood's art is `art/japan-hood.ts`; the daruma and the fish food are key items as the lamp and the ticket are.

### Creatures (12; none in more than two rooms)

Bold cartoon characters with faces, solid shapes with black-line detail, 16 x 16, eight frames (`art/japan-creatures.ts`):

| Kind | Where | Looks and moves |
|---|---|---|
| crab | A, J | red, claws raised, scuttling sideways |
| sushi roll on legs | A, B | a maki roll (rice, nori band, a tuna eye) trotting on two legs, on a roof |
| waving lucky cat | B, C | a white maneki-neko with a raised paw waving; patrols on its feet |
| toy robot | C, D | a tin robot with a key in its back, marching |
| paper-lantern ghost | C, I | a chochin with one eye, a tongue and a wobbling tail, floating |
| sumo wrestler | D, J | a big man in a loincloth with a topknot, stamping; fills his lane |
| spinning paper umbrella | D, G | a wagasa twirling on its handle |
| tanuki | F, G | the raccoon dog with a round belly, a leaf on his head and a sake bottle |
| crane | F, L | a tall white crane with a red crown, wings flapping |
| koi | G, L | an orange and white carp leaping out of the water (vertical patrol) |
| ninja | H | a black ninja with a mask and slit, leaping (a patrol): two on the castle's roofs |
| samurai guard | I | a samurai in a great helmet with a spear: the gate's guard (removed by the hood) |

A creature never patrols a lane shorter than three rows (a lane of two or three rows between a floor and a solid ceiling is shut to anyone but one jump high), so the street's sushi roll is on the roofs.

### The costume: the ninja hood

Found on the shrine in L past the stepping stones, worn from then on (his own frames with it drawn on, until the Pacific's lei): `art/japan-hood.ts` (`JAPAN_HOOD`, `hoodWorn`, `HOOD_COLOUR`),
drawn like the ushanka: a hood over his head and cheeks, a slit for the eyes (the gap shows Monty's dark face behind), the knotted tails streaming from the back of the
head. Dark blue ink. It lets him by the guard in I.

### The bonus food: sushi

Two pieces of nigiri on a wooden geta board, rice below and a slice of pink fish above with a band of nori (`jpSushi`). White rice, pink fish. 200 points as the cake; the
pause panel says SNACKS.

### The tune

Hubbard's tempo, his driver, new data (`music/japan.ts`, `music/regions.ts`). **Scale**: the Hirajoshi pentatonic on G (G A Bb D Eb: semitones 0 2 3 7 8 above the tonic, the koto's scale); every melodic note of the tune moves to the nearest degree. **Instruments**: a
shakuhachi for the theme (instruments 0 and 15: a triangle with a soft attack, a long sustain and a slow vibrato) and a koto for the runs (4 and 5: a narrow plucked pulse with a quick decay). No break: *Sakura Sakura* was not transcribed from a public score (the
brief allowed it only so), so the tune has none, as Siberia's and China's have none.

### ENHANCED hints (the place-name row's lines, 32 letters at most)

`take`: DARUMA: "WISH GRANTED: SHUTTER ROLLS UP"; FISH FOOD: "FISH FOOD: THE KOI LET YOU BY"; HOOD: "HOOD: PAST THE CASTLE GUARD".
`wanted`: E "THE SHUTTER WANTS A WISH"; G "THE KOI WANT FEEDING"; I "THE GUARD WANTS A NINJA".

### What is in `art/` and the previews

`japan-tiles.ts` (the region's tiles with their collision classes), `japan-decor.ts` (decorations: the junk's sail, the stalls, the neon signs, the pachinko banks, the Fuji, the pagoda and the keep, the cherry tree, the stone dragon, the gantry, the Great Wave...),
`japan-creatures.ts` (the twelve), `japan-items.ts` (the daruma, the fish food, the sushi, the hood as an item on its shrine), `japan-hood.ts` (the costume). Pictures: `/root/projects/runstop64-shots/japan/` (`room-*.png` from the real engine with Monty in them, `sheet.png`, `compare-*.png` beside Monty on the Run's,
`trains.png`, `doors.png`, `koi.png`, `shutter-*.png`, `guard*.png`, `hood.png`, `japan-map.png`, `art/` for tiles, decorations, creatures and the hood).

## As built (2026-11-21)

The eleven rooms are in `games/montyworld/src/japan.ts` (ids 27-37, sectors 27-37; Moscow's, Siberia's and China's are untouched), art in `art/japan-*.ts` and `art/world.ts` (the four regions' pieces as one set, the earlier regions' first so indexes never move),
the tune in `music/japan.ts`, the sprites' places in `japan-pointers.ts` (the four items take the bank's last free blocks $CD-$CF and $FE), the hats' pool in `hats.ts` (the hood takes the same blocks as the ushanka's and the rice hat's), the bot's route in `test/japan-route.ts`, the pictures in
`test/japan-shots.ts`, `japan-sheets.ts` and `japan-map.ts`. China's junk now opens east (its planks and the JAPAN COMING SOON sign are gone) onto the harbour's quay. Where the build differs from the first design:

- **Floors.** The design drew the low rooms on floor 14; they are on row 17 (rows 15-16 open at the side), because China's junk is at row 17 and a jump rises two rows, so a way out must be the height of the room that comes next. The rooftops and the overpass are on row 7, the platform, mountain, garden and hall on row 14.
- **The engine** gained, as data (Monty on the Run's value leaves them empty and plays as before: its trace and title tests pass unchanged): a `picture` on a tunnel mouth (rows of the room's characters, 0 leaving a cell as the room has it, in place of the portal: the train) and an `offset` on a pulse (frames into its period at loading). The design's `trains` and `shoji` records
  are these two existing mechanisms, not new engine modules: the bullet train is a tunnel mouth 24 cells long, the paper door a timed strike whose spent look is a wall.
- **The trains** are the four tiles `jpTrainBody`, `jpTrainWin`, `jpTrainBand`, `jpTrainWheel` in the platform's palette with the platform's four (a train is a picture of room characters: a moving decoration is not possible), so the design's `jpTrainNose` and `jpTrainCar` decorations are gone. The warning is the flashing white edge
  at the end the train comes in (100 frames); the signal lamp and the board are scenery. Each train is on a 300-frame cycle, the two 150 frames apart (so their sweeps overlap: a cell of the platform is under a train for 72 frames of each 300, twice). The dash from the second stairs to the way out is clear at about one start in four (measured: 20 of 75).
  A bot test ends a leg only under the deck (`underTheDeck`): a leg that ended on the lane could end with a train a step behind him.
- **The doors** shut 40 frames after one another in the order he meets them (offsets 0, 120, 80 in a 160-frame period); the first design's 0, 40, 80 shut them against him. A shut door is a wall.
- **The pond's gate.** With the koi as the only gate a bot crossed by timing (the koi are sprites he can jump between), so the other two planks float up when the fish food is taken, as the raft in China floats when the bamboo is; the koi leave too.
- **Joins.** The chain from F to G is at col 5 (the design had col 26), G's pergola rope at col 28 and L's floor gap at cols 27-29; the stairs' rope B-C is col 21, the subway rope D-E col 23, I-H col 4, I-J col 25 (the design's col 29: the guard's corridor is at the hall's east end and the port's quay lands him west of the ship).
  The platform's shutter is at cols 28-29 (two cells inside the room so the trains pass over it), the exit east at rows 12-13.
- **Creatures** (twelve kinds, none in more than two rooms): crab (A, J), sushi roll (A, B: the roofs; a creature never patrols a lane under three rows high, so not the street), lucky cat (B, C), robot (C, D), lantern ghost (C, I: the underpass is two rows high, so not E), sumo (D, J), umbrella (D, G), tanuki (F, G), crane (F, L), koi (G, L), ninja (H: two), samurai guard (I). (A ninja walked the hall's third space in the first build, and a bot found the four-cell space too tight to pass him: he is on the roofs only.) E has none: the trains are its danger.
  The decisions asked for a second pass on the weakest (the lantern ghost, the crane, the samurai): they were looked at beside the rooms; a redraw of the samurai (a taller crest, a masked chin) read worse than the first and was dropped, so all three are as drawn in pre-production and the samurai is the one to judge in play.
- **Rooms.** A's crate stack in the low lane was dropped (the way out is two rows high: a stack he could not jump into). J's containers climb up to the west (he arrives from the east). B's pits are two rows deep. F lost its torii (the room's decoration pool is 101 characters and Fuji is 72). The Great Wave is redrawn as a long arm of water curling over in claws of foam;
  `jpStone` joins into one slab across two cells, `jpPachinko` is a framed lit window not a checker. The doc's hint lines are 32 letters at most (the name row's width): WISH GRANTED: SHUTTER ROLLS UP, HOOD: PAST THE CASTLE GUARD.
- **Music**: the Hirajoshi pentatonic on G (G A Bb D Eb: the notes between them move to the nearest) and a shakuhachi (a triangle with vibrato) for the theme with a koto (a narrow plucked pulse) for the runs; no *Sakura* break (no public score was to hand to transcribe).
- **Saves**: the format stays 1 (the same shape; shorter coin and item lists load into the first entries, the worn item is an index).

Checks (all pass): `games/montyworld/test/japan.ts original|enhanced` (the bot plays 46 legs from China's junk to the cargo ship's gangway taking every coin and find, slow set; about 6 minutes each), `japan-mechanisms.ts` (67 checks, fast: the data, nothing drawn in a tile, the trains' timing, kills and a fair dash, the doors' timing, kills and fair walk, the three gates with their proofs, the hood as a costume and in a save, the joins both ways, the hints,
the map, a save in each room and an old save), `music-japan.ts` (9, fast); the earlier regions' tests count the whole world's totals now (38 rooms, 67 coins, 18 finds, 10 key items, 8 snacks); Moscow's, Siberia's and China's tests and all of Monty on the Run's (trace and title with /tmp/motr.prg included) pass.
Pictures: /root/projects/runstop64-shots/japan/ (room-*.png from the real engine with Monty in them, sheet.png, compare-*.png beside Monty on the Run's, trains.png, doors.png, koi.png, shutter-shut/up.png, pond-fed.png, guard.png, guard-gone.png, hood.png, japan-map.png, art/ for tiles, decorations, creatures and the hood).

**What to look at in play**: the platform's wait (does the flashing edge read as a train coming, and is the dash from the stairs fair?), the doors' rhythm in the hall, the pond (the koi, then the planks floating up), THE LAST MOLE's stones and the hood over Monty, and the rooms' fullness beside Monty on the Run's (the mountain and the street are the plainest).

## Decisions for the builder (2026-11-21)

- The 5-wide, 11-room block is fine.
- Japan's exit (room J, row 2) and the Pacific's entry must sit on the same exit-grid row; the builder of whichever comes second lines them up.
- The weakest creatures (lantern ghost, crane, samurai) get a second pass when the region is built.
- A Sakura break in the tune is allowed (the song is a traditional 19th-century folk tune, public domain); add it only if it sounds like part of Hubbard's tune, else leave it out.
