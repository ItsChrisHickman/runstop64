/**
 * Auf Wiedersehen Monty's shield is gone, in both modes ("that shield item is confusing and it breaks the game"). The original's
 * first thing of the first room, a few steps left of where he starts, is a shield ($6B22: item 1 sets $405E from the byte at
 * $0143, and nothing hurts him for the rest of the game, through any number of deaths). Checked against the original running:
 *
 * - the original has the leaf in the start room, Monty on its top left cell (the game looks at x + 3, y + 2) sets $405E to $85;
 * - the port does not place it: no leaf in the room's cells, Monty on that cell takes nothing, and the map does not count it;
 * - Monty on an enemy again and again: always hurt, in a new game and in a game loaded from a save that has the old flag set
 *   (formats 1 and 2 kept the flag; it loads cleared).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/shield.ts games/awm/build/play.state
 */
import fs from 'node:fs';
import { isRecord, readJson } from '../../shared/guards';
import { C64, unpackState } from '../../../packages/c64kit/src/c64/machine';
import { check, finish } from '../../shared/test/check';
import { TABLES } from '../src/data';
import { HIDDEN, isPlane } from '../src/enemies';
import { Game } from '../src/game';
import { isRemoved } from '../src/items';
import { CODEC, restore, snapshot } from '../src/save';
import { START_ROOM } from '../src/program';
import { COLS } from '../src/room';
import { State } from '../src/tiles';

const [file = 'games/awm/build/play.state'] = process.argv.slice(2);
const item = TABLES.items[0];
if (!item || item.type !== 1 || item.room !== START_ROOM || !isRemoved(item.type)) throw new Error('the first item is not the start room\'s shield');
const SHIELD = 0x85;
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

/** A game in the start room: hurt (his state a hit's) times, standing on an enemy for 300 logic steps. */
function port(g: Game) {
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
  check(`the original: Monty stands at (${o.r[0x5c3f]}, ${o.r[0x5c40]}) in the start room, no shield yet`, o.r[0x5c3f] === 128 && o.r[0x5c40] === 104 && o.r[0x405e] === 0);
  o.r[0x5c3f] = onShield.x; o.r[0x5c40] = onShield.y;
  for (let f = 0; f < 8; f++) o.frame();
  check(`the original: Monty on the leaf (cell ${col}, ${row}) has $405E = $${o.r[0x405e].toString(16)}`, o.r[0x405e] === SHIELD);
}
{
  const g = new Game(START_ROOM);
  check(`the port's new game: Monty at (${g.monty.x}, ${g.monty.y}), as the original has him`, g.monty.x === 128 && g.monty.y === 104);
  check('no leaf in the start room: its top left cell is empty', ![0x2f, 0x33, 0x37, 0x3b].includes(g.world.cells[item.cell] ?? 0));
  const score = g.score.digits.join(''), before = g.progress;
  g.monty.x = onShield.x; g.monty.y = onShield.y;
  for (let f = 0; f < 8; f++) g.step(0);
  check('Monty on the leaf\'s place takes nothing (no score, no progress)', g.score.digits.join('') === score && g.progress === before && !g.items.collected[0]);
  check(`the port, 300 logic steps on enemies: hurt ${port(new Game(START_ROOM))} times`, port(new Game(START_ROOM)) > 0);
}
{
  // a save of format 2 that has the shield set: loads without it, enemies hurt
  const g = new Game(START_ROOM);
  const saved = { ...snapshot(g, [null, null, null, null]), v: 2, shield: SHIELD };
  const bytes = Uint8Array.from(JSON.stringify(saved), (c) => c.charCodeAt(0));
  const loaded = CODEC.unpack(bytes, 2);
  check('a format 2 save with the shield set reads (as the current format, no flag)', loaded.v === 3 && !('shield' in loaded));
  check(`and plays with enemies hurting him (${port(restore(loaded))} hits)`, port(restore(loaded)) > 0);
  const packed = readJson(String.fromCharCode(...CODEC.pack(loaded)));
  check('the codec is format 3 and packs no shield', CODEC.format === 3 && isRecord(packed) && !("shield" in packed));
}

finish();
