/**
 * The places of the reward show: where each starts Monty and the route that does what it says there (a run of the stick, a move held for some steps), found by `re/routes.ts`: a search over the game's own frames. Written by that script.
 */
import { AND } from './andes';
import { CHI } from './china';
import { JP } from './japan';
import { ROOM } from './moscow';
import { PAC } from './pacific';
import { RIO_ROOM } from './rio';
import { SIB } from './siberia';

const start = { x2: 0x14, y: 0xca, facing: 0x01 } as const;
export const ROUTES: readonly { room: number; spot: { x2: number; y: number; facing: number }; route: string }[] = [
  ROOM.square, SIB.gravy, CHI.wall, JP.garden, PAC.lei, PAC.mauna, AND.thin, AND.rock, AND.river, RIO_ROOM.sugar, RIO_ROOM.steak, RIO_ROOM.float, RIO_ROOM.bust,
].map((room) => ({ room, spot: start, route: '>40 .40' }));
