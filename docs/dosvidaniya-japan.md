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
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the platform's west end (the daruma; 2026-11-25), the crossing's
  overpass (the fish food), THE LAST MOLE (the hood, the only way in is the rope in the garden's pergola), the castle roofs (sushi).
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, item 3 sees off `$19`'s wasp): the
  platform's shutter wants the daruma (at the platform's west end, between the trains: Chris, 2026-11-25, "collect something from the left side of the middle area to open up the door on the right side"; it was the parlour's, found before the shutter was seen), the pond's koi want the
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
row 0     .                   .                    .                 L THE LAST MOLE    H THE CASTLE
row 1   A THE FISH MARKET   B NEON STREET        D THE CROSSING  G KOI POLLOI       I THE SHOGUN'S HALL
row 2     .                 C PACHINKO PARLOUR      E BULLET POINT     F MOUNT FUJI        J SAYONARA SAILOR
```

Joins (walk both ways; rope = both ways; gate = an item): A-B walk twice (the quay, low; the warehouse roof, high). B-D walk twice
(the street, the rooftops/overpass). B-C a rope down (the stairs to the parlour). C-E a walk, low (the underpass). D-E a rope down
(the subway stairs). E (underpass) to E (platform) two ropes (the platform's stairs). E-F a walk, high, through the platform's end,
shut by a shutter (gate: the daruma). F-G a rope up. G-L a rope up (the hood's pocket). G-I a walk (the castle gate). I-H a rope up.
I-J a rope down, past the guard (gate: the hood). Walls (no way): D-G, F-J, A-C, D's east, G-H, L-H. Loops: B-C-E-D-B (four rooms), and
the two lanes of A-B, of B-D and of E.

**Names** (renamed 2026-11-22, Chris approved, BULLET POINT and KOI POLLOI kept: plain first, as the place; the hall's apostrophe is written '(' in the game's lettering): THE FISH MARKET, NEON STREET, PACHINKO PARLOUR (pachinko), THE CROSSING (Shibuya's
crossing), BULLET POINT, MOUNT FUJI, KOI POLLOI, THE CASTLE (the castle's roofs), THE SHOGUN'S HALL, SAYONARA SAILOR, and the hidden
room, exactly THE LAST MOLE.

### The look (art pass 2026-11-22, Chris's notes)

- **No frames.** The outdoor rooms (the fish market, neon street, the crossing, the platform, Mount Fuji, the koi pond, the hidden garden, the castle's grounds, the port) have no ceiling band and no grey border: sky to the top (dawn, night, the mountain's sky), the ground, water, roofs and rails running off the edges. Only where an edge must block a way (D-G, F-J, L-H, G-H, the lanes between A-B-D) a solid stays, dressed as the place: a warehouse, a tower block, a rock crag, a temple wall with its tiled cap, the castle gatehouse and rampart, a stack of containers. The indoor rooms (the pachinko parlour, the shogun's hall) keep their walls, in their own colours. Where a rope climbs out of an open room a thin beam (a canopy's edge, a rock overhang, a pergola's beam, the gantry's girder) caps the rope's top so that no one jumps off it out of the room.
- **The fish market** is the junk sailing in from the left (open sea, no wall), the dawn sun and fishing boats on the horizon, the market's awnings over the stall, fish on ice in crates, gulls. **Neon street** and **the crossing** are Tokyo at night: towers with lit windows, tall neon signs, a giant screen, the crowd as coloured silhouettes, Hachiko's statue. **The pachinko parlour** is two rows of pachinko machines in four colours. **Bullet point**: the shinkansen has its long stepped nose (half a cell at a time: `jpTrainHalf`), windows, blue band and bogies; it enters at one edge and runs off the other (a 1-cell pillar at the left and the gate's gantry post at col 29 are the only things it goes behind), under the overhead wire and masts, over the yellow safety line. The gate (`SHUTTER_CELLS`) is one cell wide (col 29, rows 10-13) under a gantry post to the top. **Mount Fuji**: a cone with a flat top, snow, a 45 degree flank and a red sun; **koi polloi**: a torii, a pagoda, the cherry tree; **the castle**: a white three-tier keep with its blue-grey eaves, green lawn, brown stone, pine, hedge, banner, sky. **The shogun's hall**: paper screens, andon lamps. **The port**: containers, the gantry and the ship's bridge and funnel.
- **Creatures** (all redrawn in Monty on the Run's manner, bright inks, at most two rooms each): kappa (fish market, port), sushi roll (fish market, street), maneki-neko (street, parlour), daruma (parlour, crossing), chochin-obake (parlour, hall), sumo (port), karakasa (street, crossing), tanuki (koi pond), crane (the hidden garden), koi (koi pond, hidden garden), ninja and samurai (castle). Mount Fuji has none since it became SNOW SLIDES: the snowballs are its danger. `japan-creatures-sheet.ts` shows them beside the original's.

### The rooms

Floors: "low" rooms (harbour, street, parlour, crossing, port) stand on row 17 (his body on rows 15-16: a way out at the side is open at rows 15-16), the rooftops and the overpass on
row 7 (open at rows 5-6), the platform, the mountain, the garden and the hall on row 14 (open at rows 12-13). A jump rises about 20 pixels (two rows and a bit), so every step
up is two rows; a way is open only where the opening is at least as tall as he is (a corridor two rows high is no place for a jump or a creature he must pass).

**A THE FISH MARKET** (the fishing harbour at dawn; the junk lands). In: left, low, on the **junk's deck** (cols 0-9: the red hull, the mast and the great battened sail standing up
the left); a 3-cell inlet of water (deadly) between the junk and the cobbled quay; the quay runs right under a covered market (a stall with a striped awning, barrels, lanterns; the Great Wave behind).
Out: right, low to B; right, high (rows 5-6, floor 7) to B's roofs. A stair of crates (floors 15, 13, 11, 9: three cells each) climbs through the market's roof (floor 7, cols 8-29), whose west end
(cols 8-12) is a dead end with a **sushi**. A crab on the quay, a sushi roll on legs trots the roof. 2 coins.

**B NEON STREET** (Tokyo's street and its rooftops). In: left low (the street) and left high (the roof) from A; out: right low and right high to D. Shop fronts (rows 8-13, cols 6-29) seal the two lanes
from each other but for a **drainpipe** at the left (col 4, rows 7-16); two pits between the roofs (cols 11-13 and 24-26: a jump over each, two rows deep); in the street a floor gap (cols 20-22) with a
rope down (the stairs) to C. Tall neon boards stand on the roofs. A sushi roll trots the first roof, a waving lucky cat the middle one. 2 coins.

**C PACHINKO PARLOUR** (a pachinko parlour; a dead end but for the way out east). In: by the stairs' rope through the ceiling (col 21); out: right, low, to E's underpass. A hall of machines (cols 15-28: lit
backs over the machines), a loud carpet, a lantern ghost floating along the ceiling, a robot and a lucky cat on the carpet. West a prize counter: a stair of steps (floors 15, 13, 11) up to the **prize shelf** (floor 9,
cols 2-6) with a coin at the top of the climb (it held the daruma until 2026-11-25), behind the **claw machine's housing** (cols 11-14) whose Mole Crusher drops across the lane (col 12, crossed on the way in and again on the way out). The middle floor's coin (col 16) is past the **ball stream** (cols 17-18; it was 18-19, where stepping off the rope landed in it: Chris, 2026-11-25, the coin could only be had in one go from the rope): off the rope he stands clear of it at the floor's east end, watches the trickle and crosses in the lull. 3 coins.

**D THE CROSSING** (the crossing). In: left low (the street) and left high (the overpass) from B. Out: the subway's rope (down to E) and back. The street (zebra stripes, traffic lights, a sumo wrestler pacing it, a
vending machine) has a subway gap (cols 22-24, rope col 23) and a pocket east of it; the **overpass** (rows 7-8, with a giant video screen and a neon board over it) runs along to the **fish food** and ends
by a rope (col 29) that comes down to the street east of the gap. A toy robot walks the overpass, a spinning umbrella bobs over the gap. 3 coins.

**E BULLET POINT** (the bullet-train platform). Two lanes: the **underpass** (low, two rows high; in from C at the left, a coin pocket at its east end) and the **platform** over it (floor 14), joined by two stairs
(ropes through the deck, cols 8-10 and 19-21). The crossing's rope (col 23) lands on the platform. The platform's east end is shut by a **roller shutter** (cols 28-29) until the **daruma**, which stands at the platform's west end (by a vending machine): up the first stairs once a train has gone, along to it and back down below the deck before the next; open, it walks on east to F.
Two **bullet trains** sweep the platform lane in turn (below). A departure board, signal lamps, a vending machine. 2 coins (one in the underpass, one on the platform). No creatures: the trains are its danger.

**Next change (Chris, 2026-11-26):** "There's a floor to that room. Might be better if Monty enters on a ledge and we have no
arbitrary floor. The floor level in that room is already higher than most and as a result causes a mountain to be
claustrophobic." So MOUNT FUJI loses its full-width floor: Monty comes in on a ledge, the switchbacks and the snow slides hang
on the open mountainside with the drop below (a fall to the room's bottom is the slide's danger or leads somewhere, never a
floor drawn for no reason), and the room gains height and air. The snow slides' puzzle and the way on stay; proved with the
bots.

**And a bonus room off MOUNT FUJI, with a fair teleport (Chris, 2026-11-26):** "Could add a bonus room there too. Any Japanese
yeti equivalent? Could be a neat place to have a cave that takes Monty to the top like the MOTR teleports... We didn't want
teleports in this game as they were generally punishments for bad timing that were unclear... But if it made sense, having a
few teleports if fun would be cool." Proposed: **an ice cave at Fuji's foot** (the real Narusawa Ice Cave and Fugaku Wind Cave
are lava tubes there), icicles and frozen falls, a yuki-onna (the snow woman, Japan's snowy-mountain spirit) drifting through
it as the hazard, and at its end a **tengu** (the long-nosed mountain goblin of Japanese legend, said to whisk people away) who
carries Monty up to the summit in a gust of wind: a teleport that is a reward, seen and understood (the tengu, the gust, Monty
landing at the top), never a punishment for bad timing. The rule for any teleport in the game: visible, explained by the
place, optional or helpful, never a trap.

**Done (2026-11-26, lane-fuji):** MOUNT FUJI has no floor: in on a ledge (cols 0-8, floor 14) jutting from a spur of rock, a three-cell gap (9-11, a jump), the first ledge (12-22) over the drop with its rock tapering under it, the steps and the second ledge as before; the summit on the horizon band; below the ledges the drop runs through the room's foot (cols 2-28) into **GONE WITH THE WIND** (id 98, at [3,15] under Fuji: Japan's rows are 0-3 now): the snow heaped under the sinkhole, a hole at its west end into the lava tube, an icicle, a rock hump, the yuki-onna drifting up and down across the tube, a frozen fall hanging from the roof, a second icicle over the first coin, a mound of ice with the second, and the tengu, who flies in from the tube's east end as Monty comes down into it and beckons by the gust (Monty on the Run's teleporter beam, always open, the wind curling up either side of it): into it, and he is set down on the last step under the chain at the top of the climb (japan.ts `FUJI`, `CAVE`, `TENGU`). **Fix pass (2026-11-26):** the gust carries him up its beam in the cave (seen: `MontyData.teleportLift`) and sets him down in the foot hut on the way in, where he materialises (no longer at the top: the cave was a way round the snow slides); Fuji's own cone (snow over light blue, 45 degree flanks) stands behind the climb with the second ledge and the last step along its foot, a crag under the lower step; the cave's heap is white snow with sloped sides, the beam's top is a mouth of wind and the beam flickers in icy colours. The play height stayed: the entry ledge is pinned at floor 14 by BULLET POINT's deck. The snow slides, the huts and the coins are as they were. Its coins are last in the tables (a format 4 save reads as it is).

**F MOUNT FUJI** (Mount Fuji's foot and slope; the older plan, before the floor went). In: left, mid, from the platform past the shutter. The pilgrim's trail in switchbacks: the first ledge east (floor 14), two steps up (12, 10), the second ledge back west
(floor 8), one step (6) and the chain (col 5) up through the ceiling to G. The mountain itself is the room: a snow-capped cone on a slope of rock (blue-grey scenery, jpSnow and jpSlope) that the trail winds up in front of, scree for the foot and the frame. A tanuki on the first ledge, a crane flying over the snow. 3 coins.

**G KOI POLLOI** (the temple garden on the mountain's shoulder). In: the chain through the floor gap at the left (cols 4-6); the bank runs right past a cherry tree in blossom, the temple hall and its bell to the **koi pond**
(cols 16-24): a plank at the bank (floor 14) and, once the koi are fed, two more that float up in a zig-zag (floors 13 and 14) with a one-cell gap between, and **two koi** leaping out of the water at the first two gaps (one rising as the other falls). The far bank has the castle gate on the right
(mid) and a **pergola** (a step and a ledge) up to a bamboo rope (col 28) through the ceiling to L. A tanuki on the temple steps, a spinning umbrella. With the fish food the koi are gone and the planks are there; without it the far bank is seven cells off. 2 coins.

**L THE LAST MOLE** (hidden: a dead end off G's pergola; a homage to The Last Ninja with nothing copied). In: the rope up through the floor (gap cols 27-29). A moonlit pond (deadly) crossed on **six stepping stones** (Chris, 2026-11-25: "a little bit more skill to jump from platform to platform"): from the rope, stones at cols 25, 20, 15, 11, 8, 4 on floors 14, 12, 14, 12, 13, 14 (`MOLE_STONES`; they were 24, 20, 16, 12, 8, 4 on 14, 13, 14, 12, 13, 14); the first two jumps are three cells wide and two rows up then two down, judged from a stone's edge (no steering in the air), a koi leaping across the first (a second, across the jump down, was taken out: the room's third sprite is Viktor's shadow on the moon once the hood is taken); the second and third stones **sink** (`MOLE_SINKING`, cracks: tipped at 30 frames stood on, under at 80, back 120 later: keep moving; the koi is watched from the first stone or the bamboo rope, never from a sinking one). The bamboo rope climbs from the stones to the high ledge (split either side of it) and its coin; the bonsai shelf is reached down from the west ledge. (A swinging rope over seven cells of water was tried on 2026-11-25 and taken out: it needed the west ledge and most of the bonsai shelf cut.) A **bonsai garden** on a shelf, a **stone dragon** coiled behind and a **shrine** on its plinth (floor 14, far left) with
the **ninja hood**. A crane in the moonlight. 1 coin on the high ledge.

**H THE CASTLE** (the castle's roofs, a dead end). In: the rope from I's ceiling (col 4). The keep behind; six eaves climb in a zig-zag (floors 15, 13, 11, 9, 7, 5, each overlapping the one before, so he jumps up through it),
two ninjas pacing the lower ones; the top tier has a **sushi** between golden shachi. 3 coins.

**I THE SHOGUN'S HALL** (inside the castle: the gate hall). In: left, mid, from G's gate. Tatami floor between white plaster and black lattice walls, hanging scrolls and lanterns; **three pairs of sliding paper doors** (cols 6, 12, 18)
in the partitions; a lantern ghost floats over the second space (the spaces between the doors are four cells wide: no walker in them). Past the third door a low corridor (two rows high, cols 20-26) where the **guard** (a samurai in a great helmet) paces so that no one can pass him:
at its end a floor gap (cols 24-26) and the rope down to J. In the ninja hood the guard steps aside. A rope up at col 4 (to H), and a gallery: from the rope an eave-floor on row 8 runs through a hole in each of the first two partitions and ends over the space before the third door, where he steps off and drops to the floor (the doors are not the only way to the third; the guard still is). The lantern ghost bobs over the gallery's first bay. 1 coin, on the gallery.

**J SAYONARA SAILOR** (the port; the way out). In: the rope from I (col 25) onto the quay. A container quay (a stair of containers up to the west with a coin on the top one, a gantry crane, bollards, the Great Wave behind), a sumo dockworker
and a crab on it, and at the east the **cargo ship** moored at the quay's end (the room has five columns of it: the port's rope lands at col 25): its red hull with portholes afloat in the water, a foremast with its pennant, a gangway step up to its deck, whose way east is shut with planks and a sign (PACIFIC COMING SOON) until the Pacific is built. 2 coins.

### Items, gates, doubling back

- **Fish food** (D's overpass: a paper sack of pellets with a fish on it): the koi in G leave the pond and the pond's other two planks float up (`removeEnemy` twice and a `place`). **Daruma** (E's platform, its west end: the round red wishing doll, one eye painted): the platform's shutter in E rolls up (a `clear`).
  **Ninja hood** (L, on the shrine): the guard in I steps aside, and Monty wears the hood from then on (the costume). **Sushi** (A's roof stub, H's top tier): the bonus food, 200 points.
- **The critical path** (the shortest way out): A (the stair of crates, the roof), B (the roof, the drainpipe down), the street's stairs into C, the underpass to E, up the first stairs between two trains to the daruma and back, up a stairs, up the rope to D (the street,
  the rope to the overpass, the fish food, back down), down the subway rope to E, east along the platform past the trains (the shutter rolled up) to F (the switchbacks, the chain), G (the pond, the pergola and rope up), L (the stones, the
  hood, back the same way), G (the castle gate), I (the doors; the guard steps aside), J (the gangway). A first-time player meets the guard before the hood (the hood is behind the pond, which comes after the daruma and the food), and the shutter (E) is in sight before its daruma, at the far end of the same platform; the fish food (D) comes before the koi (G).
- **Loops and dead ends:** one four-room loop (B, C, E, D), the lanes of A, B, D and E crossed twice, the garden's two ropes (the chain in, the pergola's rope up) and the castle's (up to H, down to J). Dead ends with items: E's platform end, D's overpass, A's roof stub, H's roofs, L.
  The start (A) and the way out (J) are the fixed points. Nothing needed from China or the earlier regions' items (the rice hat comes off when the hood goes on).

### The two mechanisms

**The bullet train** (E; the engine's `tunnels`, which gained a `picture`). A train 24 cells long and 6 tall (rows 8-13 on the platform lane, taller than any jump) sweeps the room, a cell every 3 frames (168 frames across the room and its own length):
a stepped nose (the front cells have no roof) and five cars of white with a row of windows and a blue band over wheels, drawn in the room's own characters (the four tiles `jpTrainBody`, `jpTrainWin`, `jpTrainBand`, `jpTrainWheel`, passable: it is a
picture, not a wall). Two trains, the up one from the right (nose left) and the down one from the left, taking turns on a 656-frame cycle: the up train's edge flashes white for 100 frames and it sweeps (171 frames), 57 frames in which the platform is empty and no edge flashes (the quiet moment: no flash and no train means go), then the down train's flash and sweep, and another quiet 57. The first flash is 185 frames after he comes into the room. What of Monty is
in its cells when it reaches him dies (event 1, as a crusher's head); the underpass and the stairs' ropes below the deck are safe. The dash from the stairs' top at col 22 to the way out (80 frames) is clear at 106 of 164 starts across a cycle, and at every start made in the quiet (60 of 60: after it the next train is a flash and its run in away).
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
| koi | G, L | an orange carp (one ink) leaping out of the water, head up, whiskers, scales, a forked tail (vertical patrol) |
| ninja | H | a black ninja with a mask and slit, leaping (a patrol): two on the castle's roofs |
| samurai guard | I | a samurai in a great helmet with a spear: the gate's guard (removed by the hood) |

A creature never patrols a lane shorter than three rows (a lane of two or three rows between a floor and a solid ceiling is shut to anyone but one jump high), so the street's sushi roll is on the roofs.

### The costume: the ninja hood

Found on the shrine in L past the stepping stones, worn from then on (his own frames with it drawn on, until the Pacific's lei): `art/japan-hood.ts` (`JAPAN_HOOD`, `hoodWorn`, `HOOD_COLOUR`),
drawn like the ushanka: a rounded crown, a thick headband and a cowl down each side of his face, so his face shows through the slit between them. Red ink (the first build's dark blue dome covered his whole face and
vanished against Fuji). It lets him by the guard in I.

### The bonus food: sushi

Two pieces of nigiri on a wooden geta board, rice below and a slice of pink fish above with a band of nori (`jpSushi`). White rice, pink fish. 200 points as the cake; the
pause panel says SNACKS.

### The tune

Hubbard's tempo, his driver, new data (`music/japan.ts`, `music/regions.ts`). **Scale**: the Hirajoshi pentatonic on G (G A Bb D Eb: semitones 0 2 3 7 8 above the tonic, the koto's scale); every melodic note of the tune moves to the nearest degree. **Instruments**: a
shakuhachi for the theme (instruments 0 and 15: a triangle with a soft attack, a long sustain and a slow vibrato) and a koto for the runs (4 and 5: a narrow plucked pulse with a quick decay). No break: *Sakura Sakura* was not transcribed from a public score (the
brief allowed it only so), so the tune has none, as Siberia's and China's have none.

### ENHANCED hints (the place-name row's lines, 32 letters at most)

`take`: DARUMA: "DARUMA DOLLS GRANT WISHES"; FISH FOOD: "FISH FOOD: KOI FOLLOW FOOD"; HOOD: "A HOOD HIDES HIM FROM GUARDS".
`wanted`: E "THE SHUTTER OPENS FOR LUCK"; G "HUNGRY KOI CROWD THE POND"; I "THE GUARD SPOTS OUTSIDERS".

### What is in `art/` and the previews

`japan-tiles.ts` (the region's tiles with their collision classes), `japan-decor.ts` (decorations: the junk's sail, the stalls, the neon signs, the pachinko banks, the Fuji, the pagoda and the keep, the cherry tree, the stone dragon, the gantry, the Great Wave...),
`japan-creatures.ts` (the twelve), `japan-items.ts` (the daruma, the fish food, the sushi, the hood as an item on its shrine), `japan-hood.ts` (the costume). Pictures: `/root/projects/runstop64-shots/japan/` (`room-*.png` from the real engine with Monty in them, `sheet.png`, `compare-*.png` beside Monty on the Run's,
`trains.png`, `doors.png`, `koi.png`, `shutter-*.png`, `guard*.png`, `hood.png`, `japan-map.png`, `art/` for tiles, decorations, creatures and the hood).

## The v3 pass (2026-11-22, Chris played Japan)

What Chris said and what changed. Routes, room ids (27-37), the exit grid and the saves are as they were (the saves' format is still 1); the exceptions are named. The room descriptions above are of the first build; where they differ, this section is the room.

- **MOUNT FUJI** (`japan-fuji.ts`): a solid white cap (the tile `jpSnow` has no texture now) with a jagged lower edge (three one-character decorations stamped along it) and streaks of snow running down the blue slopes; the flanks' diagonal edges are one-character decorations too, so the room has five tiles and a free slot. The crane is red, no longer white on snow. The coin on the second ledge is at (12, 7) so that the edge decorations do not cover it.
- **NINJA HIDEOUT** (was THE CASTLE; id 35 and its rope up from the hall are the same): the woodland outside the shogun's walls, no white keep. A great cedar's trunk at the left, walkways of planks climbing through pines and bamboo (floors 15, 13, 11), the third the ridge of the hideout's curved-eave roof (blue tiles, an upturned lip), a lookout over it (floors 9 and 7). The hideout's door is a low corridor in the ground floor under the roof where its guard, a ninja, paces so that no one passes; **in the ninja hood he lets him by** (`removeEnemy: 0` on the hood, as the hall's guard), and at the corridor's end is the sushi. So the hood has a second use (an item used twice), and the sushi is behind it: the bot has the hood by then. A second ninja paces the ridge. Coins at (9, 13), (26, 9) and (8, 5). Hints: HOOD: THE GUARDS LET NINJAS BY (taking it), ONLY A NINJA GETS BY THE DOOR (coming in without it).
- **SAYONARA SAILOR** (`japan-port.ts`): leaving Japan at sunset: the sky in bands of colour (purple, pink, orange, yellow: one-character decorations of lines), the sea behind the quay, Mount Fuji small on the horizon and the red sun going down over it, paper lanterns on posts and Japanese flags on the quay, the cargo ship at the dock with its hull and portholes, deckhouse and funnel, and the gangway down with its rails, a plank to step on and the deck over it that walks on into the Pacific. The crane's boom over the rope's top is the one cap the room keeps (it stops a jump out of the top beside the rope). The exit east (deck, rows 11-12) is as the Pacific expects it.
- **NEON STREET** (`japan-street.ts`): Monty's first night in Tokyo off the boat. A ramen stall (awning, noren curtains, steaming bowls), vending machines and crowds in the street, towers and neon signs, and an elevated railway over the roofs: a viaduct girder and a train that passes over and over (a `tunnels` mouth with `harmless: true`: scenery that touches nothing; a new field of the engine's data, Monty on the Run's tunnels have none). A fire escape zig-zags up an alley between the shop fronts from the street to the roofs (landings two rows apart), beside the drainpipe. The lucky cat patrols the right-hand roof, the sushi roll the left.
- **PACHINKO PARLOUR** (`japan-pachinko.ts`): a row of machines in two colours with a player hunched on a stool in front of each, the steel balls falling through the pins (the glass's six characters cycle through eight pictures, `charAnims`; the second kind a few steps behind the first), the prize counter at the west (a claw machine on the shelf with the daruma). **The Mole Crusher now crushes**: the engine animates a lone shaft only if it is drawn in the first shaft's characters (`chr: 0x10`); the parlour's was `0x22`, so it never moved (Moscow's, the Andes' and the Pacific's single shafts have the same fault, left to their owners: `games/montyotr/src/mechanisms.ts` `piledriverAnimate` takes shaft 0 when a room has one). It is a column down from the ceiling with the press under it across the lane, crossed on the way in and out. No text signs in this room: the crusher's glyphs overwrite the letters P to Z of the font.
- **THE CROSSING** (`japan-crossing.ts`): Shibuya's scramble. The zebra's zone (columns 6-17) has a cycle of 480 frames: on the red man two taxis (deadly; a flash of headlamps at the edge each comes from, then the car) cross it one after the other from the two ends, then on the green man the crowd surges across in two waves from the two ends (harmless, a picture) while the signals show the green walking man; from frame 181 to the next flash at 520 the zone is clear, a 370 frame window for a 192 frame walk. The signals (a red standing man over a green walking man on a pole, drawn at both ends of the zone) are `charAnims` on the same clock. The big screen, a station's front at the right over the street's pocket with the overpass running out onto its roof to the fish food (the rope down from its end has a two cell channel beside it, so the climb is easy up and down), Hachiko's statue. The sumo left this room (it is the port's now), the daruma walks the overpass, the karakasa hovers over the subway's gap.
- **THE SHOGUN'S HALL**: the gallery's coin was in the hole through the second partition (a three row hole: the bot's frame-perfect jump took it, a person could not). It is on the gallery between the first two partitions at (8, 6), where a walker takes it. A fairness check (below) now holds every pickup to a person's inputs.
- **The creatures**: the sumo (yellow, a wrestler as wide as the sprite), the koi (a carp from the side as Monty on the Run's fish are, in light red), the ninja (a big masked head with its slit of lit eyes, headband tails flying, a sword over his shoulder) and the samurai (a horned helmet over a fierce lit face) are redrawn in `japan-bold.ts`; the crane is red. `japan-creatures.ts` uses the shared `lay` and `pair` of `creature-kit.ts` now.
- **Contrast**: `creature-contrast.ts` runs every creature of every room for 900 frames and checks that no cell it sweeps that has something drawn in it is the creature's own colour. Japan's rooms pass; other regions' rooms that failed when it was written (Moscow, Siberia, the Pacific, the Andes, Rio) are listed in the test's `PENDING` to be emptied by their owners.
- **Fairness**: `japan-fair.ts` plays the route and, before each pickup (every coin, both sushi, the daruma, the fish food, the hood), searches its leg again from three starts a few frames and pixels off the bot's own (after waiting 5 frames; nudged a pixel or two left; nudged a few pixels right); every one must still find a way.
- **Engine**: `TunnelSpec.harmless` (a picture that kills nothing); and a tunnel with a `span` no longer kills where it is not drawn (it did, in the lead-in columns off its span: a taxi's invisible nose killed a mole standing at the zone's edge; the Pacific's bridge cars share the fix). The bot's search key leaves harmless mouths out.

## As built (2026-11-21)

The eleven rooms are in `games/montyworld/src/japan.ts` (ids 27-37, sectors 27-37; Moscow's, Siberia's and China's are untouched), art in `art/japan-*.ts` and `art/world.ts` (the four regions' pieces as one set, the earlier regions' first so indexes never move),
the tune in `music/japan.ts`, the sprites' places in `japan-pointers.ts` (the four items take the bank's last free blocks $CD-$CF and $FE), the hats' pool in `hats.ts` (the hood takes the same blocks as the ushanka's and the rice hat's), the bot's route in `test/japan-route.ts`, the pictures in
`test/japan-shots.ts`, `japan-sheets.ts` and `japan-map.ts`. China's junk now opens east (its planks and the JAPAN COMING SOON sign are gone) onto the harbour's quay. Where the build differs from the first design:

- **Floors.** The design drew the low rooms on floor 14; they are on row 17 (rows 15-16 open at the side), because China's junk is at row 17 and a jump rises two rows, so a way out must be the height of the room that comes next. The rooftops and the overpass are on row 7, the platform, mountain, garden and hall on row 14.
- **The engine** gained, as data (Monty on the Run's value leaves them empty and plays as before: its trace and title tests pass unchanged): a `picture` on a tunnel mouth (rows of the room's characters, 0 leaving a cell as the room has it, in place of the portal: the train) and an `offset` on a pulse (frames into its period at loading). The design's `trains` and `shoji` records
  are these two existing mechanisms, not new engine modules: the bullet train is a tunnel mouth 24 cells long, the paper door a timed strike whose spent look is a wall.
- **The trains** are the four tiles `jpTrainBody`, `jpTrainWin`, `jpTrainBand`, `jpTrainWheel` in the platform's palette with the platform's four (a train is a picture of room characters: a moving decoration is not possible), so the design's `jpTrainNose` and `jpTrainCar` decorations are gone. The warning is the flashing white edge
  at the end the train comes in (100 frames); the signal lamp and the board are scenery. The trains take turns on a 656-frame cycle (a flash of 100 frames and a sweep of 171 each, 57 quiet frames after each, the second train 328 frames after the first, the first flash 185 frames after he comes in), so the flash can mean `a train is coming from that end` and no flash with an empty platform means go. (The first build had the trains overlapping, with a flash or a train at every frame: no moment to read.) The dash from the stairs' top (col 22) to the way out is clear at 106 of 164 starts across a cycle and at all 60 made in the quiet. A train goes into the tiled wall at each end as into a tunnel (it is not drawn over a wall), and only the cells it is drawn in kill.
  A bot test ends a leg only under the deck (`underTheDeck`): a leg that ended on the lane could end with a train a step behind him.
- **The doors** shut 40 frames after one another in the order he meets them (offsets 0, 120, 80 in a 160-frame period); the first design's 0, 40, 80 shut them against him. A shut door is a wall.
- **The pond's gate.** With the koi as the only gate a bot crossed by timing (the koi are sprites he can jump between), so the other two planks float up when the fish food is taken, as the raft in China floats when the bamboo is; the koi leave too.
- **Joins.** The chain from F to G is at col 5 (the design had col 26), G's pergola rope at col 28 and L's floor gap at cols 27-29; the stairs' rope B-C is col 21, the subway rope D-E col 23, I-H col 4, I-J col 25 (the design's col 29: the guard's corridor is at the hall's east end and the port's quay lands him west of the ship).
  The platform's shutter is at cols 28-29 (two cells inside the room so the trains pass over it), the exit east at rows 12-13.
- **Creatures** (twelve kinds, none in more than two rooms): crab (A, J), sushi roll (A, B: the roofs; a creature never patrols a lane under three rows high, so not the street), lucky cat (B, C), robot (C, D), lantern ghost (C, I: the underpass is two rows high, so not E), sumo (D, J), umbrella (D, G), tanuki (F, G), crane (F, L), koi (G, L), ninja (H: two), samurai guard (I). (A ninja walked the hall's third space in the first build, and a bot found the four-cell space too tight to pass him: he is on the roofs only.) E has none: the trains are its danger.
  The decisions asked for a second pass on the weakest (the lantern ghost, the crane, the samurai): they were looked at beside the rooms; a redraw of the samurai (a taller crest, a masked chin) read worse than the first and was dropped, so all three are as drawn in pre-production and the samurai is the one to judge in play.
- **Rooms.** A's crate stack in the low lane was dropped (the way out is two rows high: a stack he could not jump into). J's containers climb up to the west (he arrives from the east). B's pits are two rows deep. F lost its torii (the room's decoration pool is 101 characters and Fuji is 72). The Great Wave is redrawn as a long arm of water curling over in claws of foam;
  `jpStone` joins into one slab across two cells, `jpPachinko` is a framed lit window not a checker. The doc's hint lines are 32 letters at most (the name row's width): DARUMA DOLLS GRANT WISHES, A HOOD HIDES HIM FROM GUARDS.
- **Music**: the Hirajoshi pentatonic on G (G A Bb D Eb: the notes between them move to the nearest) and a shakuhachi (a triangle with vibrato) for the theme with a koto (a narrow plucked pulse) for the runs; no *Sakura* break (no public score was to hand to transcribe).
- **Saves**: the format stays 1 (the same shape; shorter coin and item lists load into the first entries, the worn item is an index).

Checks (all pass): `games/montyworld/test/japan.ts original|enhanced` (the bot plays 47 legs from China's junk to the cargo ship's gangway taking every coin and find, slow set; about 6 minutes each), `japan-mechanisms.ts` (74 checks, fast: the data, nothing drawn in a tile, the trains' timing, kills and a fair dash, the doors' timing, kills and fair walk, the three gates with their proofs, the hood as a costume and in a save, the joins both ways, the hints,
the map, a save in each room and an old save), `music-japan.ts` (9, fast); the earlier regions' tests count the whole world's totals now (38 rooms, 67 coins, 18 finds, 10 key items, 8 snacks); Moscow's, Siberia's and China's tests and all of Monty on the Run's (trace and title with /tmp/motr.prg included) pass.
Pictures: /root/projects/runstop64-shots/japan/ (room-*.png from the real engine with Monty in them, sheet.png, compare-*.png beside Monty on the Run's, trains.png, doors.png, koi.png, shutter-shut/up.png, pond-fed.png, guard.png, guard-gone.png, hood.png, japan-map.png, art/ for tiles, decorations, creatures and the hood).

**What to look at in play**: the platform's wait (does the flashing edge read as a train coming, and is the dash from the stairs fair?), the doors' rhythm in the hall, the pond (the koi, then the planks floating up), THE LAST MOLE's stones and the hood over Monty, and the rooms' fullness beside Monty on the Run's (the mountain and the street are the plainest).

**Update (the Pacific, 2026-11-21):** the port's way east is open now: the crates across the ship's deck and the PACIFIC COMING SOON sign are gone, and the deck walks on into the cargo ship's stern (docs/dosvidaniya-pacific.md).

## Decisions for the builder (2026-11-21)

- The 5-wide, 11-room block is fine.
- Japan's exit (room J, row 2) and the Pacific's entry must sit on the same exit-grid row; the builder of whichever comes second lines them up.
- The weakest creatures (lantern ghost, crane, samurai) get a second pass when the region is built.
- A Sakura break in the tune is allowed (the song is a traditional 19th-century folk tune, public domain); add it only if it sounds like part of Hubbard's tune, else leave it out.

## Playtest 2026-11-22: the hideout is the way on

Chris on the ninja hideout: the blue band and the gap on the right were unclear, the room "a missed opportunity", and "totally optional". Now:

- **The way to the port runs through the hideout's door.** The hall's far end is walled (past the third door a three-cell space under the low ceiling, nothing more); its rope at the left goes up to the hideout, whose door guard (a ninja, gone in the hood) holds the corridor; past him the corridor's floor has a gap (cols 24-26, a rope down it) that drops down a shaft through the hall (cols 24-26, rope at 25) to the port's rope. The sushi lies beyond the gap at the corridor's end (cols 27-29). The hall's own guard and its hint (THE GUARD SPOTS OUTSIDERS) are gone: the hood has one gate, the hideout's door (THE DOOR IS FOR NINJAS ONLY). The hood is still found before the gate, in THE LAST MOLE off the garden.
- **The set piece: rotten boards.** The lookout's boards (row 9, cols 12-16) crack after 16 frames under his feet, split after 34, go at 46 (`HIDEOUT_CRACKS`): a steady walk is safe, a stop is a fall. The coin is guarded by the boards, not by an item.
- **Everything reads.** The roof is red tiles under a yellow ridge and lip (nothing blue), closed to the screen's edge; the gap that invited is gone (the right side is the pine and the roof).
- The castle samurai moved from the hall to pace the hideout's ridge (a creature kind keeps at least one room); the second walker there is no longer a ninja.
- The route's legs: the hall's doors and gallery first, then the rope up, the hideout's three coins and the sushi, down the corridor's gap and the shaft to the port.

## Playtest 2026-11-23: the paper doors are on the way again

Chris: "the three paper doors in Japan are a very cool thing. I don't want to lose those." The hideout change had left the hall's rope up at its west end, so the doors led only to the walled space past the third. Now the doors are the way into the hideout:

- **The hall's route.** In from the garden's gate, east along the floor through the three doors (their timing as before: offsets 0, 120, 80, a walker meets each open). Past the third, in the space the low ceiling used to cover (cols 20-22), a rope (col 21, in a gap of three in the gallery's floor) climbs to the gallery, which now runs west from there along the eaves through a hole in each of the three partitions (the coin on it, the lantern ghost over its first bay) to the rope at the left (col 4) up to the hideout. That rope's foot hangs at the gallery (row 8), out of reach of the floor: with the doors held shut the bot finds no way onto a rope or the gallery (`japan-mechanisms.ts`, exhaustive).
- **The rest is as the hideout pass left it**: the hideout's door guard (the hood) is the hood's one gate, its corridor gap and the shaft down the walled east of the hall to the port, the red tiled roof, the rotten lookout boards. The Pacific's join is untouched.
- **The way back** from the hideout: down its left rope onto the gallery, east to the rope past the third door, down it and west through the doors to the garden (or drop off the gallery's west end to the floor).
- The route's legs: the three doors, the rope past the third, the gallery west to its coin, on west and up to the hideout, then the hideout's legs as before.

## Chris's playtest notes (2026-11-26)

- **BULLET POINT:** "also needs to be harder. The train is too easy to not encounter." The bullet train must be the room's
  test: Monty's way on runs along the platform's edge or the track where the train sweeps, so he has to cross its lane on
  its timing (read from the warning), not wait somewhere it never reaches. Fair: the warning and a safe spot to read it from.
  (Part of the challenge pass; Japan's other rooms measured against Monty on the Run too: docs/dosvidaniya-siberia.md,
  "Why Monty on the Run is hard".)
- **MOUNT FUJI:** "I love the Donkey Kong feel, but it needs more snowballs at a time to be challenging." Today one
  snowball every 460 frames (FUJI_SNOW). Several on the slope at once, spaced so the climb is a run between them (the
  barrels of Donkey Kong): a shorter period and more than one roller on the path (each a sprite: find the free ones, the
  room has no creatures), still with the huts as the safe spots to read the timing from.
- **GONE WITH THE WIND's tengu:** "Why is Viktor in GONE WITH THE WIND; is that him?! It's confusing and makes no sense."
  The tengu (a one-colour dark red figure with a long snout, flying in and standing as Viktor's cameos do) reads as
  Viktor. Make it unmistakably a tengu: a multicolour sprite with the red face and long nose, white hair, wings spread
  (a crow tengu's), the feather fan, a small black cap; it hovers in the gust flapping and fanning the wind (it is the
  wind's maker), never runs in along the floor as Viktor does. If it still could be read as Viktor, drop the figure and
  let the gust and its swirls carry the idea.
- **GONE WITH THE WIND:** "also too easy." The cave's challenge must be real: the yuki-onna's drift crossing the tube where
  he has to pass, the icicles timed over the way, more ice to judge (a slippery run, a jump over a chasm in the tube), its
  coins at the hard end; still a fair bonus room.
- **THE LAST MOLE:** "The flying enemy isn't positioned in a place that he poses a threat." The crane's flight must cross
  Monty's way over the stepping stones (low enough to clip a jump between stones, on a timing he reads), alongside the two
  koi (the release polish job adds the second).
- **SHOOT FOR THE MOON** (bonus room): "There is no challenge." A bonus room is where new challenges are tried (LESSONS:
  "An edge that runs off into nothing gets a bonus room"): give it one, built from the room's own idea, with its coins at
  the hard end.
- **THE NINJA HIDEOUT:** "no challenge. Should have much more interesting enemy patterns." And on the whole game: "most
  enemies just move left and right or up and down... Is MOTR really that simple?" Monty on the Run's creatures are that
  simple (up-and-down and left-right patrols, a few fliers); its challenge comes from long patrols at varied speeds placed
  across the only way on, three to a room, in combination. We keep that as the base and add pattern where a room's idea
  calls for it, with what the engine already has: path movers (paths.ts: closed splines and polylines, as the dragon and
  the boulders), leaping arcs (the piranhas), drops (icicles), timed strikes. For the hideout: ninjas that drop from the
  rafters on a line and climb back, one that leaps between beams in an arc, a shuriken thrown along a path across the way,
  all readable and fair. Other rooms where a pattern fits get one in the challenge pass (WILLOW PATTERN's leaping koi, the
  crane's swoop at THE LAST MOLE). The C64 limit stands: sprites per room as budget.ts allows.
- **SHOGUN'S HALL and SAYONARA SAILOR are good** (Chris: "both actually pretty good. Sayonara Sailor has two enemies that
  you have to time your jump between. Although it'd be nice if there was a third enemy too. That's the thing with Monty on
  the Run, there's usually more than one puzzle per room involving enemies and jumps."): keep both as models; SAYONARA
  SAILOR gets a third creature making a second puzzle elsewhere in the room (not crowding the first jump). The rule for
  every room: more than one puzzle of creatures and jumps.
