/**
 * Every Mole Crusher in every region moves through its cycle: the engine animates the first crusher of a room on the glyph bank at $10 and
 * the second (only when there are two) on the bank at $22, so a lone crusher drawn at $22 stood still (Moscow's, the Andes', the Pacific's, Japan's).
 * Each room with crushers is entered with Monty out of their way and played for a few seconds: each crusher's head must come down
 * (its glyph memory changes, the descent runs down its shaft) and go up again, and in a room of two both do. A head held by a lever (the Sambadrome's: levers.ts) is pulled whenever it is up.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/crushers.ts [--room <rooms>]
 */
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { CRUSHER_MAX_HEIGHT } from '../../shared/monty/rooms';
import { piledriverCfg as MOTR_CFG } from '../../montyotr/src/data';
import { at } from './mech-kit';
import { SCOPE } from './scope';

const cfg = WORLD.piledriverCfg;
const FRAMES = 1500; // (a crusher waits 20 to 83 frames, then comes down and goes up; a pair take turns at random)
const records = Array.from({ length: Math.floor(cfg.length / 5) }, (_, i) => ({ room: cfg[i * 5] ?? 0, col: cfg[i * 5 + 1] ?? 0, chr: cfg[i * 5 + 4] ?? 0 }));
const rooms = SCOPE.keep([...new Set(records.map((r) => r.room))].filter((r) => r > 0));

for (const room of rooms) {
  const crushers = records.filter((r) => r.room === room);
  // (as far from the crushers' columns as the room's edges allow)
  const col = crushers.every((c) => c.col - 4 > 16) ? 1 : 28;
  const s = at(room, col, 17);
  const banks = new Set<number>();
  const pictures = new Set<string>();
  let down = false, up = false, last = 0;
  const held = WORLD.levers.some((l) => l.room === room); // (a head held by a lever stamps when it is pulled: pull it whenever it is up)
  for (let f = 0; f < FRAMES; f++) {
    if (held && s.g.pd.state === 0) s.g.hold.pull = 1;
    frame(s, NONE);
    const pd = s.g.pd;
    if (pd.state === 0 || pd.index === 0xff) continue;
    banks.add(pd.index);
    if (s.g.hold.both) banks.add(1);
    const from = 0x80 + 0x90 * pd.index;
    pictures.add(`${pd.index}:${Array.from(s.g.mem.subarray(from, from + 0x30)).join()}`);
    if (pd.state === 1 && pd.position > last) down = true;
    if (pd.state === 2 && pd.position < last) up = true;
    last = pd.position;
  }
  const chars = crushers.map((c) => `$${c.chr.toString(16)}`).join(' and ');
  check(`room ${room}: ${crushers.length} crusher${crushers.length > 1 ? 's' : ''} (characters ${chars}) come down and go up (down ${down}, up ${up}, banks moved ${[...banks].join(',')}, ${pictures.size} different pictures)`,
    down && up && banks.size === crushers.length && pictures.size > 8);
}
check(`${rooms.length} rooms with crushers were found (Moscow's, Japan's and the Pacific's; the Andes' rebuild took out the Inca tunnel's)`, !SCOPE.all || rooms.length >= 4); // (the world's count: under --room, only the named rooms' crushers are run)

// Nothing is left behind: a shaft's cells are only its own characters (a column's cell i is the base + 6 * column + i, so a shaft no taller than the six
// a column of glyph memory holds), and when a crusher is away after a cycle the glyph memory and the screen are as they were on entering the room.
const GLYPHS = [0x80, 0x1a0] as const;
const shafts = (cfgBytes: Uint8Array) => Array.from({ length: Math.floor(cfgBytes.length / 5) }, (_, i) => ({
  room: cfgBytes[i * 5] ?? 0, col: cfgBytes[i * 5 + 1] ?? 0, row: cfgBytes[i * 5 + 2] ?? 0, height: cfgBytes[i * 5 + 3] ?? 0, chr: cfgBytes[i * 5 + 4] ?? 0,
}));
const tall = (list: ReturnType<typeof shafts>) => list.filter((c) => c.height < 1 || c.height > CRUSHER_MAX_HEIGHT).map((c) => `${c.room}:${c.height}`);
check(`Monty on the Run's crushers are no taller than ${CRUSHER_MAX_HEIGHT} cells`, tall(shafts(MOTR_CFG)).length === 0);
check(`every region's crushers are no taller than ${CRUSHER_MAX_HEIGHT} cells (${tall(shafts(cfg)).join(' ')})`, tall(shafts(cfg)).length === 0);

for (const room of rooms) {
  const mine = shafts(cfg).filter((r) => r.room === room);
  const col = mine.every((c) => c.col - 4 > 16) ? 1 : 28;
  const s = at(room, col, 17);
  const shaftCells = mine.flatMap((c) => Array.from({ length: c.height * 3 }, (_, k) => SCREEN + (c.row + (k % c.height)) * ROW + c.col + Math.floor(k / c.height)));
  const screen = () => shaftCells.map((a) => s.g.mem[a] ?? 0);
  const glyphs = () => s.g.mem.slice(GLYPHS[0], GLYPHS[1]);
  const before = { screen: screen(), glyphs: glyphs() };
  let cycles = 0, was = 0, wrong = 0;
  const held = WORLD.levers.some((l) => l.room === room);
  for (let f = 0; f < 3000 && cycles < 3; f++) {
    if (held && s.g.pd.state === 0 && f % 100 === 0) s.g.hold.pull = 1;
    frame(s, NONE);
    if (was !== 0 && s.g.pd.state === 0) {
      cycles++;
      if (screen().join() !== before.screen.join() || glyphs().join() !== before.glyphs.join()) wrong++;
    }
    was = s.g.pd.state;
  }
  const own = mine.every((c) => Array.from({ length: c.height * 3 }, (_, k) => {
    const column = Math.floor(k / c.height), i = k % c.height;
    return s.g.mem[SCREEN + (c.row + i) * ROW + c.col + column] === c.chr + 6 * column + i;
  }).every(Boolean));
  check(`room ${room}: after ${cycles} cycles the crushers' cells and glyphs are the room's own again (${wrong} differ) and a shaft holds only its own characters`, cycles >= 3 && wrong === 0 && own);
}
finish();
