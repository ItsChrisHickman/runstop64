/**
 * Every string Do Svidaniya Monty can show (room names, hints and gate messages, signs, credits) draws only glyphs the font has (Chris,
 * 2026-11-22: the lamp's hint in Siberia drew a wrong glyph for its apostrophe). The one writer of game text is
 * `games/shared/monty/lettering.ts` (the name row's `displayLine`, a sign's letters and the pause and ending font all go through it): it maps the
 * apostrophe to the charset's own (MOTR writes "MONTY'S" with '(') and anything else the font lacks to a space; the texts themselves need
 * nothing replaced but apostrophes, and a hint fits the name row.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/text.ts
 */
import { bankImage } from '../../montyotr/src/data';
import { sectorName } from '../../montyotr/src/montydata';
import { montyLettering } from '../../shared/monty/font';
import { APOSTROPHE, gameText, lacking, textCode } from '../../shared/monty/lettering';
import type { RoomSpec } from '../../shared/monty/rooms';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { check, finish } from '../../shared/test/check';
import { ANDES_ROOMS } from '../src/andes';
import { CHINA_ROOMS } from '../src/china';
import { WORLD } from '../src/data';
import { CLOSING, PLACES } from '../src/ending-places';
import { JAPAN_ROOMS } from '../src/japan';
import { MOSCOW_ROOMS } from '../src/moscow';
import { PACIFIC_ROOMS } from '../src/pacific';
import { RIO_ROOMS } from '../src/rio';
import { SIBERIA_ROOMS } from '../src/siberia';
import { newGame } from './bot';
import { roomsOf } from './climb-kit';

// ---- the writer ---------------------------------------------------------------------------------------
check(`the apostrophe is the charset's own ('${APOSTROPHE}'): "MINE'S" is written "MINE${APOSTROPHE}S"`, gameText("MINE'S") === `MINE${APOSTROPHE}S` && gameText('MINE’S') === `MINE${APOSTROPHE}S`);
check('what the font lacks is written as a space (a tilde, an accent mark alone), accents as their letter, lower case as capitals', gameText('A~B') === 'A B' && gameText('São') === 'SAO' && gameText('Rio') === 'RIO');
check('an apostrophe is not a text to fix, an ampersand is', lacking("MONTY'S").length === 0 && lacking('A&B').length === 1);

// ---- every string ---------------------------------------------------------------------------------------
const REGIONS: readonly RoomSpec[] = [...MOSCOW_ROOMS, ...SIBERIA_ROOMS, ...CHINA_ROOMS, ...JAPAN_ROOMS, ...PACIFIC_ROOMS, ...ANDES_ROOMS, ...RIO_ROOMS];
/** [what it is, its text, whether it is drawn in the game's charset (the name row, signs) or the pause and ending font (credits)]. */
const strings: { what: string; text: string; font: 'charset' | 'pause' }[] = [];
for (const room of roomsOf(WORLD)) strings.push({ what: `room ${room}'s name`, text: sectorName(WORLD, room).text, font: 'charset' });
for (const h of WORLD.hints.take) strings.push({ what: `the hint on taking item ${h.item}`, text: h.text, font: 'charset' });
for (const h of WORLD.hints.wanted) strings.push({ what: `the hint in room ${h.room}`, text: h.text, font: 'charset' });
for (const r of REGIONS) for (const d of r.decor ?? []) if (typeof d.type === 'object') strings.push({ what: `the sign in room ${r.id}`, text: d.type.text, font: 'charset' });
for (const p of PLACES) for (const c of p.credits) strings.push({ what: `a credit over room ${p.room}`, text: c, font: 'pause' });
for (const c of CLOSING) strings.push({ what: 'a closing credit', text: c, font: 'pause' });
check(`${strings.length} strings: the names, hints, signs and credits of every region`, strings.length > 150);

const solid = (code: number) => { const g = bankImage.subarray(code * 8, code * 8 + 8); return !g.some((b) => b) || g.every((b) => b === 0xff); };
const pause = montyLettering(bankImage);
let needed = 0, blank = 0, missing = 0;
const bad: string[] = [];
for (const { what, text, font } of strings) {
  const lack = lacking(text);
  if (lack.length) { needed++; bad.push(`${what}: "${text}" has ${lack.join(' ')}`); }
  for (const ch of gameText(text)) {
    if (ch === ' ') continue;
    if (font === 'charset' && solid(textCode(ch))) { blank++; bad.push(`${what}: "${text}": ${ch} is blank in the charset`); }
    if (font === 'pause' && !pause.glyph(ch)) { missing++; bad.push(`${what}: "${text}": the pause font has no ${ch}`); }
  }
}
for (const b of bad) console.log(b);
check('no text needs a character replaced but the apostrophe', needed === 0);
check('every letter a name, hint or sign draws is a glyph of the charset', blank === 0);
check('every letter a credit draws is a glyph of the pause and ending font', missing === 0);
check('the apostrophe is a glyph of both', !solid(textCode("'")) && pause.glyph("'") !== undefined);
check('a hint fits the name row (32 characters)', strings.filter((s) => s.what.includes('hint')).every((s) => s.text.length <= 32));

// ---- through the game: a hint with an apostrophe, as the name row shows it -----------------------------
{
  const text = "LAMP: THE MINE'S LEDGES";
  const s = newGame({ ...WORLD, hints: { take: [{ item: 0, text }], wanted: [] } }, true);
  s.g.assist = { ...s.g.assist, hints: true };
  s.g.noteTaken(0);
  const row = Array.from({ length: text.length }, (_, i) => s.g.mem[SCREEN + 24 * ROW + 4 + i] ?? 0);
  const at = text.indexOf("'");
  check(`the name row shows the apostrophe as the charset's ($68), not $67, in the word as it is ("${text}")`, row[at] === textCode("'") && row[at] === 0x68 && row[at + 1] === (0x13 | 0x80));
}
finish();
