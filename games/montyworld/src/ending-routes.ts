/**
 * The places of the reward show: where each starts Monty, the route that does what it says there (a run of the stick, a move held for some steps) and the encore after it that keeps him on the go till the
 * place ends (no creature walks through him), found by `re/routes.ts`: searches over the game's own frames. Written by that script.
 */
export const ROUTES: readonly { room: number; spot: { x2: number; y: number; facing: number }; route: string; encore?: string }[] = [
  { room: 2, spot: { x2: 0x5c, y: 0xc2, facing: 0x1 }, route: '>4 J>4 .36 <4 .4 J>4 .36', encore: '<4 .4 >8 <28 J<4 .36 <4 .4 >4 <12 J<4 .36 <4 .4 >8 J<4 .36 <4 .4 >8 J<4 .36 <4 .4 >8 J<4 .28' },
  { room: 9, spot: { x2: 0x64, y: 0xc2, facing: 0x81 }, route: 'J<4 .36 <4 .4 <4 ^4 J4 .20 ^4', encore: '^24 J>4 .32 >12 J>4 .36 <4 .4 >16 v48 <12 J<4 .36 <4 .20 <8 J<4 .36 v4 >4' },
  { room: 18, spot: { x2: 0x24, y: 0xc2, facing: 0x1 }, route: 'J>4 .32 J>4 .4', encore: '.32 <4 .20 <4 J<4 .32 <32 J>4 .32 J>4 .32 >4 J>4 .32 >4 J>4 .36 <4 .4 <4 J>4 .36 J>4 .16' },
  { room: 33, spot: { x2: 0x54, y: 0xaa, facing: 0x1 }, route: '>8', encore: '<8 J<4 .36 <4 .4 <36 v8 >4 v32 <4 ^48 <4 J>4 .36 <4 .12 <72 J<4 .36 <4 .4 >24' },
  { room: 41, spot: { x2: 0x3c, y: 0x72, facing: 0x1 }, route: '<4', encore: '>4 ^16 >44 J>4 .36 <4 .4 >12 J>4 .36 <4 .100 <28 J<4 .36 <4 .4 <24 J<4 .24' },
  { room: 52, spot: { x2: 0x6c, y: 0xaa, facing: 0x1 }, route: 'J>4 .36 <8 J>4 .20 ^4 J<4 .16', encore: '.4 >8 v4 J<4 .32 <4 J<4 .32 <12 J<4 .20 ^12 J<4 .32 <12 J>4 .36 >4 J>4 .36 <4 .8 <16 J>4' },
  { room: 55, spot: { x2: 0x84, y: 0x92, facing: 0x81 }, route: '<52', encore: '<60 ^4 <20 >16 <32 >4 <28 v12 >20 v4 <20 v8 >20 v4 <28 >24 <8 >36' },
  { room: 59, spot: { x2: 0x5c, y: 0x7a, facing: 0x1 }, route: 'J>4 .32', encore: '>12 J<4 .36 <4 .20 >4 <16 J<4 .36 <4 .4 J<4 .36 <4 .4 <4 v8 >4 v16 <4 v16 >4 v16 <4 v16 >8 v8 >64' },
  { room: 65, spot: { x2: 0x24, y: 0xb2, facing: 0x1 }, route: '>20 J>4 .36 <4 .4', encore: '.8 >20 J<4 .44 ^8 v8 >4 ^52 >12 v24 ^44 <4 J<4 .20 v24 <12 J<4 .36' },
  { room: 71, spot: { x2: 0x1c, y: 0x7a, facing: 0x1 }, route: '>56 v24 <8 .24 <20', encore: '>12 J>4 .36 >12 ^20 <4 ^16 >4 ^16 J<4 .20 J>4 .36 <40 >12 J<4 .24' },
  { room: 69, spot: { x2: 0x1c, y: 0x7a, facing: 0x1 }, route: '>52', encore: 'J>4 .36 <4 .52 <8 v24 J>4 .32 >28 J>4 .36 <4 .28 J<4 .36 <4 .4 >8 <28' },
  { room: 75, spot: { x2: 0x7c, y: 0xaa, facing: 0x81 }, route: '^4 J4 .20 J<4 .32 <12', encore: '>12 J<4 .36 <4 .4 <16 ^20 J>4 .20 J<4 .36 <4 .32 <20 >20 v40 >4 J>4 .36 <4' },
  { room: 77, spot: { x2: 0x24, y: 0xca, facing: 0x1 }, route: '>200' },
];
