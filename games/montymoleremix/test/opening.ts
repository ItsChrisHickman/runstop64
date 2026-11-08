/**
 * The opening scene (docs/montymole-remix-plan.md, "The scenes"; Chris's rule): a new game puts Monty by the miner's house; the gate on the
 * right stays shut until he has the bucket at the pot (the original's gift, passing x `$40`); the coal is in the rooms from the start;
 * the way out leads to room 0 at the bottom left, the way back from room 0's left edge to the scene with the gate open; the pool kills; a
 * death starts the scene again and keeps the bucket. With an out-dir: the scene's pictures.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/opening.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng } from '../../../tools/probe/render';
import { COAL_COUNT } from '../../montymole/src/data';
import { OPENING_POT } from '../../montymole/src/opening';
import { ROOM_COLS } from '../../montymole/src/room';
import { check, finish } from '../../shared/test/check';
import { wantedMonty, VIC_LEFT, VIC_TOP } from '../src/coords';
import { OPENING_ROOM, RemixGame } from '../src/game';
import { GATE, SCENE, SCENE_PATH_ROW } from '../src/opening-scene';
import { factsOf, find, RoomMap } from './bot';
import { type Play, NONE, picture, step } from './harness';

const out = process.argv[2];
const R = { ...NONE, right: true };
const frames = (p: Play, n: number, stick = NONE) => { for (let i = 0; i < n; i++) step(p, stick); };
const shot = (name: string, p: Play): void => {
  if (out === undefined) return;
  fs.mkdirSync(out, { recursive: true });
  indicesPng(path.join(out, name), picture(p.g), 320, 200, 2);
};
const montyX = (g: RemixGame): number => wantedMonty(g.x2, g.stepGate, g.y).x;
const gateSolid = (g: RemixGame): boolean => g.flagAt(3 + GATE.top + 2, 4 + GATE.col) === 1;

/** A new game: the scene loaded and settled. */
function scene(): Play {
  const g = new RemixGame();
  g.start();
  const p: Play = { g, col: 0 };
  for (let n = 0; n < 20 && (n === 0 || g.freeze || g.script); n++) g.frame(0);
  return p;
}

// ---- the start ----
{
  const p = scene();
  const g = p.g;
  check(`a new game starts in the opening scene (room ${g.roomId}), five lives, no score`, g.roomId === OPENING_ROOM && g.lives === 5 && g.score === 0 && !g.freeze);
  check('the coal is all there from the start (the bucket gates the way out, not the coal)', Array.from({ length: COAL_COUNT }, (_, i) => g.coal.isThere(i)).every((b) => b));
  check(`Monty is by the house, on the path (x ${montyX(g)}), the bucket not his`, montyX(g) < 0x40 && !g.bucketTaken && g.falling === 0);
  check('the gate on the right is shut', gateSolid(g));
  frames(p, 60);
  check('he stands where he came in (the path holds him; the pool is not under him)', g.falling === 0 && !g.actionCounter && montyX(g) < 0x40);
  shot('opening-start.png', p);

  // ---- the gate is shut (the bucket not his, or no gate step made): he cannot pass it, whatever he does
  const q = scene();
  q.g.x2 = (0xc0 + VIC_LEFT) >> 1;
  q.g.bucketTaken = true; // (so that passing x $40 is no gift: the gate is as the scene made it)
  frames(q, 40, R);
  check(`a shut gate stops him (x ${montyX(q.g)}), the way out is not taken`, montyX(q.g) < 0xe0 - 15 && gateSolid(q.g) && q.g.roomId === OPENING_ROOM);

  // ---- the gift at x $40
  frames(p, 30, R);
  check(`walking right past x $40 gives the bucket (x ${montyX(g)})`, g.bucketTaken && g.opening.potWaits === 0);
  frames(p, 40);
  check('the gate opens, cell by cell from the path up', !gateSolid(g) && SCENE.behind.size === GATE.cells);
  const sprite = (n: number): boolean => (g.vic.enable & (1 << n)) !== 0;
  check('the pot is gone (its sprite is off) and the wife walks out (head and legs are on)', !sprite(1) && sprite(2) && sprite(4) && g.opening.wifeX > 1);
  shot('opening-bucket.png', p);
  check('the pot was drawn where Wanted has it', OPENING_POT.x === 0x2f && OPENING_POT.y === 0x4f);
}

// ---- over the pool, out of the scene, into room 0, and back
{
  const p = scene();
  frames(p, 40, R); // (past x $40: the bucket, the gate opening)
  frames(p, 40);
  check('(the gate is open for the way)', p.g.bucketTaken && !gateSolid(p.g));
  const map = new RoomMap(factsOf(p.g));
  map.addStart(p.g);
  map.explore();
  const found = find(p, map, { kind: 'exit', direction: 'right' }, 20000);
  check(`the bot finds the way over the pool (footbridge to footbridge, a jump over the gap) and through the gate: ${'play' in found ? `${found.frames} frames` : `none in ${found.expanded} states`}`, 'play' in found);
  if ('play' in found) {
    const q = found.play;
    const g = q.g;
    const m = wantedMonty(g.x2, g.stepGate, g.y);
    check(`he comes into room 0 (${g.roomId}) where the scene leaves him, at the bottom left (x ${m.x}, y ${m.y})`, g.roomId === 0 && m.x === 0x18 && m.y === 0x27);
    frames(q, 10);
    shot('opening-room0.png', q);
    // back out of room 0 by its left edge (a moment's grace: room 0's creatures are about there): the scene again, the gate open
    g.graceActive = () => true;
    for (let i = 0; i < 120 && g.roomId === 0; i++) step(q, { ...NONE, left: true });
    frames(q, 20);
    check(`room 0's left edge leads back to the scene (room ${g.roomId}), the gate open, the bucket his`, g.roomId === OPENING_ROOM && g.bucketTaken && !gateSolid(g));
    check(`and he comes in at the right of the scene (x ${montyX(g)})`, Math.abs(montyX(g) - 0xd8) < 40);
    shot('opening-back.png', q);
  }
}

// ---- the pool kills; the scene starts again, the bucket kept
{
  const p = scene();
  const g = p.g;
  frames(p, 30, R);
  check('(the bucket is his)', g.bucketTaken);
  g.x2 = (0x98 + VIC_LEFT) >> 1;
  g.y = VIC_TOP + SCENE_PATH_ROW * 8;
  const lives = g.lives;
  let n = 0;
  for (; n < 200 && g.lives === lives; n++) step(p, R);
  frames(p, 60);
  check(`walking into the pool is a death: a life gone (${g.lives}), the scene again, the bucket still his (${g.bucketTaken}), the gate open`, g.lives === lives - 1 && g.roomId === OPENING_ROOM && g.bucketTaken && !gateSolid(g));
  check(`and he starts again by the house (x ${montyX(g)})`, montyX(g) < 0x40 + 16);
}

check(`the scene is ${ROOM_COLS} cells wide, six tiles and ${SCENE.chars.size} pictures of its own`, SCENE.slots.length === 6 && SCENE.chars.size > 0);
finish();
