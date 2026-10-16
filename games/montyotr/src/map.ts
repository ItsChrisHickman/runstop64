import type { Surface } from 'c64kit';
import { COL, isNumbers, shimmerColour, isRecord, isRecordOf, type Box, type FoundCodec, type MapPlace, type PauseMap } from '../../shared/native/pause';
import { isExtensionRoom, sectorIndex, sectorName, SFX, specialItems, teleporterCfg, teleporterDests } from './data';
import type { Game } from './game';
import { roomProgress } from './items';
import { C5_LAST, c5Arrive, c5LastCell, c5Street } from './mechanisms';
import type { MontySave } from './save';

/**
 * Monty's map for the shared pause screen (games/shared/frontend.ts): the whole
 * world as the original lays it out (23 × 6 screens), every room shown, dark
 * grey until visited, then its area's colour; rooms with everything collected
 * shimmer in the coin colours; Monty's room flashes. Under it, the picked
 * room's name and what's left there, the freedom kit and the key items found.
 * Places to go back to: every room visited, arriving where Monty first came in,
 * with the original teleport effect. The C5 street's rooms too, each one as the
 * C5 came into it furthest along the drive (its stage, speed, direction, a jump
 * under way), so a crash can be tried again from any room reached. Not the
 * ending ($30, the boat to France). In the original, driving out of the street
 * puts it and the rooms before it behind him for good (room $33's cell off the
 * grid: nothing leads back east); travel takes him back across it with the
 * street as the game has it on that side (`go`, mechanisms.ts `c5Street`): before
 * it and in it, as before the drive (so it's driven again as ever), after it, as
 * the drive leaves it. The map shows the world as travel has it: $33 always on it.
 *
 * With ENHANCED, runstop64's rooms (data/runstop64-rooms.ts) are on the map too, in their own
 * colour (RUNSTOP64 in the legend), and travel goes to them like any other; they aren't
 * counted in the original's rooms.
 */
type Entry = [x2: number, y: number, mapRow: number, exitCol: number];
/** A C5 room's entry: Monty's, and the C5's as it came in (C5State, in order). */
type C5Entry = [...Entry, fallStage: number, speed: number, dir: number, bounce: number];
type Rooms = Record<string, Entry | C5Entry>;
const isEntry = (v: unknown): v is Entry | C5Entry => isNumbers(v) && (v.length === 4 || v.length === 8);
/** What the map keeps of the player's progress: where Monty came into each room. */
export interface MontyFound { rooms: Rooms }
const FOUND: FoundCodec<MontyFound> = {
  empty: () => ({ rooms: {} }),
  parse: (kept) => ({ rooms: isRecord(kept) && isRecordOf(kept.rooms, isEntry) ? kept.rooms : {} }),
};

/** The kit Monty carries (freedom kit icons, by item). */
const KIT = [1, 3, 11, 12, 15];
/** The special items that open up the way to France (si_spawn_tbl indices). */
const KEY_ITEMS = [1, 3, 5, 8, 10];
const CUPCAKES = [0, 2, 4, 6, 7, 9, 14, 15, 17, 18];
const SECTOR_COLOURS = [7, 13, 10, 14, 5, 4, 8, 3, 15, 1];
/** runstop64's rooms, seen (the dev room's lettering). */
const RUNSTOP64_COLOUR = COL.blue;
/** No travel to the ending (room $30: the completion's, not on the grid). */
export const NO_TRAVEL = (id: number) => id === 0x30;
const COLS = 23, ROWS = 6, CELL = 8;

/**
 * The room in a cell of the exit grid with the street driven or not (room $33's cell; the rest
 * as the game has it now: runstop64's rooms there while they're open).
 */
const roomIn = (g: Game, row: number, col: number, driven = false) =>
  row === C5_LAST.row && col === C5_LAST.col ? c5LastCell(driven) : g.roomAt(row, col);

/**
 * The rooms the game's own ways lead to from a cell: its room's exits (to any neighbouring cell
 * of the exit grid with a room in it, as LookupRoomExitDest allows) and its teleporters (each
 * room's to its fixed destination), and so on from those.
 */
function reachable(at: (row: number, col: number) => number, from: [row: number, col: number]) {
  const rooms = new Set<number>();
  const cells = [from];
  const seen = new Set<number>();
  for (let next = cells.pop(); next; next = cells.pop()) {
    const [row, col] = next;
    const id = at(row, col);
    if (id === 0xff || seen.has(row * COLS + col)) continue;
    seen.add(row * COLS + col);
    rooms.add(id);
    cells.push([row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]);
    for (let t = 0; t * 5 < teleporterCfg.length && teleporterCfg[t * 5] !== 0xff; t++) {
      if (teleporterCfg[t * 5] === id) cells.push([teleporterDests[t * 4 + 3], teleporterDests[t * 4 + 2]]);
    }
  }
  return rooms;
}

/**
 * The rooms after the street: those the game's ways lead to from the room the drive comes out
 * into (west of $33's cell) once it's driven. Driving out takes $33's cell off the grid and
 * then nothing leads back east (in the original too: no exit or teleporter there does, and the
 * C5's own exits, which don't check the grid, only run in the street).
 */
const afterStreet = (g: Game) => reachable((row, col) => roomIn(g, row, col, true), [C5_LAST.row, C5_LAST.col - 1]);

/** Whether travel goes to a room visited (its entry's cell): any on the map but the ending. */
const canGo = (g: Game, id: number, e: Entry | C5Entry) => !NO_TRAVEL(id) && roomIn(g, e[2], e[3]) === id;

/**
 * A room Monty has just come into (Game.onRoomLoaded): where he came in, for travel.
 * True if that's new: a room's first time, or a C5 room reached further along the drive.
 */
export function noteRoom(g: Game, { rooms }: MontyFound) {
  const was = rooms[g.roomId];
  if (!g.c5.active) {
    if (was) return false;
    rooms[g.roomId] = [g.x2, g.y, g.mapRow, g.exitCol];
    return true;
  }
  const a = g.c5Arrival;
  if (was?.length === 8 && was[4] > a.fallStage) return false;
  rooms[g.roomId] = [g.x2, g.y, g.mapRow, g.exitCol, a.fallStage, a.speed, a.dir, a.bounce];
  return true;
}

const visited = (found: MontyFound, id: number) => !!found.rooms[id];

function layout(box: Box) {
  const ox = box.x + Math.floor((box.w - COLS * CELL) / 2);
  return { ox, oy: box.y + 2, at: (row: number, col: number) => ({ x: ox + col * CELL, y: box.y + 2 + row * CELL }) };
}

/** The rooms on the map, and how many of them Monty has been in. */
function count(g: Game, found: MontyFound) {
  let all = 0, seen = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const id = roomIn(g, r, c);
    if (id === 0xff || isExtensionRoom(id)) continue; // (the original's rooms)
    all++;
    if (visited(found, id)) seen++;
  }
  return { all, seen };
}
/** Frames the map has been drawn (the shimmer's step). */
let shimmer = 0;

export const montyMap = {
  found: FOUND,
  // (rooms are noted as Monty comes into them: noteRoom)
  observe() {},
  title: () => 'THE WORLD',
  draw(s, box, g, found, blink, _page, font, pick) {
    const { at } = layout(box);
    const tick = shimmer++;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const id = roomIn(g, r, c);
        if (id === 0xff) continue;
        const p = at(r, c);
        const here = r === g.mapRow && c === g.exitCol;
        const seen = visited(found, id);
        const colour = here ? (blink ? COL.white : COL.yellow)
          : !seen ? COL.dgrey
          : roomProgress(g, id).complete ? shimmerColour(tick, r + c)
          : isExtensionRoom(id) ? RUNSTOP64_COLOUR
          : SECTOR_COLOURS[sectorIndex(id)];
        s.fillRect(p.x, p.y, CELL - 1, CELL - 1, colour);
      }
    }
    if (!font) return;
    // the picked room: its name, and what's left there
    const id = pick !== null && pick !== undefined ? Number(pick) : g.roomId;
    let y = box.y + 2 + ROWS * CELL + 8;
    wrap(sectorName(id).text.toUpperCase(), 24).slice(0, 2).forEach((line) => { font.draw(s, line, box.x, y, COL.white); y += 10; });
    const p = roomProgress(g, id), left: string[] = [];
    if (p.coinsLeft) left.push(`${p.coinsLeft} COIN${p.coinsLeft > 1 ? 'S' : ''}`);
    if (p.itemsLeft) left.push(`${p.itemsLeft} ITEM${p.itemsLeft > 1 ? 'S' : ''}`);
    const state = p.coins + p.items === 0 ? 'NOTHING TO COLLECT' : left.length ? `${left.join(' AND ')} LEFT` : 'ALL COLLECTED';
    font.draw(s, state, box.x, y, left.length ? COL.lgrey : COL.lgreen);
    // the freedom kit, and the key items (dark until found)
    y = box.y + box.h - 52;
    font.draw(s, 'FREEDOM KIT', box.x, y, COL.yellow);
    KIT.forEach((fk, i) => icon(s, g.mem.subarray(0x3800 + fk * 32, 0x3800 + fk * 32 + 32), box.x + i * 24, y + 10, COL.white));
    y += 30;
    font.draw(s, 'ITEMS FOUND', box.x, y, COL.yellow);
    KEY_ITEMS.forEach((item, i) => icon(s, spriteIcon(g, (specialItems[item * 4 + 3] + 0x8e) & 0xff), box.x + i * 24, y + 10, g.siCollected[item] ? COL.white : COL.dgrey));
  },
  info(g, found) {
    const rooms = count(g, found);
    const cakes = CUPCAKES.filter((i) => g.siCollected[i]).length;
    const items = KEY_ITEMS.filter((i) => g.siCollected[i]).length;
    return [`LIVES ${String(g.lives).padStart(5)}`, `ROOMS ${String(rooms.seen).padStart(2)}/${rooms.all}`, `ITEMS ${items}/${KEY_ITEMS.length}`, `CAKES ${String(cakes).padStart(2)}/${CUPCAKES.length}`];
  },
  legend: (g) => [
    { colour: COL.dgrey, text: 'NOT SEEN' }, { colour: 7, text: 'ALL FOUND' },
    ...(g.extensionOpen ? [{ colour: RUNSTOP64_COLOUR, text: 'RUNSTOP64' }] : []),
  ],
  places(box: Box, g: Game, found: MontyFound): MapPlace[] {
    const { at } = layout(box);
    const list = Object.entries(found.rooms)
      .filter(([id, e]) => canGo(g, Number(id), e) && Number(id) !== g.roomId)
      .map(([id, e]) => { const p = at(e[2], e[3]); return { id, x: p.x + 3, y: p.y + 3 }; });
    const p = at(g.mapRow, g.exitCol);
    return [{ id: String(g.roomId), x: p.x + 3, y: p.y + 3, here: true }, ...list];
  },
  /**
   * Travel: Monty leaves this room and comes into that one where he did, through the teleport
   * effect, the street as the game has it on that side of it (mechanisms.ts `c5Street`): after
   * it, as the drive out leaves it; before it and in it, as before the drive. Into a C5 room,
   * the C5 then comes as it did, and straight in as the drive does (no teleport effect: the game
   * moves its enemies on through one, so the room wouldn't be as it was when he drove in; the
   * C5's sprites would cover the effect anyway). Crossing the street, the last place he had a
   * moment on his feet (ENHANCED's respawn) is on the side he's left: he starts again in this
   * room until he's had one here.
   */
  go(id, g, found) {
    const e = found.rooms[id];
    if (!e || !canGo(g, Number(id), e)) return false;
    const driven = afterStreet(g).has(Number(id));
    // (the side he's on: the street as the game has it now, $33's cell off the grid only after it)
    if (driven !== (g.roomAt(C5_LAST.row, C5_LAST.col) === c5LastCell(true))) g.safeEntry = null;
    c5Street(g, driven);
    [g.x2, g.y, g.mapRow, g.exitCol] = e;
    const c5 = e.length === 8;
    if (c5) c5Arrive(g, { fallStage: e[4], speed: e[5], dir: e[6], bounce: e[7] });
    g.montyAction = 0;
    g.falling = 0;
    g.arcIdx = 0;
    g.gameMode = 0;
    g.lift.riding = 0;
    g.pd.ride = 0;
    g.roomExit = 1;
    g.freeze = 1; // (as RoomLoop does at once for a room exit: nothing moves before the room changes)
    g.dissolvePending = c5 ? 0 : 1;
    g.sfx(SFX.warp);
    return true;
  },
} satisfies PauseMap<Game, MontyFound>;

/** A 16×16 icon from 32 bytes (top-left, top-right, bottom-left, bottom-right characters). */
function icon(s: Surface, bytes: ArrayLike<number>, x: number, y: number, colour: number) {
  for (let q = 0; q < 4; q++) s.drawChar(Array.from({ length: 8 }, (_, i) => bytes[q * 8 + i]), x + (q & 1) * 8, y + (q >> 1) * 8, colour);
}

/** An item's sprite (24×21) cropped to its 16×16 content (left- and bottom-aligned), as an icon's 32 bytes. */
function spriteIcon(g: Game, ptr: number) {
  const src = ptr * 64, out = new Uint8Array(32);
  const row = (r: number) => (g.mem[src + r * 3] << 16) | (g.mem[src + r * 3 + 1] << 8) | g.mem[src + r * 3 + 2];
  let minX = 23, maxY = 0;
  for (let r = 0; r < 21; r++) {
    const v = row(r);
    if (!v) continue;
    maxY = r;
    for (let x = 0; x < 24; x++) if (v & (0x800000 >> x)) { minX = Math.min(minX, x); break; }
  }
  minX = Math.min(minX, 8);
  for (let y = 0; y < 16; y++) {
    const r = maxY - 15 + y;
    const bits = r < 0 ? 0 : ((row(r) << minX) >> 8) & 0xffff;
    const half = y < 8 ? 0 : 16;
    out[half + (y & 7)] = bits >> 8;
    out[half + 8 + (y & 7)] = bits & 0xff;
  }
  return out;
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > width) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A save described for the save manager (ContinueFlow `describe`): the area Monty is in (the
 * map's names for them), then his lives, the key items and cupcakes found, the rooms seen, the score.
 */
export function describeSave(save: MontySave, found: MontyFound): string[] {
  const items = KEY_ITEMS.filter((i) => save.items[i]).length, cakes = CUPCAKES.filter((i) => save.items[i]).length;
  const rooms = Object.keys(found.rooms).filter((id) => !isExtensionRoom(Number(id))).length;
  return [sectorName(save.roomId).text, `LIVES ${save.lives}`, `ITEMS ${items}/${KEY_ITEMS.length}`, `CAKES ${cakes}/${CUPCAKES.length}`, `ROOMS ${rooms}`, `SCORE ${save.score}`];
}
