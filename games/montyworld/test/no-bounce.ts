/**
 * No screen flip anywhere (Chris, the sea cave: going up flipped between two rooms): for every room and every open place along each of its four edges, Monty at the edge holds the way out for a moment; if
 * that takes him into another room and he then does nothing (or keeps the stick the same), he must not be back in the room he left within 40 frames. Every swim room is tried with the snorkel taken.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/no-bounce.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { newGame } from '../../shared/monty/test/bot';
import { WORLD } from '../src/data';
import { inRoom, roomsOf } from './climb-kit';

const bounces: string[] = [];
let trials = 0;

for (const room of roomsOf(WORLD)) {
  const probe = inRoom(WORLD, room);
  if (!probe) continue;
  const solid = (c: number, r: number) => { const f = probe.g.flagAt(3 + r, 4 + c); return f === 1 || f === 2; };
  const edges: { name: string; stick: 'left' | 'right' | 'up' | 'down'; x2: number; y: number }[] = [];
  for (let r = 3; r < 19; r += 3) if (!solid(0, r) && !solid(1, r) && !solid(0, r + 1)) edges.push({ name: `left at row ${r}`, stick: 'left', x2: 0x18, y: 0x32 + (r + 1) * 8 });
  for (let r = 3; r < 19; r += 3) if (!solid(30, r) && !solid(31, r) && !solid(30, r + 1)) edges.push({ name: `right at row ${r}`, stick: 'right', x2: 0x98, y: 0x32 + (r + 1) * 8 });
  for (let c = 3; c < 29; c += 4) if (!solid(c, 0) && !solid(c + 1, 0)) edges.push({ name: `up at col ${c}`, stick: 'up', x2: 0x0c + (c + 4) * 4, y: 0x50 });
  for (let c = 3; c < 29; c += 4) if (!solid(c, 19) && !solid(c + 1, 19)) edges.push({ name: `down at col ${c}`, stick: 'down', x2: 0x0c + (c + 4) * 4, y: 0xd8 });
  for (const e of edges) {
    const s: State = newGame(WORLD, false);
    if (WORLD.swimGate !== null) s.g.siCollected[WORLD.swimGate] = 0x81;
    enterRoom(s.g, room, e.x2, e.y);
    for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
    if (s.g.roomId !== room) continue;
    trials++;
    const stick = { ...NONE, [e.stick]: true };
    let left = false, back = -1, since = 0;
    for (let f = 0; f < 120; f++) {
      frame(s, left ? NONE : stick);
      if (s.g.actionCounter) break;
      if (!left && s.g.roomId !== room) { left = true; since = f; }
      if (left && s.g.roomId === room) { back = f - since; break; }
      if (left && f - since > 40) break;
      if (left && s.g.roomId !== room && f - since > 2) continue;
    }
    if (back >= 0 && back < 40) bounces.push(`room ${room} ${e.name}: back after ${back} frames`);
  }
}
for (const b of bounces.slice(0, 20)) console.log(b);
check(`no room change bounces back within 40 frames from ${trials} edge places in every room of the game (${bounces.length} do)`, bounces.length === 0);
finish();
