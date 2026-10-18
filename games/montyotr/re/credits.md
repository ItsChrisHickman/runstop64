# Monty on the Run: the ending's credits, and where each line comes from

The ENHANCED ending (`src/ending.ts`, `src/ending-scenes.ts`, the show in `games/shared/ending/show.ts`) types credits on over its
montage, in the order of Super Mario World's: the makers, then true facts about the game, then the port (`PORT_CREDITS` in
`games/shared/native/ending.ts`). Every line below was checked against the source next to it (read 2026-10-18). Nothing is
invented. Lines are upper case and at most 38 letters, in the game's own lettering (which has no apostrophe, percent sign or
bracket: 90% is written 90 PER CENT, Devil's Galop DEVILS GALOP). The lines are in `SCENES` (`src/ending-scenes.ts`), a few to a
room, in this order.

## The makers

| Line shown | Source |
|---|---|
| A GREMLIN GRAPHICS GAME, 1985 | Wikipedia, *Monty on the Run* (wikitext, `action=raw`): "created by the software house Gremlin Graphics and released in 1985 for the Commodore 64, ZX Spectrum, Amstrad CPC and Commodore 16" (25 October 1985, the Popular Computing Weekly advert, issue 40, is its reference). https://en.wikipedia.org/wiki/Monty_on_the_Run |
| ORIGINAL GAME BY PETER HARRAP | Same page: "written by Peter Harrap for the ZX Spectrum"; infobox developer: Peter Harrap. |
| C64 VERSION BY MICRO PROJECTS LTD / ANTHONY CLARKE AND JASON PERKINS / GRAPHICS BY MARK RODGERS | Same page, Ports: "The Commodore 64 version was produced by Micro Projects Ltd, joint owned by Anthony Clarke and Jason Perkins, with graphical input by Mark Rodgers and music by Rob Hubbard." |
| MUSIC BY ROB HUBBARD | Same sentence. ZZAP!64 issue 6, October 1985, pp. 16-17 (the review, and an interview with Hubbard): https://archive.org/details/zzap64-magazine-006 (full text: https://archive.org/download/zzap64-magazine-006/ZZap_64_Issue_006_1985_Oct_djvu.txt). |

The same credits are in the game's `src/info.ts`, the scroller of the title (`src/title.ts`) and the original's own scroller.

## The true facts

| Line(s) shown | Source |
|---|---|
| THE THIRD MONTY MOLE GAME | Wikipedia, *Monty on the Run*: "It is the third game in the Monty Mole series." The series, in order: *Wanted: Monty Mole* (1984), *Monty Is Innocent* (1985), *Monty on the Run* (1985): https://en.wikipedia.org/wiki/Wanted:_Monty_Mole (Sequels). |
| PETER HARRAP WROTE THE FIRST GAME, / WANTED: MONTY MOLE, AT 19 IN 1984, / AS A REACTION TO THE BRITISH / MINERS STRIKE: A MOLE STEALING COAL / TO KEEP HIS FAMILY WARM | Eurogamer, Robert Purchese, "Peter Harrap wants new Monty Mole", 13 April 2011: "Harrap created Wanted: Monty Mole when he was 19, in 1984, as a reaction to the British Miners' Strikes. The game involves a mole stealing coal to keep his family warm." Read from the archive copy, https://web.archive.org/web/20110416153059/http://www.eurogamer.net/articles/2011-04-13-peter-harrap-wants-new-monty-mole . Wikipedia, *Wanted: Monty Mole*, agrees: "inspired by the UK miners' strike of 1984-85, and even featured a character based on union leader Arthur Scargill". |
| MONTY ESCAPES FROM HIS HOUSE FOR THE / ENGLISH CHANNEL AND FREEDOM | Wikipedia, *Monty on the Run*, Gameplay: "Monty the mole must escape from his house and head for the English Channel and freedom in Continental Europe." |
| THE MOLE CRUSHERS CAME OVER FROM / WANTED: MONTY MOLE, SAID ZZAP!64 | ZZAP!64 issue 6, p. 16: "hazards like crushers (carried over from Wanted: Monty Mole) which pound up and down". |
| PETER HARRAP: I LIKE A BIT OF A SHOCK | The Eurogamer interview above, of the crushers: "I know some people didn't like the crushers ... I still like that; I like a bit of a shock." |
| ROB HUBBARD SAID THE MAIN TUNE WAS / INSPIRED BY DEVILS GALOP, THE DICK / BARTON RADIO SERIAL THEME | Wikipedia, *Monty on the Run*, Ports: "The main game theme was, according to Hubbard, inspired by 'Devil's Galop', the theme tune to the radio serial Dick Barton." *Devil's Galop*, https://en.wikipedia.org/wiki/Devil%27s_Galop : "a piece of light music composed by Charles Williams. It became famous as the theme tune to the radio serial Dick Barton - Special Agent"; "Excerpts from the piece form part of the opening theme to the video game Monty on the Run." |
| HARDCORE GAMING 101 READERS RATED IT / NUMBER 2 IN WESTERN GAME MUSIC, 2011 | Hardcore Gaming 101, Kurt Kalata, "Best Western Video Game Music of All Time - 2011", 23 December 2011, a reader-voted poll: rank 2, "Monty on the Run, Main Theme, Rob Hubbard", 16 votes (behind Diablo's Tristram). https://web.archive.org/web/20120103183500/http://hardcoregaming101.net/vgm/wvgm2011.htm (also Wikipedia, *Monty on the Run*: "#2 in Hardcore Gaming 101's Top 100 Western Video Game Music of all time"). |
| ZZAP!64 GAVE IT 90 PER CENT IN 1985: / MOLING ABOUT HAS NEVER BEEN SUCH FUN | Wikipedia, *Monty on the Run*, Reception: "a 90% overall rating by the reviewers of Zzap!64" (Rignall and Penn, issue 6, October 1985, pp. 16-17); the verdict box on p. 17 ends "Overall ... Moling about has never been such fun." (OCR of the scan; the score itself is unreadable in it, so the 90 is Wikipedia's). |
| MONTY BOARDS A FERRY TO FRANCE: / AUF WIEDERSEHEN MONTY IS THE NEXT GAME | Wikipedia, *Monty on the Run*, Gameplay: "The final screen sees Monty boarding a ferry to France. This was then the starting point for the follow-up Auf Wiedersehen Monty." |

Checked and not used (the room for lines is small): it entered the Spectrum, Commodore and All-Format charts at number one
(Wikipedia, citing Popular Computing Weekly 45, 7 November 1985); Hubbard wrote or converted music for over 75 games from 1985 to
1989 and his first game theme was *Thing on a Spring* (https://en.wikipedia.org/wiki/Rob_Hubbard); Jaleco's 1987 Famicom Disk System
remake, *Monty's Great Heart-pounding Escape*, keeps only Gremlin's copyright and the familiar theme on its title screen
(Wikipedia, *Monty on the Run*, Ports); Peter Harrap went on to co-found Krisalis Software (Eurogamer, above; Wikipedia has no
article on him). Not used for want of a clean source: the order the freedom kit was chosen in (Crash's tip list is for the
Spectrum's kit, which differs from the C64's).

## The port

`PORT_CREDITS` (`games/shared/native/ending.ts`), the same in every game, last: REBUILT FOR THE BROWSER BY / CHRISTOPHER HICKMAN /
WITH CLAUDE (ANTHROPIC) / RUNSTOP64.

## The creatures' names (the parade)

Almost none of the game's creatures has a documented name (the C64 code numbers them, 8 to 34). The names under them are plain
descriptions of the sprite (`CAST` in `src/ending-scenes.ts`, in the order the journey meets them), but for:

- HAND, MUG and JELLYFISH: ZZAP!64 issue 6, p. 16 lists "floating mugs, wasps, Things on some Springs, hands, blobbies, amoeboids,
  jellyfish" among the game's denizens (OCR: "like floating mugs, wasps, Things on some Springs, hands, blobbies, amoeboids,
  jellyfishes and other characters").
- WASP: the reconstruction's comment where fly spray sees the creature off in room $19 ("fly spray sees off the wasp",
  Dave-Agent/monty-on-the-run, here `items.ts` `applyRoomEffects`); it is the white insect of that room's fourth slot.
- BUBBLE: the same, where taking the teddy bear wakes "the bubble" in room $08 (`items.ts`): the green ball of that room's fourth slot.
- BANNER PLANE: three of the game's sprites that move together in room $23 (types 32-34), a plane towing GOOD LUCK!; parts of one
  creature in the parade.
