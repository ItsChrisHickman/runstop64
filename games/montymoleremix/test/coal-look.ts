/**
 * The coal looks the same in every room: one solid lump (Wanted's first room's picture of it) in one character, each piece's cell shimmering through
 * the C64's colours. Wanted drew the piece differently per room (hollow rings, lumps, blobs: in the later rooms an outline round black), which read as
 * broken coal beside the early rooms'. With an out-dir: a picture of every room that has coal.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/coal-look.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng } from '../../../tools/probe/render';
import { piecesOfRoom } from '../../montymole/src/coal-rules';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { check, finish } from '../../shared/test/check';
import { PLAY_COL, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { COAL_CHAR, COAL_LUMP } from '../src/game';
import { normaliseCoal } from './bot';
import { newGame, NONE, picture, step } from './harness';

const out = process.argv[2];
const first = ROOMS[0]?.nugget ?? [];
check('the lump is room 0\'s picture of the coal', COAL_LUMP.length === 8 && COAL_LUMP.every((b, i) => b === first[i]));

const p = newGame();
const g = p.g;
g.graceActive = () => true;
const bad: string[] = [];
let pieces = 0;
for (const room of ROOMS.keys()) {
  normaliseCoal(g, room);
  g.roomId = room;
  g.loadRoom();
  const glyph = Array.from(g.mem.subarray(COAL_CHAR * 8, COAL_CHAR * 8 + 8));
  if (!glyph.every((b, i) => b === COAL_LUMP[i])) bad.push(`room ${room}: the glyph is ${glyph.map((b) => b.toString(16)).join(' ')}`);
  const ids = piecesOfRoom(room);
  const seen = new Set<number>();
  for (const piece of g.room.coal) {
    pieces++;
    const at = SCREEN + (piece.row + PLAY_ROW) * ROW + PLAY_COL + piece.col;
    if (g.mem[at] !== COAL_CHAR) bad.push(`room ${room}: piece ${piece.id} draws ${g.mem[at]?.toString(16)}`);
    seen.add(piece.id);
  }
  if (ids.length !== seen.size) bad.push(`room ${room}: ${ids.length} pieces, ${seen.size} drawn`);
  // the shimmer: each piece's cell steps through the colours, a pass every other frame (a piece Monty takes on the way is no longer there: read of the ones still on the screen)
  const start = [...g.entities];
  const colours = start.map(() => new Set<number>());
  for (let i = 0; i < 40; i++) {
    step(p, NONE);
    if (i === 7 && out !== undefined && g.room.coal.length > 0) {
      fs.mkdirSync(out, { recursive: true });
      indicesPng(path.join(out, `coal-room-${String(room).padStart(2, '0')}.png`), picture(g), 320, 200, 2);
    }
    start.forEach((e, k) => { if (g.entities.includes(e)) colours[k]?.add(g.col[e.at - SCREEN] ?? 0); });
  }
  const most = Math.max(0, ...colours.map((c) => c.size));
  if (start.length > 0 && most < 4 && g.entities.length > 0) bad.push(`room ${room}: shimmer through ${most} colours`);
}
check(`all ${pieces} pieces of coal in ${ROOMS.length} rooms are the lump, in one character, shimmering${bad.length ? `: ${bad.slice(0, 6).join('; ')}` : ''}`, bad.length === 0 && pieces > 0);
finish();
