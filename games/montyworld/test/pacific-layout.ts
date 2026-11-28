/**
 * Hawaii's nineteen rooms as drawn, checked for what a picture can hide: no coin or find in a wall or under a decoration (the decoration's characters would replace the coin's; a backdrop, Hana's sea, is
 * drawn under them), no decoration on a wall, no creature
 * starting in a wall, the joins as the design says (pacific-mechanisms.ts checks every opening against the next room's: no open row meets a wall), each room's decorations within the 101 characters a room has, and each creature in no more than two rooms.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-layout.ts [--room <rooms>]   (--room: the named rooms' own checks; the region's totals are always checked)
 */
import { check, finish } from '../../shared/test/check';
import { scopedRooms } from './scope';
import { WORLD_DECOR } from '../src/art/world';
import { isBackdrop } from '../src/layout';
import { PAC, PACIFIC_ROOMS } from '../src/pacific';

const ROOMS = PACIFIC_ROOMS;
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { creatureRooms } from './route';

const NAME = new Map<number, string>(Object.entries(PAC).map(([k, v]) => [v, k]));
const names = Object.values(WORLD_DECOR);
const decorNames = Object.keys(WORLD_DECOR);

for (const r of scopedRooms(ROOMS)) {
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
      if (!isBackdrop(decorNames[d.type] ?? '')) decor.add(`${c},${row}`);
      if (solid(c, row)) check(`${label}: a decoration sits on a wall at ${c},${row}`, false);
    }
  }
  check(`${label}: decorations take ${chars} characters, 101 at most`, chars <= 101);
  for (const [c, row] of r.coins ?? []) {
    check(`${label}: the coin at ${c},${row} is in the open`, !solid(c, row));
    check(`${label}: the coin at ${c},${row} is not under a decoration`, !decor.has(`${c},${row}`));
  }
  for (const item of [r.item, r.item2]) {
    if (!item) continue;
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
// (the challenge pass, 2026-11-27, gave every room its creatures: the islands' own, the shark back in the swim, and a few of other places' that are Hawaii's too: the frigatebird, the hoary bat, the mynah, the zebra dove, the mongoose, a whaling captain, a volleyball)
check(`at least sixteen kinds of creature and Viktor Vole aboard the ship (${rooms.size})`, rooms.size >= 17);
check(`twenty-two rooms: four islands, three swims, the bonus beach west of the luau and the summit's bonus rooms either side (${PACIFIC_ROOMS.length})`, PACIFIC_ROOMS.length === 22);
const coins = ROOMS.map((r) => r.coins?.length ?? 0);
const THREE: readonly number[] = [PAC.beach, PAC.waiau]; // (the bonus rooms with a coin a cone or shelf and one over the crossing)
check(`one to two coins a room (three in the bonus beach and on the ice), each with its reason (${coins.join(', ')}: ${coins.reduce((a, b) => a + b, 0)})`, ROOMS.every((r, i) => (coins[i] ?? 0) >= 1 && (coins[i] ?? 0) <= (THREE.includes(r.id) ? 3 : 2)));
finish();
