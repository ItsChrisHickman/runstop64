/**
 * The game's own ending through the live session (src/main.ts: the frame, the verse, the view, the pause rule), in ENHANCED and ORIGINAL: room 20's right edge
 * is walked out of, and what the player sees is checked in the picture the renderer has: the verse typed in cyan (it was once wiped a letter at a time by
 * the coal count's row, which is the verse's bottom row: a black screen that took no input for minutes), no pause while it is on, the way back to the
 * title; and a save made in room 20 continues in room 20.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/live-ending.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { continueFromTitle } from '../../shared/test/continue-from-title';
import { STILL_THERE } from '../../montymole/src/coal-rules';
import { VIC_LEFT, VIC_TOP } from '../src/coords';
import { run } from '../src/main';

const store = useMemoryStorage();
const outDir = process.argv[2];

function session(enhanced: boolean, fresh: boolean) {
  if (fresh) store.clear();
  store.set('montymoleremix.assist', JSON.stringify({ easy: enhanced }));
  const input = new Input(nowhere), renderer = new PixelRenderer(), p = run({ renderer, input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  const shot = (name: string) => { if (outDir === undefined) return; fs.mkdirSync(outDir, { recursive: true }); indicesPng(path.join(outDir, `${name}.png`), renderer.screen.pixels.map((v) => (v === 0xff ? renderer.background : v)), 320, 200); };
  /** The pixels of a colour on the screen. */
  const inks = (colour: number): number => renderer.screen.pixels.reduce((n, v) => n + (v === colour ? 1 : 0), 0);
  return { p, g: p.game, input, renderer, tick, tap, shot, inks };
}
type Session = ReturnType<typeof session>;

/** Everything taken, room 20's right side, and a walk out of its right edge until the verse starts. */
function walkOut(s: Session): number {
  const { g, p } = s;
  g.coal.flags.forEach((f, id) => { g.coal.flags[id] = f & ~STILL_THERE; });
  g.graceActive = () => true; // (room 20's creature is about there)
  g.travelTo(20, (222 + VIC_LEFT) >> 1, VIC_TOP + 3 * 8);
  s.tick(30);
  s.input.keyDown('ArrowRight');
  let n = 0;
  while (p.verse === null && n++ < 400) s.tick();
  s.input.keyUp('ArrowRight');
  return n;
}

for (const enhanced of [true, false]) {
  const mode = enhanced ? 'EASY' : 'HARD';
  const s = session(enhanced, true);
  const { p, g } = s;
  s.tick(400);
  s.tap('Space');
  s.tick(20);
  const n = walkOut(s);
  check(`${mode}: out of room 20's right edge the verse starts (${n} frames)`, p.verse !== null && g.finished === 'ending');
  s.tick(40);
  s.tap('KeyP');
  check(`${mode}: the pause key does nothing under the verse`, !p.state.paused);
  s.tick(260);
  const text = p.verse?.text().filter((l) => l !== '') ?? [];
  check(`${mode}: the verse is typed on the screen (${text.length} lines, the first "${text[0] ?? ''}")`, text[0] === 'OUR GALLANT MOLES' && text.length >= 3);
  const cyan = s.inks(3);
  check(`${mode}: and it is in the picture the player sees: cyan pixels on black (${cyan})`, cyan > 200);
  s.shot(`ending-verse-${mode.toLowerCase()}`);
  // through to the end (a key after it has been typed through)
  for (let i = 0; i < 80 && p.verse !== null; i++) { s.tick(100); s.tap('Space'); }
  check(`${mode}: the verse ends, back on the title`, p.verse === null && p.state.mode === 'title');
}

// a save made in room 20 continues in room 20, and the way out still works from it
{
  const s = session(true, true);
  s.tick(400);
  s.tap('Space');
  s.tick(20);
  s.g.travelTo(20, (0x1c * 2 + 0x30) >> 1, VIC_TOP + 3 * 8);
  s.tick(60);
  check('a room 20 save is written', s.g.roomId === 20 && s.p.state.hasSave);
  const t = session(true, false);
  continueFromTitle(t.p, t.input, t.tick);
  check(`ENTER CONTINUE: back in room 20 (${t.g.roomId})`, t.g.roomId === 20);
  walkOut(t);
  t.tick(200);
  check('from the continued game the verse shows too', (t.p.verse?.text().filter((l) => l !== '').length ?? 0) >= 2 && t.inks(3) > 100);
}
finish();
