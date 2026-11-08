/**
 * The touch name picker and key pacer (games/shared/letters.ts), headless and without the touch controller: which
 * keys a frame of presses gives the game, the cursor going round, RIGHT as a put-in key, LEFT with nothing to rub out,
 * reset, the hint, the letter drawn over the cursor, and the pacer's hold and gap.
 *
 *   node tools/test.mjs games/shared/test/letters.ts
 */
import { BitmapFont, KIT_GLYPHS, Surface } from 'c64kit';
import { drawPending, KeyPacer, NamePicker, type NameSpec } from '../letters';
import { check, finish } from './check';

const SPEC: NameSpec = { alphabet: 'ABC', max: 2, button: { label: 'JUMP', key: 'Space' } };
const UP = 'ArrowUp', DOWN = 'ArrowDown', LEFT = 'ArrowLeft', RIGHT = 'ArrowRight';

/** A picker, and a way to press touch keys for one frame (held ones stay down). */
function makePicker(spec = SPEC) {
  const picker = new NamePicker(spec);
  const down = new Set<string>();
  const frame = (...touch: string[]) => picker.frame({ typed: touch, touchTyped: touch, down });
  frame(); // (the first frame shows the first letter)
  return { picker, down, frame };
}

{
  const fresh = new NamePicker(SPEC);
  check('before any frame there is nothing under the cursor', fresh.pending === null);
  const { picker } = makePicker();
  check('the first frame puts the first letter under the cursor', picker.pending === 'A');
}

{
  const { picker, frame } = makePicker();
  check('UP goes to the next letter', frame(UP).keys.length === 0 && picker.pending === 'B');
  frame(UP); frame(UP);
  check('UP past the last wraps to the first', picker.pending === 'A');
  frame(DOWN);
  check('DOWN from the first wraps to the last', picker.pending === 'C');
}

{
  const { picker, frame } = makePicker();
  check('RIGHT puts the letter in, like the main button', frame(RIGHT).keys.join() === 'A' && picker.letters === 'A' && picker.pending === 'A');
  check('the main button puts the next in', frame('Space').keys.join() === 'A' && picker.letters === 'AA');
  check('a full name leaves nothing under the cursor, and more presses add nothing', picker.pending === null && frame('Space').keys.length === 0 && picker.letters === 'AA');
}

{
  const { picker, frame } = makePicker();
  const none = frame(LEFT);
  check('LEFT with nothing put in sends no DEL and leaves the cursor', none.keys.length === 0 && picker.pending === 'A');
  frame(UP); frame('Space');
  const rub = frame(LEFT);
  check('LEFT rubs out the last letter and puts it back under the cursor', rub.keys.join() === 'Backspace' && picker.letters === '' && picker.pending === 'B');
}

{
  const { picker, frame } = makePicker();
  frame('Space');
  picker.reset();
  check('reset: the name is empty and nothing is under the cursor until the next frame', picker.letters === '' && picker.pending === null);
  frame();
  check('reset: the next frame starts at the first letter again', picker.pending === 'A');
}

{
  const { picker, frame } = makePicker();
  const r = frame('Enter');
  check('RETURN puts the letter under the cursor in first, then goes', r.keys.join() === 'A,Enter' && picker.pending === null);
  const again = frame('Enter');
  check('RETURN with the name full is passed to the game as typed', again.keys.length === 0 && again.typed.join() === 'Enter');
}

{
  const { picker, frame } = makePicker();
  const kb = picker.frame({ typed: [UP, 'Space', 'KeyQ'], touchTyped: [], down: new Set() });
  check('the keyboard\'s keys pass the picker by, as typed', kb.keys.length === 0 && kb.typed.join() === `${UP},Space,KeyQ` && picker.pending === 'A');
  const mixed = picker.frame({ typed: ['Space', 'Space'], touchTyped: ['Space'], down: new Set() });
  check('a keyboard Space and a touch Space in one frame: only the touch one is the picker\'s', mixed.keys.join() === 'A' && mixed.typed.join() === 'Space');
  frame();
}

{
  const { picker, down, frame } = makePicker();
  down.add(UP);
  frame(UP);
  const seen: string[] = [picker.pending ?? '-'];
  for (let i = 0; i < 14 + 4; i++) { frame(); seen.push(picker.pending ?? '-'); }
  check(`UP held runs on after 14 frames, then every 4 (${seen.join('')})`, seen.slice(0, 14).every((c) => c === 'B') && seen[14] === 'C' && seen[17] === 'C' && seen[18] === 'A');
  down.delete(UP);
  frame();
  const after = picker.pending;
  frame(); frame(); frame(); frame();
  check('letting go of UP stops the run', picker.pending === after);
}

check('the hint names the main button and fits a 40-column screen', new NamePicker(SPEC).hint === 'UP/DOWN LETTER  JUMP NEXT  RET DONE' && new NamePicker(SPEC).hint.length <= 40);

{
  const font = new BitmapFont().addDrawn(KIT_GLYPHS);
  const s = new Surface(24, 8, 9);
  drawPending(s, font, 'A', 8, 0, 1, 5);
  const cell = (x0: number) => Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => s.pixels[y * 24 + x0 + x]));
  const inCell = cell(8).flat();
  check('drawPending: the cell is cleared to paper and the letter drawn in ink', inCell.every((p) => p === 1 || p === 5) && inCell.includes(1) && inCell.includes(5));
  check('drawPending: the cells either side are untouched', [...cell(0).flat(), ...cell(16).flat()].every((p) => p === 9));
}

{
  const pace = (hold: number, gap: number, keys: string[], frames: number) => {
    const p = new KeyPacer(hold, gap);
    p.push(keys);
    return Array.from({ length: frames }, () => p.next() ?? '-').join('');
  };
  check('KeyPacer: each key held, then let go before the next (hold 2, gap 1)', pace(2, 1, ['A', 'B'], 7) === 'AA-BB--');
  check('KeyPacer: another hold and gap (hold 1, gap 3)', pace(1, 3, ['A', 'B'], 9) === 'A---B---' + '-');
  const p = new KeyPacer(2, 1);
  check('KeyPacer: idle is not busy, and gives nothing', !p.busy && p.next() === null);
  p.push(['A', 'B']);
  check('KeyPacer: pushed keys are busy', p.busy);
  p.next();
  p.clear();
  check('KeyPacer: clear drops the queue and starts the next key from the top of its hold', !p.busy && p.next() === null);
  p.push(['C']);
  check('KeyPacer: after clear a new key is held for its whole hold', p.next() === 'C' && p.next() === 'C' && p.next() === null);
}

{
  // a game's own key for the stick's up (Starquake's GET button)
  const { picker, down, frame } = makePicker({ ...SPEC, up: 'KeyZ' });
  check('a spec\'s own up key goes to the next letter, and is not typed', frame('KeyZ').keys.length === 0 && frame('KeyZ').typed.length === 0 && picker.pending === 'C');
  down.add('KeyZ');
  frame('KeyZ');
  const before = picker.pending;
  for (let i = 0; i < 20; i++) frame();
  check('...held, it runs on like the stick\'s up', picker.pending !== before);
}

finish();
