/**
 * The committed data (src/data/*.ts, made by re/extract.ts and re/rooms.ts) proved against the original:
 *  - it is the tape's: the sprites, Monty's frames, the title picture, the font, the jump arc, the coal values, the tunes and the
 *    texts are the bytes of the tape's game block (the texts re-encoded into the game's glyph codes), the row table is the formula;
 *  - it is what the original has in memory while it runs (the options menu, the opening scene, room 0), except where play changes
 *    it (the coal flags, the code's own variables);
 *  - the title picture is the screen at the title; the options menu, the score and the lives, drawn from the font and the texts,
 *    are the screen the original draws;
 *  - the font is what the game's character routines draw (`$80D1`, the verse printer `$CB35`), glyph by glyph, and the texts are
 *    what they are given when the game prints a menu, the score, the lives, the game-over verse and the ending verse;
 *  - every sprite frame, and every frame of Monty, drawn by the game's own blitter (`$EBE0`) over noise at the eight shifts and
 *    at a few places is `blit` of src/sprite.ts, and `$8452` is `restoreRows`;
 *  - the beeper: the model of the ROM's BEEPER (src/beeper.ts) gives the speaker's flips the model records for every note of both
 *    tunes, the three effects and every pitch of the footstep, and the title tune plays the notes of the table in order.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/data.ts [tape] [rom] [build-dir]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';
import { beeperToggles } from '../src/beeper';
import {
  COAL_FLAGS, DEATH_SPRITE, DEATH_TUNE, ENDING_VERSE, FONT, GAME_OVER_VERSE, JUMP_ARC, LIVES_LINE, MENU_LINES, MONTY_FRAMES, MONTY_BASE, PICKUP, SCORE_LINE, SPRITE_BASE, SPRITE_BYTES,
  SPRITE_COUNT, SPRITE_FRAMES, STEP_CYCLES, STEP_PITCH_START, THUD, TITLE_PICTURE, TITLE_TUNE, screenOffset,
} from '../src/data';
import { drawLine, glyphRows, GLYPH_ROWS } from '../src/font';
import { codeOf, DIGIT_BASE, GLYPH_COUNT } from '../src/letters';
import { bitmapRow } from '../src/room';
import { blit, restoreRows } from '../src/sprite';
import {
  bytesOf, ENDING_AT, GAME_OVER_AT, imageFromTape, LIVES_SPOT, MENU, recordBeeper, SCORE_SPOT, SPANS, textRecord, verse,
} from '../re/original';

const [tapeFile = 'games/montymole/build/montymole.tap', romFile = 'games/montymole/build/48.rom', dir = 'games/montymole/build'] = process.argv.slice(2);
const image = imageFromTape(new Uint8Array(fs.readFileSync(tapeFile)));
const rom = readRom(romFile);

const same = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.from(a).every((v, i) => v === b[i]);
const hexOf = (n: number) => `$${n.toString(16).toUpperCase()}`;
const load = (name: string): Spectrum => {
  const m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync(`${dir}/${name}.state`)));
  return m;
};
const encode = (text: string): number[] => Array.from(text, codeOf);

// ---- the committed data is the tape's -----------------------------------------------------------------------------

const blocks: [string, ArrayLike<number>, Uint8Array][] = [
  ['sprite frames (256 x 32)', SPRITE_FRAMES, bytesOf(image, SPANS.sprites)],
  ['Monty\'s 16 frames', MONTY_FRAMES, bytesOf(image, SPANS.monty)],
  ['the death picture', DEATH_SPRITE, bytesOf(image, SPANS.deathSprite)],
  ['title picture (bitmap and attributes)', TITLE_PICTURE, bytesOf(image, SPANS.title)],
  ['font (38 glyphs)', FONT, bytesOf(image, SPANS.font)],
  ['jump arc', JUMP_ARC.map((v) => v & 255), bytesOf(image, SPANS.jumpArc)],
  ['coal flags', COAL_FLAGS, bytesOf(image, SPANS.coal)],
  ['title tune', TITLE_TUNE.flatMap((n) => [n.de & 255, n.de >> 8, n.hl & 255, n.hl >> 8]), bytesOf(image, SPANS.titleTune)],
  ['death tune', DEATH_TUNE.flatMap((n) => [n.de & 255, n.de >> 8, n.hl & 255, n.hl >> 8]), bytesOf(image, SPANS.deathTune)],
];
for (const [name, got, want] of blocks) check(`${name}: committed data equals the tape's (${want.length} bytes)`, same(got, want));
check('there are 256 sprite frames of 32 bytes, 38 glyphs, 32 jump steps and 64 coal flags', SPRITE_COUNT * SPRITE_BYTES === SPRITE_FRAMES.length && FONT.length === GLYPH_COUNT * GLYPH_ROWS && JUMP_ARC.length === 32 && COAL_FLAGS.length === 64);
check('the title tune is 273 records (56 of them rests) up to the first whose second byte is $FF; the death tune is 24 notes and then a 0',
  TITLE_TUNE.length === 273 && TITLE_TUNE.filter((n) => n.hl === 0).length === 56 && image[0xd5b9 + 273 * 4 + 1] === 0xff && TITLE_TUNE.every((n) => n.de >> 8 !== 0xff) && DEATH_TUNE.length === 24 && image[0x5cdd] === 0);

const word = (at: number) => (image[at] ?? 0) | ((image[at + 1] ?? 0) << 8);
{
  let ok = true;
  for (let y = 0; y < 192; y++) if (screenOffset(y) !== word(SPANS.rowTable.at + 2 * y) - 0x4000) ok = false;
  check('the row table ($EA60, 192 words) is the Spectrum\'s screen layout: each word is $4000 + the offset of pixel row 191 - y', ok);
}
check('the jump arc: 17 pixels up and 17 down in its 32 steps (the rise is 17 pixels)', JUMP_ARC.filter((v) => v > 0).reduce((a, v) => a + v, 0) === 17 && JUMP_ARC.filter((v) => v < 0).reduce((a, v) => a + v, 0) === -17);
check('the effects: the thud ($8E22), the pick-up beeps (the three sites the same) and the footstep ($8496, DE 1) read from the code',
  THUD.de === word(0x8e23) && THUD.hl === word(0x8e26) && PICKUP.de === word(0x9569) && PICKUP.hl === word(0x956c)
  && word(0x92ef) === PICKUP.de && word(0x92f2) === PICKUP.hl && word(0x93d0) === PICKUP.de && word(0x93d3) === PICKUP.hl
  && STEP_PITCH_START === word(0x8496) && STEP_CYCLES === word(0x8b04) && image[0x8b03] === 0x11);

// ---- the texts re-encoded are the tape's ----------------------------------------------------------------------------

{
  const lines = MENU.map((s) => textRecord(image, s));
  check('the options menu: five lines, each in its place and colour, the text re-encoded is the tape\'s',
    lines.length === MENU_LINES.length && lines.every((r, i) => {
      const l = MENU_LINES[i];
      return l !== undefined && l.column === r.column && l.pixelRow === r.pixelRow && l.colour === r.colour && l.attrRow === r.attrRow && same(encode(l.text), r.codes);
    }));
  const score = textRecord(image, SCORE_SPOT), lives = textRecord(image, LIVES_SPOT);
  check('SCORE: and LIVES: (the digits are patched in: score digit + $1B, lives + $1B with bit 7)',
    same(encode(SCORE_LINE.text), score.codes.slice(0, 7)) && score.length === 12 && SCORE_LINE.column === score.column && SCORE_LINE.pixelRow === score.pixelRow
    && same(score.codes.slice(7), [DIGIT_BASE, DIGIT_BASE, DIGIT_BASE, DIGIT_BASE, DIGIT_BASE])
    && same(encode(LIVES_LINE.text), lives.codes.slice(0, 7)) && lives.length === 8 && LIVES_LINE.column === lives.column && LIVES_LINE.pixelRow === lives.pixelRow);
  const encoded = (v: readonly string[]) => v.map(encode);
  check('the game-over verse (7 lines) and the ending verse (37 lines) re-encoded are the tape\'s',
    JSON.stringify(encoded(GAME_OVER_VERSE)) === JSON.stringify(verse(image, GAME_OVER_AT)) && JSON.stringify(encoded(ENDING_VERSE)) === JSON.stringify(verse(image, ENDING_AT)));
}

// ---- and is what the original has in memory ----------------------------------------------------------------------------

for (const name of ['loading', 'title', 'play', 'room0']) {
  const m = load(name);
  const bad: string[] = [];
  const compare = (what: string, want: ArrayLike<number>, at: number) => {
    let n = 0;
    for (let i = 0; i < want.length; i++) if (m.mem[at + i] !== want[i]) n++;
    if (n > 0) bad.push(`${what} ${n}`);
  };
  compare('sprites', SPRITE_FRAMES, SPRITE_BASE);
  compare('Monty\'s frames', MONTY_FRAMES, MONTY_BASE);
  compare('font', FONT, SPANS.font.at);
  compare('jump arc', JUMP_ARC.map((v) => v & 255), SPANS.jumpArc.at);
  compare('death picture', DEATH_SPRITE, SPANS.deathSprite.at);
  if (name === 'loading') compare('title tune', bytesOf(image, SPANS.titleTune), SPANS.titleTune.at); // (the picture buffer lies over it once the menu is up)
  compare('death tune', bytesOf(image, SPANS.deathTune), SPANS.deathTune.at);
  compare('row table', bytesOf(image, SPANS.rowTable), SPANS.rowTable.at);
  check(`${name}.state: the original in memory has the committed sprites, Monty's frames, font, jump arc, tunes and row table${bad.length ? '; DIFFERENT: ' + bad.join(', ') : ''}`, bad.length === 0);
}
{
  // coal: bit 7 is set by the opening scene (room0.state is after it); the low 7 bits are the tape's, everything else is play's
  const m = load('room0');
  const flags = Array.from({ length: 64 }, (_, i) => m.mem[SPANS.coal.at + i] ?? 0);
  check('the coal values: in play (room 0 after the opening) every flag has bit 7 set and the low 7 bits of the tape\'s', flags.every((f, i) => (f & 0x7f) === ((COAL_FLAGS[i] ?? 0) & 0x7f) && (f & 0x80) !== 0));
  const t = load('title');
  check('the title picture is the screen at the title (loading.state: bitmap and attributes)', (() => {
    const l = new Spectrum(rom);
    unpackState(l, new Uint8Array(fs.readFileSync(`${dir}/loading.state`)));
    return same(l.mem.subarray(0x4000, 0x4000 + 6912), TITLE_PICTURE) && t.mem[0x4000] === 0;
  })());
}

// ---- the font is what the character routines draw ------------------------------------------------------------------------

/** Run a routine of the original to its return, with `setup` first; the machine is at the game in play. */
function runRoutine(m: Spectrum, address: number, setup: () => void, onStep?: (pc: number) => void): void {
  const RETURN = 0xff5b; // the main loop's HALT
  const cpu = m.cpu;
  cpu.sp = (cpu.sp - 2) & 0xffff;
  m.mem[cpu.sp] = RETURN & 255;
  m.mem[cpu.sp + 1] = RETURN >> 8;
  setup();
  cpu.pc = address;
  cpu.halted = false;
  cpu.iff1 = false;
  cpu.iff2 = false;
  for (let n = 0; n < 200000 && cpu.pc !== RETURN; n++) { onStep?.(cpu.pc); cpu.step(); }
  if (cpu.pc !== RETURN) throw new Error(`the routine at ${hexOf(address)} did not return`);
}
{
  let badMenu = 0, badVerse = 0;
  for (let code = 0; code < GLYPH_COUNT; code++) {
    const want = glyphRows(code);
    // `$80D1`: A = the glyph, HL = the screen byte of its first row: five rows down the cell, then three from two rows into the cell below
    const m = load('play');
    m.mem.fill(0, 0x4000, 0x5800);
    runRoutine(m, 0x80d1, () => { m.cpu.regs[7] = code; m.cpu.hl = 0x4360; m.cpu.ix = 0x8122; }); // (line 3 of the first cell row, as the menu's rows are)
    const rows = [0, 1, 2, 3, 4].map((r) => m.mem[0x4360 + r * 256] ?? 0).concat([0, 1, 2].map((r) => m.mem[0x4080 + r * 256] ?? 0));
    if (!same(rows, want)) badMenu++;
    // `$CB35` (the verse printer): A = the glyph; eight rows down from $50C0 + the column in $CB91
    const v = load('play');
    v.mem[0xcb91] = 3;
    v.mem.fill(0, 0x4000, 0x5800);
    runRoutine(v, 0xcb35, () => { v.cpu.regs[7] = code; v.cpu.ix = 0xf04b; });
    const got = Array.from({ length: 8 }, (_, r) => v.mem[0x50c3 + r * 256] ?? 0);
    if (!same(got, want)) badVerse++;
  }
  check(`the font: all ${GLYPH_COUNT} glyphs are what the game's character routine $80D1 draws (5 rows, then 3 in the cell below: ${badMenu} differ)`, badMenu === 0);
  check(`and what the verse printer $CB35 draws, 8 rows in a column (${badVerse} differ)`, badVerse === 0);
}

// ---- the texts are what the game prints --------------------------------------------------------------------------------

/** The glyph codes a routine of the original draws while the machine runs `frames` frames (the routine's entry watched, A = the glyph). */
function drawn(m: Spectrum, entry: number, frames: number): number[] {
  const seen: number[] = [];
  m.onStep = (pc) => { if (pc === entry) seen.push(m.cpu.regs[7] ?? 0); };
  m.run(frames);
  m.onStep = null;
  return seen;
}
{
  // the options menu, drawn by $8092 (called as $F7D6 does) from a state in play
  const m = load('play');
  m.cpu.iff1 = true;
  const codes: number[] = [];
  runRoutine(m, 0x8092, () => undefined, (pc) => { if (pc === 0x80d1) codes.push(m.cpu.regs[7] ?? 0); });
  const want = MENU_LINES.flatMap((l) => encode(l.text));
  check(`the options menu: the game draws the glyphs of the five lines in order (${codes.length} glyphs)`, same(codes, want));
  // and the whole screen of the menu equals one drawn from the font and the lines ($8000 draws it; title.state is the menu waiting)
  const menu = load('title');
  const bitmap = new Uint8Array(6144), attrs = new Uint8Array(768);
  const screen = { bitmap, attrs };
  for (const l of MENU_LINES) drawLine(screen, l);
  // the selection line flashes (the game redraws it with its flash attribute): compare the bitmaps, and the attributes where it does not
  let bad = 0;
  for (let i = 0; i < 6144; i++) if (menu.mem[0x4000 + i] !== bitmap[i]) bad++;
  let badAttr = 0;
  for (let i = 0; i < 768; i++) if (menu.mem[0x5800 + i] !== attrs[i]) badAttr++;
  check(`the options menu: the bitmap of the menu waiting (title.state) is the lines drawn from the font (${bad} bytes differ; ${badAttr} attribute bytes differ)`, bad === 0 && badAttr <= 12 * 2);
}
{
  // the score line (rows 0 and 1) and the lives line (22 and 23) in the opening scene: the screen's top and bottom
  const m = load('play');
  const bitmap = new Uint8Array(6144), attrs = new Uint8Array(768);
  const screen = { bitmap, attrs };
  drawLine(screen, SCORE_LINE, SCORE_LINE.text + '00000');
  drawLine(screen, LIVES_LINE, LIVES_LINE.text + '3');
  let bad = 0;
  for (let y = 0; y < 16; y++) for (let c = 0; c < 32; c++) if (m.mem[0x4000 + bitmapRow(y) + c] !== bitmap[bitmapRow(y) + c]) bad++;
  for (let y = 176; y < 192; y++) for (let c = 0; c < 32; c++) if (m.mem[0x4000 + bitmapRow(y) + c] !== bitmap[bitmapRow(y) + c]) bad++;
  let badAttr = 0;
  for (const i of [...Array.from({ length: 64 }, (_, k) => k), ...Array.from({ length: 64 }, (_, k) => 22 * 32 + k)]) if (m.mem[0x5800 + i] !== attrs[i]) badAttr++;
  check(`the score and lives lines drawn from the font and the lines are the top and bottom of the original's screen in play (${bad} bitmap bytes differ, ${badAttr} attribute bytes)`, bad === 0 && badAttr === 0);
}
{
  // game over: lives 1 and a death ($946E); the verse is printed by $CB03 through $CB35, glyph by glyph
  const over = load('play');
  over.cpu.pc = 0xf817; // (game over: $947C jumps here when the last life is gone)
  over.cpu.halted = false;
  over.cpu.iff1 = true;
  const got = drawn(over, 0xcb35, 900);
  const want = GAME_OVER_VERSE.flatMap((l) => encode(l));
  check(`game over: the verse printer draws the ${want.length} glyphs of the game-over verse in order (${got.length} drawn)`, got.length >= want.length && same(got.slice(0, want.length), want));
  const end = load('play');
  end.cpu.pc = 0xf858;
  end.cpu.halted = false;
  end.cpu.iff1 = true;
  const gotEnd = drawn(end, 0xcb35, 3000);
  const wantEnd = ENDING_VERSE.flatMap((l) => encode(l));
  check(`the ending: the verse printer draws the ${wantEnd.length} glyphs of the ending verse in order (${gotEnd.length} drawn)`, gotEnd.length >= wantEnd.length && same(gotEnd.slice(0, wantEnd.length), wantEnd));
}

// ---- the blitter -------------------------------------------------------------------------------------------------------------

/**
 * Every frame (the 256 sprites and Monty's 16) drawn by the original's `$EBE0` over noise (the picture buffer and the screen both) at the eight shifts and a few
 * places, against `blit`: the whole 6144-byte screen after each draw must be equal. `$8452` is `restoreRows`.
 */
{
  const m = load('play');
  const BLIT = 0xebe0, X = 0xecde, Y = 0xecdf, IMAGE = 0xece0, PICTURE = 0xd260;
  const noise = new Uint8Array(6144);
  let seed = 12345;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed >>> 24; };
  for (let i = 0; i < noise.length; i++) noise[i] = rnd();
  const picture = new Uint8Array(6144);
  for (let i = 0; i < picture.length; i++) picture[i] = rnd();
  const frames: number[] = [];
  for (let i = 0; i < SPRITE_COUNT; i++) frames.push(SPRITE_BASE + i * SPRITE_BYTES);
  for (let i = 0; i < 16; i++) frames.push(MONTY_BASE + i * SPRITE_BYTES);
  let draws = 0, wrong = 0;
  m.mem.set(picture, PICTURE);
  for (const address of frames) {
    for (let k = 0; k < 8; k++) {
      const x = 8 * ((address >> 5) % 28 + 1) + k, y = 16 + ((address >> 5) * 7 + k * 13) % 170;
      m.mem.set(noise, 0x4000);
      m.mem[X] = x; m.mem[Y] = y; m.mem[IMAGE] = address & 255; m.mem[IMAGE + 1] = address >> 8;
      runRoutine(m, BLIT, () => undefined);
      const want = noise.slice();
      const img = address >= SPRITE_BASE && address < SPRITE_BASE + 0x2000 ? SPRITE_FRAMES.subarray(address - SPRITE_BASE, address - SPRITE_BASE + SPRITE_BYTES) : MONTY_FRAMES.subarray(address - MONTY_BASE, address - MONTY_BASE + SPRITE_BYTES);
      blit(want, picture, img, x, y);
      draws++;
      let differ = 0;
      for (let i = 0; i < 6144; i++) if (m.mem[0x4000 + i] !== want[i]) differ++;
      if (differ > 0) { wrong++; if (process.env.DEBUG && wrong < 10) console.log(`   frame ${hexOf(address)} x ${x} y ${y}: ${differ} bytes`); }
    }
  }
  check(`sprites: ${draws} draws by the original's blitter (256 frames and Monty's 16, the eight shifts) equal blit over spriteRows (${wrong} differ)`, wrong === 0 && draws === 272 * 8);
  // the edges: x 0 and 1, 248-255, y 15 and 191, one frame
  let edgeWrong = 0, edges = 0;
  for (const x of [0, 1, 2, 7, 8, 240, 241, 246, 247, 248, 255]) {
    for (const y of [15, 16, 100, 190, 191]) {
      m.mem.set(noise, 0x4000);
      m.mem[X] = x; m.mem[Y] = y; m.mem[IMAGE] = MONTY_BASE & 255; m.mem[IMAGE + 1] = MONTY_BASE >> 8;
      runRoutine(m, BLIT, () => undefined);
      const want = noise.slice();
      blit(want, picture, MONTY_FRAMES.subarray(0, SPRITE_BYTES), x, y);
      edges++;
      if (!same(m.mem.subarray(0x4000, 0x5800), want)) edgeWrong++;
    }
  }
  check(`sprites: ${edges} draws at the screen's edges (x 0, 1, 247, 248, 255; y 15, 191) equal blit (${edgeWrong} differ)`, edgeWrong === 0);
  // $8452: two rows put back
  let restoreWrong = 0, restores = 0;
  for (let k = 0; k < 40; k++) {
    const x = (k * 37) & 255, y = 2 + ((k * 29) % 189);
    m.mem.set(noise, 0x4000);
    m.mem[0x5c7b] = x; // $8452 takes the column from Monty's x
    runRoutine(m, 0x8452, () => { m.cpu.regs[7] = y; });
    const want = noise.slice();
    restoreRows(want, picture, x, y);
    restores++;
    if (!same(m.mem.subarray(0x4000, 0x5800), want)) restoreWrong++;
  }
  check(`$8452 puts the picture's bytes back on two pixel rows, three bytes from column x >> 3: ${restores} cases equal restoreRows (${restoreWrong} differ)`, restoreWrong === 0);
}

// ---- the beeper ---------------------------------------------------------------------------------------------------------------

{
  const state = new Uint8Array(fs.readFileSync(`${dir}/play.state`));
  let wrong = 0, total = 0;
  const equal = (de: number, hl: number): boolean => {
    const r = recordBeeper(rom, state, de, hl), m = beeperToggles(de, hl);
    return r.lead === m.lead && r.tail === m.tail && same(r.gaps, m.gaps);
  };
  const seenTune = new Set<string>();
  for (const [name, tune] of [['title', TITLE_TUNE], ['death', DEATH_TUNE]] as const) {
    let bad = 0;
    for (const note of tune) {
      if (note.hl === 0) continue; // a rest: a wait of E frames, no BEEPER
      const key = `${note.de},${note.hl}`;
      if (seenTune.has(key)) continue;
      seenTune.add(key);
      total++;
      if (!equal(note.de, note.hl)) { bad++; wrong++; }
    }
    check(`BEEPER model: every distinct note of the ${name} tune gives the model's speaker log (${bad} differ)`, bad === 0);
  }
  let steps = 0, badSteps = 0;
  for (let pitch = 0; pitch < 256; pitch++) { steps++; if (!equal(STEP_CYCLES, pitch)) badSteps++; }
  check(`BEEPER model: the footstep at every pitch the jump gives it, 0-255 (${badSteps} of ${steps} differ)`, badSteps === 0);
  check('BEEPER model: the thud and the pick-up beep', equal(THUD.de, THUD.hl) && equal(PICKUP.de, PICKUP.hl));
  check(`BEEPER model: ${total} distinct notes in all, ${wrong} wrong`, wrong === 0);
}
{
  // the title tune plays the notes of the table in order (every BEEPER call and rest the game makes, from the title)
  const m = load('loading');
  const calls: Array<{ de: number; hl: number }> = [];
  m.onStep = (pc) => { if (pc === 0x03b5) calls.push({ de: m.cpu.de, hl: m.cpu.hl }); };
  m.run(1500);
  m.onStep = null;
  const sounding = TITLE_TUNE.filter((n) => n.hl !== 0);
  // (the state was saved part way through the tune: the calls are some run of the table's notes, starting at whichever note matches)
  const starts = sounding.map((_, i) => i).filter((from) => calls.every((c, i) => { const n = sounding[from + i]; return n !== undefined && c.de === n.de && c.hl === n.hl; }));
  check(`the title tune: the game calls BEEPER with the table's notes in order (${calls.length} calls in 1500 frames, from note ${starts[0] ?? 'none'}; the rests are waits)`, calls.length > 20 && starts.length > 0);
}

finish();
