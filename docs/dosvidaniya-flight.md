# Do Svidaniya Monty: THE FLIGHT, Hilo to the Andes

Approved by Chris 2026-11-24 (HANDOFF.md, "Proposed to Chris"). It redeems Auf Wiedersehen Monty's flight (`games/awm/src/flight.ts`:
40 seconds, one plane on a loop) and replaces the cut where Monty walked into a cargo plane's hold and dropped straight onto the mountain.

## The story

Monty takes the parachute from the high shelf under Hilo's crater rim (up the east wall's rope past the long ledge, past a strutting
rooster), climbs to the airport's apron and touches the yellow mail biplane waiting there: it takes off with him (without the parachute,
NO FLYING WITHOUT A PARACHUTE, and nothing happens). He flies east over the Pacific for about 75 seconds. The tail of the flight belongs to Viktor: his black
plane copies Monty's path and closes in. As the Andes rise ahead, Viktor clips Monty's tail. Monty bails out and parachutes into JUMP
FOR JOY. Viktor wins this round, so the Spy vs Spy tally goes into Rio at Monty 2 (the train, the ship) v Viktor 1 (the plane).

## Three legs, three rooms

Each leg is a room of its own, so the shared rules hold without special cases:
- A death restarts the leg as he came into it (`respawn`, `lives.ts`), never the previous leg.
- Autosave, continue and the map's travel see an ordinary room.
- The legs are a region of their own, THE SKY (`regions.ts`: columns 20-22, row 0), so the pause map shows the Andes (rows 2-6) and the sky
  each at the normal cell size, and its heading names THE SKY.
- The music is Auf Wiedersehen Monty's main theme (tune 0, Hubbard and Daglish), from that game's own .sid: a nod to the third game and the
  one exception to the one song (Chris, 2026-11-24; `music/regions.ts`, `SidPlayer.useFile`). It starts from its beginning on taking off and
  plays on through a death or a restart in the sky, and a save in the sky continues with it; into the Andes, Hubbard's song comes back in its
  Andes version, a clean change (the phrase crossing works only between versions of one song). No sound effects play over it.

The rooms are on a row of the exit grid nothing else touches, so no room beside them can be walked or jumped into:

```
            col 20              col 21               col 22
row 0   L1 THE MAIL RUN ==> L2 STORMY WEATHER ==> L3 ON HIS TAIL        (ids 79-81, the clock moves him on)
row 1   (empty)
row 2   F1 JUMP FOR JOY <== bail-out from L3   (west of it, [2,19], is empty: the hold was cut)
row 3   (Hilo at [3,19]: its apron's biplane takes off into L1)
```

| Leg | Frames | What is in it |
|---|---|---|
| L1 THE MAIL RUN | 1250 (25 s) | Out over Hilo's coast and the sea. Gull Vs (straight passes at set heights), Kilauea's ash plume (a column that sweeps past, with clear air above it), a frigatebird (a screech as it comes in high, then a dive across), a slow albatross. One coin. |
| L2 STORMY WEATHER | 1250 (25 s) | Under a storm front. Its clouds flicker (the warning) before lightning strikes down a column. Downdraft gusts are shown by streaks and push him toward the sea. A waterspout sweeps past with a gap above it. Three coins: one on the safe line, two in the gaps between bolts. |
| L3 ON HIS TAIL | 1250 + the clip (about 27 s) | Viktor's black plane follows his exact path, starting 3 s behind and closing to under a second. Touching him is a death. Gulls and lightning that Monty just slips past catch Viktor when he copies the line, and each one knocks him back. The Andes' peaks rise along the bottom. At the end Viktor surges and clips his tail. Monty bails out: the plane tumbles away, the canopy opens, and he drops into F1 from the top. |

Total: about 77 seconds.

## How Monty flies

He flies with Monty on the Run's jetpack feel and has no gun:
- Hold up to climb a pixel a frame; let go and the plane sinks a pixel every other frame; hold down to dive a pixel a frame.
- He steers sideways at his walking pace.
- He stays in the leg's box (rows 1-16), so he never leaves the leg by an edge.
- When the leg's clock runs out, he flies on into the next leg where he is, at the same place on the screen. The joins are seamless.

## Sprites (the C64 budget: 8)

| Sprite | What |
|---|---|
| 3 | Monty, sitting in the cockpit (his own picture) |
| 2 | the biplane over his legs, three pictures (level, climbing, diving); a tumbling wreck and the canopy at the bail-out |
| 7 | his lei (the costume's overlay, as everywhere) |
| 4 | Viktor's black plane (L3; the creature in slot 0) |
| 0, 1, 5, 6 | birds (rollers), a pass each on the leg's clock |

The plume, the waterspout, the storm, the bolts, the streaks and the peaks are characters, not sprites. The parallax bands are AWM's
three bands as repeating strips of characters that slide at their own speeds (`charAnims` scroll rings):
- far clouds: half a pixel a frame;
- near clouds: a pixel a frame;
- the sea or the peaks: two pixels a frame.

The sky is black, as every room in this game is. The bands are dim blue, so the hazards read in front of them.

## In the engine (data, not a fork)

- **`planes`** (new module `games/montyotr/src/planes.ts`, a list in `MontyData`, empty for Monty on the Run). Each leg says:
  - its room and its length;
  - the box he flies in;
  - where the clock sends him: the next room east, or a bail-out to a cell, with the clip's timing.
  `planeLook` gives the plane's pictures. A leg is drawn like the parachute's canopy: sprite 2 over Monty, no part of the collision check.
- **`rollers`** (existing) gain `passes` (a bird comes once, or a few times) and `sound` (the frigatebird's screech as it comes
  in). Two rollers may share a sprite at different times.
- **`currents`** (existing) gain `dy`, for a gust that pushes up or down. The plane is carried as the swimmer is, and the streaks are
  harmless pulses, as in Hana.
- **`pursuers`** (existing) gain `close` (his lag shrinks over the leg, down to a least) and `knockedBy.setback` with
  `knockedBy.rollers` (a bird or a bolt knocks him back by that many frames instead of ending the chase). The leg-3 pursuer's `until`
  is the new hidden find "viktor won the plane", which the clip takes.
- **`tunnels`** (existing) are the plume, the waterspout and the Andes' peaks (`harmless`, so nothing kills).
- **`pulses`** (existing) are the lightning: the cloud cells flicker during `warn`, and the bolt below is live.
- **`boardings`** (new, a short list in `MontyData`, planes.ts `boardUpdate`): a plane waiting in a room. Monty's top left in its box with
  the item it needs taken, he goes to the cell it names (L1), where he is on the screen; without the item its hint shows (once a touch, the hints
  assist) and nothing happens. (It replaced `ways`, an edge that led elsewhere: the cut hold's rear door.)
- **Restart in the air:** in a flight or plane room the way he came in is a place to restart from, since he does not stand there.
  F1 is now entered from the top.
- **The tally** (`tally` in `MontyData`, null for Monty on the Run), drawn in the score row's centre (columns 15-21):
  - Monty's face;
  - three stars, one per round (the train, the ship, the plane): grey until settled, then in the winner's colour (Monty's orange,
    Viktor's white);
  - Viktor's silhouette, dark grey while he is away and white while he is due (`encounterState(g).due`);
  - in HARD, the lives under the stars.

  Rounds are finds: train = "viktor off the train", ship = "viktor overboard", plane = "viktor won the plane", with the winner each
  find means.

## In Do Svidaniya Monty

- **`games/montyworld/src/sky.ts`:** the three rooms (ids 79-81), their bands, birds, plume, storm, gusts, spout, peaks and Viktor.
  Their art is in `art/sky-*.ts`.
- **F1 JUMP FOR JOY:** the cargo plane's tail and ramp go, and a cliff closes the west edge. Viktor's cameo in the doorway goes
  (he is in his plane now).
- **Hilo** (pacific.ts): the cargo plane's belly and hold are gone (cut 2026-11-24: a parked plane drawn as if flying made no sense). The
  biplane stands on the apron (a decoration, `skyBiplane`: the flying picture, cockpit empty). The parachute is on the rim's high shelf
  (floor 5, columns 20-26), reached only on up the east wall's rope past the long ledge (the rim's spur shuts it from the apron), with the
  hold's coin at the rope's head and the hold's rooster strutting there; the hold's crates are gone. The coin and the parachute keep the hold's
  places in the tables, so saves keep them; a save made in the hold carries on on the apron (`RETIRED`, `carryOn` in save-migrate.ts).
- **Saves:** the new rooms come last, so no coin or find of a shipped room moves, and older saves load as they are. The new find
  comes after the hidden ones.

## Tests

- `games/montyworld/test/flight.ts`: the flight played by a bot from the biplane on Hilo's apron to F1, in EASY and HARD. It also checks:
  - a death in a leg restarts that leg;
  - a save made in L2 continues in L2;
  - Viktor's touch kills, and a bird knocks him back;
  - the clip takes the find.
- The tally reads Monty 2 v Viktor 1 with the train and the ship escaped and the flight flown.
- Renders: each leg and the HUD (`flight-shots.ts`).
- `music-sky.ts`: the theme into the sky from its start, on through a death, Hubbard's Andes version clean after it, from a save in the sky.
- `pacific-mechanisms.ts` (Hilo): the parachute on the shelf past the rooster, the shelf only up the rope, the biplane with and without it.
