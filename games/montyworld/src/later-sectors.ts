import type { Sector } from '../../shared/monty/rooms';
import { ANDES_LATER_COLOURS, ANDES_LATER_NAMES, centredSector } from './andes';
import { CHINA_LATER_COLOURS, CHINA_LATER_NAMES } from './china';
import { PACIFIC_LATER_COLOURS, PACIFIC_LATER_NAMES } from './pacific';

/**
 * The sectors from 82 on: the rooms brought back or added after the sky's sectors (79-81), every region's together in one table by id (82 China's HEAVEN CAN WAIT,
 * 83-85 and 94 the Andes' returns, 86 kept for Rio's, 87-93 Hawaii's), so no region's list owns another's places. A room's sector is its id; an id no room has is an empty name.
 */
const NAMES: Readonly<Record<number, string>> = { ...CHINA_LATER_NAMES, ...ANDES_LATER_NAMES, ...PACIFIC_LATER_NAMES };
const COLOURS: Readonly<Record<number, number>> = { ...CHINA_LATER_COLOURS, ...ANDES_LATER_COLOURS, ...PACIFIC_LATER_COLOURS };
const FIRST = 82;
const LAST = Math.max(...Object.keys(NAMES).map(Number));
const IDS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
export const LATER_SECTORS: readonly Sector[] = IDS.map((id) => centredSector(NAMES[id] ?? ''));
export const LATER_COLOURS: readonly number[] = IDS.map((id) => COLOURS[id] ?? 0);
