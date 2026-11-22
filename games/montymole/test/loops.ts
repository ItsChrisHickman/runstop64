/**
 * ENHANCED's "no death loops" (`Game.noDeathLoops`), on the rebuilt game alone: a death starts Monty again in the room he died in, at the last place he stood there (his way in if none; if that is deadly, the nearest place he can stand and no loop), where without it he starts again where he came into the room, which for a way in that is a fall onto something fatal is the same death every time.
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
  check(`a place he stood on in room 1 is the safe one (${JSON.stringify(g.safe)})`, g.safe !== null && g.safe.room === 1);
  fatalFall(g);
  const lives = g.lives;
  passesUntilDeath(g);
  const m = g.monty;
  check(`with it: the death starts him in room 7, where he died, not in room 1 (${g.room}, ${m.x}, ${m.y}), standing, a life lost (${lives} to ${g.lives})`,
    g.room === 7 && m.stands(m.x, m.y) && g.lives === lives - 1);
  const after = g.lives;
  for (let i = 0; i < 300; i++) g.pass(NONE);
  check(`and nothing pressed for 300 passes loses no more (${after} to ${g.lives}): no loop`, g.lives === after && g.room === 7);
  // after a while standing in room 7 and walking on, a death starts him at the last place he stood, in room 7
  const h = scene(true);
  h.place(7, 0x60, 0x27);
  for (let i = 0; i < 60; i++) h.pass(NONE);
  const stood = h.safe;
  check(`room 7: the place he stood on is kept (${JSON.stringify(stood)})`, stood !== null && stood.room === 7);
  const k = h.monty;
  k.flags = 1; k.flags2 = 0x80; k.fallen = 40; k.y = 0x70;
  passesUntilDeath(h);
  check(`a death in room 7 starts him in room 7 where he last stood (${h.room}, ${k.x}, ${k.y})`, h.room === 7 && stood !== null && k.x === stood.x && k.y === stood.y);
}
finish();
