# Building the Dragonskulle game image

`assets/dragonskulle-title.state` is a snapshot of the original game taken at
its title screen, made with `tools/probe` from the "1001" crack on archive.org
(`Dragonskulle_1985_ACG_cr_1001.d64`, item `Dragonskulle_1985_ACG_cr_1001`), with
`patch.json` applied once the game is running: that copy's title says "COPYRIGHT
A.C.G. 1001" (the crackers' name in the year), so the original line ("COPYRIGHT
A.C.G. 1985", as in the CCS copy's screenshot; `=` is a dot in the game's font) is
put back, in the text ($9391) and on the screen ($07D9).

Other copies tried: the original disk image (`Dragonskulle_1985_ACG_o`, 40 tracks with
error bytes) stops in its protected loader on the probe; the Radwar and Dynamic Duo
cracks sit in their intros. The 1001 crack's intro waits for a key (Space at frame
1300), then it loads "DRAGONSKULLE 2" and starts the game at $0A00 (SYS 2560).

```bash
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
# the "DRAGONSKULLE" PRG from the d64 (any D64 extractor)
node /tmp/probe.mjs DRAGONSKULLE.prg /tmp/dragonskulle --disk game.d64 --frames 2470 \
  --hold Space@1300-1310 --patch games/dragonskulle/build/patch.json --patch-frame 2400 \
  --save-state 2460:games/dragonskulle/assets/dragonskulle-title.state
```
