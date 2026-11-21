# Do Svidaniya Monty: Siberia's room map

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
- **A drop with no way back** (`$0F`, the jetpack shafts): the shaft's floor gap lands on the lake; the village's rope goes back up.
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

Joins (rope = both ways, drop = one way down, gate = an item): I-A walk, roof. A-B walk, roof. B-C walk, roof. B-F a rope up
(a pine beside the track). F-O a walk, low. F-M a walk, high. M-S a walk, low (S's ledges want the lamp). S-L a drop. L-G a rope.
Walls (no way): A-O, C-M, C-L, G east until the ticket.

**Names** (puns, no Z, no Bond): THE GRAVY TRAIN, SLEEPER HIT, COAL COMFORT, PINE TO BE WILD, YETI OR NOT, MINE ALL MINE,
SHAFT OF DARKNESS, BAIKAL TO BASICS, BORDER LINE CASE.

### The rooms

**A THE GRAVY TRAIN** (dining car). In: left, on the roof (floor row 9, open rows 6-8), from Moscow's carriage. Out: right on the
roof. A tunnel mouth sweeps the roof from the right; two hatches (floor gaps cols 11-13 and 24-26) each with a rope down into the
dining car, whose floor (row 17) joins them: tables, a ticket inspector pacing between the ropes, a coin and a pelmeni. The inside
is a side lane under the roof (a loop: down one rope, along, up the other) and the shelter from the mouth.

**B SLEEPER HIT** (sleeper car). Roof (row 9) in left, out right. Two mouths, one from each end, a pause apart. Hatches at cols
6-8 and 14-16 (ropes down into the corridor of compartments, the inspector in it, a coin). A pine beside the track: a rope
at col 22 climbs through the ceiling gap (cols 21-23) up to F. Crossed twice: east to the tender, back west to the pine.

**C COAL COMFORT** (the tender, a dead end). In left on the roof. Coal heaps in steps (rows 9, 7, 5) up to the cab's roof where
the ticket lies; a coal-faced miner (the stoker) paces the trough under the first heap; no way on east (the locomotive).

**F PINE TO BE WILD** (frozen forest). In: the rope from B comes up through the floor at col 22. Ground lane: west to O (wolves,
a bear); east a trunk wall, a rope at col 27 up to the boughs (row 7): out east, high, to the mine; owls on the boughs.

**O YETI OR NOT** (dead end). In right, low. A cave: the yeti paces the floor; ledges up the left wall (rows 15, 12, 9) to a
pelmeni; an owl; a coin.

**M MINE ALL MINE** (mine mouth, lit). In left on a gantry (floor 7); a pit at col 9-11 drops to the gallery (floor 17); left along
it a dead end pocket with the lamp (bats); the mine cart (a lift) rises from the gallery back to the gantry; out the gallery's right
end, low, into S. Crossed twice at two heights.

**S SHAFT OF DARKNESS** (dark). In low. A rock wall (cols 12-17, rows 9-16) with three ledges up its left side and a stepping
ledge over a pit: the ledges are not shown, and not there, until the lamp is taken (a `place` effect: the platforms appear). Over
the wall (a miner paces its top), down the right, out through a floor gap (cols 25-27) into the lake.

**L BAIKAL TO BASICS** (the lake). A drop in at the right onto the rock shore (floor 12); the ice (floor 12) goes left in two
patches either side of a rock island; stand on a patch too long and it cracks (three stages: lines, wide, gone) and he falls into
the lake (deadly); a reindeer patrols so he must wait on the island; the left shore has a floor gap with the rope down to G. A fish
leaps in the water. 

**G BORDER LINE CASE** (the village). In by the rope at the left; houses; a reindeer; a boom gate at the right edge, which the ticket
lifts; a sign CHINA COMING SOON in the gap beyond (shut like Moscow's).

### Items, gates, doubling back

- **Miner's lamp** (M, the pocket): puts the ledges in S (`place`). **Ticket** (C): lifts G's barrier (`clear`). **Pelmeni** (A inside,
  O): the food in place of the cupcake. Nothing needed from Moscow but the ushanka, which he keeps (the plan: still Russia).
- Critical path: I A B (C: the ticket, back) B F (O: the pelmeni, back; boughs) M (down the pit, the lamp, the cart up) S L G (east).

### The two mechanisms

**Tunnel mouths** (A 1, B 2). A portal of rock 4 cells wide and rows 2-8 tall sweeps the roof from one end to the other at a cell
every 10 frames (36 cells: six seconds), rests, flashes its leading edge for 48 frames at the entry (the warning), and sweeps again.
Anything in its cells dies (the roof, a rope above it); under the roof (a hatch's rope, the car) is safe. He walks a cell in 8
frames, so he cannot run through it but he can outrun it. Data: `tunnels: {room, from, ...}[]`.

**Cracking ice** (L). An ice patch (cells at a floor row) counts the frames he stands on it (a jump is not standing); after 56 frames
the cells show lines, after 88 wider ones, after 120 they are gone for 240 frames and he falls into the water; the count dies away
a frame a frame when he is off. Crossing six cells at his walk takes 48 frames. Data: `cracks: {room, col, cols, row, codes}[]`.

The lamp is the region's key item, with the engine's `place` room effect; the mine cart is the engine's lift with a picture of its
own. The costume stays the ushanka.
