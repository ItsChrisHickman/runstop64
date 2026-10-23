# Sources for the ending's credits

The lines are in `src/ending.ts` (the scenes' `credits`); the shared port lines (`PORT_CREDITS`) are in `games/shared/ending/credits.ts`.
Researched 2026-10-18. Wikipedia's wikitext was read directly; Lemon64 and the ZZAP!64 site answered 403 to a script, so nothing here
rests on them (the ZZAP!64 and other magazine scores are as Wikipedia cites them).

## The game and its makers

| Credit line | What is documented | Source |
|---|---|---|
| BLACKWYCHE / ULTIMATE PLAY THE GAME, 1985 / FOR THE COMMODORE 64 | Action-adventure published by Ultimate Play the Game for the Commodore 64 (C64 only), 1985, Europe | https://en.wikipedia.org/wiki/Blackwyche |
| DESIGNED BY DAVE AND BOB THOMAS | Infobox designer: "Dave and Bob Thomas"; the Pendragon series was created and designed by the brothers | https://en.wikipedia.org/wiki/Blackwyche |
| CODE BY DAVE THOMAS / GRAPHICS BY BOB THOMAS | "The graphics of the game were designed by Bob Thomas, whereas the code was written by Dave Thomas" (Wikipedia, from Dave Thomas in Retro Gamer 56, October 2008, "The Ultimate Adventure of Sir Arthur Pendragon", p. 49) | https://en.wikipedia.org/wiki/Blackwyche ; https://web.archive.org/web/20150925105537/http://scans.bytemaniacos.com/en/retro_gamer/Retro_Gamer_Issue_056.pdf |
| A.C.G. ASHBY COMPUTERS AND GRAPHICS | Ultimate's company name; the title screen's own copyright line reads "COPYRIGHT A.C.G. 1985" (see `build/README.md`, the CCGG copy); the expansion is the one this repo's `src/info.ts` already gives (not re-checked online) | `build/README.md`, `src/info.ts` |
| (no music credit) | None found: Wikipedia names no composer, and no source found credits one. No name is given. | https://en.wikipedia.org/wiki/Blackwyche |
| PENDRAGON 1: THE STAFF OF KARNATH (Dec 1984) | | https://en.wikipedia.org/wiki/The_Staff_of_Karnath |
| PENDRAGON 2: ENTOMBED (1985) | second instalment | https://en.wikipedia.org/wiki/Entombed_(video_game) |
| PENDRAGON 3: BLACKWYCHE (1985) | third instalment, sequel to Entombed | https://en.wikipedia.org/wiki/Blackwyche |
| PENDRAGON 4: DRAGON SKULLE | January 1986 per its own article ("Ultimate Turn Gold", Your Computer, Feb 1986); the Blackwyche article says only "later in 1985", so no year is printed on the line | https://en.wikipedia.org/wiki/Dragon_Skulle |

## Fun facts (all from the Blackwyche article, which cites Dave Thomas in Retro Gamer 56 unless noted)

| Credit lines | Fact | Source |
|---|---|---|
| INSPIRED BY HMS VICTORY, PORTSMOUTH / THE BROTHERS PHOTOGRAPHED THE SHIP | "We'd seen it featured on TV and decided that a ship would be a good place for a third adventure. Me and Bob went down to Portsmouth and had a good look around the ship, taking lots of photographs..." | https://en.wikipedia.org/wiki/Blackwyche |
| BOB WAS A MINISTRY OF DEFENCE TECHNICAL ILLUSTRATOR | Bob Thomas was a trained technical illustrator for the Ministry of Defence, with experience designing interiors for the Royal Navy | https://en.wikipedia.org/wiki/Blackwyche |
| MADE IN THEIR PARENTS ATTIC / ULTIMATE ORDERED A WHOLE SERIES | The brothers' workspace was their parents' attic; shown their progress, Tim and Chris Stamper commissioned an entire series | https://en.wikipedia.org/wiki/Blackwyche |
| PENDRAGON IS THE BLACK PRINCE FROM JACK THE GIANT KILLER | The name "Sir Arthur Pendragon" was copied from the Black Prince Pendragon of Jack the Giant Killer | https://en.wikipedia.org/wiki/Blackwyche |
| COMMODORE USER: BEST OF THE SERIES | Eugene Lacey, Commodore User 25 (Oct 1985, p. 26), "purely addicting", considered Blackwyche the best of the series. (Other scores, not on the screen: CVG 9.5, Your Commodore 6.8, Computer Gamer 5.0, ZZAP!64 53%, issue 8, Dec 1985, p. 36.) | https://en.wikipedia.org/wiki/Blackwyche ; https://archive.org/stream/commodore-user-magazine-25/Commodore_User_Issue_25_1985_Oct#page/n25/mode/2up |
| SIR ARTHUR AND THE BLACKWYCHE ARE IN SEA OF THIEVES BY RARE | The Blackwyche is a wreck on Shipwreck Bay and Arthur's ghost appears in the Tall Tale "The Seabound Soul" | https://en.wikipedia.org/wiki/Blackwyche ; https://www.seaofthieves.com/the-seabound-soul |

## About this copy and this port (from this repo)

| Credit lines | Fact | Where |
|---|---|---|
| A KILOBYTE WAS MISSING FROM THIS COPY / FOUND BY CHECKING EVERY ROOM | The image lacked $F800-$FBFF (rooms $C, the captain's cabin, and $D, the sextant's, and the end of room $17's code); found by a room-by-room check and put back from the CCGG copy | `build/README.md`, `src/mends.ts`, `AGENTS.md` (Lessons) |
| TITLE LINE RESTORED: A.C.G. 1985 | That copy's title said "COPYRIGHT ARMATI 1985"; the original line "COPYRIGHT A.C.G. 1985" is put back | `build/README.md`, `src/info.ts` |
| REBUILT FOR THE BROWSER BY CHRISTOPHER HICKMAN / WITH CLAUDE (ANTHROPIC) / RUNSTOP64 | As Chris asked ("I'll take your credit where due"); his name as he gives it (the two lines are `PORT_CREDITS`) | `games/shared/ending/credits.ts` |
| THANKS FOR PLAYING | | |
