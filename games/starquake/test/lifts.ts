/**
 * Starquake's lift tubes (attribute bit 1 under BLOB's left foot carries him up, $45B4). In five rooms a tube floats three
 * cells high with solid walls: carried up its open top, BLOB bobs on the rim (he rises, his foot leaves the tube, he falls
 * back in) with his body always against the wall's top cell, so neither left nor right ever gets him out. The original has no
 * way out of that (until the energy clock kills him); ENHANCED lets go of a lift while down is held (`Game.liftDrop`), and
 * that press builds no platform. Also: ORIGINAL's bobbing is the port's, and pushing sideways frees him where a side is open.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/lifts.ts
 */
import { Game } from '../src/game';
import { drawRoom } from '../src/room';
import * as Flow from '../src/flow';
import * as Blob from '../src/blob';
import { check, finish } from '../../shared/test/check';

const UP = 0xfe, DOWN = 0xfd, LEFT = 0xfb, RIGHT = 0xf7, NONE = 0xff;
/** Floating tubes: room, the column BLOB stands in (the tube's inner two). */
const FLOATING = [[27, 21], [40, 13], [44, 13], [54, 13], [75, 21]] as const;

const g = new Game();
Flow.newGame(g, 12345);
/** BLOB in a room, in the tube's foot, and `frames` of the controls (from a list, in turn); the lowest and highest row he reached. */
function play(room: number, col: number, controls: number[], frames: number, liftDrop: boolean) {
  g.room = room; drawRoom(g); g.riding = 0; g.liftDrop = liftDrop; g.platformsLeft = 0x78;
  Blob.place(g, 0, col, 13);
  let top = 99, bottom = 0;
  for (let f = 0; f < frames; f++) {
    const r = Blob.tick(g, controls[Math.floor(f / 40) % controls.length]);
    Blob.deadlyCheck(g);
    top = Math.min(top, g.row); bottom = Math.max(bottom, g.row);
    if ([0x10, 0x20, 0x40, 0x80].includes(r.code)) return { exit: r.code, top, bottom };
  }
  return { exit: 0, top, bottom };
}

for (const [room, col] of FLOATING) {
  const o = play(room, col, [NONE, LEFT, NONE, RIGHT], 1200, false);
  check(`room ${room}, ORIGINAL: carried up and held on the rim, left and right never free him (rows ${o.top}-${o.bottom}, in a lift ${g.inLift})`, o.exit === 0 && o.top >= 10 && o.bottom <= 12 && g.col === col);
  const e = play(room, col, [NONE, DOWN], 80, true);
  check(`room ${room}, ENHANCED: down lets go and he drops out of the tube (row ${g.row}, platforms ${g.platformsLeft})`, g.row >= 15 && g.platformsLeft === 0x78 && (e.exit === 0 || e.exit === 0x10));
  const u = play(room, col, [UP], 200, true);
  check(`room ${room}, ENHANCED: up alone still carries him up (rows ${u.top}-${u.bottom})`, u.top >= 10 && u.bottom <= 12);
}
// down on foot, outside a tube, still builds a platform (ENHANCED)
{
  g.room = 8; drawRoom(g); g.riding = 0; g.liftDrop = true; g.platformsLeft = 0x78;
  Blob.place(g, 0, 21, 16);
  for (let f = 0; f < 30; f++) Blob.tick(g, NONE);
  const before = g.platformsLeft;
  Blob.tick(g, DOWN); Blob.tick(g, DOWN);
  check(`ENHANCED: down outside a lift still builds a platform (${before} -> ${g.platformsLeft})`, g.platformsLeft < before);
}
finish();
