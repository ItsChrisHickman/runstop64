/**
 * Karnath: how the pentacle is finished (re/README.md, "How the game is won"), played in the port and in the
 * original (the C64 model running the game's own code) from the same state: Pendragon in Karn's abode, at the
 * far left of it, by the obelisk (sprite 6), carrying a piece of the pentacle. games/karnath/test/fixtures/
 * abode-obelisk.state is that moment (found by automatic play: Go-Explore through the abode).
 *
 *  - the abode's code runs on the memory it runs from: its spell handler ($6800, the abode's own second page, swapped
 *    in over the lower castle's by $12E1) was once translated from the title's layout, so the obelisk did nothing;
 *  - BARACATA (spell 7) at the obelisk with a piece carried: the piece is deposited ($322F 0, the count $6FFF one up,
 *    "PIECE OF PENTACLE DEPOSITED" on the status line); any other spell, or no piece carried, does nothing;
 *  - the sixteenth deposit shows the staff in its shrine; MENHIR (spell 5) at it wins ($6FFF $11, "THE STAFF OF KARNATH
 *    HAS BEEN DESTROYED... CONGRATULATIONS"); any other spell is his death ($6FFD).
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/pentacle.ts
 */
import fs from 'node:fs';
import { C64, unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { check, finish } from '../../shared/test/check';
import { readRoutes } from '../../shared/test/data';
import { LOW_SLOT, HIGH_SLOTS } from '../src/rooms';

const game = GAMES.karnath;
const fixture = unpackState(new Uint8Array(fs.readFileSync('games/karnath/test/fixtures/abode-obelisk.state')));

const UP = 0x1f & ~1, RIGHT = 0x1f & ~8, FIRE = 0x1f & ~16, NONE = 0x1f;

interface Rig { ram: Uint8Array; vic: Uint8Array; frame(joy: number): void }
const native = (state: MachineState): Rig => {
  const g = NativeHost.resume(game.port, state);
  return { ram: g.m.ram, vic: g.m.vic, frame: (joy) => { setJoy(g.m, game, joy); g.m.keys = []; g.tick(); g.m.ram[0x6ffe] = 100; g.m.ram[0x322e] = 0; } };
};
const original = (state: MachineState): Rig => {
  const m = new C64();
  m.loadState(state);
  return { ram: m.ram, vic: m.vic, frame: (joy) => { setJoy(m, game, joy); m.keys = []; m.runFrame(); m.ram[0x6ffe] = 100; m.ram[0x322e] = 0; } };
};
const rigs: [string, (s: MachineState) => Rig][] = [['the port', native], ['the original', original]];

/** Up to the obelisk, turn to it, cast; returns the memory after the cast has flown. */
function cast(rig: Rig, spell: number, pieces = 0, carrying = 1) {
  rig.ram[0x322c] = spell; rig.ram[0x6fff] = pieces; rig.ram[0x322f] = carrying;
  for (let f = 0; f < 80; f++) rig.frame(UP);
  for (let f = 0; f < 3; f++) rig.frame(RIGHT);
  for (let f = 0; f < 3; f++) rig.frame(FIRE);
  for (let f = 0; f < 60; f++) rig.frame(NONE);
}
const text = (rig: Rig) => Array.from(rig.ram.subarray(0x775, 0x775 + 28), (c) => (c === 0x20 ? ' ' : String.fromCharCode(64 + ((c - 0x40) & 0x3f)))).join('').replace(/\s+/g, ' ').trim();

for (const [who, make] of rigs) {
  let r = make(fixture);
  check(`${who}: the state is the abode, a piece carried, the count at 0`, r.ram[0x3219] === 0xfe && r.ram[0x322f] === 1 && r.ram[0x6fff] === 0);
  cast(r, 7, 0, 1);
  check(`${who}: BARACATA at the obelisk with a piece: deposited (carried ${r.ram[0x322f]}, count ${r.ram[0x6fff]})`, r.ram[0x322f] === 0 && r.ram[0x6fff] === 1);
  check(`${who}: the status line says so ("${text(r)}")`, text(r).includes('PIECE OF PENTACLE') && text(r).includes('DEPOSITED'));
  r = make(fixture); cast(r, 3, 0, 1);
  check(`${who}: another spell (KNOSSOS) at it does nothing (carried ${r.ram[0x322f]}, count ${r.ram[0x6fff]})`, r.ram[0x322f] === 1 && r.ram[0x6fff] === 0);
  r = make(fixture); cast(r, 7, 0, 0);
  check(`${who}: BARACATA with no piece carried does nothing (count ${r.ram[0x6fff]})`, r.ram[0x6fff] === 0);
  // the sixteenth: the staff in its shrine ($6E90: sprites 5, 6 and 7), and the last spell
  r = make(fixture); cast(r, 7, 15, 1);
  check(`${who}: the sixteenth piece: the count is 16 and the shrine's sprites are on (VIC $D015 ${r.vic[0x15].toString(16)})`, r.ram[0x6fff] === 0x10 && (r.vic[0x15] & 0xe0) === 0xe0);
  for (const [spell, wins] of [[5, true], [3, false]] as const) {
    let q = make(fixture); cast(q, 7, 15, 1);
    q.ram[0x322c] = spell;
    for (let f = 0; f < 120; f++) q.frame(f < 3 ? FIRE : NONE);
    if (wins) check(`${who}: MENHIR at the staff: the game is won ($6FFF ${q.ram[0x6fff].toString(16)}, "${text(q)}")`, q.ram[0x6fff] === 0x11 && q.ram[0x6ffd] === 0 && text(q).includes('DESTROYED'));
    else check(`${who}: any other spell at the staff is his death ($6FFD ${q.ram[0x6ffd]})`, q.ram[0x6ffd] === 1 && q.ram[0x6fff] === 0x10);
  }
}

// ---- the translations match the memory they run from, in every place the routes reach and in the abode ----
const routes = readRoutes('games/karnath/re/routes.json');
let versions = 0, mismatches = 0;
const matches = (ram: Uint8Array, runs: [number, string][]) => runs.every(([a, hex]) => { for (let k = 0; k < hex.length; k += 2) if (ram[a + k / 2] !== parseInt(hex.slice(k, k + 2), 16)) return false; return true; });
const states: MachineState[] = [fixture];
for (const route of routes) {
  const g = new NativeHost(game.port, unpackState(new Uint8Array(fs.readFileSync(game.title))));
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    const v = route[i];
    setJoy(g.m, game, v & 0x1f); g.m.keys = v & 32 ? [[1, 2]] : []; g.tick(); g.m.ram[0x6ffe] = 100; g.m.ram[0x322e] = 0;
    if (++frame % 400 === 0 && g.lastWait === game.port.mainLoopWait) { const s = g.save(); if (s) states.push(s); }
  }
}
for (const s of states) {
  for (const [slot, entry] of [[LOW_SLOT, 'r_6000'], [HIGH_SLOTS, 'r_c000']] as const) for (const v of slot) {
    const runs = v.code[entry] ?? v.code[entry === 'r_6000' ? 'r_6003' : 'r_c003'];
    if (!runs || !matches(s.ram, runs)) continue; // (not the version loaded)
    versions++;
    for (const rr of Object.values(v.code)) if (!matches(s.ram, rr)) mismatches++;
  }
}
check(`every routine of the version loaded is translated from the bytes it runs from (${versions} versions in ${states.length} states, ${mismatches} routines differ)`, versions > 20 && mismatches === 0);

finish();
