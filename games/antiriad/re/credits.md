# The Sacred Armour of Antiriad: the ending's credits, and where each line comes from

The ENHANCED ending (`src/ending.ts`, `src/ending-scenes.ts`, the show in `games/shared/ending/show.ts`) types credits on over its
montage, in the order of Super Mario World's: the makers, then true facts about the game, then the port (`PORT_CREDITS` in
`games/shared/native/ending.ts`). Every line below was checked against the source next to it (read 2026-10-19). Nothing is
invented. Lines are upper case and at most 38 letters, in the font the show draws them in (the kit's: no percent sign, so 98% is
written 98 PERCENT). They are in `SCENES` (`src/ending-scenes.ts`), a few to a place, in this order; the last place's first two
slots are empty on purpose (the game's own ending flashes the screen white there, and nothing is typed over that: the test checks).

Sources used (all read 2026-10-19):

- **Wikipedia**, *The Sacred Armour of Antiriad* (wikitext, `action=raw`): https://en.wikipedia.org/wiki/The_Sacred_Armour_of_Antiriad
- **Wikipedia**, *Palace Software*: https://en.wikipedia.org/wiki/Palace_Software
- **Wikipedia**, *Richard Joseph*: https://en.wikipedia.org/wiki/Richard_Joseph
- **C64-Wiki**, *The Sacred Armour of Antiriad* (the rendered page; its `action=raw` is not the article): https://www.c64-wiki.com/wiki/Antiriad
- **ZZAP!64** issue 20, December 1986 (the review on pp. 34-36 and the Tips page): https://archive.org/details/zzap64-magazine-020
  (full text: https://archive.org/download/zzap64-magazine-020/ZZap_64_Issue_020_1986_Dec_djvu.txt)
- **CRASH** issue 35, December 1986, p. 17-18 (the Spectrum review): https://archive.org/details/crash-magazine-35
- The game itself (the panel's messages, `$C1AA`; the rooms).

## The makers

| Line shown | Source |
|---|---|
| THE SACRED ARMOUR OF ANTIRIAD | The title. |
| PALACE SOFTWARE, LONDON, 1986 | Wikipedia, *The Sacred Armour of Antiriad*: "published by Palace Software in 1986"; Wikipedia, *Palace Software*: "a British video game publisher and developer during the 1980s based in London, England". |
| PROGRAMMING BY STANLEY SCHEMBRI | Wikipedia infobox: programmer Stanley Schembri; C64-Wiki, Developer: "Code: Stanley Schembri". |
| GRAPHICS BY DANIEL MALONE / AND STEPHEN ROBERTSON | C64-Wiki, Developer: "Grafik: Daniel Malone, Stephen Robertson". Wikipedia infobox: artist Daniel Malone. |
| STORY AND COMIC BY DANIEL MALONE | Wikipedia infobox: writer and artist Daniel Malone; the text: "The original game came with a 16-page comic book created by graphic artist Daniel Malone". ZZAP!64 issue 20, p. 35: "Dan Malone's mini-comic is brilliant". CRASH issue 35, p. 17 lists "Author: Dan Malone". |
| MUSIC BY RICHARD JOSEPH | Wikipedia infobox: composer Richard Joseph (the list on his page has the game, 1986); C64-Wiki: Musician Richard Joseph (HVSC `Sacred_Armour_of_Antiriad.sid`). The port plays his player and tunes as the original's own code. |

The same credits are in the game's `src/info.ts` (and the title's credits page is the original's own).

## The true facts

| Line(s) shown | Source |
|---|---|
| RICHARD JOSEPH ALSO SCORED / SENSIBLE SOCCER AND CANNON FODDER | Wikipedia, *Richard Joseph*: "best known for games like *Barbarian: The Ultimate Warrior*, *Sensible Soccer*, *The Chaos Engine*, and *Cannon Fodder*". |
| A 16 PAGE COMIC CAME IN THE BOX | Wikipedia (above). C64-Wiki, Accessories: "a 16-page postcard-sized comic that tells the backstory of the game". |
| AN EARLY METROIDVANIA, MADE ALONGSIDE / METROID WITHOUT KNOWING OF IT | Wikipedia, intro: "The game is an early example of the Metroidvania genre, being developed without knowledge of and concurrently with *Metroid*", citing John Szczepaniak, "Backtracking: The History of Metroidvania", *GamesTM* issue 116, pp. 148-153 (not read here). |
| PALACE MADE CAULDRON AND BARBARIAN | Wikipedia, *Palace Software*: "notable for the *Barbarian* and *Cauldron* series of games for 8-bit home computer platforms". |
| ZZAP!64 GAVE ITS GRAPHICS 98 PERCENT / AND THE SOUND 91 PERCENT, DEC 1986 | ZZAP!64 issue 20, p. 36, the rating box: "GRAPHICS 98%", "SOUND 91%" (also Presentation 97%, Hookability 95%, Lastability 90%, Value 93%; C64-Wiki, Votes, gives the overall 93%). |
| ZZAP!64: A MAP IS ALMOST ESSENTIAL | ZZAP!64 issue 20, p. 35 (the first review box): "There are quite a few locations, and a map is just about essential if you are to complete the game." |
| ZZAP!64 PRINTED ONE IN DEC 1986 | ZZAP!64 issue 20, the Tips introduction: "in the centre pages there's a beautiful map of The Sacred Armour of Antiriad" (the OCR text is garbled after it; the sentence is clear). |
| ZZAP!64 SAID OVER 100 LOCATIONS / THE GAME HAS 69 SCREENS | ZZAP!64 issue 20, p. 34, the strapline: "Flip screen arcade adventure with over 100 graphically stunning locations to explore". C64-Wiki: "an action adventure game that spans 69 screens" (its Trivia guesses the rooms of a level arranged in a loop made ZZAP!64 count more); the port's data has 69 rooms, `$00-$44` (`re/README.md`). |
| THE TELEPORTER SAYS BEAM ME UP SCOTTY | The game's own message `$11` (read from the original's data, the table at `$C1AA`: `re/messages.ts`); C64-Wiki, Hints: "the armour's status display shows the message 'BEAM ME UP SCOTTY'". |
| ANTIRIAD COMES FROM ANTI-RADIATION | Wikipedia, Plot: "the Sacred Armour of Antiriad (the last word being a corruption of 'anti-radiation')"; C64-Wiki, Vorgeschichte: the elders mistake the crack after the R in the heading "Anti-Rad" for an I. |
| IN THE US EPYX CALLED IT RAD WARRIOR | Wikipedia, intro: "In North America, the game was published by Epyx as *Rad Warrior*"; C64-Wiki, Screenshot comparison (1988). |

## The port

`PORT_CREDITS` (`games/shared/native/ending.ts`), the same in every game: REBUILT FOR THE BROWSER BY / CHRISTOPHER HICKMAN / WITH CLAUDE (ANTHROPIC) / RUNSTOP64.

## The parade's names

The names the C64-Wiki gives: DRAGON ("fire-breathing dragon"), MONKEY ("aggressive monkey"; "purple monkeys hanging from the trees"), GUNMAN ("the gunman ... shaken by the recoil of his machine gun"; "machine gunners"), ACID DROP, ENERGY BARRIER, TELEPORTER, RECHARGE CELL, and the four parts: PULSAR BEAM, PARTICLE NEGATOR, GRAVITY DISPLACER, IMPLOSION MINE (C64-Wiki, Screen Layout and Hints; Wikipedia, Plot, calls the boots "anti-gravity boots" and names the other three). TAL and ARMOUR (the Sacred Armour of Antiriad) are the game's own. The rest are ours, plain, for what they look like: SAUCER, BROWN MUTANT, PURPLE MUTANT, BLUE ORB, BAT, SPIDER, GREEN BUG (none of the sources names them; the manual was not checked). Chris may want to change them. ZZAP!64 calls them "mutant creatures, deformed by radiation, as well as alien guards" and the dragons "fire breathing dragons"; CRASH "mutant guardians" and "an enemy alien robot".

## Checked and not used

- **Steve Kyte**, named in the brief as the author of a comic or novella with the game: no source found. None of the pages above (Wikipedia, C64-Wiki, ZZAP!64 issue 20, CRASH issue 35) names him; Wikipedia has no such page and credits the comic to Daniel Malone, as do ZZAP!64 and CRASH. Not credited.
- Wikipedia's *Dan Malone* page is a Pulitzer-winning journalist, a different person: the info sheet linked it for the artist and no longer does.
- The Spectrum version's credits (Wikipedia, *List of ZX Spectrum games*: Chris Stangroom, Dan Malone, Richard Joseph) are for that version; this is the C64's (C64-Wiki, above).
- Review scores of other magazines (C64-Wiki, Votes: Commodore User 8/10, Computer and Video Games, Happy Computer, ASM, Crash 89%...): the C64-Wiki page is the only place read for them; ZZAP!64's own scan was read.
- Lemon64 and MobyGames answered 403 to every request from here, so nothing is taken from them.
