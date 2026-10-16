/**
 * The power centre (room 0, H1): the armour emptied there, Tal outside it, his death, travel, the
 * game over, and the ending.
 *
 * A playtest (ENHANCED): the armour ran out of energy in the power centre; Tal stepped out (the
 * radiation there is the worst: he dies in seconds), travelled out by the map, fetched a recharge
 * cell, got back in and travelled back in the armour, arriving where it first came in (from below,
 * in the floor's gap, its feet over the panel, as the original's own way in from below puts it).
 * Then "YOU HAVE DIED" scrolled round on the panel for good, travel still worked, and the game
 * never ended or went on properly. Travel had been taken during his deaths: he arrived with no life
 * and died again at once (two or three rejuvenations a death), and travel from the last death
 * undid the game over: Tal up and about, never to die again, nothing to end the game (the fire that
 * ends it is for him lying dead; in the armour it fires the Pulsar Beam). Checked here:
 *
 * - The armour comes into room 0 from below (its arrival point under the floor line) and travel
 *   back there arrives flying, and it flies up; travel into the last two rooms takes the armour's
 *   energy without the Particle Negator, as coming in by an edge does.
 * - The playtest's steps: drained there it sets down, Tal steps out, walks off, and dies of the
 *   radiation; while he's dying, lying dead or coming back, the map offers nowhere and travel
 *   asked for doesn't happen; it's one rejuvenation, and once he's up travel works again.
 * - The game over: no travel; fire ends the game (the title).
 * - A save of a game gone on past its game over (as travel left it) is put right on loading
 *   (main.ts repairSave): as CONTINUE? would, full life, all the rejuvenations, the message stopped.
 * - The ending: in the armour with the Implosion Mine, landing on the pedestal sets it off, against
 *   the original running (each frame of logic fed the joystick the original read, as logic.ts):
 *   the pedestal's top flashes, through 7 colours a frame each, and is only floor in 2 of them
 *   (5 and 7: the rest are colours the armour goes through, $CE12), so the armour lands on it only
 *   if it reaches it then; otherwise it sinks into it and stands a row lower, on the pedestal's
 *   body, and the mine isn't set off (the game looks under its feet for the top, $9850). Both games
 *   alike. Then the ending plays, and fire goes back to the title.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/centre.ts
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { MAP_BOX } from '../../shared/native/pause';
import { must } from '../../shared/test/must';
import { Game } from '../src/game';
import { repairSave } from '../src/main';
import { antiriadMap, entriesOf } from '../src/map';
import { V } from '../src/vars';
import { check, finish } from '../../shared/test/check';

const ARMOUR = 'games/antiriad/test/armour.state';
const machine = () => {
  const m = new C64Machine();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(ARMOUR))));
  m.collisionsPerLine = true;
  return m;
};
const stick = (s: string) => 0x1f & ~((s.includes('U') ? 1 : 0) | (s.includes('D') ? 2 : 0) | (s.includes('L') ? 4 : 0) | (s.includes('R') ? 8 : 0) | (s.includes('F') ? 16 : 0));


const NEGATOR = 0x067f, MINE = 0x0681;

/** The port, ENHANCED, with the map noting rooms as the front end does (main.ts). */
class Play {
  readonly g: Game;
  readonly found = antiriadMap.found.empty();
  constructor(g = new Game(machine(), true)) { this.g = g; g.enhanced = true; }
  get ram() { return this.g.ram; }
  frame(j: string) {
    const { g } = this;
    g.m.joy1 = 0x1f; g.m.joy2 = stick(j); g.tick();
    if (g.playing && !(g.ram[V.roomChange] & 0x80)) antiriadMap.observe(g, this.found, new Uint8Array(0));
  }
  /** Hold a joystick for up to n frames, or until `until`: true if it came. */
  hold(j: string, n: number, until: () => boolean = () => false) {
    for (let i = 0; i < n; i++) { this.frame(j); if (until()) return true; }
    return false;
  }
  /** Travel by the map to where it says (as main.ts asks the game), if it offers the room. */
  travel(room: number) {
    const at = (antiriadMap.places?.(MAP_BOX, this.g, this.found) ?? []).find((p) => p.id === String(room));
    const e = entriesOf(this.found, this.inArmour)[String(room)];
    if (at && e) this.g.travelTo = { room, ...e };
    return !!at;
  }
  /** Ask the game to travel anyway (as a pick made a moment earlier would). */
  forceTravel(room: number) { this.g.travelTo = { room, ...must(entriesOf(this.found, this.inArmour)[String(room)], `an entry for room ${room}`) }; }
  get inArmour() { return !!(this.ram[V.inSuit] & 0x80); }
  get settled() { return !(this.ram[V.roomChange] & 0x80) && !this.g.travelTo; }
  about() {
    const r = this.ram;
    return `room ${r[V.room]} x ${r[0x0200] + ((r[V.spriteXHigh] & 1) << 8)} y ${r[0x0201]} anim ${r[V.anim].toString(16)} ${this.inArmour ? 'in' : 'out'} energy ${r[V.suitEnergy]} life ${r[V.life]} deaths ${r[V.deaths]}`;
  }
  /** The armour powered up (still under way in the snapshot), with the Particle Negator (without it, room 1 takes its energy), into room 1 under its way up, and up into room 0. */
  intoRoom0() {
    this.hold('', 600, () => this.ram[0x92] >= 0x20 && this.ram[V.suitEnergy] >= 0x1f);
    this.ram[NEGATOR] = 0x80;
    this.g.travelTo = { room: 1, x: 192, y: 0x60, high: 0 };
    this.hold('', 60, () => this.ram[V.room] === 1 && this.settled);
    this.hold('', 10);
    return this.hold('U', 400, () => this.ram[V.room] === 0 && this.settled);
  }
}
const deathAnim = (r: Uint8Array) => [0xa6, 0xa8, 0xaa].includes(r[V.anim]);

// ---- in the armour: the way into room 0 from below, and travel back there ------------------------
{
  const p = new Play();
  const flew = p.intoRoom0();
  check(`flew up into room 0 from room 1 (with the Particle Negator: ${p.about()})`, flew);
  p.hold('', 2);
  const entry = must(entriesOf(p.found, true)['0'], 'the armour\'s way into room 0');
  check(`  ... by the floor's gap: its arrival point is under the floor line, over the panel (y ${entry.y})`, entry.y >= 0x94);
  p.hold('U', 60, () => p.ram[0x0201] < 0x70);
  p.travel(0x3f);
  p.hold('', 60, () => p.ram[V.room] === 0x3f && p.settled);
  const offered = p.travel(0);
  p.hold('', 60, () => p.ram[V.room] === 0 && p.settled);
  p.hold('', 2);
  check(`travel back to room 0 in the armour: it arrives where it came in, flying (${p.about()})`, offered && p.ram[V.room] === 0 && p.ram[0x0201] === entry.y && p.ram[V.anim] !== 0xb2);
  const low = p.ram[0x0201];
  p.hold('U', 80);
  check(`  ... and up lifts it out of the gap (y ${low} -> ${p.ram[0x0201]})`, p.ram[0x0201] < low - 24);
}
{
  // without the Particle Negator: coming into room 1 by its edge (from room 2, below) takes the
  // armour's energy (the original's $84F0), and so does travel into it
  const p = new Play();
  p.hold('', 600, () => p.ram[0x92] >= 0x20 && p.ram[V.suitEnergy] >= 0x1f);
  p.g.travelTo = { room: 2, x: 88, y: 0x60, high: 0 };
  p.hold('', 60, () => p.ram[V.room] === 2 && p.settled);
  const flying = p.ram[V.suitEnergy];
  const up = p.hold('U', 400, () => p.ram[V.room] === 1 && p.settled);
  check(`without the Particle Negator, flying up into room 1 by its edge: the energy goes (${flying} -> ${p.ram[V.suitEnergy]})`, up && flying > 0 && p.ram[V.suitEnergy] === 0);
  const q = new Play();
  q.hold('', 600, () => q.ram[0x92] >= 0x20 && q.ram[V.suitEnergy] >= 0x1f);
  const before = q.ram[V.suitEnergy];
  q.g.travelTo = { room: 1, x: 88, y: 0x60, high: 0 };
  q.hold('', 60, () => q.ram[V.room] === 1 && q.settled);
  check(`  ... and travelling into it, as by the edge (${before} -> ${q.ram[V.suitEnergy]})`, before > 0 && q.ram[V.suitEnergy] === 0);
}

// ---- the playtest: emptied in room 0, Tal out, dying of the radiation ---------------------------
{
  const p = new Play();
  p.intoRoom0();
  p.hold('U', 60, () => p.ram[0x0201] < 0x60);
  p.hold('L', 200, () => p.ram[0x0200] < 0x70); // (over the floor left of the pedestal)
  p.ram[V.suitEnergy] = 0;
  const down = p.hold('', 300, () => p.ram[V.anim] === 0xb2);
  check(`emptied over room 0's floor, the armour sets down (${p.about()})`, down);
  const out = p.hold('L', 40, () => !p.inArmour);
  check(`  ... and Tal steps out (${p.about()})`, out);
  p.hold('', 60);
  p.hold('R', 120); // (away from the armour, or standing still he'd step back in)
  const outAt = p.ram[V.room];
  const dies = p.hold('', 1500, () => p.ram[V.anim] === 0xa6);
  check(`  ... walks off and the radiation kills him (${p.about()})`, dies);
  const deaths = p.ram[V.deaths];
  const room = p.ram[V.room], entry = must(entriesOf(p.found, false)[String(room)], 'where Tal came into this room');
  let offered = 0, travelled = false, minLife = 31;
  // every frame of his death and coming back: the map offers nowhere, and a travel asked for
  // (as one picked a moment before) doesn't happen
  for (let f = 0; f < 1500 && (deathAnim(p.ram) || p.ram[V.anim] === 0xa6); f++) {
    offered += antiriadMap.places?.(MAP_BOX, p.g, p.found).length ?? 0;
    p.forceTravel(room);
    p.frame('');
    if (p.ram[V.appearing] & 0x80 && p.ram[V.anim] !== 0x88) travelled = true;
    if (p.ram[0x0201] === entry.y && p.ram[0x0200] === entry.x && p.ram[V.anim] === 0x88 && p.ram[V.appearing] & 0x80) travelled = true;
    minLife = Math.min(minLife, p.ram[V.life]);
  }
  p.g.travelTo = null;
  check(`while he's dying, lying dead and coming back the map offers nowhere (${offered} offers)`, offered === 0);
  check(`  ... and travel asked for doesn't happen (${travelled ? 'it did' : 'none'})`, !travelled);
  p.hold('', 20);
  check(`  ... one rejuvenation: he's up again, with his life back (deaths ${deaths}, now ${p.about()})`, p.ram[V.deaths] === deaths && !deathAnim(p.ram) && p.ram[V.room] === outAt && p.ram[V.life] > 20);
  check(`  ... and travel is offered again (${antiriadMap.places?.(MAP_BOX, p.g, p.found).length} places)`, p.travel(room));
  p.hold('', 60, () => !!(p.ram[V.appearing] & 0x80));
  check(`  ... and happens: he appears where he came into the room (${p.about()})`, p.ram[V.anim] === 0x88 && !!(p.ram[V.appearing] & 0x80) && p.ram[0x0200] === entry.x);

  // the game over: his last rejuvenation used
  p.hold('', 60);
  p.ram[V.deaths] = 4;
  const over = p.hold('R', 1500, () => !!(p.ram[V.gameOver] & 0x80));
  check(`the last death: the game is over (${p.about()})`, over);
  let offeredOver = 0, up = false;
  for (let f = 0; f < 300; f++) {
    offeredOver += antiriadMap.places?.(MAP_BOX, p.g, p.found).length ?? 0;
    p.forceTravel(room);
    p.frame('');
    if (!deathAnim(p.ram)) up = true;
  }
  p.g.travelTo = null;
  check(`  ... no travel offered (${offeredOver}), and travel asked for doesn't bring him back (${p.about()})`, offeredOver === 0 && !up);
  const title = p.hold('F', 400, () => p.g.onTitle);
  check(`  ... fire ends the game: the title (${title ? 'title' : p.about()})`, title);
}

// ---- a save of a game gone on past its game over (as travel left it), put right on loading ----------
{
  const p = new Play();
  p.intoRoom0();
  p.hold('', 20);
  // as travel from his last death left things: the game over set, Tal up (here in the armour, as in
  // the playtest), the game over's message going round
  p.ram[V.gameOver] = 0x90; p.ram[V.deaths] = 5; p.ram[V.life] = 3;
  p.g.say(0x90);
  p.hold('', 200);
  const resume = (repair: boolean) => {
    p.g.flushShapes();
    const m = new C64Machine();
    m.loadState(p.g.m.saveState());
    const g = new Game(m, true);
    if (repair) repairSave(g);
    return new Play(g);
  };
  const asItIs = resume(false);
  asItIs.hold('', 3000);
  check(`as it was saved: "YOU HAVE DIED" still going round 3000 frames on, the game over set (message ${asItIs.ram[V.message].toString(16)})`, asItIs.ram[V.message] === 0x90 && !!(asItIs.ram[V.gameOver] & 0x80));
  const q = resume(true);
  check(`put right on loading: as CONTINUE? would, full life, all the rejuvenations (${q.about()})`, !(q.ram[V.gameOver] & 0x80) && q.ram[V.deaths] === 0 && q.ram[V.life] === 0x1f);
  let shown = 0;
  for (let f = 0; f < 600; f++) { q.frame(''); if ((q.ram[V.message] & 0x7f) === 0x10) shown++; }
  check(`  ... the message stopped (${shown} frames of it)`, shown === 0);
  check(`  ... and travel offered (${antiriadMap.places?.(MAP_BOX, q.g, q.found).length} places)`, q.g.canTravel);
  // and Tal dies again as he should: out of the armour, no life
  q.ram[V.inSuit] = 0; q.ram[V.life] = 0;
  check('  ... and Tal can die again', q.hold('', 50, () => q.ram[V.anim] === 0xa6));
}

// ---- the ending: landing on the pedestal with the Implosion Mine, against the original -----------
/** Into room 0 over the pedestal (the original's own room drawing, $852C), with all four parts (logic.ts's `place`). */
function place(m: C64Machine, x: number, y: number, read: number) {
  const r = m.ram, { a, x: rx, y: ry, sp, p, pc } = m.cpu;
  const keep = [V.spriteEnable, V.inSuit, V.suitEnergy, V.suitBar, V.panelOn, V.powerUp, V.powerUpCount, V.anim, V.anim + 1, V.flySpeedX, V.flySpeedY, V.dir, V.dir + 1].map((k) => [k, r[k]]);
  r[V.room] = 0;
  m.cpu.p |= 4; m.call(0x852c); Object.assign(m.cpu, { a, x: rx, y: ry, sp, p, pc });
  for (const [k, v] of keep) r[k] = v;
  r[0x0200] = r[0x0202] = x; r[V.spriteXHigh] &= 0xfc;
  r[0x0201] = y; r[0x0203] = (y + 0x15) & 0xff;
  for (let i = 0; i < 4; i++) r[0x067e + i] = 0x80;
  r[V.inputDelay] = read; // (the joystick's next read, against the pedestal's flashing: when it comes down)
}
const state = (r: Uint8Array, colour: Uint8Array) => `y ${r[0x0201]} anim ${r[V.anim].toString(16)} top ${colour[0x1f3]} mine ${r[0xb1].toString(16)} message ${r[V.message].toString(16)}`;
{
  let same = 0, set = 0, missed = 0, runs = 0, rowLower = 0, ending = false;
  for (const wait of [0, 3]) for (let phase = 0; phase < 7; phase++) {
    const o = machine(), pm = machine();
    place(o, 168, 64, phase); place(pm, 168, 64, phase);
    const g = new Game(pm, true);
    const A: string[] = [], B: string[] = [], read: number[] = [];
    let busy = false;
    const step = o.cpu.step.bind(o.cpu);
    o.cpu.step = () => {
      const pc = o.cpu.pc;
      if (pc === 0xaf45) { busy = true; read.push(o.joy2); } // the frame's logic starts ...
      else if (pc === 0xaf63 && busy) { busy = false; A.push(state(o.ram, o.colour)); } // ... and is done
      return step();
    };
    // take off, wait, and come straight down onto the pedestal
    const plan: [string, number][] = [['U', 14], ['', 10 + wait], ['D', 70], ['', 40]];
    let frames = 0;
    for (const [j, n] of plan) for (let i = 0; i < n; i++, frames++) { o.joy1 = 0x1f; o.joy2 = stick(j); o.runFrame(); }
    g.beforeLogic = () => { g.m.joy2 = read[B.length] ?? 0x1f; };
    g.afterLogic = () => { B.push(state(g.ram, g.m.colour)); };
    for (let f = 0; f < frames + 60 && B.length < A.length; f++) { g.m.joy1 = 0x1f; g.tick(); }
    runs++;
    const n = Math.min(A.length, B.length);
    if (n > 100 && A.slice(0, n).every((s, i) => s === B[i])) same++;
    if (o.ram[0xb1] & 0x80) {
      set++;
      // (once: the original's ending, on from there)
      if (!ending) for (let f = 0; f < 3000 && !ending; f++) { o.runFrame(); ending = o.ram[V.message] === 0x95; }
    } else {
      missed++;
      if (o.ram[0x0201] === 112 && o.ram[V.anim] === 0xb2) rowLower++;
    }
  }
  check(`landing on the pedestal, the port against the original: ${same}/${runs} runs the same every frame of logic`, same === runs);
  check(`  ... the mine set off in ${set}, not in ${missed} (standing a row lower, on the pedestal's body, in ${rowLower}): its top is floor only while it flashes 5 or 7`, set > 0 && missed > 0 && rowLower === missed);
  check('  ... and in the original the ending follows ("THE OPPRESSORS ARE DEFEATED")', ending);
}
{
  // the port on its own: come down onto the pedestal until the mine goes off (a miss: take off and try again)
  const p = new Play();
  p.hold('', 600, () => p.ram[0x92] >= 0x20 && p.ram[V.suitEnergy] >= 0x1f);
  p.ram[NEGATOR] = 0x80; p.ram[MINE] = 0x80;
  p.g.travelTo = { room: 0, x: 168, y: 64, high: 0 };
  p.hold('', 60, () => p.ram[V.room] === 0 && p.settled);
  let tries = 0;
  for (; tries < 8 && !(p.ram[0xb1] & 0x80); tries++) {
    p.hold('U', 40 + tries * 3, () => p.ram[0x0201] < 72 - tries); // (a little higher each time)
    p.hold('', 9);
    p.hold('D', 80, () => p.ram[V.anim] === 0xb2);
    p.hold('', 10);
  }
  check(`in the armour with the Implosion Mine, landed on the pedestal: it's set off (try ${tries}: ${p.about()})`, !!(p.ram[0xb1] & 0x80));
  const stops = p.hold('', 3000, () => !p.g.playing);
  check('  ... the ending: play stops', stops);
  check('  ... "THE OPPRESSORS ARE DEFEATED"', p.hold('', 1500, () => p.ram[V.message] === 0x95));
  check('  ... and fire goes back to the title', p.hold('F', 600, () => p.g.onTitle));
}

finish();
