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
 * bowl to the deckchair, sits and eats it in three scoops; two samba dancers and two drummers walk on from the west; fireworks burst over the bay two at a time and the Redeemer and Sugarloaf are floodlit; Monty gets up
 * and dances in his headdress (a step each way and a hop, on the beat). The room is the beach itself; the figures are sprites: Monty (3), the bowl (0, the treasure's), his headdress (7) and the troupe: the beach's two creatures
 * (4 and 5, whose pictures the room has loaded and which wait off the beach until now) and a second dancer and drummer in their pictures (1 and 2).
 */

const { redeemer: REDEEMER, sugarloaf: SUGARLOAF, chair: CHAIR, fireworks: FIREWORKS } = BEACH_VIEW;
/** Monty's x (halved) sitting in the deckchair. */
const SEAT = 0x0c + (CHAIR.col + PLAY_COL) * 4 + 3;
/** The troupe, in the order they walk on: the VIC sprite, the beach's creature whose pictures it shows (0 the dancer, 1 the drummer), where it stops (sprite x, halved) and how many frames after the first it sets off. */
const TROUPE = [
  { sprite: 4, slot: 0, stop: 0x44, after: 0 }, { sprite: 5, slot: 1, stop: 0x36, after: 24 },
  { sprite: 1, slot: 0, stop: 0x28, after: 48 }, { sprite: 2, slot: 1, stop: 0x1a, after: 72 },
] as const;
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

/**
 * The fireworks: frame `k` of a burst in every one's characters (they share them), lit in the two whose turn it is (one burst rising as the last fades: a turn of 40 frames, the second of the pair 20 frames behind
 * and showing the same frame of the burst as soon as its own turn reaches it, in a colour of its own).
 */
function fireworks(g: Game, t: number) {
  const first = decorChars(g.data, g.roomId)[decorIndex('rioFirework')] ?? 0;
  if (!first) return;
  const turn = Math.floor(t / 40), k = Math.min(3, Math.floor((t % 40) / 10));
  const picture = FIREWORK_FRAMES[k];
  if (picture) g.mem.set(picture, first * 8);
  const n = FIREWORKS.length, lit = (i: number) => i === turn % n || i === (turn + 2) % n;
  FIREWORKS.forEach(([col, row], i) => tint(g, { col, row, w: 4, h: 4 }, lit(i) ? SPARKS[(turn + i) % SPARKS.length] ?? 1 : 0));
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
        g.sx[0] = ((g.sx[3] ?? 0) + (seated ? 7 : face === 'left' ? -8 : 10)) & 0xff;
        g.sy[0] = ((g.sy[3] ?? 0) + (seated ? -2 : 4) + bob(n)) & 0xff;
        g.sptr[0] = g.data.itemSprites.treasure;
        g.scol[0] = 4;
        g.enable |= 0x01;
      } else g.enable &= ~0x01 & 0xff;
      crown(g);
      if (troupe >= 0) {
        troupe++;
        for (const { sprite, slot, stop, after } of TROUPE) {
          const man = g.enemies[slot];
          const x = Math.min(stop, 0x0c + Math.floor((troupe - after) / 2));
          if (!man || x < 0x0c) continue;
          // walking on, then dancing on the spot (the dancers sway, the drummers beat), a hop on every other beat
          const hop = x >= stop && ((troupe + after) >> 4) % 2 === 1 ? 2 : 0;
          g.sx[sprite] = x; g.sy[sprite] = (seatY + 1 - hop) & 0xff; g.scol[sprite] = man.colour;
          g.sptr[sprite] = 0x30 + slot * 8 + (x < stop ? 4 + ((troupe >> 2) & 3) : (troupe >> 3) & 3);
          g.enable |= 1 << sprite;
        }
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
  // he sits in the deckchair (in front of it, a little lower: its back and arm show behind him) and eats it in three scoops
  seated = true;
  for (let scoop = 0; scoop < 3; scoop++) {
    yield* step(30, 0, (n) => (n < 12 ? -Math.round(n / 3) : -4 + Math.round((n - 12) / 5)));
    g.sfx(g.data.sfx.coin, true);
    yield* step(30, 0);
  }
  bowl = false;
  // the troupe walks on, the fireworks begin, the bay is floodlit
  troupe = 0; bursts = 0;
  for (let n = 0; n < 5; n++) { tint(g, REDEEMER, n < 2 ? 15 : 1); tint(g, SUGARLOAF, n < 2 ? 6 : 14); yield* step(30, 0); }
  // he gets up, steps out in front of the chair and dances in his headdress: a samba step left, a hop, a step right, a hop, on the beat
  seated = false;
  face = 'right';
  yield* step(40, 1);
  for (let beat = 0; beat < 16; beat++) {
    const phase = beat % 4;
    face = phase < 2 ? 'left' : 'right';
    const dx = phase === 0 ? -1 : phase === 2 ? 1 : 0;
    for (let n = 0; n < 24; n++) { lift = dx === 0 ? Math.round(Math.sin((n / 24) * Math.PI) * 6) : 0; yield* step(1, n < 12 ? dx : 0); }
  }
  lift = 0;
  yield* step(60, 0);
  yield* wait(0x20);
  g.won = true;
  yield* gameOver(g);
}
