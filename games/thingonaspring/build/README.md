# Building the Thing on a Spring game image

`assets/toas-title.state` is a snapshot of the original game (RAM, colour
RAM, VIC/SID/CIA registers, CPU) taken at its title screen, so the browser
boots straight into it with no loader.

It's made with `tools/probe` from the "Flash" crack on archive.org
(`Thing_on_a_Spring_1985_Gremlin_Graphics_cr_Flash.d64`), with `patch.json`
applied at boot: the crackers had replaced the title scroller and the
high-score names, so those are restored as credits to the original team. The
scroller's key instructions are rewritten for this keyboard (Space to start,
arrows and Space to play, M to mute), and the crackers' sign-off is gone.

```bash
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
# extract the "  THINGS ON" PRG from the d64 with any D64 extractor (VICE's c1541) as out/_THINGS_ON.prg
node /tmp/probe.mjs out/_THINGS_ON.prg /tmp/toas --disk game.d64 --frames 700 \
  --patch games/thingonaspring/build/patch.json --save-state 650:games/thingonaspring/assets/toas-title.state
```
