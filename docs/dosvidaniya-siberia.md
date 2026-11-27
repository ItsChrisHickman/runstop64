# Do Svidaniya Monty: Siberia's room map

> **Superseded (2026-11-23):** Siberia was rebuilt to the reset plan (docs/dosvidaniya-reset.md, "Siberia (the Trans-Siberian)"): six rooms, the train as
> the puzzle. The forest, the dark shaft and the lake below are gone, and the cave, the mine and the border are not as described here. This file is the
> history of the first build; games/montyworld/src/siberia.ts is the region as it is.

Region 2 (docs/dosvidaniya-plan.md). Design first; "As built" at the end says where the build differs. Rows 0 (top) to 19, columns
0-31, as in docs/dosvidaniya-moscow.md; Monty stands on a floor row F with his body on F-2 and F-1, and a way out at a side is open
at the same rows as the way in of the next room.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points Siberia takes:

- **A room crossed twice at two heights, the lanes sealed from each other** (`$04 $06 $09 $0C $0D`): the two train cars (roof and
  inside), the forest (the ground, then the boughs) and the mine mouth (the gantry, then the gallery under it).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the tender (the ticket), the yeti's hollow, the mine's
  lamp pocket. Three dead ends; the start of the region (A) and the way east (G) are the fixed points.
- **A way that only opens once an item is found elsewhere** (cake 0 opens `$0C`'s wall, key 1 `$14`): the mine's dark ledges
  want the lamp (found in the mine mouth), the border barrier wants the ticket (found in the tender, a room that looks like a
  dead end of the train and is one).
- **A drop** (`$0F`, the jetpack shafts) is not used: it trapped a player who skipped the tender (the lake and the village are a closed pair
  without the ticket), so the shaft's floor gap has a rope in it, down to the lake and up again.
- **A rope that leaves a room the other side from where it came in** (`$05`, `$0A`): the sleeper's pine rope.
- **A lift (`$05`, `$0D`)**: the mine cart.

## Part 2: Siberia

Nine rooms, a block 4 wide and 3 high at columns 4-7 of the world's grid (Moscow's are 0-3):

```
          col 4            col 5             col 6              col 7
row 0   O  YETI OR NOT   F  PINE TO BE WILD  M  MINE ALL MINE   S  SHAFT OF DARKNESS
row 1   A  THE GRAVY TRAIN  B  SLEEPER HIT    C  COAL COMFORT    L  BAIKAL TO BASICS
row 2      .                .                  .                 G  BORDER LINE CASE
```

Moscow's "SIBERIA YOU LATER" (I, at column 3 row 1) opens east onto A's roof (its planks and sign go).

Joins (rope = both ways, gate = an item): I-A walk, roof. A-B walk, roof, and a gangway under it (the cars' interiors). B-C the same, roof
and gangway. B-F a rope up through the sleeper's ceiling. C-M a rope up through the mine's floor. F-O a walk, low. F-M a walk, high. M-S a walk,
low (S's ledges want the lamp). S-L a rope in the shaft's floor gap (down to the lake, up again). L-G a rope. Walls (no way): A-O, C-L, G east
until the ticket. Loops: B-C twice (the roof, and the pocket under it by the gangways), and B-C-M-F-B (the tender's rope up into the mine,
the gantry west to the forest, the forest's rope down to the sleeper).

**Names** (puns, no Z, no Bond): THE GRAVY TRAIN, SLEEPER HIT, COAL COMFORT, PINE TO BE WILD, YETI OR NOT, MINE ALL MINE,
SHAFT OF DARKNESS, BAIKAL TO BASICS, BORDER LINE CASE.

### The rooms

**A THE GRAVY TRAIN** (dining car). In: left, on the roof (floor row 9, open rows 6-8), from Moscow's carriage. Out: right on the
roof, or right through the gangway (rows 15-16, the car's floor row 17) into the sleeper's corridor. A tunnel mouth sweeps the roof from the
right; two hatches (floor gaps cols 11-13 and 24-26) each with a rope down into the dining car, whose floor joins them: tables, a ticket
inspector pacing between the ropes, a coin at the right and a pelmeni in the pocket at the left (its left end is shut, Moscow's wall). The
inside is a lane under the roof, and the shelter from the mouth. The roof has nothing standing on it: the train moves.

**B SLEEPER HIT** (sleeper car). Roof (row 9) in left, out right; the corridor under it has a gangway at each end. Two mouths, one from each
end, a pause apart. Hatches at cols 6-8 and 14-16 (ropes down into the corridor of compartments, the inspector in it, a coin each end). A rope
at col 22 climbs through the ceiling gap (cols 21-23) up to F, the way the player goes up. Crossed twice at two heights, the lanes
sealed from each other but at the hatches and the gangways.

**C COAL COMFORT** (the tender). In left on the roof (the rim, row 9) or under it, from the sleeper's gangway into the pocket below the rim
(a hatch joins them: that is a loop with B, the roof one way and the corridor the other). Coal heaps in steps (rows 11, 13, then 15 for the
trough) up to the cab's roof (row 9) where the ticket lies; a coal-faced miner (the stoker) paces the trough; no way on east (the
locomotive). A rope at col 20 from the heap climbs through the ceiling (gap cols 19-21) into the mine's gallery floor, which is the way round.

**F PINE TO BE WILD** (frozen forest). In: the rope from B comes up through the floor at col 22. Ground lane: west to O (wolves,
a bear); east a trunk wall, a rope at col 27 up to the boughs (row 7): out east, high, to the mine; owls on the boughs.

**O YETI OR NOT** (dead end). In right, low. A cave: the yeti paces the floor; ledges up the left wall (rows 15, 12, 9) to a
pelmeni; an owl; a coin.

**M MINE ALL MINE** (mine mouth, lit). In left on a gantry (floor 7); the rope at col 14 (the gantry's gap, cols 13-15) goes down to the
gallery (floor 18); left along it, over the gap of the tender's rope (cols 7-9, a rope at col 8 down into C), a dead end pocket with the
lamp and a coal bucket (Wanted: Monty Mole's pail, the nod); right the way on, low, into S. Timber ledges (rows 16, 14) climb to a high shelf
(row 12) with a coin; the mine cart hangs off the shelf's west end (col 20) and carries him down to the gallery (floor 18) beside the way
on. The cart is not on the gantry or the gallery: nothing grabs him on the walk in. Crossed twice at two heights.

**S SHAFT OF DARKNESS** (dark: its rock a dim blue, no lamp in it). In low. A rock step one row high by the way in (floor 17), then a stair of two ledges
(floors 15 and 13) up to the top of a rock wall (cols 14-19, floor 11), and a stepping stone over a pit of water: the ledges are only
dots, felt in the dark, and not there, until the lamp is taken (a `place` effect: the platforms appear in timber); the stone is water until
then. Over the wall (a miner paces its top), down the right, and out by the floor gap (cols 27-29) with a rope in it that goes down to the
lake and up again.

**L BAIKAL TO BASICS** (the lake). In at the right on the rock shore (floor 12) by the rope from the shaft (col 28, which climbs back up
too); the ice (floor 12) goes left in two patches either side of a rock island; stand on a patch too long and it cracks (three stages:
lines, wide, gone) and he falls into the lake (deadly); a reindeer patrols so he must wait on the island; the left shore has a floor gap
with the rope down to G. A nerpa (the seal) shuffles on the first patch. A fisherman's hut on the shore.

**G BORDER LINE CASE** (the village). In by the rope at the left; houses; a reindeer; a barrier of banded poles at the right edge, which the ticket
lifts; a sign CHINA COMING SOON in the gap beyond (shut like Moscow's).

### Items, gates, doubling back

- **Miner's lamp** (M, the pocket): puts the ledges in S (`place`). **Ticket** (C): lifts G's barrier (`clear`). **Pelmeni** (A inside,
  O): the food in place of the cupcake. Nothing needed from Moscow but the ushanka, which he keeps (the plan: still Russia).
- Critical path: I A B (C: the ticket, back through the gangways) B F (O: the pelmeni, back; boughs) M (down the rope, the lamp, the shelf and the cart) S L G (east). A player who skips the tender can still climb back from the village to the shaft (the ropes go both ways), and the ticket is the only thing the barrier wants.

### The two mechanisms

**Tunnel mouths** (A 1, B 2). A portal of rock 6 cells wide (the rock two cells thick at the sides and top: a hill with a tunnel through it) and rows 2-8 tall sweeps the roof from one end to the other at a cell
every 10 frames (38 cells: six seconds and a bit), rests, flashes its leading edge for 48 frames at the entry (the warning), and sweeps again.
Anything in its cells dies (the roof, a rope above it); under the roof (a hatch's rope, the car) is safe. He walks a cell in 8
frames, so he cannot run through it but he can outrun it. Data: `tunnels: {room, from, ...}[]`.

**Cracking ice** (L). An ice patch (cells at a floor row) counts the frames he stands on it (a jump is not standing); after 56 frames
the cells show lines, after 88 wider ones, after 120 they are gone for 240 frames and he falls into the water; the count dies away
a frame a frame when he is off. Walking across a six-cell patch without stopping, his two-cell body is over it for about 56 frames (measured: 71 frames over eight cells, the patch just showing lines as he leaves): safe by a little, and waiting is not. Data: `cracks: {room, col, cols, row, codes}[]`.

The lamp is the region's key item, with the engine's `place` room effect; the mine cart is the engine's lift with a picture of its
own. The costume stays the ushanka.

## As built (2026-11-21)

The nine rooms are in `games/montyworld/src/siberia.ts` (ids 9-17, sectors 9-17; Moscow's are untouched), art in `art/siberia-*.ts` and
`art/world.ts` (Moscow's and Siberia's pieces as one set, Moscow's first so indexes never move), tune in `music/siberia.ts`, the bot's route in
`test/siberia-route.ts`, the pictures in `test/siberia-shots.ts`, `siberia-sheets.ts` and `siberia-map.ts`. Where the build differs from the design:

- **Moscow's station** now opens east at rows 6-8 onto the dining car's roof (the planks keep rows 2-5); its sign reads TRAIN TO SIBERIA.
- **The engine** gained, as data (Monty on the Run's value leaves them empty and plays as before): `tunnels` (`tunnels.ts`), `cracks`
  (`cracks.ts`), a room effect `place` (the lamp's ledges), a `look` for a lift (the cart's two sprites), and a save that no longer restores
  the exit grid in a game with no C5 street (a Moscow-only save would have emptied Siberia's cells).
- **Mouths**: the dining car's from the right at a cell every 10 frames; the sleeper's two, one from each end, at the same pace, 190 frames
  apart (offsets 40 and 230): the same 538-frame cycle in a fixed phase, so they cross each other over the same cells each time (harmless).
  The edge flashes 48 frames before each sweep. A hatch's rope, or the car under the roof, is the shelter.
- **The mine cart** is Monty on the Run's lift (type 2: a ride down, started by walking onto it); it hangs off the high shelf's west end (col 20),
  and the ride sets him on floor 18, so the gallery's floor is row 18 and S's low way too. The way between gantry and gallery is a rope at column 14.
- **The shaft**: the lamp places two ledges and a stepping stone (timber, floor class); without it they are not there, only felt as dots (a
  non-solid tile), and the room is drawn dark (dim blue rock). A rock step by the way in carries the first ledge off the head-height of the way in.
  The miner paces the wall's top at the right end so the coin at its left end is reached first.
- **The lake**: the lake's rope is at column 5 (the left shore is a block, the gap beside it), the village's ceiling gap to match.
- **Creatures** (nine kinds, none in more than two rooms): wolf (F, G), bear (F), owl (F, O), reindeer (L, G), inspector (A, B), miner (C, S),
  yeti (O), bat (M, S), nerpa (L; Baikal's seal, in place of the design's fish). After the first review the wolf, bear, reindeer, miner and nerpa
  were redrawn with big faces turned out at us (grey wolf, brown bear and brown reindeer with a rack of antlers, an orange miner with a black
  coal face and two lit eyes, a silvery seal with great eyes), so no two creatures that share a room are the same grey.
- **Pelmeni** are pale yellow dumplings on a plate (Moscow's pirozhok is a white pie), so the two foods read apart.
- **Rooms**: the rock is a rough granite tile (not brick) with a coal-seam tile beside it; the mine, the shaft and the yeti's cave have rock
  masses, props, boulders, a coal bucket (Wanted: Monty Mole's pail, the nod) and seams; the lake has a fisherman's hut; the barrier is a
  stack of banded poles. Nothing stands on the moving train's roof.
- **No ticket inspector check on the ushanka**: he is in the hat from Moscow (it was needed to leave), so a gate on it would never close; the
  region's key items are the lamp and the ticket.
- **Music**: G Dorian (G#, B, C# and Eb move), a piped lead (a triangle); no folk break (the plan's "maybe"): no melody was quoted from memory.
- **Saves**: the format stays 1 (the same shape; shorter coin and item lists load into the first entries).

Checks (all pass): `games/montyworld/test/siberia.ts original|enhanced` (the bot plays 37 legs from Moscow's roof to the village barrier taking every
coin and find, slow set), `siberia-mechanisms.ts` (46 checks, fast: also the gangways, the loop, the way back west and from the village to the shaft, the gates' proofs, a save in each room), `music-siberia.ts` (9, fast); Moscow's `moscow.ts`, `mechanisms.ts`, `walk.ts`,
`music.ts` and all of Monty on the Run's tests (trace and title with /tmp/motr.prg included) pass unchanged but for Moscow's counts now being a part of the whole.
Pictures: /root/projects/runstop64-shots/siberia/ (room-*.png from the real engine, compare-*.png beside Monty on the Run's, sheet.png, shaft-lit.png,
tunnel-*.png, ice-*.png, siberia-map.png, art/ for tiles, decorations and creatures).

## The train, reworked (2026-11-21)

Chris on the first Siberia: "it doesn't actually feel like it's a train... rooms with words that say their carts". The train is now drawn
as one (`games/montyworld/src/train.ts`; the plan's lesson: a place is shown as itself). Route logic, room ids and saves are as they were
(the hatches' ropes are iron ladders now; the end blocks above the roofs are gone, the sky is open).

- **A car** is a side view on the rails: the roof's walkway with its edge curving away under it (and vents, the dining car's stovepipe), the
  car's far wall in ribbed green cladding with a row of curtained windows (the landscape going by in each), the inside in front of it (the floor,
  the end walls, the bellows of a gangway over each opening, tables and a samovar, berths), buffers at both ends, the bogies' red wheels with an
  axle bar and the rail on its sleepers. RESTAURANT is a board along the dining car's side. The tender is an open wagon of coal with the
  locomotive's cab at its end: roof, back plate with the pressure gauge and the firebox door, the boiler rising behind.
- **It moves** (the engine's `charAnims`, MontyData: none in Monty on the Run): the landscape in the windows (a tall pine, a telegraph pole with
  its arm, a small pine, the snow) slides west a pixel a step, the sleepers two pixels a step (the nearer, the faster), the wheels turn
  their spokes; a step is every other frame, nothing shakes. No clickety-clack on the SID: the engine's sound model plays Hubbard's driver's
  effects only, none of them a rhythm of that kind.
- **Boarding** (Moscow's station, `moscow.ts`): he drops onto the platform, the last car stands at its edge, he walks through the open door and
  the train starts to roll as he steps in (`fromCol` 22: the windows, sleepers and wheels begin); the hatch's ladder in the car climbs to the roof
  and the roof goes on east to the dining car. (Before, the drop landed on a carriage roof.)
- **Checks**: `test/train.ts` (the animations: the windows' pictures move and wrap, the sleepers slide, the wheels cycle, the station's train
  stands until he is aboard, Monty on the Run has none); the bot (`siberia.ts`) now starts on the platform; `moscow.ts`'s last leg boards the train.
  Pictures: /root/projects/runstop64-shots/siberia-train/ (`test/train-shots.ts`).

## After Chris played it (2026-11-22)

- **The tunnel is a mountain** (`MOUNTAIN` in `siberia.ts`, a `picture` tunnel of 34 cells with `coversClimbs`): rock running off the screen's edge, the granite portal at its leading
  edge and another where the train comes out; it covers the roof and what stands on it (the tree too), never the car under it. One direction only, from the right (the way the train
  travels, against the scenery's way): the sleeper's second mouth is gone. The same rest, warning and pace; the sweep over a point is longer, so a hatch is where he waits.
- **The scenery runs from the moment he is in the room** (`charAnims` with no `fromCol` ran only once he was a cell inside the playfield: he comes in half off its edge). The rail and the
  wheels under a car are decorations (`underCar`), which frees two tile codes in every train room for the mountain's rock and the pine's trunk.
- **COAL COMFORT** is the coal tender behind the locomotive: an open wagon (boards, bogies, coal in steps down to the stoker's trough and up) and, at its front, the locomotive's cab (roof, window, gauge,
  firebox door), the boiler, the chimney with smoke and three big driving wheels. The mine's rope is now at column 24, up from the cab roof (and the mine's floor gap with it).
- **SLEEPER HIT to PINE TO BE WILD**: the line runs in a cutting (banks under pines at both ends) and a big pine's trunk (two cells, climbable) rises beside the roof with a bough hanging over it:
  up the tree. In the forest the trunk comes up through the ground; the other climb there is a great pine too.
- **YETI OR NOT**: one cave rock; a frozen waterfall with icicles over its foot (the pelmeni behind them), ice ledges up its face to a high stash with an icicle over it, an ice bridge, and the
  **big yeti**: four sprites (6 x 5 cells) moving as one on a loop (floor west, up the left, the bridge east, down the right): the floor is clear while it is on the bridge and the bridge while it
  is on the floor. Engine: `rigid` pieces and `facing: 'front'` in `DragonSpec`, the same machinery as China's dragon.
- **MINE ALL MINE**: the lamp's pocket is across a flooded working the cart shuttles over on a track (a bouncing float: `bounce` in `FloatSpec`); it carries him there and back. The old lift cart
  (and its two sprites) is gone, the yeti uses their pointers.
- **BORDER LINE CASE**: no right wall; the barrier closes the way.
- **Creatures** vary: a ladder guard in the sleeper, a stoker in the tender, a wolf, falling snow (timed strikes) and a diving owl in the forest, the yeti alone in its cave, bats over the working and
  across the rope, a bat sweeping the shaft's pit, an owl over the lake's island, a wolf on the woodpile's top.

## Chris's playtest note (2026-11-26)

- **SLEEPER HIT and THE GRAVY TRAIN:** "both well drawn but the enemies pose little challenge." Keep the drawing; give the
  creatures paths that cross the roof run and the corridor on a timing Monty must read (and that the mountain's tunnels
  combine with), so each car asks something of him.
- **SIBERIA YOU LATER** (Moscow's platform, moscow.ts): "the enemies are pretty poorly done. The first you can fall on it
  you are unlucky. The enemy on the roof poses no threat." The first creature must not be where Monty lands as he drops in
  (a death by luck): it starts clear of the landing and is a timing he can see before he moves. The roof's creature must
  cross the roof run so it asks something of him.
- **MINE ALL MINE:** "also no challenge." And overall: "Basically everything in Siberia and China is super easy without
  any challenge." So the follow-up is a challenge pass over every room of Siberia and China (not only the ones named):
  each room asks something (a creature on a path that crosses the way on a readable timing, a mechanism to time, a jump
  that needs judging), fair (never a death by luck, a safe spot to read the timing from), Monty on the Run's difficulty
  as the yardstick. Keep each room's drawing and ideas; no cuts.

### Why Monty on the Run is hard and these rooms are not (room-stats.ts, 2026-11-26)

Monty on the Run's creatures cover the room: a vertical patrol is a median 8 cells long (up to 19), so it sweeps the levels
Monty climbs through, and three creatures share a room built as a climb (8 ledges on 6 levels). Siberia's and China's
creatures barely move: vertical patrols of 0 to 4 cells (THE WATCHTOWER 2 and 3, THE EMPEROR'S ROOFTOPS 4, SLEEPER HIT 0),
walkers of 1 to 4 cells, mostly on the floor row; rooms of 2 to 5 ledges on 2 to 4 levels; HEAVEN CAN WAIT, NOODLE
MARKET and DON'T ROCK THE BOAT have no creatures at all. A creature that moves two cells is a post to walk round. The
pass's yardstick per room: about three creatures, at least one a long vertical patrol across the levels he climbs through,
patrols crossing the way on (not beside it), more levels, mechanisms that cost something when missed (BORDER LINE CASE's
ice and NOODLE MARKET's floor faster).
- **Icicles, everywhere** (YETI OR NOT, OFF THE BEATEN PATH, GONE WITH THE WIND): "never hard unless you stop and wait for
  them to hit you." An icicle that drops when he is under it misses anyone moving. Make them a timing to read: they shake
  and fall as he approaches (triggered a few cells ahead, so walking on runs into it), or drip and re-form on a cycle over
  the way, several in a row so a run under them is a choice of moment. Fair: the shake is the warning.
- **The reference room** (Chris, playing Monty on the Run's THE HOUSE with the rising pillars: "In MOTR, rooms like this are
  challenging with both jumps and enemies."): a deadly floor between safe ground, pillars rising and falling out of it that
  he jumps along on their timing, creatures drifting across the air above the jumps, small high ledges to the way on. The
  challenge is the combination: a jump that is hard because of what is under it AND what is crossing it. The pass builds
  rooms this way: each room's jumps and creatures overlap, never a creature in one place and the jumps in another.
- **A second reference room** (Monty on the Run's THE HOUSE with the ghost, the fridge and the plant; Chris: "interesting
  because you have that fast enemy at the bottom left and you have to worry about two enemies that cross with different
  patterns. When you come back up through the room you have to be patient and wait for the enemy to go to the right of you
  and time a pretty good jump, and then you have to jump over a pot that requires exact jumping. There are several
  interesting things that happen in this room that can cause a player to mess up and patience is definitely needed."):
  what makes it work: one fast creature among slower ones (speed varies within a room); two creatures crossing on
  different patterns so their timings combine; the room is crossed BOTH ways and is hard both ways (coming back you wait
  for the creature to pass, then a long jump); an exact jump over a small obstacle (a pot) right after the timed one; several
  separate chances to slip in one room. Patience is the skill asked: a safe spot to wait in, then a committed move.
- **Multiple paths through neighbouring rooms** (Chris: "One of the things Monty on the Run often does is provide multiple
  paths. In the room I just showed you, you have to double back, but then you need to go up through the middle section to
  get the easier path in the next room and avoid a pot. Things like that make the game much more interesting. There are
  three paths from these two rooms."): rooms are designed in pairs or clusters, not one at a time: two or three ways
  through the pair, each with a different cost (a harder jump, a longer way round, a creature to time), where the choice
  made in one room (going up through its middle) sets up an easier way in the next. Doubling back is a feature when it
  opens a better line. The pass plans each region's rooms as linked clusters with their alternative lines drawn out, and
  checks with one-way.ts and the bots that each line goes through.

## The full challenge pass (Chris, 2026-11-26, at Mauna Kea)

"Once again there's one enemy so there's no challenge. This is the problem throughout the game. You're just repeating an
enemy going left and right, a few blocks, and the levels are sparse and don't have challenges. I think that you just need
to do a full pass. Russia was perfect." Every region after Moscow (Siberia, China, Japan, Hawaii, the flight's landing, the
Andes and the Amazon, Rio, the bonus rooms) gets the pass, built to LESSONS.md "Challenge as Monty on the Run builds it" and
"Rooms glimpsed first and reached later", Moscow as the benchmark (measure its rooms with room-stats.ts: they are the bar),
every note above and in the region plans (docs/dosvidaniya-china.md, -japan.md, -pacific.md) included. Moscow untouched.

## The train as a path puzzle (2026-11-26)

Chris: the train had "really no puzzle to the train involving the paths"; the boiler room "was confusing and weird", the train "a big idea that wasn't memorable to play". Moscow (paths that combine)
is the model. The train's two lanes, the roof and the inside, now each hold half of the way off it, and the locomotive's steam is the hinge (`STEAM`, `CAB`, `VESTIBULE` in siberia.ts):

- **One pipe, two ends, one wheel.** In the gap between the tender and the cab a steam pipe blows out of its top (up from the cab's roof, across the roof's lane, higher than a jump) or
  out of its bottom (up from the footplate, across the inside's lane into the cab), never both, never neither. It starts out of the top. The wheel is in a niche over the end of the
  tender's corridor (a corridor tender, as the non-stop expresses had): a jump turns it (`switches`, levers.ts `switchUpdate`, on the hidden find `steam low`); walking under it does not.
- **The roof runs on.** The sleeper's roof no longer ends at a coal bunker: it goes east onto the tender's coal, the coal solid down to the corridor's roof. From there the steam blocks the
  cab and the wheel is seen below, out of reach (the lock before the key).
- **The inside reaches the wheel** (the ticket opens the closet's floor and the inspector's gangway, as before): along the corridor, the cab open while the steam is up top (the stoker at
  the firebox, the coin by the gauge), and the wheel. Turned, the steam blows out of the bottom across the inside's own way on: the obvious move fails, seen, and the top is quiet.
- **So the way on is round by the roof:** back west under the sleeper, up the closet, east along the roof under the mountain, sheltering in the new **vestibule** at the sleeper's east end
  (a second ladder well like the closet, its floor never opened: from the closet a run straight to the tender is caught, so the vestibule is the stop on the way), over the coal, across
  the quiet top onto the cab's roof (a bat drops over it and rises again: under it while it is up), down onto the boiler and up the tipple's ladder into the mine. The roof is crossed under the mountain three times now.
- **Never a trap:** the wheel is reached only from the inside's west side, which goes back west whichever way the steam blows; the roof's east side is reached only while the top is quiet,
  and nothing there turns it back.
- **The cab** is a cutaway box again: the roof on its back and front posts (its west end on the tender's front plate), the gauge on the front post over the firebox at its foot, the stoker; nothing in it hangs in the air. The sleeper's mountain rests a little longer
  (`SLEEPER_MOUTH`: 44, its offset 8, so the first sweep comes when it did): the closet to the pine still has to go at once (about 60 frames to spare), the closet to the vestibule about 40.
- **Gone, for Chris to confirm:** the first build's chute with the stoker riding it (now he walks the cab), the tipple's legs standing on the coal (one leg behind the boiler now), and the
  third driving wheel. The dining car's RESTAURANT lettering is gone (no words on the scenery). The sleeper's third window moved (two side by side) to make room for the vestibule.
- **Saves:** the find is new and last among the hidden ones (and uncounted), so an older save reads it unset (the steam up top, as the game starts); the room ids, ways in and the coin
  tables are as they were (the tender keeps its one coin).

Checks: `siberia-mechanisms.ts` ("the sleeper's roof run": the closet to the vestibule to the tender, and straight through caught; "the train's two lanes": the roof onto the coal, the
coal sealed from the corridors without the ticket; "the locomotive's steam": the ends, the wheel by a jump and not by walking, death in either, no way past the top, the roof never reaches
the wheel, the turned wheel shuts the cab, the roof then reaches the mine, never a trap; the joins), the bot's legs through the train (`siberia-route.ts`), `train.ts`. Pictures:
`siberia-shots.ts` (`steam-1..6.png`, `strip-steam.png`).
