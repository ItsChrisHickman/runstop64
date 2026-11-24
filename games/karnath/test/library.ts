/**
 * Karnath: the library's piece (re/README.md, "Found on the way": the library's piece), on the upper floor's top level (the $C800 half
 * of the $E100 block), from games/karnath/test/fixtures/library.state (Pendragon just come into the library, found by test/reach.ts's
 * walk). Taken without YEROBAS (spell 10) cast at it first, sprite 1 comes after him and takes it back ($CF01, $CB39); taken after it,
 * it stays carried ($321E). The port and the original agree on both from the same state. ENHANCED says so on the status line while it
 * is in view and guarded (none carried, YEROBAS not yet cast at it); ORIGINAL does not; played with the keys through the front end,
 * key 0, Space at it, then the take: it stays carried.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/library.ts
 */
import fs from 'node:fs';
import { C64, unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { stubFetch } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { LINES } from '../src/hint-lines';
import { KEPT, LIBRARY, libraryGuarded } from '../src/hints';
import { Session, alive, partsOf2, saysInOrder } from './session';

const game = must(GAMES.karnath, 'karnath in games.ts');
stubFetch(new Uint8Array(fs.readFileSync(game.title)));
const start = unpackState(new Uint8Array(fs.readFileSync('games/karnath/test/fixtures/library.state')));

const LEFT = 0x1f & ~4, UP = 0x1f & ~1, FIRE = 0x1f & ~16, NONE = 0x1f;
const YEROBAS = 10;

interface Rig { ram: Uint8Array; vic: Uint8Array; frame(joy: number): void }
const port = (state: MachineState): Rig => {
  const g = NativeHost.resume(game.port, state);
  return { ram: g.m.ram, vic: g.m.vic, frame: (joy) => { setJoy(g.m, game, joy); g.m.keys = []; g.tick(); alive(g.m.ram); } };
};
const original = (state: MachineState): Rig => {
  const m = new C64();
  m.loadState(state);
  return { ram: m.ram, vic: m.vic, frame: (joy) => { setJoy(m, game, joy); m.keys = []; m.runFrame(); alive(m.ram); } };
};
const run = (r: Rig, joy: number, n: number) => { for (let f = 0; f < n; f++) r.frame(joy); };
const heldFor = (r: Rig, frames: number) => { let kept = 0; for (let f = 0; f < frames && r.ram[KEPT.carrying] === 1; f++) { r.frame(NONE); kept++; } return kept; };

const outcome = new Map<string, string>();
for (const [who, make] of [['the port', port], ['the original', original]] as const) {
  const r0 = make(start);
  check(`${who}: the library (room ${r0.ram[0x3235]}), the upper floor's top level (mode ${r0.ram[KEPT.mode]}, level ${r0.ram[LIBRARY.level]}), the piece in view and guarded`, libraryGuarded(r0.ram, r0.vic) && r0.ram[0x3235] === 0x15);
  // taken as it is: under the piece, up the screen into it
  const plain = make(start);
  run(plain, LEFT, 100); run(plain, UP, 80);
  const tookPlain = plain.ram[KEPT.carrying] === 1, plainKept = heldFor(plain, 600);
  check(`${who}: taken without YEROBAS, its guardian takes it back (carried ${plainKept} frames, then $322F ${plain.ram[KEPT.carrying]}, $321E ${plain.ram[LIBRARY.taken]})`, tookPlain && plainKept < 600 && plain.ram[KEPT.carrying] === 0 && plain.ram[LIBRARY.taken] === 0);
  // YEROBAS at it first, then taken
  const bound = make(start);
  bound.ram[0x322c] = YEROBAS;
  run(bound, LEFT, 90); run(bound, UP, 60); run(bound, LEFT, 1); run(bound, FIRE, 3); run(bound, NONE, 60);
  const hit = bound.ram[LIBRARY.bound] === 1;
  run(bound, LEFT, 15); run(bound, UP, 80);
  const boundKept = heldFor(bound, 600);
  check(`${who}: YEROBAS at it (hit: ${hit}), then taken: it stays carried (${boundKept} of 600 frames, $321E ${bound.ram[LIBRARY.taken]})`, hit && boundKept === 600 && bound.ram[LIBRARY.taken] === 1);
  outcome.set(who, `${tookPlain}/${plainKept}/${hit}/${boundKept}/${bound.ram[LIBRARY.taken]}`);
}
check(`the port and the original agree (${[...outcome.values()].join(' | ')})`, new Set(outcome.values()).size === 1);

// ---- through the front end, as the browser runs it ----
const SAY = LINES.library;
const anyOf = (s: Session) => partsOf2(SAY).some((p) => s.texts().includes(p));
check(`the line fits the status line (every part at most 28 letters: ${partsOf2(SAY).join(' | ')}) and the narrator's queue`, partsOf2(SAY).every((p) => p.length <= 28) && (typeof SAY === 'string' || SAY.length <= 4));
{
  const s = await Session.launch(start, true);
  s.tick(900);
  check(`ENHANCED, in the library with the piece in view and guarded: "${partsOf2(SAY).join(' | ')}", in order`, saysInOrder(s.texts(), SAY));
  const n = s.texts().filter((t) => t === partsOf2(SAY)[0]).length;
  s.tick(600);
  check(`ENHANCED: said once, not again within 30 seconds (${n}, then ${s.texts().filter((t) => t === partsOf2(SAY)[0]).length})`, n === 1 && s.texts().filter((t) => t === partsOf2(SAY)[0]).length === 1);
  const o = await Session.launch(start, false);
  o.tick(900);
  check(`HARD: the same hints (${o.texts().join(' | ')})`, anyOf(o));
}
{
  // played with the keys: under the piece, up, key 0, Space at it; then into it
  const s = await Session.launch(start, true);
  const x = () => s.vic[4] | ((s.vic[0x10] & 4) << 6);
  s.hold(['ArrowLeft'], () => x() <= 213, 300);
  s.hold(['ArrowUp'], () => s.vic[5] <= 80, 200);
  s.hold(['Digit0'], () => false, 2);
  s.hold(['ArrowLeft'], () => false, 1);
  s.hold(['Space'], () => s.ram[LIBRARY.bound] === 1, 90);
  s.tick(60);
  const hit = s.ram[LIBRARY.bound] === 1, guarded = libraryGuarded(s.ram, s.vic);
  s.hold(['ArrowLeft'], () => s.ram[KEPT.carrying] === 1 || x() <= 193, 120);
  const took = s.hold(['ArrowUp'], () => s.ram[KEPT.carrying] === 1, 200);
  let kept = 0;
  for (let f = 0; f < 600 && s.ram[KEPT.carrying] === 1; f++) { s.tick(); kept++; }
  check(`ENHANCED, played with the keys (0, Space at the piece, then up into it): YEROBAS hits it (${hit}), the guarded line no longer applies (${!guarded}), it is taken (${took}) and stays carried (${kept} of 600 frames, $321E ${s.ram[LIBRARY.taken]})`,
    hit && !guarded && took && kept === 600 && s.ram[LIBRARY.taken] === 1);
}

finish();
