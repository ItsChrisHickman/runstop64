# Do Svidaniya Monty: Japan's room map

Region 4 (docs/dosvidaniya-plan.md). Pre-production: design and art as data, no engine or room code. Read with
docs/dosvidaniya-moscow.md (Monty on the Run's routes, the numbers) and docs/dosvidaniya-siberia.md (the method). Rows 0 (top) to
19, columns 0-31; Monty stands on a floor row F with his body on F-2 and F-1, and a way out at a side is open at the same rows as
the way in of the next room ("high" rows 2-6 with the floor at 7, "mid" 7-11, "low" 12-17). Numbers are targets for the builder; the bot
checks the real thing. The art is in `games/montyworld/src/art/japan-*.ts` (every name starts `jp`, so it cannot clash with another
region's); `games/montyworld/test/japan-sheets.ts` and `japan-rooms.ts` draw it.

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

Eleven rooms (ten and the hidden one), a block 5 wide and 3 high. Its columns follow China's last; the columns below count from
Japan's first (c0). The way in is at A (row 1, as Siberia's A), the way out is at J (row 2, as Siberia's G); the builder moves the
block's rows to meet China's end and the Pacific's start, the shape inside it stays.

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

**A CATCH OF THE DAY** (the fishing harbour at dawn; the junk lands). In: left, low (rows 11-13, floor 14), on the **junk**
(cols 0-9: drawn from the side as the Chinese junk it is, red hull with its stern castle and its eye, the mast and the great
battened sail standing up the left of the picture, a plank gangway down to the quay; the water under its hull and in the gap before the quay).
The quay (floor 14) runs right, cobbled, with the dawn market on it: tuna on ice, a fish stall with a striped awning (cols 18-21),
crates, nets, bollards, a lantern. The Great Wave on the far side of the harbour behind it. Out: right, low (floor 14) to B; right, high (rows 4-6,
floor 7) to B's roof lane. Crates step up (cols 12-16: rows 12, 10, 8) onto the **warehouse roof** (floor 7, cols 10-31, a kawara roof): a
stub westwards (cols 10-12) ends in a **sushi** (a dead end), the roof east is the high way. Water below the junk and the gap
(deadly). Creatures: crab (the quay), sushi roll on legs (the market). 2 coins.

**B NEON AND ON** (Tokyo, the street and the rooftops). In: left low (floor 14) from A's quay; left high (floor 7) from A's roof. Out:
right low (floor 14) to D's street; right high (floor 7) to D's overpass. The street runs between shop fronts hung with **neon
signs** (vertical signboards, ramen bowls with steam, a vending machine glowing on the kerb); a **stairs down** (a floor gap cols
20-22 with a bamboo rope down) to C. Above, the **rooftops** (floor 7: kawara roofs of the shops, with the neon boards standing on them) with two jumps between
(gaps at cols 11-13 and 24-26). The lanes are sealed by solid shop fronts (rows 8-13, cols 6-31) but for a **drainpipe** (a rope, col
4, rows 8-13) at the left end: they join once, so the room is crossed twice at two heights. Creatures: a sushi roll on the street, a
waving lucky cat on a shop awning (the roofs). 2 coins.

**C PARLOUR TRICKS** (a pachinko parlour, row 2). In: the ceiling gap (cols 20-22), the rope from B's stairs, landing on the carpet
(floor 17). Out: right, low (rows 15-16, floor 17) to E's underpass. A long hall of **machine banks** (cols 3-12 and 15-30: pachinko
machines with their lights, silver balls trickling), a stool, a coin pusher; the carpet is purple and loud. At the west end the
**prize counter** steps up (rows 14, 11) to the **prize shelf** (floor 8, cols 0-5) with the **daruma**; a **claw machine's
claw** (the engine's Mole Crusher: its shaft cols 8-10) drops across the hall's west lane before the counter, crossed on the way
in and the way out (as Moscow's F). Creatures: a lucky cat on the counter, a toy robot marching the carpet, a paper-lantern ghost
(it floats along the ceiling). 2 coins.

**D SCRAMBLE FOR IT** (the crossing). In: left low and left high, from B. Out: only the subway rope (and back). The **crossing** (floor 14, cols 0-31):
zebra stripes across the road in the middle, traffic lights, a crowd; a subway entrance (floor gap cols 22-24, the rope down
13 rows to E's platform). The **overpass** (floor 7, rows 4-6 open) above it carries a giant video screen
and a billboard, runs right to a pocket that holds the **fish food**, and a rope at the right end (col 29, rows 8-13) comes down to the
street east of the subway gap (the lanes join at the east end). Creatures: a sumo wrestler pacing the street (the crowd that will not
make way, 8 columns), a toy robot on the overpass, a spinning paper umbrella over the stairs' gap. 3 coins.

**E BULLET POINT** (the bullet-train platform, row 2). Two lanes: the **underpass** (low, floor 17, rows 15-16 open under the deck) joins C on the
west (a walk) and has two **stairs** up (floor gaps cols 8-10 and 19-21 in the platform's deck, a bamboo rope up through each) to the
**platform** (floor 14, rows 11-13 open), the walkway in front of the track. The rope from D's subway lands on the platform at col 23
through the ceiling gap (cols 22-24). The platform's right end (cols 30-31, rows 10-13) is shut by a **roller shutter** (solid) until the
daruma; open, the platform walks on east to F. The underpass has a coin pocket at its east end. The **bullet train** (below)
sweeps the platform; the underpass is safe. Tiled walls, an overhead gantry with signal lamps and a departure board; the white
nose and the blue stripe of the train are what he sees come. 1 coin (underpass), 1 (platform, east of the second stairs). Creatures in the underpass: a paper-lantern ghost.

**F FUJI-TIVE** (Mount Fuji's foot and slope). In: left, high (rows 11-13, floor 14), from E past the shutter. The mountain (a great
snow-capped cone drawn behind, with cloud) and its pilgrim trail in **switchbacks**: a ledge at floor 14 (cols 0-22), a stair of stone steps right
(rows 12, 10) to floor 8 (cols 9-31), back left to floor 5 (cols 0-22) and the highest **chain** handrail (a rope, col 26) up through the ceiling gap (cols 25-27) to G. Stone
torii at the foot, pines, a tea hut with a lantern. Creatures: a tanuki on the first ledge (belly, leaf hat, sake bottle), a crane flying across
the snow (the upper switchback). 3 coins.

**G KOI POLLOI** (the temple garden on the mountain's shoulder). In: the floor gap at the left (cols 4-6), the chain from F landing on
a mossy bank (floor 14). The garden runs right: a **temple hall** (cols 8-14: a bell frame and a lantern), a raked **gravel** garden, stone lanterns,
a cherry tree in blossom (petals falling), then the **koi pond**: a gap in the floor (cols 17-26) crossed by a **zig-zag of lacquered
planks** (the yatsuhashi: planks at floors 14, 13, 14, 13: each plank 2 cells, a gap of 1 cell between them) with **two koi** leaping
out of the water between the planks, one rising as the other falls (so a leap across a gap always meets a rising carp). The far
bank (cols 27-31) has the castle gate on the right (an opening, low rows 11-13) and a **pergola** (rows 9, 6) up to a bamboo rope
(col 28, through the ceiling gap cols 27-29) to L. Without the fish food the koi stop the crossing; with it (a bag thrown on the
water: `removeEnemy` for each koi) the pond is a calm and the planks can be crossed. Creatures: koi (two), a tanuki on the temple steps,
a spinning paper umbrella under the cherry tree. 2 coins.

**L THE LAST MOLE** (hidden: a dead end off G's pergola). A homage to The Last Ninja with nothing copied (the plan: an active series).
In: the rope up through the floor (gap cols 27-29), onto a mossy ledge (floor 14, right). A moonlit garden: a **pond** (deadly) crossed on **six
stepping stones** (floor class, 2 cells wide, the gaps 2 cells of water, at floors 14, 13, 14, 12, 13, 14 so each is a jump
up or down), a **bonsai garden** on the far bank (shelves with bonsai in pots), a **stone dragon** coiled round a pillar (a decoration, big) and a
**shrine** on a plinth (floor 14 at the far left, cols 1-4) with the **ninja hood** on it. A crane in the moonlight, a koi in the pond
(deadly, in a gap, jumping out at one stone: a koi on a vertical patrol, learnable). 1 coin on the bonsai shelf. The only
creatures are the koi and the crane. A second **koi** is a fish only: no shortcut.

**H TIERS OF JOY** (the castle's roofs; a dead end). In: the rope from I's ceiling (col 4, gap cols 3-5). The keep rises in tiers
(a decoration, 10 x 7 characters) over a stone base; the **roofs** are floors with upturned eaves at floors 16, 12, 8, 4 stepping up and across: a stair of tiers
(cols 2-12, 10-20, 18-28, 24-31). Two **ninjas** pace the second and third tiers (they cannot be jumped on a single tier: tier 3 has a 2-cell gap to jump
between them). On the top tier, the **golden shachi** (the dolphin-fish finials) and a **sushi** (the second food). No other way out: back the way he came. 3 coins.

**I SHOGUN AND ON** (inside the castle: the gate hall). In: left, low (rows 11-13, floor 14) from G's gate. The hall is tatami floor
between dark timber walls with white plaster and black lattice (namako walls), hanging scrolls, a rack of swords; **three pairs of sliding paper doors**
(the mechanism below) at cols 8, 15 and 22, a gap in the ceiling and a rope up at col 4 (to H). At the far right the **guard** (a samurai in armour with a
helmet and a spear) paces cols 24-30, so no one can pass him: the way on is a floor gap (cols 28-30) with a rope down to J behind him. In the ninja hood the
guard steps aside (`removeEnemy`). A ninja patrols between the doors 2 and 3. 1 coin (before the first door).

**J SAYONARA SAILOR** (the port; the way out). In: the ceiling gap at the right (cols 28-30), the rope from I. A container quay
(floor 17): stacked containers (a stair of them, cols 6-12, rows 14, 11) and a gantry crane over the quay, bollards, a lantern, the
Great Wave again, and at the east edge the **cargo ship's side** (a red hull with white letters, a gangway up to its deck): the way out is the gangway, right, rows 14-16
(the Pacific's first room is on its deck). A dead-end pocket west holds a coin. Creatures: a sumo dockworker (he is the sort of crowd that blocks the quay, cols 12-22), a crab. 2 coins.

### Items, gates, doubling back

- **Fish food** (D's overpass: a paper bag of pellets with a fish on it): the koi in G leave the pond. **Daruma** (C's prize shelf: the round red wishing doll,
  one eye painted): the platform shutter in E rolls up (a `clear`). **Ninja hood** (L, on the shrine): the guard in I steps aside, and Monty wears the hood
  from then on (the costume). **Sushi** (A's roof stub, H's top tier): the bonus food, 200 points.
- **The critical path** (the shortest way out): A (roof, high), B (roof), D (overpass: the fish food, the rope down to the street), the subway rope, E (the shutter is shut: down the
  stairs, west), C (the stairs' foot ... the underpass leads west to C: through the claw's lane, the prize shelf's daruma, back), E (underpass east, up the stairs, east along
  the platform past the train: the shutter rolls up) F (the switchbacks, the chain) G (the pond, the pergola, the rope up) L (the stones, the hood, back the same way) G (east gate)
  I (the doors; the guard steps aside) J (east, the gangway). A first-time player sees the shutter before the daruma, the koi before the food, the guard before the hood: each
  gate is seen before the item that opens it.
- **Loops and dead ends:** one four-room loop (B C E D), five rooms crossed twice (A, B, D, E, and the pergola's rope into L is a second way off the garden). Dead ends with items: C's prize
  shelf, D's overpass pocket, A's roof stub, H's roofs, L. The start (A) and the way out (J) are the fixed points. Nothing needed from China or the Moscow and Siberia items (the ushanka and the rice hat come off: Monty's costume is the hood from L).

### The two mechanisms

**The bullet train** (E; `trains`). A drawn train sweeps the platform lane: the nose (white, a long swept snout and a blue band), then the cars (windows in a row, blue band, the
pantograph on the roof of the first), 24 cells long (the nose's 4 cells and five 4-cell car units that repeat end to end) and 6 rows tall (rows 8-13, taller than any jump), the bogies on the rail under it. Two trains alternate on a 300-frame cycle:
the up train enters from the right (its nose points left), the down train from the left; at 3 frames a cell a train crosses the 32 columns and its own length (56 cells) in 168 frames.
Anything in its cells on the platform lane is killed (a crusher's event 1). The cycle: **warning** 100 frames (the signal lamp on the gantry at the entering end flashes red and a
board shows an arrow, the platform's yellow edge blinks; a chime plays as the first note of the warning, a Hubbard sound effect), **sweep** 168 frames, **quiet** 32 frames, then the
other train's warning (the next 300). The underpass and the stairs' ropes below the deck are safe. He walks a cell in 8 frames; the two stairs (cols 8-10 and 19-21) are 9 cells apart, a dash of 72 frames,
and from the stairs to the shutter at col 30 (10 cells) 80. The quiet and the warning together (132 frames) allow one dash between shelters, not the platform's whole length (256 frames). Data: `trains: {room, row, height, length, frames per cell, warn, sweep, period, offset, fromRight}[]` (one record a train: the two are 150 frames apart, ones from
opposite ends), drawn as the engine draws the tunnel mouths (a moving block of characters: `jpTrainNose` and `jpTrainCar` in `art/japan-decor.ts` are drawn to join up across a
car's length).

**Sliding paper doors** (I, three pairs; `shoji`). A doorway 3 cells tall (rows F-3 to F-1) and 2 cells wide, its two paper panels (white, black lattice) parting into the wall's
pockets. A cycle of 160 frames: **open** 80, then the panels **shake** (the lattice flickers: the warning, `jpShojiWarn`) 24 frames, **shut** over 8 frames (a panel's
leading edge is a crusher's head: deadly to anyone in the doorway), **closed** 40 frames (a solid wall of paper, the shadow of a guard walking behind it), then **open** over
8 frames. The three doors are 40 frames apart (offsets 0, 40, 80), so a run at a walk (a cell in 8 frames, 16 frames to cross a doorway) meets each open if it starts
as the first opens; waiting at a door is safe (it is a wall, not a trap) and stepping into an open doorway as it shakes is not. Data: `shoji: {room, col, row, h, period, open, shake, offset}[]`.

**The costume** is the engine's `Costume.over` (the plan: the ushanka's way): the hood's art is `art/japan-hood.ts`; the same two key items
(the daruma, the fish food) are `special` items as the lamp and the ticket are.

### Creatures (12; none in more than two rooms)

Bold cartoon characters with faces, solid shapes with black-line detail, 16 x 16, eight frames (`art/japan-creatures.ts`):

| Kind | Where | Looks and moves |
|---|---|---|
| crab | A, J | red, claws raised, scuttling sideways |
| sushi roll on legs | A, B | a maki roll (rice, nori band, a tuna eye) trotting on two legs |
| waving lucky cat | B, C | a white maneki-neko with a raised paw waving; patrols on its feet |
| toy robot | C, D | a tin robot with a key in its back, marching |
| paper-lantern ghost | C, E | a chochin with one eye, a tongue and a wobbling tail, floating |
| sumo wrestler | D, J | a big man in a loincloth with a topknot, stamping; fills his lane |
| spinning paper umbrella | D, G | a wagasa twirling on its handle |
| tanuki | F, G | the raccoon dog with a round belly, a leaf on his head and a sake bottle |
| crane | F, L | a tall white crane with a red crown, wings flapping |
| koi | G, L | an orange and white carp leaping out of the water (vertical patrol) |
| ninja | H, I | a black ninja with a mask and slit, leaping (a patrol) |
| samurai guard | I | a samurai in a great helmet with a spear: the gate's guard (removed by the hood) |

### The costume: the ninja hood

Found on the shrine in L past the stepping stones, worn from then on (his own frames with it drawn on, until the Pacific's lei): `art/japan-hood.ts` (`JAPAN_HOOD`, `hoodWorn`, `HOOD_COLOUR`),
drawn like the ushanka: a hood over his head and cheeks, a slit for the eyes (the gap shows Monty's dark face behind), the knotted tails streaming from the back of the
head. Dark blue ink. It lets him by the guard in I.

### The bonus food: sushi

Two pieces of nigiri on a wooden geta board, rice below and a slice of pink fish above with a band of nori (`jpSushi`). White rice, pink fish. 200 points as the cake; the
pause panel says SNACKS.

### The tune

Hubbard's tempo, his driver, new data. **Scale**: the Hirajoshi pentatonic (semitones 0 2 3 7 8 above the tonic, the koto's scale); the melody's notes snap to
the nearest degree, the bass keeps the tonic and fifth. **Instruments**: a koto (a plucked pulse: a short attack, a quick decay, a 2-3 semitone slide down at the start of each note),
a shakuhachi lead on the long notes (a triangle with a slow vibrato after a delay), a taiko on the beat (noise and a low triangle thud), and a shamisen bass (a fast decaying pulse).
**A break**: the opening phrase of *Sakura Sakura* (a public-domain folk song, 19th century) as a short bridge, if it sounds right: transcribe from a public score, not memory, and if it
sounds like a gimmick, drop it as Moscow's plan allows. The build keeps Moscow's way of a region's version of the tune (`music/regions.ts`).

### ENHANCED hints (the place-name row's lines)

`take`: DARUMA: "WISH GRANTED: THE SHUTTER ROLLS UP"; FISH FOOD: "FISH FOOD: THE KOI LET YOU BY"; HOOD: "NINJA HOOD: PAST THE CASTLE GUARD".
`wanted`: E "THE SHUTTER WANTS A WISH"; G "THE KOI WANT FEEDING"; I "THE GUARD WANTS A NINJA".

### What is in `art/` and the previews

`japan-tiles.ts` (the region's tiles with their collision classes), `japan-decor.ts` (decorations: the junk's sail, the stalls, the neon signs, the pachinko
bank, the torii, Fuji, the pagoda and the keep, the cherry tree, the stone dragon, the train's pieces, the gantry, the Great Wave), `japan-creatures.ts` (the twelve),
`japan-items.ts` (the daruma, the fish food, the sushi, the hood as an item on its shrine), `japan-hood.ts` (the costume). Pictures:
`/root/projects/runstop64-shots/preprod-japan/` (`tiles.png`, `decorations.png`, `creatures.png` and `creatures-large.png`, `hood.png`, `room-*.png` mock rooms of the harbour, the platform with its train,
the garden and the castle hall, `compare-*.png` beside Monty on the Run's).

## As built

(To be filled in when the region is built.)

## Decisions for the builder (2026-11-21)

- The 5-wide, 11-room block is fine.
- Japan's exit (room J, row 2) and the Pacific's entry must sit on the same exit-grid row; the builder of whichever comes second lines them up.
- The weakest creatures (lantern ghost, crane, samurai) get a second pass when the region is built.
- A Sakura break in the tune is allowed (the song is a traditional 19th-century folk tune, public domain); add it only if it sounds like part of Hubbard's tune, else leave it out.
