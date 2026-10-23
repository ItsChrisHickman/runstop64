# Sources for the ending's credits

The lines are in `src/ending.ts` (the scenes' `credits`); the shared port lines (`PORT_CREDITS`) are in `games/shared/ending/credits.ts`. They
are typed into the panel's message line in the game's own lettering, so each is at most 28 letters of A to Z, digits and a colon (no stops,
commas or brackets: the line of the port that has brackets loses them).
Researched 2026-10-18. Wikipedia's wikitext was read directly (`action=raw`); the ZZAP!64 site answered 403 to a script, so the one fact
that rests on it is as Wikipedia cites it. The Retro Gamer 56 article that first named the makers (Martyn Carroll, "The Ultimate Adventure of
Sir Arthur Pendragon", October 2008, pp. 48-53) was read from the Wayback copy of its scan:
https://web.archive.org/web/20150925105537/http://scans.bytemaniacos.com/en/retro_gamer/Retro_Gamer_Issue_056.pdf (RG56 below; page numbers
are the magazine's own).

## The game and its makers

| Credit line | What is documented | Source |
|---|---|---|
| THE STAFF OF KARNATH / ULTIMATE PLAY THE GAME / DECEMBER 1984 / FOR THE COMMODORE 64 | Action-adventure developed and published by Ultimate Play the Game for the Commodore 64 (C64 only), December 1984 | https://en.wikipedia.org/wiki/The_Staff_of_Karnath ; RG56 p. 51 |
| DAVE AND BOB THOMAS | Infobox designer "Dave and Bob Thomas": "created and designed by brothers Dave and Bob Thomas" | https://en.wikipedia.org/wiki/The_Staff_of_Karnath ; RG56 |
| CODE BY DAVE THOMAS / GRAPHICS BY BOB THOMAS | "The game was programmed by Dave and the graphics were designed by Bob" | https://en.wikipedia.org/wiki/The_Staff_of_Karnath ; RG56 p. 51 |
| ASHBY COMPUTERS AND GRAPHICS | Ultimate's company: "Ashby Computers and Graphics Limited, trading as Ultimate Play the Game" | https://en.wikipedia.org/wiki/Ultimate_Play_the_Game |
| (no music credit) | None documented: no source names a composer | |
| THE FIRST PENDRAGON GAME / SIR ARTHUR PENDRAGON STARS | "the first instalment of the Pendragon series and is the first to feature the aristocrat adventurer Sir Arthur Pendragon" | https://en.wikipedia.org/wiki/The_Staff_of_Karnath |

## Fun facts

| Credit lines | Fact | Source |
|---|---|---|
| INSPIRED BY THE FILM / JACK THE GIANT KILLER | "the visuals and setting of the castle were inspired by the 1962 film Jack the Giant Killer" (Dave Thomas) | https://en.wikipedia.org/wiki/The_Staff_of_Karnath ; RG56 p. 51 |
| THE PLOT WAS INFLUENCED BY / H P LOVECRAFT | "the plot [was] influenced by H. P. Lovecraft's work" ("I was also reading a lot of HP Lovecraft at the time and that had a bearing on the storyline of the game and the title") | https://en.wikipedia.org/wiki/The_Staff_of_Karnath ; RG56 p. 51 |
| THE IDEA: A CASTLE SEEN LIKE / LOOKING INTO A DOLLS HOUSE | Dave Thomas: "I'd had an idea in my mind about creating a pseudo-3D adventure game set in a castle which used a fixed perspective as though you were looking into a doll's house" | RG56 p. 51 ; https://en.wikipedia.org/wiki/The_Staff_of_Karnath |
| IT SOLD OVER 40000 COPIES / AS MANY AS ITS THREE / SEQUELS COMBINED | "selling more than 40,000 copies on its initial release"; "Karnath sold as many copies as the three sequels combined" | RG56 pp. 51-52 ; https://en.wikipedia.org/wiki/The_Staff_of_Karnath |
| THE FIRST ULTIMATE GAME MADE / WITHOUT THE STAMPERS | "the first game to be released by Ultimate without founders Tim and Chris Stamper's direct involvement" (they "left it up to us to complete the game") | https://en.wikipedia.org/wiki/The_Staff_of_Karnath ; RG56 p. 51 |
| ZZAP 64 NAMED IT THE SEVENTH / BEST C64 GAME IN ISSUE ONE | "declared as the seventh best Commodore 64 game in the first issue of Zzap!64 in May 1985" ("It's the Zzap!64 top 64!", issue 1, p. 89) | https://en.wikipedia.org/wiki/The_Staff_of_Karnath (citing http://www.zzap64.co.uk/cgi-bin/displaypage.pl?issue=001&page=089&magazine=zzap, 403 to a script) |
| PERSONAL COMPUTER GAMES GAVE / IT NINE OUT OF TEN | Personal Computer Games 9/10 (issue 15, February 1985, p. 52); "a beautiful game that more than lives up to expectations" | https://en.wikipedia.org/wiki/The_Staff_of_Karnath ; RG56 p. 51 |
| TWO SCHOOLBOYS WON A TROPHY / FOR THE FIRST SOLUTION SENT / TO PERSONAL COMPUTER GAMES | "the trophy that schoolboys Lee Goldstone and Matthew Porter won for submitting the first Staff Of Karnath solution to Personal Computer Games mag" (a photograph's caption) | RG56 p. 51 |
| SEVENTEEN PIECES ARE HIDDEN / BUT YOU NEED ONLY SIXTEEN | Ten pieces lie in the castle's map and seven lie as sprites in rooms: seventeen, for the sixteen the game asks for (read from the code, played in the port) | `re/README.md`, "Hints", "Found on the way" |
| ONLY MENHIR CAN DESTROY IT / ANY OTHER SPELL KILLS YOU | Once sixteen pieces are laid, MENHIR (spell 5) at the staff wins; any other spell at it kills him (played in the port and in the original) | `re/README.md`, "How the game is won"; `test/pentacle.ts` |

## About this port (from this repo)

| Credit lines | Fact | Where |
|---|---|---|
| REBUILT FOR THE BROWSER BY / CHRISTOPHER HICKMAN / WITH CLAUDE ANTHROPIC / RUNSTOP64 | As Chris asked; his name as he gives it (`PORT_CREDITS`, the brackets of the second line left out by the panel's lettering) | `games/shared/ending/credits.ts` |
| THANKS FOR PLAYING | | |

## The places, the names and the music

The game names each room itself, on the line above its message (its own list at $0E2E, the names the pause map shows), so the show adds
no caption. The visitors' names (the knight, the ghoul, the ghost, the spider, the hooded figure, the goblin) are ours: no manual or other
source with names for the creatures was found. The places are where the recorded routes first came into each room (`src/places.ts`), and
the abode's obelisk is where `test/fixtures/abode-obelisk.state` has him. The title is silent, so the tune is the one the castle plays.
