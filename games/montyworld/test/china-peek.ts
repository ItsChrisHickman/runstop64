/**
 * A quick look at some of China's rooms as the engine draws them, at the game's own frame, one picture each, optionally with a frame count and Monty's column and floor:
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/china-peek.ts <out-dir> <room>[:frames[:col:floor]]...      (room: wall alley tower top market gate roofs willow junk)
 */
import fs from 'node:fs';
import { CHI } from '../src/china';
import { placed, savePng } from './shots-kit';
import { itemIndex } from './route';
import { newPlay } from './shots-kit';

const [out, ...want] = process.argv.slice(2);
if (out === undefined || want.length === 0) throw new Error('usage: china-peek.ts <out-dir> <room>[:frames[:col:floor]]...');
fs.mkdirSync(out, { recursive: true });
const probe = newPlay().g;
const hat = itemIndex(probe, CHI.top, 0);
for (const w of want) {
  const [name = '', frames = '40', col = '2', floor = '17'] = w.split(':');
  const room = CHI[name === 'top' ? 'top' : name === 'wall' ? 'wall' : name === 'alley' ? 'alley' : name === 'tower' ? 'tower' : name === 'market' ? 'market' : name === 'gate' ? 'gate' : name === 'roofs' ? 'roofs' : name === 'willow' ? 'willow' : 'junk'];
  const { px } = placed({ room, col: Number(col), floor: Number(floor), frames: Number(frames), worn: hat });
  savePng(out, `${name}-${frames}.png`, px);
}
