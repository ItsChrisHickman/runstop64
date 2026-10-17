# tools/zx

A headless ZX Spectrum 48K in TypeScript, the Spectrum counterpart of `tools/probe` (the C64): it boots a tape, runs frames, takes
pictures and snapshots, and runs the originals that Spectrum rebuilds are checked against. **Test and study tool only**: nothing in
`games/` or `packages/` that goes into the browser bundle imports it (a rebuild is native TypeScript, not an emulation). It lives
under `tools/` so it is type-checked with the Node code (`tsconfig.test.json`), not shipped.

| File | What |
|---|---|
| `z80.ts` | The Z80: documented and undocumented opcodes, X/Y flags, WZ, block instructions, IM 0/1/2, T-states per instruction. Passes zexdoc and zexall |
| `spectrum.ts` | 48K machine: ROM + RAM, 69888-T frames with the interrupt in the first 32, keyboard half-rows, Kempston, border and a beeper log (frame, T-state, level), the ROM loader trapped (`LD-BYTES` takes the next tape block), optional 128K paging and AY register log. No contention, no floating bus |
| `tape.ts` | `.tap` and `.tzx` blocks (bytes only; every length checked) |
| `snapshot.ts` | Our snapshot format "ZXS1" (CPU, ULA, frame counter, keys, 48K RAM) |
| `screen.ts` | The ULA's picture from memory (bitmap, attributes, flash, border), palette indexes 0-15, PNG |
| `boot.ts` | ROM loading, `typeLoad` (types `LOAD ""`), `tap` (press keys for frames) |
| `zxprobe.ts` | Command line: boot a tape, hold keys over frames, `--snap` PNGs, `--save-state`, `--dump` 64K |
| `disasm.ts`, `zxdis.ts` | Z80 disassembler (the C64 one is `tools/re/disasm.mjs`); `--map` lists only code a coverage run saw |
| `test/` | `cpu.ts`, `machine.ts` (no files needed), `rom.ts`, `zex.ts` (needs the ROM and the exercisers, fetched into `games/moley/build/`) |

**Why here.** The model is only needed while we check a rebuild against an original, like `tools/probe`, so it stays out of the
browser bundle and out of c64kit. It needs the 48K ROM (Amstrad's, fetched at build time into the gitignored
`games/moley/build/`, never committed). If a game ever needs a Z80 running live (a music player, say), the CPU is a standalone
module that can move to a package beside c64kit.

The PNG writer is the shared `tools/png.ts` (also used by `tools/probe/render.ts`).
