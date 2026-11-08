# Wanted: Monty Mole Remix: the plan

*Status: planned and approved by Chris ("Decided" below); stages 0-5 made (prototype, the shared Monty, the 21 rooms, the game, the passability bot, the front end: loadable at `#montymoleremix`, `listed: false` until Chris has played it); stage 6 (the scenes and the end) is still to do. Chris's corrections after stage 3 are done: the coal is Wanted's own piece, each tool is Wanted's own object, the crushers are the original's picture line for line, the creature kinds are paired by hand (see "After Chris's corrections"). Nothing of the live games changed. The faithful Spectrum rebuild (`games/montymole`, ORIGINAL there, loadable at `#montymole`) stays as it is; the remix is a game of its own, **WANTED MONTY MOLE REMIX** in the directory.*

Chris's brief: Wanted's 21 rooms, coal, creatures and story, played with **Monty on the Run's Monty**: his walk speed, the somersault jump, his animation, the death sequence, the controls, the sound, the smooth motion and the C64 look. A native rebuild like the others: Wanted's own data (rooms, coal, creatures' paths, gates) read from `games/montymole`, Monty and his physics from `games/montyotr`, put together in a folder of its own. Studies of both engines are in each game's `re/README.md`; this plan records only what the remix needs from them.

## The pick

**Redraw Wanted's rooms on Monty on the Run's playfield, by role, and run them on a Monty that both games share.**

1. **Rooms: retile by role.** The two games' playfields are the same grid: **32 x 20 cells of 8 x 8** (Wanted: screen rows 2-21; Monty on the Run: screen rows 3-22, columns 4-35). A Wanted cell is a Monty on the Run cell: no scaling, no change of aspect, every exit where it was. What changes is what a cell is drawn with. Each Wanted tile is read for its *role* (what the original's physics makes of it: solid, holds from above, rope, deadly, scenery) and drawn with the Monty on the Run tile of that role (brick, hatched rock, thin ledge, rope, water) in the C64 colour the Spectrum tile had. Each room comes out as what Monty on the Run's rooms are made of: eight tiles and 640 codes. This is `games/montymoleremix/src/retile.ts`, written and shown in the prototype below.
2. **Monty: shared, not copied.** Monty on the Run's walking, jump arc, falling, ropes and animation (`montyotr/src/monty.ts`, 280 lines), his sprite frames and his death scripts move to a shared module both games import (`games/shared/monty/`), with montyotr's behaviour pinned by a trace test first. The remix has its own game class (Wanted's rules over the shared Monty), not a Monty on the Run `Game` with Wanted's rooms poked in: that would carry the C5, the jetpack, the lifts, the teleporters and 52 rooms of Monty on the Run's scripting into a game that has none of them, and cap it at the four enemy sprites Monty on the Run's rooms need where Wanted has up to six.
3. **Picture: Monty on the Run's own.** The same `Vic` model and `VicView` (c64kit) draw both: characters 1-8 are the room's tiles, Monty and the creatures are VIC sprites, collisions between sprites are the VIC's. No new renderer, and the smoothing, phone scaling and touch layout come with it.
4. **Wanted's world rules stay Wanted's** (creatures' legs and relays, the coal and its gates, the tool, the crusher, the retractable floors), ticking at Wanted's 25 passes a second inside the 50 Hz frame, drawn with Monty on the Run's creatures.

Why not the alternatives. *Wanted's rooms in Wanted's tiles with Monty on the Run's Monty on top*: the physics reads cells (a tile's class), not a Spectrum picture, so Wanted's pixel-exact decorations could not hold Monty up the way the original's did, and the picture would be a Spectrum room with a C64 hero: the opposite of "look like Monty on the Run". *Re-authoring the rooms by hand*: 21 rooms of layout for a remake whose point is Wanted's rooms; the retiling is automatic and a bot (below) proves each room.

## What the two games do, side by side

Measured from the code (Monty on the Run: `montyotr/src/monty.ts`, `data/motr.json`; Wanted: `montymole/re/README.md`, `src/monty.ts`).

| | Wanted: Monty Mole | Monty on the Run |
|---|---|---|
| Playfield | 32 x 20 cells of 8 x 8 | the same (screen cols 4-35, rows 3-22) |
| Logic rate | a pass every 2 frames, 25 a second | every frame, 50 a second (PAL) |
| Walk | 2 px a pass = **50 px/s**; a new direction first turns | 1 px a frame = **50 px/s** (x in half-pixels, a step every other frame); a new direction turns while moving |
| Climb a rope | 2 px a pass = 50 px/s | 1 px a frame = 50 px/s |
| Fall | 2 px a pass = 50 px/s; **four rows (32 px) or more kills** | 1 px a frame = 50 px/s; **no fall death** |
| Jump | 32 passes: 17 px up, 17 px down, 1 px sideways a pass: **32 px across, 17 high, 1.28 s**, steered by nothing | 21 frames up (20 px) and 17 down (14 px), then the rest straight down; **38 px across, 20 high, 0.76 s** (0.45 s when it lands 6 px higher), direction fixed at take-off |
| Jump from standing | a vertical jump | the same |
| What holds him | the picture under his feet (any pixel on the pixel row just under them) | the cell under his feet: its tile's class (solid or ledge holds; rope holds unless he is climbing; water kills) |
| What stops him | a solid colour on any edge of his box | a solid class on any edge |
| What kills | a moving thing, a deadly colour (any edge), a crusher, a fall | a sprite touching his (VIC collision), water or lava under both feet, a piledriver |
| Death | the death picture rises, the screen shakes, "Abide with Me" on the beeper | by cause: noise dissolve (creature), sink (hazard), sink and noise (piledriver); SID effect; a life; the room again |
| Lives | 3, none gained | 5 |

So his walk, climb and fall are already the same speed, and Wanted's creatures, crushers and floors were tuned to a walk of 50 px/s: **they keep their timing as they are**. Only the jump differs, and it is the thing Chris asked for. His jump is 6 px wider, 3 px higher and 0.5 s shorter in the air.

## The mapping

### Cell classes to tiles

Wanted finds what is solid by colour: each room names four attribute values (floor, deadly, rope, and a fourth that is a floor too) and the physics matches the attribute under Monty. Anything else drawn with a pixel on its top row **holds him from above** (the original's floor is "the picture under his feet") but stops nothing else: a ledge he can jump up through. `retile.ts` classifies each of a room's up to seven tiles the same way:

| Wanted tile | Role | Class in the shared physics | Drawn with (montyotr library tile) |
|---|---|---|---|
| class floor (attribute of the room's floor or fourth class), pixels set | solid | 1 | brick `$01` or hatched rock `$08` (by how much of the tile is set: the dense tile is brick) |
| not a class, pixels on its top row (the cyan and red ledges, the toothed ledges, the pot, the bridge) | platform | 2 (holds from above, passable otherwise) | thin ledge `$3A`, or toothed ledge `$3B` when it hangs teeth |
| rope class | rope | 3 | rope `$5F`, chain `$60` for the second kind |
| deadly class (the pools of rooms 8-11, the fire floor of 18, room 7's and 12-16's deadly cells) | deadly | 4 | waves `$53`, water `$55` |
| anything else with pixels, none on the top row | decor | 0 | the Wanted tile's own pixels, in Monty on the Run's way (its signs and decorations are characters with arbitrary pixels, `Decor`) |

Over all 21 rooms: a room has at most seven kinds of cell besides the blank one, so no room needs more than Monty on the Run's eight slots, and **only 2 cells in the whole game** are decor with pixels in the upper half but not the top row (the original would hold Monty on them at a sub-cell height; they become plain scenery, and the bot will say if that matters). Colours: Wanted's attribute (a tile on a paper colour takes the paper, else the ink) to the C64's seven hires colours, bright and normal alike: a character in hires mode has colours 0-7 (a colour of 8 or more is multicolour, a different tile format), which is also what Monty on the Run's own brick, ledge and rope tiles are drawn in.

The look is Monty on the Run's: black background, flat coloured brick, hatched rock and thin ledges, sparse ropes. The prototype's rooms are the first cut; stage 2 refines it (edge pieces on the top of a mass of rock, a different brick for a wall and a floor, Monty on the Run's own theme colours by sector: shaft, tunnel, cavern, castle). The tile choices are a table in one file, so they change in one place.

### Scale, aspect and pixels

None needed: same cell grid, same 8 x 8 cells, Monty's box 2 x 2 cells in both (16 x 16 px; 3 cells wide or high when he is between cells, in both). Sprites are Monty on the Run's: Monty and the creatures are 24 x 21 multicolour sprites drawn over a 16 x 16 box; the room's art is what scales to Monty on the Run's: not the other way round. Wanted's resting y (odd, pixel rows) and the 2-pixel steps do not exist in the remix: Monty on the Run's Monty moves in single pixels and his floors are cell-aligned.

### Jumps, and every room still passable

Computed from Monty on the Run's arc table. A level gap of G cells needs 8G - 14 px of travel (take-off with his left cell still on the edge, landing with his right cell over the far one): Wanted's 32 px crosses 5 cells, Monty on the Run's 38 px crosses 6. **A jump over a level gap that Wanted allows, the remix allows**: wider, higher, never lower. What can go wrong is the opposite:

1. **Overshoot** of a short landing (the target between 32 and 38 px away, with something deadly beyond): the jump cannot be shortened (direction fixed at take-off, nothing steers in the air; the same in both). Rooms with a ledge over water or the fire floor (8-11, 18, 20) are the ones to check.
2. **Timing**: air time is 0.76 s, not 1.28 s. A creature or crusher whose gap Wanted's jump was made for may be over a ledge sooner or later than he is. The bot finds these.
3. **A ceiling 2-3 cells above a floor**: the arc rises 20 px (2.5 cells); Monty on the Run's Monty bumps (his rise stops, the arc goes on, he slides along), so low ceilings are passable.
4. Ropes: Monty on the Run grabs one only walking or falling into it, not mid-jump; Wanted's jump pass also takes priority over ropes, and a fall ends on one in both.

The fix is always the smallest edit to the room's cells (one ledge cell moved, a pit narrowed by a cell, a ledge added under a long drop), made in a per-room table of changes (`src/fixes.ts`: room, cell, new code, and the reason), never in the physics, and listed in `QOL.md`. We expect few; the plan does not guess which rooms: stage 4's bot decides.

### Creatures

**Monty on the Run's own creatures, in Wanted's paths.** Each of Wanted's 16 x 16 sprites (the flying pickets, hairsprays, fish, drills, bricks, birds, the castle's things) is replaced by a Monty on the Run creature of the same kind from its 27-type bank (boot, skate, lamp, knight, UFO, clock, big nose, mug, pie, wasp, bubble, ghost, alien, kettle, smiley, cone, hand, tank, jellyfish, medusa, fish, banners...), by a table `kind -> type` that keeps a room's feel (fish in the water rooms, wasps for the flying things, the knight in the castle), and the colours by sector. The *movement* is Wanted's: `montymole/src/enemies.ts` records (state patrol, relay or none; leg; step; direction; link) tick at 25 a second; the position is what the sprite shows, smoothed like every sprite. Wanted's relays (invisible creatures that wake the next, which time its pickets and falling things) are kept: they are the game's design. Monty on the Run's creature model (a patrol with a range, 4 sprites) is not enough for Wanted's six records, so the remix drives up to seven VIC sprites (0-2 and 4-7; 3 is Monty) from Wanted's records. Hitting one is the VIC's own sprite collision (`VicView.collisions`), as in Monty on the Run.

*Redrawing Wanted's sprites in Monty on the Run's look* was the other option. It would keep the exact creature but means drawing about 40 frames by hand in the C64's multicolour with Monty on the Run's shading, a drawing job that is not a mapping, and Chris asked for Monty on the Run's look. If a room needs a creature the bank does not have, a redrawn one is the exception.

### Coal, the tool, the gates

* **Coal** is Monty on the Run's coin: the flashing character (`$34`) at the coal's cell, taken by touching it, the SID coin effect. The coal's worth stays Wanted's (the score is the coal's worth, 3392 in all); the count of pieces taken is what the gates read. The 64 pieces are 64 coins; the five a room at most are within Monty on the Run's two per room (its cap is its data, not its engine: coins are a table).
* **The tool** (the miner's tool, club, scissors...: carried, lets one touch of a creature kill the creature, lost on leaving the room or dying) stays, drawn with Monty on the Run's item sprites, taken by touching as Monty on the Run takes an item, the item effect.
* **The gates** (rooms 6, 11, 15, 20: open at exactly 16, 32, 48 and 64 pieces) open as Monty on the Run opens a way (`applyRoomEffects` rewrites cells). **Not kept: the original's trap** (a piece that makes the count taken outside the gate's room shuts the gate for good, so the game can be played so a gate never opens). In the remix a gate opens when its count is reached, wherever he is, and is open when he comes to it. This is the one rule of Wanted's we change (a fix, not an assist: ORIGINAL and ENHANCED both).

### The crusher, the floors, the conveyors, the chain

* **Crushers** (rooms 0, 1, 5, 7, 9, 10, 11, 18, 19): Monty on the Run's piledriver, placed where Wanted's was (`piledriverCfg` takes room, column, row, height), with its timing from Wanted's record (the wait and the speed). The death is the piledriver's.
* **Retractable floors** (rooms 0, 2, 3, 8, 9, 15, 18, 19, 20): two platform pieces whose ends grow towards each other and shrink back; done as Wanted does it, by rewriting platform cells of the room each step (shared with the gates' cell rewriting: one `Cells` module).
* **Conveyors and water** (rooms 8-11): visual only in Wanted (nothing carries Monty): Monty on the Run's theme animation (`animateThemeChar`) rotates a tile's rows, which is exactly the water and the rails. The retiled rooms carry the flag.
* **Room 17's chain**: its two frames as a rotating tile, as the conveyors.

### The scenes

* **Room 16's scene** (a drop lifts Monty from the pit into room 17): a scripted sequence in Monty on the Run's way (a generator, one `yield` a frame, `scripts.ts`), placing him at the same place.
* **The opening scene** (the house, the pit head, the acorn, the water; pseudo-room `$2C`): its own small game of Wanted's. In the remix it is drawn with the same tiles and run by the same Monty, and it is the last thing built (stage 6): until then, a new game starts in room 0 and the opening is skipped. The ending's verse and the reward come last with it.
  **The rule of the opening scene (Chris's design): Monty cannot walk right until he has the bucket.** A gate stands on the right of the scene, closing the way on; it opens when Monty gets the bucket by the house (the original's gift at the pot). Until then the scene is the house, the pot and the pit head to the left of the gate; once the bucket is his, the way right opens and he goes on to the acorn, the water and the way out as in Wanted. The coal is **always** in the rooms from the start: the bucket gates the way out of the opening scene, not the coal. The gate is a cell rewrite like the coal gates' (the shared `Cells` module), drawn as one of the scene's rock tiles; the passable bot (stage 4) takes the scene's two halves as two rooms: left of the gate with the bucket still to come, right of it with the bucket in hand.

## Structure

```
games/montymoleremix/          the game (id montymoleremix, name WANTED MONTY MOLE REMIX)
  src/retile.ts                Wanted's room data -> Monty on the Run's tiles by role           (written, stage 0)
  src/fixes.ts                 the per-room changes the bot calls for                           (stage 4)
  src/game.ts                  RemixGame: Wanted's rules over the shared Monty                  (stage 3)
  src/creatures.ts             Wanted's records -> VIC sprites, the kind -> Monty on the Run type table
  src/{main,map,save,info,title,ending}.ts   front end, as every port
  QOL.md  re/README.md  test/
games/shared/monty/            Monty on the Run's Monty, shared                                 (stage 1)
  physics.ts  anim.ts  deaths.ts  frames.ts
games/montyotr/src/monty.ts    becomes the jetpack and the C5 over the shared Monty
games/montymole/src/*          its rules (creatures' paths, coal, gates, crusher, floors) stay; where one is mixed with drawing, split so both import the rules (stage 3)
```

**Why a folder of its own, and not a mode of montymole or of montyotr.** The faithful game is a lockstep-proven copy of a Spectrum game and must not move; Monty on the Run's `Game` is a 52-room game with scripts the remix has no use for. The remix is a third game over two sources of truth, each imported: Wanted for what is in the world, Monty on the Run for how Monty is in it. A game of its own gets its own `QOL.md`, saves, map and tests, and loads next to the other two in the directory (`games/registry.ts`, one entry, as every game).

### Shared with montyotr: what is imported, and what moves

| Needed | Where it is now | In the plan |
|---|---|---|
| Monty's movement, jump arc, falling, ropes, rope climb | `montyotr/src/monty.ts` over `Game` fields | `games/shared/monty/physics.ts`: pure over a `MontyBody` (x2, y, facing, action, arc, falling...) and a `Cells` interface (`flagAt(row, col)`, `exit(direction)`), the move split into *decide* (what he does this frame), a hook, and *apply* (the moves and the blocks), because the jetpack changes the decision in the middle |
| His animation (walk, jump, rope frames, the ticker) | `updateState` in the same file | `shared/monty/anim.ts` |
| His frames, the jump table, the sprite pointers | `montyotr/src/data.ts`, `data/motr.json` | stay in montyotr's data; `shared/monty/frames.ts` names them; the remix imports montyotr's data module as it is |
| The death scripts (dissolve, sink, noise) | `montyotr/src/scripts.ts`, over `Game` sprite registers | `shared/monty/deaths.ts` over a small `SpriteStage` interface (sprite registers, memory, random, `lifeLost`) |
| Tile classes | `tileProperty` in `data.ts` | stays; the remix's slots carry their class |
| The picture: `Vic`, `VicView`, collisions | `c64kit` | imported |
| SID, effects, music | `montyotr/assets`, `SidPlayer`, `Game.sound` | imported |
| Front end | `games/shared/port.ts`, `frontend.ts`, `continue.ts`, `lives.ts`, `grace.ts`, `touch`, `ending/` | imported, as every port |

Nothing is copied. Where the remix needs a thing Monty on the Run has only inside `Game` (the death scripts, the coin collection), it moves to the shared module with montyotr as its first user. The refactor is done **behind a trace test written first** (stage 1): every frame of a few hundred thousand frames of Monty on the Run played by random players and by its own routes, a hash of the state, taken before the change and required equal after.

## Stages

0. **Prototype (done, `games/montymoleremix/test/shots.ts`).** Rooms 0 and 8 retiled and drawn on Monty on the Run's picture with Monty standing in them, a walk and a jump on his physics. PNGs below.
1. **Pin and share Monty (about 2 days).** The trace test over montyotr, then `shared/monty/` and montyotr onto it, every montyotr test the same (`play`, `frontend`, `c5`, `c5hop`, `jetpack`, `grace`, `runstop64-rooms`, `ending`, `reward`, `warps`), no change in behaviour or in the traces.
2. **The rooms (about 2 days).** `retile.ts` for all 21 rooms in Monty on the Run's look (edges, by-sector themes, the animated water and rails), a room pager that draws all 21 as PNGs (to look at), and the role check (`test/retile.ts`: the cell classes read from the picture the remix draws equal those read from Wanted's data, room by room).
3. **The game (about 4 days).** `RemixGame`: the shared Monty, the rooms, exits through Wanted's graph, the creatures from Wanted's records on VIC sprites with the kind table, coal as coins, the tool, the gates, crushers, floors, deaths, lives, score, the HUD. The parts of `montymole/src` that mix rules with drawing split so both games import the rules; the faithful game's lockstep must stay at 0 differences.
4. **Passable (about 3 days).** The bot (below) over all 21 rooms and every exit, coal and tool; the list of layout changes it calls for in `fixes.ts`, each tested; the creature timing checked room by room.
5. **The front end (about 3 days).** `runPort`: title, options-free start, pause, map and travel, saves, continue, grace, ORIGINAL and ENHANCED with its assists, sound, touch, the info card, the registry entry, `QOL.md`. Hints (the coal count, the sparkles) reuse montymole's with the remix's state.
6. **The scenes and the end (about 4 days).** Room 16's scene, the opening scene, the game over and the ending, the reward show on the shared `ending/` kit.
7. **Review (about 1 day).** `npm run verify`, the slow set, a pass by Chris, the directory.

About 19 working days of an agent's time, most of it in stages 3 and 6; stages 0 to 2 give something to look at in a week.

## After Chris's corrections (stages 3-5, 2026-11-08)

* **Coal** is Wanted's own piece, the room's picture of it (`nugget`: a lump in the mine, other things in the castle), one character of Monty on the Run's set, flickering through the C64's colours as the Spectrum cell's paper stepped, counted and worth what Wanted's are. Not Monty on the Run's coins.
* **Tools** are Wanted's own objects (`$7A00`, 16 x 16, one bit a pixel), drawn as a hires sprite; the rule is Wanted's.
* **Crushers**: the old drawing was the head only, so it looked as if it rested on a ledge. The original keeps a *picture*: nine rows of three bytes drawn from its y down each step, the shaft (the picture's top rows) left behind it going down, blank rows wiping it going up. `src/crusher-picture.ts` keeps that layer and `drawCrusher` turns it into characters (the room's cell with the rows it has written put over it), so the shaft runs from just under the ceiling to the head, at rest at the top where it waits, and it holds Monty from above where it has a pixel on a cell's top row. `test/crusher.ts` checks, for all nine crusher rooms, every frame for 2,500 frames, that the record equals the faithful game's own crusher's (the same generator) and that every line the original has drawn is on the remix's screen. Pictures before and after: `test/crusher-shots.ts`.
* **Creatures**: `src/kinds.ts` is a table by hand, Wanted's kind (42 of them) to the Monty on the Run creature that fits its room (kettle for the castle's pot and bottles, knight for the man, cone for the bell, lamp for the walking candle, fish for the swimmers, ghosts, wasps for what flies, hands for the claws, spiders for the bugs and the hanging insect, a boot for the legs...). Four animals nothing in Monty on the Run's bank is (the duck, the dog, the squirrel, the castle's chess horse) keep Wanted's own frames in C64 colours. Checked: every kind the rooms use is in the table (`test/game.ts`). The picture: `test/creature-shots.ts`.

## Stage 4: the bot (`test/bot.ts`, `test/passable.ts`)

`RoomGraph` maps a room for Monty alone (the shared physics, the very calls the game makes, on the room's cells with the gates open; a room with a retractable floor is mapped with the floor never there and always there) and says how many frames each state is from a goal (a piece of coal, the tool, a way out). `search` is A* over copies of the game (`RemixGame.copyFrom`: every field, checked against the game in `test/game.ts`) with the creatures, crusher, floor and gates as they are, by frames so far plus the map's distance (greedily first, then less so, then not at all: where a creature has to be waited out the greedy way is led into dead ends). The moves are a key held 1 or 4 frames, a jump in each direction, a wait; what a jump or a fall does goes on by itself. A way out only counts if the room it leads to is somewhere to be (`viable`: a landing he lives through and 60 frames of nothing to be afraid of, not out of it again at once). Sprite collisions in the bot's frames are read pixel against pixel from the registers (`test/harness.ts`, checked against the renderer's own in `test/game.ts`), 14 microseconds a frame.

The game goes down the world, so the ways into room N from room N - 1 are the ways into the room: from them every piece of coal, the tool and the way on are played, and must be met from one of the two the bot takes; the ways in from the other side are met on the map only (a creature comes down a shaft that is climbed from below, with nowhere to step aside: the original does not promise them either), and a way out that is a wall in the faithful game's own map is not a goal. The result is in `QOL.md`'s companion table below.

## Tests

* **Every room passable by a bot, on the new physics** (stage 4, `test/passable.ts`): a breadth-first search over the remix's own frames (the game copied at each step; creatures, crushers and floors are part of the state), the way `montyotr/test/runstop64-rooms.ts` proves its rooms and `montymole/test/bot.ts` finds its routes, from each arrival to each exit and to every piece of coal and the tool, with the gates open where their count allows; the result is a table of rooms and the fixes it needed.
* **The faithful game unchanged**: `montymole/test/lockstep.ts` (every pass against the original on the headless Spectrum, 0 differences, fast and slow sets), `rooms`, `picture`, `frontend`, `hints`, `reward`, `loops`, `screens`: unchanged and run after stage 3's split.
* **Monty on the Run unchanged**: the trace test of stage 1 and montyotr's own tests.
* **The mapping**: `test/retile.ts`: every Wanted tile gets a role; no room needs more than eight tiles; the role of each cell as the physics reads it equals the role from the original's data (floor, deadly, rope by attribute; ledge by the top row); the coal, the exits and the creatures' start cells are on free cells; the decor census is recorded.
* **Monty is Monty on the Run's**: `test/monty.ts`: in a flat test room the remix's Monty and montyotr's make the same moves frame for frame (the walk, the jump's arc, the fall, a rope), by the shared module; the jump's reach and apex measured and pinned (38 px, 20 px).
* **Deaths**: every cause plays Monty on the Run's sequence and puts him back at the room's entry; none from a fall.
* **Front end, saves, hints, reward**: as each port's `frontend.ts`, `hints.ts`, `reward.ts`, plus `info.ts` and the registry test.
* Every new test in `tools/tests.mjs`; `npm run verify` and `check:strict` at 0.

## Risks

* **The shared-Monty refactor** touches the game the others follow. Mitigation: the trace test first, small steps, montyotr's tests after each.
* **Creature timing** against the shorter jump: air time 0.76 s against Wanted's 1.28 s. A room tuned for the old jump may be harder or easier: the bot measures it; the fixes are cell changes, creature timing is Wanted's and not touched unless a room cannot be passed.
* **Six creatures a room** against the VIC's eight sprites and Monty on the Run's sprite use (sprite 0 the item, 1 the cloud or the C5, 2 the jetpack, 3 Monty): the remix has none of the items' uses, so 0-2 and 4-7 are free: seven creatures, Wanted needs at most six.
* **Looks.** A retiling by role will not by itself look as drawn by Monty on the Run's artist: the first cut (prototype) is flat. Stage 2's edge pieces and sector themes are where the look is won; a few rooms may want a hand-set tile. Chris sees the 21 pictures before stage 3.
* **The opening scene** is a game of its own with its own code (an interrupt of its own and a death animation the original lacks). Last, and cut if it grows (a new game starts in room 0).
* **Tile library limits**: the 121 tiles are Monty on the Run's; the castle rooms of Wanted (spires, battlements) have nothing alike in it. They are decor drawn with Wanted's own pixels, in Monty on the Run's way, if the library has no tile.
* **Hires colours only** (0-7) with Monty on the Run's tiles: Wanted's two shades (bright and normal) of a hue are one colour; a few rooms where the two shades told two things apart (a bright ledge on a normal wall) need a different colour pair, set in the room's table.
* **Drift.** Two copies of a rule would be the failure: the plan splits the rules out of montymole instead (stage 3). If a split would move the faithful game's behaviour, the remix gets a thin rules module over the same data and says so.

## Decided (Chris, 2026-11-08)

1. **Music: Monty on the Run's SID throughout**, on the title and in the game, reused from `games/montyotr`, not copied. (No Colonel Bogey.)
2. **Title: a new WANTED: MONTY MOLE REMIX logo in Monty on the Run's lettering**, on the title chrome Monty on the Run's title has.
3. **5 lives**, in both modes (ENHANCED's unlimited lives and continues come on top, as everywhere).
4. **The gate trap is removed in both modes** (a gate opens when its count is reached, wherever he is).
5. **Creatures: Monty on the Run's, walking Wanted's paths** (the kind table above).
6. **The opening scene: Monty can't walk right until he has the bucket.** See "The scenes". The coal is always in the rooms.
7. **Order**: the opening scene last (stage 6), as planned; until then a new game starts in room 0.

## The prototype

`games/montymoleremix/src/retile.ts` (the mapping), `test/stage.ts` (a Monty on the Run `Game` with a retiled room written where its own loader writes a room: nothing of montyotr changed) and `test/shots.ts`. Run: `nice -n 15 node tools/test.mjs games/montymoleremix/test/shots.ts <dir>`. It draws rooms 0 and 8 with Monty standing in them, then drives him on Monty on the Run's physics: a walk along a ledge to its end and a jump from the edge, drawn as a trail of his frames and a strip of the jump. Typecheck and `check:strict` are at 0.

What it showed:

* The retiled rooms read as Monty on the Run's: black ground, brick and hatched rock, thin ledges, ropes, water; the layout is Wanted's cell for cell. Room 8's pool and steps, room 0's ledges and pedestal are where they were.
* **Room 0: the jump from the left ledge's edge crosses to the far ledge** (5 cells, same level), the somersault drawn as it goes. **Room 8: the jump from the left step clears the 5-cell pool** and lands on the right step; it rose 20 px as computed, and the walk, the turn, the frames and the somersault are Monty on the Run's own sprites.
* Findings for the plan: the hires colour limit (0-7) merges bright and normal; Wanted's rooms have no names, so the name row is empty (the shared status rows are Monty on the Run's: score, lives, high score); tiles used by a room only are given slots (an unused tile with a class would otherwise have taken one).
