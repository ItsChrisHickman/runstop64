/**
 * Rio's rooms as drawn, checked for what a picture can hide: no coin or find in a wall or under a decoration (the decoration's characters would replace the coin's; a backdrop keeps it), no decoration on a wall, no creature
 * starting in a wall, the joins as the design says (rio-mechanisms.ts checks every opening against the next room's: no open row meets a wall), each room's decorations within the 101 characters a room has, and each creature in no more than two rooms.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-layout.ts [--room <rooms>]   (--room: the named rooms' own checks; the region's totals are always checked)
 */
import { check, finish } from '../../shared/test/check';
import { scopedRooms } from './scope';
import { WORLD_DECOR } from '../src/art/world';
import { RIO_ROOM, RIO_ROOMS } from '../src/rio';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { DECOR_LIBRARY, WORLD } from '../src/data';
import { creatureRooms } from './route';

const NAME = new Map<number, string>(Object.entries(RIO_ROOM).map(([k, v]) => [v, k]));
const names = Object.values(WORLD_DECOR);

for (const r of scopedRooms(RIO_ROOMS)) {
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
    if (typeof d.type !== 'number') { // a sign: a character a letter, its cells a decoration's
      chars += d.type.text.length;
      for (let x = 0; x < d.type.text.length; x++) decor.add(`${d.col - PLAY_COL + x},${d.row - PLAY_ROW}`);
      continue;
    }
    const type = names[d.type];
    if (!type) continue;
    if (!seen.has(d.type)) { seen.add(d.type); chars += type.w * type.h; }
    const backdrop = DECOR_LIBRARY[d.type]?.backdrop === true; // (a backdrop keeps a coin in it: the engine draws the coin over it)
    for (let y = 0; y < type.h; y++) for (let x = 0; x < type.w; x++) {
      const c = d.col - PLAY_COL + x, row = d.row - PLAY_ROW + y;
      if (!backdrop) decor.add(`${c},${row}`);
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

// (the beach's creatures are the finale's troupe, off the picture until it walks them on: not creatures met in play)
const rooms = creatureRooms(RIO_ROOMS.filter((r) => r.id !== RIO_ROOM.bust));
for (const [type, where] of rooms) check(`creature ${type} is in at most two of Rio's play rooms (${[...where].join(', ')})`, where.size <= 2);
check(`about 8 to 14 kinds of creature (${rooms.size})`, rooms.size >= 8 && rooms.size <= 14);
check('seven play rooms and the beach', RIO_ROOMS.length === 8);
finish();
