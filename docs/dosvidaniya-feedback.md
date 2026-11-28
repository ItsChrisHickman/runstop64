# Do Svidaniya Monty: Chris's playtest notes, room by room

The one list of what Chris has said about each room, and where it stands. New notes go here (one row per room; quote him), not
only into a chat. An agent fixing a room reads its row, and marks it **done** with the commit when its render shows the fix.
Region docs (`docs/dosvidaniya-<region>.md`) hold the design; this holds the to-do.

Statuses: **open**, **in pass** (a workflow is on it), **done** (commit), **his call** (a decision for Chris).

## Across the game

| Note | Status |
|---|---|
| "Basically everything in Siberia and China is super easy without any challenge"; after Russia: one creature a room, short patrols, nothing crossing the way. "Russia was perfect." Full pass: enemies as puzzles (skill `monty-room`, the recipe). | open |
| "Most enemies just move left and right or up and down... is MOTR really that simple?" Mix speeds and patterns. | open |
| Icicles "are never hard unless you stop and wait for them": fall on their own cycle (icicles.ts). | done (63cd3f6d): two options per icicle, `lead` (shakes ahead of him, walking on meets the fall) and `period` (drips on its own clock); YETI OR NOT and the ice cave lead, the ice cave's second, OFF THE BEATEN PATH and THE SEA CAVE drip. Moscow's left as they are (Moscow untouched) |
| On a death after taking an item: "getting an item and dying shouldn't count... when returning to the location wherein one entered the room, it should rewind the state of their items/coins" (2026-11-27). Fits EASY's restart "as he came into it"; both modes? Saves keep the entry state. | **decided: yes, both modes** (Chris 2026-11-27); queued after the challenge pass |
| The map on NEW GAME+ "is skipping rooms"; the rooms' colour cycling "doesn't actually mean anything. Different colors representing each unique region would make more sense" (2026-11-27) | open |
| "Andes seems to be Andes + Amazon... really two areas" (2026-11-27): split into two regions (map colour, music, sector names)? | **decided: split** (Chris 2026-11-27): two regions, own names, map colour, music; queued |
| 100% of the items: THE FULL MONTY (the bonus ending) is in the release merged on main, not deployed yet (2026-11-27). | ships with the release |
| The title screen's world map: "Hawaii is labelled nowhere near Hawaii (near New York if anything). Rio is also in the wrong spot - should be bottom right... there's a gap on the left and things aren't in the right order at all." A full pass on the title map (2026-11-27). | **decided: yes, a full map pass** (Chris 2026-11-27); queued |
| The pause panel shows ROOMS, ITEMS and SNACKS but no COINS (2026-11-27); the panel's lines are 11 characters (`statLine`), so 141/141 needs a layout. | **decided: yes** (Chris 2026-11-27); queued |
| Creature colours "the same 3 colours and a few cyan" (2026-11-27). Measured: MOTR is more concentrated overall (top three 63% vs our 44%) but has 3.2 creatures a room, so 48 of 51 rooms mix colours; ours 1.9 a room, 45 of 71. The fix is the challenge pass's third creature, in a colour of its own in that room; also check whether one creature always gets one colour everywhere. | open |
| The story's gap: "Intermole and Russia don't really collaborate" (2026-11-27). Nothing says why the KGB want him. Proposed scroller: INTERMOLE HAS FOUND MONTY ON MONTOS... EUROPE IS NO LONGER SAFE... HE SLIPS INTO RUSSIA WITH NO PASSPORT... THE KGB THINK HE IS A SPY... AND SEND VIKTOR VOLE... MOSCOW TO RIO... (Viktor past the USSR: one agent's obsession). | **done** (Chris 2026-11-27: no KGB; "Intermole finds Monty, Monty flees east, but Russian operative Viktor Vole is hot on the trail") |
| Rooms that look walkable left or right but are not: decide where the room would be (`docs/dosvidaniya-edges.md`). | open |
| Black boxes where pickups were (backgrounds not refilled: layout.ts `fillWhere` keep lists). | done (be379195): the room builder fills the 25 holes under coins and finds in backdrops, a find over a backdrop is drawn in front; backdrop-holes.ts checks it |
| Water that drowns a snorkeller outside swim rooms. | open (measured: every such water reaches the room's foot, so none is shallow enough to wade; all 12 rooms come after the snorkel: the Pacific's ship $26, Lahaina $2e, the fish market $31, Kona $5a, the falls $5d; the Andes' boat $40, roots $41, sandbar $42, cloud $54, vine $55, ends $5e; Rio's float $4c. The way: swimming in a body of water with the snorkel (an engine piece of swim.ts: buoyant to its waterline, out at the surface) where the room means it as water, and drawn as what kills (breakers, piranhas, the canal's wake) where a set piece needs it deadly: the vine crossing, the floats over the canal, overboard from the ship. Each room's pick goes with its region job; Hawaii, Andes, Rio) |
| Viktor's look (2026-11-27): "looks good on the home screen, but in the game he's solid white and looks nothing like he does on the title screen". The title layers several one-colour sprites (coat, face...); a cameo has one sprite slot, so he is a white silhouette. Fix: a multicolour in-game sprite in his title colours, the dark coat outlined so it reads on dark rooms. | **decided: yes, multicolour in-game sprite** (Chris 2026-11-27); queued |
| Viktor cameos: "appears right by Monty and runs away"; at the fish market "runs into Monty then runs away... he is trying to chase Monty and can't reach him yet". In GONE WITH THE WIND "is that him?! It's confusing". On ON HIS TAIL he "appears out of nowhere and you can die just by being in the wrong spot". | border cameos done (63cd3f6d, 6b32eed5): he runs on after Monty, is stopped at a brink (the tower top, the border post, the inlet, the branch tip), shakes his fist and stays, and is gone should Monty come back within 10 cells of him (OPEN ARMS's canopy is reachable); OPEN ARMS's cameo no longer draws over the guarana; GONE WITH THE WIND's tengu done (2b49403a: drawn in the room's characters, hovering by the gust, no figure flying in); ON HIS TAIL open |

## Siberia

| Room | Chris | Status |
|---|---|---|
| The watchtower | "top row enemies pose no threat and serve no purpose" | open |
| Don't rock the boat | "pretty but has no challenge" | open |
| Off the beaten path | "cool ideas but no challenge" | done (352f6f37, d271be10, 65b21899): a bat up and down the gap the boughs zig-zag across (each hop timed to it, on snow that sheds), a white reindeer on the trail between where he comes in and the lowest bough, a snowball under the west boughs where a slip lands him |
| Border line case | "both water bridges should break faster" | done (352f6f37, d271be10, 65b21899): the ice goes after 40 frames (was 120), so a walk across falls through and every crossing takes a jump; from the sandbar he reads the reindeer (quick, from the bank out over the second ice) and the guard (slow, down the watchtower ladder); stepping in from China the reindeer heads away from him (it was a trap there) |
| Sleeper hit, the gravy train | "well drawn but the enemies pose little challenge" | done (352f6f37, d271be10, 65b21899): a pigeon drops onto the dining car's roof between the hatches (timed with the mountain); inside, the samovar runs the floor between the hatches' feet across the conductor's walk; the provodnitsa walks the whole corridor quick, jumped where she turns, both ways; the ticket's gates give way where it is used, seen, and stay open. The sleeper's roof left as the release built it (its mountain timings are already tight). The coupling puzzle: his call (below) |
| Siberia you later | "the enemies are pretty poorly done. The first you can fall on it you are unlucky. The enemy on the roof poses no threat" | done (352f6f37, d271be10, 65b21899): the balalaika runs quick toward the landing and turns two cells short of it (it guards the coin); the car's guard walks from the door to the hatch's ladder (in behind him, up before he turns); the samovar walks the car's roof over the hatch (wait on the ladder, go as it heads west). Only the creatures changed |
| Mine all mine | "no challenge" | done (352f6f37, d271be10, 65b21899): the two shafts' bats at different speeds (136 and 416 frames a lap, never in step), so the gaps on the gantry and over the cart drift and have to be read; the miner's window as it was |
| Bullet point | "needs to be harder. The train is too easy to not encounter" | open |
| The train's points/coupling puzzle | (the release reviewer's idea: the steam valve extended across the dining car, the sleeper and the tender) | his call (recommended: play the release's steam valve first, then decide; not built) |

## China

| Room | Chris | Status |
|---|---|---|
| All wall and no play | "the Viktor cameo makes no sense" | done (63cd3f6d): he runs out on the border post's top after Monty and is stopped by its drop, shaking his fist |
| Noodle market | the falling floor "won't fall if you just run and if it does... So what? You just fall to a safe spot" | open |
| The Forbidden City | "very easy. Nothing to it" | open |
| Heaven can wait | "no enemies, easy layout" | open |
| The emperor's rooftop | "a vertical enemy that you can't hit unless you try" | open |
| Willow pattern | "koi should jump" | open |
| Down the river | "ridiculously easy" | open |

## Japan

| Room | Chris | Status |
|---|---|---|
| Mt Fuji | "love the Donkey Kong feel... needs more snowballs at a time" | done (63cd3f6d): three snowballs on the path, 153 frames apart, two on the climb at once |
| Japan's gates, cause and effect (back-half plan: "a picture of the wanted thing over the guard") | - | done (2b49403a, 4e1cbbea): used where they are, seen, kept (2b49403a); each now shows what it wants before he has it: the item's own picture blinks over the gate (the daruma beside the shutter's top, the fish food over the far planks, the hood over the hideout's door) and goes as he uses the item there (4e1cbbea) |
| Bullet point | "also needs to be harder. The train is too easy to not encounter" (2026-11-26, from docs/dosvidaniya-japan.md) | done (2b49403a): the underpass is walled under the deck's middle, so the platform between the two stairs is the way: two runs along the trains' lane, each about the quiet moment long, read from the stairs; the daruma rolls the shutter up where he comes to it (kept) |
| Fish market, crossing, parlour, koi polloi (no notes; the challenge pass) | - | done (2b49403a): the fish market's third creature (a kappa leaping out of the inlet across the jump in), the quay kappa quick; the crossing's overpass swept quick by the daruma with a karakasa hopping onto it, a second over the street's pocket; the parlour's walkers spread over the two halves of the floor (the daruma through the crusher's lane); the tanuki quick; the fish food used at the pond's edge (kept). KOI POLLOI reopened by the review (both koi left with the food: one puzzle) and fixed (4e1cbbea): the food sends only the quick koi off, the slow one keeps leaping across the first plank's jump, so the crossing is waited for from the bank, both ways (the bot crosses it timed) |
| Gone with the wind | "too easy"; Viktor there is confusing | done (2b49403a): the tengu is drawn in the room's characters in his colours (red long-nosed face, white hair, grey crow's wings, purple robe, yellow fan), hovering by the gust and flapping, no figure flying in; two snow women drift across the tube on two periods (quick between the hump and the frozen fall, slow before the dripping icicle over the first coin) |
| The last mole | "the flying enemy isn't positioned in a place that he poses a threat" | done (2b49403a): the crane flies low and quick across the stones at a jump's height (and across the bamboo rope); two koi (across the first jump and the jump to the fourth stone, two speeds); Viktor's moon shadow on sprite 1 |
| Shoot for the moon | "no challenge" | done (2b49403a): two cranes cross the stalks' heights on two periods (quick and high across the climbs, slow and low across the jumps' landings) |
| Ninja hideout | "no challenge. Should have much more interesting enemy patterns" | done (2b49403a): a shuriken thrown along the ground from the cedar to the door (watched from the rope's foot), a ninja leaping in an arc between the first two walkways, a second dropping from the bamboo onto the third, the samurai quick on the ridge; the door guard walks off where Monty comes to him in the hood (kept); the east edge closed |
| The shogun's hall, Sayonara sailor | "actually pretty good"; Sayonara sailor "would be nice if there was a third enemy" | done (2b49403a): the hall kept as the model; SAYONARA SAILOR's third creature, a tanuki, walks the quay quick at the rope's foot (a second puzzle apart from the sumo and kappa jump) |

## Hawaii ("level design is pretty cool. Enemy placement is terrible")

| Room | Chris | Status |
|---|---|---|
| Welcome to Honolulu | the walker "should go much further left and right and be faster"; the flyer "doesn't really pose a threat"; the drop bottom right "doesn't tell me there's water down there" | open |
| Lei of the land | "there should be a room to the left" (and the snorkel there?); the floater "almost completely impossible to hit", "there should be another enemy"; the right one "also impossible to hit" | open; snorkel stays at THE LOOKOUT (his call to overturn); bonus room $63 west |
| Diamond Head | "love the design but there's no challenge at all"; the rolling thing is Mt Fuji's idea, "not executed well and too repetitive" | open |
| The lookout | "needs some work. What exactly am I looking out at?"; a bird "isn't doing anything"; "the blue background has black holes" | open |
| Channel surfing | the dolphin took a moment to read; "looks like I'm supposed to go to the left and I can't" | open; west closed by Koko Head (his call) |
| Whale of a time | "nothing really going on... nothing to do with the whale" | open |
| The sea cave | flow arrows "should be white, not black"; black boxes from pickups; needs challenge (icicles on their own) | open |
| Road to Hana | "great, but the cars need to be moving constantly and might need to be two at a time" | open |
| Kaihalulu | the right side's hole unclear; blue water kills with a snorkel: "a confusing scene" | open |
| Shell game | "needs to be harder. Pretty cool idea" | open |
| Tona | one crab "behind blocks... positioned in a harmless way"; "why would I drown in that little bit of water" | open |
| Mauna Kea / Monica | "one enemy so there's no challenge" | open |
| The summit | "beautifully done but there's really nothing in here... looks like I should be able to walk left and right" | open; bonus rooms $65 west, $66 east |
| Akaka Falls | "literally nothing going on... an enemy that no one would jump into" | open |
| Coffee break | "where is the challenge?"; "needs to be redesigned... looks like I should be able to walk to the room to the right, but there's no way based on the map" | open |
| Mauna Loa | "pretty good" but two lava flows "seems really weird"; the right one "doesn't have any purpose" | open |

## The flight, the Andes

| Room | Chris | Status |
|---|---|---|
| Stormy weather | "only one giant wave. There should be more waves that move faster" | open |
| On his tail | Viktor appears from nowhere and kills | open |
| The parachute drop | "still extremely short and non-memorable. All the mechanics are great but the level design is terrible" | done (3e130c2b, 1a7b6538, b145da7f): a second line down, decided in the edges audit ($67-$69 = ids 103-105): east off JUMP FOR JOY's shoulder into COLD SHOULDER (crevasses between two crags, a quick condor across the glide, a slow one over the pocket's updraft to the crag's coin), CHIMNEY SWEEP (two ways in meet in a chimney that turns round a ledge and a crag, three condors) and WING AND A PRAYER (over Machu Picchu, landing at the Intihuatana under the boulders): six flight rooms, every one with creatures (JUMP FOR JOY two now); the first line's canyon and gorge each a third condor. A player who takes one line misses the other's coins and the gorge's empanada until he travels back to JUMP FOR JOY on the map: his call whether that is fine |
| The Inca bridge | "an enemy that walks left and right in a really close pattern... not so much a puzzle as just annoying" | done (3e130c2b, 1a7b6538): no shuttle; the place's hazard: a rock drops down the cleft past the logs every 150 frames, a condor glides the whole trail high (duck onto the lower trail as it passes), the vizcacha hops up and down at the step to the trail's end |
| The canopy | "not enough enemies... designed amazingly for there to be something interesting" | done (3e130c2b): a jaguar on the bough under the well's liana (wait on the liana, drop as it heads east), the toucan twice as quick across the lattice, the sloth slow on the middle liana |
| Cloud nine | "Awesome!", lacks one enemy | done (3e130c2b): a toucan up and down across the canopy's liana on the way in (the third); the bear walks the whole floor east of the stream, quick, under the liana's foot |
| The river ends | "a terrible room name" (2026-11-27) | done (3e130c2b): renamed BANK HOLIDAY; its creatures redone (the anaconda drops onto the stair's top step over its coin, the dolphin leaps quick across the jump from the bank, a toucan sweeps the upper stair) |
| Open arms | Viktor "ran out then ran away - silly"; "almost impossible to jump over the rat at the top left... I can get the item while dying at best" (2026-11-27) | done (352ad1ad, 24d0461c): no creature on the west arm (its snack a climb); the marmoset darts the open floor east of the chapel, fast, never in the two-row passage (wait in its mouth, step out and climb the Redeemer's ladder as he darts east); the vulture dives slow and long across the arm and his floor. Viktor's cameo as redone in 63cd3f6d (stopped at the branch tip) |
| No probllama, Machu Picchu, Branching out, Vine and Dandy, Up the creek, The roots (no notes; the challenge pass) | - | done (3e130c2b, 1a7b6538): the terraces' llamas walk (the broad terrace's end to end, slow; the low path's quick, on a different period: 473d759f); Machu Picchu's boulders kept on the climb, the cuy quick, Huayna Picchu light green; the kapok's anaconda quick, the jaguar the walkway's length, a toucan along the branch; VINE AND DANDY's sloth and a cock-of-the-rock drop onto its two logs on two periods; the creek a bird over the second log and a cuy on the sandbar; THE ROOTS (none before) an anaconda down the liana and a bird over the log |
| The Andes' gates, cause and effect | - | done (3e130c2b): the panpipes' picture blinks in the tunnel's mouth over the llama, the chullo's at the cargo deck's foot, the machete's over the tangle, until he uses the item there; then kept done (hidden finds). One owner (wanted.ts, art/wanted.ts), Japan's moved onto it |
| The river queen (returning) | "the Viktor cameo didn't make any sense at all" (2026-11-27) | his call: no Viktor cameo plays aboard in this build (the only one on the way out is OPEN ARMS's, redone in 63cd3f6d: he is stopped at the branch tip); if he still sees one aboard, a save would show where. The room's creatures: a macaw drops at the machete (3e130c2b) |

## Rio

| Room | Chris | Status |
|---|---|---|
| House of colour | "Monty starts running fast... but I never grabbed that drink that was supposed to be the trigger" (a bug); "the green background fill makes it look VERY busy" (2026-11-27) | done (352ad1ad): the run came from NEW GAME+, which gave every key item at the start, the guarana among them: it now gives all but the guarana (plus.ts `plusItems`), so he runs only once he drinks it (a NEW GAME+ game begun before keeps it taken: begin NEW GAME+ again). The green hill behind every gap is gone (black behind the houses, the alley's posts and the lane's way out, 24d0461c). Three speeds in a row (24d0461c): the football fast out of the well, a macaw diving slow onto the east roofs past it, the kite down the lane's drop. The rooftop edge closed: the church reaches the room's top and Lapa's townhouse wall runs to its edge (no slot beside it) |
| Rio or bust (the ending) | "Monty's beach is black now - so he looks like he's floating in the air - background fill removal was not good here"; the second showing, during the credits, is fine (2026-11-27) | done (352ad1ad): the close-up's sand runs from the sea down to his feet, plain, as the credits' showing has it |
| Lapa, Beat the drum, Float your boat, Steak your claim, Spy versus Mole (no notes; the challenge pass) | - | done (352ad1ad; docs/dosvidaniya-rio.md "Challenge pass"): Lapa's capoeirista quick down the street's length, the bat and the stone on their own clocks, a vulture over the track's east end; the two dancers cross the carnival's street under the Selaron steps on two periods; FLOAT YOUR BOAT (no creature before) a macaw over the canal across both lanes and a kite across the grandstand's ladder; the grill's gaucho walks to the ladder's head. 24d0461c: SPY VERSUS MOLE's drummer marches the avenue across the rope's foot (timed twice, the second with the agent on his trail), clear of the crush; Lapa's capoeirista and the passista fast (speed 3) |
