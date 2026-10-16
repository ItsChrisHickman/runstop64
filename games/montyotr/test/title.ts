/**
 * The title screen against the original's: the original program (built from the
 * reconstruction's byte-perfect source by tools/motr-prg.mjs) runs on c64kit's C64
 * beside the port's Title, frame by frame, with the same joystick, and the two are
 * compared: the scroller (characters, colours, fine scroll), the MONTY High Scores
 * band and box, the purple table and its pillars, the kit's icons in the charset,
 * and the rows the box rolls through (in order; the original's timing there comes
 * from its main loop's speed, so only the order is compared, and the rows' colours
 * are random).
 *
 * Masked, as deliberately changed (QOL.md): the port has no freedom kit carousel.
 * Not compared: rows 18-20 (the original's MONTY FREEDOM KIT. and its picked icons;
 * the port leaves them empty for ENTER CONTINUE), the item number on the table (row
 * 21, columns 18-21: the port draws the table plain), the space between the pillars
 * (rows 22-24, columns 9-30: the carousel turned there; the port's kit stands
 * there), and the sprites (the original's are the carousel and its curtains; the
 * port has none). Checked instead: the port shows no sprites, and its lower part
 * (rows 17-24) never changes, left and right held or not.
 *
 *   node tools/motr-prg.mjs /tmp/motr /tmp/motr.prg
 *   nice -n 15 node tools/test.mjs games/montyotr/test/title.ts /tmp/motr.prg [out-dir]
 *
 * The port's kit is the five that work, the original's its default five; so the
 * comparison runs the port with the original's kit (and the original's scroller
 * text, without our credits), to compare like with like. With an out-dir, both
 * screens are drawn (the same renderer) every 100 frames.
 *
 * (The original's name entry after a high score isn't the port's: a game ends on
 * CONTINUE? there, QOL.md.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64, type RowCapture } from '../../../packages/c64kit/src/c64/machine';
import { renderPng, type Picture } from '../../../tools/probe/render';
import { Game, SCREEN } from '../src/game';
import { Title } from '../src/title';

const [prgPath, outDir] = process.argv.slice(2);
if (!prgPath) { console.error('usage: title.ts <motr.prg> [out-dir]'); process.exit(1); }
const FRAMES = 1600;
/** Joystick: left 200-259, right 400-419 (the original's carousel turns; the port's kit stays still), up (the table rolls faster) 900-1100. */
const held = (f: number) => ({
  left: f >= 200 && f < 260, right: f >= 400 && f < 420, up: f >= 900 && f < 1100, down: false, fire: false,
});

// ---- the original -------------------------------------------------------------------------------
/** The original, from its start (RUN: SYS 2064). */
function original() {
  const c = new C64();
  c.ram.set(fs.readFileSync(prgPath).subarray(2), 0x801);
  c.vic[0x11] = 0x1b; c.vic[0x16] = 0x08; c.vic[0x18] = 0x15;
  c.cia2.pra = 0x97; c.cia1.pra = 0x7f;
  Object.assign(c.cia1, { latch: 0x4025, ta: 0x4025, cra: 0x11, mask: 0x01 });
  c.ram[0x314] = 0x31; c.ram[0x315] = 0xea;
  c.cpu.pc = 0x810; c.cpu.sp = 0xf6;
  return c;
}
const m = original();
const ORIGINAL_KIT = [...m.ram.subarray(0x3527, 0x352c)];

// ---- the port ------------------------------------------------------------------------------------
const g = new Game();
const t = new Title(g, { song() {}, stop() {}, musicOn: () => true }, { kit: ORIGINAL_KIT, message: Uint8Array.from(m.ram.subarray(0x3a59, 0x3bdb)) });

let failures = 0;
const fails = new Map<string, number>();
const fail = (what: string, f: number, detail: string) => {
  const n = (fails.get(what) ?? 0) + 1;
  fails.set(what, n);
  if (n <= 3) console.log(`FAIL frame ${f}: ${what}: ${detail}`);
  failures++;
};
const hex = (a: ArrayLike<number>) => Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
function same(what: string, f: number, a: ArrayLike<number>, b: ArrayLike<number>) {
  for (let i = 0; i < a.length; i++) if ((a[i] & 0xff) !== (b[i] & 0xff)) { fail(what, f, `at +${i}: original ${hex([a[i]])}, port ${hex([b[i]])}`); return; }
}
const oScreen = (r0: number, r1: number) => m.ram.subarray(0x4800 + r0 * 40, 0x4800 + r1 * 40);
const pScreen = (r0: number, r1: number) => g.mem.subarray(SCREEN + r0 * 40, SCREEN + r1 * 40);
const oColour = (r0: number, r1: number) => Array.from(m.colour.subarray(r0 * 40, r1 * 40), (c) => c & 15);
const pColour = (r0: number, r1: number) => Array.from(g.col.subarray(r0 * 40, r1 * 40), (c) => c & 15);
/** Rows 17-24 with what the port deliberately changed left out (see the top). */
function unmasked(a: ArrayLike<number>) {
  const out: number[] = [];
  for (let r = 17; r < 25; r++) for (let c = 0; c < 40; c++) {
    const masked = (r >= 18 && r <= 20) || (r === 21 && c >= 18 && c <= 21) || (r >= 22 && c >= 9 && c <= 30);
    if (!masked) out.push(a[(r - 17) * 40 + c]);
  }
  return out;
}
let lower: number[] | null = null;
const oRows: string[] = [], pRows: string[] = [];
const row15 = (s: ArrayLike<number>) => hex(Array.from(s).slice(15 * 40 + 6, 15 * 40 + 34));

/** The port's screen as a C64 would show it, for the probe's renderer. */
function portMachine(): Picture {
  const ram = new Uint8Array(0x10000);
  ram.set(g.mem, 0x4000);
  const v = g.vic;
  const rows = Array.from({ length: 25 }, (_, r): RowCapture => ({
    codes: g.mem.slice(SCREEN + r * 40, SCREEN + r * 40 + 40), colours: g.col.slice(r * 40, r * 40 + 40),
    d011: 0x1b, d016: r < 5 ? t.phase : 8, d018: 0x20, bank: 0x4000, bg: [v.background, 0, 0, 0],
  }));
  const sprites = v.sprites.map((s, n) => ({
    n, x: s.x, y: s.y, data: g.mem.slice(s.ptr * 64, s.ptr * 64 + 63), colour: s.colour, multicolour: !!(v.multicolour & (1 << n)),
    expandX: false, expandY: false, behind: !!(v.priority & (1 << n)), mc1: v.mc1, mc2: v.mc2,
  })).filter((_, n) => v.enable & (1 << n));
  return { ram, capture: { rows, sprites, border: v.border, borderLines: new Uint8Array(312).fill(v.border) } };
}

t.start();
for (let f = 0; f < FRAMES; f++) {
  const j = held(f);
  m.joy1 = m.joy2 = 0x1f & ~((j.up ? 1 : 0) | (j.down ? 2 : 0) | (j.left ? 4 : 0) | (j.right ? 8 : 0) | (j.fire ? 16 : 0));
  m.keys = [];
  if (!m.runFrame()) { console.log(`the original stopped at frame ${f}`); process.exit(1); }
  if (f > 0) t.frame(j);
  if (f < 6) continue; // (the original takes six frames to draw its screen; the port draws it at once)
  same('scroller characters (rows 0-5)', f, oScreen(0, 6), pScreen(0, 6));
  same('scroller colours (rows 0-5)', f, oColour(0, 6), pColour(0, 6));
  same('fine scroll', f, [m.ram[0xe5]], [t.phase]);
  same('band and box frame (rows 6-9, 16)', f, [...oScreen(6, 10), ...oScreen(16, 17)], [...pScreen(6, 10), ...pScreen(16, 17)]);
  same('band and box colours', f, [...oColour(6, 10), ...oColour(16, 17)], [...pColour(6, 10), ...pColour(16, 17)]);
  same('the table and pillars, unmasked (rows 17-24)', f, unmasked(oScreen(17, 25)), unmasked(pScreen(17, 25)));
  same('their colours, unmasked (rows 17-24)', f, unmasked(oColour(17, 25)), unmasked(pColour(17, 25)));
  same('item icons in the charset (chars 2-21)', f, m.ram.subarray(0x4010, 0x40b0), g.mem.subarray(0x10, 0xb0));
  same('the port: no sprites (the carousel and its curtains gone)', f, [0], [g.vic.enable]);
  const now = [...pScreen(17, 25), ...pColour(17, 25)];
  lower ??= now;
  same('the port: its lower part (the table, the kit) stands still', f, lower, now);
  const o15 = row15(m.ram.subarray(0x4800)), p15 = row15(g.mem.subarray(SCREEN));
  if (oRows.at(-1) !== o15) oRows.push(o15);
  if (pRows.at(-1) !== p15) pRows.push(p15);
  if (outDir && f % 100 === 0) {
    fs.mkdirSync(outDir, { recursive: true });
    renderPng(m, path.join(outDir, `${f}-original.png`));
    renderPng(portMachine(), path.join(outDir, `${f}-port.png`));
  }
}
const n = Math.min(oRows.length, pRows.length);
let rowsOk = n >= 50;
for (let i = 0; i < n; i++) if (oRows[i] !== pRows[i]) { console.log(`FAIL the box's row ${i}: original ${oRows[i]}, port ${pRows[i]}`); rowsOk = false; failures++; break; }
console.log(`${rowsOk ? 'ok  ' : 'FAIL'} the box rolls through the same ${n} rows (the original ${oRows.length}, the port ${pRows.length} in ${FRAMES} frames)`);
for (const [what, k] of fails) console.log(`     ${what}: ${k} frames differ`);
console.log(failures ? `${failures} FAILED` : `all ${FRAMES} frames match`);
process.exit(failures ? 1 : 0);
