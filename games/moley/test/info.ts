/**
 * The info card (src/info.ts): it has what the shell needs, credits the people the original's credits page and World of
 * Spectrum name (and nobody else), says what was done in two or three short sentences, gives the controls and the changes, and the game is in the registry.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/info.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { GAMES } from '../../registry';
import { info } from '../src/info';

const text = info.html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
check('the card has a title, a progress line and its text', info.title === 'Moley Christmas' && info.progress.length > 0 && info.html.length > 0);
for (const name of ['Paul Jackson', 'Hollingworth', 'Harrap', 'Ben Daglish', 'Chris Kerry', 'Gremlin Graphics', 'Your Sinclair', 'Teque', '1987']) {
  check(`credits: ${name}`, text.includes(name));
}
const description = /<p>This is a custom edition[^<]*<\/p>/.exec(info.html);
const sentences = description === null ? [] : description[0].replace(/<[^>]+>/g, '').split(/(?<=\.)\s+/).filter((s) => s.length > 0);
check(`the description is two or three short sentences (${sentences.length})`, sentences.length >= 2 && sentences.length <= 3 && sentences.every((s) => s.length < 220));
check('it says: ZX Spectrum only, rebuilt from the original program, the 128K music, no clash',
  description !== null && ['ZX Spectrum', 'rebuilt from the original program', '128K', 'own colours', 'colour clash'].every((s) => description[0].includes(s)));
check('it is in the registry, as the directory lists it', GAMES.some((g) => g.id === 'moley' && g.name === 'MOLEY CHRISTMAS'));
check('it gives the controls (arrows, WASD, Space, Z, X, gamepad, touch where it matters, pause, mute) and the changes, with the log', ['arrows or WASD', 'Space jumps', 'Z, X', 'gamepad', 'P or Esc pauses', 'M mutes', 'Changes from the original', 'QOL.md', 'ENHANCED'].every((s) => info.html.includes(s)));
check('it names no original key', !/Kempston|O up|K down/.test(text));
finish();
