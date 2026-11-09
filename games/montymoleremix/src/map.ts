/**
 * The remix's map for the shared pause screen (games/shared/frontend.ts): the 21 rooms laid out as Wanted's world is (a shaft down the left, the
 * tunnel along the bottom, the pipe caverns, the castle at the right: `WORLD_GRID`, shared with the faithful game's map), each a small picture of
 * itself in the remix's own colours (dark until he has come to it), with where he is flashing, the rooms whose coal is all taken in green, and
 * under the grid the picked room and how many of its pieces of coal are taken. Travel goes to any room he has come to, at the place he came into it.
 *
 * What the map keeps of the player's progress (`RemixFound`, kept with every save): the rooms he has come to and where he came into each. The coal
 * taken is the game's own (`RemixGame.coal`), so the count is true for every room.
 */
import type { BitmapFont, Surface } from 'c64kit';
import { COAL_IN, COAL_TOTAL, piecesOfRoom } from '../../montymole/src/coal-rules';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { ROOM_COLS } from '../../montymole/src/room';
import { WORLD_GRID } from '../../montymole/src/world';
import { COL, foundCodec, S, type Box, type MapPlace, type PauseMap } from '../../shared/native/pause';
import type { RemixGame } from './game';
import { retile, type RemixRoom } from './retile';

export const ROOM_COUNT = ROOMS.length;

/** The rooms he has come to, and where he came into each: room, x2, y, room, x2, y... */
const found = S.object({ reached: S.numbers, arrivals: S.numbers });
export type RemixFound = S.Infer<typeof found>;
const FOUND = foundCodec(found, () => ({ reached: [], arrivals: [] }));

/** A room he has come to, noted with the place he came into it (the first time). True if that is new. */
export function noteReached(f: RemixFound, room: number, x2: number, y: number): boolean {
  if (f.reached.includes(room)) return false;
  f.reached.push(room);
  f.arrivals.push(room, x2, y);
  return true;
}

/** Where he came into a room: the place noted, or null. */
export function arrivalOf(f: RemixFound, room: number): { x2: number; y: number } | null {
  for (let i = 0; i + 2 < f.arrivals.length; i += 3) if (f.arrivals[i] === room) return { x2: f.arrivals[i + 1] ?? 0, y: f.arrivals[i + 2] ?? 0 };
  return null;
}

function coalTaken(g: RemixGame, room: number): number {
  return piecesOfRoom(room).filter((id) => !g.coal.isThere(id)).length;
}

// ---- the thumbnails -----------------------------------------------------------------------------------------------

const THUMB_W = 16, THUMB_H = 10;
/** The pitch of the rooms on the map: a thumbnail and a pixel of frame each side. */
const PITCH_X = 19, PITCH_Y = 14;
const TOP = 4;

/** A room as a picture a sixteenth the size: a pixel is the colour of the strongest tile in its 2 x 2 cells (rock and brick over ledges and ropes), black where there is none. */
function thumbnail(room: RemixRoom): Uint8Array {
  const out = new Uint8Array(THUMB_W * THUMB_H);
  const weight = (code: number): number => { const slot = room.slots[code - 1]; return slot === undefined ? 0 : slot.prop === 1 ? 3 : slot.prop === 4 ? 2 : 1; };
  for (let ty = 0; ty < THUMB_H; ty++) {
    for (let tx = 0; tx < THUMB_W; tx++) {
      let best = 0, colour = COL.black;
      for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]] as const) {
        const code = room.cells[(ty * 2 + dy) * ROOM_COLS + tx * 2 + dx] ?? 0;
        if (weight(code) > best) { best = weight(code); colour = room.slots[code - 1]?.colour ?? COL.black; }
      }
      out[ty * THUMB_W + tx] = colour;
    }
  }
  return out;
}
const THUMBNAILS: readonly Uint8Array[] = ROOMS.map((data) => thumbnail(retile(data)));

/** Where a room's thumbnail is (its top left), in the box. */
function placeOf(box: Box, room: number): { x: number; y: number } {
  const [col, row] = WORLD_GRID[room] ?? [0, 0];
  return { x: box.x + col * PITCH_X + 1, y: box.y + TOP + row * PITCH_Y + 1 };
}

function drawThumbnail(s: Surface, room: number, x: number, y: number, seen: boolean): void {
  const pixels = THUMBNAILS[room];
  if (pixels === undefined) return;
  for (let ty = 0; ty < THUMB_H; ty++) {
    for (let tx = 0; tx < THUMB_W; tx++) s.pixels[(y + ty) * s.width + x + tx] = seen ? (pixels[ty * THUMB_W + tx] ?? 0) : COL.black;
  }
}

function frame(s: Surface, x: number, y: number, colour: number): void {
  s.fillRect(x - 1, y - 1, THUMB_W + 2, 1, colour);
  s.fillRect(x - 1, y + THUMB_H, THUMB_W + 2, 1, colour);
  s.fillRect(x - 1, y - 1, 1, THUMB_H + 2, colour);
  s.fillRect(x + THUMB_W, y - 1, 1, THUMB_H + 2, colour);
}

/** The line under a picked room: how it stands. */
function standing(g: RemixGame, f: RemixFound, room: number): { text: string; colour: number } {
  if (!f.reached.includes(room) && room !== g.roomId) return { text: 'NOT REACHED YET', colour: COL.dgrey };
  const total = COAL_IN[room] ?? 0;
  if (total === 0) return { text: 'NO COAL HERE', colour: COL.lgrey };
  const taken = coalTaken(g, room);
  return { text: taken === total ? 'ALL THE COAL TAKEN' : `${taken} OF ${total} COAL TAKEN`, colour: taken === total ? COL.lgreen : COL.lgrey };
}

export const remixMap = {
  found: FOUND,
  // (rooms are noted as he comes to them: noteReached)
  observe() {},
  title: () => 'THE 21 ROOMS',
  draw(s: Surface, box: Box, g: RemixGame, f: RemixFound, blink: boolean, _page: number | undefined, font: BitmapFont | undefined, pick: string | null | undefined) {
    const here = g.roomId;
    for (let room = 0; room < ROOM_COUNT; room++) {
      const { x, y } = placeOf(box, room);
      const seen = f.reached.includes(room) || room === here;
      drawThumbnail(s, room, x, y, seen);
      const total = COAL_IN[room] ?? 0;
      const all = seen && total > 0 && coalTaken(g, room) === total;
      frame(s, x, y, room === here ? (blink ? COL.white : COL.yellow) : all ? COL.lgreen : seen ? COL.lgrey : COL.dgrey);
    }
    if (!font) return;
    const room = pick !== null && pick !== undefined ? Number(pick) : here;
    const y = box.y + TOP + 8 * PITCH_Y + 4;
    // (the opening scene is no room of the 21: it has the gate, and no coal)
    if (room >= ROOM_COUNT) {
      font.draw(s, 'THE OPENING SCENE', box.x, y, COL.white);
      font.draw(s, g.bucketTaken ? 'THE GATE IS OPEN' : 'THE GATE IS SHUT', box.x, y + 10, COL.lgrey);
      return;
    }
    font.draw(s, `ROOM ${room + 1}`, box.x, y, COL.white);
    const line = standing(g, f, room);
    font.draw(s, line.text, box.x, y + 10, line.colour);
  },
  info(g: RemixGame, f: RemixFound): string[] {
    return [`LIVES ${g.lives}`, `ROOMS ${f.reached.length}/${ROOM_COUNT}`, `COAL ${g.coal.taken}/${COAL_TOTAL}`, `SCORE ${g.score}`];
  },
  legend: [{ colour: COL.dgrey, text: 'NOT SEEN' }, { colour: COL.lgreen, text: 'ALL COAL' }],
  places(box: Box, g: RemixGame, f: RemixFound): MapPlace[] {
    const out: MapPlace[] = [];
    for (let room = 0; room < ROOM_COUNT; room++) {
      if (room !== g.roomId && !f.reached.includes(room)) continue;
      const { x, y } = placeOf(box, room);
      out.push({ id: String(room), x: x + THUMB_W / 2, y: y + THUMB_H / 2, r: THUMB_H / 2 + 1, rx: THUMB_W / 2 + 1, ...(room === g.roomId ? { here: true } : {}) });
    }
    return out;
  },
  /** Travel: to a room he has come to, at the place he came into it. */
  go(id: string, g: RemixGame, f: RemixFound): boolean {
    const room = Number(id);
    const at = arrivalOf(f, room);
    if (!Number.isInteger(room) || room < 0 || room >= ROOM_COUNT || at === null) return false;
    g.travelTo(room, at.x2, at.y);
    return true;
  },
} satisfies PauseMap<RemixGame, RemixFound>;

/** A save described for the save manager (ContinueFlow `describe`): where, then lives, rooms and the score. */
export function describeSave(save: { readonly room: number; readonly lives: number; readonly score: number }, f: RemixFound): string[] {
  return [`ROOM ${save.room + 1}`, `LIVES ${save.lives}`, `ROOMS ${f.reached.length}`, `SCORE ${save.score}`];
}
