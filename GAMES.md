# Games

The ten games runstop64 brings to the browser, how each was made, and what is on the list for later. Each is a tribute, with
full credits on its info sheet and title screen. Each game's `QOL.md` lists every change from the original, and its
`re/README.md` records what was learned about the original and how the port is checked.

## Two kinds

**Native rebuilds** rewrite the game in TypeScript, with its rooms and rules as data, from the original's own data and code
(read from a disassembly or from the running game). The original's graphics, music and behaviour are kept exactly, and each
rebuild is compared with the original running on an emulated C64, step by step and frame by frame. New features are cheap on
a rebuild: a map with travel, saving anywhere, hints, overlays.

**Translations** convert the original's 6502 code routine by routine to TypeScript, running on a model of the C64's chips.
They play exactly like the originals, but every new feature first means reverse-engineering the part of the game it touches.
They are translations, not native ports, and are never called native.

## Live

| Game | Made as | Notes |
|---|---|---|
| Monty on the Run (Gremlin, 1985) | Native rebuild, from an annotated reconstruction's data | The model for the rebuilds. Its title is the original's attract screen, checked frame for frame; a game ends on CONTINUE?; a map with travel. ENHANCED adds ten rooms of our own. |
| Auf Wiedersehen Monty (Gremlin, 1987) | Native rebuild, from the original's data and code read in the running game | All 80 rooms, Monty, 17 enemy types, lifts, items, deliveries, title, GAME OVER and the ending, music and effects, the flights between airports, all checked against the original. Its music is built from the original at build time and never committed. |
| Thing on a Spring (Gremlin, 1985) | Translation | Cycle-timed. Map of the factory with travel, ENHANCED steering and jump help. |
| The Staff of Karnath (Ultimate, 1984) | Translation | Map with travel, spells on number keys, HD view. |
| Entombed (Ultimate, 1985) | Translation | Map of all seven floors with travel, hints for 20 of the 25 chambers, HD view. |
| Blackwyche (Ultimate, 1985) | Translation | Map of the galleon with travel, GUIDED narration and hints, HD view. |
| Dragonskulle (Ultimate, 1986) | Translation | The fourth Pendragon game: the island map with travel, hints, an action bar, HD view. |
| Jet Set Willy II (Software Projects, 1985) | Translation | Map of the mansion with travel and an item count, running, safe landings. |
| Starquake (Bubble Bus, 1985) | Native rebuild, from the C64 game's data and code read in a disassembly | All 512 rooms and the whole game checked frame for frame; map with travel; touch answers for its typed screens. |
| The Sacred Armour of Antiriad (Palace, 1986) | Native rebuild, from the game's data and code read in a disassembly of the running game | All 69 rooms byte for byte, Tal in and out of the armour, creatures, the panel and Richard Joseph's music from the game's own driver. Map with travel, New Game+. Some parts and the title sequence are not yet checked by scripted runs (`games/antiriad/re/README.md`). |

## Maybe later

- Moley Christmas (Gremlin / Your Sinclair, 1987): the fifth Monty Mole game, ZX Spectrum only. Stage 1 is done (a headless
  Spectrum in `tools/zx`, the original's structure in `games/moley/re/README.md`, the plan in `docs/moley-plan.md`); no game
  is registered yet. No disassembly or source is published, so it is studied the way Auf Wiedersehen Monty was.
- A native engine for all four Pendragon games (Karnath, Entombed, Blackwyche, Dragonskulle).

## Not on the list, on purpose

- Bounder (Gremlin, 1985) was ported and then removed on 2026-10-15: it was not fun to play. It is in git history.
- Games whose makers still sell them (System 3's The Last Ninja, re-released on Switch): playing their releases is better,
  and supports them.
