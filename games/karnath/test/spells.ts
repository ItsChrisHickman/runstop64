/**
 * Karnath: changing the spell. The original changes it on "any other key" only after the key has been
 * down for 16 frames in all ($236F counts them, $1BFB; it is cleared only when it reaches 16), so a
 * quick tap (what a press of ours is, a few frames) is not enough: it took five or six presses.
 * Here one press (a key tapped, the touch SPELL button's Enter) is one change to the next spell, at every
 * moment of the frame cycle, with a spell in flight or not; and the number keys pick the spell they name.
 * Also: the spell looks the same whichever is chosen (the original draws one spell, sprite 3;
 * what differs is which creature it works on, $322C), which the last checks show.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/spells.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';

stubFetch(fs.readFileSync('games/karnath/assets/karnath-title.state'));

const SPELL = 0x322c;
const FLYING = 0x3216;

async function launch() {
  useMemoryStorage(new Map());
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const ram = () => must(p.host, 'the running game').m.ram;
  const press = (code: string, frames: number) => { input.keyDown(code); tick(frames); input.keyUp(code); };
  tick(80); press('Space', 3); tick(300);
  return { p, input, tick, ram, press };
}

const s = await launch();
check('in play, spell 1 chosen', s.ram()[SPELL] === 1);

// a tap of Enter (3 frames, as a touch tap or a quick key press), at 20 different frame phases and gaps
let each = true;
let expect = s.ram()[SPELL];
for (let phase = 0; phase < 20; phase++) {
  s.tick(phase * 3 + 1);
  s.press('Enter', 3);
  s.tick(20);
  expect = expect === 10 ? 1 : expect + 1;
  if (s.ram()[SPELL] !== expect) each = false;
}
check('one tap of Enter changes the spell by exactly one, 20 times at different moments', each);

// even a one-frame tap
const before = s.ram()[SPELL];
s.press('Enter', 1); s.tick(20);
check('a one-frame tap changes the spell', s.ram()[SPELL] === (before === 10 ? 1 : before + 1));

// with a spell in flight
s.press('Digit1', 3); s.tick(5);
s.input.keyDown('Space'); s.tick(3); s.input.keyUp('Space'); s.tick(2);
check('a spell is in flight', s.ram()[FLYING] === 1);
s.press('Enter', 3); s.tick(2);
check('a tap while a spell is in flight changes the spell too', s.ram()[SPELL] === 2);
s.tick(100);

// the number keys
let direct = true;
for (const [code, n] of [['Digit5', 5], ['Digit0', 10], ['Digit7', 7], ['Digit2', 2]] as const) {
  s.press(code, 3); s.tick(5);
  if (s.ram()[SPELL] !== n) direct = false;
}
check('the number keys pick their spell (0 is the tenth)', direct);

// a key held down is still one press: one change
const h = s.ram()[SPELL];
s.input.keyDown('Enter'); s.tick(40); s.input.keyUp('Enter'); s.tick(10);
check('a key held for 40 frames is one change', s.ram()[SPELL] === (h === 10 ? 1 : h + 1));

// the spell looks the same whichever is chosen: the sprite 3's image and colour while it flies
const looks = new Set<string>();
for (const n of [1, 4, 7, 10]) {
  s.press(`Digit${n % 10}`, 3); s.tick(5);
  s.input.keyDown('Space'); s.tick(3); s.input.keyUp('Space');
  for (let i = 0; i < 12 && s.ram()[FLYING] !== 1; i++) s.tick(1);
  const m = must(s.p.host, 'the running game').m;
  looks.add(`${m.ram[0x7f8 + 3]} ${m.vic[0x2a]}`);
  s.tick(60);
}
check(`the spell is drawn the same whichever is chosen (${[...looks].join(' / ')})`, looks.size === 1);

finish();
