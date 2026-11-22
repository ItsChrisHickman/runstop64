/**
 * China's rooms drawn within the engine's means: a room's decorations take their characters from $9B up (101 in all, a type once however often it is placed: one that
 * does not fit is silently not drawn), and a decoration drawn over a solid, floor or rope cell would make it passable, over a coin would hide it. Checked for every room.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/china-art.ts
 */
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { check, finish } from '../../shared/test/check';
import { MOTR_TILE_COUNT } from '../src/art/tiles';
import { WORLD_DECOR, WORLD_TILE_LIST } from '../src/art/world';
import { CHINA_ROOMS } from '../src/china';

const DECOR_POOL = 0xff - 0x9b; // (the engine skips a type that would run past $FF: 100 characters)
const decorTypes = Object.values(WORLD_DECOR);
/** Pieces drawn over cells on purpose: a window set into a wall, the junk's picture over the quay's end wall, a boat on the river's far water (the water under it is deadly still). */
const OVER_ON_PURPOSE: readonly object[] = [WORLD_DECOR.latticeWindow, WORLD_DECOR.junk, WORLD_DECOR.plateBoat];

for (const room of CHINA_ROOMS) {
  const name = `room $${room.id.toString(16)}`;
  const placed = (room.decor ?? []).flatMap((d) => (typeof d.type === 'number' ? [{ d, t: decorTypes[d.type] }] : []));
  const used = new Set((room.decor ?? []).map((d) => d.type));
  const chars = [...used].reduce<number>((n, type) => n + (typeof type === 'number' ? (decorTypes[type]?.w ?? 0) * (decorTypes[type]?.h ?? 0) : 0), 0);
  const signs = (room.decor ?? []).filter((d) => typeof d.type !== 'number').length;
  check(`${name}: its decorations take ${chars} of the ${DECOR_POOL} characters (signs: ${signs})`, chars + signs * 6 <= DECOR_POOL);
  const covered: string[] = [];
  for (const { d, t } of placed) {
    if (!t || OVER_ON_PURPOSE.includes(t)) continue;
    for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) {
      const col = d.col + c - PLAY_COL, row = d.row + r - PLAY_ROW;
      const code = Number(room.map[row]?.[col] ?? '.');
      if (Number.isNaN(code) || code === 0) continue;
      const tile = WORLD_TILE_LIST[(room.tiles[code - 1] ?? 0) - MOTR_TILE_COUNT];
      if (tile && tile.cls !== 0) covered.push(`(${col},${row})`);
    }
  }
  check(`${name}: no decoration over a solid, floor or rope cell${covered.length ? ' ' + covered.slice(0, 8).join(' ') : ''}`, covered.length === 0);
  const hidden = (room.coins ?? []).filter(([cc, cr]) => placed.some(({ d, t }) => t && cc >= d.col - PLAY_COL && cc < d.col - PLAY_COL + t.w && cr >= d.row - PLAY_ROW && cr < d.row - PLAY_ROW + t.h));
  check(`${name}: no coin under a decoration${hidden.length ? ' ' + hidden.map(([c, r]) => `(${c},${r})`).join(' ') : ''}`, hidden.length === 0);
}
finish();
