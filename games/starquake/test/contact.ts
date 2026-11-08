/**
 * Starquake's enemies on contact (enemies.ts `collide`, $1591). ORIGINAL: an enemy that drifts into BLOB drains a unit of energy every
 * frame it overlaps him, and stays. ENHANCED (`Game.bite`): the touch destroys it, with the explosion the laser's kill shows, and
 * takes one fixed bite (a quarter of a full bar), not a drain; the points are the laser's alone. Enemies that kill outright (the
 * homing ones, kind 0; plants and the core's guardians, kind $0F) still kill, and a moment's grace still protects him.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/contact.ts
 */
import * as Enemies from '../src/enemies';
import { Game } from '../src/game';
import * as Flow from '../src/flow';
import { drawRoom } from '../src/room';
import * as Blob from '../src/blob';
import { check, finish } from '../../shared/test/check';

const FULL = 0x78;
/** A room with BLOB in it and one enemy of this kind on top of him (the others gone, it stands still). */
function setUp(kind: number, bite: boolean) {
  const g = new Game();
  Flow.newGame(g, 777);
  g.room = 8; drawRoom(g);
  Blob.place(g, 0, 21, 16);
  g.bite = () => bite;
  g.energy = FULL;
  for (const e of g.enemies) e.state = 5;
  const e = g.enemies[0], sp = g.sprites;
  Object.assign(e, { state: 3, kind, move: 1, speed: 0, dx: 0, dy: 0, base: 0x62, timer: 5 });
  sp.x[4] = sp.x[0]; sp.y[4] = sp.y[0]; sp.msb = sp.msb & 1 ? sp.msb | 0x10 : sp.msb & 0xef; sp.enable |= 0x10;
  return { g, e };
}

{
  const { g, e } = setUp(5, false);
  Enemies.tick(g); Enemies.tick(g); Enemies.tick(g);
  check(`ORIGINAL: a touch drains a unit a frame (${FULL} -> ${g.energy}) and the enemy stays (state ${e.state})`, g.energy === FULL - 3 && e.state === 3 && g.dead === 0);
}
{
  const { g, e } = setUp(5, true);
  const score = g.pendingScore;
  Enemies.tick(g);
  check(`ENHANCED: one touch destroys it (state ${e.state}, the dying look ${e.base.toString(16)}) and takes one bite (${FULL} -> ${g.energy}, a quarter is ${FULL / 4})`, e.state === 4 && e.base === 0x66 && g.energy === FULL - Enemies.BITE && Enemies.BITE === FULL / 4);
  check('...the bar is redrawn, and the touch gives no points', (g.panelDirty & 1) === 1 && g.pendingScore === score);
  for (let i = 0; i < 20; i++) Enemies.tick(g);
  check(`...and nothing drains after it, while it explodes (${g.energy})`, g.energy === FULL - Enemies.BITE && g.dead === 0);
}
{
  const { g, e } = setUp(5, true);
  g.energy = 9;
  Enemies.tick(g);
  check(`ENHANCED: a bite does not take more than there is (9 -> ${g.energy}); the game's own check then ends it`, g.energy === 0 && e.state === 4);
}
for (const [what, kind, dead] of [['a homing enemy (kind 0)', 0, 1], ['a plant or guardian (kind $0F)', 0x0f, 0x0f]] as const) {
  const { g, e } = setUp(kind, true);
  Enemies.tick(g);
  check(`ENHANCED: ${what} still kills outright (dead ${g.dead}), and is not destroyed (state ${e.state}), no bite (${g.energy})`, g.dead === dead && e.state === 3 && g.energy === FULL);
}
{
  const { g, e } = setUp(5, true);
  g.graceActive = () => true;
  Enemies.tick(g);
  check('a moment\'s grace: no bite, no kill, nothing destroyed', g.energy === FULL && e.state === 3);
}
{
  // the laser's kill is as it was: the enemy dies, 5 points, the shot is spent
  const { g, e } = setUp(5, true);
  const sp = g.sprites, score = g.pendingScore;
  sp.x[0] = 0; sp.y[0] = 0xf0; // (BLOB far away)
  sp.x[3] = sp.x[4]; sp.y[3] = sp.y[4]; g.laser = 0x40 | 5; sp.enable |= 8;
  Enemies.tick(g);
  check(`the laser still destroys it for 5 points, without a bite (${e.state} ${g.pendingScore} ${g.energy})`, e.state === 4 && g.pendingScore === score + 5 && g.energy === FULL);
}
finish();
