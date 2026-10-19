/**
 * After the end, through the front end (headless, c64kit stood in by test/kit.ts). Chris finished
 * the game, and continuing went back to the game being finished and the ending again, round and
 * round: the only save was the one made coming into the power centre with the mine, and after the
 * ending the title asked CONTINUE? (which is for losing) back into it.
 *
 * Now the moment the mine is set off is saved too, and on loading goes on as New Game+ (main.ts
 * `repairSave`, plus.ts); after the ending the title offers ENTER CONTINUE (no CONTINUE?). Checked:
 *
 * - landing on the pedestal with the mine sets it off, and that moment is saved; the ending plays,
 *   fire goes to the title, which offers ENTER CONTINUE, not CONTINUE?;
 * - ENTER: New Game+ on the first screen, in the armour in the air, energy and life full, all four
 *   parts, the mine not set off; the scroller says what it is, then the message window NEW GAME+;
 *   the side panel and the save say so; left alone it stays in play;
 * - flying about, the armour's energy never goes down; in one of the first ten rooms it sets down
 *   and Tal steps out (no interlock), the room's radiation nothing; travel in the armour lists a
 *   room he only walked into;
 * - the game launched again (the next visit) goes straight back into New Game+;
 * - landing on the pedestal again ends the game again; NEW GAME? there asks first; ENTER CONTINUE
 *   starts New Game+ again.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/won.ts [out-dir for PNGs]
 */
import fs from 'node:fs';
import { Input, PixelRenderer, unpackState } from 'c64kit';
import { MACHINE_CODEC } from '../../shared/continue';
import { fromBase64, readSaves, toBase64, writeCurrent } from '../../shared/saves';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { run } from '../src/main';
import { renderPng } from '../../../tools/probe/render';
import type { AntiriadFound } from '../src/map';
import { must } from '../../shared/test/must';
import { intoArmour } from '../src/fades';
import { antiriadMap, describeSave } from '../src/map';
import { PLUS_MESSAGE } from '../src/plus';
import { V } from '../src/vars';
import { check, finish } from '../../shared/test/check';

const out = process.argv[2] ?? '/tmp';
const MINE_SET_OFF = 0xb1, MINE = 0x0681, PARTS = [0x067e, 0x067f, 0x0680, 0x0681];


// a save in the armour (the snapshot): the game launches straight into play from it
const store = useMemoryStorage();
writeCurrent('antiriad', { format: MACHINE_CODEC.format, data: toBase64(new Uint8Array(fs.readFileSync('games/antiriad/test/armour.state'))), at: 0, summary: [], rooms: 5 });

const input = new Input(nowhere);
const renderer = new PixelRenderer();
let p = run({ renderer, input, canvas: nowhere });
const g = () => p.game;
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(3); input.keyUp(code); tick(2); };
/** Keys held for up to n frames, or until `until`: true if it came. */
const hold = (keys: string[], n: number, until: () => boolean = () => false) => {
  for (const k of keys) input.keyDown(k);
  let ok = false;
  for (let i = 0; i < n && !ok; i++) { tick(); ok = until(); }
  for (const k of keys) input.keyUp(k);
  return ok;
};
const about = () => {
  const r = g().ram;
  return `${g().onTitle ? 'title' : g().playing ? 'playing' : 'ending'}, room ${r[V.room]} y ${r[0x0201]} anim ${r[V.anim].toString(16)} mine ${r[MINE].toString(16)} set off ${r[MINE_SET_OFF].toString(16)} message ${r[V.message].toString(16)} energy ${r[V.suitEnergy]} prompt ${p.state.prompt}`;
};
/** Flying across, slow to a stop, facing out (anim $B0): only so does the armour land (hero.ts suitFloor). */
const face = () => {
  if (g().ram[V.anim] === 0xac) hold(['ArrowRight'], 200, () => g().ram[V.anim] === 0xb0);
  if (g().ram[V.anim] === 0xb6) hold(['ArrowLeft'], 200, () => g().ram[V.anim] === 0xb0);
};
/** Come down onto the pedestal until the mine goes off (a miss: take off and try again, a little higher), as centre.ts. */
const land = () => {
  face();
  for (let tries = 0; tries < 8 && !(g().ram[MINE_SET_OFF] & 0x80); tries++) {
    hold(['ArrowUp'], 40 + tries * 3, () => g().ram[0x0201] < 72 - tries);
    hold([], 9);
    hold(['ArrowDown'], 80, () => g().ram[V.anim] === 0xb2);
    hold([], 10);
  }
  return !!(g().ram[MINE_SET_OFF] & 0x80);
};
/** The reward (ENHANCED: reward.ts), over the title after the ending's fire, skipped: a key once it has run its first seconds. */
const skipReward = () => {
  const show = p.ending;
  if (!show?.active) return;
  tick(110);
  tap('Space');
  tick(30);
};
/** The ending, then fire: the title (up a moment, for its question). */
const ending = () => {
  const stops = hold([], 3000, () => !g().playing);
  const words = hold([], 1500, () => g().ram[V.message] === 0x95);
  const title = hold(['Space'], 600, () => g().onTitle || !!p.ending?.active);
  tick(100);
  skipReward();
  return stops && words && title;
};

hold([], 100, () => g().playing);
check(`launched with a save: in play in the armour (${about()})`, g().playing && !!(g().ram[V.inSuit] & 0x80));
hold([], 600, () => g().ram[0x92] >= 0x20 && g().ram[V.suitEnergy] >= 0x1f);
for (const at of PARTS) g().ram[at] = 0x80; // (all four parts: the Implosion Mine among them)
g().travelTo = { room: 0, x: 168, y: 64, high: 0 };
hold([], 60, () => g().ram[V.room] === 0 && !(g().ram[V.roomChange] & 0x80) && !g().travelTo);
tick(5);
const entered = readSaves('antiriad').current?.data;

// ---- the end ---------------------------------------------------------------------------------------
const setOff = land();
check(`in the power centre with the Implosion Mine, landed on the pedestal: it's set off (${about()})`, setOff);
tick(2);
const saved = readSaves('antiriad').current;
const savedRam = saved ? unpackState(fromBase64(saved.data)).ram : new Uint8Array(1);
check(`  ... and that moment is saved (the mine set off in it: ${savedRam[MINE_SET_OFF].toString(16)})`, saved !== null && saved.data !== entered && !!(savedRam[MINE_SET_OFF] & 0x80));
const ended = ending();
check(`  ... the ending plays, and fire goes to the title (${about()})`, ended);
check(`  ... which offers ENTER CONTINUE, not CONTINUE? (prompt ${p.state.prompt})`, g().onTitle && p.state.prompt === 'title');

// ---- carrying on: New Game+ --------------------------------------------------------------------
const START = 56, STEP_OUT = 0x87, WINDOW = 0x77a8;
/** The panel's message window read back as letters (the panel's characters for A-Z, '+' and space). */
const label = () => {
  const glyphs = new Map<string, string>();
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') glyphs.set(g().ram.subarray(0x7000 + (c.charCodeAt(0) + 0x5b) * 8, 0x7008 + (c.charCodeAt(0) + 0x5b) * 8).join(), c);
  glyphs.set(g().ram.subarray(0x7000 + 0xe7 * 8, 0x7008 + 0xe7 * 8).join(), '+');
  glyphs.set('0,0,0,0,0,0,0,0', ' ');
  let t = '';
  for (let i = 0; i < 11; i++) t += glyphs.get(g().ram.subarray(WINDOW + i * 8, WINDOW + i * 8 + 8).join()) ?? '?';
  return t.trim();
};
/** New Game+ from the first screen: in the armour, in the air, full energy, all four parts, the mine not set off; it says so. */
const plusStarts = (how: string) => {
  const said = hold([], 200, () => g().ram[V.message] === (0x80 | PLUS_MESSAGE));
  const over = hold([], 1500, () => !(g().ram[V.message] & 0x80));
  tick(2);
  check(`${how}: New Game+, in play on the first screen (room ${START}), in the armour, its energy full, life full (${about()})`,
    g().playing && g().plus && g().ram[V.room] === START && !!(g().ram[V.inSuit] & 0x80) && g().ram[V.suitEnergy] === 0x20 && g().ram[V.life] === 0x1f && !(g().ram[MINE_SET_OFF] & 0x80));
  check(`  ... all four parts fitted, the Implosion Mine among them (${PARTS.map((at) => g().ram[at].toString(16)).join(' ')})`, PARTS.every((at) => g().ram[at] & 0x80));
  check(`  ... the panel's scroller says what it is, then its window says NEW GAME+ ("${label()}")`, said && over && label() === 'NEW GAME+');
  renderPng(g().m, `${out}/plus-${how.length}.png`);
  check(`  ... the side panel and the saved game say so (${describeSave(g().ram).join(', ')})`, describeSave(g().ram).includes('NEW GAME+'));
  const ended = hold([], 500, () => !g().playing);
  check(`  ... left alone for 10 seconds it stays in play (${about()})`, !ended);
};
tap('Enter');
tick(5);
plusStarts('ENTER CONTINUE');
renderPng(g().m, `${out}/plus-start.png`);

// unlimited energy: flying about, hit or not, it stays full
const fly = (keys: string[], n: number) => { let low = 0x20; hold(keys, n, () => { low = Math.min(low, g().ram[V.suitEnergy]); return false; }); return low; };
const lowest = Math.min(fly(['ArrowRight', 'ArrowUp'], 300), fly(['ArrowLeft'], 300), fly(['ArrowDown', 'ArrowRight'], 300), fly(['Space', 'ArrowLeft'], 300));
check(`New Game+: flying about for 24 seconds (rooms ${g().ram[V.room]}), the armour's energy never goes down (lowest ${lowest})`, lowest === 0x20);

// no radiation, no interlock: in one of the first ten rooms, set down, Tal steps out, and the radiation doesn't hurt him
let outIn = -1;
for (const room of [2, 3, 4, 5, 6, 7, 8, 9]) {
  g().travelTo = { room, x: 160, y: 64, high: 0 };
  hold([], 60, () => g().ram[V.room] === room && !(g().ram[V.roomChange] & 0x80) && !g().travelTo);
  tick(5);
  face();
  if (!hold(['ArrowDown'], 250, () => g().ram[V.anim] === 0xb2)) continue;
  hold([], 10);
  hold(['ArrowLeft'], 60, () => !(g().ram[V.inSuit] & 0x80));
  if (!(g().ram[V.inSuit] & 0x80)) { outIn = room; break; }
}
check(`New Game+: in one of the first ten rooms (${outIn}), set down, left steps Tal out: no interlock (${about()})`, outIn >= 0 && g().ram[V.message] !== (0x80 | STEP_OUT));
const level = (g().ram[0xf7a6 + (outIn >> 1)] >> (outIn & 1 ? 0 : 4)) & 3;
check(`  ... the room's radiation (the game's own level ${level}) is nothing: the dial and the drain on his life ($75: ${g().ram[0x75]})`, level > 0 && g().ram[0x75] === 0);
renderPng(g().m, `${out}/plus-out.png`);
hold([], 60);
intoArmour(g()); // (back in, where it stands: as stepping into it ends, fades.ts)
hold([], 60);
check(`  ... and back in the armour (${about()})`, !!(g().ram[V.inSuit] & 0x80) && g().ram[V.room] === outIn);

// travel: in the armour, anywhere he's been (a room he only walked into: the armour goes there too)
const f: AntiriadFound = { rooms: [START, 20], entry: { 20: { x: 120, y: 88, high: 0 } }, suitEntry: { [START]: { x: 96, y: 64, high: 0 } } };
const ids = must(antiriadMap.places, 'the map lists places')({ x: 0, y: 0, w: 150, h: 140 }, g(), f).map((p) => p.id);
check(`New Game+: travel in the armour to a room only walked into (${ids.join(' ')})`, !!(g().ram[V.inSuit] & 0x80) && ids.includes('20') && ids.includes(String(START)));

// the game launched again (the next visit): straight back into New Game+, where it was
const roomNow = g().ram[V.room];
p = run({ renderer, input, canvas: nowhere });
hold([], 100, () => g().playing);
tick(5);
check(`launched again: New Game+, in play (${about()}, plus ${g().plus}, "${label()}")`, g().playing && g().plus && label() === 'NEW GAME+' && g().ram[V.room] === roomNow);

// ---- the end again ---------------------------------------------------------------------------------
g().travelTo = { room: 0, x: 168, y: 64, high: 0 };
hold([], 60, () => g().ram[V.room] === 0 && !(g().ram[V.roomChange] & 0x80) && !g().travelTo);
tick(5);
const again = land();
check(`New Game+: landing on the pedestal with the mine ends the game again (${about()})`, again);
const endedAgain = ending();
check(`  ... the ending again, then the title, ENTER CONTINUE (${about()})`, endedAgain && p.state.prompt === 'title');
// a new game there asks first (the won game's save kept): NEW GAME?, Esc back to the title
const wonSave = store.get('antiriad.save.v2');
tap('Space');
check(`  ... Space there: NEW GAME? first, the title held, the save as it was (${about()})`, p.state.prompt === 'newGame' && g().onTitle && store.get('antiriad.save.v2') === wonSave);
tap('Escape');
tick(5);
check(`  ... Esc: back to the title, ENTER CONTINUE (${about()})`, p.state.prompt === 'title' && g().onTitle);
tap('Enter');
tick(5);
plusStarts('ENTER CONTINUE again');

finish();
