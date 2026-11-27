/**
 * No hole in a backdrop: in every room of every region, every coin taken leaves its cell exactly as the room draws it without that coin (character and colour, and no
 * shimmer after), whatever is behind it (nothing, a backdrop decoration, a room tile); and a cell an item's effect clears (a gate, a barrier, a sign) and cracked ice that has gone leave the cell
 * showing what the room's backdrop has there (a sky, a sea: the decorations of a backdrop type, derived here from the room's own list), never black unless the backdrop is
 * black there, and in the backdrop's colour after a turn of the coins' colour cycle (it does not flash). A coin on a backdrop is drawn over it (its picture in the cell with the backdrop's, not a black box);
 * no coin or find sits in a black hole in a backdrop (a cell off it whose neighbours, two or more, have the same backdrop), and a find over a backdrop is drawn in front of it.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/backdrop-holes.ts [--room <rooms>]
 */
import { decorPool } from '../../montyotr/src/decor-chars';
import { roomDecorTypes } from '../../shared/monty/rooms';
import { ROW, SCREEN } from '../../montyotr/src/game';
import { crackUpdate } from '../../montyotr/src/cracks';
import { animateCharacters, applyRoomEffects, collectCoin, useOnTheSpot } from '../../montyotr/src/items';
import type { Game } from '../../montyotr/src/game';
import { COIN_CHAR, PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { inRoom, roomsOf } from './climb-kit';
import { SCOPE } from './scope';

/** What the room's backdrop has at each screen cell: the last decoration of a backdrop type that covers it, its character and colour (derived from the data, as the engine does not). */
function backdropOf(room: number): Map<number, readonly [chr: number, colour: number]> {
  const { decorRooms } = WORLD, decorTypes = roomDecorTypes(WORLD, room);
  const first = decorPool(WORLD, room).first;
  const cells = new Map<number, readonly [number, number]>();
  for (let i = 0; i + 3 < decorRooms.length; i += 4) {
    if (decorRooms[i] !== room) continue;
    const type = decorTypes[decorRooms[i + 3] ?? 0], start = first[decorRooms[i + 3] ?? 0];
    if (!type?.backdrop || !start) continue;
    let tile = start, stream = 0;
    for (let r = 0; r < type.h; r++) {
      for (let c = 0; c < type.w; c++) {
        const colour = typeof type.colour === 'number' ? type.colour : type.colour[stream++];
        cells.set(((decorRooms[i + 2] ?? 0) + r) * ROW + (decorRooms[i + 1] ?? 0) + c, [tile++, (colour ?? 0) & 15]);
      }
    }
  }
  return cells;
}

const cellOf = (g: Game, at: number) => g.mem[SCREEN + at] ?? 0;
const where = (room: number, at: number) => `room $${room.toString(16)} cell (${(at % ROW) - PLAY_COL}, ${Math.floor(at / ROW) - PLAY_ROW})`;

/** Shimmer steps watched after a coin is taken (the cycle is 11). */
const SHIMMER_STEPS = 12;
const wrong: string[] = [];
let coins = 0, coinsOnBackdrop = 0, cleared = 0, clearedOnBackdrop = 0, cracked = 0, holesLooked = 0;
/** The cell now shows `at`'s backdrop (or nothing where it has none). */
function showsBackdrop(g: Game, room: number, at: number, back: ReadonlyMap<number, readonly [number, number]>, what: string): boolean {
  const want = back.get(at);
  const chr = cellOf(g, at);
  const ok = want === undefined ? chr === 0 : chr === want[0] && (g.col[at] ?? 0) === want[1];
  if (!ok) wrong.push(`${what} ${where(room, at)}: ${chr.toString(16)}, the backdrop has ${want === undefined ? 'nothing' : want[0].toString(16)}`);
  return want !== undefined;
}

for (const room of SCOPE.keep(roomsOf(WORLD))) {
  const back = backdropOf(room);

  // every coin: drawn over what is behind it (its pixels all there), and taken, its cell is then exactly what the room shows there drawn without that coin (the character and
  // its colour, a few shimmer steps on: a taken coin's cell must not go on sparkling), whatever was behind it: nothing, a backdrop's sky or wall, or a room tile.
  {
    const s = inRoom(WORLD, room), ref = inRoom(WORLD, room);
    if (!s || !ref) continue;
    const g = s.g;
    const coin = g.mem.slice(COIN_CHAR * 8, COIN_CHAR * 8 + 8);
    for (const e of [...g.entities]) {
      if (e.index < 0) continue;
      const at = e.at - SCREEN;
      // the room drawn without this coin (as a player who took it sees it on coming back)
      ref.g.coinCollected[e.index] = 0xff;
      ref.g.loadRoom();
      for (let n = 0; n < SHIMMER_STEPS; n++) animateCharacters(ref.g);
      const want = [ref.g.mem[e.at] ?? 0, ref.g.col[at] ?? 0] as const;
      ref.g.coinCollected[e.index] = 0;
      const glyph = g.mem.slice((g.mem[e.at] ?? 0) * 8, (g.mem[e.at] ?? 0) * 8 + 8);
      if (want[0] !== 0 && g.mem[e.at] === COIN_CHAR) wrong.push(`coin ${where(room, at)} has no character to be drawn over what is behind it in`);
      if (coin.some((row, y) => ((glyph[y] ?? 0) & row) !== row)) wrong.push(`coin ${where(room, at)} is not drawn whole`);
      g.x2 = 0x0c + (at % ROW) * 4; g.y = 0x32 + Math.floor(at / ROW) * 8;
      const before = g.coinCollected[e.index];
      collectCoin(g);
      if (g.coinCollected[e.index] === before) { wrong.push(`coin ${where(room, at)} cannot be taken from where it is`); continue; }
      coins++;
      if (want[0] !== 0) coinsOnBackdrop++;
      const seen: string[] = [];
      for (let n = 0; n < SHIMMER_STEPS; n++) {
        animateCharacters(g);
        const chr = g.mem[e.at] ?? 0, colour = g.col[at] ?? 0;
        if (chr !== want[0] || (want[0] !== 0 && colour !== want[1])) seen.push(`${chr.toString(16)}/${colour}`);
      }
      if (seen.length) wrong.push(`a taken coin at ${where(room, at)} shows ${[...new Set(seen)].join(' ')}, the room without it ${want[0].toString(16)}/${want[1]}`);
    }
  }

  // no black hole under a coin or a find inside a backdrop (Chris: "the blue background has black holes"): every such cell, taken or not, shows the backdrop where two of its four neighbours have
  // the same one; and a find over a backdrop is drawn in front of it (its sprite's priority bit clear), or the backdrop's pixels would cover it
  {
    const s = inRoom(WORLD, room);
    if (s) {
      const g = s.g, finds: number[] = [];
      for (const e of g.entities) if (e.index >= 0) finds.push(e.at - SCREEN);
      for (let i = 0; i * 4 < WORLD.specialItems.length; i++) {
        if (WORLD.specialItems[i * 4] !== room) continue;
        const x = (WORLD.specialItems[i * 4 + 1] ?? 0) * 2 - 24, y = (WORLD.specialItems[i * 4 + 2] ?? 0) - 50;
        const mine: number[] = [];
        for (let r = Math.floor(y / 8); r <= Math.floor((y + 15) / 8); r++) for (let c = Math.floor(x / 8); c <= Math.floor((x + 15) / 8); c++) mine.push(r * ROW + c);
        finds.push(...mine);
        const n = g.siSecondIdx === i ? 1 : g.siActiveIdx === i ? 0 : -1;
        if (n >= 0 && mine.some((at) => back.has(at)) && (g.priority >> n) & 1) wrong.push(`the find on sprite ${n} in room $${room.toString(16)} is behind its backdrop (its priority bit set)`);
      }
      for (const at of finds) {
        if (back.has(at)) continue;
        holesLooked++;
        const near = [at - 1, at + 1, at - ROW, at + ROW].flatMap((k) => { const b = back.get(k); return b ? [b[0]] : []; });
        if (near.some((chr) => near.filter((o) => o === chr).length >= 2)) wrong.push(`a black hole in the backdrop under a coin or find at ${where(room, at)}`);
      }
    }
  }

  // every cell an item's effect clears
  for (const e of WORLD.roomEffects) {
    if (e.room !== room || !e.clear?.length) continue;
    const s = inRoom(WORLD, room);
    if (!s) continue;
    const g = s.g;
    for (const c of e.when ?? []) {
      if ('taken' in c) g.siCollected[c.taken] = 1;
      else if ('kit' in c) g.roomItemActive[c.kit] = 1;
      else if ('noKit' in c) g.roomItemActive[c.noKit] = 0;
    }
    applyRoomEffects(g);
    // (an item used on the spot gives way only with him in its box: stood there, as he brings it: the kapok's tangle)
    if (e.at) { g.x2 = 0x0c + e.at.col * 4; g.y = 0x32 + e.at.row * 8; useOnTheSpot(g); }
    // (a cell another effect of the room fills again, a rope through a gate, is not cleared)
    const placed = new Set(WORLD.roomEffects.filter((o) => o.room === room).flatMap((o) => (o.place?.cells ?? []).map(([row, col]) => row * ROW + col)));
    for (const [row, col] of e.clear) {
      const at = row * ROW + col;
      if (placed.has(at)) continue;
      cleared++;
      if (showsBackdrop(g, room, at, back, 'a cleared cell at')) clearedOnBackdrop++;
    }
  }

  // cracked ice that has gone
  for (const spec of WORLD.cracks) {
    if (spec.room !== room) continue;
    const s = inRoom(WORLD, room);
    if (!s) continue;
    const g = s.g;
    const patch = g.cracks.find((c) => c.spec === spec);
    if (!patch) { wrong.push(`the ice of room $${room.toString(16)} is not in the room`); continue; }
    // (stood on it, frame after frame, as the ice counts: the patch's own update, without the rest of the frame moving him)
    for (let n = 0; n < spec.gone + 40 && patch.stage !== 3; n++) {
      g.x2 = 0x0c + (spec.col + PLAY_COL) * 4; g.y = 0x32 + (spec.row - 2 + PLAY_ROW) * 8;
      g.falling = 0; g.montyAction = 0; g.onRope = 0; g.gameMode = 0;
      crackUpdate(g);
    }
    if (patch.stage !== 3) { wrong.push(`the ice of room $${room.toString(16)} (col ${spec.col}) did not go`); continue; }
    for (let col = spec.col; col < spec.col + spec.cols; col++) {
      cracked++;
      showsBackdrop(g, room, (spec.row + PLAY_ROW) * ROW + col + PLAY_COL, back, 'gone ice at');
    }
  }
}

check(`${coins} coins taken (${coinsOnBackdrop} over something drawn), ${holesLooked} cells under coins and finds off a backdrop looked at for a hole, ${cleared} cleared cells (${clearedOnBackdrop} on a backdrop), ${cracked} cells of gone ice: each leaves the backdrop's cell (${wrong.length} wrong${wrong.length ? `: ${wrong.slice(0, 30).join('; ')}` : ''})`, wrong.length === 0 && (!SCOPE.all || (coins > 0 && coinsOnBackdrop > 0))); // (the counts' floor is the whole world's: a room may have no coin on a backdrop)
finish();
