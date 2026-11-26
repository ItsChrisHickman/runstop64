import { C5_START } from './mechanisms';
import type { MontyFound } from './map';
import { noTravel } from './map';
import type { MontyData } from './montydata';
import type { MontySave } from './save';
import { wayIn } from './way-in';

/**
 * NEW GAME+ (`MontyEnding.newGamePlus`: Do Svidaniya Monty's), the one owner: after a win, the title's CONTINUE and NEW GAME both begin a game at the very
 * beginning (the game's start) with the whole map open for travel, every room of the exit grid and not only those visited (`openMap`), and every key item
 * his, as taken (so every gate is open), in the game's NEW GAME+ costume (`plusStart`). The rest is fresh: Viktor and the creatures, the lever, the coins and
 * the snacks (they are the score), the lives and the score itself. The session (session.ts) begins it; the save keeps that it is one (`MontySave.plus`).
 */

/** A special item taken, as the game marks it (items.ts). */
const TAKEN = 0x81;

/** The save NEW GAME+ begins from: the game's start, the key items taken, nothing else, the costume on (a save, so ENTER CONTINUE on the title begins it too). */
export function plusStart(data: MontyData, worn: number | null): MontySave {
  const { start, exitGrid, progress } = data;
  const items = Array.from({ length: data.specialItems.length / 4 }, () => 0);
  for (const i of progress.keyItems) items[i] = TAKEN;
  return {
    v: 1,
    roomId: exitGrid.image[start.mapRow * exitGrid.cols + start.exitCol] ?? 0,
    x2: start.x2, y: start.y, mapRow: start.mapRow, exitCol: start.exitCol, facing: start.facing,
    lives: 5, score: 0,
    coins: Array.from({ length: data.coinTable.length / 3 }, () => 0), items, exitGrid: [...exitGrid.image], c5FallStage: C5_START.fallStage, c5: { ...C5_START },
    ...(worn === null ? {} : { worn }),
    plus: true,
  };
}

/**
 * The map NEW GAME+ begins with: every room of the exit grid a place to travel to (but the ending's, and runstop64's rooms, which are not the game's), each
 * where he came into it if he has been in it (`found`), else where it is come into (way-in.ts `wayIn`); a room he can stand nowhere in is left for him to find.
 */
export function openMap(data: MontyData, found: MontyFound): MontyFound {
  const rooms = { ...found.rooms };
  const { image, cols } = data.exitGrid;
  image.forEach((id, cell) => {
    if (id === 0xff || String(id) in rooms || noTravel(data, id) || data.isExtensionRoom(id)) return;
    const way = wayIn(data, id);
    if (way) rooms[id] = [way.x2, way.y, Math.floor(cell / cols), cell % cols];
  });
  return { ...found, rooms };
}
