# Making a new Monty game: what Chris taught us

For any new Monty game on Monty on the Run's engine (`MontyData`, `runMonty`: see AGENTS.md's shared modules). Learned making
Do Svidaniya Monty (games/montyworld, 2026-11), from Chris playing each region. Read this before designing anything; every
builder and reviewer applies it. Game-specific plans keep their own decisions (`docs/<game>-plan.md`); what holds for every
Monty game lives here.

## The benchmark

- **Monty on the Run is the benchmark.** Monty's own moves are its (walk, jump arc, ropes, no steering in the air). Keep its
  quirks that make it fun (the Mole Crushers, a jetpack-like flight); leave out what frustrated (timed warps that send you back
  if you walk in at the wrong moment) and what bored (a vehicle section like the C5 street). New mechanisms should feel familiar
  but fresh: a timing to learn, seen at once, fair from every side. Nothing may feel like a glitch (an escalator must make sense
  from both ends; a ride never traps). Climbs are easy: from anywhere at a rope's or ladder's foot Monty goes up, and from
  anywhere over its top he goes down; no overhang or narrow opening that only a pixel-perfect position clears (Chris on Moscow,
  2026-11-22). `montyworld/test/climbs.ts` holds every climb of every region to Monty
  on the Run's own norm (it fails at 3 of the 11 or so places a rope can be touched from, never more): a rope through a floor
  has an opening at least 3 cells wide with the rope in the middle (5 is easy), nothing hugs a rope's foot, and where a rope
  leaves a room the opening is the same in the room it arrives in. Every coin, item and creature on the way is passable with slack, not only by the bot's exact inputs.
- **The route winds** as Monty on the Run's does: start one way, go down, circle back up, pass through rooms and double back to
  the ladder out; rooms crossed twice at different heights, dead ends holding items, ways an item opens elsewhere. Give each
  region at least one "aha": something you can see in a room but can't reach from the way you first come in, reachable only
  when the route brings you back from another side (Chris on China, 2026-11-22). Vary each region's puzzle shape (an item
  used twice, taken early and used late, one that changes rooms already crossed); don't repeat one formula, and don't end
  every region with the same "costume plus guard" gate. Meet the lock before the key (Chris, 2026-11-22: items picked up
  naturally before their gate make the gate feel arbitrary): the player sees the gate first, with the hint's reason, then finds
  the item a short detour off the path; no required item lies on the straight path before its gate. An item never gates
  just a coin (Chris): a key opens something important; a coin stash is reached by skill or by the route's "aha". Never a
  corridor, and never a closed box crossed by a ladder up and a ladder down. Study its exit grid before laying out a region.

- **An item never gates just a coin, and a gate is never optional** (Chris on China and Japan, 2026-11-22: "items are usually for unlocking important things and a coin is not an important thing"; the ninja hideout "is totally optional, which feels a little weird"). A key, hat or hood opens a way on or something that matters (a snack, a costume's door); a coin is guarded by a place (a rotten board, a ledge to reach), never by an item. A room whose guard holds the way on must be on the way on: the way to the next region runs through its gate, not round it.

## The benchmark region: Moscow

Chris (2026-11-22): "Moscow feels super well balanced and the music is super fun." Moscow (docs/dosvidaniya-moscow.md) is the
model for a region's balance (a hub crossed several times, two chained item fetches, a loop, a one-way ride, coins placed to
reward a move) and its music is the model for a remix (a subtle minor bend and a plucked lead on Hubbard's tune and tempo).

## Signature set pieces: the heart of it

Every region has one or two set pieces nobody forgets (Chris, 2026-11-22, on the moving train, the New Year dragon, the vine
swing and the bullet trains: "we need to really focus on each area having one or two of these things... a key part of what
we do when we develop games"). A set piece is a place made into a thing to play: it moves, it's big, it surprises, it has a
timing or a trick to learn, and the region is built round it. Plan them first, with Chris, before the rooms; give them the
most care; the reward show and the title show them off.

## How it looks

- **A place reads at a glance as the place.** The one test for every room's screenshot: would a stranger name it? A train is
  carriages on rails with scenery passing; a landmark is drawn as the landmark (the Great Wall over hills, the Willow Pattern
  plate); a vehicle runs on through the screen's edges, never into a wall. Signs name a place; they never stand in for drawing
  it. The level is Monty on the Run's own: simply drawn, leaving a lot to the imagination, but its boat is a boat and its
  street is a road.
- **Backgrounds tell the place** (Chris on the train's moving scenery and sky, 2026-11-22: "I really love what was done with
  the train sequence... we should look for more opportunities to have interesting backgrounds"): layered scenery behind the
  play area (sky, receding roofs, hills, horizon), moving where the place moves; the set piece is where Monty stands (on the
  rooftops, not under a picture of them).
- **No words on the scenery** (Chris, 2026-11-25: "words on the screen feels like such an AI thing. This is what the thing is.
  Feels forced"). No banners, signs or labels that name what a picture shows (SAMBA, CARNAVAL, MAUNA KEA, HILO): the drawing says
  it, the room's name on the name line says the rest. Lettering only where the place really has it and it reads as part of the
  picture, never as a caption, and when in doubt, none.
- **A real place, calmly drawn** (Chris, 2026-11-25, on Hawaii's redraw: "neat, but a lot of the scenes look extremely busy in
  the background with all of the green"). Researched landmarks and nature, yes (Diamond Head's caves, Molokai's cliffs), but a
  backdrop is a silhouette or a band of one or two dark colours, the detail kept to the horizon and the edges; never a full
  screen of bright textured foliage behind the play. Jungle and forest rooms especially: dark green, sparse leaves, the
  playfield clear.
- **Clear before busy** (Chris, 2026-11-22: Monty on the Run didn't overcomplicate; many C64 games that went for detail ended
  up clashing, "weird and busy"). Exciting comes from the set pieces and the play, not from filling every cell. Backgrounds
  stay calm (darker, fewer colours, little detail right behind where Monty plays) so floors, creatures, items and hazards
  read at a glance; sprites are always drawn in front of scenery; detail goes into the landmark and the set piece, sparingly.
  A background must never be mistaken for a wall or a floor (Chris): darker or muted colours than anything solid, no hard
  top edges that look walkable, and solid tiles always brighter and crisper than what's behind them.
- **What looks like a floor is a floor**, and nothing solid looks like background; decorations finish what they start (a
  clothesline runs wall to wall) (Chris on China).
- **Not every room is a dungeon.** No frame walls or ceilings by habit: outdoor rooms open to the sky and run off the screen's
  edges; walls only where the place is indoors, shaped as that building.
  How it is built (Rio, 2026-11-22): the sky, the sea and a far hill are one-character pieces laid over every empty cell (`fillCells`: three bands of sky, one of waves) or nothing-class backdrop tiles
  (`hillBack`, `graniteBack`: painted as shapes, he walks through them); a decoration replaces the characters of every cell it covers, so no coin or item sits under one and none sits on a solid tile. Two
  rooms that join are open at the same rows (sky above included) and shut under them; a side with no room beyond it needs no wall at all, the engine stops him at the edge.
- **Nothing floats** (Chris on Rio's Lapa, 2026-11-22: "the entire bottom row is blank and then a building floats over it... amateur"): everything stands on something drawn: an aqueduct on the street under its arches, a house on the
  hill or the lane, a cable between two anchors, a roof on its posts. Check every picture's bottom edge and every ledge for a gap between a thing and what carries it.
- **A landmark appears once** (Chris on the Redeemer): exactly one Christ the Redeemer, on the summit of Corcovado, the highest point of its place, drawn with a hanging robe and sleeves (not rectangles); a far view of him is a different
  picture, small, from the beach. One cable car line, one car on its cable, anchored at both ends: no second cable to make room for a passing car.
- **No grey by default.** Each room picks a few bright, place-true colours on black; grey only where the thing is grey.
- **Creatures stand out from the backdrop they cross** (check each creature's colour against the sky, sea, hill and wall of every room it is in: a light blue drummer on a blue riser, a light grey marmoset on granite
  were found by looking, not by the bot).
- **Monty on the Run's art manner:** solid shapes with black-line detail, no checkerboard dithering; bold cartoon creatures with
  big faces filling their 16x16 in one solid colour; recognisably of the place they're in.
- **Monty on the Run's room recipe** (measured over its rooms, sewers aside: games/montyworld/test/room-stats.ts,
  docs/dosvidaniya-room-audit.md): about 3 creatures a room, 2 of them long up-and-down patrols (a vertical creature in 94% of
  rooms; no room of walkers only), about 8 ledges on 6 levels, 2 ropes or ladders; a mechanism in only a third of rooms; each
  room has one thing of its own. Measure a new game against it.
- **Set-up traps make rooms memorable** (Chris, 2026-11-22: "look for opportunities wherein there's something built and set
  up for some sort of trap"): a ledge that crumbles as you run along it over the fish, a bridge that gives way, a pressure plate
  that starts the boulders, icicles that drop as you pass, a trapdoor. Seen or hinted before it springs, beatable by keeping
  moving or timing, never a blind instant death.
- **Creatures move in varied ways**, as Monty on the Run's do: up-and-down patrols, creatures on different floors, fliers,
  short fast and long slow patrols, timing hazards, rooms with a mechanism instead of a walker; never room after room of two
  walkers to jump over (Chris on Siberia, 2026-11-22).
- **A tunnel is a mountain** (Chris on Siberia: a moving door "just looks like a door moving across the top of the train"): a long mass of rock running off the screen's edge with the stone portal at its leading edge, and it comes from the way the train travels (the scenery goes the other way), never both ways. Scenery that belongs to a moving thing runs from the moment he is in the room, not once he moves.
- **Creatures stand out from what's behind them**: never white on snow, brown on earth (Chris on Mount Fuji).
- **A big creature now and then is a highlight** (Chris on China's New Year dragon: "the first time I've ever seen anything
  this incredible"): several sprites moving as one, the room built round it; at most one per region.
- **Creatures are reused rarely** (a reused one should feel like a surprise): no creature in more than two rooms of a region.
- **A costume is worn, not stuck on:** small on his head above the eyes (a lei round the neck); his face always shows
  (`art/costume.ts` in montyworld finds his head per picture, and its test holds every costume to it).

- **It must still fit a real C64** (Chris, 2026-11-22). Native code, but the data keeps the machine's limits: one byte per
  kind, 256 characters, the VIC bank's sprite blocks. A big game splits by region as a multiload would, each region within
  budget; a per-region budget test enforces it.

- **The game ramps up, and every room earns its place** (Chris after finishing, 2026-11-22: "this last area is the weakest...
  the game was really dragging"). Fewer, stronger rooms beat more (Monty on the Run has about 50); each region about 8 to 10;
  later regions get the best set pieces and the hardest fair rooms, building to the finale; build the late regions with as
  much care as the first, not faster.
- **Credits are written for the game**, never reused from the original it's built on; fun facts are true and sourced.
- **The parade is a procession, not a queue** (Chris on the live ending, 2026-11-22: creatures running one at a time over the
  sand were "practically unrecognizable" and "a very boring parade"; Super Mario World's march was enjoyable to watch). After
  the credits each region's creatures march in together as a troupe in their own walk, halt a little left of the middle, each
  does a small move (a hop, a turn, a bow) as its name comes up, then march off; Monty last, dancing. They march on a plain
  black ground of their own with a line under their feet, never over a busy picture; names are plain descriptive words
  (MATRYOSHKA DOLL, KOI) in coloured text on the black, no box. Shared: `procession` in `games/shared/ending/show.ts`
  (`procession.ts` is its clock).
  Then (Chris, 2026-11-23) the parade became the place's own event: Rio's carnival across the beach, everyone together in one
  long column without a break, region after region behind a banner with its name, bouncing on the samba beat, the finale's
  troupe leading, each named as it passes; Monty and the troupe dance at the side watching; the agent sneaks after him at the
  tail and a Mole Crusher gets him with Monty on the Run's own death (the four-way split, frame for frame). The sand under them
  is one flat colour: no texture or dither behind a marcher (`parade` in `ProcessionSpec`, `PARADE` in `procession.ts`).
- **A finale's beats read at 1x** (Chris on the beach, 2026-11-23: "it just moved the two objects to the left and then played
  music"). Each beat gets its own pictures, not a sprite slid about: he sits (seated pictures, his body in a deckchair drawn as a
  deckchair), he eats (the bowl in his hands, the spoon going to his mouth, a happy face), he dances (dance pictures). When the
  actors are small, cut to a close-up with expanded sprites, and keep the ground behind them plain.

## The villain and the last puzzle (Chris, 2026-11-23)

- **A final boss is set up, then met three times, each harder** (the rule of three): seen arriving too late at every border (a cameo
  of a few seconds, harmless, one line of data each), escaped twice on the way (each teaching a piece of the last puzzle: he copies
  your path; the world's hazards can take him), and beaten at the end by a real puzzle. The room's name says the moment (SPY VERSUS
  MOLE: he has caught up).
- **A cameo is never near enough to have caught him** (Chris on OPEN ARMS, 2026-11-24: "I was practically touching him. Then he ran
  away... he could have just got me"). He arrives where Monty came in only once Monty is well away (the cameo's box is the near side of
  the room), or out of reach (above, across a drop); he looks after him and goes back the way he came, giving up the chase, never running
  from Monty. `montyworld/test/viktor.ts` holds every border cameo `BORDER_CLEAR` cells from Monty from the moment it starts.
- **The obvious move must fail, visibly, and the fix must follow from the rule you have learned** ("walk under the float and pull
  the lever" was too easy: the head now warns for longer than a walker is under it, so you have to make him stand there, and he
  stands only where you stood). Aim for two to four attempts; prove the naive way fails and the intended one works with the bot.
- **The villain is one recognisable character, his pictures in one file** (Viktor Vole: `montyworld/src/art/viktor.ts`), so a redraw
  is an art swap; squashed, he goes exactly as Monty goes under a Mole Crusher (the original's four-way split), not an animation
  of our own.

## Words and sound

- **Names are plain and evocative first, a pun only when it lands** (Monty on the Run: THE HOUSE, SEWERAGE WORKS). A name that
  needs explaining is the wrong name. No James Bond puns. Check the room-name font draws every letter (it has no good Z).
- **Hints give the reason, in the story** (Chris: not "THE CITY GATE WANTS A RICE HAT" but that Monty needs a disguise). All
  game text goes through one writer that maps characters the font lacks (the apostrophe) to the game's own. That writer is `games/shared/monty/lettering.ts` (`gameText`, `textCode`; the apostrophe is the
  charset's '(' glyph); `montyworld/test/text.ts` draws every name, hint, sign and credit through it. A hint fits the name
  row (32 characters).
- **A new game is presented as the next adventure and a tribute, subtly** (Chris, 2026-11-22): its own title screen in the
  house style (never a copy of the original's), and the tribute named in the credits
  (Chris, 2026-11-23, for Do Svidaniya Monty: A NEW GAME BY CHRISTOPHER HICKMAN / A TRIBUTE TO PETER HARRAP / MUSIC BY ROB HUBBARD;
  no A MONTY MOLE ADVENTURE line, no "with Claude" in this game's title, credits or info card), never "fan game", and never
  implying the originals made it. The title is black all over, the sea's strip alone blue (a raster split: the title's `backdrop`).
- **No filler statistics** on titles, posters or credits. Credits are sourced, never invented; a new game says it is a new
  game, after the original it is built on.
- **References only to games Chris played and loves** (Willow Pattern, The Last Ninja, Jeff Minter's llamas); nothing he doesn't
  know, nothing that's a stretch.
- **Music:** Hubbard's own driver and tune; a region's version may change the scale and the instruments, never the tempo.
  Folk-tune breaks only from public-domain tunes, and only if they sound like part of the tune.
  Between regions the song never restarts (Chris, 2026-11-23): the version changes in step at the next phrase, at full volume
  (Chris picked no dip over the dip and the cut, 2026-11-24; `music/crossing.ts`, `c64kit/src/sid/crossing.ts`); so every version keeps the song's order and every pattern's length.
  Moscow's light touch is the model (2026-11-22, after Japan and the Pacific): the introduction is Hubbard's note for note (a version
  that bends it sounds like a glitch), a lead note bends only where the result is consonant with the bass under it (no minor second,
  major seventh or tritone), and the instrument carries the place (the Pacific: a steel guitar sliding into notes, a strummed backing,
  softer drums). Every version is checked for it (`test/music-kit.ts`).
  **One exception, on purpose** (Chris, 2026-11-24): Do Svidaniya Monty's flight (the sky) plays Auf Wiedersehen Monty's main
  theme (tune 0, Hubbard and Daglish) from that game's own .sid, a nod to the third game. It starts from its beginning on taking
  off and plays on through a death in the sky; the Andes after it go back to Hubbard's song with a clean change (the phrase
  crossing only works between versions of one song). The game's sound effects are routines of Hubbard's .sid, so over it the kit's own play instead (`overOther`: a coin's chirp, the frigatebird's screech, a knock's click, a death's crunch, on the overlay SID; Chris, 2026-11-24).
  Not a pattern for other places: one song is the rule (`montyworld/src/music/regions.ts`, `test/music-sky.ts`).

## How we build it

- **Plan first, together:** the story, the route, each region's places, items, costumes, food and mechanisms are agreed with
  Chris region by region before building. Expect him to correct geography and order; follow it exactly.
- **Pre-production runs ahead:** design docs and art for later regions can be made in parallel while earlier regions build;
  builders start from them.
- **Each region:** design, build with a bot that plays it through in both modes taking everything, then two adversarial reviews
  (design and play; engine and correctness), fixes, the full suite, ship. Monty on the Run must play exactly as before (its
  trace and title tests).
- **Never cut what he didn't ask to cut** (Chris, 2026-11-24, after the reset): a redesign adds and improves; removing or shrinking
  a room, a set piece or a route needs his OK first, named one by one. The 2026-11-23 reset ("fewer, stronger rooms") cut the
  Pacific from 17 rooms to 4 and the Andes and the Amazon from 12 to 8, and with them rooms he liked: the vine room, the three-room
  parachute drop, Hawaii's island hopping (the beach, the hula, the swimming). And a path drawn as a way out must lead somewhere: an
  opening at a room's edge with nothing behind it reads as a missing room.
- **Chris plays it and his notes come fast:** keep a pass running for his notes alongside the build; write every lesson back
  into this file.
- **Test the rooms a change is about, not the world** (Chris, 2026-11-23: "we really need these tests to be able to analyze
  individual rooms if that's all it concerns"; a one-room change re-ran whole-region bots for hours; 2026-11-24: "every change took
  30 to 60 minutes"). Testing is a budget: about 5 minutes a change (AGENTS.md, "Testing is a budget"). `node tools/affected.mjs`
  maps the diff's lines to rooms and prints what proves them, with times; one test over some rooms is `node tools/test.mjs <test> --room
  siberia.coal,12`. What makes it work, for the next Monty game too: every room-level test reads `SCOPE` (`scope.ts`); every part of a
  mechanism test is a `SCOPE.section([rooms], ...)` naming every room it enters, reads or can wander into (over-naming is safe,
  under-naming hides a failure); a region file writes each room and each mechanism entry as a literal naming its room (`id:` / `room:`)
  so a line can be traced to its room; the bots' route files keep each leg's rooms (`--record`). The full suites stay the ship gate.
- **Go fast:** build more, test less: the one test that exercises a change while iterating, the full gate once per batch before a
  deploy. Up to three tests at once, a few agents in parallel (`tools/wait-turn.sh`). Never push to main while a ship
  step is merging.
- **A death restarts the room as he came into it** (Chris, 2026-11-22: a restart in the room before "feels like an
  uncontrollable bug"; then, of the "last safe spot" that replaced it, "it seems to send us back to right before we died and I
  did not want that. You should restart at the beginning of the room as you entered"): in the room he died in, exactly where and
  how he came in (the entry the game recorded); only if that entry is itself deadly (it drops into danger) at the nearest place
  in the room he can stand; then a moment's grace. Never the previous room, never where he last stood: no "last safe spot"
  tracking (`montyotr/src/game.ts` `respawn`; the same in the remix, Monty Mole, Auf Wiedersehen Monty and, by the map's
  travel, Jet Set Willy II).

- **EASY or HARD, and nothing else** (Chris, 2026-11-24, in place of ORIGINAL/ENHANCED): the one switch is about the lives. EASY
  (the default): no lives, no lives counter (the score row's head and number are blank: `drawHudData` with `lives` null in
  `shared/monty/screen.ts`, `Game.livesShown`; the pause panel, THE END and the saves' summaries leave LIVES out) and a death
  restarts the room as he came into it; HARD: Monty on the Run's five lives. Every fix and help (the restart in the same room,
  the hints, the reward show) is on in both: a new Monty game's `assists` are all on, `lives` alone follows the switch. The
  bots' `newGame(data, enhanced)` keeps the original's rules for the tests that compare with it; in play nothing turns them off.

- **A lone Mole Crusher must be drawn in the first glyph bank ($10).** The engine animates the first crusher of a room on $10 and a second, only in a room of two, on $22; a lone one at $22 stood still (Moscow, Andes, Pacific, Japan). `crusherChars` in `games/shared/monty/rooms.ts` now picks the bank from the crusher's place in its room, and `montyworld/test/crushers.ts` checks that every crusher moves.


## Build pitfalls found making Japan (2026-11-22)

Things the engine does that a room's picture will not show you; each has a test now.

- **A lone Mole Crusher must be drawn in the first shaft's characters (`chr: 0x10`).** The engine animates the second shaft's (`0x22`) only when a room has two; a lone `0x22` crusher stands still (Japan's parlour did; Moscow, the Andes and the Pacific have lone `0x22` shafts to look at). Its glyphs also overwrite the font's letters P to Z in that room: no text decorations beside a crusher.
- **A decoration draws over whatever is in its cells, a floor or a rope included.** Keep decorations to empty cells and scenery tiles (`japan-mechanisms.ts` checks it), and never over a coin.
- **A gap he must fall through is three cells wide, a channel he must climb is two:** Monty is two cells wide. A one cell gap between a ledge's end and a wall is a trap (Japan's prize shelf), a one cell channel beside a rope is a wall (the crossing's overpass).
- **A bot that cannot get past a creature to a pickup has found a pickup a person cannot take either** (a coin in a creature's patrol, in a pocket the creature fills). Put pickups where a walker passes, and run the fairness check (`japan-fair.ts`: each pickup's leg from starts a few frames and pixels off).
- **A tunnel mouth with a `span` kills only where it is drawn,** and `harmless` is scenery that kills nothing (a train over the roofs, a crowd). Taxis and crowds on a clock make a crossing: a flash, the car, then the green man.
- **A creature must differ in colour from everything it passes** (`creature-contrast.ts`): check it when a room's palette or a creature's colour changes.

- **Every element has a playable purpose** (Chris on the Andes, 2026-11-22: "set up but not thought through from a playability stance"). Before a room is done, answer for each piece: a crusher crushes across a path he must take (not a pillar beside it), a platform leads somewhere or holds something, a coin is reachable from the way the room is played (several starts and timings: `fair from every start` in `andes-mechanisms.ts`), a creature has a lane it matters in (a bat that flies above every place he stands is no bat), a gate needs its item (the bot finds no way past it without). A blue thing rising from the ground reads as what it is (a hot spring's steam, a geyser that warns before it scalds) or it goes; a deadly spot looks deadly.
- **Hazards and creatures are drawn in front of the scenery, and stand out from it** (`montyworld/test/sprites-front.ts`, `creature-contrast.ts` for creatures and things on paths): a boulder in the brown of the rock behind it reads as going behind the mountain.
- **Never an unreachable way back**: a drop into a lower region needs a way up (a ladder), or he can drop before he has the item the lower region's gate wants. A creature that is a gate is a wall only in a lane two cells high or on a step as wide as it (a ceiling over a climb makes the climb impossible too).
- **The bot's state key must hold every timed thing's phase** (`bot.ts` `keyOf`: each roller by its own period, not the first's): with a hazard of its own period left out the search dedups states that are not the same and misses ways that exist.

## Build pitfalls found rebuilding the Andes (2026-11-23)

- **A jump rises 20 pixels, two and a half rows:** a step of three rows is a wall going up (a terrace that must be climbed back steps two rows at a time, or has a ladder).
- **A floor on row 4 or higher with nothing above it lets a jump leave by the top of the room** into the room above (a leaf fringe on row 0 stops it; a roof he can land on needs to be lower).
- **A vine or rope holds him standing only where it reaches his middle row** (the floor's row less one): a tip that only touches his head stops him without carrying him.
- **A jump off a vine's upper half carries about five cells:** what must be out of reach (a bough reached only one way) is farther than that from every vine's swing, or shielded (a curtain of leaves).
- **Prove every one-way piece with the bot's search, not by eye** (`andes-mechanisms.ts`: the bough only down the hollow, the high ledge only from the plateau): the search found both ways round a first layout that looked closed.
- **An open block's route is made by its ways out, not by its art** (the Amazon's first build let the well's liana step onto a walkway east, and the whole river was optional): give each room of the block only the exits the route wants (the canopy's floor open round one liana, the kapok entered only up the liana from the river, the east side of the canopy shut), then prove it by search with each crossing taken away (the vines taken down, a room's way shut).
- **A rope slung across a room needs a glyph that lies along the row:** the hanging rope's glyph repeated sideways reads as a fence of spikes (the canopy's first lattice), a hazard, not a thing to climb.
- **A step under a pass-through floor needs a hole in it** (Chris on THE FISH MARKET, 2026-11-24: "I cannot walk to the right at the
  top"): the stair of crates topped out a row under the market's roof (a floor he jumps up through) beside the roof's solid end, so he
  stood with his head in the roof against a wall, and nothing showed the way was straight up. A stair that climbs through a floor gets
  a hatch over its top step, and every step is a jump of two rows, as the steps below it.
- **Places on the exit grid are agreed between regions:** a region's way out is the next region's way in, at the same cell and rows (the Andes' kapok at [5,22], rows 6-7 on floor 8, into Rio's OPEN ARMS at [5,23]); `joins.ts` checks it only once both are merged.

- **A gate gives way where he uses the item, seen** (Chris, 2026-11-25: "if you have the item, the obstacle doesn't exist ... If you knew you knew, otherwise, huh?"): a room effect with `at` (a box of cells) waits until he comes up to the gate carrying the item, then happens there with the item's sound (the engine's `useOnTheSpot`), and what happens is drawn, not narrated: the tangle's cells go, a guard with `leaves` turns and walks off out of the room, harmless (`leaveTick`). Never a guard silently gone on coming in, and no line on the name row saying what the picture shows (no words on the screen).
- **The world's decoration kinds are a byte (255 with the text signs):** count them (`budget.ts`) before restoring old rooms with their pieces; reuse a kind another region already has where it reads as the thing (the Pacific's lifebuoy and small palm on the riverboat), free a kind no room places; past that, a region needs the per-load kind byte first (an engine change to agree with Chris).

## Coins, the Monty on the Run way (studied 2026-11-22, docs/dosvidaniya-reset.md)

Monty on the Run has 64 coins in 52 rooms: 0 in 14 rooms, 1 in 18, 2 in 14, 3 in 6, never more. Every coin has a reason, and
you can name it:

- **teaches the jump**: the start room's only coin is at the top of three small steps, away from its creatures;
- **tops a climb**: on the highest ledge or at a rope's head ($05, $0A, $1B);
- **one per height**: a coin in each lane of a room crossed twice ($11, $01);
- **seen now, reached later**: in $0D's low lane, seen from the sealed corridor above, reached after the hairpin;
- **at a hazard's edge**: on the post beyond the deadly pit ($12), the step by the deadly tiles ($0D);
- **guarded**: on a patrol or between two walkers ($26, $0F);
- **in a pocket off the route**: a short detour into a niche or alcove ($0E, $13);
- **inside the structure**: in the sewer's pipe lattice, taken only by climbing round it ($15);
- **tests the new move**: in a jetpack room's hollow that must be flown into ($1E, $1F).

A coin may hang on a back wall drawn as a decoration or as a non-solid tile: taken, its cell shows exactly what the room has there, in the room's colour (the engine
remembers what is under a coin; `backdrop-holes.ts` takes every coin of the world and compares the cell with the room drawn without it). A room added to a region
after it shipped goes last in the tables (`ADDED_ROOMS` in montyworld's data.ts): its coin takes a new place at the end, so no save's coins move (HEAVEN CAN WAIT, 2026-11-24). One owner lays out their sectors (`later-sectors.ts`): such a room's id is after every region's and its sector is its id (blank names fill the ids other work keeps), its tiles come last in the library (`art/later-tiles.ts`), and a region lists its own names and map colours by id (`<REGION>_LATER_NAMES`, `_COLOURS`).
- **An edge that runs off into nothing gets a bonus room, not a wall** (Chris, 2026-11-25: "why not just have a room to the left of that?"; "an opportunity to try some new things and add some fun challenges"): off the path, never needed, a striking backdrop of the place (HEAVEN CAN WAIT is the model), a challenge of its own made of the mechanisms we have used a new way (boughs that shed their snow under him, two boats that meet and wait, bamboo stalks gripped on the way down from a jump), one to three coins where the challenge ends. Give the bot a leg per step of such a climb: one search from the door to the top can run out where each step is found at once.

No lines of coins, no floors strewn with them, no coin floating out of reach, and no coin in a room with nothing to say. A region of 6
rooms holds about 7 to 10. (Do Svidaniya's Pacific, Andes and Rio had 3 to 7 a room, 215 in 40 rooms, and they read as random.)
