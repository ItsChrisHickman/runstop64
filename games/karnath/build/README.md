# Building the Staff of Karnath game image

`assets/karnath-title.state` is a snapshot of the original game taken at its
title screen, made with `tools/probe` from
`Staff_of_Karnath_The_1985_Ultimate.d64` on archive.org (its loader shows the
original loading picture and waits for F5, then loads the three parts).

```bash
node /tmp/probe.mjs out/STAFF_OF_KARNATH.prg /tmp/karnath --disk game.d64 --frames 901 \
  --hold F5@400-420 --save-state 900:games/karnath/assets/karnath-title.state
```
