/**
 * Blackwyche's rooms as pieces (src/pictures.ts, decoded by re/pictures.ts) against the running game:
 * along all ten recorded routes (re/routes.json, found by automatic play: 41 of the ship's places),
 * every 6th frame from the first in play, the play band's characters are one of the decoded pictures (or two side by
 * side, scrolled), cell for cell but where the game draws something of its own (a thing to take, an
 * opened door, the hidden door, a ladder's hatch): the cells that differ are counted, and none may be
 * more than a few. Says which pictures were seen, how often, and the most cells any differed by.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/pictures.ts [out-dir: the frames seen with the most differing, as PNGs]
 */
import fs from 'node:fs';
import { blackwycheHd } from '../src/hd';
import { port } from '../src/native';
import { PICTURES } from '../src/pictures';
import { routeWalker } from '../../shared/test/hd';
import { decodePicture } from '../../../packages/c64kit/src/c64/picture';
import { placePictures } from '../../../packages/c64kit/src/hd/placed';
import { pixelPieces } from '../../../packages/c64kit/src/pendragon/room';
import { renderPng } from '../../../tools/probe/render';

const title = new Uint8Array(fs.readFileSync('games/blackwyche/assets/blackwyche-title.state'));
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });
let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const { band } = blackwycheHd, W = 320;

// Each picture's pieces stand where the room has them (all 20, both versions of the decks'):
// - every wall between the floor's front edge and its back (none in front of the room, none behind
//   where the floor ends: a wall stood flat against the band's top);
// - every side wall on its own foot: the floor right under its pixels somewhere (a side wall whose
//   columns were taken for the back wall had none: $AC's and $7C's right-hand walls stood flat);
// - every part of a thing standing apart from the rest of it (its pixels joined, the floor under some
//   of them, no part of it over or under another) on its own foot: the thing stands no more than a
//   character row in front of the floor under that part (a wardrobe joined to a post three rows nearer
//   stood at the post's foot; cannonballs joined to a cannon at its wheels', two rows nearer: what
//   stood or walked in front of them went behind them).
{
  let walls = 0, sides = 0, parts = 0;
  const bad: string[] = [];
  for (const p of PICTURES.pictures) {
    const px = pixelPieces(p), PW = p.cols * 8, PH = p.rows * 8, name = `$${p.id.toString(16)}/${p.variant}`;
    const floorAt = p.pieces.findIndex((q) => q.kind === 'floor'), fl = p.pieces[floorAt];
    const height = fl.kind === 'floor' ? fl.height : 0, bottom = PH;
    /** The depth of the floor at picture pixel row y. */
    const zAt = (y: number) => bottom - (y + 0.5) - height;
    let deepest = -Infinity, nearest = Infinity;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (px[y * PW + x] === floorAt) { deepest = Math.max(deepest, zAt(y)); nearest = Math.min(nearest, zAt(y)); }
    const front = Math.min(...p.pieces.flatMap((q) => (q.kind === 'wall' ? [q.depth] : [])));
    for (const [k, q] of p.pieces.entries()) {
      if (q.kind === 'wall') { walls++; if (q.depth < front || q.depth > deepest + 1) bad.push(`${name} wall ${k} at ${q.depth} (floor ${nearest.toFixed(0)}-${deepest.toFixed(0)})`); }
      if (q.kind === 'side') {
        sides++;
        let foot = 0;
        for (let y = 0; y + 1 < PH; y++) for (let x = 0; x < PW; x++) if (px[y * PW + x] === k && px[(y + 1) * PW + x] === floorAt) foot++;
        if (!foot) bad.push(`${name} side wall ${k}: no foot on the floor`);
      }
      if (q.kind !== 'thing') continue;
      // its parts: pixels joined (corner to corner too)
      const seen = new Uint8Array(PW * PH), groups: { lo: number; hi: number; low: number; n: number }[] = [];
      for (let s = 0; s < PW * PH; s++) {
        if (px[s] !== k || seen[s]) continue;
        const g = [s];
        seen[s] = 1;
        let lo = PW, hi = -1, low = -1;
        for (let i = 0; i < g.length; i++) {
          const j = g[i], x = j % PW, y = (j - x) / PW;
          lo = Math.min(lo, x); hi = Math.max(hi, x);
          if (y + 1 < PH && px[j + PW] === floorAt) low = Math.max(low, y + 1);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy, n = Y * PW + X;
            if (X >= 0 && Y >= 0 && X < PW && Y < PH && px[n] === k && !seen[n]) { seen[n] = 1; g.push(n); }
          }
        }
        if (low >= 0 && g.length >= 32) groups.push({ lo, hi, low, n: g.length });
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
        const foot = zAt(g.low) + 0.5;
        if (foot - q.depth > 8) bad.push(`${name} thing ${k} at ${q.depth}: a part of it (x ${g.lo / 2}-${g.hi / 2}) stands at ${foot}`);
      }
    }
  }
  check(`the ${PICTURES.pictures.length} pictures' pieces stand in the room: ${walls} walls between the floor's front and back, ${sides} side walls each on its foot, ${parts} parts of things standing apart each on its own foot${bad.length ? `; not: ${bad.join(', ')}` : ''}`, bad.length === 0);
}
const name = (id: number, variant: number) => `$${id.toString(16)}${variant ? '/lower' : ''}`;
const seen = new Map<string, number>();
let frames = 0, placed = 0, worst = 0, cellsDiffering = 0;
const unplaced: string[] = [];
for (let route = 0; route < 10; route++) {
  const w = routeWalker({ port, title, routes: 'games/blackwyche/re/routes.json', route, cheat: (ram) => { ram[0x9d77] = 100; ram[0x3417] = 0; } });
  let playing = false;
  for (let m = w.next(); m; m = w.next()) {
    // (every 6th frame, from the first in play: the title before it is no room)
    if (w.frame % 6) continue;
    const pic = decodePicture(m.ram, m.capture), a = band.y * W, b = (band.y + band.h) * W;
    const p = placePictures(PICTURES, band, { code: pic.code.slice(a, b), colour: pic.colour.slice(a, b), pair: pic.pair.slice(a, b), row: pic.row.slice(a, b), column: pic.column.slice(a, b) });
    playing ||= !!p;
    if (!playing) continue;
    frames++;
    if (!p) {
      if (unplaced.length < 5) {
        unplaced.push(`route ${route} frame ${w.frame}`);
        if (outDir) renderPng(m, `${outDir}/unplaced-${route}-${w.frame}.png`);
      }
      continue;
    }
    placed++;
    const s = p.shows, key = s.from ? `${name(s.left.id, s.left.variant)}|${name(s.right.id, s.right.variant)}` : name(s.left.id, s.left.variant);
    const one = s.from ? `${name(s.left.id, s.left.variant)} ${name(s.right.id, s.right.variant)}` : name(s.left.id, s.left.variant);
    for (const k of one.split(' ')) seen.set(k, (seen.get(k) ?? 0) + 1);
    cellsDiffering += s.differ;
    if (s.differ > worst) {
      worst = s.differ;
      if (outDir) renderPng(m, `${outDir}/differ-${s.differ}-${key.replace(/[$|/]/g, '_')}-${route}-${w.frame}.png`);
      console.log(`     route ${route} frame ${w.frame}: ${key} from column ${s.from}, ${s.differ} of ${s.cells} cells drawn differently`);
    }
  }
}
check(`along the ten routes, ${frames} frames in play looked at: ${placed} are the game's own room pictures (${unplaced.length ? `not: ${unplaced.join(', ')}` : 'all'})`, placed === frames && frames > 10000);
check(`the cells the game draws differently from its picture: ${(cellsDiffering / Math.max(1, placed)).toFixed(2)} a frame on average, ${worst} at most (of 680)`, worst <= 40);
const all = PICTURES.pictures.map((p) => name(p.id, p.variant));
console.log(`     pictures seen (frames): ${all.map((k) => `${k} ${seen.get(k) ?? 0}`).join(', ')}`);
check(`every picture the routes reach is decoded (${[...seen.keys()].filter((k) => !all.includes(k)).length} not), ${all.filter((k) => seen.has(k)).length} of the ${all.length} seen`, [...seen.keys()].every((k) => all.includes(k)));
console.log(failures ? `${failures} FAILED` : 'all ok');
process.exit(failures ? 1 : 0);
