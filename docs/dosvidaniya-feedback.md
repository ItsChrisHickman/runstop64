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
| Icicles "are never hard unless you stop and wait for them": fall on their own cycle (icicles.ts). | open |
| On a death after taking an item: "getting an item and dying shouldn't count... when returning to the location wherein one entered the room, it should rewind the state of their items/coins" (2026-11-27). Fits EASY's restart "as he came into it"; both modes? Saves keep the entry state. | his call (recommended: yes, both modes) |
| The map on NEW GAME+ "is skipping rooms"; the rooms' colour cycling "doesn't actually mean anything. Different colors representing each unique region would make more sense" (2026-11-27) | open |
| "Andes seems to be Andes + Amazon... really two areas" (2026-11-27): split into two regions (map colour, music, sector names)? | his call |
| 100% of the items: THE FULL MONTY (the bonus ending) is in the release merged on main, not deployed yet (2026-11-27). | ships with the release |
| Rooms that look walkable left or right but are not: decide where the room would be (`docs/dosvidaniya-edges.md`). | open |
| Black boxes where pickups were (backgrounds not refilled: layout.ts `fillWhere` keep lists). | open |
| Water that drowns a snorkeller outside swim rooms. | open |
| Viktor's look (2026-11-27): "looks good on the home screen, but in the game he's solid white and looks nothing like he does on the title screen". The title layers several one-colour sprites (coat, face...); a cameo has one sprite slot, so he is a white silhouette. Fix: a multicolour in-game sprite in his title colours, the dark coat outlined so it reads on dark rooms. | open |
| Viktor cameos: "appears right by Monty and runs away"; at the fish market "runs into Monty then runs away... he is trying to chase Monty and can't reach him yet". In GONE WITH THE WIND "is that him?! It's confusing". On ON HIS TAIL he "appears out of nowhere and you can die just by being in the wrong spot". | open |

## Siberia

| Room | Chris | Status |
|---|---|---|
| The watchtower | "top row enemies pose no threat and serve no purpose" | open |
| Don't rock the boat | "pretty but has no challenge" | open |
| Off the beaten path | "cool ideas but no challenge" | open |
| Border line case | "both water bridges should break faster" | open |
| Sleeper hit, the gravy train | "well drawn but the enemies pose little challenge" | open |
| Siberia you later | "the enemies are pretty poorly done. The first you can fall on it you are unlucky. The enemy on the roof poses no threat" | open |
| Mine all mine | "no challenge" | open |
| Bullet point | "needs to be harder. The train is too easy to not encounter" | open |

## China

| Room | Chris | Status |
|---|---|---|
| All wall and no play | "the Viktor cameo makes no sense" | open |
| Noodle market | the falling floor "won't fall if you just run and if it does... So what? You just fall to a safe spot" | open |
| The Forbidden City | "very easy. Nothing to it" | open |
| Heaven can wait | "no enemies, easy layout" | open |
| The emperor's rooftop | "a vertical enemy that you can't hit unless you try" | open |
| Willow pattern | "koi should jump" | open |
| Down the river | "ridiculously easy" | open |

## Japan

| Room | Chris | Status |
|---|---|---|
| Mt Fuji | "love the Donkey Kong feel... needs more snowballs at a time" | open |
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
