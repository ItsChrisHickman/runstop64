# Building the Entombed game image

`assets/entombed-title.state` is a snapshot of the original game (RAM, colour
RAM, VIC/SID/CIA registers, CPU) taken at its title screen, so the browser
boots straight into it with no loader.

It's made with `tools/probe` from the "Vanilia & Florasoft" crack on
archive.org (`Entombed_1985_Ultimate_cr_Vanilia_Florasoft.d64`), with
`patch.json` applied once the game has unpacked itself: the crackers had put
their name on the title screen, so the original's line ("COPYRIGHT A C G
1985", as in the KMR copy) is restored.

```bash
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
c1541 game.d64 -read ENTOMBED out/ENTOMBED.prg   # (VICE's c1541, or any D64 extractor)
node /tmp/probe.mjs out/ENTOMBED.prg /tmp/entombed --disk game.d64 --frames 320 \
  --patch games/entombed/build/patch.json --patch-frame 250 \
  --save-state 300:games/entombed/assets/entombed-title.state
```
