import { KIT_GLYPHS, cssColour, C64 } from 'c64kit';

/**
 * The screen a phone shows before the first tap: "TURN YOUR PHONE", with a little
 * phone turning on its side, drawn in C64 pixels (the kit's font, C64 colours).
 * The tap that starts play also asks for full screen and landscape. The bottom
 * lines offer playing upright instead (picture on top, controls below).
 */
export const NUDGE_W = 160; // C64-ish pixels across (20 characters)

export interface NudgeLayout { h: number; uprightFrom: number }

/** Height in nudge pixels for a viewport, and where the "play upright" lines start. */
export function nudgeLayout(vw: number, vh: number): NudgeLayout {
  const h = Math.max(120, Math.round((NUDGE_W * vh) / Math.max(1, vw)));
  return { h, uprightFrom: h - 40 };
}

/** What a tap at nudge pixel row `y` chooses. */
export function nudgeChoice(y: number, l: NudgeLayout, portraitViewport: boolean): 'upright' | 'turn' {
  return portraitViewport && y >= l.uprightFrom ? 'upright' : 'turn';
}

const glyphs = new Map<string, number[]>();
for (const [ch, rows] of Object.entries(KIT_GLYPHS)) glyphs.set(ch, rows.map((r) => [...r].reduce((b, c, i) => b | (c === '#' ? 0x80 >> i : 0), 0)));

function text(px: Uint8Array, w: number, s: string, x: number, y: number, colour: number) {
  for (const ch of s) {
    const g = glyphs.get(ch.toUpperCase());
    if (g) for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (g[r] & (0x80 >> c)) set(px, w, x + c, y + r, colour);
    x += 8;
  }
}

function centred(px: Uint8Array, w: number, s: string, y: number, colour: number) {
  text(px, w, s, Math.floor((w - s.length * 8) / 2), y, colour);
}

function set(px: Uint8Array, w: number, x: number, y: number, c: number) {
  if (x >= 0 && x < w && y >= 0 && y * w + x < px.length) px[y * w + x] = c;
}

/**
 * Draws frame `t` (ticks at ~25/s) into indexed pixels (NUDGE_W × l.h), C64 colour numbers.
 * The phone turns anticlockwise (its top to the left), pauses, turns back.
 */
export function drawNudgePixels(l: NudgeLayout, t: number, portraitViewport: boolean): Uint8Array {
  const w = NUDGE_W, h = l.h, px = new Uint8Array(w * h).fill(C64.Blue);
  // the border, as on a C64 screen
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < 6 || x >= w - 6 || y < 6 || y >= h - 6) px[y * w + x] = C64.LightBlue;
  const top = Math.max(14, Math.floor(h * 0.12));
  if (portraitViewport) {
    centred(px, w, 'TURN YOUR', top, C64.White);
    centred(px, w, 'PHONE', top + 12, C64.White);
    // the phone: 22×38, with its screen; turns 0 → 90 degrees anticlockwise and back
    const cycle = 100, k = t % cycle;
    const phase = k < 20 ? 0 : k < 45 ? (k - 20) / 25 : k < 75 ? 1 : k < 90 ? 1 - (k - 75) / 15 : 0;
    const ease = phase * phase * (3 - 2 * phase);
    const a = (-Math.PI / 2) * ease; // anticlockwise on screen
    const cx = w / 2, cy = top + 40 + 30;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let y = cy - 26; y <= cy + 26; y++) for (let x = cx - 26; x <= cx + 26; x++) {
      // back into the phone's own coordinates
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if (Math.abs(u) > 11 || Math.abs(v) > 19) continue;
      const screen = Math.abs(u) <= 8 && v >= -14 && v <= 12;
      const button = Math.abs(u) <= 2 && v >= 14 && v <= 16;
      set(px, w, Math.floor(x), Math.floor(y), screen ? (ease > 0.98 ? C64.Cyan : C64.Black) : button ? C64.Grey : C64.LightGrey);
    }
    const blink = (t >> 3) & 1;
    centred(px, w, 'THEN TAP', cy + 40, C64.LightBlue);
    centred(px, w, 'TO PLAY', cy + 52, C64.LightBlue);
    if (blink) for (let y = cy + 52; y < cy + 60; y++) for (let x = 0; x < 8; x++) set(px, w, Math.floor((w + 7 * 8) / 2) + 2 + x, y, C64.LightBlue);
    // the other way: upright
    for (let x = 6; x < w - 6; x++) set(px, w, x, l.uprightFrom - 4, C64.LightBlue);
    centred(px, w, 'OR TAP HERE TO', l.uprightFrom + 6, C64.Cyan);
    centred(px, w, 'PLAY UPRIGHT', l.uprightFrom + 18, C64.Cyan);
  } else {
    centred(px, w, 'READY.', Math.floor(h / 2) - 14, C64.LightBlue);
    centred(px, w, 'TAP TO PLAY', Math.floor(h / 2), C64.White);
  }
  return px;
}

/** Paints indexed pixels onto a 2D canvas (its size set to the pixels'). */
export function paintNudge(canvas: HTMLCanvasElement, l: NudgeLayout, t: number, portraitViewport: boolean) {
  const px = drawNudgePixels(l, t, portraitViewport);
  if (canvas.width !== NUDGE_W || canvas.height !== l.h) { canvas.width = NUDGE_W; canvas.height = l.h; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(NUDGE_W, l.h);
  const rgb = Array.from({ length: 16 }, (_, i) => { const c = parseInt(cssColour(i).slice(1), 16); return [c >> 16, (c >> 8) & 255, c & 255]; });
  for (let i = 0; i < px.length; i++) { const c = rgb[px[i]]; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}
