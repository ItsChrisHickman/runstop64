/** Drawing for the study's sheets: sprites as colour-index pictures, a tiny digit font, a shared reader of the collector's JSON. */
import fs from 'node:fs';
import { Surface, decodeSprite } from 'c64kit';
import { TRANSPARENT } from '../../../../packages/c64kit/src/surface';
import { isArray, isBoolean, isNumber, isRecord, isString, readJson } from '../../guards';

export interface PoseRecord {
  ptrs: number[]; sources: number[]; multicolour: boolean; expandX: boolean; expandY: boolean; colours: string[]; data: string; count: number; room: number; contexts: string[];
}
const isPose = (v: unknown): v is PoseRecord => isRecord(v) && isArray(v.ptrs) && isArray(v.sources) && isBoolean(v.multicolour) && isBoolean(v.expandX) && isBoolean(v.expandY)
  && isArray(v.colours) && v.colours.every(isString) && isString(v.data) && isNumber(v.count) && isNumber(v.room) && isArray(v.contexts) && v.contexts.every(isString);

export function readPoses(file: string): PoseRecord[] {
  const v = readJson(fs.readFileSync(file, 'utf8'));
  if (!isArray(v) || !v.every(isPose)) throw new Error(`${file}: not poses`);
  return v.filter(isPose);
}

/** The colours a record was shown in most: own, multicolour 1, multicolour 2. */
export function mainColours(p: PoseRecord): [number, number, number] {
  const [a = '1/0/0'] = p.colours;
  const [c = 1, m1 = 0, m2 = 0] = a.split(' ')[0].split('/').map(Number);
  return [c, m1, m2];
}

/** A pose's 24x21 (or expanded) picture, TRANSPARENT where empty. */
export function poseSurface(p: PoseRecord, colours = mainColours(p)): Surface {
  const s = new Surface(24 * (p.expandX ? 2 : 1), 21 * (p.expandY ? 2 : 1));
  decodeSprite(Uint8Array.from(Buffer.from(p.data, 'hex')), colours[0], p.multicolour, colours[1], colours[2], p.expandX, p.expandY, s);
  return s;
}

/** A canvas of colour indexes. */
export class Canvas {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number, bg = 11) { this.px = new Uint8Array(w * h).fill(bg); }
  /** A picture at `scale`, top left at (x, y); TRANSPARENT stays unpainted. */
  blit(s: Surface, x: number, y: number, scale = 1) {
    for (let j = 0; j < s.height * scale; j++) for (let i = 0; i < s.width * scale; i++) {
      const c = s.pixels[Math.floor(j / scale) * s.width + Math.floor(i / scale)];
      if (c === TRANSPARENT) continue;
      const X = x + i, Y = y + j;
      if (X >= 0 && Y >= 0 && X < this.w && Y < this.h) this.px[Y * this.w + X] = c;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < this.w && Y < this.h) this.px[Y * this.w + X] = c; }
  }
  /** Digits and a few letters in a 3x5 font at `scale`. */
  text(str: string, x: number, y: number, c = 1, scale = 2) {
    let at = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch];
      if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j] & (4 >> i)) this.rect(at + i * scale, y + j * scale, scale, scale, c);
      at += 4 * scale;
    }
  }
}
const FONT: Record<string, number[]> = {
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7], '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 1, 1], '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
  A: [7, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [7, 4, 4, 4, 7], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [7, 4, 5, 5, 7], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 7], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7], M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [7, 5, 5, 5, 7], P: [7, 5, 7, 4, 4], Q: [7, 5, 5, 7, 1], R: [6, 5, 6, 5, 5], S: [7, 4, 7, 1, 7], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5], Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  '-': [0, 0, 7, 0, 0], '/': [1, 1, 2, 4, 4], '.': [0, 0, 0, 0, 2], ' ': [0, 0, 0, 0, 0], '>': [4, 2, 1, 2, 4], '+': [0, 2, 7, 2, 0], ':': [0, 2, 0, 2, 0],
};
