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
| On a death after taking an item: "getting an item and dying shouldn't count... when returning to the location wherein one entered the room, it should rewind the state of their items/coins" (2026-11-27). Fits EASY's restart "as he came into it"; both modes? Saves keep the entry state. | his call (recommended: yes, both modes) |
| The map on NEW GAME+ "is skipping rooms"; the rooms' colour cycling "doesn't actually mean anything. Different colors representing each unique region would make more sense" (2026-11-27) | open |
| "Andes seems to be Andes + Amazon... really two areas" (2026-11-27): split into two regions (map colour, music, sector names)? | his call |
| 100% of the items: THE FULL MONTY (the bonus ending) is in the release merged on main, not deployed yet (2026-11-27). | ships with the release |
| The title screen's world map: "Hawaii is labelled nowhere near Hawaii (near New York if anything). Rio is also in the wrong spot - should be bottom right... there's a gap on the left and things aren't in the right order at all." A full pass on the title map (2026-11-27). | open |
| The pause panel shows ROOMS, ITEMS and SNACKS but no COINS (2026-11-27); the panel's lines are 11 characters (`statLine`), so 141/141 needs a layout. | open |
| Creature colours "the same 3 colours and a few cyan" (2026-11-27). Measured: MOTR is more concentrated overall (top three 63% vs our 44%) but has 3.2 creatures a room, so 48 of 51 rooms mix colours; ours 1.9 a room, 45 of 71. The fix is the challenge pass's third creature, in a colour of its own in that room; also check whether one creature always gets one colour everywhere. | open |
| The story's gap: "Intermole and Russia don't really collaborate" (2026-11-27). Nothing says why the KGB want him. Proposed scroller: INTERMOLE HAS FOUND MONTY ON MONTOS... EUROPE IS NO LONGER SAFE... HE SLIPS INTO RUSSIA WITH NO PASSPORT... THE KGB THINK HE IS A SPY... AND SEND VIKTOR VOLE... MOSCOW TO RIO... (Viktor past the USSR: one agent's obsession). | his call |
| Rooms that look walkable left or right but are not: decide where the room would be (`docs/dosvidaniya-edges.md`). | open |
| Black boxes where pickups were (backgrounds not refilled: layout.ts `fillWhere` keep lists). | done (be379195): the room builder fills the 25 holes under coins and finds in backdrops, a find over a backdrop is drawn in front; backdrop-holes.ts checks it |
| Water that drowns a snorkeller outside swim rooms. | open (measured: every such water reaches the room's foot, so none is shallow enough to wade; all 12 rooms come after the snorkel: the Pacific's ship $26, Lahaina $2e, the fish market $31, Kona $5a, the falls $5d; the Andes' boat $40, roots $41, sandbar $42, cloud $54, vine $55, ends $5e; Rio's float $4c. The way: swimming in a body of water with the snorkel (an engine piece of swim.ts: buoyant to its waterline, out at the surface) where the room means it as water, and drawn as what kills (breakers, piranhas, the canal's wake) where a set piece needs it deadly: the vine crossing, the floats over the canal, overboard from the ship. Each room's pick goes with its region job; Hawaii, Andes, Rio) |
| Viktor's look (2026-11-27): "looks good on the home screen, but in the game he's solid white and looks nothing like he does on the title screen". The title layers several one-colour sprites (coat, face...); a cameo has one sprite slot, so he is a white silhouette. Fix: a multicolour in-game sprite in his title colours, the dark coat outlined so it reads on dark rooms. | open |
| Viktor cameos: "appears right by Monty and runs away"; at the fish market "runs into Monty then runs away... he is trying to chase Monty and can't reach him yet". In GONE WITH THE WIND "is that him?! It's confusing". On ON HIS TAIL he "appears out of nowhere and you can die just by being in the wrong spot". | border cameos done (63cd3f6d, 6b32eed5): he runs on after Monty, is stopped at a brink (the tower top, the border post, the inlet, the branch tip), shakes his fist and stays, and is gone should Monty come back within 10 cells of him (OPEN ARMS's canopy is reachable); OPEN ARMS's cameo no longer draws over the guarana; GONE WITH THE WIND's tengu and ON HIS TAIL open |

## Siberia

| Room | Chris | Status |
|---|---|---|
| The watchtower | "top row enemies pose no threat and serve no purpose" | open |
| Don't rock the boat | "pretty but has no challenge" | open |
| Off the beaten path | "cool ideas but no challenge" | done (352f6f37, d271be10): a bat up and down the gap the boughs zig-zag across (each hop timed to it, on snow that sheds), a white reindeer on the trail where he comes in and where a slip lands him |
| Border line case | "both water bridges should break faster" | done (352f6f37, d271be10): the ice goes after 40 frames (was 120), so a walk across falls through and every crossing takes a jump; from the sandbar he reads the reindeer (quick, on the landing) and the guard (slow, down the watchtower ladder) |
| Sleeper hit, the gravy train | "well drawn but the enemies pose little challenge" | done (352f6f37, d271be10): a pigeon drops onto the dining car's roof between the hatches (timed with the mountain); the provodnitsa walks the whole corridor quick, jumped where she turns, both ways; the ticket's gates give way where it is used, seen, and stay open. The sleeper's roof left as the release built it (its mountain timings are already tight). The coupling puzzle: his call (below) |
| Siberia you later | "the enemies are pretty poorly done. The first you can fall on it you are unlucky. The enemy on the roof poses no threat" | done (352f6f37, d271be10): the balalaika runs quick toward the landing and turns two cells short of it; the samovar walks the car's roof over the hatch (wait on the ladder, go as it heads west). Only the creatures changed |
| Mine all mine | "no challenge" | done (352f6f37, d271be10): the two shafts' bats at different speeds, so the gaps on the gantry and over the cart drift and have to be read; the miner's window as it was |
| Bullet point | "needs to be harder. The train is too easy to not encounter" | open |

| The train's points/coupling puzzle (the release reviewer's idea: the steam valve extended across the dining car, the sleeper and the tender) | his call (recommended: play the release's steam valve first, then decide; not built) |

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
| Gone with the wind | "too easy"; Viktor there is confusing | open |
| The last mole | "the flying enemy isn't positioned in a place that he poses a threat" | open |
| Shoot for the moon | "no challenge" | open |
| Ninja hideout | "no challenge. Should have much more interesting enemy patterns" | open |
| The shogun's hall, Sayonara sailor | "actually pretty good"; Sayonara sailor "would be nice if there was a third enemy" | open |

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
| The parachute drop | "still extremely short and non-memorable. All the mechanics are great but the level design is terrible" | open; a second parachute line $67-$69 into MACHU PICCHU (his call) |
| The Inca bridge | "an enemy that walks left and right in a really close pattern... not so much a puzzle as just annoying" | open |
| The canopy | "not enough enemies... designed amazingly for there to be something interesting" | open |
| Cloud nine | "Awesome!", lacks one enemy | open |
| The river ends | "a terrible room name" (2026-11-27) | open |
| Open arms | Viktor "ran out then ran away - silly"; "almost impossible to jump over the rat at the top left... I can get the item while dying at best" (2026-11-27) | open |
| The river queen (returning) | "the Viktor cameo didn't make any sense at all" (2026-11-27) | open |

## Rio

| Room | Chris | Status |
|---|---|---|
| House of colour | "Monty starts running fast... but I never grabbed that drink that was supposed to be the trigger" (a bug); "the green background fill makes it look VERY busy" (2026-11-27) | open |
| Rio or bust (the ending) | "Monty's beach is black now - so he looks like he's floating in the air - background fill removal was not good here"; the second showing, during the credits, is fine (2026-11-27) | open |
