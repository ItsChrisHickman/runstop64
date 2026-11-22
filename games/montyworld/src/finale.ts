import { FRAME } from '../../shared/monty/frames';
import { PLAY_COL, PLAY_ROW, ROW } from '../../shared/monty/screen';
import { wait, type Seq } from '../../shared/monty/deaths';
import { pixelY } from '../../montyotr/src/cells';
import type { Game } from '../../montyotr/src/game';
import { gameOver } from '../../montyotr/src/scripts';
import { BEACH_HORIZON, BEACH_VIEW } from './rio';
import { SUN_MASK_POINTER, SUN_POINTER } from './rio-pointers';

/**
 * Do Svidaniya Monty's finale (the data's `completion`), Monty on the Run's manner (a short play that runs by itself once the treasure is touched, then GAME OVER and the title): on Copacabana at dusk Monty takes the acai bowl, strolls along the
 * promenade to the rail and eats it in three scoops while the sun sets into the sea and the Redeemer is floodlit. The room is the beach itself (no other is loaded); the figures are sprites:
 * Monty (3), the bowl (0, the treasure's), the sun (6, behind the characters and behind the black block of sprite 5 that is the sea below the horizon) and, over his head, his headdress (7).
 */

/** The beach's far shore (playfield cells, rio.ts `bust`): the Redeemer on Corcovado and Sugarloaf. */
const { redeemer: REDEEMER, sugarloaf: SUGARLOAF } = BEACH_VIEW;
/** The sprites: the sun, and the black block under the horizon that hides it as it sets (both behind the characters, the block in front of the sun). */
const SUN_SPRITE = 6, SUN_BIT = 0x40, MASK_SPRITE = 5, MASK_BIT = 0x20;
/** The horizon: the top row of the sea, which the sun sinks behind. */
const HORIZON = BEACH_HORIZON;
/** Where he stops on the promenade (sprite x, halved) and how far the sun is from the horizon's top, in frames. */
const STOP = 0x5c, SET_FRAMES = 600;

/** The colour of the cells of a block of the room. */
function tint(g: Game, c: { col: number; row: number; w: number; h: number }, colour: number) {
  for (let r = 0; r < c.h; r++) for (let k = 0; k < c.w; k++) g.col[(c.row + r + PLAY_ROW) * ROW + c.col + k + PLAY_COL] = colour;
}

/** His headdress, over his head again (the engine puts a costume's sprite on only while he is playing). */
function crown(g: Game) {
  const over = g.data.costumes.find((c) => c.item === g.worn)?.over;
  const at = over?.frames.get(g.sptr[3] ?? 0);
  if (!over || !at) { g.enable &= ~0x80 & 0xff; return; }
  g.sx[7] = ((g.sx[3] ?? 0) + at.dx / 2) & 0xff;
  g.sy[7] = ((g.sy[3] ?? 0) + at.dy) & 0xff;
  g.sptr[7] = at.ptr;
  g.scol[7] = over.colour;
  g.enable |= 0x80;
}

/** Completion.Begin: the treasure is touched. */
export function* completion(g: Game): Seq {
  g.freeze = 1;
  g.completionActive = 1;
  g.ending = { aboard: true, mc1: g.vic.mc1, mc2: g.vic.mc2 };
  g.actionCounter = 0;
  g.sound.song(2);
  // the sun: a big disc (expanded) sitting over the sea's far edge, behind the characters
  const sunY0 = pixelY(HORIZON) - 42;
  g.sx[SUN_SPRITE] = 0x4a; g.sy[SUN_SPRITE] = sunY0; g.sptr[SUN_SPRITE] = SUN_POINTER; g.scol[SUN_SPRITE] = 7;
  g.sx[MASK_SPRITE] = 0x4a; g.sy[MASK_SPRITE] = pixelY(HORIZON); g.sptr[MASK_SPRITE] = SUN_MASK_POINTER; g.scol[MASK_SPRITE] = 0;
  const both = SUN_BIT | MASK_BIT;
  g.expandX |= both; g.expandY |= both; g.priority |= both; g.multicolour &= ~both & 0xff;
  g.enable |= both;
  let tick = 0, face: 'left' | 'right' = g.facing & 0x80 ? 'left' : 'right';
  const frameOf = (stand: boolean) => (face === 'left' ? FRAME.walkLeft : FRAME.walkRight) + (stand ? 0 : (tick >> 2) & 3);
  const step = function* (frames: number, dx: number, bob: (n: number) => number): Seq {
    for (let n = 0; n < frames; n++) {
      yield;
      tick++;
      if (tick % 2 === 0) g.sx[3] = ((g.sx[3] ?? 0) + dx) & 0xff;
      g.sptr[3] = frameOf(dx === 0);
      g.sx[0] = ((g.sx[3] ?? 0) + (face === 'left' ? -8 : 10)) & 0xff;
      g.sy[0] = ((g.sy[3] ?? 0) + 4 + bob(n)) & 0xff;
      g.sptr[0] = bowlPointer(g);
      g.scol[0] = 4;
      g.enable |= 0x01;
      crown(g);
      if (tick % 6 === 0 && (g.sy[SUN_SPRITE] ?? 0) < pixelY(HORIZON)) g.sy[SUN_SPRITE] = ((g.sy[SUN_SPRITE] ?? 0) + 1) & 0xff;
      if ((g.sy[SUN_SPRITE] ?? 0) >= pixelY(HORIZON)) g.enable &= ~both & 0xff; // (all of it is behind the block by now: sun and block off)
    }
  };
  // he takes it and strolls to the rail (to the left)
  face = 'left';
  yield* step(60, 0, () => 0);
  yield* step(((g.sx[3] ?? 0) - STOP) * 2, -1, () => 0);
  // three scoops
  for (let scoop = 0; scoop < 3; scoop++) {
    yield* step(30, 0, (n) => (n < 12 ? -Math.round(n / 3) : -4 + Math.round((n - 12) / 5)));
    g.sfx(g.data.sfx.coin, true);
    yield* step(40, 0, () => 0);
  }
  // dusk: the Redeemer floodlit, Sugarloaf's lights on
  for (let n = 0; n < 5; n++) { tint(g, REDEEMER, n < 2 ? 15 : 1); tint(g, SUGARLOAF, n < 2 ? 15 : 7); yield* step(20, 0, () => 0); }
  yield* step(Math.max(0, SET_FRAMES - tick), 0, () => 0);
  yield* wait(0x40);
  g.won = true;
  yield* gameOver(g);
}

/** The bowl's picture: the treasure's pointer, which the room's item sprite has. */
const bowlPointer = (g: Game): number => g.data.itemSprites.treasure;
