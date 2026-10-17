/**
 * The info card (src/info.ts): it has what the shell needs, credits the people the original's credits page and World of
 * Spectrum name (and nobody else), says what was done in two or three short sentences, and the game is not in the registry yet.
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
check('it says: ZX Spectrum only, rebuilt from the original program, checked frame for frame, the Spectrum\'s own colours, the 128K version\'s music, the shared front end',
  description !== null && ['ZX Spectrum', 'rebuilt from the original program', 'frame for frame', 'own colours', '128K version\'s music', 'shared front end'].every((s) => description[0].includes(s)));
check('it is not in the registry yet', !GAMES.some((g) => g.id === 'moley'));
finish();
