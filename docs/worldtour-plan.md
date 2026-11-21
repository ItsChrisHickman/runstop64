# Monty Mole: World Tour: the plan

A new Monty game, made in 2026 on Monty on the Run's engine, rules and parts. Chris asked for it on 2026-11-20; this page is
the agreed shape. It is built a region at a time, and Chris plays each one before the next is started.

## The story

Intermole finds Monty's Greek island (where Auf Wiedersehen Monty left him) and Europe is no longer safe. Intermole only
works in Europe, so he runs east and out of its reach, the long way round, with no passport: through Moscow, across Siberia
on the Trans-Siberian railway, through China and Japan, and over the Pacific to Hawaii. The game ends on a Hawaiian beach,
retired again, out of reach for good.

A sequel (later, not now) has the Crown Jewels stolen and scattered, and a pardon offered if Monty brings them back: the
Americas, New York, the Atlantic, the Tower, and home to his Yorkshire village.

## The world

Five regions of about ten rooms each, about fifty rooms in all (Monty on the Run has 52). The regions follow each other west
to east on the exit grid, so the pause screen's map reads as the trip round the world.

**Inside a region the way is not a line** (Chris, 2026-11-20: what he liked most in Monty on the Run). Each region is a block
of rooms several high, not a row: start going one way, go down, circle back up; pass through a room and on through others
before doubling back to the ladder that leads out of it; rooms entered from more than one side, a dead end with an item, a
way that only opens once an item is found elsewhere. Only the region's entry and its exit to the next region are fixed
points. The model is Monty on the Run's own route (study its exit grid and how its rooms join), not Auf
Wiedersehen Monty's: Chris finds the first game's flow far more interesting than the sequel's open map and flights.

| Region | Places (the rooms) | Its own things |
|---|---|---|
| 1. Moscow | the station where he arrives, snowy streets, Red Square, St Basil's domes, the Kremlin wall, the GUM arcade, the metro (escalators, platforms), the Trans-Siberian's station | matryoshka dolls, guards in fur hats, pigeons, snowballs |
| 2. Siberia | the train's roofs and carriages, frozen forest, a mine, Lake Baikal's ice | wolves, bears, icicles that fall |
| 3. China | the Great Wall, a Beijing market, a temple, a junk on the river | dragons of the New Year dance, firecrackers |
| 4. Japan | Tokyo rooftops and neon, a bullet train, Mount Fuji's slopes, a temple garden | ninjas, sumo, koi |
| 5. The Pacific and Hawaii | a cargo ship's holds and decks, Hawaii's volcano, the beach (the ending) | gulls, crabs, lava |

## The rules (Monty on the Run's)

- Everything Monty on the Run has, and nothing it lacks: flip-screen rooms, Monty's walk and jump arc, coins (50) and
  items (200), Mole Crushers, lifts, teleporters, water and its fish, clouds, the deaths, lives.
- **Items open the way.** As in Monty on the Run, an item taken in one room changes another (a wall gone, a creature seen
  off): two or three in each region, some needed in the next region. No freedom kit to pick (the remake already dropped it).
  An item's use has hint text in ENHANCED, as in Auf Wiedersehen Monty.
- **ORIGINAL and ENHANCED** as in every game: ORIGINAL is the game as made (lives, game over); ENHANCED adds what Monty on the
  Run's ENHANCED has (unlimited lives and continues, no death loops, the hints, the reward show). Map, travel, autosave and
  back to room start are always on.
- **The look:** Monty on the Run's tiles, sprites and decorations where they fit, and new ones in its style (its tile size,
  colours and sprite shapes) for each region's places and creatures. Place names on signs like its MPL ST. sign.
- **The music:** Rob Hubbard's Monty on the Run tune and sound effects, played by his own driver. Each region gets its own
  version of the tune (Chris, 2026-11-20), made by changing the driver's data: the melody bent to the region's scale (minor
  for Russia, the pentatonic for China and Japan), instruments that suggest the place (a plucked balalaika, bells, a sliding
  ukulele), and maybe a short phrase of a public-domain folk tune as a break (Kalinka, Sakura). Moscow's version
  comes with Moscow's rooms; if it sounds like a gimmick, every region keeps the original. The tempo stays Hubbard's (Chris).
- **The title:** Monty on the Run's title screen, with MONTY MOLE: WORLD TOUR and the story on its scroller. Credits: a new
  game by Christopher Hickman with Claude, after Peter Harrap's Monty on the Run (Gremlin Graphics, 1985).

## How it's built

- **One engine.** Monty on the Run's engine (`games/montyotr/src`) takes its game data as a value instead of importing the
  original's, so World Tour (`games/montyworld`) is a second data set on the same code, not a copy. Monty on the Run plays
  exactly as before: its tests, the frame-for-frame title check included, all pass unchanged.
- **Rooms in the original's own terms,** as runstop64's rooms already are (`games/montyotr/src/data/runstop64-rooms.ts`:
  playfield maps, tiles, coins, decorations, crushers, teleporters, enemies).
- **Proved by the bot:** every room crossed, every coin and item reachable, the game finishable, in both modes.
- In the directory at `#montyworld`, unlisted until Chris is happy with it.

## Steps

1. The engine takes its data as a value (Monty on the Run unchanged), and World Tour's skeleton loads. Done: `MontyData`
   (`games/montyotr/src/montydata.ts`), Monty on the Run's value `motr.ts`, World Tour's `games/montyworld/src/data.ts` (50 by 3
   exit grid, three placeholder rooms), the session `runMonty` (`session.ts`) and `test/walk.ts`. The pause map draws the wide grid
   in cells of 3 pixels for now: its design for a strip of fifty rooms (scrolling, or regions) is part of step 2.
2. Moscow: its ten rooms, art, creatures and item puzzles, playable from the title to the Trans-Siberian's station.
   **Chris plays it.** If it doesn't feel like a Monty game, we stop here.
3. Siberia, China, Japan, the Pacific and Hawaii, one at a time, each played before the next.
4. The ending on the beach, the reward show, the credits.
