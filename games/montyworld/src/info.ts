// What the shell's info sheet says about Do Svidaniya Monty (shown by games/shell.ts, from the registry's `load`). Data only; the game's code is main.ts.

// The cover: Monty running for it with his suitcase, 480 px wide (twice the sheet's 240 for sharp screens), WebP.
import type { GameInfo } from '../../registry';
import coverUrl from './cover.webp?url';

export const info: GameInfo = {
  title: 'Do Svidaniya Monty',
  cover: { src: coverUrl, alt: 'Do Svidaniya Monty: Monty Mole in a fur hat runs with his suitcase from the KGB, past Moscow, the Trans-Siberian, the Great Wall, Mount Fuji, Machu Picchu and Rio', width: 480, height: 716 },
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><strong>Do Svidaniya Monty: Christopher Hickman</strong></p>
    <p>Made after <a href="https://en.wikipedia.org/wiki/Monty_on_the_Run">Monty on the Run</a> (1985), and with thanks to the people who made it:</p>
    <ul>
      <li>Original game: Peter Harrap</li>
      <li>Graphics: Mark Rodgers</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a>, played from his SID file by his own player code</li>
      <li>Commodore 64 version: Micro Projects Ltd &mdash; Anthony Clarke and Jason Perkins</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1985</li>
    </ul>
    <p>Do Svidaniya Monty is a new <a href="https://en.wikipedia.org/wiki/Monty_Mole">Monty Mole</a> game, made in 2026 with the
    engine, tiles, sprites and music of Monty on the Run, and it
    is the whole trip: Moscow (escalators, falling icicles, Mole Crushers, a turnstile, the Kremlin guard and a fur hat), Siberia (the Trans-Siberian's roofs with tunnel mouths sweeping them, a frozen forest, a coal mine with a cart and a dark shaft, Lake Baikal's cracking ice and a border village), China, Japan, the Pacific, the Andes and Rio, eighty rooms in all: the Great Wall and its watchtower, a hutong with a string of firecrackers going off in turn, a market at New Year with a dragon winding through it, the Forbidden City's gate that lets him by in a rice hat, the palace roofs, the willow pattern garden with its three crouching figures and stepping stones, and a junk on the river, then Japan: a fishing harbour, Tokyo's neon streets and rooftops, a pachinko parlour, the crossing, a bullet-train platform swept by trains on a timing, Mount Fuji's pilgrim trail, a temple garden with its koi pond, the castle with its sliding paper doors and its guard who lets him by in a ninja hood, a hidden room that is a small homage to The Last Ninja, and the port, then the Pacific: a cargo ship's engine room and decks, Honolulu's harbour, Waikiki with its snorkel shop, a luau whose torches take turns, reefs to swim through, Molokai's old fishponds, Lahaina's harbour, the Road to Hana with its one-lane bridges, Hana's black sand, Kona's coffee farm, Mauna Kea's volcano with lava rising behind him, Hilo's airport and a yellow mail biplane, then the flight over the Pacific through gulls and storms with Viktor on his tail, then the Andes and the Amazon: a parachute drop through the mountains past condors and updrafts, Machu Picchu's terraces with boulders rolling down them and llamas that wink, a mountain village market with a chullo, a cave in the cloud, an Inca tunnel, the cloud forest, a riverboat whose captain lets him by in a local's hat, and a river crossed on swinging vines, then Rio: Christ the Redeemer on Corcovado with the Tijuca forest at his foot, the hillside's coloured houses, the Lapa arches with their tram, a churrascaria whose gaucho waiters swing their skewers on a timing, the carnival's street with its drummers and dancers, the parade's floats that carry him across the canal, the Sambadrome, where a feathered headdress waits and the float crew's crank works the lever that brings a float's head down on Viktor, and the beach, where the game ends with an acai bowl under the Redeemer. Intermole has found Monty on his island of Montos, Europe is no longer safe, and the KGB have sent Viktor Vole after him; he runs east, out of their reach, the long way round, to Rio, and retires there for good (the reward show after the ending goes once round the world again).</p>
    <p>Controls: arrows or WASD move &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title &middot;
    P or Esc pauses: items found, and a map; pick a room you've visited and press Enter to travel there &middot;
    M music or sound effects &middot; V authentic pixel steps &middot; gamepad Start pauses.</p>
    <p>Changes from Monty on the Run (the <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/montyworld/QOL.md">full log</a>):
    pause screen with map and travel &middot; autosave on every room &middot; EASY (on unless you switch to HARD with E on the pause screen): unlimited lives and continues, and no lives to count; HARD: five lives, as Monty on the Run.
    In both: a death never starts Monty again into the same death, and item hints.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">runstop64</a> &middot; music from the
    <a href="https://www.hvsc.c64.org/">High Voltage SID Collection</a></p>
  `,
};
