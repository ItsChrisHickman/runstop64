# Do Svidaniya: a commercial version, and what it owes Monty on the Run

For Chris, and for a lawyer if it comes to that. Started 2026-11-24. The goal: a version of the game with no Monty in it that can
be sold (Steam first), that also runs as a native Commodore 64 game, and that can be ported to other platforms, built from one
source so there is one game to maintain.

This is an engineering inventory, not legal advice. A games/IP lawyer makes the final call before anything is sold.

## What comes from Monty on the Run (must be replaced or licensed)

| What | Where | How we know |
|---|---|---|
| **The engine code** | `games/montyotr/src` (`game.ts`, `monty.ts`, the physics, the frame loop) | A TypeScript port of the original's routines, made by reading Dave-Agent's reconstruction on GitHub (no licence: all rights reserved, and itself Gremlin's code annotated). `game.ts`: "Field names follow the reconstruction's zero-page labels"; `monty.ts`: "a port of the original Monty.Draw", the original's coordinates. A port of copyrighted code is a derivative work. |
| **The music** | every region's tune, `games/montyotr/assets/monty_on_the_run.sid` | Rob Hubbard's Monty on the Run song in a version per region. |
| **AWM's theme** | the flight (the sky region) | Auf Wiedersehen Monty's main theme (Hubbard and Daglish), from AWM's .sid. |
| **Monty himself** | his frames in the sprite bank; the regions' hats and costumes are drawn over them | The character, his name and his likeness. |
| **The coin** | character `$34` (`COIN_CHAR`), in 52 of 57 rooms | Measured 2026-11-24: byte-identical to Monty on the Run's. |
| **The score bar and the lettering** | rows 0-1 (SCORE, HI-SCORE, the lives) and row 24 (the room names) | Measured: 46 of the 51 characters drawn outside the playfield are byte-identical to Monty on the Run's. |
| **The crushers and Monty's death** | the Mole Crusher heads (Rio's float head uses the same mechanic) and the four-way split death | Chris, 2026-11-24: both are Monty on the Run's. |

## What is ours

Measured 2026-11-24, every room frame by frame against Monty on the Run's bank: **no sprite** and **no playfield character** but
the coin is byte-identical to Monty on the Run's. So, ours:

- The 57 rooms: the route, the puzzles, the set pieces (the train, the cargo ship, the flight, the beach finale, the parade).
- The region art (`games/montyworld/src/art`): tiles, decorations, creatures, items, Viktor Vole, the planes.
- The story, the characters (Viktor), the title sequence and its chase.
- The mechanisms added for this game: escalators, cracking ice, lava, vines, swimming, cable cars, planes, pursuers, the tally...
  (each a module of ours, plugged into the engine).
- The tooling: c64kit, the room format, the bots, the recorded proofs, the room-scoped tests.

## Parody, and fine as it is (Chris, 2026-11-24)

- The Spy vs Spy tally and the SPY VERSUS MOLE showdown.
- THE LAST MOLE (a nod to The Last Ninja, nothing copied).

## The platforms: one game, native on the C64 and on Steam

Chris's goal: a native Commodore 64 game, a Steam game, and ports to other platforms, never locked into one runtime. The web
version may even run the C64 build in an emulator, to prove it is the real thing.

**Recommendation: the game is written once, in 6502, for the C64; every other platform runs that same code.**

- **The C64 build** is the game: a `.prg`/`.d64` that runs on a real machine and in VICE.
- **Web, Steam and the rest** run the same 6502 code translated to TypeScript by our translator (`tools/re/to-ts.mjs`): this is
  how runstop64 already plays Blackwyche, Dragonskulle and the other translated games, exactly, with every quality-of-life
  feature on top (`runNative`: hooks into the code, saves, the map, travel, touch controls). Steam wraps the web build
  (Electron or Tauri); other platforms the same, or an emulator. An emulator build is the proof that nothing is faked.
- **The engine is written fresh** from a written description of how the game behaves (jump arcs, timings, collisions, what
  kills), never from the port: that clean-room rewrite is needed for the commercial version anyway, so it doubles as the C64
  build. The bots and recorded proofs (ours) are the check that the new engine plays the same.
- **Content stays authored in our tools**: rooms, mechanisms and art in today's room format, exported to the 6502 build's data.
  The bots, proofs and room tests keep running, on the translated code.

Why not the alternatives:
- *Keep the TypeScript engine and port it to the C64 separately*: two engines that drift apart, and the TypeScript one is the
  derived code.
- *A portable C core* (llvm-mos for the C64, native or WASM elsewhere): workable, and the fallback if 6502 proves too slow to
  write; but it adds a compiler between us and the machine, and it does not reuse the translate-and-enhance pipeline we have.

## Quality of life on a native core (60 frames a second and the rest)

The C64 runs at 50 frames a second (PAL; 60 on NTSC), and the game's logic stays at the machine's rate on every platform, so it
plays the same everywhere. The features go where they fit:

- **In the 6502 build itself, where memory allows** (these are game rules, so they belong to the game): EASY and HARD, restart
  in the room, the pause screen and its map in C64 style.
- **In the host, for web and Steam** (outside the machine, like today's translated games):
  - **Smooth motion at 60 Hz and above**: the renderer draws at the display's rate and glides sprites between the machine's
    frames (today's `Smoothed`, `packages/c64kit/src/loop.ts`; sideways only: the lesson that vertical gliding lifts figures
    off their floors holds).
  - Saves anywhere and continue (machine snapshots), travel (hooks into the game's own room entry), touch controls and phone
    scaling, gamepads, the overlay's info and export.
  - Things only a host can do: widescreen borders, scaling filters, remapping, achievements.

## Constraints to check before committing

- **Memory**: 64 KB for the code, 57 rooms, the art, the sprites and the music. The decoration budget test is a start; a C64
  memory budget for the whole game is the first thing a prototype measures.
- **CPU**: the mechanisms per frame on a 1 MHz 6502 (the flight, the pursuers, many creatures).
- **PAL and NTSC**: timing on both.

## Order of work (proposed)

1. Finish the tribute: Chris's playtest and its fixes. The tribute stays on today's engine, as it is.
2. Write the behaviour description from today's engine and bots: the clean-room line.
3. Prototype one region in 6502: built for a real C64 and VICE, translated and run in the web shell, its memory and CPU
   measured. Go or no-go on the approach.
4. Replace what is Monty on the Run's: a new hero, the coin, the score bar and lettering, the crushers and the death, an original
   soundtrack for the SID.
5. The other regions; then the Steam wrapper.

## Open questions for Chris

- The hero who replaces Monty, and the game's commercial name.
- Who composes the soundtrack (it plays on the SID on every platform).
- Who owns the commercial game (the company that publishes on Steam).
