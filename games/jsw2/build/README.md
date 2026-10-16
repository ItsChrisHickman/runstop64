# Building the Jet Set Willy II game image

`assets/jsw2-title.state` is a snapshot of the original game (RAM, colour RAM,
VIC/SID/CIA registers, CPU) taken at its title screen, so the browser boots straight
into it with no loader.

It's made with `tools/probe` from the TCS crack on archive.org
(`Jet_Set_Willy_II_The_Final_Frontier_1985_Software_Projects_cr_TCS.d64`), with
`patch.json` applied once the game has unpacked itself: the title scroller credits the
whole original team, its key list is rewritten for this keyboard, the title says
"PRESS SPACE TO START" (Enter continues a saved game), and the practice screen's
instructions name this keyboard's keys.

```bash
npx esbuild tools/probe/c64probe.ts --bundle --platform=node --format=esm --outfile=/tmp/probe.mjs
c1541 game.d64 -read "jet set willy 2" out/JET_SET_WILLY_2.prg   # (VICE's c1541, or any D64 extractor)
node /tmp/probe.mjs out/JET_SET_WILLY_2.prg /tmp/jsw2 --disk game.d64 --frames 1700 \
  --patch games/jsw2/build/patch.json --patch-frame 900 --save-state 1650:games/jsw2/assets/jsw2-title.state
```

Then translate again (`npm run gen -- --force`) and rebuild
the map (`nice -n 15 node tools/test.mjs games/jsw2/re/mansion.ts`) if the code or rooms could have changed.
