/**
 * The map for the shared pause screen (games/shared/frontend.ts): the 21 rooms laid out as the world is (re/README.md, "The world": a shaft down the left, the tunnel along the
 * bottom, the pipe caverns, the castle at the right), each a small picture of itself in the Spectrum's colours (a room he has not come to yet is dark), with where he is
 * flashing, the ones whose coal he has all taken marked, and under the grid the picked room and how many of its pieces of coal are taken. Travel goes to any room he has
 * come to, at the place he came into it.
 *
 * What the map keeps of the player's progress (`MontyFound`, kept with every save): the rooms he has come to and where he came into each (room, x, y, ...), so that travel
 * puts him back where the room was entered. The coal taken is the game's own (`Game.coal`), so the count is true for every room.
 */
import type { BitmapFont, Surface } from 'c64kit';
import { foundCodec, S, type Box, type MapPlace, type PauseMap } from '../../shared/native/pause';
import { SPECTRUM, cellInk, cellPaper } from '../../shared/spectrum';
import { ROOMS } from './data/rooms-data';
import type { MontyFlow } from './flow';
import { Game, OPENING_ROOM } from './game';
import { STILL_THERE } from './coal';
import { drawRoom, ROOM_ROWS, ROOM_TOP_ROW } from './room';

export const ROOM_COUNT = ROOMS.length;

/** The rooms he has come to, and where he came into each: room, x, y, room, x, y... */
const found = S.object({ reached: S.numbers, arrivals: S.numbers });
export type MontyFound = S.Infer<typeof found>;
const FOUND = foundCodec(found, () => ({ reached: [], arrivals: [] }));

/** A room he has come to, noted with the place he came into it (the first time). True if that is new. */
export function noteReached(f: MontyFound, room: number, x: number, y: number): boolean {
  if (f.reached.includes(room)) return false;
  f.reached.push(room);
  f.arrivals.push(room, x, y);
  return true;
}

/** Where he came into a room: the place noted, or the room's own way in. */
export function arrivalOf(f: MontyFound, room: number): { x: number; y: number } | null {
  for (let i = 0; i + 2 < f.arrivals.length; i += 3) if (f.arrivals[i] === room) return { x: f.arrivals[i + 1] ?? 0, y: f.arrivals[i + 2] ?? 0 };
  return null;
}

/** The world on a grid (column, row; row 0 at the top), by room number. */
const GRID: readonly (readonly [number, number])[] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [8, 7], [9, 7], [9, 6], [9, 5],
];

/** The ids of the coal pieces a room has (the one owner of that list: the map, the bot and the reward use it). */
export function piecesOfRoom(room: number): readonly number[] {
  return (ROOMS[room]?.coal ?? []).filter((c) => c.col !== 0 || c.row !== 0).map((c) => c.id);
}
export const COAL_IN: readonly number[] = ROOMS.map((_, room) => piecesOfRoom(room).length);
export const COAL_TOTAL = COAL_IN.reduce((a, b) => a + b, 0);
function coalTaken(game: Game, room: number): number {
  return piecesOfRoom(room).filter((id) => ((game.coal.flags[id] ?? 0) & STILL_THERE) === 0).length;
}

// ---- the thumbnails -----------------------------------------------------------------------------------------------

const THUMB_W = 16, THUMB_H = 10;
/** The pitch of the rooms on the map: a thumbnail and a pixel of frame each side. */
const PITCH_X = 19, PITCH_Y = 14;
const TOP = 4;

/** A room as a picture a sixteenth the size: a pixel is the ink of its 16 x 16 if any of it is set, else the paper (Spectrum colour indexes). */
function thumbnail(room: number): Uint8Array {
  const data = ROOMS[room];
  const out = new Uint8Array(THUMB_W * THUMB_H);
  if (data === undefined) return out;
  const { bitmap, attrs } = drawRoom(data);
  const first = ROOM_TOP_ROW * 8;
  for (let ty = 0; ty < THUMB_H; ty++) {
    for (let tx = 0; tx < THUMB_W; tx++) {
      let set = false;
      for (let y = 0; y < 16 && !set; y++) {
        const line = first + ty * 16 + y;
        for (let c = 0; c < 2; c++) {
          const at = ((line & 0xc0) << 5) + ((line & 7) << 8) + ((line & 0x38) << 2) + tx * 2 + c;
          if ((bitmap[at] ?? 0) !== 0) { set = true; break; }
        }
      }
      const attr = attrs[(ROOM_TOP_ROW + ty * 2) * 32 + tx * 2] ?? 0x47;
      out[ty * THUMB_W + tx] = set ? cellInk(attr) || SPECTRUM.text : cellPaper(attr);
    }
  }
  return out;
}
const THUMBNAILS: readonly Uint8Array[] = Array.from({ length: ROOM_COUNT }, (_, room) => thumbnail(room));
void ROOM_ROWS;

/** Where a room's thumbnail is (its top left), in the box. */
function placeOf(box: Box, room: number): { x: number; y: number } {
  const [col, row] = GRID[room] ?? [0, 0];
  return { x: box.x + col * PITCH_X + 1, y: box.y + TOP + row * PITCH_Y + 1 };
}

function drawThumbnail(s: Surface, room: number, x: number, y: number, seen: boolean): void {
  const pixels = THUMBNAILS[room];
  if (pixels === undefined) return;
  for (let ty = 0; ty < THUMB_H; ty++) {
    for (let tx = 0; tx < THUMB_W; tx++) s.pixels[(y + ty) * s.width + x + tx] = seen ? (pixels[ty * THUMB_W + tx] ?? 0) : SPECTRUM.black;
  }
}

function frame(s: Surface, x: number, y: number, colour: number): void {
  s.fillRect(x - 1, y - 1, THUMB_W + 2, 1, colour);
  s.fillRect(x - 1, y + THUMB_H, THUMB_W + 2, 1, colour);
  s.fillRect(x - 1, y - 1, 1, THUMB_H + 2, colour);
  s.fillRect(x + THUMB_W, y - 1, 1, THUMB_H + 2, colour);
}

/** The room he is in, or the last he was in while the opening scene is on. */
function hereOf(flow: MontyFlow): number {
  return flow.game.room < ROOM_COUNT ? flow.game.room : -1;
}

/** The line under a picked room: how it stands. */
function standing(flow: MontyFlow, f: MontyFound, room: number): { text: string; colour: number } {
  if (!f.reached.includes(room)) return { text: 'NOT REACHED YET', colour: SPECTRUM.dim };
  const total = COAL_IN[room] ?? 0;
  if (total === 0) return { text: 'NO COAL HERE', colour: SPECTRUM.text };
  const taken = coalTaken(flow.game, room);
  return { text: taken === total ? 'ALL THE COAL TAKEN' : `${taken} OF ${total} PIECES OF COAL TAKEN`, colour: taken === total ? SPECTRUM.good : SPECTRUM.text };
}

export const montyMap = {
  found: FOUND,
  // (rooms are noted as he comes to them: noteReached)
  observe() {},
  title: () => 'THE 21 ROOMS',
  draw(s: Surface, box: Box, flow: MontyFlow, f: MontyFound, blink: boolean, _page: number | undefined, font: BitmapFont | undefined, pick: string | null | undefined) {
    const here = hereOf(flow);
    for (let room = 0; room < ROOM_COUNT; room++) {
      const { x, y } = placeOf(box, room);
      const seen = f.reached.includes(room) || room === here;
      drawThumbnail(s, room, x, y, seen);
      const total = COAL_IN[room] ?? 0;
      const all = seen && total > 0 && coalTaken(flow.game, room) === total;
      frame(s, x, y, room === here ? (blink ? SPECTRUM.white : SPECTRUM.yellow) : all ? SPECTRUM.good : seen ? SPECTRUM.text : SPECTRUM.dim);
    }
    if (!font) return;
    const room = pick !== null && pick !== undefined ? Number(pick) : here;
    const y = box.y + TOP + 8 * PITCH_Y + 4;
    if (room >= 0) {
      font.draw(s, `ROOM ${room + 1}`, box.x, y, SPECTRUM.white);
      const line = standing(flow, f, room);
      font.draw(s, line.text, box.x, y + 10, line.colour);
    } else font.draw(s, 'THE OPENING SCENE', box.x, y, SPECTRUM.white);
  },
  info(flow: MontyFlow, f: MontyFound): string[] {
    const game = flow.game;
    return [`LIVES ${game.lives}`, `ROOMS ${f.reached.length}/${ROOM_COUNT}`, `COAL ${game.coal.taken}/${COAL_TOTAL}`, `SCORE ${game.score.value}`];
  },
  legend: [{ colour: SPECTRUM.dim, text: 'NOT SEEN' }, { colour: SPECTRUM.good, text: 'ALL COAL' }],
  places(box: Box, flow: MontyFlow, f: MontyFound): MapPlace[] {
    const here = hereOf(flow);
    const out: MapPlace[] = [];
    for (let room = 0; room < ROOM_COUNT; room++) {
      if (room !== here && !f.reached.includes(room)) continue;
      const { x, y } = placeOf(box, room);
      out.push({ id: String(room), x: x + THUMB_W / 2, y: y + THUMB_H / 2, r: THUMB_H / 2 + 1, rx: THUMB_W / 2 + 1, ...(room === here ? { here: true } : {}) });
    }
    return out;
  },
  /** Travel: to a room he has come to, at the place he came into it. */
  go(id: string, flow: MontyFlow, f: MontyFound): boolean {
    const room = Number(id);
    const game = flow.game;
    const at = arrivalOf(f, room);
    if (!Number.isInteger(room) || room < 0 || room >= ROOM_COUNT || at === null || game.outcome !== 'playing' || game.room === OPENING_ROOM) return false;
    game.travel(room, at.x, at.y);
    return true;
  },
} satisfies PauseMap<MontyFlow, MontyFound>;

/** A save described for the save manager (ContinueFlow `describe`): where, then lives, coal and the score. */
export function describeSave(save: { readonly room: number; readonly lives: number; readonly score: number }, f: MontyFound): string[] {
  return [`ROOM ${save.room + 1}`, `LIVES ${save.lives}`, `ROOMS ${f.reached.length}`, `SCORE ${save.score}`];
}
