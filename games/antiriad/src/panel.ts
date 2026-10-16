import type { Game } from './game';
import { messageAt, PLUS_CHAR } from './plus';
import { rowAt } from './rooms';
import { V } from './vars';

/**
 * The armour's panel under the playfield: the scrolling message, the score
 * (its digits roll), the two energy bars, the radiation level, the part just
 * found, and the power-up when Tal first wears the armour. The panel's
 * character set is at $7000; the message scrolls through characters $F5-$FF
 * ($77A8-$77FF), the bars are characters at $7768-$77A7.
 */
const PUNCTUATION = 0xc5cb, PUNCTUATION_CHARS = 0xc5d3;
const PANEL_CHARS = 0x7000;
const PANEL_ROWS = 0xf15a; // 8 rows of 32 characters
const DIGIT_VALUES = 0x06a6;
const RADIATION_SOUND = 0x06b0, RADIATION_WARN_TIME = 0x06b4;
const RADIATION_LETTER = 0xfc50;
const POWER_STEPS = 0xfc98, POWER_COUNTS = 0xfc9f;
const PANEL_COLOURS_CHARS = 0xfc60, PANEL_COLOURS = 0xfc7c;
const ARMOUR_PARTS = 0xfc54;

/** $8EE2 (with $8D37): the panel drawn, the message and bars empty. */
export function drawPanel(g: Game) {
  const { ram } = g;
  for (let row = 0x18; row >= 0x10; row--) {
    const at = rowAt(g, row);
    for (let c = 0; c < 40; c++) { ram[at + c] = 0; g.m.colour[at - 0x4000 + c] = 0; }
  }
  for (let x = 0x1f; x >= 0; x--) {
    for (let r = 0; r < 8; r++) {
      ram[0x42ac + r * 40 + x] = ram[PANEL_ROWS + r * 32 + x];
      g.m.colour[0x2ac + r * 40 + x] = 0x0b;
    }
  }
  clearMessage(g);
  clearBars(g);
}

/** $8F3B */
function clearMessage(g: Game) { g.ram.fill(0, 0x77a8, 0x7800); }

/** $8F47 */
function clearBars(g: Game) { g.ram.fill(0, 0x7768, 0x77a8); }

/** $8EBE: a message to show (queued; not the one showing, nor twice). */
export function say(g: Game, n: number) {
  const { ram } = g;
  ram[0x44] = n;
  if (!(ram[V.panelOn] & 0x80) || n === ram[V.message]) return;
  for (let x = 7; x >= 0; x--) {
    if (ram[0x066a + x] === n) return;
    if (!(ram[0x066a + x] & 0x80)) { ram[0x066a + x] = n; return; }
  }
}

/** $8EB0: start showing message n. */
function show(g: Game, n: number) {
  clearMessage(g);
  g.ram[V.messagePos] = 0; g.ram[V.messageScroll] = 0;
  g.ram[V.message] = n | 0x80;
}

/**
 * The message showing stopped, its letters off the panel at once (added for runstop64: for the
 * game over's, which goes round until the game starts again, in a save of a game that went on
 * past it, main.ts `repairSave`); as its end ('$', below) stops one.
 */
export function stopMessage(g: Game) {
  const { ram } = g;
  clearMessage(g);
  ram.fill(0, 0x0672, 0x067a); // (the next letter's columns, coming in)
  ram[V.messagePos] = 0; ram[V.messageScroll] = 0;
  ram[V.message] = 0; ram[0x0357] = 0; ram[0x033f] = 0;
}

/** $AA68 ($32 interrupt): the message scrolls 2 pixels a frame. */
export function scrollMessage(g: Game) {
  const { ram } = g;
  if (!(ram[V.message] & 0x80) || !(ram[V.panelOn] & 0x80)) return;
  if (!ram[V.messageScroll]) {
    let text = messageAt(g, ram[V.message]);
    if (!(ram[0x0357] & 0x80)) ram[V.request + 2] = 0x95;
    for (;;) {
      const c = ram[(text + ram[V.messagePos]) & 0xffff];
      let code = -1;
      if (c >= 0x41 && c < 0x5b) code = c + 0x5b;
      else if (c === 0x2b) code = PLUS_CHAR; // ('+': New Game+'s, plus.ts)
      else for (let x = 7; x >= 0; x--) if (c === ram[PUNCTUATION + x]) { code = ram[PUNCTUATION_CHARS + x]; break; }
      if (code >= 0) {
        const at = PANEL_CHARS + code * 8;
        for (let y = 7; y >= 0; y--) ram[0x0672 + y] = ram[at + y];
        ram[V.messagePos]++;
        break;
      }
      if (c === 0) { ram[V.messagePos] = 0; continue; }
      if (c === 1) {
        // carry on with another message
        ram[V.message] = ram[(text + ram[V.messagePos] + 1) & 0xffff];
        ram[V.messagePos] = 0;
        if (!(ram[V.message] & 0x80) || !(ram[V.panelOn] & 0x80)) return;
        if (ram[V.messageScroll]) break;
        text = messageAt(g, ram[V.message]);
        if (!(ram[0x0357] & 0x80)) ram[V.request + 2] = 0x95;
        continue;
      }
      if (c === 0x24) { // '$': the end
        ram[V.message] = 0; ram[0x0357] = 0; ram[0x033f] = 0;
        ram[V.warnTimer] = 0; ram[V.warnTimer + 1] = 0;
      }
      return;
    }
  }
  shiftMessage(g); shiftMessage(g);
  ram[V.messageScroll] &= 7;
}

/** $AB11: the message's 11 characters, a pixel left (the next character's column coming in). */
function shiftMessage(g: Game) {
  const { ram } = g;
  for (let x = 7; x >= 0; x--) {
    let carry = ram[0x0672 + x] >> 7;
    ram[0x0672 + x] = (ram[0x0672 + x] << 1) & 0xff;
    for (let c = 0x77f8; c >= 0x77a8; c -= 8) {
      const v = (ram[c + x] << 1) | carry;
      carry = v >> 8;
      ram[c + x] = v & 0xff;
    }
  }
  ram[V.messageScroll]++;
}

/** $AB3D ($32 interrupt): the score's digits roll toward the score, two pixel rows a frame. */
export function rollScore(g: Game) {
  const { ram } = g;
  if (!(ram[V.panelOn] & 0x80)) return;
  for (let x = 4; x >= 0; x--) {
    if (ram[V.digitRoll] === 7 && ram[0x0687 + x] !== ram[0x0682 + x]) {
      ram[0x068c + x] = 0x80;
      ram[0x0687 + x] = ram[0x0687 + x] + 1 >= 10 ? 0 : ram[0x0687 + x] + 1;
    }
    if (!(ram[0x068c + x] & 0x80)) continue;
    // $AB9F, $ABC7: the digit's character slides down, the next one's rows come in at the top
    const digit = PANEL_CHARS + ((ram[0x0687 + x] + 0xb6) & 0xff) * 8;
    const shown = PANEL_CHARS + (x + 0xe8) * 8;
    for (let y = 5; y >= 0; y--) ram[shown + y + 2] = ram[shown + y];
    const r = ram[V.digitRoll];
    ram[shown] = ram[digit + ((r - 1) & 0xff)];
    ram[shown + 1] = ram[digit + r];
  }
  ram[V.digitRoll] = (ram[V.digitRoll] - 2) & 0xff;
  if (!(ram[V.digitRoll] & 0x80)) return;
  ram[V.digitRoll] = 7;
  nextDigits(g);
  for (let x = 4; x >= 0; x--) ram[0x068c + x] = 0;
}

/** $ABE5: if the digits show less than the score, count them up by one. */
function nextDigits(g: Game) {
  const { ram } = g;
  let shown = 0;
  for (let y = 0; y < 5; y++) shown += ram[0x0682 + y] * g.word(DIGIT_VALUES + y * 2);
  ram[0x0694] = shown & 0xff; ram[0x0695] = (shown >> 8) & 0xff; ram[0x0696] = (shown >> 16) & 0xff;
  for (let y = 2; y >= 0; y--) {
    if (ram[0x0697 + y] === ram[0x0694 + y]) continue;
    let carry = 1;
    for (let x = 0; x < 5; x++) {
      let v = ram[0x0682 + x] + carry;
      carry = v >= 10 ? 1 : 0;
      if (carry) v = 0;
      ram[0x0682 + x] = v;
    }
    return;
  }
}

/** $8A23 (main loop): the energy bars move a step toward the energies. */
export function bars(g: Game) {
  const { ram } = g;
  if (!(ram[V.panelOn] & 0x80) || ram[0x8f]) return;
  if (ram[V.suitBar] !== ram[V.suitEnergy]) shiftBar(g, 0x7788, V.suitBar, ram[V.suitBar] < ram[V.suitEnergy]);
  if (ram[V.lifeBar] !== ram[V.life]) shiftBar(g, 0x7768, V.lifeBar, ram[V.lifeBar] < ram[V.life]);
  ram[0x8f] = 1;
}

/** $8A42/$8A72: a bar (4 characters, rows 2-5) grows (or shrinks) by a pixel. */
function shiftBar(g: Game, at: number, shown: number, grow: boolean) {
  const { ram } = g;
  for (let x = 5; x >= 2; x--) {
    if (grow) {
      let carry = 1;
      for (const c of [at, at + 8, at + 16, at + 24]) { const v = ram[c + x]; ram[c + x] = (v >> 1) | (carry << 7); carry = v & 1; }
    } else {
      let carry = 0;
      for (const c of [at + 24, at + 16, at + 8, at]) { const v = ram[c + x]; ram[c + x] = ((v << 1) | carry) & 0xff; carry = v >> 7; }
    }
  }
  ram[shown] = (ram[shown] + (grow ? 1 : -1)) & 0xff;
}

/** $89C2 (main loop): the panel lights up, once the armour's power-up tune is over. */
export function panelLights(g: Game) {
  const { ram } = g;
  if (!(ram[0x89] & 0x80) || ram[0x87] || ram[V.playing] === 0x8c) return;
  for (let row = 0x11; row < 0x19; row++) {
    const at = rowAt(g, row);
    for (let y = 0x27; y >= 0; y--) {
      const c = ram[at + y];
      let colour = 0x0b;
      for (let x = 0x1b; x >= 0; x--) if (c === ram[PANEL_COLOURS_CHARS + x]) { colour = ram[PANEL_COLOURS + x]; break; }
      g.m.colour[at - 0x4000 + y] = colour & 15;
    }
  }
  ram[V.request] = 0x8f; ram[V.request + 1] = 0x90; ram[V.request + 2] = 0x91;
  ram[0x89] = 0;
  ram[V.panelOn] = 0x80;
}

/** $AD2E ($B2 interrupt): the panel flashes (multicolour on and off), then the suit charges up. */
export function powerUp(g: Game) {
  const { ram } = g;
  if (!(ram[V.panelOn] & 0x80)) return;
  for (;;) {
    const x = ram[V.powerUp];
    if (x >= 6) {
      ram[V.d016Panel] = 0x10; ram[V.powerUp] = 0x10;
      if (ram[V.playing] === 0x8f) return;
      if (!ram[0x92]) { ram[V.request] = 0x92; ram[V.request + 1] = 0x93; ram[V.request + 2] = 0x94; }
      if (ram[0x92] >= 0x20) return;
      ram[V.suitEnergy]++;
      ram[0x92]++;
      if (ram[0x92] >= 0x20) { ram[0xa0] = ram[0x92]; g.say(0x84); }
      return;
    }
    if (ram[0x8d]) { ram[0x8d]--; return; }
    if (ram[V.powerUpCount] >= ram[POWER_COUNTS + x]) { ram[V.powerUpCount] = 0; ram[V.powerUp]++; continue; }
    ram[V.powerUpCount]++;
    ram[0x8d] = ram[POWER_STEPS + x];
    ram[V.d016Panel] ^= 0x10;
    ram[0x8d]--;
    return;
  }
}

/** $AC56 ($B2 interrupt): the panel's sprites: the radiation dial, the part found (or the spinning display). */
export function panelSprites(g: Game) {
  const { ram } = g;
  if (!(ram[V.panelOn] & 0x80)) return;
  let x = ram[0x75] ^ 3;
  ram[0x43fd] = (x + 0x70) & 0xff;
  g.w(0xd00a, 0xf1); g.w(0xd00b, 0xc2); g.w(0xd02c, 5); g.w(0xd015, 0x20);
  ram[0x4370 + 0x1b] = ram[RADIATION_LETTER + x];
  g.m.colour[0x370 + 0x1b] = 2;
  // $ACA8: the radiation warning sounds now and then
  if (!(ram[V.warnTimer] | ram[V.warnTimer + 1])) {
    if (!(ram[0x0357] & 0x80)) { x = ram[0x75]; ram[V.request + 2] = ram[RADIATION_SOUND + x]; }
    const t = g.word(RADIATION_WARN_TIME + ((x << 1) & 0xff));
    ram[V.warnTimer] = t & 0xff; ram[V.warnTimer + 1] = t >> 8;
  }
  const t = ((ram[V.warnTimer] | (ram[V.warnTimer + 1] << 8)) - 1) & 0xffff;
  ram[V.warnTimer] = t & 0xff; ram[V.warnTimer + 1] = t >> 8;
  // $AD0C: the part just found
  if (!(ram[V.panelItem] & 0x80)) {
    ram[0x43fe] = (ram[V.panelItem] + 0x9b) & 0xff;
    g.w(0xd02d, 0x0a); g.w(0xd00c, 0xb0); g.w(0xd00d, 0xca);
    g.w(0xd015, g.r(0xd015) | 0x40);
  }
  // $ACD6: or the spinning display
  if (ram[V.panelItem] & 0x80) {
    ram[0x76]++;
    ram[0x43fe] = ram[0x43ff] = (ram[0x76] & 7) + 0x74;
    g.w(0xd02d, 1); g.w(0xd02e, 1);
    g.w(0xd00c, 0xa8); g.w(0xd00e, 0xbc); g.w(0xd00d, 0xca); g.w(0xd00f, 0xca);
    g.w(0xd015, g.r(0xd015) | 0xc0);
  }
  g.w(0xd027, 0); g.w(0xd028, 0); g.w(0xd01c, 0); g.w(0xd01b, 0xff);
  g.w(0xd010, g.r(0xd010) & 3);
}

/** $AD95 ($B2 interrupt): a part of the armour in the room glows through the colours. */
export function partGlow(g: Game) {
  const { ram } = g;
  for (let y = 3; y >= 0; y--) {
    for (let x = 3; x < 8; x++) {
      if (ram[V.anim + x] !== ram[ARMOUR_PARTS + y]) continue;
      if (!ram[0x8c]) {
        ram[0x8b] = (ram[0x8b] + 1) & 15;
        if (!ram[0x8b]) ram[0x8b]++;
        ram[0x8c] = 5;
      }
      ram[V.spriteColour + x] = ram[0x8b];
      return;
    }
  }
}

/** $ADC4 ($B2 interrupt): the next message waiting, when none is showing. */
export function nextMessage(g: Game) {
  const { ram } = g;
  if (!(ram[V.panelOn] & 0x80) || ram[V.message] & 0x80) return;
  for (let x = 7; x >= 0; x--) {
    if (!(ram[0x066a + x] & 0x80)) continue;
    ram[0x066a + x] &= 0x7f;
    show(g, ram[0x066a + x]);
    return;
  }
}

/** $ADDF ($B2 interrupt): a part found while wearing the armour is shown, with its message. */
export function partNews(g: Game) {
  const { ram } = g;
  if (ram[V.message] & 0x80) {
    if ((ram[V.message] & 0x7f) >= 4) ram[V.panelItem] = 0x80;
    return;
  }
  ram[V.panelItem] = 0x80;
  if (!(ram[V.inSuit] & 0x80)) return;
  for (let x = 3; x >= 0; x--) {
    if (!(ram[0x067a + x] & 0x80)) continue;
    ram[0x067a + x] &= 0x7f;
    ram[V.panelItem] = x;
    show(g, x);
    return;
  }
}
