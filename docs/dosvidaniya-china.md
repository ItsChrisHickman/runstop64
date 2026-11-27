# Do Svidaniya Monty: China's room map

Region 3 (docs/dosvidaniya-plan.md). Design first; "As built" at the end says where the build differs. Rows 0 (top) to 19, columns
0-31, as in docs/dosvidaniya-moscow.md and docs/dosvidaniya-siberia.md; Monty stands on a floor row F with his body on F-2 and F-1, a jump
rises 20 pixels (two rows, not three), a gap of three cells is jumped, and a way out at a side is open at the same rows as the way in of the
next room. Numbers are targets for the builder; the bot checks the real thing.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md and -siberia.md; the points China takes:

- **A room crossed twice at two heights** (`$04 $06 $09 $0C $0D`): the market (the street, and the stall awnings over it), the watchtower (the
  hall and the walkway over it), the wall's foot (the tunnel through the wall, and the stairs up its flank).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the hutong's firecracker ledge (the key), the wall top (the rice hat),
  the willow island (the bamboo). Three dead ends; the entry (A) and the way east (J) are the fixed points.
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, key 1 `$14`): the watchtower's trapdoor wants the key
  (found in the hutong), the city gate wants the rice hat (found on the wall's top), the junk wants the bamboo (found on the willow island).
  Each key item is found in a place that the way to the gate it opens does not pass: three gates, three finds, the loops between them.
- **A loop** (four of Monty on the Run's): the wall's foot, the hutong, the market, the watchtower and back down (A D E T A), by a rope up
  from the hutong, the market's two ways west and the watchtower's rope down.
- **A rope that leaves a room the other side from where it came in** (`$05`, `$0A`): the hutong's rope is at its west end, the market's other
  rope drops from the awnings at the middle.
- **Beyond the gate the way does not fork** (as Monty on the Run's last rooms): the palace, the garden and the quay run on in a line,
  each a room with a climb or a crossing of its own.

## Part 2: China

Nine rooms, a block 4 wide and 3 high at columns 8-11 of the world's grid (Siberia's are 4-7):

```
          col 8                col 9               col 10               col 11
row 0   C  MIND THE BATTLEMENTS     .                   G  THE EMPEROR'S ROOFTOPS    H  WILLOW PATTERN
row 1   T  THE WATCHTOWER    E  NOODLE MARKET    F  THE FORBIDDEN CITY J  DOWN THE RIVER
row 2   A  WALL'S WELL       D  BACK ALLEY BEIJING        .                    .
```

Siberia's "BORDER LINE CASE" (columns 7, row 2) opens east onto A (its planks and sign go: the barrier the ticket lifts stays).

Joins (rope = both ways, gate = an item): G(Siberia)-A walk, low. A-D walk, low (a tunnel through the wall). A-T a rope up through A's
ceiling (reached by a stair of ledges up the wall's flank and along its top). D-E a rope up through D's ceiling into the street. T-E two walks,
the hall's (low) and the walkway's (high). T-C a rope up through the watchtower's roof, shut by a trapdoor (gate: the key). E-F a walk, low. F-G
a rope, up through the gate's inner court (gate: the rice hat, doors across the court). G-H a walk, high (the palace ridge to the garden's bank).
H-J a rope down through the bank's well. J-east a raft out to the junk (gate: the bamboo), then COMING SOON. Walls (no way): C-G, T-west, E-north,
D-east, F-J, G-west, H-east, J-west.

**Names** (puns, no Z, no Bond): WALL'S WELL, BACK ALLEY BEIJING, THE WATCHTOWER, MIND THE BATTLEMENTS, NOODLE MARKET, THE FORBIDDEN CITY, THE EMPEROR'S ROOFTOPS,
WILLOW PATTERN (Chris: exactly that), DOWN THE RIVER.

### The rooms

**A WALL'S WELL** (the wall's foot, outdoors, turf and hill). In: left, low (floor row 17, open rows 14-16). The Great Wall stands across the
right of the room, a block of brick (cols 13-31, rows 9-13) with its top a walkway at floor 9 and merlons along it, and a tunnel through it
at the foot (rows 14-16): the low way east into D. A stair of three floating stone ledges (floors 15, 13, 11, cols 4-12) climbs the flank onto
the wall's top; along it to a rope at col 25 climbing through the ceiling (gap cols 24-26) into the tower. A panda in the bamboo at the left on
the ground, a kite over the wall. 2 coins. The two lanes (the tunnel under the wall, the walk on top of it) are crossed once each.

**D BACK ALLEY BEIJING** (the hutong, a narrow brick alley). In: left, low. A rope at col 4 (ceiling gap cols 3-5) climbs to the market. Ground lane
east to a closed end; floating shelves (floors 15, 13, 11) climb in the middle to a roof ledge (floor 9, cols 17-29) under a beam from which
a **string of firecrackers** hangs (cols 19-28); the **key** lies on the ledge's far end. A bicycle on the ground, a pogo-stick monk bouncing at
the east end beside a coin, a caged cricket hopping on the shelves. Off the ledge's west end is a drop to the lane. Dead end with the key.

**T THE WATCHTOWER** (the watchtower's hall). In: by the rope from A (floor gap cols 24-26, rope col 25: the arrival is on the hall's floor);
out: east, low (rows 14-16) or east, high (rows 6-8) from the walkway. West: a stair of ledges (floors 15, 13, 11) up to the walkway (floor 9,
cols 12-31), which runs over the hall to the high way east. A rope at col 16 under a trapdoor (ceiling gap cols 15-17, shut) climbs to the wall top.
A terracotta warrior paces the hall's floor west of the rope, a paper lantern with a face bobs over the walkway. 2 coins.

**C MIND THE BATTLEMENTS** (the wall's top, a dead end; night, a beacon). In: the floor gap (cols 15-17, rope col 16) from the tower. A winding
climb: right up three stone ledges from the floor (floors 15, 13) to a long walkway (floor 11, cols 6-29) back west, up the left (floors 9, 7) to the
beacon platform (floor 5, cols 9-29), east along it to the **rice hat** at its far end and a **dumpling** on the way. A kite, a monk on a pogo stick
and a terracotta warrior. 2 coins.

**E NOODLE MARKET** (Beijing's market street at New Year). Two ways in from the tower, low (street, floor 17) and high (a row of stall awnings,
floor 9, cols 0-10, a gap with a rope at col 12 down to the street); a floor gap with a rope at col 4 (over the hutong's rope: the two gaps are the same cells) down into the hutong; out east, low, to the
gate. Lanterns, banners, stalls. **The New Year dragon** loops through the right half of the room (six sprites on one path, see below): over the
top, down the right, along the street, up the middle. No creature but the dragon. 2 coins (the awnings, the street under the dragon).

**F THE FORBIDDEN CITY** (the Forbidden City's south gate). In: left, low. An outer court (a stone lion alive, paces it) and the gate tower across
the room, its doors across the court (floor to row 11: six rows, higher than a jump rises): **shut until the rice hat is taken** (the doors are gone:
`clear`). Inside, a court with a guard and a rope at col 24 (ceiling gap cols 23-25) up onto the palace roofs. 2 coins.

**G THE EMPEROR'S ROOFTOPS** (the palace's roofs and courtyards). In: the rope from the gate (floor gap cols 23-25: the arrival is on the courtyard). The
courtyard runs west to a dead end with a **dumpling** and a coin past a lantern and a stone lion; a stair of glazed roof ledges (floors 15, 13, 11) at
the right climbs the eave onto the ridge (floor 9, cols 19-31), which runs east, high, to the garden (rows 6-8). 2 coins. Two lanes (the court, the
roofs) crossed once each.

**H WILLOW PATTERN** (the imperial garden, all blue and white, as the plate). In: left, high (rows 6-8) onto the bank (floor 9). A well in the bank
(floor gap cols 2-4, a rope col 3 down: to the quay); steps down (floors 11, 13) to the shore (floor 15); **stepping stones** over the river
(water, a leaping carp) to the island on the far side: shore cols 11-13, stone 17-20, stone 24-26, island 29-31, the water between three, three and
two cells wide. An **arched bridge** crosses high over the river (a decoration: the deck is far over his head, rows 3-4); **three crouching figures** on it
reach down with both arms over the three gaps on a timing (see below). Two doves over the river, a willow, a pagoda. The **bamboo pole** lies on the island,
which is the end of the stones: back across, to the well and down the rope into J. 1 coin.

**J DOWN THE RIVER** (the river's quay, at its mouth). In: the rope from H (ceiling gap cols 2-4, down onto the quay, floor 17). The quay runs east
(a bicycle) to the river (water, cols 20-25); across it the **junk**, moored (cols 26-31, hull and mast), and the way east, shut with a sign
JAPAN COMING SOON. Without the bamboo the river is five cells of water; with it a raft of bamboo is poled across (`place`). A carp leaps in the river (a
timing for the raft). 1 coin.

### How the rooms look (Chris, 2026-11-21: "China looks pretty rough"; each place drawn as itself, art in `art/china-*.ts`)

A decoration of one character costs one character however often it is placed (a room has 101 in all: `test/china-art.ts` checks it), so a wall's dressed stone, a back wall
and a run of battlements are stamped a cell at a time (`wallCell`, `backCell`, `crenels`).

- **The Great Wall (A, T, C):** the Wall seen from the side as it snakes over the hills: green and brown mountains behind it (`hillGreen`, `peakBrown`, by night `peakNight` with stars and a
  moon), the walkway along its top with a run of crenellations, the face of dressed blocks stepping down the flank with the stair, a row of arched bays in its foot, a tower at the end
  with arrow slits. T is the tower's hall (dark brick inner wall, two windows giving on the Wall climbing the next ridge to a tower), C the Wall's top between two towers under a
  tiled gallery roof, each ledge a stretch of the Wall with its battlements and its face under it.
- **WILLOW PATTERN (H):** the game's bridge scene in the plate's blue: a long arched bridge across the room with three giants in great hats crouched on its parapet reaching down
  (the timed arms), white clouds and the two birds beak to beak in the sky, the river with its white stepping stones and a sampan, the great drooping willow, the pagoda, the zigzag fence,
  and the plate's lattice border round the room.
- **Beijing (D, E):** the hutong's grey-tiled eave and brick wall with a gatehouse (grey roof curling up at the corners, red doors with their studs); the market's shop fronts behind noodle stalls
  under striped awnings with a steaming pot, lanterns and lattice windows.
- **The Forbidden City (F, G):** red walls, the gate tower under a gold double roof with curling eaves; the rooftops with the palace's halls in the distance (gold double roofs, red walls, white terraces).

### Items, gates, doubling back

- **Key** (D, the firecracker ledge): `clear`s the trapdoor in T and puts the rope's last two cells in place. **Rice hat** (C, the wall top): the costume
  (the ushanka goes), `clear`s the doors in F. **Bamboo** (H, the island): `place`s the raft in J. **Dumplings** (C, G): the food in place of the cupcake.
- Critical path: A (the tunnel) D (up the stair, the key past the firecrackers, back) A (the stair, the wall's top, the rope) T (the walkway, the rope up now
  open) C (the hat, back down) T E F (the doors are gone) G (the roofs) H (across the stones, the bamboo, back, down the well) J (the raft, east).
- A player who goes E before the hat finds the doors shut and goes back: the market's ropes both go on (T and D), nothing traps him. The tower's trapdoor
  shows its hatch from below and the hint says what it wants.

### The two mechanisms

**Timed strikes** (D's firecrackers, H's reaching arms; one mechanism, `pulses`). A group of cells that is harmless at rest, flickers for `warn` frames
(the warning: a lit fuse, an arm twitching), is deadly for `live` frames (a bang, an arm reaching to the water), then is `spent` (a scrap, nothing) until its
period comes round. Death to what of Monty is in its cells while it is live (event 1, as a crusher's head). Each group has its own start in the period, so
a string of crackers is a row of groups started one after another (the fuse seen burning along it) and the three arms a third of a period apart. The
timing to learn: the string goes off faster than he walks, so he waits until it is done and crosses before it re-hangs; an arm reaches over a gap, so he waits
on a stone and jumps when it is back. Data: `pulses: {room, col, row, cols, rows, period, start, warn, live, codes}[]`.

**The New Year dragon** (E). Six sprites (the head, four body pieces, the tail) follow one smooth closed path through the room a pixel a frame, each a fixed
arc length behind the one in front, so it winds; whatever of it touches him is death. The path rises and falls: the top lane is above everything, the right side comes
down to the street and runs along it and rises in the middle, so for the part of each lap that it is on the street the street is shut, and for the rest it is
free: about two seconds clear for the eleven cells of street it takes. The sprites are sprites 0, 1, 2, 4, 5 and 6, so the room has no creatures, items, icicles or
lifts. Data: `dragons: {room, path, speed, gap, pieces}[]`.

The key item that is a costume, the rice hat, is drawn over Monty as the ushanka is (`Costume.over`), in straw yellow; its sprites take the ushanka's
sprite blocks (taking it writes its blocks over them: costumes list their own).

## As built (2026-11-21)

The nine rooms are in `games/montyworld/src/china.ts` (ids 18-26, sectors 18-26; Moscow's and Siberia's are untouched), art in `art/china-*.ts` and `art/world.ts`
(the three regions' pieces as one set, Moscow's and Siberia's first so indexes never move), the tune in `music/china.ts`, the sprites' places in `china-pointers.ts`,
the hats' pool in `hats.ts`, the bot's route in `test/china-route.ts`, the pictures in `test/china-shots.ts`, `china-sheets.ts` and `china-map.ts`. Where the build
differs from the design:

- **Siberia's village** opens east onto the wall's foot: its planks are gone and the sign reads ROAD TO CHINA (the barrier the ticket lifts stays). Its tests
  (`siberia-mechanisms.ts`, `siberia-route.ts`) say so; Moscow's and Siberia's tests count the whole world's totals now (27 rooms, 43 coins, 13 finds).
- **A is ALL WALL AND NO PLAY**, not WALL'S WELL: the lettering draws an apostrophe as a letter.
- **The dumplings** are in A (the wall's far end, at its top) and G (the courtyard's dead end), not C: a room has one find or a find and the one cake sprite of
  the whole game, so C holds the rice hat alone. A has 2 coins and the dumplings, C 2 coins and the hat.
- **The engine** gained, as data (Monty on the Run's value leaves them empty and plays as before: its trace and title tests pass unchanged): `pulses` (`pulses.ts`),
  `dragons` (`dragons.ts`), a second costume (the list in `MontyData.costumes` already allowed it), and `cells.ts`, the cell and box measuring the tunnel mouths
  already did, now shared with the strikes. A copy of a game copies a number (a group's place in the data's list), not the group, so the bot's search stays quick.
- **Firecrackers**: nine, cols 19-27 under a beam at row 6 (rows 7-8), the fuse lit from the left after 170 frames of the 450-frame period (a walk up to the ledge takes about 150, so he meets the string on it), a cell every 6 frames,
  a warning of 18 flickering frames and a bang of 12; the key lies at col 28. Walking with the fuse catches him (its front is faster than his walk); crossing
  after the last bang (frame 108) takes 87 frames of the 190 before it is hung again.
- **The arms**: two cells wide from row 6 to the hand at row 14, over the three gaps (cols 12-14, 19-21, 25-26: the arm at cols 13-14, 20-21 and 25-26), starts 0, 40 and 80 of
  a 150-frame period, 20 frames of twitching and 36 reaching. The garden is a bank (entry cols 0-1, the well at cols 2-4, steps to the shore cols 9-11), stones at cols 15-18 and
  22-24, the island at cols 27-31 (the bamboo at col 29, the pagoda behind it, a wall at col 31); the bridge is a picture (`archBridge`, rows 4-5) and the figures
  crouch on it (rows 2-3).
- **The dragon**: six pieces on sprites 0, 1, 2, 4, 5, 6 at a pixel a frame and 18 pixels apart, a lap of 345 frames; the head turns with its heading and opens and shuts
  its mouth (`frames` are the pictures going left then going right); its path runs over the top (rows 1.5-2.5), down the right (col 27.5), along the street (row 13.6)
  and up the middle (cols 17-20). Measured on the engine, a walk along the street from cell 13 to the way out is untouched from about four starts in ten
  (`.........##########################.........` across a lap in 8-frame steps): about 110 frames of starts to choose from, the dragon seen all the time. The sprite pictures are
  never an item to the pickup (the head is sprite 0, which touching is picking up): the test checks the pointers.
- **The rice hat** takes the ushanka's blocks: the hats' pictures (about 25 distinct blocks for Monty's 36) live in one pool of the bank's free blocks (`hats.ts`) and
  each costume's `blocks` write its own over the pool when it is put on, so a save carried on in either hat shows that one. Costumes list their hat's blocks with Monty's.
  It is a wide cone in straw yellow with a black weave and a chin strap at each side; the ushanka's colour is fur brown.
- **The gate**: a tower of red wall over the doors (rows 11-16) with a swept roof and a second storey, the doors a `clear` of 24 cells, the sign FORBIDDEN CITY.
  **The raft** is seven cells (the quay ends at col 18, the junk's deck begins at col 26; a jump spans about five), a `place` of the bamboo.
  **The trapdoor** is a plug of six cells in the tower's roof and the key `clear`s them and `place`s the rope's last two cells.
- **The ropes** are the same cells at both ends (the test lands him on the rope or a floor at each end of every one): the market's gap and the hutong's rope are at col 4,
  the tower's and the wall's at col 25, the trapdoor's at col 16, the gate's and the palace's at col 24, the well's and the quay's at col 3.
- **Creatures** (eleven kinds, none in more than two rooms): panda (A), kite (A, C), monk on a pogo stick (D, C), caged cricket (T, J), baker on a bicycle (D, J),
  terracotta warrior (T, C), paper lantern (T, G), stone lion (F, G), imperial guard (F), carp (H, J), dove (H, two). The market, the dragon's, has none.
- **Music**: the major pentatonic on G (G A B D E: the notes between them move to the nearest) and a bowed fiddle (a sawtooth, slow attack, vibrato) for the lead; no folk break
  (no melody was quoted from memory).
- **Saves**: the format stays 1 (the same shape; shorter coin and item lists load into the first entries, the worn item is an index).

Checks (all pass): `games/montyworld/test/china.ts original|enhanced` (the bot plays 39 legs from Siberia's village to the junk's deck taking every coin and find, 6536 frames,
about 4.5 minutes each, slow set), `china-mechanisms.ts` (75 checks, fast: the strikes' timing and kills, the dragon's six sprites, path, kills and fair street, the three gates
and their proofs, the hat as a costume and in a save, the loop and the ways back, no trap, the hints, the map, a save in each room and an old save), `music-china.ts` (9, fast);
Moscow's `moscow.ts`, `mechanisms.ts`, `walk.ts`, `music.ts`, Siberia's tests and all of Monty on the Run's (trace and title with /tmp/motr.prg included) pass.
Pictures: /root/projects/runstop64-shots/china/ (room-*.png from the real engine with Monty in them, sheet.png, compare-*.png beside Monty on the Run's, crackers.png,
arms.png, dragon.png, gate-shut/open.png, trapdoor-shut/open.png, junk-no-raft/raft.png, hat-*.png, china-map.png, art/ for tiles, decorations, creatures and the dragon).

**What to look at in play**: the firecrackers' wait (does the string read as a fuse burning?), the dragon's street (a walk along it is untouched from about four starts in ten), the arms over the stones, the rice hat
over Monty, and the rooms' fullness beside Monty on the Run's.

**Japan built (2026-11-21):** the junk's way east is open now (its planks and the JAPAN COMING SOON sign are gone; the east wall is open at rows 15-16 above the deck) into Japan's harbour (`docs/dosvidaniya-japan.md`).

**Third pass (2026-11-22, Chris played it):** room ids, items, routes and saves unchanged; the coin counts of every room are the same (the junk's one coin moved from the raft to the crane's arm).
- **The Willow Pattern** is a homage to the C64 game and the plate: three giants crouched on the bridge in wide straw hats (rays and rings in the weave), green faces, light blue robes, two sleeves
  hanging in front over the arch and the arms (pulses, now rows 8-13, hands at row 14) reaching on from them; a long grey bridge of round arches (the giants are drawn in front of three of its bays); the
  weeping willow (long thin strands, no blob); the plate's pagoda tower (three tiers, spire), its birds beak to beak, a round-crowned orchard tree, the zigzag fence, mossy stones, a thin lattice rim.
  The boat and the willow's second piece are gone. 100 decoration characters at most a room (the engine skips a type that would run past $FF).
- **The Emperor's rooftops**: the golden roofs are the floor (ridge tiles along the bottom, glazed slope under them, eaves stepping up, the high ridge), a dragon on each ridge's end and the hall's
  beasts marching along it, a dusk sky in two bands with a moon and stars, halls receding in three tiers, lanterns under the eaves. The lion is white against the gold.
- **Back Alley**: the grey band that looked like a platform is gone (the wall behind runs up under the washing); a clothesline runs house to house behind the rope, hung with six garments of six colours.
- **All Wall and No Play**: a chamber in the wall's thickness with a coin, seen from the way in and reached by a rope up through a gap in the tunnel's roof: no item (Chris, 2026-11-22: a key never guards just a coin; the key's one job is the tower's trapdoor). Mountains in two layers behind the Wall.
- **Down the River**: the quay is a bank and a jetty of rotten planks over the river with the carp below; each plank (13 cells, `JUNK_CRACKS`) frays after 16 frames under his feet, splits after 34, goes at 46
  (a walk over a cell is about 18): a steady run is safe, a stop of 12 frames is forgiven, standing is the fish. A crane's arm up a rope with the coin, a gull diving over the raft, hills far off; no wall at the right:
  the river runs on into Japan's harbour. The bicycle is out.
- **Noodle Market**: the yellow awning over the street is rotten (4 cells, `AWNING_CRACKS`: 14, 26, 34 frames): cross it at a walk and the coin is his, linger and he drops to the street. The city's roofs far off behind the dragon.
- **The Forbidden City**: unchanged but for its right edge (shut under the palace wall, so a jump east never lands in the quay's cliff). The audit's lantern-on-a-rope for it was tried and left out: the bot found no way to the inner court past it.
- **Joins**: `games/montyworld/test/joins.ts` holds every east-west and north-south join of every region to "no open edge cell meets a wall"; offenders found and mended (a `shut` of a room's
  edge, `layout.ts`): Siberia (2), China (the wall, the gate), Japan (5), the Andes (1); the intended ones (the box's chain, the surf's waves, the hold's door, the road's pool, the tower's trapdoor) are listed in the test.

## Chris's playtest notes (2026-11-26): challenge where it is missing

- **THE WATCHTOWER:** "The watchtower top row enemies pose no threat and serve no purpose." Give the top row's creatures a
  path that crosses Monty's way (a timing to read), or replace them with one that does; no creature that is only decoration.
- **DON'T ROCK THE BOAT:** "pretty but has no challenge." Keep the look; add the challenge the name promises (the boat rocks:
  its deck tilts or bobs on a timing, a creature on the water, a jump between boats).
- **OFF THE BEATEN PATH:** "cool ideas but no challenge." Keep the ideas (the pines, the boughs); make the climb ask for
  timing or a choice, with its reward at the end.
- **BORDER LINE CASE:** "good ideas but both water bridges should break faster as this would pose a challenge. Right now
  they don't." Both breaking bridges give way faster, so crossing them is a run, fair but tight.
