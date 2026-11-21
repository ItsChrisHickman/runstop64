# Do Svidaniya Monty: Moscow's room map (for Chris to approve)

Design only, no rooms built. Pictures (outside the repo, regenerate on request):
`/tmp/claude-0/-root/0f9120bc-8590-4340-8ed6-b1e28bd22f4e/scratchpad/moscow-map/motr-graph.png` (Monty on the Run's graph)
and `.../moscow-map.png` (Moscow, drawn the same way).

Rows below are the playfield's 0 (top) to 19 (bottom); the floor you stand on is about row 17, "high" is rows 2-6, "mid" 7-11,
"low" 12-17. Columns 0-31. Numbers are targets for the builder, the bot checks the real thing.

## Part 1: how Monty on the Run's rooms open and join

Read from the data (`motr.json`: tile maps, exit grid) by a script and checked by eye on the first 22 rooms. Joins between
rooms are where both neighbours have an opening at the same height or column.

**Size.** 52 rooms: 51 on a 23 x 6 grid, plus the dock (`$30`) off it. 54 joins: 36 walks over a side edge, 13 ropes
through a floor and ceiling gap, 5 drops, 1 opened by an item. 10 dead ends, 28 rooms with two joins, 13 with three or four.
Four independent loops.

**The big finding: rooms are not boxes with a door each side.** Where a room opens matters more than whether it does.

- Side openings sit at different heights in the same room: room `$02` opens high (rows 2-4) and low (7-16) on both sides, but a
  tower (cols 15-22) fills the low way, so you climb a rope at col 8 and cross over the top. `$00`, the start, has one opening
  only, low on the left.
- Only 15 of 51 rooms are plain left-to-right crossings (and 5 of those are the C5 street). About 26 rooms have a way
  through the ceiling or the floor, and in half of them the rope is not on the way in and out of the same side:
  `$05` is entered at the right and left through the floor at the far left (a 14-row rope, col 6); `$06` and `$09`
  leave through two different floor ropes; `$0A` is entered through the ceiling and left at the left edge.
- **Ten rooms have two separate ways through, at different heights, sealed from each other** (`$04 $06 $09 $0C $0D $10 $12
  $19 $28`, and `$14` once its walls are gone). You cross the same room twice, at two heights, usually in opposite
  directions. The clearest: `$05` drops you through `$0C`'s ceiling into a sealed high corridor (rows 2-4) that runs right
  into `$0D`'s high lane (rows 1-4) and on to `$0E`, a dead end whose rope (col 16) hairpins down into the low lane. You
  come back left through `$0D`'s low lane (rows 7-17, the cake), then `$0C`'s low cave (rows 6-17) to a wall the cake just
  opened. Same two rooms, crossed twice, never touching.
- Ropes are 13 of the 18 vertical joins; what keeps them from feeling alike is the long rope (up to 19 rows), two ropes
  in a ceiling that go to different places (`$04` cols 7 and 24, `$10` floor cols 9 and 25), a rope the whole room hangs
  on, water pits and stepping stones (`$07`), ledge staircases (`$13`), pipe lattices where any direction goes (`$15-$17`),
  bridge rooms with no floor until an item (`$1C`), open shafts (`$1D-$1F`, the jetpack). Drops (no way back up) are only in the
  jetpack shafts and the last rooms.
- Dead ends (10): start `$00`, `$0B` (a fatal smoke stack), `$0E`, `$11`, `$13` (key item 1), `$1B` (key item 5), `$23` (jerry
  can), `$29` (cake), `$2B` (key item 10), `$2D` (cake). Six hold something.

**The route from the start to the jetpack (28 steps, 22 rooms, the red line on the picture).**
`00 01 02 03 04 05 | 0C 0D 0E | 0D 0C | 0F 10 12 13 | 12 14 15 16 17 1A 19 1B | 19 1A 17 1C 1D`.
It goes left along a high lane, down a rope through the floor, crosses a high corridor to a dead end, doubles back along a
low lane (taking the cake that opens the wall), drops through a well (`$0F`, `$10`, `$12`) to a dead end with an item
(`$13`) and doubles back out of it, goes through the gated chamber (`$14`) and the pipes, up a rope to a wasp room, to a
second dead end with an item (`$1B`) and out the way it came, then on. Rooms passed more than once: `$0C $0D $12 $19 $1A $17`.

**Hubs and entering from more than one side.** 41 of 51 rooms have two or more joins. `$01` joins four ways (left, right,
two ropes up and a rope down); the top loop (`$01 $09 $08 $07 $06 $04`) leaves it by a rope and comes
back to the main lane three rooms along.

**How gates shape the order** (all in `ROOM_EFFECTS`): cake 0 (in `$0D`, the low lane) removes the wall on `$0C`'s left
edge; key 1 (`$13`, dead end) opens `$14`'s inner wall; cake 2 in `$14` plus the gas mask opens its left wall; item 3 (`$17`)
sees off the wasp in `$19`; item 5 (`$1B`, dead end behind the wasp) puts the floor in `$1C`; item 10 plus the rum
moves the queen in `$2F`. A chain: each item is a dead end or a doubling back away from the next gate, found after you have seen
the gate.

## Part 2: Moscow

Nine rooms, a block 4 wide and 3 high (row 0 roofs, row 1 streets, row 2 the metro). In the world grid it takes columns 0-3.

```
        col 0        col 1         col 2         col 3
row 0     .        F  GUM        D  ONION DOME   K  KREMLIN
row 1   A  START   B  STREETS    C  SQUARE       I  STATION OUT
row 2     .        G  HALL       H  PLATFORM       .
```

Joins (rope = both ways, drop = one way down, gate = opened by an item):
A-B walk, high. B-C two walks, one high, one low (two lanes in C). B-F rope. B-G a manhole drop and a grating rope.
C-D rope. C-H a drop. D-K walk, high. K-I a drop. G-H two walks: a high gallery way and a low way through the turnstile (gate).
Walls (no way): F-D, C-I.

**Names** (Monty on the Run's manner: a pun on the place, no Z, no Bond): MOSCOW MOLE, SNOW PLACE LIKE HOME, SEEING RED,
ONION DOME SWEET DOME, KREMLIN GREMLINS (a nod to Gremlin Graphics), STUCK LIKE GUM, ESCALATING TENSIONS, UNDERGROUND MOVEMENT,
SIBERIA YOU LATER. "Rio or Bust" stays for Rio.

### The rooms, each its own shape

**A MOSCOW MOLE** (the start). Only way out: the right edge, high (rows 4-6). He starts on the platform floor at the left
facing right. A parked train fills the floor lane to the right (solid rows 9-17, cols 12-27): luggage trolleys make three steps
(cols 5-11, rows 14, 12, 10) up onto its roof (row 9), cross the roof, climb a signal gantry ledge (row 7) to the opening. Pigeon
patrols above the roof. Shape: climb over, out high. 1 coin on the roof.

**B SNOW PLACE LIKE HOME.** The hub, six openings of four kinds. In: left high (rows 4-6), landing on a shop awning (row 7,
cols 0-9), step off its end. Out: right high (rows 3-5, a fire-escape walkway, reached by crates at rows 12 and 9) and right
low (rows 14-17, the street); a rope up through a ceiling gap (cols 19-21, to F); the open manhole, a floor gap (cols 6-8, a
drop into G); a grating, a floor gap (cols 26-27) with a rope (two-way to G). Two icicles hang from a shop sign beam (row 8,
cols 11-17) over the street between the manhole and the exits. 2 coins (one under the beam, one on the walkway).

**C SEEING RED.** Two lanes that never meet, a terrace slab (row 6) between them. Low lane: in left (rows 14-17), along the
cobbles past two matryoshkas, ending at an open drain, a floor gap (cols 20-22): a drop into H. High lane: in left (rows 3-5)
onto the Kremlin wall's terrace, along it to a flagpole rope (a ceiling gap cols 25-26) up to D. Right wall solid (the station
fence). You cross it once at each height, to different places. 1 coin per lane.

**D ONION DOME SWEET DOME.** Arrive through the floor on a rope at the right (gap cols 25-26). The domes are solid rounded
ledges. Go left along the low lane under the dome eaves (two icicles, cols 12 and 18), climb the domes left (rows 13, 10, 7, 4)
to the highest, a cake on its top, then run right across the dome tops (rows 3-5, gaps to jump) to the right edge (rows 3-5), above the
rope you came by. Shape: a U-turn up the room. Left wall solid. 2 coins.

**K KREMLIN GREMLINS.** In: left (rows 3-5) onto the wall-top walkway (row 6). An arch with a low ceiling (cols 6-13) holds the
guard, who paces the whole arch (it fills the walkway: he cannot be jumped), one icicle at the arch's mouth (col 4). Past the arch
the way on is a floor gap (cols 15-18): a drop into I. Past the gap a stub of walkway (cols 20-30) with a coin. Nothing else opens.
Shape: a walk-through that ends in a drop.

**I SIBERIA YOU LATER.** Drop in through the ceiling (cols 15-18) onto the roof of a long carriage (solid row 9, cols 8-31). Out:
the right edge (rows 6-8) along the roof, into Siberia. A pocket at the left (cols 0-7, floor) is reached by stepping off the roof's
end, with a coin; climb luggage back up. No way back up to K (the pause map's travel covers it).

**F STUCK LIKE GUM** (dead end). One opening: a rope up through the floor (gap cols 19-21). Two levels: a ground floor (rows
14-17) running left to stairs of ledges (rows 12, 9) up to a gallery (row 8, cols 0-14). The metro token lies on the gallery. A
Mole Crusher (cols 10-12) stands across the ground floor, crossed on the way in and out. 2 coins.

**G ESCALATING TENSIONS.** Two heights, entered at both. High-left concourse (row 7, cols 0-12): in by the manhole's drop
(ceiling gap cols 6-8). A gap in the concourse (cols 13-24) holds the down escalator: it carries him to the lower floor (rows
14-17), which runs the full width. High-right stub (row 7, cols 25-31): in from H's gallery (right edge rows 5-7), a step down
to the lower floor. Lower floor out: right (rows 14-17) through the turnstile (cols 28-29: bars, taken away by the token) to H's
low lane; and the grating rope (ceiling gap cols 26-27) up to B. You cannot go back up the escalator. 1 coin.

**H UNDERGROUND MOVEMENT.** Two sealed lanes, a slab (row 8) between. Low lane: in from G's turnstile (left, rows 14-17); a Mole
Crusher shaft (cols 6-8); a shelf with the ushanka (cols 10-12, row 13, a jump from the lane); the up escalator's foot (cols
16-18) rising right to the gallery (cols 26-28). Gallery (row 8): the escalator's head at the right, the drop from C landing at
cols 20-22, a cake on a high ledge (row 4, cols 12-14), and left, the edge to G's stub (rows 5-7). Gallery by itself is a
dead end if you come in from C without the token; the low lane is a dead end pocket whose only way out is the one-way ride.
2 coins (shelf, gallery).

### Items, gates, doubling back

- **Metro token** in F (a dead end, behind a Mole Crusher). Taking it removes the turnstile bars in G (`roomEffects clear`, as
  key 1 clears `$14`).
- **Ushanka** in H's low lane (a pocket behind a Mole Crusher and a turnstile). Taking it removes the guard in K (`removeEnemy`,
  as the queen) and Monty wears the hat from then on (art and a costume in the engine, below).
- 2 cakes (D's top dome, H's high ledge), 14 coins (A1 B2 C2 D2 F2 G1 H2 I1 K1). No first aid kit needed: ENHANCED has unlimited lives.

**The shortest way out (12 steps):** A, B, F (token), B, G (manhole drop, down the escalator, through the turnstile), H (crusher,
ushanka, up the escalator), G (from the gallery), B (grating rope), C (high lane), D (rope, U-turn), K (guard steps aside),
I. B is crossed three times, G twice. A first-time player will also try C's low lane (the drop into H's gallery, a cake), the
guard in K (turned back), and the turnstile in G (shut): each a look at a gate before the item.

**Loop and dead ends:** one loop: B, G, H gallery, back by the drop from C. Dead ends with items: F (token), H's low lane (ushanka).
Start A and the last drop into I are the fixed points.

### The two mechanisms

**Escalators** (G down, H up). A ride in Monty on the Run's manner of the lift and the crusher head: step on the foot (a
one-tile cell at the bottom or top, moving treads drawn at once) and a gameMode-1 ride carries him up or down the slope at a
fixed speed, no control, off at the other end onto the landing. G's run: 12 columns, 8 rows, 1 pixel a frame, 96 frames (2 s)
the whole way. H's: 12 columns, 8 rows. You cannot go back up a down escalator. The timing to learn: how long the ride takes, and what waits at the landing
(a creature's patrol, set so a clear landing is fair and visible all through the ride). The treads animate by scrolling the
escalator's characters, as the crushers' shafts do. Build: a new `escalators: {room, foot, head}[]` in `MontyData`, ride
state like `piledriverUpdateRide`/`liftMovementUpdate` in `mechanisms.ts`, a test of both ends; the bot's search state
holds the ride. Needs added: yes, about 80 lines and the treads' tiles.

**Icicles** (B 2, D 2, K 1). Each hangs from an eave, visible all the time. When Monty's two-column footprint overlaps its column,
it shivers 24 frames (it flickers: the warning), then falls 4 pixels a frame and breaks on the floor (8 frames), and grows back
over 60 frames (not armed while it grows). Monty walks 1 pixel a frame, so he is in its column for 24 frames when running
through: running through is safe (28+ frames before impact), stopping or turning back in the column is not. Two ways: run
under, or step in, step back out and let it fall, then pass. It kills like a crusher's head (event 1). Build: new `icicles:
{room, col, row, drop}[]`, a small state machine beside the crushers (`piledriverRoomInit`/`piledriverCheckTiles` pattern) with
the icicle drawn as sprite 1 or 2 (the lift's and the cloud's, free in these rooms: two a room); the numbers are starting
values for the bot to check.

**Mole Crushers:** F and H, the engine's own (RoomSpec `crushers`). No timed warps, no vehicle section.

**The costume.** The ushanka is an item whose pickup switches the game's Monty frames to ones with the hat; the engine reads
the costume from the data (a per-game table), the art agent draws the frames. Not in this design's scope but it is the one
engine change besides the two above.

### Decisions for Chris

1. The two lanes in C and H and G's two heights: the metro and the square are crossed at different heights (the answer to
   "ladders up and down"). Only 5 of 9 rooms have a rope; B-G (manhole), C-H and K-I are drops, D is a U-turn, A a climb over.
2. The last step is a one-way drop into I.
3. Escalators are rides you cannot leave; icicles are a warning plus a fall, not a random one.
4. The key items are the token (turnstile) and the ushanka (guard): two, not three.
