/**
 * Auf Wiedersehen Monty's yellow leaf (item type 1, the first thing of the first room, a few steps left of where he starts) is a
 * plain 75-point item, and there is no shield, in both modes. The commercial game's $6B22 copies a byte into the shield flag $405E,
 * and that byte is the MONTY cheat's (typed before loading); this copy is a crack whose $6B22 reads a stray byte ($0143 = $85), so
 * the flag is always on. Without the cheat the leaf sets nothing and adds $4B to the score ($81FA). Checked against the original
 * running (with the byte clear, as the uncheated game has it):
 *
 * - Monty on the leaf's top left cell (the game looks at x + 3, y + 2): the score goes up by 75, progress and money do not, $405E stays 0;
 * - the port: the leaf is in the room, Monty on its cell takes it (75 points, nothing else) and it is gone and counted by the map;
 * - Monty on an enemy again and again: hurt, before and after the leaf, in a new game and in a game loaded from a save that has the
 *   old flag set (formats 1 and 2 kept the flag; it loads cleared).
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
import { uncheated } from './harness';
import { CODEC, restore, snapshot } from '../src/save';
import { START_ROOM } from '../src/program';
import { COLS } from '../src/room';
import { State } from '../src/tiles';

const [file = 'games/awm/build/play.state'] = process.argv.slice(2);
const item = TABLES.items[0];
if (!item || item.type !== 1 || item.room !== START_ROOM) throw new Error('the first item is not the start room\'s leaf');
const SHIELD = 0x85;
const POINTS = 75;
const col = item.cell % COLS, row = Math.floor(item.cell / COLS);
const onLeaf = { x: (col * 8 - 3) & 0xff, y: (row * 8 - 2) & 0xff };

/** The original in play in the start room ($5C3F, $5C40: Monty's place; $405E the shield; $4F87 his state; $5C4C on: the four enemy records of 13 bytes). */
function original() {
  const m = new C64();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(file))));
  const r = m.ram;
  const step = m.cpu.step.bind(m.cpu);
  m.cpu.step = () => { uncheated(m.cpu.pc, m.ram); return step(); };
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

/** A counter's value: five digits, ones first. */
const value = (d: readonly number[]): number => d.reduce((sum, x, i) => sum + x * 10 ** i, 0);
const digits = (r: Uint8Array, at: number): number => value(Array.from({ length: 5 }, (_, i) => r[at + i] ?? 0));
{
  const o = original();
  check(`the original: Monty stands at (${o.r[0x5c3f]}, ${o.r[0x5c40]}) in the start room, no shield yet`, o.r[0x5c3f] === 128 && o.r[0x5c40] === 104 && o.r[0x405e] === 0);
  const score = digits(o.r, 0x404a), money = digits(o.r, 0x4051), progress = o.r[0x405d];
  o.r[0x5c3f] = onLeaf.x; o.r[0x5c40] = onLeaf.y;
  for (let f = 0; f < 8; f++) o.frame();
  check(`the original: Monty on the leaf (cell ${col}, ${row}): $405E ${o.r[0x405e]}, ${digits(o.r, 0x404a) - score} points`,
    o.r[0x405e] === 0 && digits(o.r, 0x404a) - score === POINTS && digits(o.r, 0x4051) === money && o.r[0x405d] === progress);
}
{
  const g = new Game(START_ROOM);
  check(`the port's new game: Monty at (${g.monty.x}, ${g.monty.y}), as the original has him`, g.monty.x === 128 && g.monty.y === 104);
  check('the leaf is in the start room: its top left cell shows an item', [0x2f, 0x33, 0x37, 0x3b].includes(g.world.cells[item.cell] ?? 0));
  const score = value(g.score.digits), money = g.money.digits.join(''), before = g.progress;
  g.monty.x = onLeaf.x; g.monty.y = onLeaf.y;
  for (let f = 0; f < 8; f++) g.step(0);
  check(`Monty on the leaf takes it: ${value(g.score.digits) - score} points, no money, no progress`,
    value(g.score.digits) - score === POINTS && g.money.digits.join('') === money && g.progress === before && g.items.collected[0] === true);
  check('and it is gone from the room', ![0x2f, 0x33, 0x37, 0x3b].includes(g.world.cells[item.cell] ?? 0));
  const after = new Game(START_ROOM);
  after.monty.x = onLeaf.x; after.monty.y = onLeaf.y;
  for (let f = 0; f < 8; f++) after.step(0);
  check(`the port, 300 logic steps on enemies after the leaf: hurt ${port(after)} times`, port(after) > 0);
  check(`the port, 300 logic steps on enemies: hurt ${port(new Game(START_ROOM))} times`, port(new Game(START_ROOM)) > 0);
}
{
  // a save of format 2 that has the shield set: loads without it, enemies hurt
  const g = new Game(START_ROOM);
  const saved = { ...snapshot(g, [null, null, null, null]), v: 2, shield: SHIELD };
  const bytes = Uint8Array.from(JSON.stringify(saved), (c) => c.charCodeAt(0));
  const loaded = CODEC.unpack(bytes, 2);
  check('a format 2 save with the shield set reads (as the current format, no flag)', loaded.v === 4 && !('shield' in loaded));
  check(`and plays with enemies hurting him (${port(restore(loaded))} hits)`, port(restore(loaded)) > 0);
  const packed = readJson(String.fromCharCode(...CODEC.pack(loaded)));
  check('the codec is format 4 and packs no shield', CODEC.format === 4 && isRecord(packed) && !("shield" in packed));
}

finish();
