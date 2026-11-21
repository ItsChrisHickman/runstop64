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
row 0   C  WALL YOU NEED     .                   G  ROOF AND READY    H  WILLOW PATTERN
row 1   T  TOWER OF POWER    E  STALL IN LOVE    F  GATE EXPECTATIONS J  JUNK FOOD
row 2   A  WALL'S WELL       D  ALLEY OOP        .                    .
```

Siberia's "BORDER LINE CASE" (columns 7, row 2) opens east onto A (its planks and sign go: the barrier the ticket lifts stays).

Joins (rope = both ways, gate = an item): G(Siberia)-A walk, low. A-D walk, low (a tunnel through the wall). A-T a rope up through A's
ceiling (reached by a stair of ledges up the wall's flank and along its top). D-E a rope up through D's ceiling into the street. T-E two walks,
the hall's (low) and the walkway's (high). T-C a rope up through the watchtower's roof, shut by a trapdoor (gate: the key). E-F a walk, low. F-G
a rope, up through the gate's inner court (gate: the rice hat, doors across the court). G-H a walk, high (the palace ridge to the garden's bank).
H-J a rope down through the bank's well. J-east a raft out to the junk (gate: the bamboo), then COMING SOON. Walls (no way): C-G, T-west, E-north,
D-east, F-J, G-west, H-east, J-west.

**Names** (puns, no Z, no Bond): WALL'S WELL, ALLEY OOP, TOWER OF POWER, WALL YOU NEED, STALL IN LOVE, GATE EXPECTATIONS, ROOF AND READY,
WILLOW PATTERN (Chris: exactly that), JUNK FOOD.

### The rooms

**A WALL'S WELL** (the wall's foot, outdoors, turf and hill). In: left, low (floor row 17, open rows 14-16). The Great Wall stands across the
right of the room, a block of brick (cols 13-31, rows 9-13) with its top a walkway at floor 9 and merlons along it, and a tunnel through it
at the foot (rows 14-16): the low way east into D. A stair of three floating stone ledges (floors 15, 13, 11, cols 4-12) climbs the flank onto
the wall's top; along it to a rope at col 25 climbing through the ceiling (gap cols 24-26) into the tower. A panda in the bamboo at the left on
the ground, a kite over the wall. 2 coins. The two lanes (the tunnel under the wall, the walk on top of it) are crossed once each.

**D ALLEY OOP** (the hutong, a narrow brick alley). In: left, low. A rope at col 4 (ceiling gap cols 3-5) climbs to the market. Ground lane
east to a closed end; floating shelves (floors 15, 13, 11) climb in the middle to a roof ledge (floor 9, cols 17-29) under a beam from which
a **string of firecrackers** hangs (cols 19-28); the **key** lies on the ledge's far end. A bicycle on the ground, a pogo-stick monk bouncing at
the east end beside a coin, a caged cricket hopping on the shelves. Off the ledge's west end is a drop to the lane. Dead end with the key.

**T TOWER OF POWER** (the watchtower's hall). In: by the rope from A (floor gap cols 24-26, rope col 25: the arrival is on the hall's floor);
out: east, low (rows 14-16) or east, high (rows 6-8) from the walkway. West: a stair of ledges (floors 15, 13, 11) up to the walkway (floor 9,
cols 12-31), which runs over the hall to the high way east. A rope at col 16 under a trapdoor (ceiling gap cols 15-17, shut) climbs to the wall top.
A terracotta warrior paces the hall's floor west of the rope, a paper lantern with a face bobs over the walkway. 2 coins.

**C WALL YOU NEED** (the wall's top, a dead end; night, a beacon). In: the floor gap (cols 15-17, rope col 16) from the tower. A winding
climb: right up three stone ledges from the floor (floors 15, 13) to a long walkway (floor 11, cols 6-29) back west, up the left (floors 9, 7) to the
beacon platform (floor 5, cols 9-29), east along it to the **rice hat** at its far end and a **dumpling** on the way. A kite, a monk on a pogo stick
and a terracotta warrior. 2 coins.

**E STALL IN LOVE** (Beijing's market street at New Year). Two ways in from the tower, low (street, floor 17) and high (a row of stall awnings,
floor 9, cols 0-10, a gap with a rope at col 12 down to the street); a floor gap with a rope at col 8 down into the hutong; out east, low, to the
gate. Lanterns, banners, stalls. **The New Year dragon** loops through the right half of the room (six sprites on one path, see below): over the
top, down the right, along the street, up the middle. No creature but the dragon. 2 coins (the awnings, the street under the dragon).

**F GATE EXPECTATIONS** (the Forbidden City's south gate). In: left, low. An outer court (a stone lion alive, paces it) and the gate tower across
the room, its doors across the court (floor to row 11: six rows, higher than a jump rises): **shut until the rice hat is taken** (the doors are gone:
`clear`). Inside, a court with a guard and a rope at col 24 (ceiling gap cols 23-25) up onto the palace roofs. 2 coins.

**G ROOF AND READY** (the palace's roofs and courtyards). In: the rope from the gate (floor gap cols 23-25: the arrival is on the courtyard). The
courtyard runs west to a dead end with a **dumpling** and a coin past a lantern and a stone lion; a stair of glazed roof ledges (floors 15, 13, 11) at
the right climbs the eave onto the ridge (floor 9, cols 19-31), which runs east, high, to the garden (rows 6-8). 2 coins. Two lanes (the court, the
roofs) crossed once each.

**H WILLOW PATTERN** (the imperial garden, all blue and white, as the plate). In: left, high (rows 6-8) onto the bank (floor 9). A well in the bank
(floor gap cols 2-4, a rope col 3 down: to the quay); steps down (floors 11, 13) to the shore (floor 15); **stepping stones** over the river
(water, a leaping carp) to the island on the far side: shore cols 11-13, stone 17-20, stone 24-26, island 29-31, the water between three, three and
two cells wide. An **arched bridge** crosses high over the river (a decoration: the deck is far over his head, rows 3-4); **three crouching figures** on it
reach down with both arms over the three gaps on a timing (see below). Two doves over the river, a willow, a pagoda. The **bamboo pole** lies on the island,
which is the end of the stones: back across, to the well and down the rope into J. 1 coin.

**J JUNK FOOD** (the river's quay, at its mouth). In: the rope from H (ceiling gap cols 2-4, down onto the quay, floor 17). The quay runs east
(a bicycle) to the river (water, cols 20-25); across it the **junk**, moored (cols 26-31, hull and mast), and the way east, shut with a sign
JAPAN COMING SOON. Without the bamboo the river is five cells of water; with it a raft of bamboo is poled across (`place`). A carp leaps in the river (a
timing for the raft). 1 coin.

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

## As built

(The build, where it differs from the design above, and the checks. Filled in when China is built.)
