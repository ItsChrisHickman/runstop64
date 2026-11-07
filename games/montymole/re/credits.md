# Wanted: Monty Mole: credits and sources

For `src/info.ts` and the reward show later. Every line has its source; nothing here is invented, and where sources
disagree or are silent it says so. Checked 2026-11-07.

## Who made the ZX Spectrum game

| Fact | Source |
|---|---|
| Created and programmed by **Peter M. Harrap**; the title picture carries "P.M.HARRAP" in its lettering (read from the running original: the loading screen's bottom line) | [Spectrum Computing, entry 5617](https://spectrumcomputing.co.uk/entry/5617) ("Creator: Peter M. Harrap"); [Wikipedia](https://en.wikipedia.org/wiki/Wanted:_Monty_Mole) ("Developers: Peter Harrap (ZX Spectrum) and Antony Crowther (Commodore 64)") |
| Published by **Gremlin Graphics Software Ltd** (Sheffield), **29 July 1984** in Europe, 48K, £6.95; Gremlin's first game and the first of the Monty Mole series | Spectrum Computing entry 5617 (date, price, publisher); Wikipedia ("Gremlin Graphics' first game and the first in the Monty Mole series") |
| The character **Monty Mole** was created by **Ian Stewart**, Gremlin's director | Wikipedia ("Monty Mole was created by Ian Stewart, the company's director") |
| Inlay, cover and poster art by **David Bracher** (credited "DB" on the cover). Nothing credits him with the in-game graphics or code | Spectrum Computing entry 5617 ("Inlay/Poster Art"); [MobyGames credits](https://www.mobygames.com/game/15397/wanted-monty-mole/credits/) |
| No music composer: the tunes are arrangements of two public-domain pieces, played on the beeper: the title tune is a slow "Colonel Bogey March" (Kenneth Alford, 1914) and the tune when Monty loses a life is the hymn "Abide with Me" to W. H. Monk's tune "Eventide" | Wikipedia ("Music"); Spectrum Computing entry 5617 ("Music references: Kenneth Alford, Colonel Bogey March; William Henry Monk, Eventide") |
| There is no 128K or AY music: the code has no write to the AY ports (`$FFFD`, `$BFFD`) or the paging port (`$7FFD`) | read from the original: a byte scan of the 49152-byte game block for `OUT (n),A` and `OUT (C),r` to those ports finds only two false matches, both data (`$42D5` in the title picture, `$EEEF` in a sprite table); every port write the model saw in the title, the menu, the opening and room 0 is to `$FE` (`re/README.md`, "Sound") |

The C64 game of the same name is a different program by Antony Crowther (it scrolls); this port is of the Spectrum game
only, as Chris asked.

## What the game is about (for the info sheet)

- Set in the UK miners' strike of 1984 to 1985: Monty Mole raids his local South Yorkshire pit for coal; the final rooms are
  "Arthur's castle", with a character based on the union leader Arthur Scargill. (Wikipedia; the inlay text on World of
  Spectrum: "With a long cold winter and bone chilling Christmas ahead, Monty Mole makes a daring, coal snatching raid to his
  local South Yorkshire pit... Seizing his only chance of toppling the great man Monty collects the secret ballot papers and
  vote casting scroll.") The inlay lists "3 lives - 21 levels" and "Flying pickets, Carnivorous fish, Deadly hairsprays,
  Coal drills, Coal crushers, Underground railway, Miners helmets, Flying bricks, Candles, Excaliburs sword, Ghosts". (The 21 levels are
  proved: 21 rooms, `re/README.md`.)
- Keys on the inlay: O left, P right, Q up, A down, B to SPACE jump. The game's options menu also takes a Kempston joystick
  (2) and a Sinclair joystick (3).
- The game's own texts (read from the running original, decoded from its letters): the game-over verse ("WHY DID MONTY DIE SO
  FAST / AREN'T 3 LIVES ENOUGH TO LAST / THE HAZARDS THAT CONFRONT A MOLE / IN HIS SEARCH FOR PRECIOUS COAL / DON'T LET MONTY
  DIE IN VAIN / PRESS A KEY AND TRY AGAIN") and the ending verse in 36 lines ("OUR GALLANT MOLES COMPLETED THE TASK ... FOR
  FIVE WHOLE YEARS THAT START TODAY / MONTY STUNNED HIS MOUTH AGAPE / AND NOW WHO DARES PLAN HIS ESCAPE"). Both are at the
  addresses in `re/README.md`; extract them as data with the ending's phase.

## Reception and history (for the reward show's fun facts; each with its source)

| Fact | Source |
|---|---|
| Crash gave it 92% and a Smash; Personal Computer Games 80% | Wikipedia ("Reception"), [Personal Computer Games review](https://everygamegoing.com/larticle/Wanted-Monty-Mole-000/31290) |
| It reached number 2 in the all-formats sales chart in the week to 13 September 1984 (behind Daley Thompson's Decathlon) and topped the Spectrum chart that week | Wikipedia |
| Gremlin reported 20,000 copies sold in the first six weeks | Wikipedia |
| Crash readers' award 1984: best platform game (1st); Golden Joystick Awards 1984: 3rd, best arcade-style game of the year | Wikipedia; Spectrum Computing entry 5617 ("Awards") |
| Sequels: Monty is Innocent (1985), Monty on the Run (1985), Auf Wiedersehen Monty (1987), Moley Christmas (1987), Impossamole (1990) | Wikipedia; Spectrum Computing entry 5617 |
| World of Spectrum's instructions say of the author: "A sparkling new approach from a fresh face to Spectrum programming. Monty Mole has created outstanding interest and quite a stir with games esperts, national press and television." | the inlay text, [World of Spectrum](https://worldofspectrum.org/software?id=0005617) (`Wanted-MontyMole.txt`) |
| A free-to-the-reader fact that is in the code itself: the points a piece of coal is worth are the leftover bytes of the programmer's assembler source (read, one value proved): `re/README.md`, "Score" | our reading of the original |

## What the info sheet and title should say

Title (in the game's own lettering, as the original's picture has it): MONTY MOLE, GREMLIN GRAPHICS, P.M.HARRAP. Info sheet
(`src/info.ts`, with Wikipedia links as the other games do): *Wanted: Monty Mole* (1984) ([Wikipedia](https://en.wikipedia.org/wiki/Wanted:_Monty_Mole)),
Peter Harrap, Gremlin Graphics ([Wikipedia](https://en.wikipedia.org/wiki/Gremlin_Interactive)), Monty Mole created by Ian Stewart, cover art
David Bracher, beeper arrangements of Colonel Bogey and Eventide ([Wikipedia](https://en.wikipedia.org/wiki/Colonel_Bogey_March),
[Wikipedia](https://en.wikipedia.org/wiki/Abide_with_Me)). Verify each link when the info sheet is written.
