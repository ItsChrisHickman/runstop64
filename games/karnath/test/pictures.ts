/**
 * The Staff of Karnath's rooms as pieces (src/pictures.ts, decoded by re/pictures.ts) against the running game:
 * along all five recorded routes (re/routes.json, found by automatic play: the lower and upper floors, the
 * dungeons, Karn's abode), every 6th frame from the first in play, the play band's characters are a window
 * of one of the decoded strips of rooms (the band 40 columns of its 120, scrolled), cell for cell but where
 * the game draws something of its own (a piece of the pentacle taken, a door opened, a spell in flight): the
 * cells that differ are counted, and none may be more than a few. Says which strips were seen, how often,
 * and the most cells any differed by. And each strip's pieces stand in the room (what Blackwyche's test
 * checks of its pictures): every wall between the floor's front and its back, every side wall on a floor,
 * every part of a thing standing apart on its own foot.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/pictures.ts [out-dir: the frames seen with the most differing, as PNGs]
 */
import fs from 'node:fs';
import { karnathHd } from '../src/hd';
import { port } from '../src/native';
import { PICTURES } from '../src/pictures';
import { STRIPS } from '../src/strips';
import { routeWalker } from '../../shared/test/hd';
import { decodePicture } from '../../../packages/c64kit/src/c64/picture';
import { placePictures } from '../../../packages/c64kit/src/hd/placed';
import { pixelPieces } from '../../../packages/c64kit/src/pendragon/room';
import { renderPng } from '../../../tools/probe/render';
import { check, finish } from '../../shared/test/check';

const title = new Uint8Array(fs.readFileSync('games/karnath/assets/karnath-title.state'));
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });

const { band } = karnathHd, W = 320;
const label = (id: number) => STRIPS[id].label;

// Each strip's pieces stand where the room has them:
// - every wall between the floor's front edge and its back (none in front of the room, none behind
//   where the floor ends);
// - every side wall on its own foot: a floor right under its pixels somewhere;
// - every part of a thing standing apart from the rest of it (its pixels joined, a floor under some of
//   them, no part of it over or under another) on its own foot: the thing stands no more than a
//   character row in front of the floor under that part.
{
  let walls = 0, sides = 0, parts = 0, tops = 0;
  const bad: string[] = [];
  for (const p of PICTURES.pictures) {
    const px = pixelPieces(p), PW = p.cols * 8, PH = p.rows * 8, name = label(p.id);
    const floorAt = p.pieces.findIndex((q) => q.kind === 'floor'), fl = p.pieces[floorAt];
    const height = fl.kind === 'floor' ? fl.height : 0, bottom = PH;
    const isFloor = (n: number) => p.pieces[n].kind === 'floor';
    /** The height of the floor piece n. */
    const heightOf = (n: number) => { const q = p.pieces[n]; return q.kind === 'floor' ? q.height : height; };
    /** The depth of the ground's floor at picture pixel row y. */
    const zAt = (y: number) => bottom - (y + 0.5) - height;
    let deepest = -Infinity, nearest = Infinity;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (px[y * PW + x] === floorAt) { deepest = Math.max(deepest, zAt(y)); nearest = Math.min(nearest, zAt(y)); }
    const front = Math.min(...p.pieces.flatMap((q) => (q.kind === 'wall' ? [q.depth] : [])));
    tops += p.pieces.filter((q) => q.kind === 'floor').length - 1;
    for (const [k, q] of p.pieces.entries()) {
      if (q.kind === 'wall') { walls++; if (q.depth < front || q.depth > deepest + 1) bad.push(`${name} wall ${k} at ${q.depth} (floor ${nearest.toFixed(0)}-${deepest.toFixed(0)})`); }
      if (q.kind === 'side') {
        sides++;
        let foot = 0;
        for (let y = 0; y + 1 < PH; y++) for (let x = 0; x < PW; x++) if (px[y * PW + x] === k && isFloor(px[(y + 1) * PW + x])) foot++;
        if (!foot) bad.push(`${name} side wall ${k}: no foot on a floor`);
      }
      if (q.kind !== 'thing') continue;
      // its parts: pixels joined (corner to corner too)
      const seen = new Uint8Array(PW * PH), groups: { lo: number; hi: number; foot: number; n: number }[] = [];
      for (let s = 0; s < PW * PH; s++) {
        if (px[s] !== k || seen[s]) continue;
        const g = [s];
        seen[s] = 1;
        let lo = PW, hi = -1, low = -1, under = floorAt;
        for (let i = 0; i < g.length; i++) {
          const j = g[i], x = j % PW, y = (j - x) / PW;
          lo = Math.min(lo, x); hi = Math.max(hi, x);
          if (y + 1 < PH && isFloor(px[j + PW]) && y + 1 >= low) { low = y + 1; under = px[j + PW]; }
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy, n = Y * PW + X;
            if (X >= 0 && Y >= 0 && X < PW && Y < PH && px[n] === k && !seen[n]) { seen[n] = 1; g.push(n); }
          }
        }
        if (low >= 0 && g.length >= 32) groups.push({ lo, hi, foot: bottom - low - heightOf(under), n: g.length });
      }
      // (and side by side, a character column to the next, its lowest cells no more than a row apart)
      let last = -1;
      for (let c = 0; c < p.cols; c++) {
        let r = -1;
        for (let y = 0; y < p.rows - 1; y++) if (p.cells[y * p.cols + c] === k) r = y;
        if (r < 0) continue;
        if (last >= 0 && Math.abs(r - last) >= 2) bad.push(`${name} thing ${k}: its foot jumps from row ${last} to ${r} at column ${c}`);
        last = r;
      }
      for (const g of groups) {
        if (groups.some((o) => o !== g && o.lo <= g.hi && g.lo <= o.hi)) continue;
        parts++;
        if (g.foot - q.depth > 8) bad.push(`${name} thing ${k} at ${q.depth}: a part of it (x ${g.lo / 2}-${g.hi / 2}) stands at ${g.foot}`);
      }
    }
  }
  check(`the ${PICTURES.pictures.length} strips' pieces stand in the room: ${walls} walls between the floor's front and back, ${sides} side walls each on its foot, ${tops} tops standing above the ground, ${parts} parts of things standing apart each on its own foot${bad.length ? `; not: ${bad.join(', ')}` : ''}`, bad.length === 0);
}

const seen = new Map<number, number>();
let frames = 0, placed = 0, worst = 0, cellsDiffering = 0, elsewhere = 0;
const wrong: string[] = [], inMode = new Map<number, number>();
const unplaced: string[] = [];
for (let route = 0; route < 5; route++) {
  const w = routeWalker({ port, title, routes: 'games/karnath/re/routes.json', route, cheat: (ram) => { ram[0x6ffe] = 100; ram[0x322e] = 0; } });
  let playing = false, mode = -1, changed = 0;
  for (let m = w.next(); m; m = w.next()) {
    // (every 6th frame, from the first in play: the title before it is no room)
    if (w.frame % 6) continue;
    const pic = decodePicture(m.ram, m.capture), a = band.y * W, b = (band.y + band.h) * W;
    const p = placePictures(PICTURES, band, { code: pic.code.slice(a, b), colour: pic.colour.slice(a, b), pair: pic.pair.slice(a, b), row: pic.row.slice(a, b), column: pic.column.slice(a, b) });
    playing ||= !!p;
    if (!playing) continue;
    frames++;
    if (!p) {
      if (unplaced.length < 8) {
        unplaced.push(`route ${route} frame ${w.frame} (mode ${m.ram[0x3219]}, level ${m.ram[0xb3e1]})`);
        if (outDir) renderPng(m, `${outDir}/unplaced-${route}-${w.frame}.png`);
      }
      continue;
    }
    placed++;
    const s = p.shows;
    seen.set(s.left.id, (seen.get(s.left.id) ?? 0) + 1);
    inMode.set(m.ram[0x3219], (inMode.get(m.ram[0x3219]) ?? 0) + 1);
    // (the strip is the mode's: the upper floor's in mode 1, the lower's in 0, the dungeons' in $FF, the abode's in $FE; but for the 50 frames or so after the mode changes the game draws the room it comes from: the screen is redrawn after)
    if (m.ram[0x3219] !== mode) { mode = m.ram[0x3219]; changed = w.frame; }
    if (STRIPS[s.left.id].mode !== mode && w.frame - changed > 50) { elsewhere++; if (wrong.length < 20) wrong.push(`route ${route} frame ${w.frame}: mode ${mode} is ${label(s.left.id)}`); }
    cellsDiffering += s.differ;
    if (s.differ > worst) {
      worst = s.differ;
      if (outDir) renderPng(m, `${outDir}/differ-${s.differ}-${label(s.left.id)}-${route}-${w.frame}.png`);
      console.log(`     route ${route} frame ${w.frame}: ${label(s.left.id)} from column ${s.from}, ${s.differ} of ${s.cells} cells drawn differently`);
    }
  }
}
check(`along the five routes, ${frames} frames in play looked at: ${placed} are a window of the game's own strips (${unplaced.length ? `not: ${unplaced.join(', ')}` : 'all'})`, placed === frames && frames > 2000);
check(`the cells the game draws differently from its picture: ${(cellsDiffering / Math.max(1, placed)).toFixed(2)} a frame on average, ${worst} at most (of 800)`, worst <= 80);
check(`each strip is the game's mode's (but just after the mode changes): ${placed - elsewhere} of the ${placed} frames (${[...inMode.entries()].map(([k, v]) => `mode ${k.toString(16)}: ${v}`).join(', ')})${wrong.length ? `; not: ${wrong.join(', ')}` : ''}`, elsewhere === 0);
const all = PICTURES.pictures.map((p) => p.id);
console.log(`     strips seen (frames): ${all.map((k) => `${label(k)} ${seen.get(k) ?? 0}`).join(', ')}`);
check(`every strip the routes reach is decoded (${[...seen.keys()].filter((k) => !all.includes(k)).length} not), ${all.filter((k) => seen.has(k)).length} of the ${all.length} seen`, [...seen.keys()].every((k) => all.includes(k)));
finish();
