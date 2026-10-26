# Pendragon's pictures in the four games, and what it takes to show Dragonskulle's

Study only: nothing here is wired into play. Chris's question: ENHANCED showing, in each game, the figure Pendragon has in
Dragonskulle. Tools: `games/shared/pendragon/study/` (`collect.ts` plays the recorded routes and random bursts and records sprite 2
every frame; `atlas.ts`, `pick.ts`, `sheet.ts` draw it; `scenario.ts` drives one thing at a time; `map.ts` is the mapping below as
data). Picture numbers (#n) are the order `collect.ts` first saw them in (150 bursts of 900 frames from states along each game's
`re/routes.json`; Entombed, which has no routes file, from a state in each floor's corridors and each of its 25 chambers, 3000 frames
each; one burst in four with energy low). Preview PNGs are in the session scratchpad (`pendragon-swap/out/`, list at the end).

## What was found

1. **The sprite pointer is not the pose.** Sprite 2's pointer is $22 (picture at $0880) in all four games (a few frames $20, and
   $23 for Entombed's ghost; Blackwyche alternates $22/$20, 167,571 of its 332,068 frames). The pose is the 63 bytes the game puts at
   $0880 each step. Karnath copies them from one table ($4000-$4F40, 64 bytes apart, 62 pictures); the other three build most of
   their frames in place, so the picture's own bytes are its identity here, not an address.
2. **Same grid in all four.** Every Pendragon picture is a multicolour sprite, Y-expanded (24 wide, 21 rows doubled = 42 px tall).
   Dragonskulle's frames drop onto the same sprite without resizing. Colours, as the games set them (own / shared 1 / shared 2):
   Karnath and Entombed 7/10/6 (yellow, light red, blue: the blond wizard and the cap-and-waistcoat figure); Blackwyche 10/12/0 (light
   red, grey, black); Dragonskulle 10/5/0 (light red, green, black). Dragonskulle's figure is his face and arms in the own colour,
   his tunic in shared 1, his cape in shared 2.
3. **Blackwyche already is Dragonskulle's figure.** All 15+13 walk pictures, the stand pictures and the jump pictures are the same
   bytes as Dragonskulle's (72 of 94 frequently seen Blackwyche pictures are byte for byte Dragonskulle's). Only the tunic colour
   differs (grey, shared 1 = 12; Dragonskulle's is green, 5), and the sword swing. Nothing in Karnath or Entombed is shared.
4. **Walking is the same machine in all four.** One round of steps per way: runs of steps either side of two stand pictures, two
   frames a step. Entombed, Blackwyche and Dragonskulle have 15 pictures a round going right or left (3 steps, stand, 6, stand, 4)
   and 13 going up or down (2, stand, 5, stand, 4); Karnath 17 sideways (4, stand, 7, stand, 4) and 14 up or down (2, stand, 6,
   stand, 4). So a swap is a table, not animation work: the stand to the stand, each run to the other game's run (Karnath's longer
   runs squeezed in).
5. **Jumping has its own pictures in three games** (two a way: take-off and held), none in Karnath (no jump). **Weapons:** Karnath
   casting (one picture a way, held while the spell flies), Entombed whip (two a way), Blackwyche sword (4, 5, 4, 4: arms up, then out),
   Dragonskulle stone throw (three a way). Dragonskulle also has digging (three pictures, every way the same) and a cloak (the
   same pictures drawn hi-res, in cycling colours, a shimmer).
6. **No pictures of their own** for doors, stairs, carrying or the hurt flash in any game (a hurt is the game recolouring sprite 2).
   Not looked at: Blackwyche's trapdoors and ladders (the trapdoor flag $342A never came on in 332,000 frames; its test, `test/ladder.ts`,
   was not run for this), and deaths in Blackwyche and Dragonskulle (energy low in a quarter of the bursts; no new picture seen).

## Karnath (1984): 62 table pictures, 255 slit pictures

| What | Facing | Pictures (#) | Source |
|---|---|---|---|
| stand | R L U D | 34, 8, 2, 43 | $4B80, $4100, $44C0, $4800 |
| walk round | R | 30 31 32 33 [34] 35 36 37 38 39 55 56 [34] 57 58 59 60 | $4A80-$4E40 |
| | L | 4 5 6 7 [8] 9-15 [8] 26 27 28 29 | $4000-$43C0 |
| | U | 3 0 [2] 16-21 [2] 22 23 24 25 | $4400-$4700 |
| | D | 41 42 [43] 44-49 [43] 50 51 52 53 | $4740-$4A40 |
| casting (held while the spell flies, flag $3216) | R L U D | 40, 54, 1, 61 | $4EC0, $4E80, $4F00, $4F40 |
| death | all | #62-#316: a 1-2 px slit of him in each of the 16 colours (seen in the bursts with energy low) | none (built) |
| other | | #317 (a small yellow star), #318 (a yellow figure: not Pendragon) | |

Jump, whip: none. No door, stair or carrying pictures. Shown for 125,552 frames: the 62 table pictures are 99.3% of them.

## Entombed: 78 mapped pictures of 177

| What | Facing | Pictures (#) |
|---|---|---|
| stand | R L U D | 0, 11, 39, 28 |
| walk round | R | 14 15 16 [0] 22 23 24 69 70 71 [0] 72 73 74 117 |
| | L | 6 7 18 [11] 19 20 21 80 81 82 [11] 83 84 85 86 |
| | U | 37 38 [39] 40 41 42 51 52 [39] 53 54 55 56 |
| | D | 26 27 [28] 29 30 31 89 90 [28] 91 92 93 34 |
| jump (take-off, held; flag $3227) | R L U D | 1 2; 10 12; 59 60; 47 48 |
| whip (out, held; flag $20CF) | R L U D | 3 4; 8 9; 43 44; 32 33 |
| death | | 106 (a yellow ghost rising, own colour 7, pointer $23), 107 (the same, colour 11) |
| dark chamber (seen with $20CB at 1-3, own colour 0: all black but face and hands) | | 169-176 (the game's recolour; he is drawn black in the dark ones) |
| other | | 99 rarely seen pictures (2,544 frames, 1.6%): the steps between a stand and the next walk, and turns |

## Blackwyche: 77 mapped pictures of 215

| What | Facing | Pictures (#) | In Dragonskulle (#) |
|---|---|---|---|
| stand | R L U D | 12, 27, 1, 5 | 35, 20, 2, 6 (the same bytes) |
| walk round | R | 9 10 11 [12] 13-18 [12] 19 20 21 22 | 32 33 34 [35] 43-48 [35] 49-52 (the same bytes) |
| | L | 24 25 26 [27] 28-33 [27] 34 39 40 41 | 17 18 19 [20] 21-26 [20] 27-30 |
| | U | 37 0 [1] 52-56 [1] 57 58 59 60 | 37 1 [2] 39 54-57 [2] 58-61 |
| | D | 3 4 [5] 6 7 64 65 66 [5] 67 68 72 73 | 4 5 [6] 7-11 [6] 12-15 |
| jump (flag $3427) | R L U D | 77 78; 75 76; 121 122; 88 89 | 88 89; 84 85; 80 81; 111 112 (the same bytes) |
| sword (flag $1ED0; sprite 3 is the blade) | R | 43 44 45 46 | stone throw 65 66 67 (stand-in) |
| | L | 105 106 107 108 109 | 107 108 109 |
| | U | 112 113 114 115 | 72 73 74 |
| | D | 90 91 92 118 | 101 102 103 |
| other | | 138 rarely seen (3,460 frames, 1%): walk starts, turns; 79 and 97 (green head: a hurt colour of the figure) | |

## Dragonskulle: the reference, 76 mapped pictures of 200

| What | Facing | Pictures (#) |
|---|---|---|
| stand | R L U D | 35, 20, 2, 6 |
| walk round | R | 32 33 34 [35] 43 44 45 46 47 48 [35] 49 50 51 52 |
| | L | 17 18 19 [20] 21-26 [20] 27 28 29 30 |
| | U | 37 1 [2] 39 54 55 56 57 [2] 58 59 60 61 |
| | D | 4 5 [6] 7 8 9 10 11 [6] 12 13 14 15 |
| jump (flag $3425) | R L U D | 88 89; 84 85; 80 81; 111 112 |
| stone throw (flag $1FEF) | R L U D | 65 66 67; 107 108 109; 72 73 74; 101 102 103 |
| digging (flag $3428, every way) | | 114 115 116 |
| cloak | | the stand and jump pictures drawn hi-res in cycling colours (seen in a run with the cloak on; not in the final numbering) |
| other | | #0 (sprite 2 drawn as a yellow "go" letter pair: not Pendragon), 124 rarely seen: walk starts, turns |

The frames also appear in `dragonskulle-library.png`.

## The mapping, and what has no counterpart

| Game | Maps to Dragonskulle's | NEW FRAME NEEDED |
|---|---|---|
| Karnath | stand (4), walk (62 pictures minus the 4 casting: 58, runs squeezed 4-7-4 to 3-6-4 and 2-6-4 to 2-5-4) | casting, 4 (R L U D): there is no spell cast in Dragonskulle; its stone throw (arm out) is the nearest stand-in. Death: a slit effect, no pictures to map. Jump: none to map |
| Entombed | stand, walk (52), jump (8) | whip, 8 (2 a way): the stone throw stands in. Death: the ghost is not Pendragon, keep as drawn. Dark chambers: a colour rule (below), no pictures |
| Blackwyche | stand, walk, jump: byte for byte; only the tunic's colour | sword, 17 (4, 5, 4, 4): arms up then out; the stone throw (3 a way, arm out) stands in for the out pictures, the arms-up ones (43, 44, 112-115, 90, 91) have no look-alike |
| Dragonskulle | itself | none |

Pictures not in a table (walk starts, turns: 1-2% of frames) take the stand picture of the way he faces at that moment.

## Size and feet

The sprite is the same 24 x 42 px, so no scaling. Rows (of 21; doubled on screen):

| | Karnath | Entombed | Blackwyche = Dragonskulle |
|---|---|---|---|
| stand R/L, rows used, bottom row | 0-19, 19 | 0-20, 20 | 0-20, 20 |
| stand U, bottom row | 0-18, 18 | 1-19, 19 | 0-20, 20 |
| stand D, bottom row | 0-18, 18 | 0-19, 19 | 0-19, 19 |
| stand width R/L/U/D (px of 24) | 8 / 8 / 10 / 10 | 10 / 10 / 14 / 10 | 11 / 12 / 18 / 16 |

Dragonskulle's figure is the tallest and widest (a cape, wider shoulders). Put at the same sprite place, Dragonskulle's feet fall 1 row
(2 px) lower than Karnath's sideways, 2 rows (4 px) lower going up, 1 row (2 px) lower going down; 1 row (2 px) lower than Entombed's
going up, level otherwise; level with Blackwyche's (it is the same figure). The previews put each swapped figure's feet on the original's
feet line, so the swap's y is "the game's y, moved by the difference of the two pictures' bottom rows". Karnath's figure is the
narrowest and shortest, so the swap makes him look bigger in the room; Entombed's hat figure is about the same height.
The collisions stay as they are (the game's own sprite data, untouched; see below), so the bigger drawn figure does not change what
touches him.

## How it would be wired

A presentation-only swap in the frame's capture, like `games/shared/native/colour-cycle.ts` (the dragon flash in `combat.ts`): after
each game frame, find the capture's sprite with `n === 2`, look up its 63 bytes in the game's table (`swapsFor(game)`: bytes to a
Dragonskulle picture, built once from `map.ts`), and put Dragonskulle's `data`, colour 10, `mc1` 5, `mc2` 0 and a y moved by the feet
difference into that capture entry (a capture entry carries its own colours, so the shared registers are not touched). Nothing is
written to the machine: the game's memory, its hardware collisions ($D01E, kept at each game's collision byte), saves and the
combat hooks all stay the game's. Only in ENHANCED (one more row in each QOL.md: the figure is Dragonskulle's). The ending's
recorded figures read the capture, so the reward show would show the same figure with no change.

Rules to settle when it is built: (a) a hurt flash or the dark chambers change sprite 2's own and shared colours; the swap should
keep that by role (face and hands, tunic, cape) rather than paint Dragonskulle's colours over it: dark chambers all black but the
face and hands, a hurt the game's flash colours on the tunic; (b) a picture not in the table shows the stand of its facing; (c) the
jump needs no state (the jump pictures are in the table); (d) Blackwyche needs only the tunic colour 12 to 5 and the sword.

## Work estimate: frames to draw

| Game | Mapped with no drawing | To draw for a proper look | Without drawing |
|---|---|---|---|
| Karnath | stand + 58 walk pictures (all four ways) | 4 casting (one a way, the arm out and a hand for the spell) | the stone-throw arm-out as the cast: 0 |
| Entombed | stand, 52 walk, 8 jump | 8 whip (2 a way: arm back, arm out) | the stone throw as the whip: 0 |
| Blackwyche | everything but the sword (colour change) | 17 sword (arms up then out, the 4 ways; or 8: 2 a way, reusing the held one for the rest) | the stone throw for the out pictures; the arms-up ones have no match |
| Dragonskulle | n/a | none | |

About 30 new frames (4 + 8 + 17), 20 if Blackwyche's sword is cut to two a way, and none if the stone-throw stand-ins are accepted.
The code is small and the same for all three (a table per game, one hook, a test that every picture the game shows maps, run over the
same routes as `collect.ts`): about a day for the three games with the stand-ins, a day more for the 20-30 drawn frames. Karnath's
death slit and Entombed's ghost keep the game's own pictures. Preview PNGs (all four were looked at): `karnath-poses.png`, `-rooms.png`,
`entombed-poses.png`, `-rooms.png`, `blackwyche-poses.png`, `-rooms.png`, `dragonskulle-library.png`, `atlas-<game>.png` (every
picture, numbered).

## Built (ENHANCED)

The swap is in `figure.ts` (see AGENTS.md); `study/tables.ts` makes the tables from this study. Karnath's cast and Entombed's whip are drawn in `figure-drawn.ts` (his stand with the arm painted in, pixel by pixel). Blackwyche's sword is not redrawn: its pictures are already this figure (same body and line), so they stay and only the tunic takes his green. Karnath's death slit and Entombed's ghost stay as the game draws them.
