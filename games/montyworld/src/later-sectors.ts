import type { Sector } from '../../shared/monty/rooms';
import { ANDES_LATER_COLOURS, ANDES_LATER_NAMES, centredSector } from './andes';
import { CHINA_LATER_COLOURS, CHINA_LATER_NAMES } from './china';
import { JAPAN_LATER_COLOURS, JAPAN_LATER_NAMES } from './japan';
import { PACIFIC_LATER_COLOURS, PACIFIC_LATER_NAMES } from './pacific';
import { SIBERIA_LATER_COLOURS, SIBERIA_LATER_NAMES } from './siberia';

/**
 * The sectors from 82 on (`LATER_FROM`): the rooms brought back or added after the sky's sectors (79-81), every region's together in one table by id (82 China's HEAVEN CAN WAIT,
 * 83-85 and 94 the Andes' returns, 86 kept for Rio's, 87-93 Hawaii's, 95-97 the bonus rooms off the path: Siberia's OFF THE BEATEN PATH, China's DON'T ROCK THE BOAT, Japan's
 * SHOOT FOR THE MOON), so no region's list owns another's places. A room's sector is its id; an id no room has is an empty name. The one owner of the later rooms' sectors;
 * their table places are data.ts's `ADDED` (last, so no save's places move).
 */
const NAMES: Readonly<Record<number, string>> = { ...CHINA_LATER_NAMES, ...ANDES_LATER_NAMES, ...PACIFIC_LATER_NAMES, ...SIBERIA_LATER_NAMES, ...JAPAN_LATER_NAMES };
const COLOURS: Readonly<Record<number, number>> = { ...CHINA_LATER_COLOURS, ...ANDES_LATER_COLOURS, ...PACIFIC_LATER_COLOURS, ...SIBERIA_LATER_COLOURS, ...JAPAN_LATER_COLOURS };
/** The first later sector: the one after the regions' own lists (data.ts checks they end there). */
export const LATER_FROM = 82;
const FIRST = LATER_FROM;
const LAST = Math.max(...Object.keys(NAMES).map(Number));
const IDS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
export const LATER_SECTORS: readonly Sector[] = IDS.map((id) => centredSector(NAMES[id] ?? ''));
export const LATER_COLOURS: readonly number[] = IDS.map((id) => COLOURS[id] ?? 0);
