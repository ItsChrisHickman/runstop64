/**
 * Looking at the game (not a check): Monty put in a room at a place, a script of keys played (`keys:frames,...`: u d l r and j for jump,
 * `.` for none), his place, his lives and the creatures' every ten frames, and the picture at the end.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/spot.ts <out.png> <room> <x2> <y> "<keys:frames,...>"
 */
import path from 'node:path';
import { indicesPng } from '../../../tools/probe/render';
import { newGame, NONE, picture, step } from './harness';
import type { MontyInput } from '../../shared/monty/body';
const [out, room, x2, y, script] = process.argv.slice(2);
const p = newGame();
p.g.enterAt(Number(room), Number(x2), Number(y));
const segments = (script ?? '.:100').split(',').map((s) => { const [k = '.', n = '1'] = s.split(':'); return { keys: k, n: Number(n) }; });
let t = 0;
for (const seg of segments) {
  const stick: MontyInput = { ...NONE, up: seg.keys.includes('u'), down: seg.keys.includes('d'), left: seg.keys.includes('l'), right: seg.keys.includes('r'), fire: seg.keys.includes('j') };
  for (let i = 0; i < seg.n; i++, t++) {
    step(p, stick);
    if (t % 10 === 0) console.log(t, 'monty', p.g.x2, p.g.y, 'rope', p.g.onRope, 'fall', p.g.falling, 'lives', p.g.lives, 'ac', p.g.actionCounter, 'room', p.g.roomId, p.g.creatures.map((c) => (c.state === 3 ? '-' : `${c.x},${c.y}`)).join(' '));
  }
}
indicesPng(path.resolve(out ?? '/tmp/spot.png'), picture(p.g), 320, 200, 3);
