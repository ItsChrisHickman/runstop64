# Do Svidaniya Monty: Rio's room map, and the ending

Region 7 (docs/dosvidaniya-plan.md), pre-production: design and art as data, no engine or room code. Read docs/dosvidaniya-moscow.md
(how Monty on the Run's rooms open and join), docs/dosvidaniya-siberia.md (the method and the bar) and, for the lesson that governs
every picture here, the plan's "Lessons from Chris's play": a place is drawn as itself (a cable car on its cable, a restaurant with
its tables and skewers, a street parade with its floats), never rooms with words on. Rows 0 (top) to 19, columns 0-31; Monty stands
on a floor row F with his body on F-2 and F-1, and a way out at a side is open at the same rows as the way in of the next room.
Numbers are starting values for the bot to check.

Entry: the Amazon's last room (R), east edge, high: the riverboat's quay. There is no exit: the beach is the ending.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points Rio takes:

- **A room crossed twice at two heights, the lanes sealed from each other** (`$04 $06 $09 $0C $0D`): Lapa's arches (the street under, the
  aqueduct's tram track over), the churrascaria (the dining floor, the mezzanine of the samba show), the favela's steps and rooftops.
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the aqueduct's far end (L: the key to the city), the
  churrascaria's stage (W: the headdress), the pier (H: skewers). Three.
- **A way that only opens once an item is found elsewhere** (cake 0, key 1, item 3 and the wasp): the cable car needs its key, the
  parade's steward wants the headdress. Two gates, the costume one the region's.
- **A rope that leaves a room the other side from where it came in** (`$05`, `$0A`): S's rope up into L's street, C's rope down into F.
- **A lift** (`$05`, `$0D`): the cable car, on a slope.
- **Loops**: L-S-W-F-C-U-S (the long loop: the cable car up, the rope down the hillside, the restaurant, the quay's steps) and
  C-T-P against C-F-P.

## Part 2: Rio

Eleven rooms, a block 4 wide and 4 high (the region's four columns of the world grid; the last room is the beach, under the Redeemer):

```
          a                     b                        c                        d
row 0     .                  U  LOAFING ABOUT         C  OPEN ARMS             T  MONKEY BUSINESS
row 1   H  QUAY TO THE CITY  L  LAP OF HONOUR        F  HOUSE OF COLOUR       P  BEAT THE DRUM
row 2     .                  S  SUGAR RUSH            W  STEAK YOUR CLAIM      Q  FLOAT YOUR BOAT
row 3     .                     .                        .                     B  RIO OR BUST (the beach)
```

Joins (rope = both ways, gate = an item):

- Entry: H, left edge, high (rows 4-6), from the quay. H-L: walk, low. L-S: a rope down through L's floor gap, both ways.
- S-W: walk, low (east). S-U: **the cable car**, up the slope to S's upper station at its right edge, high, which is U's left edge
  (gate: the key to the city); the ride goes both ways. U-C: walk east along the saddle, high.
- C-F: a rope down through C's floor gap. C-T: walk east, high. T-P: a rope down. F-P: walk east, low. F-W: a rope down through F's floor
  gap. P-Q: east, low (gate: the steward wants the headdress). Q-B: a rope down through Q's floor gap, at the right: the beach.
- Walls (no way): L-F (the hill), W-Q (the kitchen's wall), U-S below the cable, B all round but Q.

**Names** (puns, no Z, no Bond): QUAY TO THE CITY, LAP OF HONOUR, SUGAR RUSH, LOAFING ABOUT, OPEN ARMS, MONKEY BUSINESS,
HOUSE OF COLOUR, STEAK YOUR CLAIM, BEAT THE DRUM, FLOAT YOUR BOAT, RIO OR BUST (the beach: the last room, a room called what the
whole trip was).

### The rooms

**H QUAY TO THE CITY** (the harbour). In: left edge, high; the riverboat's gangway comes off the left edge at row 8 and he steps
down onto the quay (floor row 14). The harbour's lamp posts, bollards and coiled rope, crates, a fishing boat moored beyond the
low wall (the bay's water drawn behind, not deadly), a banner BEM-VINDO strung between two posts. A pier (a jetty, floor row 16, dead
end: the way along it is a wooden floor on posts with a gap he jumps) holds a skewer of churrasco and a coin; the quay runs on east,
low (rows 12-14), to L. A football bounces on the quay; a capoeira dancer (a cartwheel) between two bollards. Coconut seller's stall.

**L LAP OF HONOUR** (Lapa's arches). The white aqueduct of the Arcos da Lapa stands across the room (two storeys of arches: the
street through its arches, rows 14-17, and its top, a tram track, row 7). In: left, low (the quay's road). Crossed twice: the low
street runs east through the arches to a wall at the right; the aqueduct's top is reached by a ladder at col 3 and is a long
walkway (cols 0-29) with a yellow tram (the bonde) running it (a creature: it fills the track; he waits in a gap between two tram
passes, or drops down a floor gap to the street). At the top's far end (col 30) a ladder up to a ledge (dead end, row 4) with the key
to the city (a big brass key) and a coin. A rope at col 12 through a floor gap in the street (cols 11-13) goes down to S. Vendors and
a tourist's umbrella decorate. Out: the rope; back west.

**S SUGAR RUSH** (Sugarloaf's base, Praia Vermelha). The great granite dome of Pao de Acucar rises behind (a decoration: a single
smooth cone) and the **cable car's cable** climbs in a line from the lower station at the left (floor row 16) up the slope to the
upper station at the right (a platform at row 4, cols 26-31), its pylon halfway; the car hangs from it. In: the rope at col 12
(through the ceiling gap, cols 11-13). West wall solid. East at floor row 16, low, to W. The upper station's east edge, high, is the
way into U. Two cars: one at each station; when he boards the lower one the other comes down the same cable and they pass at the
pylon (the passing car is only drawn). Crabs on the beach below; a vulture overhead. The key to the city (the item) is in the lower
station's control box: until he has it the station's gate is shut (a sign CLOSED, the barrier a tile cleared by `clear`).

**U LOAFING ABOUT** (the summit). In: left, high, off the upper station's platform. Rounded granite domes, a path of stone
steps over them (rows 12, 9, 6), a stunted garden, the whole of the city drawn small behind (rooftops, Corcovado's peak and the Redeemer on
it in the far distance: a pointing-the-way picture), a viewing rail. Marmosets (sagui) jump along the rocks, a vulture circles. A rope
at col 20 down a cleft goes to a dead-end ledge with a coin and a skewer (low, rows 14-17). Out: east, high (rows 3-5), along the
saddle to C. The way back is the cable car at the left.

**C OPEN ARMS** (Corcovado). In: left, high, off the saddle. The Christ the Redeemer statue stands on its pedestal (a decoration: 8 x 6
characters, drawn from below) on the peak at the room's centre (cols 11-19; its pedestal's base at row 10), arms spread across the
sky; a terrace of stone steps (rows 14, 11, 8) winds up its pedestal on both sides, a viewing platform at its foot with tourists' railings
and a stand with a sign. A hang-glider's wing passes in the sky as a bird. A rope at col 6 through a floor gap (cols 5-7) goes down the
hillside to F. Vultures (the urubu) circle over the statue. Out: right (high, rows 3-5) into T; down the rope. Coins on the arms'
level (they must be jumped for).

**T MONKEY BUSINESS** (the Tijuca forest, a pass). In: left, high. A stretch of rainforest on the hillside: giant fern fronds as
floors, tree trunks, a stream under a tiny waterfall (water, deadly); marmosets chatter, a macaw on a bough. Two levels, the boughs (high, row 6) to the
rope at col 22 (floor gap cols 21-23) down to P, and a pocket on the low path (rows 14-17, a floor) with a skewer behind a stone.

**F HOUSE OF COLOUR** (the favela hillside). In: the rope from C comes down through the ceiling at col 6; from W a rope up through
F's floor gap (cols 18-20). Stacked houses in blues, pinks, yellows and greens, their roofs and balconies the platforms, steps
between them, washing lines, a church tower on the right, a satellite dish: bright and busy (Rio's Morro). Crossed twice: the
rooftop lane (row 8, from the rope across the roofs, ropes between them at cols 12 and 24) and the street of steps below (rows
14-17), joined by the steps. East, low (rows 14-17), into P. A capoeirista and a football; macaws on a roof. Not a dead end: the
loop the player takes down the hill.

**W STEAK YOUR CLAIM** (the churrascaria, a dead end). In: from S, left, low (the restaurant's door at floor row 16); a rope up at
col 19 (gap cols 18-20) through the ceiling to F. The dining room: tables with white cloths and red-and-green coasters, a salad bar (a
buffet counter) along the back, a brick archway into the kitchen on the right wall (shut), red lamps, a fire pit with the rotisserie at
the right, wine barrels; the mezzanine (row 8) has the samba show's little stage (cols 6-14) with a dancer's feathered headdress on a
stand (the headdress, the key item) reached by the stairs at the left. Gaucho waiters pace the dining floor with their skewers (the
mechanism below): two gauchos in the long lane between the tables, and a third on the mezzanine. A skewer of picanha and a coin on each
side. No other way on: it is the costume's dead end, behind the waiters.

**P BEAT THE DRUM** (the carnival, first room). In: from F at the left, low; T's rope at the right (a ceiling gap, cols 21-23, a rope
down). The street of the parade: confetti and streamers (scenery), lamp posts with bunting, a stepped stage of risers (rows 14, 11,
8: platforms) where the **bateria** drums on surdos (a drummer on each riser, creatures), samba dancers weaving along the street, a
banner of the samba school over the street. The steward stands at the right, at the parade's gate (rows 14-17), arms folded, and lets him
by only in the headdress (the carnival's own: `removeEnemy`; without it a sign reads MEMBERS ONLY). Not a dead end: the choice of
how he arrived (T's rope or F's walk).

**Q FLOAT YOUR BOAT** (the parade, second room). In: left, low, past the steward. A wide avenue (the Sambadrome's concrete
walls and the stands on each side, a crowd drawn behind in rows) with the **floats** coming along it (the mechanism): the
avenue's floor is a deep storm channel (deadly) from col 4 to col 26, with the street's near edge at the left and a stage at the
right; the floats (a pirate galleon, a giant bird, a papier-mache sun, each a platform with a tall painted piece on it and dancers) cross
on two lanes (low and high, opposite ways). A rope at col 29 (gap cols 28-30, floor row 17 under it) goes down to B. Confetti cannons
go off (scenery).

**B RIO OR BUST** (the beach: the ending). In: the rope from Q, on the left (col 3, ceiling gap cols 2-4). Copacabana at dusk,
drawn as itself: the black-and-white wave pavement of the promenade (a floor along the whole width, row 16), palm trees, a
beach-front kiosk and a parasol, the sand sloping to the sea (water with a swell drawn, white foam, not deadly), **Sugarloaf** across the bay on the
left and **Christ the Redeemer on Corcovado** on the right, lit, over the city's hills; the sun low over the sea. The
**acai bowl** is the treasure: a purple bowl heaped with fruit on a small table beside a deckchair under the parasol at the right end
(floor row 16, cols 26-28). A sign: INTERMOLE: EUROPE ONLY, on the promenade's rail by the left, the small joke (no creatures: the beach is quiet,
and nothing here kills him). Touching the bowl starts the finale (below).

### Items, gates, doubling back

- **Key to the city** (L, the ledge at the aqueduct's end): the cable car station's gate (`clear`, S). **Headdress** (W, the stage): the
  costume, and the steward's gate (P, `removeEnemy`). **Churrasco skewers** (H's pier, U's cleft, T's pocket, W twice, Q's stage): the food in
  place of the cupcake. **Acai bowl** (B): the treasure, the finale.
- Critical path: H L (up the aqueduct: the key; back) S W (the headdress, back; the cable car up) U C T or F P Q B. A player who skips the
  headdress cannot pass the steward but can come back: every way is joined both ways but the cable car's ride up, which also goes down.

### The three mechanisms

**Sugarloaf's cable car (S, U).** `cableCars: {room, from: {col, row}, to: {col, row}, frames, cars}[]` (S: from (6, 15) to (26, 5), 160 frames): two cars hang on one cable: the
station at the left (the cable's low end) and the platform at the right (its high end). A cable is a thin line drawn in a diagonal
run of characters (art/rio-tiles.ts `cableUp`, class 0: he walks through it; the gondola's grip runs along it) and a pylon halfway. Each
car is two sprites (art/rio-items.ts `CABLE_CAR`: the roof with the grip, wheel and hanger over his head; the floor with its rail and
the glass's mullions in front of him) The cable climbs 20 cells across and 10 up (a slope of 1:2: in art/rio-tiles.ts `cableLow` and `cableHigh` are one pair of cells, a row up
every two cells across): the car travels 1 pixel a frame across and half a pixel up, so the ride takes 160 frames (3.2 seconds, a slow
lift), starting when he walks onto the car at an end. No steering: he stands. At the pylon (the half) the two cars pass: the other car is the same two sprites running the opposite
way. The car at an end waits for him there (set on his arrival at either end). Both ends work: boarding the high car sends him down.
(Sound: Hubbard's lift effect.) The gate: the lower station's barrier is a solid tile until the key (`clear`).

**The gauchos' swinging skewers (W).** A gaucho (a creature: the waiter, a wide-brimmed hat, a poncho, bombachas, a boot, long
moustache) walks a path of 6 cells between two tables, 1 pixel every 2 frames, and carries a skewer in his raised hand (art/rio-items.ts
`SKEWER_FRAMES`, a second sprite following him): the skewer swings like a pendulum in front of him through four poses on a 96 frame cycle:
pointing down (frames 0-23, harmless), forward-low at 45 degrees (24-47, a danger zone at the height of his chest), straight
forward (48-71, the longest reach: 22 pixels from his hand and deadly), forward-up (72-95, over his head and harmless to anyone on the floor but
deadly on the mezzanine's rail). The skewer's pose is seen at once (it is a big picture), and the cycle starts when the room is entered, offset
per gaucho so the two in the long lane are half a cycle apart: a gap always exists. He walks past under a raised skewer or on a down one, never
through a straight one. It works from every side: the gaucho turns at his path's ends and the skewer swings in front of him the way he faces
(mirrored frames). A `skewers: {room, gaucho: <enemy slot>, cycle, offset}[]`.

**Carnival floats (Q).** `floats: {room, lane, row, from, to, speed, every, parts}[]`: a float is a platform (floor class, carried
along: he stands on it and moves with it) of 6 cells width and one row of thickness, with a tall painted piece (a decoration drawn over it,
not solid) moving with it: it enters at one edge and crosses at 1 pixel every 2 frames, so a cell takes 16 frames and the room's 32 cells take
512 frames (8.5 seconds), then it leaves. Lane 1 (row 14) has three floats from the left, 14 cells apart (224 frames between fronts); lane 2
(row 8) has two from the right, so the way across the channel is to hop on a float, ride it, jump to the next or to the high lane and
back. The hop from a float's end to the next over a gap is two cells wide at most (the bot checks). He is carried by the platform as by the
Moscow escalator (ride state), and works from every side: a float carries him whichever way it goes. Colours: bright, one ink each, the
dancers' feathers a second sprite on top.

### Creatures (ten, none in more than two rooms)

| Creature | Rooms | What it does |
|---|---|---|
| samba dancer | P, Q | sways along the street in a feathered costume, a big smile |
| drummer (surdo) | P | beats the drum on a riser, arms alternating |
| gaucho | W | walks between the tables; his skewer swings (above) |
| marmoset (sagui) | U, T | leaps along the rocks, a tufted face, a long tail |
| macaw | T, F | flies, a red body, a huge beak |
| vulture (urubu) | C, S | circles, a black bird with a bare head |
| bonde (the yellow tram) | L | runs the aqueduct's top |
| capoeirista | F, H | does a cartwheel, a headband |
| ghost crab | S | sidles, a blue crab with eyes on stalks |
| football | H, F | bounces, a face on it, bright |

Monty on the Run's creatures average 5.5 of 52 rooms; these 1.5 of eleven.

### Costume: the carnival headdress (the proposal), or a straw hat

**Proposed: the carnival headdress**: a fan of feathers (red, yellow, blue) round a sequined band, rising in a crown of plumes, drawn as one
colour (colour 7, gold) over Monty with the black line between the feathers, as the ushanka's fur is. It reads at once, is nothing
like the other hats (the ushanka, a rice hat, the ninja hood, the lei, the chullo), and it is the costume the steward's gate is about.
**The alternative: a straw hat** (a wide round brim, a band and a bow), a quieter beach hat that suits the ending, but the steward gate
loses its point, and a straw hat is Hawaii's too (the lei). The art has both (art/rio-hat.ts: `HEADDRESS_HAT` and `STRAW_HAT`, both gold) and
the preview shows both (`rio-hats-on-monty.png`); the builder uses the headdress unless Chris says otherwise. **Open question for Chris.**

### Foods: churrasco skewers

Meat chunks threaded on a steel rod, slanting up to the right (colour 2, red-brown, a gleam cut in each chunk); in place of the cupcake (200).

### The tune

A samba feel by instruments only (Hubbard's tempo and melody stay): the lead a bright pulse wave at 12.5% (a cavaquinho's jangle: a short
decay, a fast vibrato), the stabs a bright short pulse that ticks in the off beat (agogo-like), the bass Hubbard's, the drums his own with
the snare's noise shortened into a shaker's (a short decay on the noise voice). Scale: Hubbard's G minor bent to its relative major, the
tune brightened: the major third and sixth stay, the minor seventh becomes the major one, as the "carnival" lift; the key stays. A `RegionTune` as
Siberia's, `breaks: []`. No folk melody is quoted (the Girl from Ipanema is not public domain).

### ENHANCED hints

- key to the city: THE CABLE CAR WANTS ITS KEY. headdress: BLEND IN WITH THE PARADE. skewers: CHURRASCO.
- rooms: S: THE CABLE CAR STATION IS SHUT; P: THE STEWARD WANTS A SAMBA COSTUME; W: WAIT FOR THE SKEWER TO DROP; Q: RIDE THE FLOATS.

## The ending

### The finale (Monty on the Run's manner: the treasure is touched, and a short play runs by itself)

Monty on the Run's: the treasure is touched, Monty is off to France: the dock (room $30), the flag, the boat slides in, Monty walks aboard
and it sails away, GAME OVER (`games/montyotr/src/finale.ts`, `completion`). Rio's `completion` (a `Seq` in the same style) in nine beats, the room
B itself (no other room is loaded), all the figures sprites as the boat's were:

1. **Touch** (frame 0): Monty touches the acai bowl on its table. `g.freeze = 1`, the music stops, Hubbard's finale song (`g.sound.song(2)`, the
   one that plays at the dock) starts. The bowl's sprite (sprite 1) is the bowl at its table.
2. **The sun** (frames 0-600): the sun (sprite 0, the flag's: a big disc, expanded, a yellow ring) sits on the horizon and sinks into the sea
   a pixel every 6 frames; the sea's colour lines (the water's characters) turn from light blue to deep blue as it goes (the colour RAM of the
   sea rows, one row a 60 frames).
3. **He takes it** (frames 0-80): Monty walks to the table (the walk), the bowl slides into his hands: it follows him at his front, a
   pixel's height off the ground.
4. **He walks down to the water** (frames 80-240): he strolls left along the promenade to the middle (the walk), the bowl with him, to the rail
   in front of the sign INTERMOLE: EUROPE ONLY, and stops there facing the sea.
5. **Out of reach** (frames 240-300): the sign's colour flashes once (a wink); he waits (`wait(0x40)`).
6. **He eats** (frames 300-540): the bowl rises and falls from him in three scoops (sprite 1 moves 3 pixels up and down, a bite each time,
   with Hubbard's coin effect as the crunch), his sprite does not move: the walk's first frame, held, facing right.
7. **Floodlit** (frames 480-600): at dusk the Redeemer's characters change colour from grey to white (a colour RAM change of its cells, one
   step a 20 frames), Sugarloaf's lights come on (its decoration's colour).
8. **The moon**: the sun is gone, the sky the dark of the C64's background; the palm sways once.
9. **The end** (frame 640): `g.won = true`, the game-over script (`gameOver`): the title returns. In ENHANCED the reward show follows, with
   this last picture under its credits as the boat's was, THE END and the tune.

The finale is data of the game (`completion` in `MontyData`), as Monty on the Run's is.

### The reward show (ENHANCED, one show for every game, games/shared/ending/)

A montage of places, each the game's own engine on a game of ours with the hero doing something that fits, a route found by search. About 13
places at 9 seconds (560 frames) each, 2 minutes in all, in the order of the journey; one or two from every region:

| # | Region | Place | What Monty does |
|---|---|---|---|
| 1 | Moscow | Red Square (St Basil's domes) | takes a coin along the cobbles |
| 2 | Siberia | the Trans-Siberian's roof, a tunnel mouth coming | runs the roof and drops through a hatch |
| 3 | China | the Great Wall, a watchtower | climbs the wall's steps |
| 4 | Japan | Fuji's temple garden (the stone lanterns, the cherry blossom) | crosses the stepping stones |
| 5 | The Pacific | the luau (the fire dancers' torches) | slips past the torches |
| 6 | The Pacific | the lava climb on Kilauea | climbs ahead of the rising lava |
| 7 | The Andes | the parachute drop (F2, the condors) | floats down through an updraft |
| 8 | The Andes | Machu Picchu's terraces (the rolling boulders) | hops a boulder, rests in a niche |
| 9 | The Amazon | the piranha river's vines | swings across |
| 10 | Rio | Sugarloaf's cable car | rides the car up past the other |
| 11 | Rio | the churrascaria | passes the gaucho's skewer |
| 12 | Rio | the carnival's floats | rides a float across the channel |
| 13 | Rio | the beach, Christ the Redeemer lit | eats the bowl: the finale's last picture, held |

(China, Japan and the Pacific rooms are made by their own builders: the exact rooms are theirs to choose from these; Hawaii's two stay
the luau and the lava, the two the plan names. The easter eggs, WILLOW PATTERN and THE LAST MOLE, may stand in as a place if the builders
want them in the show; they are rewards for the curious, so the main show leaves them out.)

### The credit lines (sourced: nothing invented)

Monty on the Run's makers first, from `games/montyotr/re/credits.md` (each line is sourced there, with its URL), then Do Svidaniya Monty's
own (the plan's credits line), then `PORT_CREDITS` (`games/shared/ending/credits.ts`), spread over the places in the order of the journey,
at most 38 letters a line, in the game's own lettering:

| Place | Lines |
|---|---|
| 1 Red Square | A GREMLIN GRAPHICS GAME, 1985 / ORIGINAL GAME BY PETER HARRAP |
| 2 the roof | C64 VERSION BY MICRO PROJECTS LTD / ANTHONY CLARKE AND JASON PERKINS / GRAPHICS BY MARK RODGERS |
| 3 the Wall | MUSIC BY ROB HUBBARD / THE THIRD MONTY MOLE GAME |
| 4 Fuji's garden | PETER HARRAP WROTE THE FIRST GAME, / WANTED: MONTY MOLE, AT 19 IN 1984, |
| 5 the luau | AS A REACTION TO THE BRITISH / MINERS STRIKE: A MOLE STEALING COAL / TO KEEP HIS FAMILY WARM |
| 6 the lava | MONTY ESCAPES FROM HIS HOUSE FOR THE / ENGLISH CHANNEL AND FREEDOM |
| 7 the drop | THE MOLE CRUSHERS CAME OVER FROM / WANTED: MONTY MOLE, SAID ZZAP!64 / PETER HARRAP: I LIKE A BIT OF A SHOCK |
| 8 Machu Picchu | ROB HUBBARD SAID THE MAIN TUNE WAS / INSPIRED BY DEVILS GALOP, THE DICK / BARTON RADIO SERIAL THEME |
| 9 the vines | HARDCORE GAMING 101 READERS RATED IT / NUMBER 2 IN WESTERN GAME MUSIC, 2011 |
| 10 Sugarloaf | ZZAP!64 GAVE IT 90 PER CENT IN 1985: / MOLING ABOUT HAS NEVER BEEN SUCH FUN |
| 11 the churrascaria | MONTY BOARDS A FERRY TO FRANCE: / AUF WIEDERSEHEN MONTY IS THE NEXT GAME |
| 12 the floats | DO SVIDANIYA MONTY: A NEW GAME BY / CHRISTOPHER HICKMAN WITH CLAUDE / AFTER PETER HARRAPS MONTY ON THE RUN |
| 13 the beach | REBUILT FOR THE BROWSER BY / CHRISTOPHER HICKMAN / WITH CLAUDE (ANTHROPIC) / RUNSTOP64 (`PORT_CREDITS`, put after the last place's) |

Sources: lines 1-11 are `credits.md`'s (Wikipedia, Eurogamer, ZZAP!64 issue 6, Hardcore Gaming 101: its table gives each); line 12's is the
plan's own credits line (`docs/dosvidaniya-plan.md`, "Credits: a new game by Christopher Hickman with Claude, after Peter Harrap's Monty on
the Run (Gremlin Graphics, 1985)"; the font has no apostrophe, so HARRAPS). "THE NEXT GAME" in line 11 is Monty on the Run's: for this game
the builders may drop it, as it is about the game this one is the sequel of by name, not about this one. `PORT_CREDITS` says REBUILT:
accurate for the engine (a rebuild), less so for the new rooms; `PORT_CREDITS` is shared, so a change is Chris's. Not used, as it has no
source: any line about Rio, Brazil or the regions' real places. The cast's names (the creatures parading after the last line): the plain
names in the creature tables of the region docs.

### The title scroller's story text

In the scroller's pieces (`scrollerMessage` in `games/montyotr/src/title.ts`; `[0xfe, colour]` a colour change), upper case, no apostrophes:

```
MONTY MOLE: WORLD TOUR.  (a new game by Christopher Hickman with Claude, after Peter Harrap: the credits as now)
THE STORY: INTERMOLE HAS FOUND MONTY ON HIS GREEK ISLAND AND EUROPE IS NO LONGER SAFE.  HE CAN ONLY WORK IN EUROPE, SO MONTY RUNS
EAST, OUT OF HIS REACH, THE LONG WAY ROUND AND WITH NO PASSPORT.  MOSCOW, THE TRANS-SIBERIAN, THE GREAT WALL, A JUNK TO JAPAN, A
CARGO SHIP TO HAWAII, A CARGO PLANE AND A PARACHUTE DOWN INTO THE ANDES, A RIVERBOAT DOWN THE AMAZON, AND RIO.  EVERY LEG A
DIFFERENT WAY OF TRAVELLING, EVERY COUNTRY ITS OWN HAT.  FIND THE KEYS, WATCH THE TIMING, LISTEN FOR THE MUSIC.  GOOD LUCK.
```

(The piece list: `[0xfe, 1], 'THE STORY: ', ...` in the colours the credits use: 1 white, 7 yellow for names, 13 light green, 14 light blue; each
piece ends with spaces before the next; the existing credits and the original's last passage "GOOD LUCK!" follow.)

## As built

(Empty until the region is built.)

## Art (pre-production, 2026-11-21)

Made as data in `games/montyworld/src/art/`: `rio-tiles.ts`, `rio-decor.ts`, `rio-creatures.ts`, `rio-items.ts`, `rio-hat.ts`, none in
`world.ts` yet (the builder adds them to `WORLD_*` after the Andes'). Previews: `/root/projects/runstop64-shots/preprod-rio/` (`test/rio-sheets.ts`,
`rio-rooms.ts`, `rio-hat-shots.ts`).
