# Sources for the ending's credits

The lines are in `src/ending.ts` (`PLAN`); the shared port lines (`PORT_CREDITS`) are in `games/shared/native/ending.ts`.
Researched 2026-10-18. Wikipedia's wikitext was read directly (`action=raw`); World of Spectrum's Your Sinclair text file for the game
was read in full; Spectrum Computing's entry was read. The Your Sinclair issue 25 and 27 scans were not available (archive.org holds
issue 25 as a dark item), so what Wikipedia says they say is credited to Wikipedia. The credits page's own names are the game's
(read from the original's picture: `info.ts`, `build/README.md`). Nothing is from memory.

## The game and its makers

| Credit line | What is documented | Source |
|---|---|---|
| MOLEY CHRISTMAS, 1987 | "Moley Christmas is a platform game released in 1987 for the ZX Spectrum"; WoS: "(C) GREMLIN/YOUR SINCLAIR" | https://en.wikipedia.org/wiki/Moley_Christmas ; https://worldofspectrum.org/pub/sinclair/games-info/m/MoleyChristmas.txt |
| A GREMLIN GRAPHICS GAME FOR / YOUR SINCLAIR READERS | Infobox publisher "Gremlin Graphics/Your Sinclair"; "available exclusively as a covermount cassette for Your Sinclair" | https://en.wikipedia.org/wiki/Moley_Christmas |
| GAME CONCEPT BY PAUL JACKSON | The game's own credits page (concept: Paul Jackson) | `src/info.ts`, `build/README.md` |
| PROGRAM CODE BY S HOLLINGWORTH / AND P HARRAP, WITH CHRIS KERRY | The credits page: program code S. Hollingworth and P. Harrap; infobox and Spectrum Computing list Shaun Hollingworth, Peter (M.) Harrap and Chris Kerry | `src/info.ts` ; https://en.wikipedia.org/wiki/Moley_Christmas ; https://spectrumcomputing.co.uk/entry/3243/ZX-Spectrum/Moley_Christmas |
| GRAPHICS BY P HARRAP | The credits page | `src/info.ts` |
| MUSIC BY BENN DAGLISH, 128K VERSION | The credits page (it spells "Benn"): music, 128K version; the Ben Daglish article | `src/info.ts` ; https://en.wikipedia.org/wiki/Ben_Daglish |
| DEVELOPED BY TEQUE SOFTWARE / DEVELOPMENT FOR GREMLIN GRAPHICS | The game's loader and credits page name Teque Software Development (`re/README.md`: "by Teque Software Development for Gremlin") | `re/README.md`, `src/info.ts` |

## Fun facts

| Credit lines | Fact | Source |
|---|---|---|
| FREE ON YOUR SINCLAIR 25, JANUARY 1988 / ON SMASH TAPE 5 | Spectrum Computing: covertape of Your Sinclair issue 25 ("Smash Tape 5"), the compilation date 1988/Jan (later on issue 94, November 2004); Wikipedia cites Your Sinclair 25, January 1988 | https://spectrumcomputing.co.uk/entry/3243/ZX-Spectrum/Moley_Christmas ; https://en.wikipedia.org/wiki/Moley_Christmas |
| THE FIFTH MONTY MOLE GAME, AFTER / AUF WIEDERSEHEN MONTY | "the fifth game in the Monty Mole series and a sequel to the 1987 video game Auf Wiedersehen Monty" | https://en.wikipedia.org/wiki/Moley_Christmas |
| OVER 100000 COPIES OF YOUR SINCLAIR / WENT OUT WITH MONTY ON THE COVER | Your Sinclair's own text: "we're putting over 100,000 Your Sinclairs out on the streets with Monty on the cover" | https://worldofspectrum.org/pub/sinclair/games-info/m/MoleyChristmas.txt |
| THE GREMLIN PROGRAMMERS MADE THEIR / OWN ESTIMATE OF THE CIRCULATION: / EIGHT CASSETTES, YOUR SINCLAIR SAID | the same text: "the Gremlin programmers made their own estimate of our circulation, so Monty has to pick up how many cassettes to bring to London? Eight. Thanks, lads." | the same file |
| THE LAST SCREEN HAD A MESSAGE: / THE FIRST TO SEND IT WON 15 GAMES / AND SIX MORE EACH WON THREE | "The final screen contained a message to the player. The first person to complete the game and send this message to the Your Sinclair competition address would receive 15 games from the Your Sinclair library. Six runners-up also received three games each" (citing Your Sinclair 25 p. 17 and 27 p. 7) | https://en.wikipedia.org/wiki/Moley_Christmas |
| GAMESTM, 2003: AN ESPECIALLY / POPULAR COVER GAME | GamesTM (issue 13, December 2003) called it an "especially popular" cover game, and a "great example" of publishers using Christmas to market games | https://en.wikipedia.org/wiki/Moley_Christmas |

## About this copy and this port (from this repo)

| Credit lines | Fact | Where |
|---|---|---|
| REBUILT FOR THE BROWSER BY CHRISTOPHER HICKMAN / WITH CLAUDE (ANTHROPIC) / RUNSTOP64 | As Chris asked; his name as he gives it (the lines are `PORT_CREDITS`) | `games/shared/native/ending.ts` |
| THANKS FOR PLAYING | | |

## The places and the cast

The six screens are the game's own rooms 0-5 in order (the Gremlin office, then the plants, the M1 and the offices, ending at the newsagent: the
descriptions in `hints.ts` and Wikipedia's table). Each plays the keys found for it (`re/ending/route.ts`, `src/ending-routes.ts`) by the
test suite's own player (`test/players.ts`: the goals of each screen) on a `SteadyGame`; `test/reward.ts` plays each again and checks it leaves
by its way out alive. The parade's names are plain and ours (THE LAMP, THE WALKER, THE BLOB, THE TAPE REEL, THE CASSETTE, THE CAR, THE GHOST,
THE CHOMPER: what each looks like; `room0.ts` itself calls the first a lamp); the game names none of its creatures. MONTY is the game's own name for him.
The credit lines are drawn where the panel is, which is put away during the show, so nothing is ever under a line.
