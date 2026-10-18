# Sources for the ending's credits

The lines are in `src/ending.ts` (the scenes' `credits`); the shared port lines (`PORT_CREDITS`) are in `games/shared/native/ending.ts`.
Researched 2026-10-18. Wikipedia's wikitext was read directly (`action=raw`). Lemon64 and the ZZAP!64 site answered 403 to a script, so
nothing here rests on them; archive.org's text for Commodore User 30 has the contents page (Dragon Skulle, page 22) but not the review's
text, so its opinions are not quoted. The main source is the Retro Gamer 56 article that first named the makers (Martyn Carroll, "The
Ultimate Adventure of Sir Arthur Pendragon", October 2008, pp. 48-53), read from the Wayback copy of its scan:
https://web.archive.org/web/20150925105537/http://scans.bytemaniacos.com/en/retro_gamer/Retro_Gamer_Issue_056.pdf (called RG56 below;
page numbers are the magazine's own).

## The game and its makers

| Credit line | What is documented | Source |
|---|---|---|
| DRAGONSKULLE / ULTIMATE PLAY THE GAME, JANUARY 1986 / FOR THE COMMODORE 64 | Action-adventure for the Commodore 64 (C64 only) published by Ultimate Play the Game in January 1986 ("Ultimate Turn Gold", Your Computer, February 1986, p. 15); the title screen's own copyright line says 1985 | https://en.wikipedia.org/wiki/Dragon_Skulle |
| CREATED BY DAVE AND BOB THOMAS | Infobox designers "Dave Thomas, Bob Thomas"; "created by brothers Dave and Bob Thomas" (RG56) | https://en.wikipedia.org/wiki/Dragon_Skulle ; RG56 |
| CODE BY DAVE THOMAS / GRAPHICS BY BOB THOMAS | For the series: "Bob created the graphics while Dave wrote the code" (RG56 p. 51); for Karnath "programmed by Dave and the graphics were designed by Bob" (Wikipedia). No page splits Dragonskulle's own credits any finer | RG56 p. 51 ; https://en.wikipedia.org/wiki/The_Staff_of_Karnath |
| A.C.G. ASHBY COMPUTERS AND GRAPHICS | Ultimate's company: "Ashby Computers and Graphics Limited, trading as Ultimate Play the Game"; the title screen reads "COPYRIGHT A.C.G." | https://en.wikipedia.org/wiki/Ultimate_Play_the_Game ; `build/README.md` |
| (no music credit) | None documented: no source names a composer; the only claim is the Buggy Boy resemblance below | RG56 p. 49 |
| THE FOURTH AND LAST PENDRAGON GAME / STARRING SIR ARTHUR PENDRAGON | "a sequel to The Staff of Karnath, Entombed and Blackwyche, and the final title to feature ... Sir Arthur Pendragon" | https://en.wikipedia.org/wiki/Dragon_Skulle |

## Fun facts

| Credit lines | Fact | Source |
|---|---|---|
| AN ISLAND LOOSELY BASED ON / SKULL ISLAND FROM KING KONG | "transported Sir Arthur to a deadly island loosely based on Skull Island from King Kong" | RG56 p. 52 |
| THE KARNATH ENGINE WAS RECODED FOR / ENTOMBED THEN USED IN THIS GAME TOO | Dave Thomas: "Entombed took the longest to create as I decided to re-code the original Karnath engine to allow for a much bigger area to explore. This was subsequently used in Blackwyche and Dragonskulle." | RG56 p. 51 |
| ULTIMATE ALLOWED NO CREDITS SO / DAVE SNEAKED THEIR INITIALS IN | Dave Thomas: "The Stampers didn't allow anyone to get credits on any of the original games they produced ... It did become a source of frustration later on in the series, hence why I sneaked those initials onto the last game." | RG56 p. 51 |
| THE LAST SCREEN IS SIGNED / DT AND RET 1985 | Completing it shows "This concludes the Pendragon adventure series, we hope you have enjoyed playing them, DT and RET 1985"; the initials were matched to Dave and Bob Thomas through Buggy Boy. Checked in the game itself: its final screen (rows 3 to 23) reads CONGRATULATIONS / YOU HAVE COMPLETED DRAGONSKULLE / THIS CONCLUDES THE PENDRAGON ADVENTURE SERIES / WE HOPE YOU HAVE ENJOYED PLAYING THEM / D T AND R E T 1985 (read from the screen of the port after the skull's last hit) | RG56 p. 49 ; the game |
| THE THEME TUNE SOUNDS LIKE BUGGY BOY / ON C64 WHICH DAVE AND BOB ALSO MADE | Frank Gasking (Games That Weren't 64) noticed that the C64 Buggy Boy's music sounded like the Dragonskulle theme; Buggy Boy was programmed by Dave Thomas with graphics by Robert (Bob) Thomas | RG56 p. 49 |
| IT GOT DREADFUL REVIEWS BUT / THE STAMPERS AND THE BROTHERS BOTH / THOUGHT IT THE BEST OF THE FOUR | Dave Thomas: "Dragonskulle in particular had dreadful reviews, which was a big surprise to all of us as both the Stampers and ourselves thought this was the best of the four adventures." (For the scores: ZZAP!64 53%, issue 11, March 1986, p. 37; Your Commodore 6/10; as Wikipedia cites them.) | RG56 p. 52 ; https://en.wikipedia.org/wiki/Dragon_Skulle |
| IT REACHED NUMBER 10 IN THE UK CHART / IN FEBRUARY 1986 | "appeared at number 10 in the weekly Gallup/Microscope charts published in February 1986" | https://en.wikipedia.org/wiki/Dragon_Skulle (citing Popular Computing Weekly, issue 6, 6 February 1986, p. 35) |

## About this copy and this port (from this repo)

| Credit lines | Fact | Where |
|---|---|---|
| THIS COPY SAID A.C.G. 1001 / THE CRACKERS NAME IN THE YEAR / A.C.G. 1985 IS PUT BACK | The copy that runs on the probe is the "1001" crack; its title said "COPYRIGHT A.C.G. 1001" and the original line "COPYRIGHT A.C.G. 1985" is put back | `build/README.md`, `re/README.md` section 8 |
| REBUILT FOR THE BROWSER BY / CHRISTOPHER HICKMAN / WITH CLAUDE (ANTHROPIC) / RUNSTOP64 | As Chris asked; his name as he gives it (`PORT_CREDITS`) | `games/shared/native/ending.ts` |
| THANKS FOR PLAYING | | |

## The captions and the names

The game and its map name no place; the captions are plain names for what `re/README.md` calls the places (the beach, the shovel's room,
the caves, the river, the dragons' screens, the graves, the room of the falling rocks, the eyes, the lake, the gas, the skull). The
parade's names (the ant, the wizard, the floating skull, the dragon, the eye, the gas, the skull of souls) are ours too: no manual or
other source with names for the creatures was found. "Skull of Souls" is the Wikipedia article's name for what must be destroyed
(the info sheet's "Crystal Skull of Souls" is this repo's own).
