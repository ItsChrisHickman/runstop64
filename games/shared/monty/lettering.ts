/**
 * The one writer of text in the Monty games' own lettering (hints, room names, signs, credits): what a string becomes before it
 * is drawn, and the screen code of each character. Monty on the Run's charset has capitals, digits and a few marks, at the screen
 * codes `(ascii & 0x3f) | 0x40`; its apostrophe is where an open bracket would be ('(' is the glyph MOTR writes "MONTY'S" with),
 * and it has no ' ' glyph of its own to draw (space is $60, empty). Anything else the font lacks (the apostrophe's other forms, a
 * quote, an accent) is mapped to a character it has, so no string ever draws a wrong glyph.
 */

/** What the charset draws, as text: the capitals, digits, space and these marks ('(' is the apostrophe). */
export const LETTERING = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !()*+,-./:;<=>?";

/** The apostrophe as the font has it. */
export const APOSTROPHE = '(';

const ALIKE: Readonly<Record<string, string>> = {
  "'": APOSTROPHE, '’': APOSTROPHE, '‘': APOSTROPHE, '`': APOSTROPHE, '´': APOSTROPHE, '"': APOSTROPHE, '“': APOSTROPHE, '”': APOSTROPHE,
  '&': '+', '_': '-', '–': '-', '—': '-', '×': '*', '…': '.', '[': '(', ']': ')', '{': '(', '}': ')', '|': '/', '\\': '/',
};

/** One character as the font has it (a space when nothing alike does). */
function glyphOf(ch: string): string {
  const upper = ch.toUpperCase();
  if (LETTERING.includes(upper)) return upper;
  const alike = ALIKE[ch];
  if (alike !== undefined) return alike;
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return base.length === 1 && LETTERING.includes(base) ? base : ' ';
}

/** A string as the font draws it: capitals, the apostrophe as the font has it, what it lacks as something it has. */
export function gameText(text: string): string {
  return [...text].map(glyphOf).join('');
}

/** The characters of a string the font lacks and `gameText` had to replace (a typo to fix in the text; apostrophes are not among them). */
export function lacking(text: string): string[] {
  return [...text].filter((ch) => glyphOf(ch) !== ch.toUpperCase() && ALIKE[ch] !== APOSTROPHE);
}

/** The screen code of a character in the charset's capitals row ($40-$7F); space is the empty $60. */
export function textCode(ch: string): number {
  return (glyphOf(ch).charCodeAt(0) & 0x3f) | 0x40;
}

/**
 * A room name or hint as the name row shows it: the first letter of each word in the capitals, the rest in the small letters (Monty on
 * the Run's), except that after an apostrophe the letter stays small ("Emperor's") and a word "a" on its own is small unless it starts the name
 * ("Whale of a Time"). The screen codes, left to right.
 */
export function nameCodes(text: string): number[] {
  const raw = [...text];
  const t = gameText(text);
  const out: number[] = [];
  let start = true;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i) & 0x3f;
    const alone = t[i] === 'A' && i > 0 && t[i - 1] === ' ' && (i + 1 >= t.length || t[i + 1] === ' ');
    // (a written apostrophe keeps the word going; Monty on the Run's own '(' in its names ends it, as it always drew)
    const written = ALIKE[raw[i] ?? ''] === APOSTROPHE;
    if (c >= 0x1a && !written) start = true;
    out.push(!alone && (start || c >= 0x1a) ? c | 0x40 : c | 0x80);
    if (c < 0x1a) start = false;
  }
  return out;
}
