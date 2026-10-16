import type { Game } from './game';
import { clearPanelRows, clearPlayfield, rowAt } from './rooms';
import { resetMove } from './sprites';
import { V } from './vars';

/**
 * The title sequence ($8071): the arch, Tal finding the armour and flying off in
 * it, and the credits page, in turn with the title tunes, until fire is
 * pressed. Each `yield` is a frame.
 */
type Gen = Generator<void, boolean | void, void>;

const TITLE_PICTURE = 0xf52e; // 19 rows of 26 characters
const TEXTS = 0xc529;
const PUNCTUATION = 0xc5cb, PUNCTUATION_CHARS = 0xc5d3;

/** $8417: fire pressed ($7F)? */
export function fire(g: Game) {
  g.ram[V.fire] = (g.r(0xdc00) ^ 0x10) & 0x10;
  return !!g.ram[V.fire];
}

/** Wait until a timer runs out (counted down by the interrupts); true if fire cut it short. */
function* waitTimer(g: Game, at: number, frames: number, firable = true): Generator<void, boolean, void> {
  g.ram[at] = frames;
  while (g.ram[at]) { if (firable && fire(g)) return true; yield; }
  return false;
}

/** Wait until a sprite's movement script is done; true if fire cut it short. */
function* waitMove(g: Game, x: number, firable = true): Generator<void, boolean, void> {
  for (;;) {
    if (firable && fire(g)) return true;
    if (!(g.ram[V.move + x] & 0x7f)) return false;
    yield;
  }
}

/** $8D30: clear the screen (playfield and panel). */
export function clearScreen(g: Game) { clearPanelRows(g); clearPlayfield(g); }

/** $83FD: sprites 4 and 5 (the hero) start movement script `n`. */
function heroMove(g: Game, n: number) {
  const { ram } = g;
  ram[V.move + 4] = n; ram[V.move + 5] = n;
  for (const x of [4, 5]) { resetMove(g, x); ram[V.animDelay + x] = 0; ram[V.animPos + x] = 2; }
}

const heroAnim = (g: Game, a: number) => { g.ram[V.anim + 4] = a; g.ram[V.anim + 5] = a + 1; };

/** $8071: the title sequence, until fire. */
export function* titleSequence(g: Game, text: number[]): Generator<void, void, void> {
  const { ram } = g;
  ram[V.titleMode] = 0x80;
  clearScreen(g);
  titleSetUp(g);
  for (;;) {
    tune(g, 0x5d01, 0x80);
    if ((yield* arch(g)) || ram[V.fire]) break;
    while (!fire(g) && ram[V.playing] & 0x80) yield;
    if (ram[V.fire]) break;
    tune(g, 0x4359, 0x83);
    if ((yield* credits(g, text)) || ram[V.fire]) break;
    while (!fire(g) && ram[V.playing] & 0x80) yield;
    if (ram[V.fire]) break;
    tune(g, 0x411a, 0x86);
    if ((yield* arch(g)) || ram[V.fire]) break;
    if ((yield* credits(g, text)) || ram[V.fire]) break;
    while (!fire(g) && ram[V.playing + 1] & 0x80) yield;
    if (ram[V.fire]) break;
  }
  // the music fades out
  do {
    ram[V.frameCount] = 4;
    while (ram[V.frameCount]) yield;
  } while (--ram[0x0247]);
  g.soundInit();
  clearScreen(g);
  g.w(0xdc04, 0x10); g.w(0xdc05, 0x27); g.w(0xdc06, 0x61); g.w(0xdc07, 0x51);
  g.w(0xdc0d, 0x83); g.w(0xdc0f, 0x81);
  ram[V.d016Panel] = 0; ram[V.d016Play] = 0; ram[V.titleMode] = 0;
  g.w(0xd018, 0x0c);
  g.w(0xd016, g.r(0xd016) & 0xef);
}

/** $8109, $8125, $8141: a title tune (its tempo, CIA 1 timer B, and its three voices' sounds). */
function tune(g: Game, tempo: number, first: number) {
  g.w(0xdc06, tempo & 0xff); g.w(0xdc07, tempo >> 8);
  g.ram[V.request] = first; g.ram[V.request + 1] = first + 1; g.ram[V.request + 2] = first + 2;
}

/** $847A: the title's character set (from under the I/O area), the timers and the raster interrupt. */
function titleSetUp(g: Game) {
  const { ram } = g;
  ram.copyWithin(0x7800, 0xd000, 0xd800);
  g.w(0xdc04, 0x10); g.w(0xdc05, 0x27); g.w(0xdc06, 0x61); g.w(0xdc07, 0x51);
  g.w(0xdc0d, 0x83); g.w(0xdc0f, 0x81);
  g.w(0xd011, 0x1b); g.w(0xd012, 0xfa); g.w(0xd01a, 7); g.w(0xd019, 7);
  g.interrupts = true;
}

/** $8421: the arch picture. */
function drawArch(g: Game) {
  const { ram } = g;
  clearScreen(g);
  for (let r = 0; r < 19; r++) {
    for (let c = 0; c < 26; c++) {
      const code = ram[TITLE_PICTURE + r * 26 + c], at = 0x407f + r * 40 + c;
      ram[at] = code;
      g.m.colour[at - 0x4000] = code >= 0xee ? 2 : 0x0b;
    }
  }
}

/** $815D: Tal finds the armour under the arch and flies off in it. True if fire was pressed. */
function* arch(g: Game): Generator<void, boolean, void> {
  const { ram } = g;
  ram[V.d016Play] = ram[V.d016Panel] = 0x10;
  g.w(0xd016, g.r(0xd016) | 0x10);
  ram[V.mc1Play] = 0x0b; ram[V.mc2Play] = 0x0e; ram[V.d018Play] = 0x0e;
  drawArch(g);
  ram[0x0208] = ram[0x0206] = ram[0x020a] = ram[V.spriteXHigh] = 0;
  ram[0x0207] = 0x8a;
  ram[0x020c] = ram[0x020e] = 0xac;
  ram[0x0209] = ram[0x020d] = 0xb0;
  ram[0x020b] = ram[0x020f] = 0xc5;
  g.w(0xd025, 8); g.w(0xd026, 9);
  ram[V.anim + 6] = 0xc0; ram[V.anim + 7] = 0xc1; ram[V.anim + 3] = 0xc8;
  ram[V.move + 3] = 0xaa;
  resetMove(g, 3);
  ram[V.move + 6] = ram[V.move + 7] = 0;
  ram[V.animDelay + 3] = ram[V.animDelay + 6] = ram[V.animDelay + 7] = 0;
  ram[V.animPos + 3] = ram[V.animPos + 6] = ram[V.animPos + 7] = 2;
  if (yield* waitMove(g, 3)) return true;
  if (yield* waitTimer(g, V.timer68, 0x64)) return true;
  heroAnim(g, 0x9a); heroMove(g, 0xa8);
  if (yield* waitMove(g, 4)) return true;
  heroAnim(g, 0x9c); heroMove(g, 0x80);
  if (yield* waitTimer(g, V.timer68, 0x64)) return true;
  heroAnim(g, 0x90); heroMove(g, 0x80);
  if (yield* waitTimer(g, V.timer68, 0x32)) return true;
  heroAnim(g, 0x82); heroMove(g, 0xa9);
  yield* waitMove(g, 4, false);
  heroAnim(g, 0x86); heroMove(g, 0x80);
  if (yield* waitTimer(g, V.timer68, 0x19)) return true;
  heroAnim(g, 0x88); heroMove(g, 0x80);
  if (yield* waitTimer(g, V.timer68, 0x19)) return true;
  // Tal fades into the armour
  ram[V.dying + 4] = ram[V.dying + 5] = ram[V.anim + 4];
  ram[V.dyingTimer + 4] = ram[V.dyingTimer + 5] = 0;
  ram[V.dyingStep + 4] = ram[V.dyingStep + 5] = 0;
  while ((ram[V.dying + 4] | ram[V.dying + 5]) & 0x80) yield;
  g.w(0xd025, 0x0e); g.w(0xd026, 0x0b);
  ram[V.anim + 6] = ram[V.anim + 7] = 0x0b;
  heroAnim(g, 0xb2); heroMove(g, 0x80);
  if (yield* waitTimer(g, V.timer68, 0x32)) return true;
  ram[V.anim + 3] = 0xc8;
  ram[V.move + 3] = 0xab;
  resetMove(g, 3);
  ram[V.animDelay + 3] = 0; ram[V.animPos + 3] = 2;
  if (yield* waitMove(g, 3)) return true;
  heroAnim(g, 0xb0); heroMove(g, 0xac);
  if (yield* waitMove(g, 4)) return true;
  heroAnim(g, 0xae); heroMove(g, 0x80);
  if (yield* waitTimer(g, V.timer68, 0x0a)) return true;
  heroAnim(g, 0xac); heroMove(g, 0xad);
  if (yield* waitMove(g, 4)) return true;
  ram[V.timer68] = 0x64;
  while (ram[V.timer68]) yield;
  return false;
}

/** $8386: the credits page, the armour flying across. True if fire was pressed. */
function* credits(g: Game, text: number[]): Generator<void, boolean, void> {
  const { ram } = g;
  clearScreen(g);
  ram[V.d018Play] = 0x0c;
  ram[V.d016Panel] = 0; ram[V.d016Play] = 0;
  g.w(0xd016, g.r(0xd016) & 0xef);
  printText(g, text);
  ram[0x0207] = ram[0x0209] = 0xba;
  ram[0x020b] = 0xcf;
  ram[V.move + 3] = 0xae;
  resetMove(g, 3);
  heroAnim(g, 0xb6); heroMove(g, 0xaf);
  if (yield* waitMove(g, 4)) return true;
  if (yield* waitTimer(g, V.timer68, 0x32)) return true;
  ram[V.move + 3] = 0xb0;
  resetMove(g, 3);
  heroAnim(g, 0xac); heroMove(g, 0xb1);
  return false;
}

/** The credits page's text, as the original has it (row, column, colour, letters; $0D next line; '$' end). */
export function titleText(g: Game) {
  const at = g.word(TEXTS);
  const out: number[] = [];
  for (let i = 0; ; i++) { const c = g.ram[at + i]; out.push(c); if (c === 0x24) break; }
  return out;
}

/** $8BB9: print a text in the panel's lettering (A-Z as $9C-$B5, some punctuation). */
export function printText(g: Game, text: number[]) {
  const { ram } = g;
  let i = 0;
  for (;;) {
    const row = text[i++], col = text[i++], colour = text[i++];
    let at = rowAt(g, row) + col;
    for (;;) {
      const c = text[i++];
      let code = -1;
      if (c >= 0x41 && c < 0x5b) code = c + 0x5b;
      else if (c === 0x24) return;
      else if (c === 0x0d) break;
      else for (let x = 7; x >= 0; x--) if (c === ram[PUNCTUATION + x]) { code = ram[PUNCTUATION_CHARS + x]; break; }
      if (code < 0) return;
      ram[at] = code;
      g.m.colour[(at - 0x4000) & 0x3ff] = colour & 15;
      at++;
    }
  }
}

export type { Gen };
