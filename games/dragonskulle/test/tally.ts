/**
 * ENHANCED's tally (src/main.ts `PLAY_LAYOUTS`, src/rules.ts `tally`): on a river screen the wizards killed of those its
 * bridge wants, on a dragon's the hits of ten, read off the picture as shown, in the status line where HIGH SCORE is; the
 * faces kept; gone once the bridge is open or the dragon dead; never in ORIGINAL. With an out-dir, pictures of it.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/tally.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import type { PictureLayout } from 'c64kit';
import { DRAGON_ROOMS, RIVERS, enter, native } from '../re/rules/lab';
import { indicesToRgb, renderPixels, rgbPng } from '../../../tools/probe/render';
import { PLAY_LAYOUTS, dragonskulleLayout } from '../src/main';
import { BRIDGE_OPEN, HITS } from '../src/rules';
import { pendragonCode } from '../../shared/pendragon/status';
import { check, finish } from '../../shared/test/check';

const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });

type Player = ReturnType<typeof native>;
/** The layout the front end shows for this frame (the first whose `when` holds). */
function shown(p: Player, enhanced: boolean): PictureLayout | null {
  const l = PLAY_LAYOUTS.find((x) => x.when(p.host.m, enhanced));
  if (!l) return null;
  return typeof l.picture === 'function' ? l.picture(p.ram) : l.picture;
}
/** The picture as shown with `layout`. */
const picture = (p: Player, layout: PictureLayout | null) => renderPixels(p.host.m, layout);
/** The text in the shown status line's row `y` (pixels), columns 0-22, read back against the panel's charset ($3000). */
function rowText(p: Player, px: Uint8Array, y: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let c = 0; c < 23; c++) {
    const x0 = c * 8 + 7;
    const lit = (dx: number, dy: number) => (px[(y + dy) * 320 + x0 + dx] ?? 0) !== 0;
    let found = ' ';
    for (const ch of chars) {
      const code = pendragonCode(ch);
      if (code === null) continue;
      const kept = p.ram.subarray(0x3000 + code * 8, 0x3000 + code * 8 + 8);
      const g = kept[0] === 0xff ? kept.map((v) => ~v & 0xff) : kept; // (a letter kept cut out, as layout.ts draws it)
      let same = true;
      for (let dy = 0; dy < 8 && same; dy++) for (let dx = 0; dx < 8; dx++) if (((g[dy] ?? 0) & (0x80 >> dx)) !== 0 !== lit(dx, dy)) { same = false; break; }
      if (same) { found = ch; break; }
    }
    out += found;
  }
  return out.replace(/ +/g, ' ').trim();
}
const faces = (px: Uint8Array) => px.subarray(16 * 320 + 191, 16 * 320 + 320).join(',');
const shot = (name: string, px: Uint8Array) => { if (outDir) rgbPng(path.join(outDir, `${name}.png`), indicesToRgb(px), 320, 200, 2); };

// the rivers: WIZARDS n OF need, with the count the game keeps
for (const river of RIVERS) {
  const p = native(enter(river.cell[0], river.cell[1]));
  for (let k = 0; k < 5; k++) p.step(0);
  const plain = picture(p, dragonskulleLayout);
  p.ram[river.counter] = 3;
  const px = picture(p, shown(p, true));
  shot(`river-${river.room}`, px);
  const text = rowText(p, px, 16), need = river.room === 3 ? 10 : river.room === 4 ? 15 : 20;
  check(`room ${river.room}'s river, ENHANCED: "${text}" where HIGH SCORE was (want WIZARDS 3 OF ${need})`, text === `WIZARDS 3 OF ${need}`);
  check(`room ${river.room}: SCORE and the faces as they were`, rowText(p, px, 0) === rowText(p, plain, 0) && faces(px) === faces(plain) && rowText(p, plain, 0).startsWith('SCORE'));
  check(`room ${river.room}, ORIGINAL: HIGH SCORE as the game has it ("${rowText(p, picture(p, shown(p, false)), 16)}")`, rowText(p, picture(p, shown(p, false)), 16).startsWith('HIGH SCORE'));
  p.ram[river.counter] = BRIDGE_OPEN;
  check(`room ${river.room}, the bridge open: HIGH SCORE back`, rowText(p, picture(p, shown(p, true)), 16).startsWith('HIGH SCORE'));
}
// a dragon: DRAGON HITS n OF 10
{
  const d = DRAGON_ROOMS[0];
  if (!d) throw new Error('no dragon rooms');
  const p = native(enter(d.cell[0], d.cell[1]));
  for (let k = 0; k < 5; k++) p.step(0);
  p.ram[HITS] = 4;
  const px = picture(p, shown(p, true));
  shot(`dragon-${d.room}`, px);
  const text = rowText(p, px, 16);
  check(`the dragon of room ${d.room}, ENHANCED: "${text}" (want DRAGON HITS 4 OF 10)`, text === 'DRAGON HITS 4 OF 10');
  p.ram[d.flag] = 1;
  check(`the dragon dead: HIGH SCORE back`, rowText(p, picture(p, shown(p, true)), 16).startsWith('HIGH SCORE'));
}
// anywhere else: as the game has it
{
  const p = native(enter(1, 1));
  for (let k = 0; k < 5; k++) p.step(0);
  check('a screen with nothing to count: HIGH SCORE as the game has it', shown(p, true) === dragonskulleLayout);
}
finish();
