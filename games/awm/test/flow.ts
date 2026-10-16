/**
 * The flow outside the logic step against the original: the high score ($82FD) for random scores and highs
 * (and the ties and near misses that decide it), and the menu's two texts as the original has them ($8674, $866A).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/flow.ts games/awm/build/play.state
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { MENU_TEXT, updateHigh } from '../src/flow';
import { random } from './harness';

const [stateFile = ''] = process.argv.slice(2);
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const o = new C64Machine();
o.loadState(state);

const text = (at: number): string => Array.from({ length: 10 }, (_, i) => String.fromCharCode((o.ram[at + i] ?? 0) & 0x7f)).join('');
let failures = 0;
for (const [flag, at] of [[0, 0x8674], [1, 0x866a]] as const) {
  const same = text(at) === MENU_TEXT[flag];
  if (!same) failures++;
  console.log(`menu text for flag ${flag}: "${text(at)}" ${same ? 'as the port has it' : `DIFFERS from "${MENU_TEXT[flag]}"`}`);
}

const rnd = random(5);
const digit = (): number => Math.floor(rnd() * 10);
let runs = 0, copied = 0;
for (let n = 0; n < 400; n++) {
  const high = Array.from({ length: 5 }, digit);
  // a third of the runs share the top digits with the high score, to reach the lower comparisons and the ties
  const score = Array.from({ length: 5 }, (_, i) => (n % 3 === 0 && i > n % 5 ? high[i] ?? 0 : digit()));
  if (n % 7 === 0) score.splice(0, 5, ...high);
  o.ram.set(high, 0x4067);
  o.ram.set(score, 0x404a);
  const regs = { ...o.cpu };
  o.call(0x82fd);
  Object.assign(o.cpu, regs);
  const theirs = Array.from(o.ram.subarray(0x4067, 0x406c));
  const mine = [...high];
  updateHigh(mine, score);
  runs++;
  if (theirs.some((d, i) => d !== mine[i])) {
    failures++;
    console.log(`high ${high.join('')} score ${score.join('')} (least significant first): original ${theirs.join('')} port ${mine.join('')}`);
  } else if (mine.some((d, i) => d !== high[i])) copied++;
}
console.log(`high score $82FD: ${runs - failures} of ${runs} random cases identical (${copied} made a new high score)`);
if (failures > 0) process.exit(1);
