/**
 * The map for the shared pause screen (games/shared/frontend.ts): the six screens, each a small picture of itself in the Spectrum's own
 * colours (a screen he has not come to yet is dark), with where he is flashing, the ones he has finished marked, and under each one how
 * many of its items are taken. Under them the picked screen and how it stands. Travel goes to any screen he has come to, as the start of
 * that screen (`Game.travel`: as through the exit that leads to it).
 *
 * What the map keeps of the player's progress (`MoleyFound`, kept with every save): the screens he has come to, and the ones he has finished
 * (left by the way out, which needs every item taken, or, for the last, delivered). Items are only taken in the screen he is in: they all come
 * back when a screen is entered again, so the count is the current screen's taken plus every item of the finished ones.
 */
import type { BitmapFont, Surface } from 'c64kit';
import { foundCodec, S, type Box, type MapPlace, type PauseMap } from '../../shared/native/pause';
import { ENDING_ROOM, mapMemory, ROOM_SIZE } from './data';
import type { MoleyFlow } from './flow';
import { cellInk, cellPaper, roomPicture } from './picture';
import { SPECTRUM } from './colours';

/** The screens he has come to, and the ones he has finished, by room number. */
const found = S.object({ reached: S.numbers, done: S.numbers });
export type MoleyFound = S.Infer<typeof found>;
const FOUND = foundCodec(found, () => ({ reached: [], done: [] }));

/** The six screens (room 6 is the Christmas card). */
export const SCREENS = ENDING_ROOM;

/** A screen he has come to, noted. True if that is new. */
export function noteReached(f: MoleyFound, room: number): boolean {
  if (f.reached.includes(room)) return false;
  f.reached.push(room);
  return true;
}

/** A screen he has finished, noted (it has been come to). True if that is new. */
export function noteDone(f: MoleyFound, room: number): boolean {
  const reached = noteReached(f, room);
  if (f.done.includes(room)) return reached;
  f.done.push(room);
  return true;
}

/** The items each screen has (the map's cells of items, taken or not): rooms 0, 1 and 4. */
export const ITEMS_IN: readonly number[] = (() => {
  const memory = mapMemory();
  return Array.from({ length: SCREENS }, (_, room) => {
    let n = 0;
    for (let cell = 0; cell < ROOM_SIZE; cell++) {
      const tile = memory[room * ROOM_SIZE + cell];
      if (tile >= 0xec && tile < 0xf4) n++;
    }
    return n;
  });
})();
export const ITEMS_TOTAL = ITEMS_IN.reduce((a, b) => a + b, 0);

/** Items taken so far: all of the finished screens' and the current screen's taken ones. */
export function itemsTaken(flow: MoleyFlow, f: MoleyFound): number {
  const here = flow.game.room;
  let taken = f.done.reduce((n, room) => n + (ITEMS_IN[room] ?? 0), 0);
  if (here < SCREENS && !f.done.includes(here)) taken += (ITEMS_IN[here] ?? 0) - flow.game.itemsLeft;
  return taken;
}

// ---- the thumbnails -----------------------------------------------------------------------------------------------

const THUMB_W = 64, THUMB_H = 36;
/** The pitch of the cells on the map: a thumbnail, a pixel of frame each side, and its label under it. */
const PITCH_X = 66, PITCH_Y = 62;
const TOP = 6;

/** A screen as a picture a quarter the size: a pixel is the ink of its 4 x 4 if any of it is set, else the paper (Spectrum colour indexes). */
function thumbnail(room: number): Uint8Array {
  const { bits, attrs } = roomPicture(room);
  const out = new Uint8Array(THUMB_W * THUMB_H);
  for (let ty = 0; ty < THUMB_H; ty++) {
    for (let tx = 0; tx < THUMB_W; tx++) {
      let set = false;
      for (let y = ty * 4; y < ty * 4 + 4 && !set; y++) {
        for (let x = tx * 4; x < tx * 4 + 4; x++) {
          if ((bits[y * 32 + (x >> 3)] & (0x80 >> (x & 7))) !== 0) { set = true; break; }
        }
      }
      const attr = attrs[(ty >> 1) * 32 + (tx >> 1)];
      out[ty * THUMB_W + tx] = set ? cellInk(attr) : cellPaper(attr);
    }
  }
  return out;
}
const THUMBNAILS: readonly Uint8Array[] = Array.from({ length: SCREENS }, (_, room) => thumbnail(room));

/** Where a screen's thumbnail is (its top left), in the box. */
function placeOf(box: Box, room: number): { x: number; y: number } {
  return { x: box.x + (room % 3) * PITCH_X + 1, y: box.y + TOP + Math.floor(room / 3) * PITCH_Y + 1 };
}

function drawThumbnail(s: Surface, room: number, x: number, y: number, seen: boolean) {
  const pixels = THUMBNAILS[room];
  if (pixels === undefined) return;
  for (let ty = 0; ty < THUMB_H; ty++) {
    for (let tx = 0; tx < THUMB_W; tx++) s.pixels[(y + ty) * s.width + x + tx] = seen ? pixels[ty * THUMB_W + tx] : SPECTRUM.black;
  }
}

function frame(s: Surface, x: number, y: number, colour: number) {
  s.fillRect(x - 1, y - 1, THUMB_W + 2, 1, colour);
  s.fillRect(x - 1, y + THUMB_H, THUMB_W + 2, 1, colour);
  s.fillRect(x - 1, y - 1, 1, THUMB_H + 2, colour);
  s.fillRect(x + THUMB_W, y - 1, 1, THUMB_H + 2, colour);
}

/** The line under a picked screen: how it stands. */
function standing(flow: MoleyFlow, f: MoleyFound, room: number): { text: string; colour: number } {
  if (!f.reached.includes(room)) return { text: 'NOT REACHED YET', colour: SPECTRUM.dim };
  if (f.done.includes(room)) return { text: ITEMS_IN[room] ? 'FINISHED, ALL ITEMS TAKEN' : 'FINISHED', colour: SPECTRUM.good };
  const total = ITEMS_IN[room] ?? 0;
  if (total === 0) return { text: 'NO ITEMS HERE', colour: SPECTRUM.text };
  const left = room === flow.game.room ? flow.game.itemsLeft : total;
  return { text: `${total - left} OF ${total} ITEMS TAKEN`, colour: SPECTRUM.text };
}

export const moleyMap = {
  found: FOUND,
  // (screens are noted as he comes to them: noteReached, noteDone)
  observe() {},
  title: () => 'THE SIX SCREENS',
  draw(s: Surface, box: Box, flow: MoleyFlow, f: MoleyFound, blink: boolean, _page: number | undefined, font: BitmapFont | undefined, pick: string | null | undefined) {
    const here = flow.game.room;
    for (let room = 0; room < SCREENS; room++) {
      const { x, y } = placeOf(box, room);
      const seen = f.reached.includes(room) || room === here;
      drawThumbnail(s, room, x, y, seen);
      frame(s, x, y, room === here ? (blink ? SPECTRUM.white : SPECTRUM.yellow) : f.done.includes(room) ? SPECTRUM.good : seen ? SPECTRUM.text : SPECTRUM.dim);
      if (!font) continue;
      const total = ITEMS_IN[room] ?? 0;
      const taken = f.done.includes(room) ? total : room === here ? total - flow.game.itemsLeft : 0;
      const label = !seen ? `${room + 1} -` : total > 0 ? `${room + 1} ${taken}/${total}` : `${room + 1}`;
      font.draw(s, label, x, y + THUMB_H + 3, f.done.includes(room) ? SPECTRUM.good : seen ? SPECTRUM.text : SPECTRUM.dim);
    }
    if (!font) return;
    const room = pick !== null && pick !== undefined ? Number(pick) : here;
    const y = box.y + TOP + 2 * PITCH_Y + 2;
    font.draw(s, `SCREEN ${room + 1}`, box.x, y, SPECTRUM.white);
    const line = standing(flow, f, room);
    font.draw(s, line.text, box.x, y + 10, line.colour);
  },
  info(flow: MoleyFlow, f: MoleyFound): string[] {
    const game = flow.game;
    return [`LIVES ${game.lives}`, `SCREENS ${f.done.length}/${SCREENS}`, `ITEMS ${itemsTaken(flow, f)}/${ITEMS_TOTAL}`, `SCORE ${game.score}`];
  },
  legend: [{ colour: SPECTRUM.dim, text: 'NOT SEEN' }, { colour: SPECTRUM.good, text: 'FINISHED' }],
  places(box: Box, flow: MoleyFlow, f: MoleyFound): MapPlace[] {
    const here = flow.game.room;
    const out: MapPlace[] = [];
    for (let room = 0; room < SCREENS; room++) {
      if (room !== here && !f.reached.includes(room)) continue;
      const { x, y } = placeOf(box, room);
      out.push({ id: String(room), x: x + THUMB_W / 2, y: y + THUMB_H / 2, r: THUMB_H / 2 + 1, rx: THUMB_W / 2 + 1, ...(room === here ? { here: true } : {}) });
    }
    return out;
  },
  /** Travel: to the start of a screen he has come to, as through the exit that leads to it. */
  go(id: string, flow: MoleyFlow, f: MoleyFound): boolean {
    const room = Number(id);
    const game = flow.game;
    if (!Number.isInteger(room) || room < 0 || room >= SCREENS || !f.reached.includes(room) || game.ended || game.room >= SCREENS) return false;
    game.travel(room);
    return true;
  },
} satisfies PauseMap<MoleyFlow, MoleyFound>;

/** A save described for the save manager (ContinueFlow `describe`): where, then lives, how far he has got and the score. */
export function describeSave(save: { readonly room: number; readonly lives: number; readonly score: number }, f: MoleyFound): string[] {
  return [`SCREEN ${save.room + 1}`, `LIVES ${save.lives}`, `FINISHED ${f.done.length}`, `SCORE ${save.score}`];
}
