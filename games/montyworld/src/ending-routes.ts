/**
 * The places of the reward show: where each starts Monty and the route that does what it says there (a run of the stick, a move held for some steps), found by `re/routes.ts`: a search over the game's own frames. Written by that script.
 */
export const ROUTES: readonly { room: number; spot: { x2: number; y: number; facing: number }; route: string }[] = [
  { room: 2, spot: { x2: 0x5c, y: 0xc2, facing: 0x1 }, route: '>4 J>4 .36 <4 .4 J>4 .36' },
  { room: 9, spot: { x2: 0x64, y: 0xc2, facing: 0x81 }, route: 'J<4 .36 <4 .4 <4 ^4 J4 .20 ^4' },
  { room: 18, spot: { x2: 0x24, y: 0xc2, facing: 0x1 }, route: 'J>4 .32 J>4 .4' },
  { room: 33, spot: { x2: 0x54, y: 0xaa, facing: 0x1 }, route: 'J>4 .32' },
  { room: 41, spot: { x2: 0x64, y: 0x72, facing: 0x81 }, route: '<40 .100' },
  { room: 52, spot: { x2: 0x44, y: 0xd2, facing: 0x1 }, route: '<32 J<4 .20 ^4 J>4 .20 >32 J>4 .36 <4 J>4 .36 <12' },
  { room: 55, spot: { x2: 0x84, y: 0x92, facing: 0x81 }, route: '<52' },
  { room: 59, spot: { x2: 0x5c, y: 0x7a, facing: 0x1 }, route: 'J>4 .32' },
  { room: 65, spot: { x2: 0x24, y: 0xb2, facing: 0x1 }, route: '>20 J>4 .36 <4 .4' },
  { room: 71, spot: { x2: 0x1c, y: 0x7a, facing: 0x1 }, route: '>56 v24 <8 .24 <20' },
  { room: 76, spot: { x2: 0x2c, y: 0xca, facing: 0x1 }, route: 'J<4 .20 <4 J<4 .36 <4 J<4 .32 J<4 .32 J<4 .32 >20 <4 .16 >8 <4 .16 J>4 .36 <4 .20 J>4 .24' },
  { room: 75, spot: { x2: 0x7c, y: 0xaa, facing: 0x81 }, route: '^4 J4 .20 J<4 .32 <12' },
  { room: 77, spot: { x2: 0x24, y: 0xca, facing: 0x1 }, route: '>200' },
];
