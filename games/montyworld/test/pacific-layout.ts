/**
 * The Pacific's rooms as drawn, checked for what a picture can hide: no coin or find in a wall or under a decoration (the decoration's characters would replace the coin's), no decoration on a wall, no creature
 * starting in a wall, the joins as the design says (pacific-mechanisms.ts checks every opening against the next room's: no open row meets a wall), each room's decorations within the 101 characters a room has, and each creature in no more than two rooms.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-layout.ts
 */
import { check, finish } from '../../shared/test/check';
import { WORLD_DECOR } from '../src/art/world';
import { PAC, PACIFIC_EXTRA_ROOMS, PACIFIC_ROOMS } from '../src/pacific';

const ROOMS = [...PACIFIC_ROOMS, ...PACIFIC_EXTRA_ROOMS];
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { creatureRooms } from './route';

const NAME = new Map<number, string>(Object.entries(PAC).map(([k, v]) => [v, k]));
const names = Object.values(WORLD_DECOR);

for (const r of ROOMS) {
  const label = NAME.get(r.id) ?? String(r.id);
  /** A wall: a cell of a tile of the collision class that stops him (1), not the sea's or a rope's. */
  const solid = (col: number, row: number) => {
    const code = Number(r.map[row]?.[col] ?? '0');
    const tile = code > 0 ? r.tiles[code - 1] : undefined;
    return tile !== undefined && WORLD.tileProperty(tile) === 1;
  };
  const decor = new Set<string>();
  let chars = 0;
  const seen = new Set<number>();
  for (const d of r.decor ?? []) {
    if (typeof d.type !== 'number') continue; // (a sign's letters)
    const type = names[d.type];
    if (!type) continue;
    if (!seen.has(d.type)) { seen.add(d.type); chars += type.w * type.h; }
    for (let y = 0; y < type.h; y++) for (let x = 0; x < type.w; x++) {
      const c = d.col - PLAY_COL + x, row = d.row - PLAY_ROW + y;
      decor.add(`${c},${row}`);
      if (solid(c, row)) check(`${label}: a decoration sits on a wall at ${c},${row}`, false);
    }
  }
  check(`${label}: decorations take ${chars} characters, 101 at most`, chars <= 101);
  for (const [c, row] of r.coins ?? []) {
    check(`${label}: the coin at ${c},${row} is in the open`, !solid(c, row));
    check(`${label}: the coin at ${c},${row} is not under a decoration`, !decor.has(`${c},${row}`));
  }
  if (r.item) {
    const { item } = r;
    const at = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => `${item.col - PLAY_COL + (x ?? 0)},${item.row - PLAY_ROW + (y ?? 0)}`);
    check(`${label}: the ${item.name} is in the open`, at.every((p) => { const [c, row] = p.split(',').map(Number); return !solid(c ?? 0, row ?? 0); }));
    check(`${label}: the ${item.name} is not under a decoration`, at.every((p) => !decor.has(p)));
  }
  for (const e of r.enemies ?? []) {
    check(`${label}: a creature starts in the open at ${e.col - PLAY_COL},${e.row - PLAY_ROW}`, !solid(e.col - PLAY_COL, e.row - PLAY_ROW));
  }
}

const rooms = creatureRooms(ROOMS);
for (const [type, where] of rooms) check(`creature ${type} is in at most two rooms of the Pacific (${[...where].join(', ')})`, where.size <= 2);
check(`about 8 to 16 kinds of creature (${rooms.size})`, rooms.size >= 8 && rooms.size <= 16);
check('seventeen rooms of the first build and three of the second pass', PACIFIC_ROOMS.length === 17 && PACIFIC_EXTRA_ROOMS.length === 3);
finish();
