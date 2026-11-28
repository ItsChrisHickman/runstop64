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
| The watchtower | "top row enemies pose no threat and serve no purpose" | done (5566c625): the cricket hops onto the walkway east of the trapdoor's rope (wait on the rope, pass under while it is up), the lantern drops over the stair, the warrior marches the floor fast (a China room, filed here) |
| Don't rock the boat | "pretty but has no challenge" | done (5566c625): two koi leap in the lake, one in each boat's half at periods unlike the boats': the ride is chosen from the quay and the change of boats timed (a China room) |
| Off the beaten path | "cool ideas but no challenge" | open |
| Border line case | "both water bridges should break faster" | open |
| Sleeper hit, the gravy train | "well drawn but the enemies pose little challenge" | open |
| Siberia you later | "the enemies are pretty poorly done. The first you can fall on it you are unlucky. The enemy on the roof poses no threat" | open |
| Mine all mine | "no challenge" | open |
| Bullet point | "needs to be harder. The train is too easy to not encounter" | open |

## China

| Room | Chris | Status |
|---|---|---|
| All wall and no play | "the Viktor cameo makes no sense" | done (63cd3f6d): he runs out on the border post's top after Monty and is stopped by its drop, shaking his fist; the room's challenge (5566c625, 6d1522d8): the panda paces the whole foot of the wall fast (the low line), a pogo monk bounces over the stair (the high line); the kite is gone, as the cameo needs the third creature sprite (the fourth, sprite 7, is the ushanka he wears in, which hid the cameo) |
| Noodle market | the falling floor "won't fall if you just run and if it does... So what? You just fall to a safe spot" | done (5566c625): the rotten awning lies wholly over the street's hole as one patch that goes 14 frames after he steps on it (a walk across is about 32): jumped, the coin taken on the jump; a fall is down the hole into the hutong and the climb again |
| The Forbidden City | "very easy. Nothing to it" | done (5566c625): a fast lion in the outer court; past the gate (its guard walks off as he comes up in the rice hat) a lantern drops beside the rope up to the roofs (6d1522d8: the inner court's panda is gone, a fourth creature on the rice hat's sprite 7 was never drawn nor touched him; the trapdoor and the gate kept for saves from before, too) |
| Heaven can wait | "no enemies, easy layout" | done (5566c625): the eaves three cells apart (judged jumps), a fast guard on the ridge, a kite over the middle eave, a cricket hopping by the coin |
| The emperor's rooftop | "a vertical enemy that you can't hit unless you try" | done (5566c625): the lantern drops over the top eave (the hop to the ridge waits for it); a fast lion on the low ridge, a dove along the high ridge to the way east |
| Willow pattern | "koi should jump" | done (5566c625): two koi leap in arcs over the first two gaps at periods of their own against the arms'; a dove down the bank's steps, one dropping over the island's landing |
| Down the river | "ridiculously easy" | done (5566c625): a fast cricket on the rotten jetty (jumped on planks that will not wait), a gull diving over the jetty's end (wait on the crane's rope), a carp leaping over the raft |

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
| Welcome to Honolulu | the walker "should go much further left and right and be faster"; the flyer "doesn't really pose a threat"; the drop bottom right "doesn't tell me there's water down there" | in pass |
| Lei of the land | "there should be a room to the left" (and the snorkel there?); the floater "almost completely impossible to hit", "there should be another enemy"; the right one "also impossible to hit" | in pass |
| Diamond Head | "love the design but there's no challenge at all"; the rolling thing is Mt Fuji's idea, "not executed well and too repetitive" | in pass |
| The lookout | "needs some work. What exactly am I looking out at?"; a bird "isn't doing anything"; "the blue background has black holes" | in pass |
| Channel surfing | the dolphin took a moment to read; "looks like I'm supposed to go to the left and I can't" | in pass |
| Whale of a time | "nothing really going on... nothing to do with the whale" | in pass |
| The sea cave | flow arrows "should be white, not black"; black boxes from pickups; needs challenge (icicles on their own) | in pass |
| Road to Hana | "great, but the cars need to be moving constantly and might need to be two at a time" | in pass |
| Kaihalulu | the right side's hole unclear; blue water kills with a snorkel: "a confusing scene" | in pass |
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
