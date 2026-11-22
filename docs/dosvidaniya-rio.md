# Do Svidaniya Monty: Rio's room map, and the ending

Region 7 (docs/dosvidaniya-plan.md), the last: eleven rooms and the whole game's end. Read docs/dosvidaniya-moscow.md (how Monty on the Run's rooms open and join), docs/dosvidaniya-siberia.md (the method and the bar) and, for the lesson that governs every
picture here, the plan's "Lessons from Chris's play": a place is drawn as itself (a cable car on its cable, a restaurant with its tables and skewers, a street parade with its floats), never rooms with words on. Rows 0 (top) to 19, columns 0-31; Monty stands
on a floor row F with his body on F-2 and F-1, and a way out at a side is open at the same rows as the way in of the next room. His jump climbs two rows (steps are two rows high at most: a three-row step cannot be climbed, the bot found it).

Entry: the Amazon's last bank (R), east edge, high (rows 6-7, floor 8): the quay's gangway. There is no exit: the beach is the ending.

## Part 1: what it borrows from Monty on the Run's routes

Read in docs/dosvidaniya-moscow.md; the points Rio takes:

- **A room crossed twice at two heights** (`$04 $06 $09 $0C $0D`): Lapa's arches (the street under, the tram's track over), the churrascaria (the dining floor, the mezzanine of the samba show), the favela (the rooftops, the lane under them).
- **A dead end that holds an item behind a doubling back** (`$13`, `$1B`): the aqueduct's ledge (the key to the city), the churrascaria's stage (the headdress), the summit's cleft (a skewer), the forest's middle bough (a skewer).
- **A way that only opens once an item is found elsewhere** (cake 0, key 1, item 3 and the wasp): the cable car needs the key to the city, the parade's steward the headdress (the region's costume).
- **A rope that leaves a room the other side from where it came in** (`$05`, `$0A`): Lapa's rope up into Sugarloaf, Corcovado's rope down into the favela, the forest's rope down into the carnival.
- **A lift** (`$05`, `$0D`): the cable car on its slope.
- **Loops**: Corcovado, the forest, the parade and the favela (C-T-P-F-C: the forest's rope down, the street west, the favela's rope up), and the summit's two doors.

## Part 2: Rio

Eleven rooms in seven columns (33-39) and two rows (6-7) of the exit grid, the beach last. (The pre-production's block of four columns and four rows did not fit the grid's adjacency: two rooms cannot both be a room's east neighbour, and the cable car
rides inside Sugarloaf's room to the summit that is its east neighbour, so the churrascaria is its west.)

```
col     33                   34                 35               36                37                38                39
row 6   W STEAK YOUR CLAIM   S SUGAR RUSH       U LOAFING ABOUT  C OPEN ARMS       T MONKEY BUSINESS
row 7   H QUAY TO THE CITY   L THE LAPA ARCHES  .                F HOUSE OF COLOUR P BEAT THE DRUM   Q FLOAT YOUR BOAT B RIO OR BUST
        (the Amazon's last bank is at column 32, row 7)
```

Joins (rope = both ways, gate = an item):

- Entry: R east, high (rows 6-7) to H west, high. H-L: walk east, low (rows 16-17). L-S: a rope up from the street through the aqueduct's track to Sugarloaf's beach, both ways. S-W: walk west, low. S-U: **the cable car** from the shelf up to the platform at S's east edge, high (rows 6-7), which is U's west edge (gate: the key to the city); both ways. U-C: walk east, high. C-T: walk east, high. C-F: a rope down through C's floor gap (col 5). T-P: a rope down through T's floor gap (col 22). F-P: walk east, low. P-Q: east, low, past the steward (gate: the headdress). Q-B: east, low: the beach.
- Walls (no way): L-F (the hill), W-H, F-W, U-L, T-F, P-Q above and below, B all round but Q.

**Names** (plain first, a pun where it lands; no apostrophes, no Z, no Bond): QUAY TO THE CITY, THE LAPA ARCHES, SUGAR RUSH, LOAFING ABOUT, OPEN ARMS, MONKEY BUSINESS, HOUSE OF COLOUR, STEAK YOUR CLAIM, BEAT THE DRUM, FLOAT YOUR BOAT, RIO OR BUST (the
beach: the last room, a room called what the whole trip was). The design's LAP OF HONOUR is THE LAPA ARCHES (the pun did not land: a name that needs explaining is the wrong name).

### The rooms

**H QUAY TO THE CITY** (the harbour). In at the left from the riverboat's gangway (floor 8), down the wharf's steps (floors 10, 12, 14, 16: two rows each, so every way is joined both ways but the floats' and a player who comes in can go back to the Andes) to the quay (floor 18), which runs east out low to Lapa. A pier (floor 14; a ladder, col 20, up through its planks) holds a
skewer; the bay behind under a BEM-VINDO banner, a fishing boat, lamp posts, a coconut stand. A capoeirista on the quay and a football bouncing on the step.

**L THE LAPA ARCHES.** The white aqueduct across the room, two storeys of arches (the street through them, floor 18; its top, the tram's track, floor 7). Crossed twice: the street runs east to a wall; a ladder (col 3) climbs to the track, where the yellow tram
(the bonde) runs and a second ladder (col 19) climbs to a ledge (floor 4) with the key to the city; a rope (col 26) climbs from the street through the track to Sugarloaf. Coins on the street, the track and the ledge.

**S SUGAR RUSH** (Sugarloaf's base). The granite domes behind and the cable climbing in a line from the lower shelf (floor 14, cols 9-13; a ladder, col 7) to the upper platform (floor 8, cols 24-31) that runs out east into the summit; a pylon, two cars. The shelf's
gate (cols 10-11) is shut under a CLOSED sign until the key; the rope from Lapa comes up through a gap in the beach under the platform. A ghost crab and a vulture.

**U LOAFING ABOUT** (the summit). In at the left from the cable's platform (floor 8), over a granite dome (floor 6) and a stretch of rock, out east (floor 8) on the saddle; a cleft (a rope, col 20) down to a hollow with a skewer; the Redeemer small in the distance; two marmosets.

**C OPEN ARMS** (Corcovado). In at the left (floor 8), a rope (col 5) down the hillside through a gap, the terrace's steps down (floors 10, 12, 14) to the viewing platform at the foot of Christ the Redeemer on his pedestal, and up again (floors 12, 10, 8) to the way out east; a skewer on the east terrace; a vulture.

**T MONKEY BUSINESS** (the Tijuca forest). In at the left on the upper bough (floor 8) which runs east to a gap with a rope (col 22) down to the carnival; a rope (col 15) from the ground climbs to the bough past a middle bough (floor 14) with a skewer; a stream pool; the
bough ends east in a dead end. A marmoset and a macaw.

**F HOUSE OF COLOUR** (the favela). Corcovado's rope (col 5) comes down to the roofs at the left (floor 8) which step across (floor 9) with gaps to a church tower, in blue, yellow, pink and green; below them the lane (floor 18) runs east out low to the parade. A skewer on a roof; a capoeirista and a macaw.

**W STEAK YOUR CLAIM** (the churrascaria, a dead end). In from Sugarloaf's beach at the right (floor 18). Two gauchos pace the dining floor, each with a skewer that swings; the stairs (floors 16, 14, 12) climb at the middle to the mezzanine's stage (floor 10) where the
headdress hangs on a curtain; tables, a salad bar, a rotisserie, red lamps.

**P BEAT THE DRUM** (the carnival, first room). In from the hillside at the left (floor 18); the stepped risers of the bateria (floors 16, 14, 12, 10) up and down the middle with a drummer on the top; the forest's rope (col 22) comes down to the street; the steward at the right in a lane two cells high lets him by only in the headdress; a samba dancer on the left grandstand; grandstands over the low lane and at the left, surdos on the risers, bunting and a SAMBA sign.

**Q FLOAT YOUR BOAT** (the avenue). In at the left on the street (floor 18); the channel (deep water, cols 4-24) is crossed on the floats: lane A (the street's height) three of them left to right, lane B (floor 14) two the other way; on the right a stage with two steps (floor 16) and a skewer, leading east out low to the beach.

**B RIO OR BUST** (the beach). Copacabana's wave pavement under the Redeemer on Corcovado and Sugarloaf across the bay, the sea, palms, a kiosk and a parasol; the acai bowl on its table at the right end. Touching it is the finale.

### Items, gates, doubling back

- **Key to the city** (L, the ledge): the cable car station's gate (`clear`, S). **Headdress** (W, the stage): the costume, and the steward's gate (P, `removeEnemy`). **Churrasco skewers** (H's pier, U's hollow, T's middle bough, C's terrace, F's roof, Q's stage): the food in place of the cupcake. **Acai bowl** (B): the treasure.
- Critical path: H, L (up the aqueduct: the key; back), S, W (the headdress; back), S (the cable car up), U, C, then F (the rope) or T (east, then the rope), P, Q, B. A player who skips the headdress is turned back at the steward; every way is joined both ways but the floats' (the way back from the beach crosses the avenue on lane B).

### The three mechanisms

**Sugarloaf's cable car (S; `cableCars`, `games/montyotr/src/cablecars.ts`).** Two cars on one cable, each two sprites over his box (the roof behind him, its floor and rail in front); stepping onto the foot of a station (the car's door, two cells at the cable's end of the platform) carries him
as the escalators do (a ride he cannot leave) 160 frames up the line, the other car passing it halfway on a bypass of its own (a second cable drawn below the line, seven rows down, which that car hangs from: two cars on one line would draw on the same pixels), and sets him on the other station's foot, where he must step off before it rides again; both ends work. The station's gate (a granite wall on the shelf) is the key's.

**The gauchos' swinging skewers (W; `skewers`, `skewers.ts`).** A gaucho (a creature) walks between the tables with a skewer in his raised hand (a sprite that follows his hand): it swings through four poses a 24 frames each every 96 frames (down, forward and low, straight out, up) in the way he faces; the middle two kill. The two are half a cycle apart.

**Carnival floats (Q; `floats`, `floats.ts`).** A painted piece (the decoration of a pirate galleon, a sun, a bird) on a deck of a floor tile crosses a span of the room a cell every 8 frames, in the room's own characters; what it covers (the deadly water of the channel) is put back as it goes; he stands on the deck (a floor he passes up through) and is carried a cell with it (a cell at a time, 8 frames apart: not smooth), only while a deck cell that is drawn is under his feet and never into a solid cell: the cycle runs on beyond the channel over the street and the stage, where it carries nobody.

### Creatures (eleven, none in more than two rooms)

| Creature | Rooms | What it does |
|---|---|---|
| samba dancer | W, P | sways in its feathered costume, a big smile |
| drummer (surdo) | P | beats the drum on the top riser |
| steward | P | the parade's gate: a peaked cap, a bow tie, arms folded; steps aside for the headdress |
| gaucho | W (two) | walks between the tables; his skewer swings |
| marmoset (sagui) | U (two), T | leaps along the rocks, a tufted face, a long tail |
| macaw | T, F | flies, a red body, a huge beak |
| vulture (urubu) | S, C | circles, a black bird with a bare head |
| bonde (the yellow tram) | L | runs the aqueduct's top |
| capoeirista | H, F | a headband, a cartwheel |
| ghost crab | S | sidles on the beach |
| football | H | bounces, a face on it |

### Costume: the carnival headdress

A fan of plumes (red, yellow, blue) round a sequined band, worn small on his head above his eyes as a sprite of its own in gold (colour 7) over his pictures with the black line between the feathers; it lets him blend in at the parade (`art/rio-hat.ts`). The straw hat of the pre-production is dropped.

### Foods: churrasco skewers

Chunks of grilled meat threaded on a steel rod slanting up to the right, in red-brown with a gleam cut in each chunk (200 points); six, in H, U, T, C, F and Q.

### The tune

A samba feel by instruments only: Hubbard's G minor lifted to G major (the minor third, sixth and seventh and the flat second and tritone each a semitone up onto a note of G major), the lead a cavaquinho (a narrow pulse, a short decay, a quick vibrato), the runs an agogo's bell, the stabs, drums and bass Hubbard's. The tempo and every duration are Hubbard's. No tune is quoted.

### ENHANCED hints

- Taking: KEY: THE CABLE CAR STATION, HEADDRESS: PAST THE STEWARD. Coming into a room without what it wants: THE CABLE CAR WANTS ITS KEY (S), THE STEWARD WANTS A COSTUME (P).

## The ending

### The finale (Monty on the Run's manner: the treasure is touched, and a short play runs by itself)

`completion` (`games/montyworld/src/finale.ts`), the room B itself, the figures sprites as the boat's were: Hubbard's finale song starts; Monty takes the bowl (sprite 0 follows him), strolls left along the promenade to the rail
and stops; he eats in three scoops (the bowl rises and falls from him, the coin effect for the crunch); the Redeemer's cells go from grey to white and Sugarloaf's lights come on; the sun (sprite 6, behind the characters, with a black block on sprite 5 over the sea under the horizon that it sinks behind) has set into the sea;
`g.won = true` and GAME OVER as Monty on the Run's ends (`gameOver`), CONTINUE? after it as in every game. In ENHANCED the reward show follows.

### The reward show (ENHANCED, one show for every game, `games/shared/ending/`)

Thirteen places in the order of the journey (`src/ending-places.ts`; the start and the route of each, found by a search over the game's own frames, `re/routes.ts` writing `src/ending-routes.ts`): Red Square; the Trans-Siberian's roof; the Great Wall; the temple garden; the luau;
the volcano; the parachute drop; Machu Picchu's terraces; the vines; Sugarloaf's cable car; the churrascaria; the carnival's floats; the beach, the finale's last picture held under the credits. Then the creatures of the whole world parade one at a time under their names.

**The credit lines** (sourced, nothing invented): Monty on the Run's makers, from `games/montyotr/re/credits.md` (each line is sourced there), spread over the places; "AUF WIEDERSEHEN MONTY IS THE NEXT GAME" is not said (it is about Monty on the Run); then this game's own, in the plan's words: A NEW GAME BY CHRISTOPHER HICKMAN /
WITH CLAUDE, AFTER PETER HARRAPS / MONTY ON THE RUN, GREMLIN GRAPHICS / RUNSTOP64. The shared `PORT_CREDITS` says "REBUILT FOR THE BROWSER BY", which a new game is not, so the show takes `closing` lines of its own (`MontyEnding.closing`; `PORT_CREDITS` is unchanged and still the default of every other game).

### The title scroller's story text

The scroller says DO SVIDANIYA MONTY, A NEW GAME BY CHRISTOPHER HICKMAN WITH CLAUDE, AFTER PETER HARRAP, MUSIC BY ROB HUBBARD, then the story (Intermole has found Monty on his Greek island and Europe is no longer safe; Intermole can only work in Europe, so he runs east, out of its reach, the long way round and with no passport; Moscow, the Trans Siberian, the Great Wall, a junk to Japan, a cargo ship to Hawaii, a cargo plane and a parachute down into the Andes, a riverboat down the Amazon, and Rio; every leg a different way of travelling, every country its own hat; find the keys, watch the timing, listen for the music), then A TRIBUTE: RUNSTOP64 and the original's GOOD LUCK!.

## As built

Built 2026-11-22: rooms in `games/montyworld/src/rio.ts` (ids 67-77, sectors 67-77), art `art/rio-*.ts`, the tune `music/rio.ts`, finale `finale.ts`, the show `ending-places.ts`, `ending-scenes.ts`, `ending-routes.ts` (written by `re/routes.ts`), map picture `test/rio-map.ts`. Where the build differs from the design above:

- **Engine**, as data (Monty on the Run's value leaves them empty): `cableCars`, `floats`, `skewers`; `MontyEnding.closing` (a game's own last credit lines); the pause map and the tune pick a region by column and row, the smallest that holds the cell (Rio's column 33 is the Andes' cave's: `games/montyotr/src/regions.ts`); a room effect can be `late` (after the decorations: the CLOSED sign comes down with the gate).
- **The bot found what the pictures hid**: his jump climbs two rows and needs a run-up, so every step is two rows high and platforms five wide (the parade's risers are two steps, not four); a coin at the water's surface is a death coin; decorations replace the tile under them (a ladder under an arch was no ladder); a creature at the entry or at a rope's foot is a wall; the churrascaria's west lane needed a ladder up to the stage; the favela's roofs needed a ladder from the lane; lane B of the floats is reached from the stage's two-row steps.
- **Rooms**: the churrascaria has a dancer on the stage and two gauchos (skewer sprites 2 and 1); the summit is a chasm under the platforms (the cleft's rope hangs to the chasm's floor, a skewer among the houses of the favela); the forest has one skewer, the cakes are in H, U, T, C, F, Q; the dancer is in W and P.
- **Costume** the headdress as proposed; **credits**: the port's "REBUILT FOR THE BROWSER BY" is not said, the closing lines are this game's own (a decision of the pre-production); the show has thirteen places (the parachute drop was replaced by T1's terraces: the flight puts the canopy over the credits' row) and 24 creatures, 168 seconds.
- Saves: format stays 1; old saves load (their shorter coin and item lists fill the first entries: the earlier regions did the same, each adding coins and items to the lists without a bump; rio-mechanisms.ts loads an Andes-era save).

Checks: `rio-layout.ts` (183), `rio-mechanisms.ts` (58), `music-rio.ts`, `rio.ts original|enhanced` (87 each: 62 coins, the key, the headdress, six skewers), `reward.ts` (54); the earlier regions' tests count the whole world (78 rooms, 282 coins, 43 finds, 19 key items, 23 snacks); `npm run verify` passes but games/moley/test/game.ts, which needs a ROM missing in this worktree. Pictures: /root/projects/runstop64-shots/rio/.
