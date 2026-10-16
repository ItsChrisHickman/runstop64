# runstop64

**RUN/STOP on the C64 classics.** Ten Commodore 64 games, rebuilt for the browser from their original data and code: the
same rooms, graphics, physics and SID music, without the loading, the flicker or the 50 Hz judder. Then added to: a map of
each game with travel to any place you have been, autosave, touch controls for phones, and an ENHANCED mode with
quality-of-life changes for a modern playthrough.

**Play: https://goshow.me/runstop64/**

These are tributes. All credit for the originals belongs to their creators (below).

## The games

| Game | Made as | Play |
|---|---|---|
| **Monty on the Run** (Gremlin Graphics, 1985) | Native rebuild | [#montyotr](https://goshow.me/runstop64/#montyotr) |
| **Auf Wiedersehen Monty** (Gremlin Graphics, 1987) | Native rebuild | [#awm](https://goshow.me/runstop64/#awm) |
| **Thing on a Spring** (Gremlin Graphics, 1985) | Translation | [#thingonaspring](https://goshow.me/runstop64/#thingonaspring) |
| **The Staff of Karnath** (Ultimate, 1984) | Translation | [#karnath](https://goshow.me/runstop64/#karnath) |
| **Entombed** (Ultimate, 1985) | Translation | [#entombed](https://goshow.me/runstop64/#entombed) |
| **Blackwyche** (Ultimate, 1985) | Translation | [#blackwyche](https://goshow.me/runstop64/#blackwyche) |
| **Dragonskulle** (Ultimate, 1986) | Translation | [#dragonskulle](https://goshow.me/runstop64/#dragonskulle) |
| **Jet Set Willy II** (Software Projects, 1985) | Translation | [#jsw2](https://goshow.me/runstop64/#jsw2) |
| **Starquake** (Bubble Bus, 1985) | Native rebuild | [#starquake](https://goshow.me/runstop64/#starquake) |
| **The Sacred Armour of Antiriad** (Palace Software, 1986) | Native rebuild | [#antiriad](https://goshow.me/runstop64/#antiriad) |

There are two kinds of game here, and they are different things.

- A **native rebuild** is the game written again in TypeScript, with its rooms and rules as data, from the original's own data
  and code. The original's graphics, music and behaviour are kept exactly.
- A **translation** is the original's 6502 machine code converted routine by routine to TypeScript, running on a model of the
  C64's chips. It plays exactly like the original; it is a translation, not a rebuild.

[GAMES.md](GAMES.md) has the detail for each game. Each game's `QOL.md` lists every change from the original.

## In every game

- **ORIGINAL / ENHANCED:** one switch (E on the pause screen). ORIGINAL is the game exactly as it was. ENHANCED, the default,
  adds changes chosen for that game to make it more enjoyable to play today: better steering, a gentler fight, hints.
- **A pause screen with a map** of where you have been and what you have found, and travel back to any place you have been.
- **Autosave** on entering each room, CONTINUE from the title, back to the start of a room, and a saved-games screen (F1 in the
  loader) that can bring back the save from before a new game.
- **Touch controls** on phones: a stick and buttons beside the picture, in landscape ([docs/mobile.md](docs/mobile.md)).
- **Keyboard and gamepads**, with each game's on-screen key instructions rewritten to match.
- **An HD view** in Blackwyche, Karnath, Entombed and Dragonskulle: the same game as a lit 3D scene built from its own
  picture (H, or the C64/HD button; [docs/hd-view.md](docs/hd-view.md)).

## How it is built

```
packages/c64kit/       the shared engine
  src/renderer.ts      Three.js renderer: the 320x200 picture pixel-perfect, sprites gliding between frames, phone scaling
  src/loop.ts          fixed 50 Hz game logic, drawn at the display's refresh rate
  src/sid/             a 6502 and SID emulation for the original music, and SID sound effects
  src/c64/, vic.ts     the C64 model the translated games run on (VIC-II, CIA, memory) and how its picture is decoded
  src/hd/              the HD view
  src/layout.ts, effects*.ts, overlay.ts, input.ts, font.ts, palette.ts, surface.ts
games/
  index.html, loader.ts, shell.ts    the C64-style READY. loader and the page around each game
  saves.ts                           the saved-games screen
  shared/                            one module per feature: pause screen and map, saves, touch, name entry,
                                     the translated games' runtime (native/), the Pendragon games' room decoder
  <game>/                            src/, re/ (notes on the original), test/, QOL.md
tools/
  test.mjs             runs a headless check written in TypeScript
  test-all.mjs         runs them all (the list is tests.mjs): fast set by default, --slow adds the rest
  probe/               a C64 in TypeScript, to run the originals and compare against them
  re/                  a 6502 disassembler and the 6502-to-TypeScript translator
  extract-*.mjs        pull a game's original data out of its disassembly or an image
  strict.mjs           the strict-TypeScript check
  deploy-goshowme.sh   publish to goshow.me/runstop64
```

- **Logic** runs at a fixed 50 ticks a second, like a PAL C64, so the original timing tables (jump arcs, animation rates)
  work unchanged. **Rendering** runs at the display's refresh rate with sprites gliding between ticks.
- **Music** is the original SID data played by the original composers' own player code, run by a 6502 emulator on the audio
  thread.
- **Tested against the originals.** Each game's original is run on the emulated C64 in `tools/probe`, and the TypeScript
  game is compared with it headlessly: native rebuilds frame by frame and step by step, translations in lockstep and routine
  by routine. The tests are TypeScript run by `tools/test.mjs`, and the repo's TypeScript is strict: no type assertions
  (`as` except `as const`), no non-null assertions, no `any`, no `@ts-ignore`.
- Auf Wiedersehen Monty's original data is not committed: its extracted tables are, but the music is built at build time from
  a disk image you supply (`games/awm/build/README.md`). The other games commit the extracted data and title snapshots they
  need.

## Develop

```bash
npm install
npm run dev            # Vite, on http://127.0.0.1:5173
npm run typecheck      # browser code, and Node code (tests, tools)
npm run check:strict   # no as-casts, no !, no any (written or inferred), no ts-ignore
npm run verify         # typecheck + strict + the fast tests: run it before every push
npm test               # the fast tests alone (node tools/test-all.mjs --slow adds the slow ones)
npm run build          # typecheck + strict check + build into dist/
node tools/test.mjs games/montyotr/test/frontend.ts    # one headless check
```

Contributors and coding agents: read [AGENTS.md](AGENTS.md) for the rules and the map of shared modules.

## Credits

- **Monty on the Run:** Peter Harrap; C64 version by Micro Projects (Anthony Clarke, Jason Perkins); graphics Mark Rodgers;
  music Rob Hubbard.
- **Auf Wiedersehen Monty:** Pete Harrap, Shaun Hollingworth, Chris Kerry, Colin Dooley, Greg Holmes; graphics Steve Kerry and
  T. Lloyd; music Rob Hubbard and Ben Daglish.
- **Thing on a Spring:** Jason Perkins and Anthony Clarke; graphics Mark Rogers; music Rob Hubbard.
- **The Staff of Karnath, Entombed, Blackwyche, Dragonskulle:** created and designed by Dave Thomas and Bob Thomas, published
  by Ultimate Play the Game.
- **Jet Set Willy II:** Matthew Smith created Jet Set Willy; the Spectrum sequel by Derrick P. Rowson and Steve Wetherill; the
  C64 version by John Darnell and Steve Birtles; published by Software Projects.
- **Starquake:** Stephen Crow; C64 version by Nick Strange; published by Bubble Bus.
- **The Sacred Armour of Antiriad:** programming Stanley Schembri; plot and graphics Daniel Malone; music Richard Joseph;
  published by Palace Software.

Each game's info sheet and title screen carry the full credits. Thanks also to
[Dave-Agent/monty-on-the-run](https://github.com/Dave-Agent/monty-on-the-run), an annotated reconstruction of Monty on the
Run whose data made that rebuild possible, and to the [High Voltage SID Collection](https://www.hvsc.c64.org/).

## License

The code in this repository (the kit, game code and tools) is MIT licensed. The original games' data, graphics and music
remain the property of their respective rights holders and are **not** covered by that license. If you hold rights to one of
these games and would like it removed, please [open an issue](https://github.com/ItsChrisHickman/runstop64/issues).
