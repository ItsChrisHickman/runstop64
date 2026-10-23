# Sources for the ending's credits

The lines are in `src/ending.ts` (the scenes' `credits`); the shared port lines (`PORT_CREDITS`) are in `games/shared/ending/credits.ts`.
Researched 2026-10-18. Wikipedia's wikitext was read directly (`action=raw`); the ZZAP!64 issue 3 scan's text was read from archive.org
(the OCR of its page 22). Lemon64 and the ZZAP!64 site were not used. Retro Gamer 56 (the Dave Thomas interview Wikipedia cites) is
only reachable through a dead scan link, so those facts are as Wikipedia gives them. Nothing is stated that none of these say: no music
credit is given, because the game has no music (see below).

## The game and its makers

| Credit line | What is documented | Source |
|---|---|---|
| ENTOMBED / ULTIMATE PLAY THE GAME, 1985 / FOR THE COMMODORE 64 | Action-adventure published by Ultimate Play the Game for the Commodore 64 (C64 only), 1985, UK and North America | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| CREATED AND DESIGNED BY DAVE AND BOB THOMAS | "created and designed by brothers Dave and Bob Thomas"; infobox designers Dave Thomas and Bob Thomas | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| CODE BY DAVE THOMAS / GRAPHICS BY BOB THOMAS | "As with all games in the Pendragon series, Entombed was programmed by Dave Thomas, whereas the graphics were designed by Bob Thomas" (Wikipedia, from Dave Thomas in Retro Gamer 56, October 2008, pp. 48-53, "The Ultimate Adventure of Sir Arthur Pendragon") | https://en.wikipedia.org/wiki/Entombed_(video_game) ; https://web.archive.org/web/20150925105537/http://scans.bytemaniacos.com/en/retro_gamer/Retro_Gamer_Issue_056.pdf |
| A.C.G. ASHBY COMPUTERS AND GRAPHICS | Ultimate's company name; the title screen's own copyright line reads "COPYRIGHT A.C.G. 1985" (this repo's `src/info.ts`, `build/README.md`); the expansion is the one this repo's other games' info already give (not re-checked online) | `src/info.ts`, `build/README.md` |
| THE SECOND OF THE PENDRAGON GAMES / STARRING SIR ARTHUR PENDRAGON | "the second instalment of the Pendragon series ... a sequel to The Staff of Karnath"; the series protagonist is Sir Arthur Pendragon | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| IN A TOMB UNDER THE GREAT SPHINX / SEVEN FLOORS DEEP | "Pendragon's main objective is to escape the tomb, the Great Sphinx"; "The tomb has seven floors" | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| (no music credit) | The game has no music at all: the title is silent (the title snapshot's SID is touched once, volume 0, and never again in 1,500 frames) and ZZAP!64 says "Great sound effects on whip, and some rooms, but no game music". The show's sound is therefore the places' own effects (`tune: 'effects'`): the whip, the bells | ZZAP!64 issue 3 (July 1985) p. 22, https://archive.org/details/ZZap64Issue0031985Jul |

## Fun facts

| Credit lines | Fact | Source |
|---|---|---|
| TIM AND CHRIS STAMPER OF ULTIMATE / WERE NOT INVOLVED IN ITS MAKING | "with Ultimate founders Tim and Chris Stamper otherwise being uninvolved in development"; the Pendragon series was created by the Thomas brothers "rather than Ultimate founders Tim and Chris Stamper" | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| DAVE THOMAS RECODED THE KARNATH ENGINE / TO ALLOW A MUCH BIGGER AREA / ENTOMBED TOOK THE LONGEST TO CREATE | Dave Thomas, Retro Gamer, March 2008 interview: "Entombed took the longest to create as I decided to re-code the original Karnath engine to allow a much bigger area to explore." | https://en.wikipedia.org/wiki/Entombed_(video_game) (quoting Retro Gamer 56) |
| ZZAP 64 COUNTED 175 SCREENS / PUZZLES WITH LOGICAL AND SOMETIMES / SPECTACULAR SOLUTIONS | Julian Rignall, ZZAP!64 issue 3, July 1985, p. 22: "the total playing area is some 175 screens in size", and "the puzzles in Entombed have logical and sometimes spectacular solutions" (read in the issue's scanned text) | https://archive.org/details/ZZap64Issue0031985Jul |
| ZZAP 64 GAVE IT 93 PERCENT / AND A GOLD MEDAL | ZZAP!64 score 93/100 and a Gold Medal (Game of the Month), as Wikipedia gives them for the same review (issue 3, p. 22; the scan's text shows 93% on that page, the medal is Wikipedia's) | https://en.wikipedia.org/wiki/Entombed_(video_game) ; https://archive.org/details/ZZap64Issue0031985Jul |
| COMPUTER AND VIDEO GAMES CALLED THE / GRAPHICS EXCELLENT AND SAW / A RESEMBLANCE TO INDIANA JONES | CVG issue 44, June 1985, p. 112: "praised the graphics as 'excellent', whilst noting the resemblance to Indiana Jones" (Wikipedia) | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| POPULAR COMPUTING WEEKLY CALLED IT / A MUST FOR ANY ADVENTURERS COLLECTION | John Cook, Popular Computing Weekly, 9 May 1985, p. 18: "definitely a must for any adventurer's collection" (Wikipedia) | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| KILL A CROW AND IT DROPS AN ANKH / THE ANCIENT SYMBOL OF LIFE | "the player must kill crows which will spawn in rooms at various times, and upon its death the crow will drop an Ankh symbol, the ancient Egyptian 'Symbol of Life'" (Wikipedia, citing Computer Gamer 4, July 1985, p. 54) | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| PENDRAGON IS THE BLACK PRINCE / FROM JACK THE GIANT KILLER | Dave Thomas admitted (March 2008 interview) the name "Sir Arthur Pendragon" was copied from the Black Prince Pendragon of the Jack the Giant Killer stories | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| BEFORE THIS, DAVE THOMAS MADE GAMES / FOR THE ATARI 400: WARLOK WON HIM / 5000 POUNDS FROM CALISTO SOFTWARE | "Dave Thomas began his career in 1983 when he began producing games for the Atari 400, including moderate-sellers such as Warlok, which won him 5,000 pounds in a competition from Calisto Software" | https://en.wikipedia.org/wiki/Entombed_(video_game) |

## About this copy and this port (from this repo)

| Credit lines | Fact | Where |
|---|---|---|
| THE ONLY COPIES HAD A CRACKERS NAME / IN THE TITLE: A.C.G. 1985 IS BACK | The surviving copies (the "Vanilia & Florasoft" crack) had a cracker's name in the title's copyright line; the original line is put back | `build/README.md`, `src/info.ts` |
| REBUILT FOR THE BROWSER BY CHRISTOPHER HICKMAN / WITH CLAUDE (ANTHROPIC) / RUNSTOP64 | As Chris asked; his name as he gives it (the lines are `PORT_CREDITS`) | `games/shared/ending/credits.ts` |
| THANKS FOR PLAYING | | |

## The captions and the cast

Captions name the place with our own plain names (the game names no chamber): "CHAMBER 16: THE FIVE BELLS" and so on, the numbers
being those `re/README.md` and `re/hints` use. The visitors' names are plain too (THE MUMMY, THE COBRA, THE SPIDER, THE BIRD, THE
SCORPION, THE LIZARD, THE SPIRIT, THE BOULDER): the game names none of its creatures (the fact line about crows is Wikipedia's; which
sprite is the crow it describes was not established, so the bird of chamber 11 is just the bird).
