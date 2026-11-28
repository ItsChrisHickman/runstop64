/**
 * The places of the reward show: where each starts Monty, the route that does what it says there (a run of the stick, a move held for some steps) and the encore after it that keeps him on the go till the
 * place ends (no creature walks through him), found by `re/routes.ts`: searches over the game's own frames. Written by that script.
 */
export const ROUTES: readonly { room: number; spot: { x2: number; y: number; facing: number }; route: string; encore?: string }[] = [
  { room: 2, spot: { x2: 0x5c, y: 0xc2, facing: 0x1 }, route: '>4 J>4 .36 <4 .4 J>4 .36', encore: '<4 .4 J<4 .36 <4 .4 J<4 .36 <4 .4 J<4 .36 <4 .4 J4 .36 <4 .4 <16 J<4 .36 <4 .4 J<4 .36 <4' },
  { room: 9, spot: { x2: 0x64, y: 0xc2, facing: 0x81 }, route: 'J<4 .36 <4 .4 <4 ^4 J4 .20 ^4', encore: '^24 J>4 .32 >28 J>4 .36 <4 .4 <4 v32 <8 J<4 .36 <4 .36 <8 J<4 .36 v4 >4' },
  { room: 18, spot: { x2: 0x24, y: 0xc2, facing: 0x1 }, route: 'J>4 .32 J>4 .4', encore: '.32 <4 .20 <4 J<4 .32 <32 J>4 .32 J>4 .32 >4 J>4 .32 >52 J>4 .32 J>4 .24' },
  { room: 33, spot: { x2: 0x44, y: 0xaa, facing: 0x1 }, route: 'J>4 .36', encore: '<4 .4 <36 J<4 .36 J<4 .36 <4 .12 >16 v40 >8 ^40 .4 >36 J>4 .36 <4 .4 <28' },
  { room: 42, spot: { x2: 0x74, y: 0xc2, facing: 0x1 }, route: '>12 J4 .32 J>4 .24', encore: '.8 J<4 .36 <4 .36 J<4 .32 J<4 .36 <4 .36 J>4 .36 >4 .4 >4 ^4 J>4 .32 >16 .12' },
  { room: 92, spot: { x2: 0x44, y: 0xba, facing: 0x81 }, route: 'J<4 .36 <4 .4 J<4 .12', encore: '.20 <8 >4 J>4 .36 >4 .20 >24 J>4 .36 >12 ^12 J>4 .20 >12 J<4 .36 <4 .4 <8 J<4 .36 <4 .16' },
  { room: 55, spot: { x2: 0x84, y: 0x92, facing: 0x81 }, route: '<52', encore: '<96 ^4 <40 ^4 >76 <36 ^8 <40 ^4 >40' },
  { room: 59, spot: { x2: 0x5c, y: 0x7a, facing: 0x1 }, route: 'J>4 .28', encore: '.4 <12 >4 J>4 .32 >64 <76 .16 <20 J<4 .36 <4 .20 >4 J4 .36 >4 .4 >20' },
  { room: 65, spot: { x2: 0x34, y: 0xb2, facing: 0x1 }, route: 'J>4 .36 >8 .16 >4', encore: '>8 <20 ^32 <8 v8 .16 J>4 .32 J>4 .32 v32 >4 v20 ^4 >4 J4 .32 ^20 J>4 .32 >12' },
  { room: 71, spot: { x2: 0x6c, y: 0x82, facing: 0x1 }, route: '^4 J>4 .20 J>4 .32 >8 <4', encore: '<12 J>4 .36 >4 J>4 .36 <4 .32 <48 .48 <4 ^8 J<4 .36 ^24 J>4 .16' },
  { room: 76, spot: { x2: 0x2c, y: 0xca, facing: 0x1 }, route: '>8 <4 J>4 .36 >12 <8 ^4 <4 >12 ^4 J>4 .36 <4 .4 J>4 .4', encore: '.16 >4 ^60 <4 .4 J<4 .36 <4 .28 <40 J<4 .36 <4 .4' },
  { room: 75, spot: { x2: 0x7c, y: 0xaa, facing: 0x81 }, route: '^4 J4 .20 J<4 .32 <12', encore: '>12 J<4 .36 <4 .4 <16 ^20 J>4 .20 >20 ^4 J<4 .36 <8 J4 .40 <12 .32 J<4 .32 <8' },
  { room: 77, spot: { x2: 0x24, y: 0xca, facing: 0x1 }, route: '>200' },
];
