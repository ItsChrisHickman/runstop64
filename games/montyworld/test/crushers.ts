/**
 * Every Mole Crusher in every region moves through its cycle: the engine animates the first crusher of a room on the glyph bank at $10 and
 * the second (only when there are two) on the bank at $22, so a lone crusher drawn at $22 stood still (Moscow's, the Andes', the Pacific's, Japan's).
 * Each room with crushers is entered with Monty out of their way and played for a few seconds: each crusher's head must come down
 * (its glyph memory changes, the descent runs down its shaft) and go up again, and in a room of two both do.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/crushers.ts
 */
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { at } from './mech-kit';

const cfg = WORLD.piledriverCfg;
const FRAMES = 1500; // (a crusher waits 20 to 83 frames, then comes down and goes up; a pair take turns at random)
const records = Array.from({ length: Math.floor(cfg.length / 5) }, (_, i) => ({ room: cfg[i * 5] ?? 0, col: cfg[i * 5 + 1] ?? 0, chr: cfg[i * 5 + 4] ?? 0 }));
const rooms = [...new Set(records.map((r) => r.room))].filter((r) => r > 0);

for (const room of rooms) {
  const crushers = records.filter((r) => r.room === room);
  // (as far from the crushers' columns as the room's edges allow)
  const col = crushers.every((c) => c.col - 4 > 16) ? 1 : 28;
  const s = at(room, col, 17);
  const banks = new Set<number>();
  const pictures = new Set<string>();
  let down = false, up = false, last = 0;
  for (let f = 0; f < FRAMES; f++) {
    frame(s, NONE);
    const pd = s.g.pd;
    if (pd.state === 0 || pd.index === 0xff) continue;
    banks.add(pd.index);
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
check(`${rooms.length} rooms with crushers were found`, rooms.length >= 5);
finish();
