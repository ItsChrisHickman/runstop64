# Building The Sacred Armour of Antiriad's data

`src/data/antiriad.json` is the original's memory, as it stands the moment the game starts
(once its loader has unpacked it), less the game's own code ($8000-$AFC4), in named sections at
their original addresses. It's made with `tools/probe` and `tools/extract-antiriad.mjs` from the
image on archive.org,
[d64_Sacred_Armour_of_Antiriad_The_1986_Palace_Software](https://archive.org/details/d64_Sacred_Armour_of_Antiriad_The_1986_Palace_Software)
(`Sacred_Armour_of_Antiriad_The_1986_Palace_Software.d64`, MD5 `dadadbe50ae657af3f5441497c44d6de`):
one file, `ANTIRIAD`, a crunched one-file version whose unpacker starts the game as a cartridge
at $8009.

```bash
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
c1541 antiriad.d64 -read antiriad /tmp/antiriad.prg        # (VICE's c1541, or any D64 extractor)
node /tmp/probe.mjs /tmp/antiriad.prg /tmp/antiriad --disk antiriad.d64 --frames 1300 --dump-at 8009:/tmp/antiriad.ram
node tools/extract-antiriad.mjs /tmp/antiriad.ram           # -> games/antiriad/src/data/antiriad.json
```

(The dump's MD5 is `424c3f5f37b8810d2d1a70447346f944`; the extractor checks it's the game,
unpacked.)

## The original, for the checks

`test/original.state` and `test/armour.state` are snapshots of the original running (its own
code, on c64kit's C64 model), which the checks in `test/` compare the port with. Made from a
snapshot in play:

```bash
node /tmp/probe.mjs /tmp/antiriad.prg /tmp/antiriad --disk antiriad.d64 --frames 1700 --fire 1500 --save-state 1650:/tmp/play.state
nice -n 15 node tools/test.mjs games/antiriad/test/fixtures.ts /tmp/play.state games/antiriad/test
```

They're for tests only: the game itself never loads them.
