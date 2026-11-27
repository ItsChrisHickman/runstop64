import { FRAME } from '../../shared/monty/frames';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import type { Seq } from '../../shared/monty/deaths';
import { FIRST_DECOR_CHR } from '../../montyotr/src/decor-chars';
import type { Game } from '../../montyotr/src/game';
import { CROWD_COLOURS, CROWD_MC, FULL_FEET, FULL_MONTY_PICTURES, LYING_FEET, POSE_SHADES_DX, type FullMontyPicture } from './art/full-monty';
import { HAT_BLOCKS } from './hats';
import { BEACH_VIEW } from './rio';

/**
 * THE FULL MONTY: Do Svidaniya Monty's best ending, played after the finale's dance at 100% complete (montyotr's percent.ts; Chris, 2026-11-25, as he picked it:
 * Monty's reveal and the beach together, a nod to Metroid's suit-off reward and Auf Wiedersehen Monty's beach girl). Cartoon, in the game's style; the finale before
 * it is untouched (its close-up, the bowl, the dance). In two shots on Copacabana, the room's name THE FULL MONTY:
 *
 * 1. the close-up: a cut, and Monty faces us with every regional costume of the journey on at once, stacked on his head in the journey's order (the ushanka, the
 *    rice hat, the hood, the lei, the chullo, the headdress on top); they fly off him all together, and he stands as bare as he always is (he is a mole); he snaps on a speedo
 *    and sunglasses, the first clothes of his own he has worn all game, strikes a pose (a glint off the glasses), and turns his back to us;
 * 2. up the beach: a cut to the sand stretching from the shore, the crowd on it, every one at his size (near the camera a sunbather in trunks under his
 *    umbrella and a volleyball game, far up by the shore a sunbather in a bikini on her towel); he stands with his back to us at the camera's foot, walks away
 *    from the camera up the beach between them and past them (the speedo from behind), and settles on the towel beside the bikini; the picture fades out, the
 *    sand and the people together.
 *
 * Sprites: the costumes 0, 1, 2, 4, 5, 6 as they fly (the chair 7 stays in shot 1), then the speedo 0, the glasses 1, the glint 2; in shot 2 the ball 1, the
 * crowd 4, 5 (near), 6, 7 (far) and the glasses 2 once he lies down. A cut blacks out the sprites with the playfield. Its pictures go into the hat pool's blocks (hats.ts `HAT_BLOCKS`: nothing wears a hat from here to GAME OVER, and a new game's bank is the game's).
 */

/** What the finale hands on: the sand's top (VIC lines), where Monty stands to dance (a sprite x), a playfield pixel as a sprite x, the sand's colour. */
export interface FullMontyStage { feet: number; standSx: number; sxOf: (px: number) => number; sand: number }

/** The room's name for it. */
export const FULL_MONTY_NAME = 'THE FULL MONTY';

/** The sprites the costumes fly on (the chair, 7, stays; Monty is 3). */
const FLYERS = [0, 1, 2, 4, 5, 6] as const;
const S = { speedo: 0, shades: 1, glint: 2, monty: 3, chair: 7 } as const;
/** Shot 2's sprites: Monty and his speedo as in shot 1, the ball, the crowd near (behind him: a higher sprite) and far, the glasses once he lies down. */
const B = { ball: 1, shades: 2, umbrella: 4, volley: 5, bikini: 6, towel: 7 } as const;
/** Monty's colour (the engine's). */
const MONTY = 15;

/** The pictures' blocks: the hats' first (one a costume), then the sequence's own. */
const PICTURE_NAMES = Object.keys(FULL_MONTY_PICTURES).filter((k): k is FullMontyPicture => k in FULL_MONTY_PICTURES);
const HAT_PTRS = HAT_BLOCKS.slice(0, FLYERS.length);
if (FLYERS.length + PICTURE_NAMES.length > HAT_BLOCKS.length) throw new Error('THE FULL MONTY needs more blocks than the hat pool has');
/** A picture's block. */
const ptrOf = (name: FullMontyPicture): number => HAT_BLOCKS[FLYERS.length + PICTURE_NAMES.indexOf(name)] ?? 0;
const PTR = {
  front: ptrOf('front'), pose: ptrOf('pose'), backA: ptrOf('backA'), backB: ptrOf('backB'), lying: ptrOf('lying'),
  speedoFront: ptrOf('speedoFront'), speedoPose: ptrOf('speedoPose'), speedoBack: ptrOf('speedoBack'), speedoLying: ptrOf('speedoLying'),
  shadesFront: ptrOf('shadesFront'), shadesLying: ptrOf('shadesLying'),
  bikini: ptrOf('bikini'), umbrella: ptrOf('umbrella'), towel: ptrOf('towel'), volley: ptrOf('volley'), ball: ptrOf('ball'), glint: ptrOf('glint'),
} as const satisfies Record<FullMontyPicture, number>;

/**
 * The fade to black, every colour's darker shades in turn (by its hue: the greys to dark grey, the blues to blue, the warm colours to red), the last step
 * black: every colour lasts to the end, so the beach and the people dim together (the sand once went black a step before the rest). Nothing but the sand
 * dims to its brown, so no one melts into it on the way.
 */
const FADE: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 0, 0], [15, 12, 11, 11], [2, 2, 11, 11], [14, 14, 6, 6], [4, 4, 6, 6], [5, 5, 11, 11], [6, 6, 6, 6], [10, 8, 2, 2],
  [8, 9, 9, 9], [9, 9, 9, 9], [10, 8, 2, 2], [11, 11, 11, 11], [12, 11, 11, 11], [5, 5, 11, 11], [14, 14, 6, 6], [12, 12, 11, 11],
];
/** The fade's steps: FADE's and the black. */
const FADE_STEPS = 5;
/** A colour at a step of the fade (0: as it is). */
function dimmed(colour: number, level: number): number {
  if (!level) return colour;
  return level >= FADE_STEPS ? 0 : FADE[colour & 15]?.[level - 1] ?? 0;
}

/** The VIC line of the top of a playfield row (row 18 is the sand's top, `feet`). */
const rowLine = (st: FullMontyStage, row: number) => st.feet + (row - 18) * 8;

export function* fullMonty(g: Game, st: FullMontyStage): Seq {
  // the pictures in; each costume's picture on his walk (the hat as it sits on his head) in a block of its own
  for (const name of PICTURE_NAMES) g.mem.set(FULL_MONTY_PICTURES[name], ptrOf(name) * 64);
  const hats = g.data.costumes.flatMap((c, i) => {
    const at = c.over?.frames.get(FRAME.walkRight) ?? c.over?.frames.values().next().value;
    const pic = at ? c.blocks.find((b) => b.ptr === at.ptr) : undefined;
    const ptr = HAT_PTRS[i];
    if (!c.over || !at || !pic || ptr === undefined) return [];
    g.mem.set(pic.block, ptr * 64);
    return [{ ptr, colour: c.over.colour, rows: litRows(pic.block), cols: litCols(pic.block) }];
  });
  if (hats.length !== FLYERS.length) throw new Error(`THE FULL MONTY stacks ${FLYERS.length} costumes; the game has ${hats.length}`);

  /** What is on the picture: each sprite's drawing, put again every frame (the engine's own frame takes sprites 0 and 1 for the room's items). */
  const cast = new Map<number, () => void>();
  /** The fade's step (0: none): the sprites drawn in their colours that far down to black. */
  let dim = 0;
  /** A sprite at sprite x `sx` with its picture's `h`th row on VIC line `y` (expanded: twice as wide and tall, as the finale's actors). */
  const put = (n: number, ptr: number, colour: number, sx: number, y: number, h: number, big = true, multicolour = false) => {
    const bit = 1 << n;
    cast.set(n, () => {
      g.sx[n] = sx & 0xff; g.sy[n] = (y - (big ? 2 : 1) * h) & 0xff; g.sptr[n] = ptr; g.scol[n] = dimmed(colour, dim);
      g.enable |= bit;
      g.expandX = big ? g.expandX | bit : g.expandX & ~bit & 0xff; g.expandY = big ? g.expandY | bit : g.expandY & ~bit & 0xff;
      g.multicolour = multicolour ? g.multicolour | bit : g.multicolour & ~bit & 0xff;
    });
  };
  const off = (...ns: number[]) => { for (const n of ns) { cast.delete(n); g.enable &= ~(1 << n) & 0xff; } };
  /** `n` frames, `each` setting the cast first. */
  const frames = function* (n: number, each?: (t: number) => void): Seq {
    for (let t = 0; t < n; t++) { each?.(t); for (const draw of cast.values()) draw(); yield; }
  };
  /** A cut: the playfield and its sprites black for a moment, then as they were (`then` changes it while it is black). */
  const cut = function* (then: () => void): Seq {
    const shown = g.enable, drawn = new Map(cast);
    cast.clear();
    g.enable = 0;
    // (the sprites go a frame after they are turned off, the playfield's colours at once: the playfield goes black a frame later, with them)
    yield* frames(1);
    const colours = Uint8Array.from(g.col);
    g.col.fill(0, PLAY_ROW * ROW, (PLAY_ROW + 20) * ROW);
    yield* frames(11);
    g.col.set(colours);
    g.enable = shown;
    for (const [n, draw] of drawn) cast.set(n, draw);
    then();
  };
  const playTop = rowLine(st, 0);

  // ---- 1. the close-up: a cut, the name, Monty facing us in every costume -----------------------------------------------
  off(0, 1, 2, 4, 5, 6);
  yield* cut(() => {
    for (const [col, row] of BEACH_VIEW.fireworks) tint(g, col, row, 4, 4, 0); // (the fireworks over)
    g.showName(FULL_MONTY_NAME);
  });
  const sx = st.standSx, feet = st.feet;
  const montyAt = (ptr: number) => put(S.monty, ptr, MONTY, sx, feet, FULL_FEET);
  /**
   * The stack (each block's top, VIC lines): over his head's middle (picture column 6), piled from the crown of his head (row 3 of his picture) in the journey's
   * order (each costume as it sits on his head on his walk), each a pixel into the one under it (expanded: two lines a pixel).
   */
  const headTop = feet - 2 * FULL_FEET;
  let base = headTop + 2 * 3;
  const stack = hats.map((hat) => {
    const y = base - 2 * (hat.rows.to + 1);
    base = y + 2 * (hat.rows.from + 1);
    return { ...hat, x: sx + Math.round(6 - (hat.cols.from + hat.cols.to) / 2), y };
  });
  const showStack = (wobble: number) => stack.forEach((h, i) => put(FLYERS[i] ?? 0, h.ptr, h.colour, h.x + (i > 1 ? Math.round(wobble * (i - 1)) : 0), h.y, 0));
  montyAt(PTR.front);
  yield* frames(70, (t) => showStack(t > 30 ? Math.sin(t / 3) * 0.8 : 0));
  // they fly off him all at once: each its own way, up and out, then down off the picture
  g.sfx(g.data.sfx.jump);
  const flight = stack.map((_, i) => ({ vx: [-3, 3, -2, 2, -4, 4][i] ?? 0, vy: -3 - (i % 3) }));
  yield* frames(64, (t) => stack.forEach((h, i) => {
    const n = FLYERS[i] ?? 0, f = flight[i];
    if (!f) return;
    const x = h.x + f.vx * t, y = h.y + f.vy * t + Math.floor((t * t) / 8);
    if (y < playTop || y > feet + 8 || x < 4 || x > 0xb0) off(n);
    else put(n, h.ptr, h.colour, x, y, 0);
  }));
  off(...FLYERS);
  // bare, as he always is
  yield* frames(50);
  // the speedo snapped on (up from his knees to his hips), then the glasses (down onto his eyes)
  yield* frames(7, (t) => put(S.speedo, PTR.speedoFront, CROWD_COLOURS.speedo, sx, feet + 2 * (6 - t), FULL_FEET));
  g.sfx(g.data.sfx.coin);
  yield* frames(20);
  yield* frames(9, (t) => put(S.shades, PTR.shadesFront, CROWD_COLOURS.shades, sx, feet - 2 * (8 - t), FULL_FEET));
  g.sfx(g.data.sfx.item);
  yield* frames(30);
  // the pose: fists up, a glint off the glasses
  const poseSx = sx - POSE_SHADES_DX;
  put(S.monty, PTR.pose, MONTY, poseSx, feet, FULL_FEET);
  put(S.speedo, PTR.speedoPose, CROWD_COLOURS.speedo, poseSx, feet, FULL_FEET);
  yield* frames(90, (t) => {
    if (t >= 30 && t < 42) put(S.glint, PTR.glint, CROWD_COLOURS.glint, sx + 8, headTop + 2 * 4 + 6, 2, false);
    else off(S.glint);
  });
  // he turns his back to us
  off(S.shades);
  put(S.monty, PTR.backA, MONTY, sx, feet, FULL_FEET);
  put(S.speedo, PTR.speedoBack, CROWD_COLOURS.speedo, sx, feet, FULL_FEET);
  yield* frames(40);

  // ---- 2. up the beach: a cut, the sand from the shore down, the crowd; he walks away from us past them to the towel ----------
  off(S.monty, S.speedo, S.chair);
  yield* cut(() => {
    beachUp(g, st.sand);
    g.vic.mc1 = CROWD_MC.skin; g.vic.mc2 = CROWD_MC.cloth;
    g.priority = 0;
  });
  // the crowd, every one at his size: near the camera the sunbather in trunks under his umbrella on the left and the volleyball game on the right; far up the
  // beach by the shore, between them, the bikini on her towel and the empty towel beside it
  const nearFeet = rowLine(st, 20) - 2, farFeet = rowLine(st, 16);
  put(B.umbrella, PTR.umbrella, CROWD_COLOURS.umbrella, st.sxOf(BEACH.umbrella), nearFeet, LYING_FEET, true, true);
  put(B.volley, PTR.volley, CROWD_COLOURS.net, st.sxOf(BEACH.volley), nearFeet, LYING_FEET, true, true);
  put(B.bikini, PTR.bikini, CROWD_COLOURS.bikiniTowel, st.sxOf(BEACH.bikini), farFeet, LYING_FEET, true, true);
  put(B.towel, PTR.towel, CROWD_COLOURS.montyTowel, st.sxOf(BEACH.towel), farFeet, LYING_FEET, true, true);
  /** The volleyball's ball: from the left player's raised hands over the net to the right one's arms and back (expanded: a picture's row two lines, a multicolour pixel four pixels wide). */
  const top = nearFeet - 2 * (LYING_FEET - VOLLEY.handsRow);
  let t = 0;
  const ball = () => {
    const k = (t % 40) / 40, way = Math.floor(t / 40) % 2 === 0 ? k : 1 - k;
    const x = BEACH.volley + VOLLEY.from.x + Math.round((VOLLEY.to.x - VOLLEY.from.x) * way);
    const y = top + VOLLEY.from.y + Math.round((VOLLEY.to.y - VOLLEY.from.y) * way) - Math.round(Math.sin(k * Math.PI) * 22);
    put(B.ball, PTR.ball, CROWD_COLOURS.ball, st.sxOf(x), y, 4, false);
    t++;
  };
  // he stands with his back to us at the camera's foot, then walks away from us up the beach, between the umbrella and the game and past them, to his towel
  const towelMid = BEACH.towel + 24;
  const from = { cx: WALK_FROM_CX, feet: rowLine(st, 20) }, to = { cx: towelMid, feet: farFeet };
  const walk = 220;
  /** Him from behind at a point of the walk (`f`, 0 to 1), a stride or the other. */
  const away = (f: number, stride: number) => {
    const cx = from.cx + (to.cx - from.cx) * f, feet = Math.round(from.feet + (to.feet - from.feet) * f);
    // (his figure's middle on `cx`: picture column 6.5, a pixel two wide expanded)
    const x = st.sxOf(Math.round(cx - 13));
    put(S.monty, stride ? PTR.backB : PTR.backA, MONTY, x, feet - stride, FULL_FEET);
    put(S.speedo, PTR.speedoBack, CROWD_COLOURS.speedo, x, feet - stride, FULL_FEET);
  };
  yield* frames(40, () => { ball(); away(0, 0); });
  yield* frames(walk + 1, (n) => { ball(); away(n / walk, (n >> 3) % 2); });
  yield* frames(16, ball);
  // settled on his towel beside her: lying back, the glasses on
  const lieX = st.sxOf(BEACH.towel), lieFeet = farFeet - 2;
  put(S.monty, PTR.lying, MONTY, lieX, lieFeet, LYING_FEET);
  put(S.speedo, PTR.speedoLying, CROWD_COLOURS.speedo, lieX, lieFeet, LYING_FEET);
  put(B.shades, PTR.shadesLying, CROWD_COLOURS.shades, lieX, lieFeet, LYING_FEET);
  yield* frames(120, ball);
  // the fade out (the sprites' colours with the picture's): every colour down its ramp together, so the sand and the people dim as one
  // (the cast still drawn every frame, or the engine's item flashing takes sprites 0 and 1's pictures)
  const was = { col: Uint8Array.from(g.col), mc1: g.vic.mc1, mc2: g.vic.mc2 };
  for (dim = 1; dim <= FADE_STEPS; dim++) {
    for (let i = 0; i < g.col.length; i++) g.col[i] = dimmed(was.col[i] ?? 0, dim);
    g.vic.mc1 = dimmed(was.mc1, dim); g.vic.mc2 = dimmed(was.mc2, dim);
    yield* frames(8, ball);
  }
  cast.clear();
  g.enable = 0;
  g.col.fill(0, PLAY_ROW * ROW, (PLAY_ROW + 20) * ROW);
  yield* frames(30);
}

/** The colour of a block of the playfield's cells. */
function tint(g: Game, col: number, row: number, w: number, h: number, colour: number) {
  for (let r = 0; r < h; r++) for (let k = 0; k < w; k++) g.col[(row + r + PLAY_ROW) * ROW + col + k + PLAY_COL] = colour;
}

/**
 * Shot 2's beach (playfield pixels, each picture's left edge; every one expanded, 48 wide): near the camera the umbrella on the left and the volleyball game on the
 * right, with room between them for him to walk up; far up the beach between them, the bikini's towel and his beside it to the east.
 */
const BEACH = { umbrella: 16, volley: 196, bikini: 92, towel: 140 } as const;
/** Where he comes in from under the camera: his figure's middle (playfield pixels). */
const WALK_FROM_CX = 152;
/**
 * The volleyball picture's row of the left player's raised hands (its first lit row in its block), and the ball's way between the two (pixels from the picture's
 * left edge and from that row's top): from over the left player's hands to the right one's arms.
 */
const VOLLEY = { handsRow: LYING_FEET - 14, from: { x: 10, y: 0 }, to: { x: 26, y: 12 } } as const;

/**
 * Shot 2's beach: the sand plain from the shore (row 13) down to the playfield's foot, in the close-up's sand colour, the gutters beside the playfield as the room's
 * loading mirrors them; the umbrella the chair stood under is not in this view (a sprite's umbrella stands on the sand instead: a character pole would show the black behind it).
 */
function beachUp(g: Game, sand: number) {
  const at = (col: number, row: number) => (row + PLAY_ROW) * ROW + col + PLAY_COL;
  const solid = g.mem[SCREEN + at(0, 18)] ?? 0, sea = g.mem[SCREEN + at(0, 12)] ?? 0, seaColour = g.col[at(0, 12)] ?? 0;
  const { umbrella, pole } = BEACH_VIEW;
  for (let row = umbrella.row; row < umbrella.row + 2; row++) for (let col = umbrella.col; col < umbrella.col + 8; col++) g.mem[SCREEN + at(col, row)] = 0;
  g.mem[SCREEN + at(pole.col, 12)] = sea; g.col[at(pole.col, 12)] = seaColour;
  for (let row = 13; row < 20; row++) for (let col = 0; col < PLAY_COLS; col++) {
    if ((g.mem[SCREEN + at(col, row)] ?? 0) >= FIRST_DECOR_CHR && col !== pole.col) continue;
    g.mem[SCREEN + at(col, row)] = solid; g.col[at(col, row)] = sand;
  }
  for (let r = PLAY_ROW; r < PLAY_ROW + 20; r++) {
    const a = r * ROW;
    g.mem[SCREEN + a + 2] = g.mem[SCREEN + a + 3] = g.mem[SCREEN + a + 4] ?? 0;
    g.mem[SCREEN + a + 36] = g.mem[SCREEN + a + 37] = g.mem[SCREEN + a + 35] ?? 0;
    g.col[a + 2] = g.col[a + 3] = g.col[a + 4] ?? 0;
    g.col[a + 36] = g.col[a + 37] = g.col[a + 35] ?? 0;
  }
}

/** The rows of a sprite block with a lit pixel: the first and the last. */
function litRows(b: Uint8Array): { from: number; to: number } {
  let from = 21, to = -1;
  for (let y = 0; y < 21; y++) if ((b[y * 3] ?? 0) | (b[y * 3 + 1] ?? 0) | (b[y * 3 + 2] ?? 0)) { from = Math.min(from, y); to = y; }
  return to < 0 ? { from: 0, to: 0 } : { from, to };
}

/** The columns of a sprite block with a lit pixel: the first and the last. */
function litCols(b: Uint8Array): { from: number; to: number } {
  let from = 24, to = -1;
  for (let x = 0; x < 24; x++) for (let y = 0; y < 21; y++) if ((b[y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) { from = Math.min(from, x); to = Math.max(to, x); break; }
  return to < 0 ? { from: 0, to: 0 } : { from, to };
}
