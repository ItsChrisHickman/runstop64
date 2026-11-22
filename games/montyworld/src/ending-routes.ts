/**
 * The places of the reward show: where each starts Monty and the route that does what it says there (a run of the stick, a move held for some steps), found by `re/routes.ts`: a search over the game's own frames. Written by that script.
 */
export const ROUTES: readonly { room: number; spot: { x2: number; y: number; facing: number }; route: string }[] = [
  { room: 2, spot: { x2: 0x5c, y: 0xc2, facing: 0x1 }, route: '>4 J>4 .36 <4 .4 J>4 .36' },
  { room: 9, spot: { x2: 0x74, y: 0x82, facing: 0x1 }, route: '>28 v4 >4 <4 .60 >12' },
  { room: 18, spot: { x2: 0x24, y: 0xc2, facing: 0x1 }, route: 'J>4 .32 J>4 .4' },
  { room: 33, spot: { x2: 0x54, y: 0xaa, facing: 0x1 }, route: 'J>4 .32' },
  { room: 42, spot: { x2: 0x44, y: 0xca, facing: 0x1 }, route: 'J>4 .36' },
  { room: 52, spot: { x2: 0x1c, y: 0xd2, facing: 0x1 }, route: 'J4 .20 J4 .20 J4 .20 J4 .20 >4 <12 J>4 .20 J>4 .24 J>4 .32 >24' },
  { room: 58, spot: { x2: 0x54, y: 0x6a, facing: 0x1 }, route: 'J>4 .36 <4 .4 J>4 .36' },
  { room: 59, spot: { x2: 0x1c, y: 0x6a, facing: 0x1 }, route: 'J>4 .36 >12' },
  { room: 65, spot: { x2: 0x24, y: 0xb2, facing: 0x1 }, route: 'J>4 .36 <4 .4 J>4 .12' },
  { room: 69, spot: { x2: 0x38, y: 0xaa, facing: 0x1 }, route: '>100' },
  { room: 74, spot: { x2: 0x4c, y: 0x8a, facing: 0x81 }, route: 'J<4 .4' },
  { room: 76, spot: { x2: 0x7c, y: 0xba, facing: 0x81 }, route: '<8 .16 J<4 .36 <4 .4 >4' },
  { room: 77, spot: { x2: 0x5c, y: 0xca, facing: 0x1 }, route: '>200' },
];
