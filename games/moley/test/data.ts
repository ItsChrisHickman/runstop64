/**
 * The committed data (src/data/*.ts, made by re/extract.ts) proved against the original:
 *  - made again from the tape, the ROM and the game in play, it is the same;
 *  - every block is, byte for byte, what the original has in memory when running: at the credits page and in each room's state
 *    (the sprites, tiles, gauge images, panel, picture and texts are never changed by play; the maps differ only where the
 *    game itself changes them: item cells and room 2's rewritten platform; the nine sprite frames at $D000 lie under the
 *    interrupt table the game builds there, and there it is the table that differs);
 *  - the glyphs are the characters the original prints: the game's character routine ($A2B5, and $A2B6 for the score) is watched
 *    through the credits scroller, the ending scroller, game over and the score, and every character it draws has a glyph here,
 *    and every glyph here is one it draws.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/data.ts [tape] [rom] [states-dir]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { rowAddress } from '../../../tools/zx/screen';
import { Spectrum } from '../../../tools/zx/spectrum';
import {
  CREDITS_PICTURE, CREDITS_TEXT, EFFECTS, ENDING_TEXT, ENDING_TILES, GAME_OVER_TEXT, GAUGE_FRAMES, GLYPHS, JUMP_FRAMES, JUMP_STEPS,
  mapMemory, PANEL_ATTRS, PANEL_BITMAP, SPRITE_FRAMES, TILES,
} from '../src/data';
import { drawByte, spriteRows } from '../src/sprite';
import { bytesOf, imageFromTape, printedCharacters, recordEffects, romGlyph, SPANS } from '../re/original';

const [tapeFile = 'games/moley/build/moley.tap', romFile = 'games/moley/build/48.rom', dir = 'games/moley/build'] = process.argv.slice(2);
const image = imageFromTape(new Uint8Array(fs.readFileSync(tapeFile)));
const rom = readRom(romFile);

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const text = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

// ---- the committed data is what the original gives ----------------------------------------------------------------

const memory = mapMemory();
check('maps and attributes (the original\'s layout, $6000-$80FF 8448 bytes) are the tape\'s', same(memory.subarray(0, SPANS.maps.length), bytesOf(image, SPANS.maps)) && same(memory.subarray(SPANS.maps.length), bytesOf(image, SPANS.attrs)));
const blocks: [string, Uint8Array, Uint8Array][] = [
  ['room tile set', TILES, bytesOf(image, SPANS.tiles)],
  ['ending tile set', ENDING_TILES, bytesOf(image, SPANS.endingTiles)],
  ['sprite frames (192 x 32)', SPRITE_FRAMES, bytesOf(image, SPANS.sprites)],
  ['energy gauge images', GAUGE_FRAMES, bytesOf(image, SPANS.gauge)],
  ['HUD panel bitmap', PANEL_BITMAP, bytesOf(image, SPANS.panelBitmap)],
  ['HUD panel attributes', PANEL_ATTRS, bytesOf(image, SPANS.panelAttrs)],
  ['credits picture', CREDITS_PICTURE, bytesOf(image, SPANS.credits)],
  ['credits scroller text', text(CREDITS_TEXT), bytesOf(image, SPANS.creditsText)],
  ['ending scroller text', text(ENDING_TEXT), bytesOf(image, SPANS.endingText)],
  ['game over text', text(GAME_OVER_TEXT), bytesOf(image, SPANS.gameOverText)],
  ['jump steps', JUMP_STEPS, bytesOf(image, SPANS.jumpTable)],
  ['jump frames', JUMP_FRAMES, bytesOf(image, SPANS.jumpFrames)],
];
for (const [name, got, want] of blocks) check(`${name}: committed data equals the tape's (${want.length} bytes)`, same(got, want));
check('the texts say what the notes say (GAME OVER, Z-left/X right/O up/K down/SPACE jump, Coconut Capers ... Hill 19)', GAME_OVER_TEXT === 'GAME OVER !!' && /Z-left,X right,O up,K down,SPACE jump/.test(CREDITS_TEXT) && ENDING_TEXT.startsWith('Coconut Capers') && /Hill 19/.test(ENDING_TEXT));

const wanted = printedCharacters(image);
check(`glyphs: one for each of the ${wanted.length} characters of the texts, the numerals and the space, each the ROM's 8 bytes at $3C00 + char * 8`,
  GLYPHS.size === wanted.length && wanted.every((c) => { const g = GLYPHS.get(c); return g !== undefined && same(g, romGlyph(rom, c)); }));

const play = new Uint8Array(fs.readFileSync(`${dir}/play.state`));
const again = recordEffects(rom, play);
check(`beeper effects: recorded again from the game in play they are the same (${EFFECTS.map((e) => `${e.id}: ${e.gaps.length + 1} toggles`).join(', ')})`,
  again.length === EFFECTS.length && again.every((e, i) => { const c = EFFECTS[i]; return e.id === c.id && e.lead === c.lead && e.tail === c.tail && e.gaps.length === c.gaps.length && e.gaps.every((g, j) => g === c.gaps[j]); }));

// ---- and is what the original has in memory while it runs ----------------------------------------------------------

const BELT_ROWS = [0xdaa0, 0xdaa2, 0xdbd0, 0xdbd2];
const TRAMPOLINE = { from: 0xd000, to: 0xd100 }; // the interrupt table: 257 bytes of $5F over frames $80-$88
const states = ['title', 'play', 'room0', 'room1', 'room2', 'room3', 'room4', 'room5', 'room5-arrive', 'room6'];
for (const name of states) {
  const m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync(`${dir}/${name}.state`)));
  const bad: string[] = [];
  const compare = (what: string, got: Uint8Array, at: number, skip?: { from: number; to: number }, except: readonly number[] = []) => {
    let n = 0;
    for (let i = 0; i < got.length; i++) {
      const a = at + i;
      if (skip && a >= skip.from && a <= skip.to) continue;
      if (except.includes(a)) continue;
      if (m.mem[a] !== got[i]) n++;
    }
    if (n > 0) bad.push(`${what} ${n}`);
  };
  compare('sprites', SPRITE_FRAMES, SPANS.sprites.at, TRAMPOLINE);
  compare('gauge images', GAUGE_FRAMES, SPANS.gauge.at);
  // the main loop turns one row of the two conveyor tiles each pass ($827C: RRC ($DAA0), RLC ($DAA2), RRC ($DBD0), RLC ($DBD2)):
  // tiles $55 and $7B, rows 0 and 2; they are the same bytes, rotated
  compare('room tiles', TILES, SPANS.tiles.at, undefined, BELT_ROWS);
  for (const at of BELT_ROWS) {
    const want = TILES[at - SPANS.tiles.at], got = m.mem[at];
    const rotated = [0, 1, 2, 3, 4, 5, 6, 7].some((k) => (((want << k) | (want >> (8 - k))) & 0xff) === got);
    if (!rotated) bad.push(`belt row at $${at.toString(16)} is not a rotation`);
  }
  compare('ending tiles', ENDING_TILES, SPANS.endingTiles.at);
  compare('panel bitmap', PANEL_BITMAP, SPANS.panelBitmap.at);
  compare('panel attributes', PANEL_ATTRS, SPANS.panelAttrs.at);
  compare('credits picture', CREDITS_PICTURE, SPANS.credits.at);
  compare('credits text', text(CREDITS_TEXT), SPANS.creditsText.at);
  compare('ending text', text(ENDING_TEXT), SPANS.endingText.at);
  compare('jump steps', JUMP_STEPS, SPANS.jumpTable.at);
  compare('jump frames', JUMP_FRAMES, SPANS.jumpFrames.at);
  // the maps: tile numbers differ only where the game changes them (an item taken is $F0-$F3 for $EC-$EF; room 2 rewrites its platform)
  let mapDiffs = 0, unexplained = 0;
  for (let i = 0; i < SPANS.maps.length; i++) {
    const got = m.mem[SPANS.maps.at + i], want = memory[i];
    if (got === want) continue;
    mapDiffs++;
    const item = want >= 0xec && want <= 0xef && got === want + 4;
    if (!item && Math.floor(i / 576) !== 2) unexplained++;
  }
  if (unexplained > 0) bad.push(`maps outside room 2 and the items ${unexplained}`);
  compare('attributes', memory.subarray(SPANS.maps.length), SPANS.attrs.at);
  check(`${name}.state: the original in memory has the committed data (${mapDiffs} map cells changed by play${bad.length ? '; DIFFERENT: ' + bad.join(', ') : ''})`, bad.length === 0);
  if (name === 'title') check('title.state: the maps are untouched at the credits page', mapDiffs === 0);
}
{
  const m = new Spectrum(rom);
  unpackState(m, play);
  const filler = m.mem.subarray(TRAMPOLINE.from, TRAMPOLINE.to + 1).every((v) => v === 0x5f);
  const covers = Math.floor((TRAMPOLINE.to - 0xc000) / 32) - Math.floor((TRAMPOLINE.from - 0xc000) / 32) + 1;
  check(`the nine sprite frames at $D000 (frames $80-$88, ${covers} frames) lie under the interrupt table of $5F bytes in play; the data keeps the tape's`, filler && covers === 9);
}

// ---- the glyphs are the characters it prints ------------------------------------------------------------------------

/** Run the original from a state with the character routine watched; returns the characters drawn. */
function printed(state: Uint8Array, frames: number, setup: (m: Spectrum) => void): Set<number> {
  const m = new Spectrum(rom);
  unpackState(m, state);
  setup(m);
  const seen = new Set<number>();
  m.onStep = (pc) => { if (pc === 0xa2b5 || pc === 0xa2b6) seen.add(m.cpu.regs[7]); };
  m.run(frames);
  return seen;
}
const title = new Uint8Array(fs.readFileSync(`${dir}/title.state`));
const fromCredits = printed(title, 3200, () => undefined); // the scroller goes round its whole text
const fromEnding = printed(play, 3600, (m) => { m.cpu.sp = 0x5e00; m.cpu.pc = 0x82da; }); // the ending, started the way the game does ($82DA)
const fromGameOver = printed(play, 400, (m) => { m.mem[0x810c] = 0xff; }); // lives negative: GAME OVER !!
const drawn = new Set([...fromCredits, ...fromEnding, ...fromGameOver]);
const missing = [...drawn].filter((c) => !GLYPHS.has(c));
const extra = [...GLYPHS.keys()].filter((c) => !drawn.has(c) && !(c >= 0x30 && c <= 0x39) && c !== 0x20);
check(`the character routine drew ${drawn.size} different characters through the credits scroller, the ending and game over: all have a glyph (${missing.map((c) => String.fromCharCode(c)).join('') || 'none missing'})`, missing.length === 0 && drawn.size > 40);
check(`and every glyph is drawn there, or is a numeral or the space the score prints (${extra.map((c) => String.fromCharCode(c)).join('') || 'none extra'})`, extra.length === 0);

// ---- the sprites, drawn by the game's own routine ---------------------------------------------------------------------

/**
 * Every frame, both ways round, at every shift and a few places, drawn by the original's routine `$8931` over a buffer of noise,
 * against `drawByte` / `spriteRows` over the same noise: all 16 rows of every frame and nothing else on the screen changes.
 * (Room 5 draws with OR only: checked the same way.)
 */
{
  const m = new Spectrum(rom);
  unpackState(m, play);
  const RETURN = 0x822b, DRAW = 0x8931, RECORD = 0x8121;
  const SHADOW = 0xe000; // the routine draws into a copy of the screen's bitmap 0xA000 higher; another routine ($8901) copies cells from there to the screen
  const noise = new Uint8Array(6144);
  let seed = 12345;
  for (let i = 0; i < noise.length; i++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; noise[i] = seed >>> 24; }
  m.mem.set(SPRITE_FRAMES, 0xc000); // (frames $80-$88 lie under the interrupt table in play: the routine draws from the data)
  let draws = 0, wrong = 0, pixels = 0;
  for (const room of [0, 5]) {
    m.mem[0x8107] = room;
    for (let frame = 0; frame < 192; frame++) {
      for (const facingLeft of [false, true]) {
        for (let k = 0; k < 10; k++) {
          const x = k < 8 ? 8 * (frame % 20) + k : 0xe8 + (k - 8) * 3 - (k - 8), y = (frame * 5 + k * 13) % 112;
          m.mem.set(noise, SHADOW);
          m.mem[RECORD] = x; m.mem[RECORD + 1] = y; m.mem[RECORD + 2] = frame; m.mem[RECORD + 3] = facingLeft ? 0x80 : 0;
          const cpu = m.cpu;
          cpu.ix = RECORD;
          cpu.sp = 0x5e00 - 2;
          m.mem[cpu.sp] = RETURN & 255; m.mem[cpu.sp + 1] = RETURN >> 8;
          cpu.pc = DRAW;
          cpu.halted = false; // (the state was saved at the main loop's HALT)
          for (let n = 0; n < 20000 && cpu.pc !== RETURN; n++) cpu.step();
          const want = noise.slice();
          const rows = spriteRows(frame, x, facingLeft);
          for (let r = 0; r < 16; r++) for (let c = 0; c < 3; c++) {
            const at = rowAddress(y + r) - 0x4000 + (x >> 3) + c;
            want[at] = drawByte(want[at], rows[r * 3 + c], room === 5);
          }
          draws++;
          let differ = 0;
          for (let i = 0; i < 6144; i++) if (m.mem[SHADOW + i] !== want[i]) differ++;
          pixels += differ;
          if (differ > 0) { wrong++; if (process.env.DEBUG && wrong < 12) console.log(`   room ${room} frame ${frame} left ${facingLeft} x ${x} y ${y}: ${differ} bytes`); }
        }
      }
    }
  }
  check(`sprites: ${draws} draws by the original's routine (192 frames, both facings, 8 shifts, near the right edge, in room 0 and room 5's OR-only) equal drawByte over spriteRows (${wrong} draws differ, ${pixels} bytes)`, wrong === 0 && draws === 2 * 192 * 2 * 10);
}

finish();
