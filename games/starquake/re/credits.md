# Starquake: the ending's credits, and where each line comes from

The ENHANCED ending (`src/ending.ts`, `src/ending-scenes.ts`, the show in `games/shared/ending/show.ts`) follows the game's own
ending (the core drawn and its framed message, which stays as it was) with a montage whose credits type on in the order of Super
Mario World's: the makers, then true facts about the game, then the port (`PORT_CREDITS` in `games/shared/ending/credits.ts`).
Every line below was checked against the source next to it (read 2026-10-18). Nothing is invented. Lines are upper case and at most
38 letters, in the game's own lettering, in the screen's last text row (y 192 to 199), which the game never draws in.

Sources: **Wikipedia** = https://en.wikipedia.org/wiki/Starquake_(video_game) (wikitext, `action=raw`); **C64-Wiki** =
https://www.c64-wiki.com/wiki/Starquake; **CSDb** = https://csdb.dk/sid/?id=1906; **ZZAP!64 14** = ZZAP!64 issue 14, June 1986, pp.
17-19 (full text https://archive.org/download/zzap64-magazine-014/ , the file `*_djvu.txt`; the scan's text is rough, the words quoted
here are the ones it reads clearly); **the loading picture** = the original's loading screen, which names Nick Strange, Stephen Crow
and Bubble Bus (`games/starquake/build/README.md`).

## The makers

| Line shown | Source |
|---|---|
| STARQUAKE, BUBBLE BUS SOFTWARE, 1985 | Wikipedia: "written by Stephen Crow for the ZX Spectrum and published by Bubble Bus Software in 1985"; ported to the Commodore 64 "in 1985". |
| WRITTEN BY STEPHEN CROW | Wikipedia (infobox: programmer and designer Stephen Crow). |
| C64 VERSION BY NICK STRANGE | The loading picture; Lemon64 and GB64 give Nick Strange as the conversion's programmer. |
| MUSIC BY STEPHEN CROW | C64-Wiki (Music: Stephen Crow); CSDb lists the SID's author as "Steve Crow", 1985 Bubble Bus. |

## The true facts

| Line(s) shown | Source |
|---|---|
| BLOB IS A BIO-LOGICALLY OPERATED / BEING: HIS MISSION, THE CORE OF AN / UNSTABLE ROGUE PLANET, TO BE / REPAIRED BEFORE IT IMPLODES | Wikipedia, Plot: "BLOB (Bio-Logically Operated Being), whose mission is to penetrate the unstable core of a rogue planet ... If the core is not repaired within the set time limit, it will implode". ZZAP!64 14 spells it out the same way ("BLOB - a Bio-Logically Operated Being"). |
| 512 SCREENS, EACH WITH ITS OWN LOOK | Wikipedia: "The game features 512 screens"; C64-Wiki: "each of the 512 caverns has its own unique look". |
| NINE ELEMENTS TO REPLACE IN THE CORE / WHICH, AND WHERE THE THINGS ARE, / IS RANDOM EACH GAME | Wikipedia: "The placement of the objects, and the identities of those needed to fix the core are randomized at the start of the game ... There are nine core elements to replace". |
| FIFTEEN TELEPORTS, EACH WITH ITS / OWN CODE, CONNECT THE PLANET | C64-Wiki: "There are altogether fifteen teleports scattered over the area which are connected to each other"; Wikipedia: teleport booths "each with its own destination code". (The game has 15: `TELEPORTS` in `src/map.ts`.) |
| ON A HOVER PAD BLOB CANNOT PICK UP / THINGS: HE MOUNTS AT DOCKS ONLY | Wikipedia: "Hover platforms can be used to fly, but prevent BLOB from picking up items. BLOB can only mount and dismount hover platforms at docking stations." |
| ZZAP!64: ONE OF THE MOST PLAYABLE / AND ABSORBING GAMES OF ITS TYPE | ZZAP!64 14, p. 17: "Starquake is neat - one of the most playable and absorbing games of its type, and certainly worthy of any arcade adventurers time and money." |
| ZZAP!64: THE HEROES ALL DECLINED, / CERTAIN DEATH AND NO MORE CHAT SHOW / APPEARANCES. THAT LEFT BLOB | ZZAP!64 14, p. 17: "Heroes are not stupid and all of them realised that this mission would mean certain death and no more chat show appearances. So they all declined. This left BLOB". |
| THE SPECTRUM GAME WON A CRASH SMASH / AT 96 PER CENT | Wikipedia, Reception: Crash 96%, "Crash Smash" (for the ZX Spectrum version). |
| YOUR SINCLAIR RANKED IT 27TH IN ITS / TOP 100 GAMES OF ALL TIME | Wikipedia: "ranked 27th in the Your Sinclair Official Top 100 Games of All Time". |
| RETRO GAMER PUT IT 10TH IN ITS TOP 25 / SPECTRUM GAMES | Wikipedia: "10th in Retro Gamer magazine's 'Top 25: Spectrum Games'". |

Checked and not used: C+VG Game of the Month (Wikipedia); the infinite-lives cheat Your Sinclair printed that removed the secret
passages (Wikipedia); the game's own ending text, which stays as it was.

## The port

`PORT_CREDITS` (`games/shared/ending/credits.ts`), the same in every game, last: REBUILT FOR THE BROWSER BY / CHRISTOPHER HICKMAN /
WITH CLAUDE (ANTHROPIC) / RUNSTOP64.

## The creatures' names (the visitors)

The game names none of its creatures (it draws a kind's frames into an enemy's sprite: kinds 0-14). The names under them
(`CAST` in `src/ending-scenes.ts`) are plain descriptions of the pictures. Each is the game's own sprite and its own frames,
recorded from the engine in a room where one of the kind is about, going right; BLOB last, walking (his body, the yellow layer and
his eyes, as the game draws him).
