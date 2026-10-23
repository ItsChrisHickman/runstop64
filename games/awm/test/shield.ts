/**
 * Auf Wiedersehen Monty's shield, against the original running ("enemies don't kill me, all of them"). The first thing of the
 * first room, a few steps left of where he starts, is a shield ($6B22: item 1 sets $405E from the byte at $0143); $405E is
 * written there and nowhere else, so once he has touched it nothing hurts him for the rest of the game, through any number of
 * deaths, until a new game clears it. The port does exactly what the original does:
 *
 * - Monty on the shield's top left cell (the game looks at x + 3, y + 2): the original's $405E is $85 and so is the port's;
 * - Monty on an enemy again and again for 600 frames: hurt without the shield, never with it (both), and the shield stays;
 * - the room's start: Monty stands where the original has him (128, 104).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/shield.ts games/awm/build/play.state
 */
import fs from 'node:fs';
import { C64, unpackState } from '../../../packages/c64kit/src/c64/machine';
import { check, finish } from '../../shared/test/check';
import { TABLES } from '../src/data';
import { HIDDEN, isPlane } from '../src/enemies';
import { Game } from '../src/game';
import { SHIELD } from '../src/items';
import { START_ROOM } from '../src/program';
import { COLS } from '../src/room';
import { State } from '../src/tiles';

const [file = 'games/awm/build/play.state'] = process.argv.slice(2);
const item = TABLES.items[0];
if (!item || item.type !== 1 || item.room !== START_ROOM) throw new Error('the first item is not the start room\'s shield');
const col = item.cell % COLS, row = Math.floor(item.cell / COLS);
const onShield = { x: (col * 8 - 3) & 0xff, y: (row * 8 - 2) & 0xff };

/** The original in play in the start room ($5C3F, $5C40: Monty's place; $405E the shield; $4F87 his state; $5C4C on: the four enemy records of 13 bytes). */
function original() {
  const m = new C64();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(file))));
  const r = m.ram;
  const frame = () => { m.joy1 = m.joy2 = 0x1f; m.runFrame(); };
  const enemy = () => [0, 1, 2, 3].find((s) => { const f = r[0x5c53 + 13 * s]; return f !== HIDDEN && f < 0x80 && !isPlane(f); });
  /** Hurt (states Zap, Fire, Dying, Knocked: $3-$6, $D, $E in the original's numbering) times, standing on an enemy for `n` frames. */
  const hurts = (n: number) => {
    let times = 0, last = r[0x4f87];
    for (let f = 0; f < n; f++) {
      const s = enemy();
      if (s !== undefined && f % 8 === 0) { r[0x5c3f] = r[0x5c4c + 13 * s]; r[0x5c40] = r[0x5c4d + 13 * s]; }
      frame();
      if (r[0x4f87] !== last && [3, 4, 5, 6, 0xd, 0xe].includes(r[0x4f87])) times++;
      last = r[0x4f87];
    }
    return times;
  };
  return { r, frame, hurts };
}

/** The port's game in the start room: hurt (his state a hit's) times, standing on an enemy for `n` logic steps. */
function port(shield: number) {
  const g = new Game(START_ROOM);
  g.shield = shield;
  const hurt: readonly number[] = [State.Zap, State.Fire, State.Dying, State.Knocked];
  let times = 0, last: number = g.monty.state;
  for (let f = 0; f < 300; f++) {
    const s = [0, 1, 2, 3].find((q) => { const fr = g.enemies.frame(q); return fr !== HIDDEN && fr < 0x80 && !isPlane(fr); });
    if (s !== undefined && f % 4 === 0) { g.monty.x = g.enemies.x(s); g.monty.y = g.enemies.y(s); }
    g.step(0);
    if (g.monty.state !== last && hurt.includes(g.monty.state)) times++;
    last = g.monty.state;
  }
  return times;
}

{
  const o = original();
  check(`the original: Monty stands at (${o.r[0x5c3f]}, ${o.r[0x5c40]}) in the start room, ${o.r[0x405e] === 0 ? 'no shield' : 'a shield'}`, o.r[0x5c3f] === 128 && o.r[0x5c40] === 104 && o.r[0x405e] === 0);
  const g = new Game(START_ROOM);
  check(`the port's new game: Monty at (${g.monty.x}, ${g.monty.y}), as the original has him`, g.monty.x === 128 && g.monty.y === 104 && g.shield === 0);
}
{
  const o = original();
  o.r[0x5c3f] = onShield.x; o.r[0x5c40] = onShield.y;
  for (let f = 0; f < 8; f++) o.frame();
  const g = new Game(START_ROOM);
  g.monty.x = onShield.x; g.monty.y = onShield.y;
  for (let f = 0; f < 4; f++) g.step(0);
  check(`Monty on the shield (cell ${col}, ${row}): the original's $405E is $${o.r[0x405e].toString(16)}, the port's ${g.shield.toString(16)}`, o.r[0x405e] === SHIELD && g.shield === SHIELD);
}
{
  const o = original();
  const without = o.hurts(600);
  o.r[0x405e] = SHIELD;
  const withShield = o.hurts(600);
  check(`the original standing on enemies for 600 frames: hurt ${without} times without the shield, ${withShield} with it, which stays ($${o.r[0x405e].toString(16)})`, without > 0 && withShield === 0 && o.r[0x405e] === SHIELD);
  const a = port(0), b = port(SHIELD);
  check(`the port, 300 logic steps: hurt ${a} times without the shield, ${b} with it`, a > 0 && b === 0);
}

finish();
