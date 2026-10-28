/**
 * Karnath: the piece in the spider's web (re/README.md, "The web piece"), played in the port and in the original (the C64
 * model running the game's own code) from the same state: level 3 of the lower castle, the storeroom's side of it.
 *
 *  - the piece hangs in the web in the level's last room (sprite 4, y $60); the spider, sprite 7, hangs on its thread at the
 *    far left of the level, two rooms away, and is not on the screen until the view scrolls there ($D015 bit 7);
 *  - IBRAHIM (spell 8) touching the spider, and nothing else ($321A = $88), lets the piece fall to the floor (sprite 4, y $B0,
 *    $CFA1 set) while no piece is carried ($CD2F, $CD4C): any other spell does nothing, and with a piece carried the spell is
 *    wasted (the piece stays up); then walking into it takes it ($3221, $322F);
 *  - the port and the original agree on every one of those;
 *  - ENHANCED says so on the status line when the piece (or the spider) is in view and marks the spider with a sparkle;
 *    ORIGINAL shows neither (through the front end, as the browser runs it).
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/web.ts
 */
import fs from 'node:fs';
import { C64, unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { stubFetch } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { readRoute } from '../../shared/test/data';
import { routeWalker } from '../../shared/test/route-walker';
import { LINES } from '../src/hint-lines';
import { KEPT, WEB, hintSpots, webHeld, webView } from '../src/hints';
import { Session, alive, partsOf2, saved, saysInOrder } from './session';

const game = must(GAMES.karnath, 'karnath in games.ts');
const title = new Uint8Array(fs.readFileSync(game.title));
stubFetch(title);

const LEFT = 0x1f & ~4, RIGHT = 0x1f & ~8, FIRE = 0x1f & ~16, NONE = 0x1f;
const IBRAHIM = 8, KNOSSOS = 3;
/** The route's frame where he has just come into level 3 (the storeroom's side), and stands at the far right of the view. */
const START = 3747;
/** The spider hangs between y 97 and 159: a spell cast at the height of his feet reaches it when it is this low. */
const LOW = 152;

interface Rig { ram: Uint8Array; vic: Uint8Array; frame(joy: number): void; save(): MachineState | null }
/** The game's translation, played by the port's host. */
const port = (state: MachineState): Rig => {
  const g = NativeHost.resume(game.port, state);
  return { ram: g.m.ram, vic: g.m.vic, frame: (joy) => { setJoy(g.m, game, joy); g.m.keys = []; g.tick(); alive(g.m.ram); }, save: () => g.save() };
};
/** The game's own code, run by the C64 model. */
const original = (state: MachineState): Rig => {
  const m = new C64();
  m.loadState(state);
  return { ram: m.ram, vic: m.vic, frame: (joy) => { setJoy(m, game, joy); m.keys = []; m.runFrame(); alive(m.ram); }, save: () => null };
};
const rigs: [string, (s: MachineState) => Rig][] = [['the port', port], ['the original', original]];

const start = routeWalker({ port: game.port, title, routes: 'games/karnath/re/routes.json', route: 0, cheat: alive }).at(START);

const spiderOn = (r: Rig) => (r.vic[0x15] & 0x80) !== 0;
const pieceY = (r: Rig) => r.vic[9];
/** Run `n` frames of the same key. */
const run = (r: Rig, joy: number, n: number) => { for (let f = 0; f < n; f++) r.frame(joy); };
/** From the start: to the far left of the level, where the spider hangs (his feet at the floor's front, the spell in hand). */
const atSpider = (make: (s: MachineState) => Rig, spell: number, carrying = 0) => {
  const r = make(start);
  run(r, LEFT, 220);
  run(r, RIGHT, 1); // (turned to face the spider)
  r.ram[0x322c] = spell;
  r.ram[KEPT.carrying] = carrying;
  return r;
};
/** Cast at the spider each time it is low and no spell is flying, for up to `frames`: did the game see the spell touch it, and nothing else? */
function cast(r: Rig, frames = 700) {
  let touched = -1;
  for (let f = 0; f < frames && touched < 0; f++) {
    r.frame(r.ram[0x3216] !== 1 && r.vic[15] === LOW ? FIRE : NONE);
    if (r.ram[0xcfcd] === 1) touched = f;
  }
  return touched;
}

// (the original run from a save of the port has no timer interrupts, so how long the piece lies there is read from the port, whose clock
// is the original's: from the title, the first 1500 frames of the recorded route, the jiffy clock $A0-$A2 is the same in both)
{
  const steps = readRoute('games/karnath/re/routes.json', 0);
  const state = unpackState(title);
  const g = new NativeHost(game.port, state);
  const m = new C64();
  m.loadState(state);
  let frame = 0, differs = 0;
  const clock = (r: Uint8Array) => [r[0xa0], r[0xa1], r[0xa2]].join(':');
  for (let i = 0; i < steps.length && frame < 1500; i += 2) for (let k = 0; k < steps[i + 1] && frame < 1500; k++, frame++) {
    const v = steps[i];
    setJoy(g.m, game, v & 0x1f); g.m.keys = v & 32 ? [[1, 2]] : []; g.tick(); alive(g.m.ram);
    setJoy(m, game, v & 0x1f); m.keys = v & 32 ? [[1, 2]] : []; m.runFrame(); alive(m.ram);
    if (frame % 50 === 0 && clock(g.m.ram) !== clock(m.ram)) differs++;
  }
  check(`the port's jiffy clock ($A0-$A2: the game times the web's piece by it) is the original's from the title, ${frame} frames of the recorded route (${differs} samples differ; now ${clock(g.m.ram)} and ${clock(m.ram)})`, differs === 0 && clock(g.m.ram) === clock(m.ram));
}
const outcome = new Map<string, string>();
for (const [who, make] of rigs) {
  // where he is, and what the game shows there
  const r0 = make(start);
  check(`${who}: level 3 of the lower castle (mode ${r0.ram[KEPT.mode]}, level ${r0.ram[WEB.level]}, room ${r0.ram[0x3235]}), the piece held up in the web (sprite 4 at y $${pieceY(r0).toString(16)}), the spider not on the screen yet (sprite 7 on: ${spiderOn(r0)})`,
    webHeld(r0.ram, r0.vic) && pieceY(r0) === 0x60 && !spiderOn(r0));
  const far = atSpider(make, IBRAHIM);
  check(`${who}: at the far left of the level the spider hangs on its thread (sprite 7 on, x ${far.vic[14]}, y ${far.vic[15]}), and the piece is still up (y $${pieceY(far).toString(16)})`, spiderOn(far) && far.vic[14] === 88 && pieceY(far) === 0x60);

  // another spell does nothing; with a piece carried the spell is wasted
  const wrong = atSpider(make, KNOSSOS);
  const wrongTouched = cast(wrong);
  check(`${who}: KNOSSOS at the spider: nothing happens (touched ${wrongTouched}, the piece at y $${pieceY(wrong).toString(16)}, freed ${wrong.ram[WEB.freed]})`, wrongTouched < 0 && pieceY(wrong) === 0x60 && wrong.ram[WEB.freed] === 0);
  const busy = atSpider(make, IBRAHIM, 1);
  const busyTouched = cast(busy);
  check(`${who}: IBRAHIM at the spider with a piece carried: the game sees the spell touch it (frame ${busyTouched}) but the piece stays up (y $${pieceY(busy).toString(16)}, freed ${busy.ram[WEB.freed]})`, busyTouched >= 0 && pieceY(busy) === 0x60 && busy.ram[WEB.freed] === 0);

  // IBRAHIM with none carried lets it fall; walking into it takes it
  const r = atSpider(make, IBRAHIM);
  const touched = cast(r);
  run(r, NONE, 10);
  const freedAt = pieceY(r);
  check(`${who}: IBRAHIM at the spider, none carried: the piece is let go (touched at frame ${touched}, sprite 4 at y $${freedAt.toString(16)}, $CFA1 ${r.ram[WEB.freed]})`, touched >= 0 && freedAt === 0xb0 && r.ram[WEB.freed] !== 0);
  let took = -1;
  for (let f = 0; f < 1600 && took < 0; f++) { r.frame(RIGHT); if (r.ram[WEB.taken] === 1) took = f; }
  check(`${who}: walked on to the web's room, the piece is taken (frame ${took}: $3221 ${r.ram[WEB.taken]}, carrying ${r.ram[KEPT.carrying]}, room ${r.ram[0x3235]})`, took > 0 && r.ram[KEPT.carrying] === 1);
  outcome.set(who, `${touched >= 0}/${freedAt}/${took > 0}/${r.ram[KEPT.carrying]}/${wrongTouched < 0}/${busyTouched >= 0}`);
}
// how long it lies on the floor: until the game's clock ($A1, which the CIA's timer ticks 1.2 times a frame) has gone round four times
{
  const r = atSpider(port, IBRAHIM);
  const touched = cast(r);
  let back = -1;
  for (let f = 0; f < 2000 && back < 0; f++) { r.frame(NONE); if (pieceY(r) === WEB.hung) back = f; }
  check(`the piece falls for a while only: it is back up in the web ${back} frames after the spider is hit (at frame ${touched}), between 640 and 860 (four turns of $A1)`, touched >= 0 && back >= 640 && back <= 860);
}
check(`the port and the original agree on all of it (${[...outcome.values()].join(' | ')})`, new Set(outcome.values()).size === 1);

// ---- through the front end, as the browser runs it: walked in with the arrow keys, the line said as the piece (or the spider) comes into view ----
/** The port's state `back` frames before `until` first holds, `joy` held from `from`. */
function before(from: MachineState, joy: number, until: (r: Rig) => boolean, back: number): MachineState {
  const probe = port(from);
  let at = -1;
  for (let f = 0; f < 1600 && at < 0; f++) { probe.frame(joy); if (until(probe)) at = f; }
  if (at < back) throw new Error('not seen in view');
  const r = port(from);
  run(r, joy, at - back);
  return must(r.save(), 'a save before it comes into view');
}
const roomBefore = before(start, RIGHT, (r) => webView(r.ram, r.vic) === 'piece', 40);
const spiderBefore = before(start, LEFT, (r) => webView(r.ram, r.vic) === 'spider', 40);

const SAY = { web: LINES.web, carrying: LINES.webCarrying, spider: LINES.spider };
const TICKS = 1500;
/** A launched game over a state, a key held until `view` is in view, then played a while with nothing pressed. */
const walk = async (state: MachineState, key: string, view: 'piece' | 'spider', enhanced: boolean) => {
  const s = await Session.launch(state, enhanced);
  s.hold([key], () => webView(s.ram, s.vic) === view, 400);
  s.tick(TICKS);
  return s;
};
const said = (s: Session, lines: string | readonly string[]) => saysInOrder(s.texts(), lines);
const anyOf = (s: Session, lines: string | readonly string[]) => partsOf2(lines).some((p) => s.texts().includes(p));

{
  const s = await walk(roomBefore, 'ArrowRight', 'piece', true);
  const spots = hintSpots(s.ram, s.vic), markers = s.renderer.sparkles.markers;
  check(`ENHANCED, the web's piece coming into view, none carried: the status line says where the spider is and how to free it (${partsOf2(SAY.web).join(' | ')}), in order`, said(s, SAY.web));
  check(`ENHANCED: ...and marks the piece (${markers.length} sparkles, the hints' ${spots.length})`, markers.length === spots.length && spots.length >= 1);
  check(`the lines fit the status line (every part at most 28 letters) and the narrator's queue (at most four texts each)`, [SAY.web, SAY.carrying, SAY.spider].every((l) => partsOf2(l).every((p) => p.length <= 28) && (typeof l === 'string' || l.length <= 4)));
  const o = await walk(roomBefore, 'ArrowRight', 'piece', false);
  check(`ORIGINAL: the same walk shows the game's lines only (${o.texts().join(' | ')}) and no sparkle (${o.renderer.sparkles.markers.length})`, !anyOf(o, SAY.web) && o.renderer.sparkles.markers.length === 0);
  const c = await walk(saved((ram) => { ram[KEPT.carrying] = 1; }, roomBefore), 'ArrowRight', 'piece', true);
  check(`ENHANCED, a piece already carried: "${partsOf2(SAY.carrying).join(' | ')}" instead, not how to cast at the spider (${anyOf(c, SAY.web)})`, said(c, SAY.carrying) && !anyOf(c, SAY.web));
  // (continued with the piece in view: said as the game begins again, once)
  const inView = port(roomBefore);
  run(inView, RIGHT, 80);
  const k = await Session.launch(must(inView.save(), 'a save with the piece in view'), true);
  k.tick(TICKS);
  check(`ENHANCED, a game continued with the piece in view says it at once (${k.texts().slice(0, 3).join(' | ')})`, said(k, SAY.web));
}
{
  const s = await walk(spiderBefore, 'ArrowLeft', 'spider', true);
  const spot = hintSpots(s.ram, s.vic), markers = s.renderer.sparkles.markers;
  const view = webView(s.ram, s.vic);
  check(`ENHANCED, the spider coming into view (${view}): the line (${partsOf2(SAY.spider).join(' | ')}) and a sparkle on the spider (${markers.length} sparkles, ${spot.length} spots)`, view === 'spider' && said(s, SAY.spider) && markers.length === 1 && spot.length === 1);
  const o = await walk(spiderBefore, 'ArrowLeft', 'spider', false);
  check(`ORIGINAL: no line (${anyOf(o, SAY.spider)}) and no sparkle (${o.renderer.sparkles.markers.length}) at the spider`, !anyOf(o, SAY.spider) && o.renderer.sparkles.markers.length === 0);
  // the spider hit: the piece lets go, and the spider's mark and line go
  const r = port(spiderBefore);
  run(r, LEFT, 180);
  run(r, RIGHT, 1);
  r.ram[0x322c] = IBRAHIM;
  const hit = cast(r);
  run(r, NONE, 10);
  const f = await Session.launch(must(r.save(), 'a save with the piece let go'), true);
  f.tick(120); // (the piece falls for a while only: see above)
  check(`ENHANCED, once the piece is let go (frame ${hit}) the spider is no longer marked (${hintSpots(f.ram, f.vic).length} spots) and no line of the web's is said (${anyOf(f, SAY.spider) || anyOf(f, SAY.web)})`, hit >= 0 && !webHeld(f.ram, f.vic) && !anyOf(f, SAY.spider) && !anyOf(f, SAY.web));
}
{
  // played as a player does, with the keys: to the spider, key 8, Space when it hangs low, then Shift and the arrow to the web
  const s = await Session.launch(spiderBefore, true);
  s.hold(['ArrowLeft'], () => false, 200);
  s.hold(['ArrowRight'], () => false, 1);
  s.hold(['Digit8'], () => false, 2);
  let touched = -1;
  for (let f = 0; f < 700 && touched < 0; f++) {
    if (s.ram[0x3216] !== 1 && s.vic[15] === LOW) s.hold(['Space'], () => false, 2); else s.tick();
    if (s.ram[0xcfcd] === 1) touched = f;
  }
  const dropped = s.vic[9] === 0xb0;
  const took = s.hold(['ArrowRight', 'ShiftLeft'], () => s.ram[WEB.taken] === 1, 900);
  s.tick(900);
  const t = s.texts();
  check(`ENHANCED, played with the keys (8, Space at the spider, Shift and right): the spell touches the spider (frame ${touched}), the piece falls (${dropped}) and is taken (${took}) in ${s.frames} frames, the game's own FOUND line and the story after it (${t.slice(-5).join(' | ')})`,
    touched >= 0 && dropped && took && s.ram[KEPT.carrying] === 1 && saysInOrder(t, LINES.first, t.indexOf('PIECE OF PENTACLE FOUND') + 1));
}

finish();
