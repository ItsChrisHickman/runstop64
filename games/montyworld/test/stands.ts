/**
 * Decorations that stand on something (a lamp, a bench, a sign on its post, a tree, a statue, a palm) have solid cells directly under their foot
 * (Chris on the metro sign: its post floated over the floor). `STANDS` names them; a sign on a wall is not on it.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/stands.ts
 */
import { check, finish } from '../../shared/test/check';
import type { RoomSpec } from '../../shared/monty/rooms';
import { ANDES_ALL_ROOMS } from '../src/andes';
import { WORLD_DECOR } from '../src/art/world';
import { CHINA_ROOMS } from '../src/china';
import { JAPAN_ROOMS } from '../src/japan';
import { MOSCOW_ROOMS } from '../src/moscow';
import { PACIFIC_ROOMS } from '../src/pacific';
import { RIO_ROOMS } from '../src/rio';
import { SIBERIA_ROOMS } from '../src/siberia';
import { WORLD } from '../src/data';
import { inRoom } from './climb-kit';

const STANDS = new Set(['lampStreet', 'lampDouble', 'metroSign', 'bench', 'firTree', 'lampPost', 'palm', 'parasol', 'deckchair', 'restTable', 'saladBar', 'rotisserie', 'roundTree', 'lionStatue', 'intihuatana', 'pacTikiTorch', 'pacTotem', 'pacHibiscus', 'pacRoastPig', 'torch', 'jpToro', 'jpBonsai', 'jpPine', 'jpPineBig', 'jpVending', 'jpAndon', 'noodleStall', 'stall', 'marketStall', 'samovar']);
const ROOMS: readonly RoomSpec[] = [...MOSCOW_ROOMS, ...SIBERIA_ROOMS, ...CHINA_ROOMS, ...JAPAN_ROOMS, ...PACIFIC_ROOMS, ...ANDES_ALL_ROOMS, ...RIO_ROOMS];
const entries = Object.entries(WORLD_DECOR);

let checked = 0;
const floating: string[] = [];
for (const r of ROOMS) {
  const s = inRoom(WORLD, r.id);
  if (!s) continue;
  for (const d of r.decor ?? []) {
    if (typeof d.type === 'object') continue;
    const entry = entries[d.type];
    if (entry === undefined || !STANDS.has(entry[0])) continue;
    const [name, size] = entry;
    checked++;
    const below = d.row + size.h;
    const under = Array.from({ length: size.w }, (_, i) => { const f = s.g.flagAt(below, d.col + i); return f === 1 || f === 2; });
    if (!under.every(Boolean)) floating.push(`room ${r.id}: ${name} at ${d.col - 4},${d.row - 3} (${size.w} x ${size.h}) has ${under.filter((u) => !u).length} of ${size.w} cells under it empty`);
  }
}
for (const f of floating) console.log(f);
check(`${checked} decorations that stand have solid cells under their foot`, floating.length === 0);
finish();
