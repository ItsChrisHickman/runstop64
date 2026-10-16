import type { FrameCapture } from '../c64/machine';
import { decodePicture, type DecodedPicture } from '../c64/picture';
import type { PictureLayout } from '../layout';
import { LOOK, paletteLinear, shiftRoom, type HdBuilder, type HdBuilt, type HdLight, type HdRoom, type HdSurface } from './scene';
import type { RoomPictures } from '../pendragon/room';
import { placePictures } from './placed';

/**
 * The HD view's room for games drawn "obliquely" (the Pendragon games: Staff of Karnath, Entombed,
 * Blackwyche, Dragonskulle): x across, height up, and depth drawn as a step up and to the right.
 * The room is rebuilt in 3D from the picture's own characters: the game says which of its
 * characters are floor (the ones its own floor check accepts, and the edge pieces drawn round them);
 * every other pixel stands upright.
 *
 * - Each patch of floor (pixels joined to each other) is level, at the height of what holds it up:
 *   the upright pixels under its front edge, down to the floor below them (or the bottom of the room).
 *   A floor pixel's depth then follows from where it is in the picture.
 * - Upright pixels stand at the back of the floor below them in their column (a wall at the back of
 *   the floor, a statue on it, the front of a step on the floor in front of it, the side wall of a
 *   corridor along the floor's edge); their height follows from where they are.
 * - Which way each pixel faces comes from its neighbours (a side wall faces across, the back wall out).
 * - The walls go on up past the top of the room's band, fading: the picture stops there, but the
 *   tilted camera sees a little above it where a wall stands further back (an alcove).
 * - Flames are characters too: their pixels of the flame's colour glow, and each gives a light.
 * - Everything is in the colours the game draws it in now (its live multicolours and colour RAM): the
 *   view never shows what the game doesn't. A room the game draws black (Entombed's dark chambers) is
 *   black; a flame drawn black neither glows nor gives light.
 *
 * From one frame to the next (`obliqueRooms`, through HdRooms) only what changed is made again: the
 * same picture moved sideways (a scroll) is the same room moved; the same shapes in new colours (a
 * flame's characters animating) keep their places.
 */
export interface ObliqueSpec {
  /** The picture's lines that show the room (the rest stays as the C64 drew it: a header, a status line). */
  band: { y: number; h: number };
  /** Characters that are all floor. */
  floor: number[];
  /** Characters that are part floor (an edge): their pixels in the floor's colour (multicolour pair `floorPair`) are floor. */
  edges: number[];
  /** The floor's multicolour pair (2 unless said: Dragonskulle's sand is the colour RAM's, 3). */
  floorPair?: number;
  /**
   * What's seen past the room (the sky and the sea over a ship's rail): characters drawn in these
   * colours. Nothing of the room: the picture shows there behind it, and the walls aren't carried on
   * up through it.
   */
  open?: { chars: number[]; colours: number[] };
  /** Flames: characters whose pixels of `pair` glow, and the characters that each give a light (at their middle). */
  flames?: { chars: number[]; pair: number; lights: number[] };
  /**
   * The floor's back edge is drawn ragged (Dragonskulle's sand): the faces standing on it (cliffs, cave
   * walls) stand where it goes on average along this many pixels either side, as one face, not a slab
   * a column.
   */
  ragged?: number;
  /** The player's sprite (a light goes with him). */
  player?: number;
  /** Sprites drawn with another (a weapon with its holder): sprite -> holder. */
  attached?: Record<number, number>;
  /**
   * The game's rooms as pieces (pendragon/room.ts, decoded from its room pictures): where the band shows
   * one of them (or two side by side, scrolling), every pixel is put on the piece it's of (hd/placed.ts),
   * and walls, things and the floor stand where the game's room has them; elsewhere each pixel's depth
   * is worked out from the picture.
   */
  pictures?: RoomPictures;
}

/** An oblique game's rooms, frame by frame, for HdRooms (play.ts's `hd:`); built off the main thread from `work` by work.ts's `buildWork`. */
export function obliqueRooms(spec: ObliqueSpec): HdBuilder {
  return {
    build: (pic, last, layout, reach) => next(spec, pic, last, layout, reach),
    work: (pic, layout) => ({ kind: 'oblique', spec, band: shown(spec.band, layout), picture: bandOf(pic, spec.band) }),
    adopt: (done) => { bases.set(done.room.surface.centre, done.basis); return done.room; },
  };
}

const W = 320;
const FLOOR = 1, UP = 2, OPEN = 3;
/** The fewest pixels a patch of floor has (fewer: they stand). */
const MIN_PATCH = 64;
/** How far the walls go on up past the band's top, and how dark they get there. */
const ABOVE = 48, ABOVE_SHADE = 0.4;
/** Floor found this near the band's top runs on out of it. */
const FLOOR_OUT = 4;
/** The fewest columns a wall's top runs level along to be one the picture cuts off. */
const LEVEL = 8;
/** How far past the furthest a room may be moved a scroll is still looked for (a frame's scroll at most): built again, but the same picture going on. */
const BEYOND = 16;
/** Where a scroll is looked for: the picture away from its edges (where new columns come in). */
const EDGE = 16;
/** A pixel's look: its colour (the low 4 bits), whether it glows (a flame), whether it's a light's character. */
const GLOWS = 0x10, LIGHT = 0x20;

/** The band's rows of a decoded picture (decodePicture's, row-major from the band's top): what a room is built from. */
export interface BandPicture { code: Int16Array; colour: Uint8Array; pair: Uint8Array; row: Int8Array; column: Int8Array }

/**
 * What a room was built from: the band's picture (where a scroll of it is looked for), each pixel's
 * kind and look, and where its lights are (and their flames' colour).
 */
export interface Basis extends BandPicture { kind: Uint8Array; look: Uint8Array; lights: { at: number; colour: number }[] }
/** Each built room's basis, by its surface's places. */
const bases = new WeakMap<Float32Array, Basis>();

/** The room in this frame of the picture, built from scratch. */
export function obliqueRoom(spec: ObliqueSpec, ram: Uint8Array, cap: FrameCapture, layout: PictureLayout | null = null): HdRoom {
  return build(spec, shown(spec.band, layout), read(spec, bandOf(decodePicture(ram, cap), spec.band)));
}

/** A room built from scratch, and what it was built from (work.ts's `buildWork`, off the main thread). */
export function obliqueBuild(spec: ObliqueSpec, band: { y: number; h: number }, picture: BandPicture) {
  const basis = read(spec, picture);
  return { room: build(spec, band, basis), basis };
}

/**
 * The room in this frame of the picture: from `last` where it can be (the same picture moved, no
 * further than `reach`; or the same places in new colours), else built from scratch.
 */
function next(spec: ObliqueSpec, pic: DecodedPicture, last: HdRoom | null, layout: PictureLayout | null, reach: number): HdBuilt {
  const band = shown(spec.band, layout);
  const was = last && last.band.y === band.y && last.band.h === band.h ? bases.get(last.surface.centre) : undefined;
  if (last && was) {
    // the same picture, where it was or moved sideways (a scroll): its characters and colours, pixel
    // for pixel, moved (further than `reach`: built again, the same picture going on)
    for (const s of [last.shift, ...shifts(last.shift, reach + BEYOND)]) {
      if (!moved(was, pic, spec.band.y, s)) continue;
      const d = s - last.shift;
      if (Math.abs(s) <= reach) return { room: d ? { ...shiftRoom(last, d), exact: false } : last, moved: d };
      return { room: build(spec, band, read(spec, bandOf(pic, spec.band))), moved: d };
    }
    // the same shapes in new colours (flames animating): the places kept
    const basis = read(spec, bandOf(pic, spec.band));
    if (last.shift === 0 && same(was, basis)) {
      const surface: HdSurface = { ...last.surface, colour: new Float32Array(last.surface.count * 3), glow: new Float32Array(last.surface.count * 3) };
      bases.set(surface.centre, basis);
      paint(surface, basis);
      return { room: { ...last, surface, exact: true, lights: lightsAt(basis.lights, surface) }, moved: 0 };
    }
    return { room: build(spec, band, basis), moved: null };
  }
  return { room: build(spec, band, read(spec, bandOf(pic, spec.band))), moved: null };
}

/** The band's rows of the picture. */
function bandOf(pic: DecodedPicture, band: { y: number; h: number }): BandPicture {
  const a = band.y * W, b = (band.y + band.h) * W;
  return { code: pic.code.slice(a, b), colour: pic.colour.slice(a, b), pair: pic.pair.slice(a, b), row: pic.row.slice(a, b), column: pic.column.slice(a, b) };
}

/**
 * Where the picture as shown has the room's band: moved with its part of the picture by a layout
 * (layout.ts: Dragonskulle's play area moved up under the status line), else where the machine draws it.
 */
function shown(band: { y: number; h: number }, layout: PictureLayout | null) {
  const move = layout?.moves.find((m) => m.from.y <= band.y && band.y + band.h <= m.from.y + m.from.h && m.from.x === 0 && m.from.w === 320 && m.to.x === 0);
  return move ? { y: move.to.y + band.y - move.from.y, h: band.h } : band;
}

/** The shifts to try from `at` (nearest first), not past `most` from where the room was built. */
function shifts(at: number, most: number) {
  const out: number[] = [];
  for (let d = 1; d <= most; d++) for (const s of [at + d, at - d]) if (Math.abs(s) <= most) out.push(s);
  return out;
}

/**
 * Whether the band of the picture now (from line `top`) is `was`'s moved right by s: every pixel's
 * character, colour and bit pair, away from the picture's edges, now and where it was (a game draws
 * the columns coming in at an edge as they come: what was there isn't the room yet). A frame's look
 * at a scroll costs a comparison, no more: the first difference ends it.
 */
function moved(was: Basis, pic: DecodedPicture, top: number, s: number) {
  const H = was.kind.length / W, { code, colour, pair } = pic;
  const from = Math.max(EDGE, EDGE + s), to = Math.min(W - EDGE, W - EDGE + s);
  for (let y = 0; y < H; y++) {
    const o = (top + y) * W;
    for (let x = from; x < to; x++) {
      const i = o + x, j = y * W + x - s;
      if (code[i] !== was.code[j] || colour[i] !== was.colour[j] || pair[i] !== was.pair[j]) return false;
    }
  }
  return true;
}

/** Whether `now` is `was` in the same places (each pixel's kind), away from the picture's edges. */
function same(was: Basis, now: Basis) {
  const H = now.kind.length / W;
  for (let y = 0; y < H; y++) {
    for (let x = EDGE; x < W - EDGE; x++) if (now.kind[y * W + x] !== was.kind[y * W + x]) return false;
  }
  return true;
}

/**
 * Each pixel of the band: floor, upright or nothing (the border), its look (its colour as the game
 * draws it now); and the middles of the lights' characters whose flame the picture shows.
 */
function read(spec: ObliqueSpec, pic: BandPicture): Basis {
  const H = pic.code.length / W;
  // (what each character code is to the room, looked up: a pixel of a code below 0 is the border)
  const IS_FLOOR = 1, IS_EDGE = 2, IS_FLAME = 4, IS_LIGHT = 8, IS_OPEN = 16;
  const codes = new Uint8Array(256), openColour = new Uint8Array(16);
  const mark = (list: number[] | undefined, bit: number) => { for (const c of list ?? []) codes[c & 255] |= bit; };
  mark(spec.floor, IS_FLOOR); mark(spec.edges, IS_EDGE); mark(spec.flames?.chars, IS_FLAME); mark(spec.flames?.lights, IS_LIGHT); mark(spec.open?.chars, IS_OPEN);
  for (const c of spec.open?.colours ?? []) openColour[c & 15] = 1;
  const floorPair = spec.floorPair ?? 2, flamePair = spec.flames?.pair ?? -1;
  const kind = new Uint8Array(W * H), look = new Uint8Array(W * H), seen: { row: number; x: number; at: number; colour: number }[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, code = pic.code[i], pair = pic.pair[i];
    if (code < 0) continue;
    const is = codes[code & 255], colour = pic.colour[i] & 15;
    // (open first: a character can be the sky in one colour and floor in another)
    kind[i] = is & IS_OPEN && openColour[colour] ? OPEN : is & IS_FLOOR || (is & IS_EDGE && pair === floorPair) ? FLOOR : UP;
    // (a flame's pixel glows only in a colour: drawn black, it's out)
    const glows = is & IS_FLAME && pair === flamePair && colour !== 0;
    look[i] = colour | (glows ? GLOWS : 0) | (is & IS_LIGHT ? LIGHT : 0);
    // a light at the middle of each light character (the character's top left: its first pixel found)
    // whose flame shows
    if (!(is & IS_LIGHT)) continue;
    const row = pic.row[i], o =seen.find((c) => c.row === row && Math.abs(c.x - x) < 8);
    const flame = glows ? colour : -1;
    if (o) { if (o.colour < 0) o.colour = flame; } else seen.push({ row, x, at: Math.min(H - 1, y + 4) * W + Math.min(W - 1, x + 4), colour: flame });
  }
  const lights = seen.filter((c) => c.colour >= 0).map(({ at, colour }) => ({ at, colour }));
  // what's seen past the room goes on into the characters drawn against it, in its colour, whatever
  // they are elsewhere (the sea between the tops of Dragonskulle's cliffs: the sand's edge characters,
  // their sand's pair drawn in the sea's blue there, read as patches of floor up on the cliffs): out
  // from its own characters through pixels of the same colour
  const open = new Int32Array(W * H);
  let n = 0;
  for (let i = 0; i < W * H; i++) if (kind[i] === OPEN) open[n++] = i;
  const spread = (i: number, j: number) => {
    if ((kind[j] === UP || kind[j] === FLOOR) && (look[j] & 15) === (look[i] & 15)) { kind[j] = OPEN; open[n++] = j; }
  };
  for (let k = 0; k < n; k++) {
    const i = open[k], x = i % W;
    if (x > 0) spread(i, i - 1);
    if (x < W - 1) spread(i, i + 1);
    if (i >= W) spread(i, i - W);
    if (i < W * (H - 1)) spread(i, i + W);
  }
  // above the room: the background showing down each column from the band's top is nothing (not a
  // black wall), down to the first thing drawn
  for (let x = 0; x < W; x++) for (let y = 0; y < H && kind[y * W + x] && !pic.pair[y * W + x]; y++) kind[y * W + x] = 0;
  return { ...pic, kind, look, lights };
}

/** Pixel j's neighbour (e: 0 left, 1 right, 2 up, 3 down) in a band H high, or -1 past its edge. */
function neighbour(j: number, e: number, H: number) {
  const x = j % W;
  return e === 0 ? (x > 0 ? j - 1 : -1) : e === 1 ? (x < W - 1 ? j + 1 : -1) : e === 2 ? (j >= W ? j - W : -1) : j < W * (H - 1) ? j + W : -1;
}

/** The room built from scratch: from the game's rooms as pieces where it has them (placed.ts), else with each pixel's depth worked out from the picture. */
function build(spec: ObliqueSpec, band: { y: number; h: number }, basis: Basis): HdRoom {
  const placed = spec.pictures ? placePictures(spec.pictures, band, basis) : null;
  if (!placed) return assemble(spec, band, basis, infer(band, basis, spec.ragged));
  const kind = basis.kind.slice();
  for (let i = 0; i < kind.length; i++) if (kind[i] === FLOOR || kind[i] === UP) kind[i] = placed.floor[i] ? FLOOR : UP;
  return assemble(spec, band, basis, { kind, px: placed.px, pivot: placed.pivot, most: JOIN_PLACED });
}

/** Where each pixel of the band is in the room, and the room's pivot (the middle of its floor). */
interface Depths { kind: Uint8Array; px: Float32Array; pivot: { x: number; y: number; z: number }; most: number }

/** Each pixel's depth worked out from the picture's characters (what's floor, what stands on it). */
function infer(band: { y: number; h: number }, basis: Basis, ragged: number | undefined): Depths {
  const H = band.h, base = band.y + band.h;
  const kind = basis.kind.slice();
  // (a speck that isn't floor, smaller than a character, with floor all round it, is a mark lying on
  // the floor: a starfish on the sand, a piece on the planks)
  const seen = new Uint8Array(W * H), pixels = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (kind[i] !== UP || seen[i]) continue;
    let n = 1, enclosed = true;
    pixels[0] = i; seen[i] = 1;
    for (let k = 0; k < n; k++) {
      for (let e = 0; e < 4; e++) {
        const j = neighbour(pixels[k], e, H);
        if (j < 0) enclosed = false;
        else if (kind[j] === UP) { if (!seen[j]) { seen[j] = 1; pixels[n++] = j; } } else if (kind[j] !== FLOOR) enclosed = false;
      }
    }
    if (enclosed && n < MIN_PATCH) for (let k = 0; k < n; k++) kind[pixels[k]] = FLOOR;
  }
  // the patches of floor (joined to each other): each one's pixels a stretch of `members`
  const patch = new Int32Array(W * H).fill(-1), members = new Int32Array(W * H), patches: { bottom: number; from: number; to: number }[] = [];
  let end = 0;
  for (let i = 0; i < W * H; i++) {
    if (kind[i] !== FLOOR || patch[i] >= 0) continue;
    const id = patches.length, from = end;
    members[end++] = i;
    patch[i] = id;
    for (let k = from; k < end; k++) {
      for (let e = 0; e < 4; e++) {
        const j = neighbour(members[k], e, H);
        if (j >= 0 && kind[j] === FLOOR && patch[j] < 0) { patch[j] = id; members[end++] = j; }
      }
    }
    // (a speck of floor smaller than a character is a picture's detail, a tile's edge in a wall: it stands)
    if (end - from < MIN_PATCH) { for (let k = from; k < end; k++) { kind[members[k]] = UP; patch[members[k]] = -1; } end = from; continue; }
    let bottom = 0;
    for (let k = from; k < end; k++) bottom = Math.max(bottom, Math.floor(members[k] / W));
    patches.push({ bottom, from, to: end });
  }
  // each patch's height, lowest first: what holds up its front edge (the most common answer along it)
  const height = new Float64Array(patches.length).fill(NaN);
  const order = patches.map((_, i) => i).sort((a, b) => patches[b].bottom - patches[a].bottom);
  for (let pass = 0; pass < 3; pass++) for (const id of order) {
    if (!isNaN(height[id])) continue;
    const votes = new Map<number, number>();
    for (let k = patches[id].from; k < patches[id].to; k++) {
      const j = members[k], x = j % W, y = (j - x) / W;
      if (y < H - 1 && patch[j + W] === id) continue; // (not its front edge)
      let yy = y + 1, n = 0;
      while (yy < H && kind[yy * W + x] !== FLOOR) { n++; yy++; }
      let h: number;
      if (yy >= H) h = n;
      else {
        const below = height[patch[yy * W + x]];
        if (isNaN(below)) continue;
        h = below + n + 1;
      }
      votes.set(h, (votes.get(h) ?? 0) + 1);
    }
    let best = NaN, most = 0;
    for (const [h, v] of votes) if (v > most) { most = v; best = h; }
    if (!isNaN(best) || pass === 2) height[id] = isNaN(best) ? 0 : best;
  }
  // where each pixel is: floor by its patch's height; upright at the back of the floor below it
  const px = new Float32Array(W * H * 3);
  for (let x = 0; x < W; x++) {
    let back = 0; // the depth of the floor last passed going up the column
    for (let y = H - 1; y >= 0; y--) {
      const i = y * W + x, sy = base - (band.y + y) - 0.5; // (y + z there)
      let wy: number, wz: number;
      if (kind[i] === FLOOR) { wy = height[patch[i]]; wz = sy - wy; back = wz + 0.5; }
      else { wz = back; wy = sy - wz; }
      px[i * 3] = x + 0.5 - wz; px[i * 3 + 1] = wy; px[i * 3 + 2] = wz;
    }
  }
  slopes(kind, px, base, band.y);
  behindThings(kind, basis.code, px, base, band.y);
  if (ragged) alongRaggedEdge(kind, px, base, band.y, ragged);
  // upright pixels' depth evened out along a row (a side wall's foot follows the floor's edge in steps
  // of a multicolour pixel: two columns at a depth, then two further in), keeping the picture's place
  const even = new Float32Array(W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, z = px[i * 3 + 2];
      if (kind[i] !== UP) { even[x] = z; continue; }
      let sum = 0, n = 0;
      for (let d = -2; d <= 2; d++) {
        const j = i + d;
        if (x + d < 0 || x + d >= W || kind[j] !== UP || Math.abs(px[j * 3 + 2] - z) > 3) continue;
        sum += px[j * 3 + 2]; n++;
      }
      even[x] = sum / n;
    }
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (kind[i] !== UP) continue;
      const sy = base - (band.y + y) - 0.5, z = even[x];
      px[i * 3] = x + 0.5 - z; px[i * 3 + 1] = sy - z; px[i * 3 + 2] = z;
    }
  }
  // the pivot: the middle of the floor (the most of it)
  const most = patches.reduce<(typeof patches)[number] | null>((a, p) => (!a || p.to - p.from > a.to - a.from ? p : a), null);
  const pivot = { x: 160, y: 0, z: 0 };
  if (most) {
    const n = most.to - most.from;
    pivot.x = 0;
    for (let k = most.from; k < most.to; k++) { const i = members[k]; pivot.x += px[i * 3] / n; pivot.y += px[i * 3 + 1] / n; pivot.z += px[i * 3 + 2] / n; }
  }
  return { kind, px, pivot, most: JOIN.most };
}

/** The room from where each pixel is: a quad a pixel, the walls carried on up, the faces joining steps, the light. */
function assemble(spec: ObliqueSpec, band: { y: number; h: number }, basis: Basis, { kind, px, pivot, most }: Depths): HdRoom {
  const H = band.h, base = band.y + band.h;
  // the quads: one a pixel; then the walls on up past the band's top (each top pixel that stands, ABOVE more)
  const cell = new Int32Array(W * H).fill(-1);
  let count = 0;
  for (let i = 0; i < W * H; i++) if (kind[i] === FLOOR || kind[i] === UP) cell[i] = count++;
  // (what the picture cuts off: in each column the first thing drawn down from the band's top, if
  // it's upright, level along a run of columns and within a character of the highest (a wall's own
  // top drawn lower down, or slanting like a side wall's, is where it ends); or floor running on
  // out of the band's top)
  const top = new Int32Array(W).fill(-1), floorOut = new Int32Array(W).fill(-1);
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H && !kind[y * W + x]) y++;
    if (y < H && kind[y * W + x] === UP) top[x] = y;
    // (floor's dark lines at the top are taken for the background above it: a few rows down is the same floor)
    if (y < FLOOR_OUT && kind[y * W + x] === FLOOR) floorOut[x] = y;
  }
  const highest = Math.min(H, ...top.filter((y) => y >= 0));
  const cut = new Uint8Array(W);
  for (let x = 0; x < W;) {
    let e = x + 1;
    while (e < W && top[e] === top[x]) e++;
    if (top[x] >= 0 && top[x] <= highest + 8 && e - x >= LEVEL) cut.fill(1, x, e);
    x = e;
  }
  // (and a few columns of wall between two carried on, its top a little lower or higher: a notch in
  // the top the camera would see over)
  for (let x = 1; x < W;) {
    if (cut[x] || !cut[x - 1]) { x++; continue; }
    let e = x;
    while (e < W && !cut[e] && top[e] >= 0 && top[e] <= highest + 8) e++;
    if (e < W && cut[e] && e - x < LEVEL) cut.fill(1, x, e);
    x = e + 1;
  }
  let above = 0;
  for (let x = 0; x < W; x++) if (cut[x]) above += top[x] + ABOVE; else top[x] = -1;
  for (let x = 0; x < W; x++) if (floorOut[x] >= 0) above += floorOut[x] + ABOVE;
  const joins = steps(kind, px, most);
  const all = count + above + joins.length / 3;
  const surface: HdSurface = {
    count: all, cell, floor: new Uint8Array(W * H), open: new Uint8Array(W * H),
    centre: new Float32Array(all * 3), u: new Float32Array(all * 3), v: new Float32Array(all * 3), normal: new Float32Array(all * 3),
    colour: new Float32Array(all * 3), glow: new Float32Array(all * 3), source: new Int32Array(all), shade: new Float32Array(all).fill(1),
    occlusion: new Float32Array(all).fill(1),
  };
  occlude(kind, cell, surface.occlusion);
  /** Whether pixel j is a neighbour of i on the same surface (the same kind, and joined on). */
  const near = (i: number, j: number) => {
    if (j < 0 || kind[j] !== kind[i]) return false;
    const dx = px[j * 3] - px[i * 3], dy = px[j * 3 + 1] - px[i * 3 + 1], dz = px[j * 3 + 2] - px[i * 3 + 2];
    return dx * dx + dy * dy + dz * dz < 6.25;
  };
  /** A quad's half-edge into `out` from its neighbours a (ahead) and z (behind), or the default (dx, dy, dz). */
  const edge = (i: number, o: number, a: number, z: number, out: Float32Array, dx: number, dy: number, dz: number) => {
    const na = near(i, a), nz = near(i, z), from = nz ? z : i, to = na ? a : i, d = na && nz ? 4 : 2;
    if (!na && !nz) { out[o] = dx / 2; out[o + 1] = dy / 2; out[o + 2] = dz / 2; return; }
    for (let k = 0; k < 3; k++) out[o + k] = (px[to * 3 + k] - px[from * 3 + k]) / d;
  };
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  const { u, v, normal, centre } = surface;
  for (let i = 0; i < W * H; i++) if (kind[i] === OPEN) surface.open[i] = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = cell[i];
    if (c < 0) continue;
    const isFloor = kind[i] === FLOOR, o = c * 3, wx = px[i * 3], wy = px[i * 3 + 1], wz = px[i * 3 + 2];
    surface.floor[i] = isFloor ? 1 : 0;
    surface.source[c] = i;
    centre[o] = wx; centre[o + 1] = wy; centre[o + 2] = wz;
    if (wx < x0) x0 = wx; if (wx > x1) x1 = wx;
    if (wy < y0) y0 = wy; if (wy > y1) y1 = wy;
    if (wz < z0) z0 = wz; if (wz > z1) z1 = wz;
    // u: towards the picture's right; v: towards its top (half a pixel each way)
    edge(i, o, x < W - 1 ? i + 1 : -1, x > 0 ? i - 1 : -1, u, 1, 0, 0);
    if (isFloor) edge(i, o, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1, v, -1, 0, 1);
    else edge(i, o, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1, v, 0, 1, 0);
    // the normal: v × u (facing up for floor, out of the picture for the back wall)
    const nx = v[o + 1] * u[o + 2] - v[o + 2] * u[o + 1], ny = v[o + 2] * u[o] - v[o] * u[o + 2], nz = v[o] * u[o + 1] - v[o + 1] * u[o];
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    normal[o] = nx / nl; normal[o + 1] = ny / nl; normal[o + 2] = nz / nl;
  }
  // (each wall carried on upright from its top pixel, through the nothing above it and on past the
  // band's top, darkening; floor running out of it carried on further back, level)
  let q = count;
  for (let x = 0; x < W; x++) {
    if (floorOut[x] < 0) continue;
    const from = floorOut[x] * W + x, t = cell[from] * 3, n = floorOut[x] + ABOVE;
    for (let k = 1; k <= n; k++, q++) {
      const o = q * 3;
      centre[o] = centre[t]; centre[o + 1] = centre[t + 1]; centre[o + 2] = centre[t + 2] + k;
      for (let j = 0; j < 3; j++) { u[o + j] = u[t + j]; v[o + j] = v[t + j]; normal[o + j] = normal[t + j]; }
      surface.source[q] = from;
      surface.shade[q] = Math.max(ABOVE_SHADE, 1 - (1 - ABOVE_SHADE) * (k / ABOVE));
    }
  }
  for (let x = 0; x < W; x++) {
    if (top[x] < 0) continue;
    const from = top[x] * W + x, t = cell[from] * 3, n = top[x] + ABOVE;
    for (let k = 1; k <= n; k++, q++) {
      const o = q * 3;
      centre[o] = centre[t]; centre[o + 1] = centre[t + 1] + k; centre[o + 2] = centre[t + 2];
      u[o] = u[t]; u[o + 1] = u[t + 1]; u[o + 2] = u[t + 2];
      v[o] = 0; v[o + 1] = 0.5; v[o + 2] = 0;
      normal[o] = normal[t]; normal[o + 1] = normal[t + 1]; normal[o + 2] = normal[t + 2];
      surface.source[q] = from;
      surface.shade[q] = Math.max(ABOVE_SHADE, 1 - (1 - ABOVE_SHADE) * (k / ABOVE));
    }
  }
  // (where upright pixels side by side, or one above the other, stand at different depths: the face
  // joining them, along the way the picture looks into the room (a step back is a pixel left and down
  // there): where the picture had them meet, so the camera at rest sees none of it; moved, it's the
  // side of what stands nearer (a corner in the wall, a cupboard's side and top), not a gap)
  const R = Math.SQRT1_2;
  for (let k = 0; k < joins.length; k += 3, q++) {
    const a = joins[k], b = joins[k + 1], across = joins[k + 2] === 1, o = q * 3;
    const za = px[a * 3 + 2], zb = px[b * 3 + 2], zm = (za + zb) / 2, h = (zb - za) / 2, x = a % W, y = (a - x) / W;
    const X = across ? x + 1 : x + 0.5, sy = base - (band.y + y) - (across ? 0.5 : 1);
    centre[o] = X - zm; centre[o + 1] = sy - zm; centre[o + 2] = zm;
    const along = across ? u : v, other = across ? v : u;
    along[o] = -h; along[o + 1] = -h; along[o + 2] = h;
    other[o] = across ? 0 : 0.5; other[o + 1] = across ? 0.5 : 0; other[o + 2] = 0;
    normal[o] = across ? -R : 0; normal[o + 1] = across ? 0 : R; normal[o + 2] = across ? -R : R;
    surface.source[q] = za < zb ? a : b;
    surface.shade[q] = JOIN_SHADE;
  }
  bases.set(centre, basis);
  paint(surface, basis);
  return {
    band, surface, lights: lightsAt(basis.lights, surface), pivot, eye: pivot.z,
    bounds: { min: [x0, y0, z0], max: [x1, y1, z1] }, shift: 0, exact: true,
    player: spec.player ?? null,
    attached: spec.attached ?? {},
  };
}

/** How far apart in depth upright neighbours are to be joined by a face (less: the quads meet already; more: one stands well clear of the other), and how dark the face is. */
const JOIN = { least: 1.5, most: 48 }, JOIN_SHADE = 0.7;
/**
 * In a room built from the game's pieces, only what stands this close in front of what's behind it is
 * joined to it (a post, a cupboard, a barrel against the wall: their sides); further, it's a thing
 * standing clear (a chair at the table: what's between them is the room behind, not a face).
 */
const JOIN_PLACED = 12;

/**
 * The upright neighbours to join: three numbers each, the pixel, its neighbour (right, or below), and
 * 1 if side by side (0: one above the other).
 */
function steps(kind: Uint8Array, px: Float32Array, most: number): number[] {
  const H = kind.length / W, out: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (kind[i] !== UP) continue;
    for (let across = 1; across >= 0; across--) {
      const j = across ? (x < W - 1 ? i + 1 : -1) : y < H - 1 ? i + W : -1;
      if (j < 0 || kind[j] !== UP) continue;
      const d = Math.abs(px[i * 3 + 2] - px[j * 3 + 2]);
      if (d > JOIN.least && d <= most) out.push(i, j, across);
    }
  }
  return out;
}

/** How far (pixels) from where a wall meets the floor the corner darkens, on the floor and up the wall, and how much at most. */
const CORNER = { floor: 8, wall: 6, most: 0.6 };

/**
 * Where a wall meets the floor, less of the light everywhere gets in (ambient occlusion: the corner
 * darkens, and the room's depth reads): down each column, a floor pixel by how near the wall standing
 * behind it is (the upright pixels above it in the picture), an upright one by how near the floor in
 * front of it is (below it).
 */
function occlude(kind: Uint8Array, cell: Int32Array, out: Float32Array) {
  const H = kind.length / W, dip = (d: number, r: number) => 1 - CORNER.most * (1 - d / r) ** 2;
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const i = y * W + x, c = cell[i];
      if (c < 0) continue;
      const floor = kind[i] === FLOOR, r = floor ? CORNER.floor : CORNER.wall, want = floor ? UP : FLOOR, step = floor ? -1 : 1;
      for (let d = 1; d < r; d++) {
        const yy = y + d * step;
        if (yy < 0 || yy >= H) break;
        const k = kind[yy * W + x];
        if (k === want) { out[c] = dip(d - 1, r); break; }
        if (k !== kind[i]) break;
      }
    }
  }
}

/** The deepest step of a stair (a character: the floor's edge drawn a character at a time), and the steepest (depth per column). */
const STAIR = 8, STEEP = 1.25;

/**
 * Side walls as slopes, not stairs. A wall going back into the picture (a side wall, a room's
 * divider) is a column deeper for each column further right (the picture puts a step into the room
 * a pixel right), but the floor's edge it stands on is often drawn a character at a time, so its
 * columns came out as stairs: a slab a character wide at one depth, the next a character further
 * back. Along each row, three or more upright stretches at one depth, side by side, each step no
 * more than a character deeper and about as deep as their middles are apart, are such a stair: put
 * on the slope through their middles. A level wall, a step of something in front, and walls at other
 * angles stay as they are (smoothing those bent walls with things in front of them; a floor edge drawn
 * ragged, Dragonskulle's cliffs coming forward along the beach, is the game's to say: `ragged`).
 */
function slopes(kind: Uint8Array, px: Float32Array, base: number, top: number) {
  const H = kind.length / W;
  type Run = { a: number; b: number; z: number; m: number };
  for (let y = 0; y < H; y++) {
    // the stretches of the row: upright pixels side by side at one depth
    const runs: Run[] = [];
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (kind[i] !== UP) continue;
      const z = px[i * 3 + 2], last = runs[runs.length - 1];
      if (last && last.b === x && Math.abs(last.z - z) < 0.01) { last.b++; last.m = (last.a + last.b - 1) / 2; } else runs.push({ a: x, b: x + 1, z, m: x });
    }
    // (a step of a stair: the next stretch right beside it, no more than a character deeper or nearer,
    // not too steep; its slope. Not from a stretch the picture's edge cuts: where its middle is isn't known)
    const slope = (r: Run, n: Run) => {
      const d = n.z - r.z, s = d / (n.m - r.m);
      return n.a === r.b && r.a > 0 && n.b < W && Math.abs(d) >= 2 && Math.abs(d) <= STAIR && Math.abs(s) <= STEEP ? s : NaN;
    };
    for (let k = 0; k + 1 < runs.length;) {
      // a stair: two or more steps one way, as a side wall goes
      let e = k;
      const s0 = slope(runs[k], runs[k + 1]);
      while (e + 1 < runs.length && Math.sign(slope(runs[e], runs[e + 1])) === Math.sign(s0)) e++;
      if (isNaN(s0) || e - k < 2 || Math.abs(s0 - 1) > 0.5) { k = Math.max(k + 1, e); continue; }
      const sy = base - (top + y) - 0.5;
      for (let j = k; j <= e; j++) {
        const r = runs[j];
        for (let x = r.a; x < r.b; x++) {
          // (between the middles of this stretch and the one beside it on that side; past the ends, on as the end's step goes)
          const o = x < r.m ? (j > k ? runs[j - 1] : runs[j + 1]) : (j < e ? runs[j + 1] : runs[j - 1]);
          const i = y * W + x, z = r.z + ((o.z - r.z) / (o.m - r.m)) * (x - r.m);
          px[i * 3] = x + 0.5 - z; px[i * 3 + 1] = sy - z; px[i * 3 + 2] = z;
        }
      }
      k = e;
    }
  }
}

/**
 * How much nearer than the wall either side an upright pixel is to be taken for something in front of
 * it; and how far along the row either side the wall is looked for (wider than what stands in front of
 * walls; not the whole row, so what scrolls in at an edge changes only what's near it).
 */
const DIP = 2, ALONG = 48;

/**
 * The deepest of `z` over [x - ALONG, x] (`left`) and [x, x + ALONG] (`right`) for each x of a row, in
 * one go each way (in blocks of ALONG + 1: the deepest from each block's start, and to its end).
 */
function windowMax(z: Float32Array, left: Float32Array, right: Float32Array, from: Float32Array, to: Float32Array) {
  const k = ALONG + 1;
  for (let x = 0; x < W; x++) from[x] = x % k ? Math.max(from[x - 1], z[x]) : z[x];
  for (let x = W - 1; x >= 0; x--) to[x] = x % k === k - 1 || x === W - 1 ? z[x] : Math.max(to[x + 1], z[x]);
  for (let x = 0; x < W; x++) {
    left[x] = x - k + 1 < 0 ? from[x] : Math.max(to[x - k + 1], from[x]);
    right[x] = Math.max(to[x], from[Math.min(W - 1, x + k - 1)]);
  }
}

/**
 * A wall with something standing in front of it (a cannon, a cupboard): in those columns the floor
 * seen below is the thing's, so the wall above it would stand as far forward as the thing (a slab
 * jutting out of the wall). Along each row of upright pixels, the wall is the deepest there is on both
 * sides (the deepest to the left and to the right, ALONG: a side wall going back stays as it is); a
 * pixel nearer than that is the thing in front, or the wall behind it, above the thing: down each
 * column from the top of what stands there, the wall goes on while it's drawn with the wall's own
 * characters (ones the row shows where it's the deepest round it); from the first that isn't, the thing.
 */
function behindThings(kind: Uint8Array, code: Int16Array, px: Float32Array, base: number, top: number) {
  const H = kind.length / W, left = new Float32Array(W), right = new Float32Array(W), from = new Float32Array(W), to = new Float32Array(W);
  const z = new Float32Array(W), wall = new Uint8Array(256);
  // (per pixel: the wall's depth behind it if it's nearer than that and drawn like the wall, NaN if
  // nearer and not drawn like the wall, -Infinity if it's the wall already)
  const behind = new Float32Array(W * H).fill(-Infinity);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) z[x] = kind[y * W + x] === UP ? px[(y * W + x) * 3 + 2] : -Infinity;
    windowMax(z, left, right, from, to);
    wall.fill(0);
    for (let x = 0; x < W; x++) if (kind[y * W + x] === UP && z[x] >= Math.max(left[x], right[x]) - DIP) wall[code[y * W + x] & 255] = 1;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, b = Math.min(left[x], right[x]);
      if (kind[i] === UP && z[x] < b - DIP) behind[i] = wall[code[i] & 255] ? b : NaN;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0, wall = true; y < H; y++) {
      const i = y * W + x, b = behind[i];
      if (kind[i] !== UP) { wall = true; continue; }
      if (b === -Infinity) continue;
      if (!wall || isNaN(b)) { wall = false; continue; }
      const sy = base - (top + y) - 0.5;
      px[i * 3] = x + 0.5 - b; px[i * 3 + 1] = sy - b; px[i * 3 + 2] = b;
    }
  }
}

/**
 * Faces standing on a floor whose back edge is drawn ragged (`ragged`: Dragonskulle's sand against its
 * cliffs and cave walls, its edge going up and down a pixel or two at a time and in characters): each
 * column of a face stands where the edge's raggedness puts it, a slab at each depth with gaps between
 * them, and a face coming forward along the beach a stair of slabs. In each column the upright pixels
 * are taken by face (their depths, apart by no more than a character and a half: a cliff above the
 * sand, the rocks below it in front), each face at its middle depth; each is put where the same face
 * stands on average in the columns within `r` either side (the face there nearest its depth, within a
 * character and a half), its pixels with it: one face along the edge, upright, where the edge goes on
 * average.
 */
function alongRaggedEdge(kind: Uint8Array, px: Float32Array, base: number, top: number, r: number) {
  const H = kind.length / W, near = 1.5 * STAIR;
  // (each column's faces: their middle depths, from the front)
  const faces: number[][] = [];
  for (let x = 0; x < W; x++) {
    const z: number[] = [];
    for (let y = 0; y < H; y++) if (kind[y * W + x] === UP) z.push(px[(y * W + x) * 3 + 2]);
    z.sort((p, q) => p - q);
    const mids: number[] = [];
    for (let k = 0; k < z.length;) {
      let e = k + 1;
      while (e < z.length && z[e] - z[e - 1] <= near) e++;
      mids.push(z[(k + e) >> 1]);
      k = e;
    }
    faces.push(mids);
  }
  for (let x = 0; x < W; x++) {
    const mids = faces[x];
    if (!mids.length) continue;
    const to = mids.map((f) => {
      let sum = 0, n = 0;
      for (let d = Math.max(-x, -r); d <= r && x + d < W; d++) {
        let best = NaN;
        for (const g of faces[x + d]) if (Math.abs(g - f) <= near && !(Math.abs(best - f) <= Math.abs(g - f))) best = g;
        if (!isNaN(best)) { sum += best; n++; }
      }
      return sum / n;
    });
    for (let y = 0; y < H; y++) {
      const i = y * W + x;
      if (kind[i] !== UP) continue;
      // (its face: the one whose middle is nearest its depth)
      const z = px[i * 3 + 2];
      let k = 0;
      for (let j = 1; j < mids.length; j++) if (Math.abs(mids[j] - z) < Math.abs(mids[k] - z)) k = j;
      const m = to[k], sy = base - (top + y) - 0.5;
      px[i * 3] = x + 0.5 - m; px[i * 3 + 1] = sy - m; px[i * 3 + 2] = m;
    }
  }
}

/** Each quad's colour (its pixel's, shaded) and glow (a flame's pixel: its own colour, brighter). */
function paint(surface: HdSurface, basis: Basis) {
  const g = LOOK.flame.glow;
  for (let q = 0; q < surface.count; q++) {
    const look = basis.look[surface.source[q]], rgb = PALETTE[look & 15], k = surface.shade[q], o = q * 3;
    surface.colour[o] = rgb[0] * k; surface.colour[o + 1] = rgb[1] * k; surface.colour[o + 2] = rgb[2] * k;
    const light = look & GLOWS && k === 1 ? g : 0;
    surface.glow[o] = rgb[0] * light; surface.glow[o + 1] = rgb[1] * light; surface.glow[o + 2] = rgb[2] * light;
  }
}
const PALETTE = Array.from({ length: 16 }, (_, c) => paletteLinear(c));

/** A light out from the wall at each of these band pixels (where the surface has them), warm, half way to its flame's colour. */
function lightsAt(at: Basis['lights'], surface: HdSurface): HdLight[] {
  const f = LOOK.flame;
  return at.filter((l) => surface.cell[l.at] >= 0).map((l) => {
    const o = surface.cell[l.at] * 3, c = PALETTE[l.colour], top = Math.max(...c);
    return {
      x: surface.centre[o], y: surface.centre[o + 1], z: surface.centre[o + 2] - f.out, intensity: f.intensity, range: f.range, kind: 'flame' as const,
      colour: [(f.colour[0] + c[0] / top) / 2, (f.colour[1] + c[1] / top) / 2, (f.colour[2] + c[2] / top) / 2],
    };
  });
}
