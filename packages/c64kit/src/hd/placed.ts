import { pixelPieces, type RoomPicture, type RoomPictures } from '../pendragon/room';
import type { BandPicture } from './oblique';

/**
 * The HD view's room from the game's rooms as pieces (pendragon/room.ts): which of the game's room
 * pictures the band shows (one, or two side by side scrolled: Blackwyche's deck; or a window of a
 * picture wider than the band, a strip of rooms scrolling along it: Karnath's), found by its characters, and
 * every pixel put on the piece of the room it's of: the floor level, the back wall one plane the whole
 * width of the room, a side wall going back along its slope, a thing standing at its front. So the
 * planks of a wall line up across the posts in front of them, and a table stands where its legs do.
 *
 * Where the game draws a character its picture doesn't have there (a thing put down, a door opened), the
 * pixel is on the piece its picture has at that place.
 */
export interface Placed {
  /** Per pixel of the band: whether it's on the floor, and where it is in the room (3 numbers each: x, height, depth). */
  floor: Uint8Array;
  px: Float32Array;
  /** Per pixel of the band: its piece (the picture's index × 256 + the piece's, in `pictures`), or -1. */
  piece: Int32Array;
  pivot: { x: number; y: number; z: number };
  /** What the band shows: a picture, from its column `from` (and the next beside it, or on along it if it's wider than the band), and how many of its cells the game draws differently. */
  shows: { left: RoomPicture; right: RoomPicture; from: number; differ: number; cells: number; whole?: boolean };
}

const W = 320;
/** The band's width in characters. */
const BAND = W / 8;
/** The columns of the band the screen doesn't show while the picture scrolls (it's 38 columns wide then). */
const HIDDEN = 2;
/** The most of a band's cells the game may draw differently from its picture for the band to be that picture. */
const DIFFER = 0.25;

/** Each picture's pixels' pieces (made once a picture). */
const pieceMaps = new WeakMap<RoomPicture, Uint8Array>();
function piecesOf(p: RoomPicture) {
  let m = pieceMaps.get(p);
  if (!m) { m = pixelPieces(p); pieceMaps.set(p, m); }
  return m;
}

/** The band placed on the game's room pictures, or null if it shows none of them. */
export function placePictures(pictures: RoomPictures, band: { y: number; h: number }, pic: BandPicture): Placed | null {
  const H = band.h, all = pictures.pictures;
  if (!all.length || all.some((p) => p.rows * 8 !== H || p.cols < BAND)) return null;
  const R = all[0].rows, C = BAND;
  // the band's characters: each cell's code (-1 where none shows), where each character row starts and its scroll
  let first = 127;
  for (let i = 0; i < W * H; i++) if (pic.row[i] >= 0 && pic.row[i] < first) first = pic.row[i];
  const grid = new Int16Array(C * R).fill(-1), top = new Int32Array(R).fill(-1), xs = new Int32Array(R).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = pic.row[i] - first, c = pic.column[i];
    if (pic.row[i] < 0 || c < 0 || r >= R) continue;
    if (top[r] < 0) top[r] = y;
    if (xs[r] < 0 && c === 1) xs[r] = x - 8;
    if (grid[r * C + c] < 0) grid[r * C + c] = pic.code[i];
  }
  // which picture (and the next beside it) the band shows, and from which of its columns: the fewest cells differing
  let best: { left: RoomPicture; right: RoomPicture; from: number; differ: number; whole: boolean } | null = null, cells = 0;
  for (const g of grid) if (g >= 0) cells++;
  /** How many cells differ with the band showing `left` from its column `from` (`right` beside it), or -1 if more than `limit`. */
  const differing = (left: RoomPicture, right: RoomPicture, from: number, limit: number, whole: boolean) => {
    let differ = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const g = grid[r * C + c], k = from + c, p = k < left.cols ? left : right, pc = k < left.cols ? k : k - left.cols;
      // (a picture shown by itself, overhanging: what's past its end is no part of it, not the picture again)
      if (whole && bounded && k >= left.cols) continue;
      // (a column past the picture's end is one the screen doesn't show: it's 38 columns wide when scrolling)
      if (g >= 0 && pc >= 0 && pc < p.cols && p.codes[r * p.cols + pc] !== g && ++differ > limit) return -1;
    }
    return differ;
  };
  const windows: [RoomPicture, RoomPicture, number, boolean][] = [], bounded = pictures.overhang !== undefined;
  // (a picture as wide as the band shows as it is; a wider one, a strip of rooms, from each column the band can start at: the last two of its columns the screen doesn't show)
  // (or, where the game says so, one the band overhangs either side: Entombed's wider chambers)
  const over = pictures.overhang ?? HIDDEN;
  for (const p of all) for (let from = pictures.overhang ? -over : 0; from + BAND - over <= p.cols; from++) windows.push([p, p, from, true]);
  for (const [a, b] of pictures.beside) for (const left of all) for (const right of all) {
    if (left.id !== a || right.id !== b || right.variant !== left.variant) continue;
    for (let from = 1; from < left.cols; from++) windows.push([left, right, from, false]);
  }
  for (const [left, right, from, whole] of windows) {
    const d = differing(left, right, from, best ? best.differ - 1 : Math.floor(cells * DIFFER), whole);
    if (d >= 0) best = { left, right, from, differ: d, whole };
  }
  const shows = best;
  if (!shows) return null;
  // each pixel on its piece
  const floor = new Uint8Array(W * H), px = new Float32Array(W * H * 3), piece = new Int32Array(W * H).fill(-1);
  const maps = { left: piecesOf(shows.left), right: piecesOf(shows.right) };
  const li = all.indexOf(shows.left), ri = all.indexOf(shows.right);
  const base = band.y + band.h;
  let wallZ = -Infinity;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = pic.row[i] - first, c = pic.column[i];
    if (pic.row[i] < 0 || c < 0 || r >= R || top[r] < 0) continue;
    const k = shows.from + c, right = k >= shows.left.cols && !(shows.whole && bounded), p = right ? shows.right : shows.left, pc = right ? k - shows.left.cols : k, cell = r * p.cols + pc;
    // (the pixel in the picture: its cell's, and where in the cell)
    const cx = x - (c * 8 + Math.max(0, xs[r])), cy = y - top[r];
    if (cx < 0 || cx > 7 || cy < 0 || cy > 7 || pc < 0 || pc >= p.cols) continue;
    const qx = pc * 8 + cx, qy = r * 8 + cy;
    const n = grid[r * C + c] === p.codes[cell] ? (right ? maps.right : maps.left)[qy * p.cols * 8 + qx] : p.cells[cell];
    const q = p.pieces[n], sy = base - (band.y + y) - 0.5;
    piece[i] = (right ? ri : li) * 256 + n;
    let z: number, h: number;
    if (q.kind === 'floor') { h = q.height; z = sy - h; floor[i] = 1; } else {
      z = q.kind === 'side' ? q.slope * (qx + 0.5) - q.at : q.depth;
      h = sy - z;
    }
    px[i * 3] = x + 0.5 - z; px[i * 3 + 1] = h; px[i * 3 + 2] = z;
    if (q.kind === 'wall') wallZ = Math.max(wallZ, z);
  }
  // the pivot (the camera's depth): the middle of the floor in front of the back wall. The floor seen over the wall's top,
  // the room beyond, is far behind it: counted, it would put the camera's focus deep in the room and push what stands
  // at the front (Pendragon) out of the frame.
  let fx = 0, fy = 0, fz = 0, fn = 0;
  for (let i = 0; i < W * H; i++) if (floor[i] && px[i * 3 + 2] <= wallZ) { fx += px[i * 3]; fy += px[i * 3 + 1]; fz += px[i * 3 + 2]; fn++; }
  if (!fn) for (let i = 0; i < W * H; i++) if (floor[i]) { fx += px[i * 3]; fy += px[i * 3 + 1]; fz += px[i * 3 + 2]; fn++; }
  const pivot = fn ? { x: fx / fn, y: fy / fn, z: fz / fn } : { x: 160, y: 0, z: 0 };
  return { floor, px, piece, pivot, shows: { ...shows, cells } };
}
