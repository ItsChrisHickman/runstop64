# Starquake: where the data comes from, and how the port is checked

The port's data (`src/data/starquake.json`) and its music and effects
(`assets/starquake.sid`) are taken from the original C64 game by
`tools/extract-starquake.mjs`, from two snapshots of the game running in
`tools/probe`:

- the **loading picture** (Nick Strange, Stephen Crow, Bubble Bus) at frame 600, and
- the **title screen** at frame 1450, with the game unpacked and nothing yet changed.

The disk image is the one on archive.org
([d64_Starquake_1984_Bubble_Bus_Software](https://archive.org/details/d64_Starquake_1984_Bubble_Bus_Software),
`Starquake_1984_Bubble_Bus_Software.d64`, one file: `STAR QUAKE`, 179 blocks). It's a
crack (Radwar's), which changed the intro's first line; the port leaves that line out.

```bash
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
# extract the one file (VICE's c1541, or any D64 reader) to STAR_QUAKE.prg, then:
node /tmp/probe.mjs STAR_QUAKE.prg /tmp/sq --frames 610 --save-state 600:/tmp/sq/loader.state
node /tmp/probe.mjs STAR_QUAKE.prg /tmp/sq --frames 1460 --save-state 1450:/tmp/sq/title.state
node tools/extract-starquake.mjs /tmp/sq/title.state /tmp/sq/loader.state
```

The extractor copies the original's tables by address (rooms, big blocks,
tiles, sprites, enemy graphics, texts, the game's small tables); the port reads
them at those addresses (`src/data.ts`). The .sid is the original's music
player and its effect player with a little glue (see the extractor).

## The checks (`test/`)

Each runs the original on c64kit's C64 model (from `title.state`) beside the
port. Run each with `nice -n 15 node tools/test.mjs games/starquake/test/<check>.ts [args]`
(it bundles with esbuild, `c64kit` stood in by `games/shared/test/kit.ts`, `?url` imports stubbed).

| Check | What it compares | Last result |
|---|---|---|
| `start.ts title.state room0.state` | (makes the start: the original's main loop about to draw the first room) | |
| `rooms.ts room0.state` | Every room drawn by both from the same state: bitmap, colours, attributes, items placed, random numbers, objects found | 512 of 512 identical |
| `lockstep.ts room0.state random:N passes` | Original and port with the same controls (random walks: walking, falling, platforms, the laser, picking up), compared at every pass of the main loop: BLOB, all sprites, the panel, random numbers, the whole screen | thousands of passes identical per walk, through rooms, deaths and game over |
| `newgame.ts title.state` | A new game's setup (items scattered, the core's missing pieces, the panel) | identical for every seed tried |
| `sound.ts title.state game.state` | The .sid's SID register writes against the original's: both title tunes, all effects on all voices | all identical |
| `lockstep.ts` with `ROOM=n EXIT=hex COL= ROW= CARRY=.. CORE=..` | A start anywhere: through a teleport (typed names, wrong ones, Del), security doors (card, symbols, the $0E, refused), a Cheops trade, key and flat barriers, the core (pieces put back, guardians, out to room 198; the end) | all identical |
| `screens.ts room0.state` | The intro, game over and the end, drawn by both | identical |
| `heroes.ts room0.state` | The core of heroes: where scores go, the table after a new entry, its screen | identical for every score tried |
| `shots.ts room0.state out plan passes` | Pictures of both at chosen passes, to look at | |
| `frontend.ts [out]` | The front end headless: title, intro, play, pause, travel by the map, autosave, game over, CONTINUE? (and pictures of each screen) | all pass |

`lockstep.ts` can switch parts off on both sides (`OFF=enemies,laser,pickup`),
and has `SHOW=a-b`, `WATCH=addr` and `WATCHW=addr` for chasing a difference.
