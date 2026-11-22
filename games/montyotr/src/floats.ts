import { PLAY_COL, PLAY_COLS, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { coverable, decorChars } from './decor-chars';
import { standingCell } from './escalators';
import type { Game } from './game';
import type { FloatSpec } from './montydata';

/**
 * Floats (a game's `floats`: Do Svidaniya Monty's carnival parade): a platform with a painted piece standing on it crosses a span of a room a cell every `step` frames, in the room's own characters: its deck is a row of a
 * floor tile (he stands on it and passes up through it), the piece the characters of a decoration over it. What it draws over (the deadly water of the channel, a decoration behind) is put back as it moves on. Standing on a
 * deck he is carried with it a cell (four of his two-pixel units) as it moves. The cycle counts from the room's loading, so a room is the same each time he comes in.
 */

/** A float of the room: its place in the data's list (a copy of the game copies numbers, not the data), the frames since the room's loading, the cell of its cycle it has drawn (-1: none), and the cells it has drawn on (screen cell, what was there). */
export interface FloatState { index: number; t: number; at: number; under: Map<number, readonly [chr: number, colour: number]> }

/** The cell of the float's cycle `t` frames into the room's time. */
export const floatCycle = (e: FloatSpec, t: number): number => Math.floor(t / e.step) + e.offset;

/** The float's left column (playfield cells, any of the span's start less its width to its end) at cell `c` of its cycle. */
export function floatLeft(e: FloatSpec, c: number): number {
  const k = ((c % e.every) + e.every) % e.every;
  return e.dir > 0 ? e.span.from - e.w + k : e.span.to + 1 - k;
}

/** A room is loaded: each float of it waiting for its first frame (the room's decorations are drawn after this, so the float draws itself on the first frame and clears the decoration it was listed by). */
export function floatInit(g: Game) {
  g.floats = g.data.floats.flatMap((e, index): FloatState[] => (e.room === g.roomId ? [{ index, t: 0, at: Number.NaN, under: new Map() }] : []));
}

/** Whether the float's cell (playfield column `col`) may be drawn over: empty, a decoration, or deadly water (a deck covers the channel). */
const drawable = (g: Game, at: number, deck: boolean) => {
  const chr = g.mem[SCREEN + at] ?? 0;
  return coverable(chr) || (deck && g.tileFlag(chr) === 4);
};

function uncover(g: Game, f: FloatState) {
  for (const [at, [chr, colour]] of f.under) { g.mem[SCREEN + at] = chr; g.col[at] = colour; }
  f.under.clear();
}

function draw(g: Game, f: FloatState, e: FloatSpec, c: number) {
  uncover(g, f);
  f.at = c;
  const left = floatLeft(e, c), first = decorChars(g.data, g.roomId)[e.decor] ?? 0;
  const type = g.data.decorTypes[e.decor];
  if (!type || !first) return;
  const put = (col: number, row: number, chr: number, colour: number, deck: boolean) => {
    if (col < e.span.from || col > e.span.to || col < 0 || col >= PLAY_COLS) return;
    const at = (row + PLAY_ROW) * ROW + col + PLAY_COL;
    if (!drawable(g, at, deck)) return;
    f.under.set(at, [g.mem[SCREEN + at] ?? 0, g.col[at] ?? 0]);
    g.mem[SCREEN + at] = chr;
    g.col[at] = colour;
  };
  for (let r = 0; r < e.h; r++) for (let k = 0; k < e.w; k++) {
    const n = r * e.w + k;
    put(left + k, e.row - e.h + r, first + n, (typeof type.colour === 'number' ? type.colour : type.colour[n]) ?? 1, false);
  }
  for (let k = 0; k < e.w; k++) put(left + k, e.row, e.deck, g.roomColours[e.deck - 1] ?? 1, true);
}

/** Whether he is standing on the deck of the float now, drawn at cell `c` of its cycle. */
function riding(g: Game, e: FloatSpec, c: number): boolean {
  const cell = standingCell(g, e.row);
  if (cell === null) return false;
  const left = floatLeft(e, c);
  return cell + 1 >= left && cell < left + e.w;
}

/** One frame (after Monty's move): each float on a cell when its time comes, and whoever stands on its deck carried with it. */
export function floatUpdate(g: Game) {
  for (const f of g.floats) {
    const e = g.data.floats[f.index];
    if (!e) continue;
    f.t++;
    const c = floatCycle(e, f.t);
    if (c === f.at) continue;
    if (Number.isNaN(f.at)) for (let r = 0; r < e.h; r++) for (let k = 0; k < e.w; k++) g.mem[SCREEN + (e.home[1] + r + PLAY_ROW) * ROW + e.home[0] + k + PLAY_COL] = 0;
    const carried = riding(g, e, f.at);
    draw(g, f, e, c);
    if (carried) g.x2 = (g.x2 + e.dir * 4) & 0xff;
  }
}
