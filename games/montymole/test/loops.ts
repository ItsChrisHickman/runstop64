/**
 * ENHANCED's "no death loops" (`Game.noDeathLoops`), on the rebuilt game alone: a death starts Monty again in the room he died in, exactly where he came into it (if that way in is deadly, the nearest place he can stand and no loop), where without it he starts again where he came into the room, which for a way in that is a fall onto something fatal is the same death every time.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/loops.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { portsFor } from '../src/controls';
import { Game } from '../src/game';

const NONE = portsFor(0);

/** A game with Monty in room 1 for two seconds and a bit, standing, then put into room 7 in a fall that kills. */
function scene(noLoops: boolean): Game {
  const g = new Game();
  g.noDeathLoops = noLoops;
  g.place(1, 0x40, 0x27);
  for (let i = 0; i < 60; i++) g.pass(NONE);
  return g;
}
function fatalFall(g: Game): void {
  const m = g.monty;
  g.place(7, 0x60, 0x70);
  m.flags = 1; m.flags2 = 0x80; m.fallen = 40;
}
function passesUntilDeath(g: Game): number {
  const lives = g.lives;
  let n = 0;
  while (g.lives === lives && n < 200) { g.pass(NONE); n++; }
  return n;
}

{
  const g = scene(false);
  const arrival = { x: g.arrivalX, y: g.arrivalY };
  fatalFall(g);
  const lives = g.lives;
  passesUntilDeath(g);
  check(`without it: the death starts him where he came into room 7 (${g.room}, ${g.monty.x}, ${g.monty.y}), a life lost (${lives} to ${g.lives})`, g.room === 7 && g.monty.x === 0x60 && g.monty.y === 0x70 && g.lives === lives - 1);
  void arrival;
}
{
  const g = scene(true);
  fatalFall(g);
  const lives = g.lives;
  passesUntilDeath(g);
  const m = g.monty;
  check(`with it: the death starts him in room 7, where he died, not in room 1 (${g.room}, ${m.x}, ${m.y}), standing, a life lost (${lives} to ${g.lives})`,
    g.room === 7 && m.stands(m.x, m.y) && g.lives === lives - 1);
  const after = g.lives;
  for (let i = 0; i < 300; i++) g.pass(NONE);
  check(`and nothing pressed for 300 passes loses no more (${after} to ${g.lives}): no loop`, g.lives === after && g.room === 7);
  // after a while standing in room 7 and walking on (with the way in a safe place), a death still starts him where he came in, not where he last stood
  const h = scene(true);
  h.place(7, 0x60, 0x27);
  const came = { x: h.arrivalX, y: h.arrivalY };
  for (let i = 0; i < 60; i++) h.pass(NONE);
  const k = h.monty;
  k.x += 12;
  k.flags = 1; k.flags2 = 0x80; k.fallen = 40; k.y = 0x70;
  passesUntilDeath(h);
  check(`a death in room 7 starts him in room 7 exactly where he came in (${h.room}, ${k.x}, ${k.y}), not where he last stood`, h.room === 7 && k.x === came.x && k.y === came.y);
}
finish();
