/**
 * Jet Set Willy II: no death loops (Chris: "re-enter Now You're In It from Hades and you die
 * instantly 5 times"). Hades (room 7) is only come into falling, from the hole in the floor of
 * Attack of the Mutant Dustybins (room 60), onto the skull, which kills. The original then starts
 * him again where the fall began, at the hole's edge in room 60, where he dies again at once (two
 * lives for one fall; checked here on the original's 6502 code too). Headless, through the front
 * end (games/shared/native/play.ts `safe`, c64kit stood in by games/shared/test/kit.ts):
 *
 * - the autosave is never in mid-air or where he dies: none in Hades, the last one stays room 60's;
 * - ENHANCED: the fall into Hades costs one life, and he's back at room 60's save, alive;
 * - ORIGINAL: the original's own rule (two lives, back at the hole's edge), the save still room 60's;
 * - B on the pause screen in Hades: back to room 60's save, alive;
 * - travel from Hades, in the fall, to the drain (Now You're In It): no life lost;
 * - CONTINUE? after the last life lost there: back in room 60, alive.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/deathloop.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { C64, unpackState } from '../../../packages/c64kit/src/c64/machine';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { readSaves } from '../../shared/saves';
import { must } from '../../shared/test/must';

const titleBytes = fs.readFileSync('games/jsw2/assets/jsw2-title.state');
stubFetch(titleBytes);

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const HADES = 7, BINS = 60, DRAIN = 138;
/** Where he stands on room 60's floor, right of the hole down to Hades (x, its high bit, y). */
const FLOOR: [number, number, number] = [150, 0, 158];
const livesOf = (b: number) => { let n = 0; for (; b; b >>= 1) n += b & 1; return n; };

/** A launch with its own storage (`store`: seeded, e.g. ORIGINAL chosen), a new game, then on room 60's floor (travel's way in). */
async function launch(store = new Map<string, string>()) {
  useMemoryStorage(store);
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 50));
  const ram = () => must(p.machine, 'the machine').ram;
  const s = {
    p, input, ram,
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    tap(code: string) { input.keyDown(code); s.tick(3); input.keyUp(code); s.tick(3); },
    room: () => ram()[0x13],
    lives: () => livesOf(ram()[0x8096]),
    saved: () => must(readSaves('jsw2').current, 'a save').summary[0],
    /** Ticks until `done` (at most `n`); whether it came. */
    until(done: () => boolean, n: number) { for (let i = 0; i < n && !done(); i++) s.tick(); return done(); },
  };
  s.tick(80); s.tap('Space'); s.tick(230);
  // (as travel goes: a spot there, picked)
  p.state.found.stand = { ...(p.state.found.stand ?? {}), [BINS]: FLOOR };
  p.frontEnd.going = String(BINS);
  s.tick(200);
  return s;
}
type Session = Awaited<ReturnType<typeof launch>>;
/** Left, into the hole: until he's in Hades. */
const intoHades = (s: Session) => { s.input.keyDown('ArrowLeft'); const ok = s.until(() => s.room() === HADES, 400); s.input.keyUp('ArrowLeft'); return ok; };
/** The save's summary: where (tidied short). */
const BINS_NAME = 'ATTACK OF THE MUTANT DUSTY';

// ---- ENHANCED: the fall into Hades ----
const e = await launch();
check(`on room 60's floor, its save kept ("${e.saved()}")`, e.room() === BINS && e.saved() === BINS_NAME);
check('left into the hole: Hades', intoHades(e));
e.tick(5);
check(`no autosave falling into Hades (the save: "${e.saved()}")`, e.saved() === BINS_NAME);
const before = e.lives();
e.tick(400);
check(`ENHANCED: the fall into Hades costs one life (${before} -> ${e.lives()}), back in room 60 (${e.room()}), alive 400 frames on`, e.lives() === before - 1 && e.room() === BINS && e.p.state.playing);
check(`ENHANCED: the save still room 60's ("${e.saved()}")`, e.saved() === BINS_NAME);

// ---- ORIGINAL: the original's own rule ----
const o = await launch(new Map([['jsw2.assist', JSON.stringify({ enhanced: false })]]));
check('ORIGINAL: left into the hole: Hades', !o.p.state.enhanced && intoHades(o));
const oBefore = o.lives();
o.tick(400);
check(`ORIGINAL: two lives (${oBefore} -> ${o.lives()}), back at the hole's edge in room 60 (${o.room()}, x ${o.ram()[0x8062]})`, o.lives() === oBefore - 2 && o.room() === BINS && o.ram()[0x8062] < 60);
check(`ORIGINAL: the save still room 60's ("${o.saved()}"), never Hades`, o.saved() === BINS_NAME);

// ---- the original itself (its 6502 code on c64kit's C64): the same two lives ----
{
  const m = new C64();
  m.loadState(unpackState(new Uint8Array(titleBytes)));
  m.hooks.set(0xea31, () => 'continue');
  let f = 0, going = false, placed = false;
  const step = m.cpu.step.bind(m.cpu);
  m.cpu.step = () => {
    if (m.cpu.pc === 0x4bae) {
      const r = m.ram;
      if (f >= 320 && !going) { going = true; r[0x816c] = BINS; r[0x8063] = 0xa2; r[0x82e4] = r[0x8292] = r[0x835d] = 0; } // (room 60 the game's own way in, as travel goes)
      else if (going && f >= 380 && r[0x13] === BINS && !placed) {
        placed = true;
        r[0x8062] = r[0x82a8] = r[0x82c0] = r[0x82d9] = FLOOR[0]; r[0x8063] = r[0x82a9] = FLOOR[2];
        r[0x82e4] = 0; r[0x82d7] = 0; r[0x8306] = 1;
      }
    }
    return step();
  };
  const livesSeen: number[] = [];
  for (; f < 1100; f++) {
    m.joy1 = 0x1f;
    m.joy2 = f >= 80 && f < 83 ? 0x0f : placed && f < 600 ? 0x1b : 0x1f; // (fire to start; left, into the hole)
    if (!m.runFrame()) throw new Error('the original stopped');
    if (placed && livesSeen[livesSeen.length - 1] !== livesOf(m.ram[0x8096])) livesSeen.push(livesOf(m.ram[0x8096]));
  }
  check(`the original: the fall into Hades costs two lives too (${livesSeen.join(' -> ')}), in room 60 (${m.ram[0x13]})`, livesSeen.join(' ') === '8 7 6' && m.ram[0x13] === BINS);
}

// ---- B on the pause screen, in Hades ----
const b = await launch();
intoHades(b);
b.tick(10);
b.tap('KeyP'); b.tap('KeyB');
const bLives = b.lives();
b.tick(300);
check(`B in Hades: back to room 60's save (${b.room()}), alive 300 frames on (lives ${bLives} -> ${b.lives()})`, b.room() === BINS && b.lives() === bLives);

// ---- travel from Hades, in the fall, to the drain ----
const t = await launch();
t.p.state.found.stand = { ...(t.p.state.found.stand ?? {}), [DRAIN]: [52, 1, 70] }; // (where he lands from the toilet)
intoHades(t);
t.tick(10);
const tLives = t.lives();
t.tap('KeyP');
t.p.frontEnd.going = String(DRAIN);
t.tap('KeyP');
t.tick(300);
check(`travel from Hades in the fall to the drain (${t.room()}): no life lost (${tLives} -> ${t.lives()})`, t.room() === DRAIN && t.lives() === tLives);

// ---- CONTINUE? after the last life lost in Hades (ORIGINAL: the original's rule, every life) ----
const c = await launch(new Map([['jsw2.assist', JSON.stringify({ enhanced: false })]]));
c.input.keyDown('ArrowLeft');
const over = c.until(() => !c.p.state.playing && c.p.state.prompt === 'continue', 6000);
c.input.keyUp('ArrowLeft');
check('ORIGINAL, left held: every life lost, CONTINUE? asked', over);
c.tap('Enter');
const cLives = c.lives();
c.tick(300);
check(`CONTINUE?: back in room 60 (${c.room()}), alive 300 frames on (lives ${cLives} -> ${c.lives()})`, c.p.state.playing && c.room() === BINS && c.lives() === cLives && cLives === 8);

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
