# Auf Wiedersehen Monty: where the data comes from

The image is the one on archive.org,
[Auf_Wiedersehen_Monty_1987_Gremlin_Graphics](https://archive.org/details/Auf_Wiedersehen_Monty_1987_Gremlin_Graphics)
(`Auf_Wiedersehen_Monty_1987_Gremlin_Graphics.d64`, MD5 `0578ead1577795f8dfa58abf16b5a274`): one file, `AUF WIEDERSEHEN`
(a BASIC stub, `SYS 16384`, a 43 KB crunched program). It boots on c64kit's model with no patches. Two other copies
don't (CSDb's `awMonty.d64` jumps into zeros; archive.org's `..._cr_TCS` draws garbage).

**Nothing from the original is committed**: not the disk image, not the program, not the snapshots. Everything in this
directory except this file is ignored (`games/awm/.gitignore`). What is committed is the data the port needs, extracted
as TypeScript (`src/data/awm-data.ts` from `re/rooms.ts`, `src/data/title-data.ts` from `re/title-data.ts`). The
originals live in `games/awm/build/` of the main checkout; a fresh clone makes them as below.

```bash
cd games/awm/build
curl -L -o awm.d64 "https://archive.org/download/Auf_Wiedersehen_Monty_1987_Gremlin_Graphics/Auf_Wiedersehen_Monty_1987_Gremlin_Graphics.d64"
md5sum awm.d64                                     # 0578ead1577795f8dfa58abf16b5a274
cd ../../..
nice -n 15 node tools/test.mjs games/awm/re/d64-prg.ts games/awm/build/awm.d64 games/awm/build/awm.prg
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
# the title is up at frame ~800; fire at frame 1500 starts play; the state at 2000 is Monty standing in room 72
nice -n 15 node /tmp/probe.mjs games/awm/build/awm.prg /tmp/awm --disk games/awm/build/awm.d64 \
  --frames 2010 --fire 1500 --save-state 2000:games/awm/build/play.state --dump 2000:games/awm/build/play.ram
```

`play.state` is what the checks start from; `play.ram` (the 64K RAM at that moment) is what `tools/re/disasm.mjs` and
the .sid extractor read.

The title's checks start from the moment the program reaches the title's set-up ($406E, frame 807): `t807.state` is the
machine saved there and `title.ram` the RAM at that instant. `title.state` (the title at frame 850) is for `re/shot.ts`
and `re/raster.ts`.

```bash
nice -n 15 node /tmp/probe.mjs games/awm/build/awm.prg /tmp/awm --disk games/awm/build/awm.d64 --frames 810 \
  --save-state 807:games/awm/build/t807.state --dump-at 406e:games/awm/build/title.ram
nice -n 15 node /tmp/probe.mjs games/awm/build/awm.prg /tmp/awm --disk games/awm/build/awm.d64 --frames 1000 \
  --save-state 850:games/awm/build/title.state
nice -n 15 node tools/test.mjs games/awm/re/title-data.ts games/awm/build/title.ram        # writes src/data/title-data.ts
```

The checks and what they compare are listed in `re/README.md`. Example runs:

```bash
nice -n 15 node tools/test.mjs games/awm/test/title.ts games/awm/build/t807.state 2700 "f7:100-103,f1:200-203,fire:2650-2652"
nice -n 15 node tools/test.mjs games/awm/test/closing.ts games/awm/build/play.state over 72     # or ending, walk (room 77)
nice -n 15 node tools/test.mjs games/awm/test/program.ts games/awm/build/t807.state over        # or ending
nice -n 15 node tools/test.mjs games/awm/test/sound.ts games/awm/build/play.state games/awm/build/awm.sid 1500
nice -n 15 node tools/test.mjs games/awm/test/flight.ts games/awm/build/play.state kill:600:2     # a flight frame by frame: idle, rand, kill, crash or mix
nice -n 15 node tools/test.mjs games/awm/test/lockstep.ts games/awm/build/play.state fly:20:1:0-14  # boarding the planes of rooms 0 to 14
nice -n 15 node tools/test.mjs games/awm/test/frontend.ts [out-dir]   # needs no original; stills of the title, play and pause map
```

## The music, and shipping it

`awm.sid` (the original's music and effect drivers with their data, and a little glue) is built from `play.ram`, never
committed: `node tools/extract-awm-sid.mjs games/awm/build/play.ram`. `npm run build` (so the deploy) runs
`node tools/extract-awm-sid.mjs --ensure` before Vite: it makes the .sid unless it is already newer than the dump, and stops the
build, saying why, if the dump is missing. `src/main.ts` imports the .sid (`?url`), so Vite copies it into `dist/assets/`.
