/**
 * ENHANCED's "no death loops" (`Game.noDeathLoops`), on the rebuilt game alone: a death before Monty has had two seconds on his feet in a room starts him where he last
 * came into a room and had them (a life lost once, not at every start), where without it he starts again where he came into the room, which for a way in that is a fall onto
 * something fatal is the same death every time. A death after the two seconds is the original's: back to the way into the room.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/loops.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { portsFor } from '../src/controls';
import { FEET_PASSES, Game } from '../src/game';

const NONE = portsFor(0);

/** A game with Monty in room 1 for two seconds and a bit, standing, then put into room 7 in a fall that kills. */
function scene(noLoops: boolean): Game {
  const g = new Game();
  g.noDeathLoops = noLoops;
  g.place(1, 0x40, 0x27);
  for (let i = 0; i < FEET_PASSES + 10; i++) g.pass(NONE);
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
  const safe = { room: g.room, x: g.arrivalX, y: g.arrivalY };
  check(`two seconds on his feet in room 1 make its way in the safe place (${JSON.stringify(g.safe)})`, g.safe !== null && g.safe.room === 1);
  fatalFall(g);
  const lives = g.lives;
  passesUntilDeath(g);
  check(`with it: the death starts him in room 1 where he came in (${g.room}, ${g.monty.x}, ${g.monty.y}), a life lost (${lives} to ${g.lives})`, g.room === safe.room && g.monty.x === safe.x && g.monty.y === safe.y && g.lives === lives - 1);
  // and after two seconds in room 7 a death is the original's: back to its way in
  const h = scene(true);
  h.place(7, 0x60, 0x27);
  for (let i = 0; i < FEET_PASSES + 5; i++) h.pass(NONE);
  const m = h.monty;
  m.flags = 1; m.flags2 = 0x80; m.fallen = 40; m.y = 0x70;
  passesUntilDeath(h);
  check(`after two seconds in a room a death is the original's: back to its way in (${h.room}, ${h.monty.x}, ${h.monty.y})`, h.room === 7 && h.monty.x === 0x60 && h.monty.y === 0x27);
}
finish();
