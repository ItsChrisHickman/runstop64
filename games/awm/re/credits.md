# Auf Wiedersehen Monty: the ending's credits, and where each line comes from

The ENHANCED ending (`src/ending.ts`, `src/ending-scenes.ts`, the show in `games/shared/ending/show.ts`) types credits on over its
montage, in the order of Super Mario World's: the makers, then true facts about the game, then the port (`PORT_CREDITS` in
`games/shared/ending/credits.ts`). Every line below was checked against the source next to it (read 2026-10-18). Nothing is
invented. Lines are upper case and at most 31 letters, in the game's own lettering (no apostrophes, no percent signs; a line
of text goes in the empty row under the room, between the side columns, and in the flight's sky screen one row lower). The lines
are in `SCENES` (`src/ending-scenes.ts`), a few to a place, in this order.

Sources: **Wikipedia** = https://en.wikipedia.org/wiki/Auf_Wiedersehen_Monty (wikitext, `action=raw`); **the title scroller** = the
text the original's title screen scrolls (decoded from the original's data, `src/data/title-data.ts` `SCROLL_TEXT_HEX`, `re/README.md`
$44B3): "AUF WIEDERSEHEN MONTY  BY PETE HARRAP  SHAUN HOLLINGWORTH  CHRIS KERRY  COLIN DOOLEY  GREG HOLMES  GRAPHICS BY STEVE KERRY AND
T LLOYD  MUSIC BY ROBB AND BENN"; **ZZAP!64 26** = ZZAP!64 issue 26, June 1987, the review on p. 32 (full text
https://archive.org/download/Zzap64_Magazine_Issue_26/Zzap64_Magazine_Issue_26_djvu.txt); **C64-Wiki** =
https://www.c64-wiki.com/wiki/Auf_Wiedersehen_Monty.

## The makers

| Line shown | Source |
|---|---|
| A GREMLIN GRAPHICS GAME, 1987 | Wikipedia: publisher Gremlin Graphics, released 1987. |
| WRITTEN BY PETE HARRAP / AND SHAUN HOLLINGWORTH | Wikipedia: "It was written by Peter Harrap and Shaun Hollingworth with music by Rob Hubbard and Ben Daglish." The title scroller: "BY PETE HARRAP, SHAUN HOLLINGWORTH ...". |
| ALSO CREDITED: CHRIS KERRY, / COLIN DOOLEY AND GREG HOLMES | The title scroller names them after the first two in the same list. |
| GRAPHICS: STEVE KERRY, T LLOYD | The title scroller: "GRAPHICS BY STEVE KERRY AND T LLOYD". |
| MUSIC BY ROB HUBBARD / AND BEN DAGLISH | Wikipedia (infobox composers); the title scroller: "MUSIC BY ROBB AND BENN". |

## The true facts

| Line(s) shown | Source |
|---|---|
| THE FOURTH MONTY MOLE GAME | Wikipedia: "it is the fourth game in the Monty Mole series". |
| MONTY TRAVELS EUROPE FOR MONEY / TO BUY MONTOS, A GREEK ISLAND | Wikipedia: "The player controls Monty as he travels around Europe collecting money in order to buy a Greek island - Montos, where he can safely retire" (Commodore User 44, May 1987); ZZAP!64 26: "in search of enough money to purchase Montos, a secluded Greek island". |
| ITEMS SUIT EACH COUNTRY, LIKE / BERETS IN FRANCE | Wikipedia: miscellaneous objects "are often particular to the country Monty is visiting (such as berets in France)". The beret is item 53 of the item list, in room $09, Le Eiffel Tower, France (item type 31: the blue beret in `games/awm/src/data`). |
| A RECORD IN LUXEMBOURG MAKES / MONTY BREAKDANCE TO THE TITLE / MUSIC. HUBBARD VISITED GREMLIN / FOR TWO DAYS TO WORK ON THE / TITLE TUNE WITH BEN DAGLISH | Wikipedia: "a record in Luxembourg that when collected makes Monty breakdance to the game's title music" (ZZAP!64 26 also mentions "a little bit of breakdancing"). C64-Wiki: "Rob Hubbard visited Gremlin Graphics for two days to collaborate with Ben Daglish on the title theme." (the record is item 93, type 8, room $13: the game's walk-in state $11 plays the title tune on, `src/game.ts`). |
| A CAR DROPS INTO ONE OF TWO / PLACES AS HE ENTERS DUSSELDORF | Wikipedia: "a car being dropped in one of two places on entering a screen representing Düsseldorf in West Germany" (room $0C is DUSSELDORF). |
| HUBBARD ALSO WROTE A DOZEN / ANTHEMS FOR THE BORDERS | C64-Wiki: "Hubbard also knocked out a dozen national anthems, which play whenever Monty crosses a country border." (the room tunes, `ROOM_TUNES` in `src/sound.ts`). |
| A CHEFS HAT IN SWEDEN NODS TO / THE SWEDISH CHEF OF THE MUPPETS | Wikipedia: "a chef's hat found in Sweden (a reference to the Swedish Chef of Muppets fame ...)" (item 131, type 24, room $00, SWEDEN). |
| WINE AND BEER MAKE MONTY DRUNK | Wikipedia: "Bottles of wine or a glass of beer in West Germany cause Monty to briefly become drunk". |
| AUF WIEDERSEHEN IS GERMAN FOR / GOODBYE | Wikipedia: "(German for "Goodbye Monty")". |
| IN THE SKY HE CHASES A PLANE / FLOWN BY AN INTERMOLE AGENT: / TOUCHING ITS BACK WITH THE / PROPELLER DESTROYS IT (ZZAP!64) | ZZAP!64 26: "Monty appears in a biplane and proceeds to follow another similar plane piloted by an Intermole agent. Touching the back of the enemy plane with the propeller destroys it, earning Monty bonus points." |
| DROP ITEMS OFF IN THE RIGHT / PLACES FOR MONEY: A CAR ENTERED / IN A GRAND PRIX (ZZAP!64) | ZZAP!64 26: money comes "by picking up items and dropping them off in the correct places. For example, the Mona Lisa has to be stolen, a Swiss bank account opened and a car entered into a Grand Prix." (In the montage he hands a steering wheel over in room $2C, MONACO: item type 12, delivery table `DELIVERIES` in `src/game.ts`.) |
| CRASH READERS VOTED IT BEST / PLATFORM GAME OF THE YEAR | Wikipedia, Reception: "The game won the award for best platform game of the year according to the readers of Crash magazine" (CRASH 51, Readers' Awards, http://www.crashonline.org.uk/51/awards.htm). |
| YOUR SINCLAIR READERS PUT IT AT / NUMBER 57 IN THEIR TOP 100 | Wikipedia: "voted number 57 in the Your Sinclair Readers' Top 100 Games of All Time" (Your Sinclair, September 1993). |
| MOLEY CHRISTMAS CAME LATER / IN THE SAME YEAR | Wikipedia, Sequels: "Moley Christmas was released later in the same year." |

Checked and not used: the Wikipedia page's Your Sinclair "Megagame" (issue 18, June 1987); ZZAP!64 26's 46% verdict and its seven
lives (the game here starts with six); Peter Harrap's later work (Krisalis, Eurogamer 2011) already in Monty on the Run's credits.
The Hubbard/Daglish split of the in-game tunes is not documented beyond what C64-Wiki says, so none is claimed.

## The port

`PORT_CREDITS` (`games/shared/ending/credits.ts`), the same in every game, last: REBUILT FOR THE BROWSER BY / CHRISTOPHER HICKMAN /
WITH CLAUDE (ANTHROPIC) / RUNSTOP64.

## The creatures' names (the visitors)

None of the game's creatures has a documented name (the original's code numbers their pictures). The names under them (`CAST` in
`src/ending-scenes.ts`) are plain descriptions of what each looks like, but BULL: Wikipedia names the bull's head that attacks in
Spain after the red cape. Each is the game's own sprite and its own frames, recorded from the engine in the room it first appears in
(Monty, last, running).
