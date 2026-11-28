import { FRAME } from '../../shared/monty/frames';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { wait, type Seq } from '../../shared/monty/deaths';
import { FIRST_DECOR_CHR } from '../../montyotr/src/decor-chars';
import type { Game } from '../../montyotr/src/game';
import { gameOver } from '../../montyotr/src/scripts';
import { progressOf } from '../../montyotr/src/map';
import { fullyComplete } from '../../montyotr/src/percent';
import { fullMonty } from './full-monty';
import { BOWL_ON_LAP, FINALE_COLOURS, FINALE_HEADS, FINALE_MC } from './art/rio-finale';
import { FIREWORK_FRAMES } from './art/rio-decor';
import { codeOf, pieceChar } from './layout';
import { BEACH_PALETTE, BEACH_VIEW } from './rio';
import { FINALE_POINTERS as P } from './rio-pointers';

/**
 * Do Svidaniya Monty's finale (the data's `completion`), Monty on the Run's manner (a short play that runs by itself once the treasure is touched, then GAME OVER and the title). He picks up the acai bowl and the
 * picture cuts to Copacabana in close-up (the table, the palms and the near sea gone, the sand plain, the deckchair under the umbrella), every actor in expanded sprites so each beat reads at 1x:
 *
 * 1. he walks in with the bowl to the deckchair under the umbrella, turns and SITS in it (his seated pictures, his body in the sling);
 * 2. he EATS: the bowl on his lap (purple acai, banana slices, berries), the spoon from the bowl up to his mouth three times, a berry gone with each, his eyes shut happy as he chews;
 * 3. he sets the empty bowl down under the chair; the samba troupe (two drummers, two dancers) walks on from the west and lines up dancing; fireworks burst over Sugarloaf and the Redeemer, both floodlit; Monty
 *    gets up and DANCES at the head of the line (his dancing pictures and his arms up, a hop on the beat);
 * 4. at 100% complete (montyotr's percent.ts), THE FULL MONTY (full-monty.ts), the best ending;
 * 5. GAME OVER, as the game has it.
 *
 * Sprites: the spoon (0, in front of everything; the headdress's crest once he has eaten), the berries (1, in the bowl's gaps; then a troupe member), the bowl (2), Monty (3), the crest while he eats (4, behind
 * him: its plumes over his head; then a troupe member), the troupe (1, 4, 5, 6), the chair (7, behind him).
 */

const { redeemer: REDEEMER, sugarloaf: SUGARLOAF, fireworks: FIREWORKS, umbrella: UMBRELLA } = BEACH_VIEW;

/** The sprites. */
const S = { spoon: 0, berries: 1, bowl: 2, monty: 3, chair: 7 } as const;

/** The sand's colour in close-up: plain, no texture behind the feet. */
export const SAND_COLOUR = 8;

/** A playfield pixel (x from its left edge) as a sprite's x (halved, as the game keeps them). */
const sxOf = (px: number) => (px + 56) >> 1;

/** The chair's block's left edge (playfield pixels): under the umbrella's canopy, its pole behind the chair's back. */
const CHAIR_PX = UMBRELLA.col * 8 + 8;
/** Where Monty stands to dance (his block's left edge), just west of the chair, at the head of the troupe's line. */
const DANCE_PX = CHAIR_PX - 44;
/** The troupe, in the order they walk on: the VIC sprite, the beach's creature whose pictures it shows (0 the dancer, 1 the drummer), where it stops (its block's left edge, playfield pixels) and how many frames after the first it sets off. */
const TROUPE = [
  { sprite: 4, slot: 0, stop: DANCE_PX - 38, after: 0 }, { sprite: 5, slot: 1, stop: DANCE_PX - 76, after: 36 },
  { sprite: 6, slot: 0, stop: DANCE_PX - 114, after: 72 }, { sprite: 1, slot: 1, stop: DANCE_PX - 152, after: 108 },
] as const;
/** Each firework's colours as it bursts (one after another). */
const SPARKS = [7, 10, 13, 3, 1] as const;

/** The colour of the cells of a block of the room. */
function tint(g: Game, c: { col: number; row: number; w: number; h: number }, colour: number) {
  for (let r = 0; r < c.h; r++) for (let k = 0; k < c.w; k++) g.col[(c.row + r + PLAY_ROW) * ROW + c.col + k + PLAY_COL] = colour;
}

/**
 * The fireworks: frame `k` of a burst in every one's characters (they share them), lit in the two whose turn it is (one burst rising as the last fades: a turn of 40 frames, the second of the pair 20 frames behind
 * and showing the same frame of the burst as soon as its own turn reaches it, in a colour of its own).
 */
function fireworks(g: Game, t: number) {
  const first = pieceChar(g.data, g.roomId, 'rioFirework');
  if (!first) return;
  const turn = Math.floor(t / 40), k = Math.min(3, Math.floor((t % 40) / 10));
  const picture = FIREWORK_FRAMES[k];
  if (picture) g.mem.set(picture, first * 8);
  const n = FIREWORKS.length, lit = (i: number) => i === turn % n || i === (turn + 2) % n;
  FIREWORKS.forEach(([col, row], i) => tint(g, { col, row, w: 4, h: 4 }, lit(i) ? SPARKS[(turn + i) % SPARKS.length] ?? 1 : 0));
}

/** A cell of the playfield: its place in screen memory and colour memory. */
const cellAt = (col: number, row: number) => (row + PLAY_ROW) * ROW + col + PLAY_COL;

/**
 * The close-up: the palms, the table and the near sea taken away (the far sea's row, the umbrella and the landmarks stay), the sand plain in one colour from the sea's edge down (the pavement's and the sand's characters made
 * solid: Chris, 2026-11-27, with black under the sea "he looks like he's floating in the air"), and the gutters beside the playfield mirrored again as the room's loading leaves them.
 */
function closeUp(g: Game) {
  const code = (letter: keyof typeof BEACH_PALETTE) => codeOf(BEACH_PALETTE, letter);
  const palm = new Set([code('U'), code('L'), code('R')]), sea = code('E'), sand = code('W');
  for (let row = 10; row < 18; row++) for (let col = 0; col < PLAY_COLS; col++) {
    const at = cellAt(col, row), chr = g.mem[SCREEN + at] ?? 0;
    if (chr >= FIRST_DECOR_CHR) continue; // (the umbrella and the landmarks)
    if (row < 12) { if (palm.has(chr)) g.mem[SCREEN + at] = 0; continue; }
    if (row === 12) g.mem[SCREEN + at] = sea;
    else { g.mem[SCREEN + at] = sand; g.col[at] = SAND_COLOUR; }
  }
  g.mem.fill(0xff, code('W') * 8, code('W') * 8 + 8);
  for (let row = 18; row < 20; row++) for (let col = 0; col < PLAY_COLS; col++) { g.mem[SCREEN + cellAt(col, row)] = sand; g.col[cellAt(col, row)] = SAND_COLOUR; }
  for (let r = PLAY_ROW; r < PLAY_ROW + 20; r++) {
    const a = r * ROW;
    g.mem[SCREEN + a + 2] = g.mem[SCREEN + a + 3] = g.mem[SCREEN + a + 4] ?? 0;
    g.mem[SCREEN + a + 36] = g.mem[SCREEN + a + 37] = g.mem[SCREEN + a + 35] ?? 0;
    g.col[a + 2] = g.col[a + 3] = g.col[a + 4] ?? 0;
    g.col[a + 36] = g.col[a + 37] = g.col[a + 35] ?? 0;
  }
}

/** The headdress's crest he wears: its picture (the game's own for the picture he shows, or the front-on one for his seated and dancing pictures) and where it goes; null with no costume on. */
function crestFor(g: Game) {
  const over = g.data.costumes.find((c) => c.item === g.worn)?.over;
  return over ? { colour: over.colour, at: (ptr: number) => over.frames.get(ptr) } : null;
}

/** The first lit column of a sprite block (where a crest's picture begins in its block). */
function firstColumn(g: Game, ptr: number): number {
  for (let x = 0; x < 24; x++) for (let y = 0; y < 21; y++) if ((g.mem[ptr * 64 + y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) return x;
  return 0;
}

/** Completion.Begin: the treasure is touched. */
export function* completion(g: Game): Seq {
  g.freeze = 1;
  g.completionActive = 1;
  g.ending = { aboard: true, mc1: g.vic.mc1, mc2: g.vic.mc2 };
  g.actionCounter = 0;
  g.sound.song(2);
  const crest = crestFor(g);
  /** The crest's sprite: behind him while the spoon is in front, in front of him once the troupe needs its sprite. */
  let crestSprite = 4;
  /** The row under his feet (VIC lines): the sand's top. */
  const feet = (g.y + 1 + 15) & 0xff;
  /** A sprite shown expanded at a playfield pixel, a figure `h` rows tall (of its own pixels) standing on the sand, `lift` pixels up. */
  const put = (n: number, ptr: number, colour: number, sx: number, h: number, lift = 0) => {
    g.sx[n] = sx & 0xff; g.sy[n] = (feet - 2 * h - lift) & 0xff; g.sptr[n] = ptr; g.scol[n] = colour;
    g.enable |= 1 << n; g.expandX |= 1 << n; g.expandY |= 1 << n;
  };
  const off = (n: number) => { g.enable &= ~(1 << n) & 0xff; };
  /** The crest over his head: for one of the game's own pictures as the costume has it, for one of ours over the head's middle (`cx`) and top (pixels of his block). */
  const crown = (ptr: number, head?: { cx: number; top: number }) => {
    if (!crest) { off(crestSprite); return; }
    const sx = g.sx[S.monty] ?? 0, sy = g.sy[S.monty] ?? 0;
    const own = crest.at(ptr), front = crest.at(FRAME.rope);
    const pic = head ? front : own;
    if (!pic) { off(crestSprite); return; }
    // (a sprite x unit is two pixels, and an expanded picture's pixel two pixels: one unit a pixel of the picture)
    const dx = head ? Math.round(head.cx - 4.5 - firstColumn(g, pic.ptr)) : pic.dx, dy = head ? head.top - 3 : pic.dy;
    g.sx[crestSprite] = (sx + dx) & 0xff; g.sy[crestSprite] = (sy + 2 * dy) & 0xff; g.sptr[crestSprite] = pic.ptr; g.scol[crestSprite] = crest.colour;
    g.enable |= 1 << crestSprite; g.expandX |= 1 << crestSprite; g.expandY |= 1 << crestSprite;
  };
  let troupe = -1, bursts = -1, tick = 0, bowlDown = false;
  /** A frame of the background: the troupe walking on and dancing, the fireworks. */
  const scene = function* (): Seq {
    yield;
    tick++;
    if (troupe >= 0) {
      troupe++;
      for (const { sprite, slot, stop, after } of TROUPE) {
        const x = Math.min(stop, -32 + (troupe - after));
        if (x < -32) continue;
        // walking on, then dancing on the spot (the dancers sway, the drummers beat), a hop on every other beat
        const hop = x >= stop && ((troupe + after) >> 4) % 2 === 1 ? 4 : 0;
        const colour = g.enemies[slot]?.colour ?? (slot === 0 ? 3 : 5);
        put(sprite, 0x30 + slot * 8 + (x < stop ? 4 + ((troupe >> 2) & 3) : (troupe >> 3) & 3), colour, sxOf(x), 16, hop);
      }
    }
    if (bursts >= 0) fireworks(g, bursts++);
    // (the bowl set down stays where it is: the engine's item flashing would take its sprite's picture otherwise)
    if (bowlDown) put(S.bowl, P.bowlEmpty, FINALE_COLOURS.acai, sxOf(CHAIR_PX) + 6, 6);
  };

  // he picks the bowl up (in his hand, the crest back on his head); the picture cuts to the close-up
  off(0); // (the bowl's sprite on the table: the engine's flag would show through it)
  for (let n = 0; n < 24; n++) {
    const m = g.sptr[S.monty] ?? FRAME.walkRight, pic = crest?.at(m);
    g.sx[S.bowl] = ((g.sx[S.monty] ?? 0) + 6) & 0xff; g.sy[S.bowl] = ((g.sy[S.monty] ?? 0) + 2) & 0xff; g.sptr[S.bowl] = g.data.itemSprites.treasure; g.scol[S.bowl] = FINALE_COLOURS.acai; g.enable |= 1 << S.bowl;
    if (crest && pic) { g.sx[crestSprite] = ((g.sx[S.monty] ?? 0) + pic.dx / 2) & 0xff; g.sy[crestSprite] = ((g.sy[S.monty] ?? 0) + pic.dy) & 0xff; g.sptr[crestSprite] = pic.ptr; g.scol[crestSprite] = crest.colour; g.enable |= 1 << crestSprite; }
    yield* scene();
  }
  g.enable = 0;
  const colours = Uint8Array.from(g.col);
  g.col.fill(0, PLAY_ROW * ROW, (PLAY_ROW + 20) * ROW);
  for (let n = 0; n < 12; n++) yield* scene();
  g.col.set(colours);
  closeUp(g);
  g.expandX = g.expandY = 0;
  g.enemyParity.fill(0);
  g.vic.mc1 = FINALE_MC.wood; g.vic.mc2 = FINALE_MC.white;
  g.multicolour = (1 << S.bowl) | (1 << S.chair);
  off(S.spoon);
  g.priority = 0; // (every sprite in front of the picture, in their own order: the bowl in front of him, the chair behind)
  put(S.chair, P.chair, FINALE_COLOURS.canvas, sxOf(CHAIR_PX), 21);

  // 1. he walks in with the bowl to the chair, turns and sits
  const seatSx = sxOf(CHAIR_PX);
  let sx = sxOf(-32);
  const holdBowl = (x: number, y: number) => { put(S.bowl, P.bowlFull, FINALE_COLOURS.acai, (g.sx[S.monty] ?? 0) + x, 0); g.sy[S.bowl] = ((g.sy[S.monty] ?? 0) + 2 * y) & 0xff; };
  const berries = (ptr: number | null) => {
    if (ptr === null) { off(S.berries); return; }
    put(S.berries, ptr, FINALE_COLOURS.berries, g.sx[S.bowl] ?? 0, 0); g.sy[S.berries] = g.sy[S.bowl] ?? 0;
  };
  while (sx < seatSx - 2) {
    sx++;
    const ptr = FRAME.walkRight + ((tick >> 2) & 3);
    put(S.monty, ptr, 15, sx, 15);
    crown(ptr);
    holdBowl(10, 6); berries(P.berries3);
    yield* scene();
  }
  for (let n = 0; n < 12; n++) { put(S.monty, FRAME.walkLeft, 15, sx, 15); crown(FRAME.walkLeft); holdBowl(-10, 6); berries(P.berries3); yield* scene(); }
  const sit = (ptr: number) => { put(S.monty, ptr, 15, seatSx, 21); crown(ptr, FINALE_HEADS.seated); if (!bowlDown) holdBowl(BOWL_ON_LAP.x, BOWL_ON_LAP.y); };
  for (let n = 0; n < 30; n++) { sit(P.sitChew); berries(P.berries3); yield* scene(); }

  // 2. he eats it: three spoonfuls, a berry gone with each
  const left = [P.berries3, P.berries2, P.berries1, null] as const;
  for (let k = 0; k < 3; k++) {
    for (const [ptr, frames] of [[P.sitDip, 20], [P.sitUp, 12], [P.sitMouth, 16], [P.sitChew, 30]] as const) {
      if (ptr === P.sitMouth) g.sfx(g.data.sfx.coin, true);
      const spoon = ptr === P.sitDip ? P.spoonDip : ptr === P.sitUp ? P.spoonUp : ptr === P.sitMouth ? P.spoonMouth : null;
      for (let n = 0; n < frames; n++) {
        sit(ptr);
        berries(ptr === P.sitDip || ptr === P.sitUp ? left[k] ?? null : left[k + 1] ?? null);
        if (spoon === null) off(S.spoon); else put(S.spoon, spoon, FINALE_COLOURS.spoon, seatSx, 21);
        yield* scene();
      }
    }
  }
  // 3. the bowl set down under the chair, empty; the troupe walks on, the fireworks begin, the bay is floodlit
  off(S.spoon); off(crestSprite); crestSprite = S.spoon;
  for (let n = 0; n < 24; n++) { if (n === 12) bowlDown = true; sit(P.sitDip); berries(null); yield* scene(); }
  troupe = 0; bursts = 0;
  for (let n = 0; n < 150; n++) {
    if (n % 30 === 0) { tint(g, REDEEMER, n < 60 ? 15 : 1); tint(g, SUGARLOAF, n < 60 ? 6 : 14); }
    sit(n % 48 < 24 ? P.sitChew : P.sitDip);
    yield* scene();
  }
  // he gets up and steps out west of the chair to the head of the line, and dances: arms up one way, a samba step, arms up the other way, a step, a hop on every other beat
  let at = seatSx;
  const target = sxOf(DANCE_PX);
  while (at > target) { at--; const ptr = FRAME.walkLeft + ((tick >> 2) & 3); put(S.monty, ptr, 15, at, 15); crown(ptr); yield* scene(); }
  const steps = [P.danceLeft, FRAME.walkLeft + 1, P.danceRight, FRAME.walkLeft + 3] as const;
  for (let beat = 0; beat < 16; beat++) {
    const ptr = steps[beat % 4] ?? P.danceLeft, ours = ptr === P.danceLeft || ptr === P.danceRight;
    for (let n = 0; n < 24; n++) {
      const lift = beat % 2 === 1 ? Math.round(Math.sin((n / 24) * Math.PI) * 8) : 0;
      put(S.monty, ptr, 15, target, ours ? 16 : 15, lift);
      crown(ptr, ours ? FINALE_HEADS.dancing : undefined);
      yield* scene();
    }
  }
  for (let n = 0; n < 60; n++) yield* scene();
  // 100% complete: THE FULL MONTY after it (full-monty.ts), the best ending
  if (fullyComplete(g.data, progressOf(g))) yield* fullMonty(g, { feet, standSx: target, sxOf, sand: SAND_COLOUR });
  yield* wait(0x20);
  g.won = true;
  yield* gameOver(g);
}
