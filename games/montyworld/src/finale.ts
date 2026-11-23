import { FRAME } from '../../shared/monty/frames';
import { PLAY_COL, PLAY_ROW, ROW } from '../../shared/monty/screen';
import { wait, type Seq } from '../../shared/monty/deaths';
import { decorChars } from '../../montyotr/src/decor-chars';
import type { Game } from '../../montyotr/src/game';
import { gameOver } from '../../montyotr/src/scripts';
import { FIREWORK_FRAMES } from './art/rio-decor';
import { decorIndex } from './layout';
import { BEACH_VIEW } from './rio';

/**
 * Do Svidaniya Monty's finale (the data's `completion`), Monty on the Run's manner (a short play that runs by itself once the treasure is touched, then GAME OVER and the title): on Copacabana at night Monty takes the acai
 * bowl to the deckchair, sits and eats it in three scoops; the Sambadrome's dancer and drummer walk on from the west; fireworks burst in turn over the bay and the Redeemer and Sugarloaf are floodlit; Monty gets up and dances in
 * his headdress. The room is the beach itself; the figures are sprites: Monty (3), the bowl (0, the treasure's), his headdress (7) and the troupe (4 and 5: the beach's two creatures, whose pictures the room has loaded and which
 * wait off the beach until now).
 */

const { redeemer: REDEEMER, sugarloaf: SUGARLOAF, chair: CHAIR, fireworks: FIREWORKS } = BEACH_VIEW;
/** Monty's x (halved) sitting in the deckchair, and where the troupe stops (sprite x, halved): the dancer, then the drummer behind her. */
const SEAT = 0x0c + (CHAIR.col + PLAY_COL) * 4, TROUPE = [0x40, 0x30] as const;
/** Each firework's colours as it bursts (one after another). */
const SPARKS = [7, 10, 13, 3, 1] as const;

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

/** The fireworks: frame `k` of a burst in every one's characters (they share them), lit only in the one whose turn it is. */
function fireworks(g: Game, t: number) {
  const first = decorChars(g.data, g.roomId)[decorIndex('rioFirework')] ?? 0;
  if (!first) return;
  const turn = Math.floor(t / 40), k = Math.min(3, Math.floor((t % 40) / 8));
  const picture = FIREWORK_FRAMES[k];
  if (picture) g.mem.set(picture, first * 8);
  FIREWORKS.forEach(([col, row], i) => tint(g, { col, row, w: 2, h: 2 }, turn % FIREWORKS.length === i && t % 40 < 32 ? SPARKS[turn % SPARKS.length] ?? 1 : 0));
}

/** Completion.Begin: the treasure is touched. */
export function* completion(g: Game): Seq {
  g.freeze = 1;
  g.completionActive = 1;
  g.ending = { aboard: true, mc1: g.vic.mc1, mc2: g.vic.mc2 };
  g.actionCounter = 0;
  g.sound.song(2);
  let tick = 0, face: 'left' | 'right' = 'right', lift = 0, troupe = -1, bursts = -1, seated = false;
  const walk = (dx: number) => (face === 'left' ? FRAME.walkLeft : FRAME.walkRight) + (dx === 0 ? 0 : (tick >> 2) & 3);
  /** A run of frames: Monty steps `dx` every other frame (or sits, or hops `lift` pixels), the bowl in his hand or on his knee, the troupe and the fireworks on. */
  const step = function* (frames: number, dx: number, bob: (n: number) => number = () => 0): Seq {
    for (let n = 0; n < frames; n++) {
      yield;
      tick++;
      if (tick % 2 === 0) g.sx[3] = ((g.sx[3] ?? 0) + dx) & 0xff;
      g.sptr[3] = walk(dx);
      if (bowl) {
        g.sx[0] = ((g.sx[3] ?? 0) + (face === 'left' ? -8 : 10)) & 0xff;
        g.sy[0] = ((g.sy[3] ?? 0) + 4 + bob(n)) & 0xff;
        g.sptr[0] = g.data.itemSprites.treasure;
        g.scol[0] = 4;
        g.enable |= 0x01;
      } else g.enable &= ~0x01 & 0xff;
      crown(g);
      if (troupe >= 0) {
        troupe++;
        [0, 1].forEach((slot) => {
          const n = 4 + slot, man = g.enemies[slot], stop = TROUPE[slot] ?? 0x30;
          const x = Math.min(stop, 0x0c + Math.floor((troupe - slot * 30) / 2));
          if (!man || x < 0x0c) return;
          g.sx[n] = x; g.sy[n] = (seatY + (seated ? -4 : 0) + 1) & 0xff; g.scol[n] = man.colour;
          g.sptr[n] = 0x30 + slot * 8 + (x < stop ? 4 + ((troupe >> 2) & 3) : (troupe >> 3) & 3);
          g.enable |= 1 << n;
        });
      }
      if (bursts >= 0) fireworks(g, bursts++);
      g.sy[3] = (seatY + 1 + (seated ? 4 : 0) - lift) & 0xff;
    }
  };
  let bowl = true;
  const seatY = g.y;
  // he takes the bowl and walks to the deckchair
  yield* step(30, 0);
  yield* step(Math.max(0, (SEAT - (g.sx[3] ?? 0)) * 2), 1);
  // he sits (behind the chair's characters: the chair over his legs) and eats it in three scoops
  seated = true;
  g.priority |= 0x08;
  for (let scoop = 0; scoop < 3; scoop++) {
    yield* step(30, 0, (n) => (n < 12 ? -Math.round(n / 3) : -4 + Math.round((n - 12) / 5)));
    g.sfx(g.data.sfx.coin, true);
    yield* step(30, 0);
  }
  bowl = false;
  // the troupe walks on, the fireworks begin, the bay is floodlit
  troupe = 0; bursts = 0;
  for (let n = 0; n < 5; n++) { tint(g, REDEEMER, n < 2 ? 15 : 1); tint(g, SUGARLOAF, n < 2 ? 6 : 14); yield* step(30, 0); }
  // he gets up and dances in his headdress: a turn on the beat, a hop on every other
  seated = false;
  g.priority &= ~0x08 & 0xff;
  for (let beat = 0; beat < 16; beat++) {
    face = beat % 2 === 0 ? 'left' : 'right';
    for (let n = 0; n < 24; n++) { lift = beat % 2 === 1 && n < 12 ? Math.round(Math.sin((n / 12) * Math.PI) * 4) : 0; yield* step(1, 0); }
  }
  lift = 0;
  yield* step(60, 0);
  yield* wait(0x20);
  g.won = true;
  yield* gameOver(g);
}
