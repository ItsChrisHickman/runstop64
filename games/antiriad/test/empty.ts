/**
 * The armour out of energy (hero.ts `settleEmpty`, `emptyLetsOut`). In the original it drops and
 * bounces on the floor for good, steering dead, until turned to face out (pushing the other way
 * from the way it flew), when it lands and Tal can step out; in the first ten rooms the safety
 * interlock never lets him out, and nothing in the armour can hurt him: the game goes on for
 * ever. ENHANCED: it sets down whichever way it faces, and left or right lets him out, anywhere.
 *
 * Checked: ENHANCED drained in flight, it sets down, Tal steps out, walks away, comes back and
 * gets in; and in a room of the first ten. ORIGINAL keeps the original's: let go or pushed the
 * way it flew it never lands, pushed the other way it lands and he steps out, as the original
 * itself does (its 6502 code run beside the port from the same snapshot and the same joystick);
 * and in the first ten rooms he never gets out. The pause screen's hint for each.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/empty.ts [out-dir: the pause screens, PNG]
 */
import fs from 'node:fs';
import path from 'node:path';
import { BitmapFont, C64Machine, KIT_GLYPHS, Surface, unpackState } from 'c64kit';
import { drawPause, type Found } from '../../shared/native/pause';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { CELLS } from '../src/cells';
import { Game } from '../src/game';
import { antiriadMap } from '../src/map';
import { V } from '../src/vars';

const ARMOUR = 'games/antiriad/test/armour.state';
const machine = () => {
  const m = new C64Machine();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(ARMOUR))));
  m.collisionsPerLine = true;
  m.ram[CELLS] = 0; // (the snapshot is the original running, its code where the port keeps the stored cells; in a game of ours it is 0)
  return m;
};
const load = (enhanced: boolean) => { const g = new Game(machine(), true); g.enhanced = enhanced; return g; };
const stick = (s: string) => 0x1f & ~((s.includes('U') ? 1 : 0) | (s.includes('D') ? 2 : 0) | (s.includes('L') ? 4 : 0) | (s.includes('R') ? 8 : 0) | (s.includes('F') ? 16 : 0));

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

/** Anything that runs frames with a joystick: the port, or the original on the 6502. */
interface Player { ram: Uint8Array; frame(j: string): void }
const port = (g: Game): Player => ({ ram: g.ram, frame(j) { g.m.joy1 = 0x1f; g.m.joy2 = stick(j); g.tick(); } });
const original = (m: C64Machine): Player => ({ ram: m.ram, frame(j) { m.joy1 = 0x1f; m.joy2 = stick(j); m.runFrame(); } });

const inArmour = (p: Player) => !!(p.ram[V.inSuit] & 0x80);
const x = (r: Uint8Array) => r[0x0200] + ((r[V.spriteXHigh] & 1) << 8);
const about = (p: Player) => { const r = p.ram; return `room ${r[V.room].toString(16)} x ${x(r)} y ${r[0x0201]} in ${inArmour(p)} anim ${r[V.anim].toString(16)} energy ${r[V.suitEnergy]}`; };
/** Hold a joystick for up to n frames, or until `until`; the frames it took (n+1: never). */
function hold(p: Player, j: string, n: number, until: () => boolean = () => false) {
  for (let i = 0; i < n; i++) { p.frame(j); if (until()) return i + 1; }
  return n + 1;
}
/** The armour's power-up (still under way in the snapshot) done, so nothing fills it again. */
const poweredUp = (p: Player) => hold(p, '', 900, () => p.ram[0x92] >= 0x20 && p.ram[V.suitEnergy] >= 0x1f) <= 900;
/** Drained: its energy gone (as hits take it, $A891), in flight, flying left. */
function drainInFlight(p: Player) {
  hold(p, 'U', 30); hold(p, 'L', 30);
  p.ram[V.suitEnergy] = 0;
}
const hint = (g: Game) => antiriadMap.info(g, {} satisfies Found).slice(3).filter((l) => !l.startsWith('CELLS')).join(' ');

/** With an out-dir: the pause screen as it is now, to look at (the hint fits its column). */
const outDir = process.argv[2];
function pauseShot(g: Game, name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const s = new Surface(320, 200, 0);
  const options = [g.enhanced ? 'E ENHANCED' : 'E ORIGINAL', 'B BACK TO', ' ROOM START', 'T TITLE']; // (as FrontEnd's)
  drawPause(s, new BitmapFont().addDrawn(KIT_GLYPHS), antiriadMap, g, { rooms: [g.ram[V.room]] }, 0, options);
  rgbPng(path.join(outDir, `${name}.png`), indicesToRgb(s.pixels), 320, 200);
}

// ---- ENHANCED ---------------------------------------------------------------------------------
{
  const g = load(true), p = port(g);
  check('ENHANCED: the armour powers up (the snapshot is in the middle of it)', poweredUp(p));
  drainInFlight(p);
  check(`ENHANCED: drained in flight (${about(p)})`, inArmour(p) && p.ram[V.anim] !== 0xb2 && !p.ram[V.suitEnergy]);
  pauseShot(g, 'enhanced-empty');
  check(`ENHANCED: the pause screen says how to get out ("${hint(g)}")`, hint(g) === 'STEP OUT: LEFT/RIGHT');
  const down = hold(p, '', 200, () => p.ram[V.anim] === 0xb2);
  check(`ENHANCED: let go, it comes down and sets down standing, facing out (in ${down} frames: ${about(p)})`, down <= 200 && !p.ram[V.flySpeedX] && !p.ram[V.flySpeedY]);
  hold(p, '', 20);
  check('ENHANCED: ... and stays down', p.ram[V.anim] === 0xb2 && inArmour(p));
  const out = hold(p, 'L', 30, () => !inArmour(p));
  const suitX = x(p.ram);
  check(`ENHANCED: left lets Tal out (in ${out} frames: ${about(p)})`, out <= 30);
  hold(p, 'L', 60);
  hold(p, '', 10);
  const away = suitX - x(p.ram);
  check(`ENHANCED: he walks away from it (${away} pixels: ${about(p)})`, away >= 24 && !inArmour(p) && p.ram[V.room] === p.ram[V.suitRoom]);
  // back, and in: walking to it, then turning to face out where it stands ($88, as he steps in;
  // not in the first 100 frames out of it, $93)
  const back = hold(p, 'R', 200, () => x(p.ram) >= p.ram[V.suitX] - 2);
  hold(p, '', 100, () => !p.ram[0x93]);
  const inAgain = hold(p, 'L', 60, () => inArmour(p));
  check(`ENHANCED: he walks back (${back} frames) and gets in again (${inAgain} frames: ${about(p)})`, back <= 200 && inAgain <= 60);
  hold(p, '', 120);
  check(`ENHANCED: still empty, it stands (${about(p)})`, inArmour(p) && p.ram[V.anim] === 0xb2 && !p.ram[V.suitEnergy]);
  check('ENHANCED: ... and lets him out again', hold(p, 'R', 30, () => !inArmour(p)) <= 30);
}

// ENHANCED and ORIGINAL in a room of the first ten (the safety interlock): there by the map's travel
function interlocked(enhanced: boolean) {
  const g = load(enhanced), p = port(g);
  poweredUp(p);
  g.travelTo = { room: 0x09, x: 0x50, y: 0x60, high: 0 }; // (over a floor in room 9)
  hold(p, '', 60, () => p.ram[V.room] === 0x09 && !(p.ram[V.roomChange] & 0x80));
  p.ram[V.suitEnergy] = 0;
  return { g, p };
}
{
  const { g, p } = interlocked(true);
  const down = hold(p, '', 300, () => p.ram[V.anim] === 0xb2);
  check(`ENHANCED: in room 9 (radiation, the interlock) drained, it sets down (${down} frames: ${about(p)})`, p.ram[V.room] === 0x09 && down <= 300);
  pauseShot(g, 'enhanced-empty-room9');
  check(`ENHANCED: the hint there ("${hint(g)}")`, hint(g) === 'STEP OUT: LEFT/RIGHT');
  const out = hold(p, 'L', 30, () => !inArmour(p));
  check(`ENHANCED: ... and the interlock lets him out (in ${out} frames: ${about(p)})`, out <= 30);
}

// ---- ORIGINAL: the original's own, beside the original running ------------------------------------
{
  const g = load(false), pp = port(g), po = original(machine());
  for (const p of [pp, po]) { poweredUp(p); drainInFlight(p); }
  pauseShot(g, 'original-empty');
  check(`ORIGINAL: the pause screen says to hold backwards ("${hint(g)}")`, hint(g) === 'STEP OUT: BACKWARDS');
  const what = (p: Player) => {
    hold(p, '', 300);
    const letGo = inArmour(p) && p.ram[V.anim] !== 0xb2;
    hold(p, 'L', 150);
    const sameWay = inArmour(p) && p.ram[V.anim] !== 0xb2;
    const turned = hold(p, 'R', 200, () => !inArmour(p));
    return { letGo, sameWay, turned, now: about(p) };
  };
  const a = what(pp), b = what(po);
  check(`ORIGINAL: let go, it never lands (port ${a.letGo}, the original ${b.letGo})`, a.letGo && b.letGo);
  check(`ORIGINAL: pushed the way it flew, still not (port ${a.sameWay}, the original ${b.sameWay})`, a.sameWay && b.sameWay);
  check(`ORIGINAL: pushed the other way it turns, lands and he steps out (port in ${a.turned} frames: ${a.now}; the original in ${b.turned}: ${b.now})`,
    a.turned <= 200 && b.turned <= 200 && Math.abs(a.turned - b.turned) <= 7);
}
{
  const { g, p } = interlocked(false);
  hold(p, '', 300);
  pauseShot(g, 'original-empty-room9');
  check(`ORIGINAL: in room 9 drained, the hint ("${hint(g)}")`, hint(g) === 'NO WAY OUT IN ORIGINAL');
  const turned = hold(p, 'R', 300, () => !inArmour(p));
  hold(p, 'L', 100, () => !inArmour(p));
  check(`ORIGINAL: ... and he never gets out, as in the original (${about(p)}; ${turned > 300 ? 'never' : 'out'})`, inArmour(p) && p.ram[V.room] === 0x09);
}

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
