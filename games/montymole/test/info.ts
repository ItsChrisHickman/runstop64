/**
 * The info card (src/info.ts): it has what the shell needs, credits the people the sources in re/credits.md name (and nobody else), says what was done in two or three short
 * sentences, gives the controls and the changes, and the game is in the registry.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/info.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { GAMES } from '../../registry';
import { info } from '../src/info';

const text = info.html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
check('the card has a title, a progress line and its text', info.title === 'Wanted: Monty Mole' && info.progress.length > 0 && info.html.length > 0);
for (const name of ['Peter M. Harrap', 'Ian Stewart', 'David Bracher', 'Gremlin Graphics', 'Colonel Bogey', 'Abide with Me', 'Eventide', '1984']) {
  check(`credits: ${name}`, text.includes(name));
}
for (const link of ['https://en.wikipedia.org/wiki/Wanted:_Monty_Mole', 'https://en.wikipedia.org/wiki/Gremlin_Interactive', 'https://en.wikipedia.org/wiki/Colonel_Bogey_March', 'https://en.wikipedia.org/wiki/Abide_with_Me']) {
  check(`a Wikipedia link: ${link}`, info.html.includes(`href="${link}"`));
}
const description = /<p>This is a custom edition[^<]*<\/p>/.exec(info.html);
const sentences = description === null ? [] : description[0].replace(/<[^>]+>/g, '').split(/(?<=\.)\s+/).filter((s) => s.length > 0);
check(`the description is two or three short sentences (${sentences.length})`, sentences.length >= 2 && sentences.length <= 3 && sentences.every((s) => s.length < 220));
check('it says: ZX Spectrum only, rebuilt from the original program, beeper sound, no clash',
  description !== null && ['ZX Spectrum', 'rebuilt from the original program', 'beeper', 'own colours', 'colour clash'].every((s) => description[0].includes(s)));
check('it is in the registry, as the directory lists it', GAMES.some((g) => g.id === 'montymole' && g.name === 'WANTED MONTY MOLE'));
check('it gives the controls (arrows, WASD, Space, Z, X, gamepad, pause, mute) and the changes, with the log', ['arrows or WASD', 'Space jumps', 'Z, X', 'gamepad', 'P or Esc pauses', 'M mutes', 'Changes from the original', 'QOL.md', 'ENHANCED'].every((s) => info.html.includes(s)));
check('it names no original key', !/Kempston|Q up|A down|O left|P right/.test(text));
finish();
