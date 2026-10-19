# Sources for the ending's credits

The lines are in `src/ending.ts` (the scenes' `credits`); the shared port lines (`PORT_CREDITS`) are in `games/shared/native/ending.ts`.
Researched 2026-10-18. Wikipedia's wikitext was read directly (`action=raw`); the ZZAP!64 issue 4 scan's text was read from archive.org
(the OCR of its page 18-19 review). Lemon64 and the ZZAP!64 site were not used. The Your Commodore and Your 64 scores and quotes are as
Wikipedia gives them (their scans were not read). The composer is Rob Hubbard: the Wikipedia article's infobox and text say so (the
category list also names Ben Daglish, which no text supports, so he is not credited).

## The game and its makers

| Credit line | What is documented | Source |
|---|---|---|
| THING ON A SPRING / GREMLIN GRAPHICS, 1985 / FOR THE COMMODORE 64 AND AMSTRAD CPC | Side-scrolling puzzle-platform game released in 1985 for the Amstrad CPC and Commodore 64 by Gremlin Graphics (Europe July 1985) | https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| WRITTEN BY JASON PERKINS / AND ANTHONY CLARKE | "The game was written by Jason Perkins and Anthony Clarke with graphics by Mark Rogers" (infobox: programmers Jason Perkins and Anthony Clarke) | https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| GRAPHICS BY MARK ROGERS | the same (infobox: artist Mark Rogers) | https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| MUSIC BY ROB HUBBARD / THE FIRST GAME TUNE HE EVER MADE | "The musical score was the first videogame tune ever composed by Rob Hubbard" (Wikipedia, citing his interview at karsmakers.nl); the Rob Hubbard article: "His first theme for a game was Thing on a Spring" | https://en.wikipedia.org/wiki/Thing_on_a_Spring ; https://en.wikipedia.org/wiki/Rob_Hubbard ; http://www.karsmakers.nl/metal-e-zine/robb.htm |
| THING LOOKS LIKE ZEBEDEE FROM / THE MAGIC ROUNDABOUT | "The player controls a character resembling Zebedee from The Magic Roundabout through a toy factory" | https://en.wikipedia.org/wiki/Thing_on_a_Spring |

## Fun facts

| Credit lines | Fact | Source |
|---|---|---|
| NINE JIGSAW PIECES TO FIND / FIVE SWITCHES TO WORK THE FACTORY / FOUR LEVELS AND SIXTEEN ROOMS | ZZAP!64 issue 4 (August 1985) review: Thing must collect nine pieces of a jigsaw puzzle; "five switches" activate certain functions (escalators, the lift); "The factory is composed of four levels", "The sixteen rooms each contain..." | https://archive.org/details/ZZap64Issue0041985Aug (text, pp. 18-19) |
| ZZAP 64, AUGUST 1985: 93 PERCENT / AND A SIZZLER | Overall 93% in issue 4, earning a Sizzler (the scan's text shows "Overall 93%"; the Sizzler is Wikipedia's) | https://archive.org/details/ZZap64Issue0041985Aug ; https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| THE SOUND IS UNBELIEVABLE, WORDS FAIL / SAID JULIAN RIGNALL | Julian Rignall in ZZAP!64: "The sound is unbelievable, I won't describe it but just wait until you hear it; words fail" (read in the scan; Wikipedia gives the same quote) | https://archive.org/details/ZZap64Issue0041985Aug ; https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| THING BECAME A REGULAR IN THE / MARGINS OF ZZAP 64, WITH ROCKFORD | "Along with Rockford from Boulder Dash, the Thing on a Spring character became a regular graphic element printed in the margins of Zzap!64" | https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| YOUR 64: THE SCREENS ARE VERY BASIC / BUT STILL GREAT FUN | Your 64 (issue 13, September 1985) "found the game's screens to be 'very basic' but it was still 'great fun'" (3 stars out of 5) | https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| THE SEQUEL, THING BOUNCES BACK, / CAME IN 1987 | "Thing Bounces Back was released as a sequel in 1987, also by Gremlin" | https://en.wikipedia.org/wiki/Thing_on_a_Spring |
| GREMLIN GRAPHICS WAS FOUNDED IN 1984 / IN SHEFFIELD, BY IAN STEWART / AND KEVIN NORBURN | The company, "originally a computer store called Just Micro, was established as a software house in 1984 with the name Gremlin Graphics Software Ltd by Ian Stewart and Kevin Norburn", based in Sheffield | https://en.wikipedia.org/wiki/Gremlin_Interactive |

## About this copy and this port (from this repo)

| Credit lines | Fact | Where |
|---|---|---|
| THE ONLY COPIES HAD CRACKERS NAMES / IN THE SCROLLER AND HIGH SCORES | The surviving copies' title scroller and high scores carry crackers' names; the team's credits are put in their place | `build/README.md`, `src/info.ts`, `QOL.md` ("Title screen text") |
| REBUILT FOR THE BROWSER BY CHRISTOPHER HICKMAN / WITH CLAUDE (ANTHROPIC) / RUNSTOP64 | As Chris asked; his name as he gives it (the lines are `PORT_CREDITS`) | `games/shared/native/ending.ts` |
| THANKS FOR PLAYING | | |

## The places and the cast

The game names no room, so no scene is captioned (its panel has no message line). The scenes are screens of the factory entered the game's
own way; what Thing does in each is a way found by Go-Explore (`re/ways.json`, `re/ways.ts`) checked to replay from the show's own start.
The parade's names are plain and ours (THE SAUCER, THE PROPELLER, THE CRYSTAL, THE ROBOT, THE OIL CAN, THE JIGSAW PIECE, THING): the game
names none of its creatures; "Thing" is the game's title and its name for him (ZZAP!64: "a brand new computer star who goes by the name of
Thing").
