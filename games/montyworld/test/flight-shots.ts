/**
 * The flight from Hilo to the Andes (sky.ts) as the real engine draws it: each leg at moments through its clock (the gulls and the plume, the frigatebird and the albatross; the storm's flicker and bolt,
 * a gust's streaks, the waterspout; Viktor on his tail and the Andes rising), the bail-out, the arrival in JUMP FOR JOY, and the HUD's tally (EASY and HARD, Viktor away and due). Pictures only: nothing
 * is checked (flight.ts is the test).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/flight-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE, type State } from '../../montyotr/test/play';
import type { Input as Stick } from '../../montyotr/src/game';
import { ROUNDS } from '../src/data';
import { FLY } from '../src/sky';
import { contactSheet, newPlay, savePng, settle, shot } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: flight-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

/** A weave: up for a while, then let go, so he moves about the sky as a player does. */
const weave = (t: number): Stick => ({ ...NONE, up: t % 120 < 50, right: t % 300 < 120, left: t % 300 > 200 });

/** A game in a leg (EASY or HARD), the train and the ship won, from (col, row), its frames flown with the weave; pictures at the given frames. */
function fly(room: number, col: number, row: number, at: readonly number[], easy = false): Uint8Array[] {
  const s: State = newPlay();
  s.g.assist = { ...s.g.assist, lives: easy, respawn: true };
  s.g.siCollected[ROUNDS.train] = 0x81; s.g.siCollected[ROUNDS.ship] = 0x81;
  enterRoom(s.g, room, 0x0c + (col + 4) * 4, 0x32 + (row + 3) * 8);
  settle(s);
  const pics: Uint8Array[] = [];
  const last = Math.max(...at);
  for (let t = 0; t <= last; t++) {
    if (at.includes(t)) pics.push(shot(s.g));
    frame(s, weave(t));
    if (s.g.actionCounter || s.g.script) { s.g.actionCounter = 0; s.g.script = null; s.g.freeze = 0; s.g.gameMode = 0; } // (pictures only: a death is waved off)
  }
  return pics;
}

const L1 = fly(FLY.mail, 4, 8, [20, 140, 330, 420, 560, 600, 800, 940]);
L1.forEach((px, i) => savePng(out, `leg1-${i}.png`, px));
contactSheet(out, 'leg1.png', L1);
const L2 = fly(FLY.storm, 4, 12, [20, 120, 136, 150, 200, 700, 740, 780]);
L2.forEach((px, i) => savePng(out, `leg2-${i}.png`, px));
contactSheet(out, 'leg2.png', L2);
const L3 = fly(FLY.tail, 6, 6, [20, 200, 400, 600, 900, 1100, 1240, 1300, 1340, 1380]);
L3.forEach((px, i) => savePng(out, `leg3-${i}.png`, px));
contactSheet(out, 'leg3.png', L3);
// the HUD: HARD (the lives under the stars) and EASY, Viktor away (L1) and due (L3)
savePng(out, 'hud-hard-away.png', fly(FLY.mail, 4, 8, [30])[0] ?? new Uint8Array());
savePng(out, 'hud-easy-due.png', fly(FLY.tail, 6, 6, [400], true)[0] ?? new Uint8Array());
console.log(`pictures in ${out}`);
