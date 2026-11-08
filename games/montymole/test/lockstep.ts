/**
 * The rebuilt game (src/game.ts: Monty, the coal, the score, the objects, the six enemies of each room, the crusher, the retractable floor, the gates, the conveyors,
 * room 17's chain, the room 16 scene, the edges and death) against the original running on the headless Spectrum, every pass (test/lockstep-core.ts says what is
 * compared and how, and how the original's interrupt routine is called). The opening scene, the flow and the sound are later stages.
 *
 * Players: random ones (keys held for a few passes on the device the menu chose: keyboard, Kempston, Sinclair; with keys of other devices pressed too and contradictory
 * presses) from placements in every one of the 21 rooms: anywhere, in each of the states he can be in (standing, part way through a jump in each direction, falling
 * from each height), round each kind of cell (each colour the room's tiles have: floor, deadly, rope, the fourth class, and the tiles' own), round each piece of coal and
 * each object, with a tool beside each enemy, with some of the room's enemies made chasers (the data has none), taking the piece that makes 16, 32, 48 and 64 and
 * so opens a gate, jumping up out of room 17, and beside every way out of every room.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/lockstep.ts [random-passes-per-room] [placements-per-colour] [pass-limit-per-placement] [runs-per-way-out] [share]
 *
 * `share` (default 1) is the fraction of the fixed kinds of run kept (the chasers, the tools, the gates, the coal and the objects): the fast set plays a fifth of them, the slow set all.
 */
import { check, finish } from '../../../games/shared/test/check';
import { type Spectrum } from '../../../tools/zx/spectrum';
import { JUMP_ARC, STEP_PITCH_START } from '../src/data';
import { ROOMS } from '../src/data/rooms-data';
import { A, mulberry, Run, Tally } from './lockstep-core';
import { RandomPlayer, type Move } from './random-player';
import type { Control } from '../src/input';

const [randomArg = '1500', placementsArg = '3', limitArg = '80', edgeArg = '40', shareArg = '1'] = process.argv.slice(2);
const RANDOM_PASSES = Number(randomArg), PLACEMENTS = Number(placementsArg), PLACEMENT_PASSES = Number(limitArg), EDGE_RUNS = Number(edgeArg), SHARE = Number(shareArg);
/** How many of `n` runs of a fixed kind to play (at least one), and how many passes of `n` each. */
const some = (n: number): number => Math.max(1, Math.round(n * SHARE));
const lasting = (passes: number): number => Math.max(40, Math.round(passes * Math.sqrt(SHARE)));
const STATE = 'games/montymole/build/room0.state';

/** Where and how Monty starts a run: a place in a room, and one of the states he can be in. */
interface Placement {
  readonly room: number;
  readonly x: number;
  readonly y: number;
  /** 0 standing, 1 in a jump (`dir` the jump's direction + 1, `at` its pass), 2 falling (`fallen` the counter) */
  readonly kind: 0 | 1 | 2;
  readonly dir: number;
  readonly at: number;
  readonly fallen: number;
  /** which coal pieces are gone: those whose number i has `(13 i + gone) % 7 == 0` (a number above 6 means none) */
  readonly gone?: number;
  /** make some of the room's enemies chasers (state 1, a strength from the number): the data has none, the code has them */
  readonly chase?: number;
  /** he carries a tool (bit 3 of `$8D52`) */
  readonly tool?: boolean;
  /** exactly `count` pieces taken (the lowest numbers but not `piece`), so that taking `piece` makes the count a gate's */
  readonly exactly?: { readonly count: number; readonly piece: number };
}

/** The footstep's pitch after `at` passes of a jump, as the jump makes it. */
function pitchAfter(at: number): number {
  let low = STEP_PITCH_START & 255;
  for (let i = 0; i < at; i++) low = ((JUMP_ARC[i] ?? 0) >= 0 ? low + 1 : low - 1) & 255;
  return (STEP_PITCH_START & 0xff00) | low;
}

/** Put the original in room `p.room`, Monty at the place, in the state, and point it at the room's start. */
function place(m: Spectrum, p: Placement): void {
  const mem = m.mem;
  const w = (a: number, v: number): void => { mem[a] = v & 255; };
  w(A.room, p.room); w(A.x, p.x); w(A.y, p.y); w(A.arrival, p.x); w(A.arrival + 1, p.y);
  w(A.input, 4); w(A.flags, 0); w(A.flags2, 0); w(A.fallen, 0); w(A.jumpDir, 0); w(A.jumpCount, 0);
  const arc = 0x869c + (p.kind === 1 ? p.at : 0);
  w(A.arc, arc); w(A.arc + 1, arc >> 8);
  const pitch = p.kind === 1 ? pitchAfter(p.at) : 0x00fa;
  w(A.pitch, pitch); w(A.pitch + 1, pitch >> 8);
  if (p.kind === 1) {
    w(A.jumpDir, p.dir); w(A.jumpCount, p.at); w(A.flags, 2); w(A.facing, p.dir - 1);
    if (JUMP_ARC.slice(0, p.at).some((v) => v < 0)) w(A.flags2, 0x80);
  } else if (p.kind === 2) {
    w(A.flags, 1); w(A.flags2, 0x80); w(A.fallen, p.fallen);
  }
  if (p.exactly !== undefined) {
    let left = p.exactly.count;
    for (let i = 0; i < 64; i++) {
      const taken = i !== p.exactly.piece && left > 0 && left-- > 0;
      mem[A.coal + i] = taken ? (mem[A.coal + i] ?? 0) & 0x7f : (mem[A.coal + i] ?? 0) | 0x80;
    }
  }
  if (p.tool === true) mem[A.flags] = (mem[A.flags] ?? 0) | 8;
  if (p.gone !== undefined && p.gone < 7) for (let i = 0; i < 64; i++) if ((13 * i + p.gone) % 7 === 0) mem[A.coal + i] = (mem[A.coal + i] ?? 0) & 0x7f;
  if (p.chase !== undefined) {
    const base = 0x9a2a + p.room * 512 + 0x16c;
    for (let j = 0; j < 6; j++) {
      const record = ROOMS[p.room]?.enemies[j] ?? [];
      const sets = [1, 3, 5, 7].map((o) => (record[o] ?? 0) | ((record[o + 1] ?? 0) << 8));
      const drawable = sets.every((s) => s >= 0x6000 && s <= 0x7fe0); // (a chaser may turn any way: the others' junk pictures are memory the rebuilt game does not have)
      if (drawable && (j + p.chase) % 3 === 0 && (mem[base + j * 20] ?? 3) !== 3) { mem[base + j * 20] = 1; mem[base + j * 20 + 10] = (p.chase * 37 + j * 91) & 255; }
    }
  }
  m.cpu.pc = 0x940c;
  m.cpu.halted = false;
}

const tally = new Tally();
const t0 = Date.now();
const phases: { name: string; passes: number }[] = [];
const phase = (name: string, from: number): void => { phases.push({ name, passes: tally.passes - from }); };
const CONTROLS: readonly Control[] = [1, 1, 1, 2, 3];

function run(label: string, seed: number, p: Placement | null, passes: number, bias: Move | null = null): void {
  if (process.env.ONLY !== undefined && !label.includes(process.env.ONLY)) return; // (to look at one run)
  const rnd = mulberry(seed);
  const control = CONTROLS[Math.floor(rnd() * CONTROLS.length)] ?? 1;
  const r = new Run(tally, STATE, label, control, control === 2 || rnd() < 0.3, p === null ? undefined : (m) => place(m, p), { coal: true, object: true, enemies: true, crusher: true, floor: true, conveyors: true, room17: true, gate: true });
  if (process.env.TRACE !== undefined) {
    r.hooks.start = (mem) => console.log(`   start: original x ${mem[A.x]} y ${mem[A.y]} flags ${mem[A.flags]?.toString(16)} flags2 ${mem[A.flags2]?.toString(16)} jumpDir ${mem[A.jumpDir]} count ${mem[A.jumpCount]} fallen ${mem[A.fallen]} room ${mem[A.room]} lives ${mem[A.lives]} crusher ${Array.from(mem.subarray(A.crusher, A.crusher + 6)).join(',')}`);
    r.hooks.passEnd = (outcome, mem) => {
      const g = r.game;
      console.log(`   pass ${r.passes} ${outcome}: original x ${mem[A.x]} y ${mem[A.y]} flags ${mem[A.flags]?.toString(16)} flags2 ${mem[A.flags2]?.toString(16)} jumpDir ${mem[A.jumpDir]} count ${mem[A.jumpCount]} fallen ${mem[A.fallen]} room ${mem[A.room]} lives ${mem[A.lives]} input ${g.inputRead.toString(16)} crusher ${Array.from(mem.subarray(A.crusher, A.crusher + 6)).join(',')}`);
    };
  }
  r.play(new RandomPlayer(rnd, control, 0.15, bias), passes);
}

/** A random place in a room's reach, in a random state. */
function randomPlacement(room: number, rnd: () => number): Placement {
  const kind = rnd();
  return {
    room, x: 8 + 2 * Math.floor(rnd() * 108), y: 0x25 + Math.floor(rnd() * 0x84),
    kind: kind < 0.55 ? 0 : kind < 0.85 ? 1 : 2, dir: 1 + Math.floor(rnd() * 5), at: Math.floor(rnd() * 31), fallen: 2 * Math.floor(rnd() * 20),
  };
}

// ---- the runs ----------------------------------------------------------------------------------------------------------

let from = tally.passes;
for (let room = 0; room < ROOMS.length; room++) {
  const share = Math.ceil(RANDOM_PASSES / 10);
  for (let part = 0; part < 10; part++) {
    const rnd = mulberry(1000 * room + part + 7);
    run(`random room ${room}.${part}`, 1000 * room + part + 1, randomPlacement(room, rnd), share);
  }
}
phase('random players from random places in the 21 rooms', from);

// chasers: some of each room's enemies made to chase (the data's own never do), from places near them
from = tally.passes;
for (const room of ROOMS) {
  for (let k = 0; k < some(6); k++) {
    const rnd = mulberry(220000 + room.id * 10 + k);
    run(`chasers in room ${room.id} #${k}`, 220000 + room.id * 10 + k, { ...randomPlacement(room.id, rnd), kind: 0, gone: 7, chase: k }, lasting(150));
  }
}
phase('players among chasers', from);

// a tool in hand, set down beside the things that move: the tool kills what it touches
from = tally.passes;
for (const room of ROOMS) {
  const rnd = mulberry(230000 + room.id);
  room.enemies.forEach((e, j) => {
    if ((e[0] ?? 3) === 3 && (e[17] ?? 0) === 0) return;
    for (let k = 0; k < some(3); k++) {
      const x = Math.max(8, Math.min(0xe0, (e[12] ?? 0) + 2 * Math.floor(rnd() * 13) - 12)) & 0xfe;
      const y = Math.max(0x25, Math.min(0xa8, (e[13] ?? 0) + 2 * Math.floor(rnd() * 13) - 12)) | 1;
      run(`tool beside enemy ${j} of room ${room.id} #${k}`, 230000 + room.id * 100 + j * 10 + k, { room: room.id, x, y, kind: 0, dir: 1, at: 0, fallen: 0, gone: 7, tool: true, chase: k === 2 ? j : undefined }, lasting(80));
    }
  });
}
phase('players with a tool beside the enemies', from);

// the gates: exactly one piece short of 16, 32, 48 and 64, set down beside a piece in each gate's room (and in the rooms next to it)
from = tally.passes;
for (const [gateRoom, count] of [[6, 16], [11, 32], [15, 48], [20, 64]] as const) {
  for (const room of [gateRoom, gateRoom, gateRoom - 1, gateRoom + 1]) {
    const data = ROOMS[room];
    const piece = data?.coal.find((c) => c.col !== 0 || c.row !== 0);
    if (data === undefined || piece === undefined) continue;
    for (let k = 0; k < some(4); k++) {
      const rnd = mulberry(250000 + gateRoom * 100 + room * 10 + k);
      const x = Math.max(8, Math.min(0xe0, piece.col * 8 + 2 * Math.floor(rnd() * 9) - 8)) & 0xfe;
      const y = Math.max(0x25, Math.min(0xa8, 8 * (23 - piece.row) + 7 + 2 * Math.floor(rnd() * 9) - 8)) | 1;
      run(`gate ${count} from room ${room} #${k}`, 250000 + gateRoom * 100 + room * 10 + k, { room, x, y, kind: 0, dir: 1, at: 0, fallen: 0, exactly: { count: count - 1 + (room === gateRoom ? 0 : 0), piece: piece.id } }, lasting(90), k % 2 === 0 ? 'left' : 'right');
    }
  }
}
phase('players taking the piece that opens a gate', from);

// round each colour: the room's four classes and the colours of its tiles
from = tally.passes;
let colours = 0, segments = 0;
for (const room of ROOMS) {
  const rnd = mulberry(5000 + room.id);
  const wanted = new Set<number>([...room.classes, ...room.tiles.map((t) => t.attr)]);
  for (const attr of [...wanted].sort((a, b) => a - b)) {
    const cells: { col: number; row: number }[] = [];
    room.map.forEach((line, row) => { for (let col = 0; col < line.length; col++) if (room.tiles[Number(line.charAt(col))]?.attr === attr) cells.push({ col, row }); });
    if (cells.length === 0) continue;
    colours++;
    for (let k = 0; k < PLACEMENTS; k++) {
      const cell = cells[Math.floor(rnd() * cells.length)];
      if (cell === undefined) continue;
      // the cell's place in Monty's units: x is its column * 8, y counts up from the bottom (the room's rows are screen rows 2-21)
      const x = Math.max(8, Math.min(0xe0, cell.col * 8 + Math.floor(rnd() * 24) - 12));
      const y = Math.max(0x25, Math.min(0xa8, 8 * (23 - (cell.row + 2)) + 7 + Math.floor(rnd() * 24) - 12));
      const kind = rnd();
      run(`room ${room.id} colour $${attr.toString(16)} #${k}`, 70000 + room.id * 1000 + attr * 7 + k, {
        room: room.id, x: x & 0xfe, y, kind: kind < 0.5 ? 0 : kind < 0.8 ? 1 : 2, dir: 1 + Math.floor(rnd() * 5), at: Math.floor(rnd() * 31), fallen: 2 * Math.floor(rnd() * 20),
      }, PLACEMENT_PASSES);
      segments++;
    }
  }
}
phase(`${segments} placements round ${colours} colours of the rooms`, from);

// round each piece of coal and each room's object: Monty set down a few steps from them
from = tally.passes;
for (const room of ROOMS) {
  const rnd = mulberry(40000 + room.id);
  for (const piece of room.coal) {
    if (piece.col === 0 && piece.row === 0) continue;
    for (let k = 0; k < some(3); k++) {
      const x = Math.max(8, Math.min(0xe0, piece.col * 8 + 2 * Math.floor(rnd() * 13) - 12)) & 0xfe;
      const y = Math.max(0x25, Math.min(0xa8, 8 * (23 - piece.row) + 7 + 2 * Math.floor(rnd() * 17) - 16)) | 1;
      const kind = rnd();
      run(`coal ${piece.id} in room ${room.id} #${k}`, 150000 + piece.id * 10 + k, { room: room.id, x, y, kind: kind < 0.6 ? 0 : kind < 0.85 ? 1 : 2, dir: 1 + Math.floor(rnd() * 5), at: Math.floor(rnd() * 31), fallen: 2 * Math.floor(rnd() * 8), gone: 7 }, lasting(60), rnd() < 0.5 ? (['left', 'right', 'up', 'down'] as const)[Math.floor(rnd() * 4)] ?? null : null);
    }
  }
  if (room.object.sprite !== 0) {
    for (let k = 0; k < some(4); k++) {
      const x = Math.max(8, Math.min(0xe0, room.object.x + 2 * Math.floor(rnd() * 9) - 8)) & 0xfe;
      run(`object in room ${room.id} #${k}`, 160000 + room.id * 10 + k, { room: room.id, x, y: room.object.y, kind: 0, dir: 1, at: 0, fallen: 0, gone: Math.floor(rnd() * 8) }, lasting(50), k % 2 === 0 ? 'left' : 'right');
    }
  }
}
phase('players beside each piece of coal and each object', from);

// out of the top of room 17, where the room 16 scene brings Monty in (x $C0, y $A1): a jump straight up leaves by the gap and comes back through the scene
from = tally.passes;
for (let k = 0; k < 12; k++) run(`up out of room 17 #${k}`, 240000 + k, { room: 17, x: 0xc0, y: 0xa1, kind: k < 6 ? 1 : 0, dir: 1, at: k % 3, fallen: 0, gone: 7 }, 40, 'up');
phase('jumps up out of room 17', from);

// at the edges: starting beside each way out of each room, making for it (a quarter of the runs without a bias)
from = tally.passes;
const EDGES: readonly Move[] = ['left', 'right', 'down', 'up'];
for (const room of ROOMS) {
  const targets = [room.exits.left, room.exits.right, room.exits.down, room.exits.up];
  for (let edge = 0; edge < 4; edge++) {
    if (targets[edge] === room.id) continue;
    for (let k = 0; k < EDGE_RUNS; k++) {
      const rnd = mulberry(90000 + room.id * 1000 + edge * 100 + k);
      const base = randomPlacement(room.id, rnd);
      const p: Placement = { ...base, x: edge === 0 ? 4 + 2 * Math.floor(rnd() * 8) : edge === 1 ? 0xe0 + 2 * Math.floor(rnd() * 8) : base.x, y: edge === 2 ? 0x23 + Math.floor(rnd() * 12) : edge === 3 ? 0xa0 + Math.floor(rnd() * 12) : base.y };
      run(`edge ${edge} of room ${room.id} #${k}`, 90000 + room.id * 1000 + edge * 100 + k, p, 100, k < EDGE_RUNS * 3 / 4 ? EDGES[edge] ?? null : null);
    }
  }
}
phase('players beside each way out of every room', from);

// the ways out nothing has taken yet: Monty set down at every height beside them, in each state, making for them
from = tally.passes;
{
  const taken = (room: number, target: number): boolean => (tally.seen.get(`left room ${room} for ${target}`) ?? 0) > 0;
  for (const room of SHARE < 1 ? [] : ROOMS) { // (the sweeps are the slow set's: they are most of its time)
    const edges: [number, number][] = [[0, room.exits.left], [1, room.exits.right], [2, room.exits.down], [3, room.exits.up]];
    for (const [edge, target] of edges) {
      if (target === room.id || taken(room.id, target)) continue;
      // (the sides at every height, the top and the bottom at every column: a rope or a gap is where it is)
      const along = edge < 2 ? [0] : Array.from({ length: 29 }, (_, i) => 8 * (i + 2));
      for (let y = 0x25; y <= 0xa8 && !taken(room.id, target); y += edge < 2 ? 3 : 24) {
        for (const col of along) for (const kind of [0, 1, 2] as const) {
          if (taken(room.id, target)) break;
          const x = edge === 0 ? 4 : edge === 1 ? 0xe8 : col;
          run(`sweep edge ${edge} of room ${room.id} x ${x} y ${y} kind ${kind}`, 300000 + room.id * 1000 + y * 4 + kind + col, { room: room.id, x, y: edge === 2 ? 0x23 + (y % 12) : edge === 3 ? 0xa0 + (y % 12) : y, kind, dir: edge === 0 ? 3 : edge === 1 ? 4 : 1, at: 4, fallen: 8 }, 50, EDGES[edge] ?? null);
        }
      }
    }
  }
}
phase('sweeps beside the ways out not yet taken', from);

const seconds = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`   ${tally.passes} passes compared (${phases.map((p) => `${p.passes} ${p.name}`).join(', ')}) in ${seconds} s`);
console.log(`   ${tally.deaths} deaths, ${tally.roomChanges} room changes, ${tally.gameOvers} game overs, ${tally.beeps} footsteps`);
console.log(`   covered: ${[...tally.seen].sort().map(([k, n]) => `${k} ${n}`).join(', ')}`);
if (tally.diverged.size > 0) console.log(`   runs ended where the rebuilt game parts from the original on purpose: ${[...tally.diverged].join('; ')}`);
for (const f of tally.first) console.log(`   ${f.label} pass ${f.pass} room ${f.room}: ${f.what.join('; ')}`);
if (tally.byField.size > 0) console.log(`   differing: ${[...tally.byField].map(([k, n]) => `${k} ${n}`).join(', ')}`);
check(`the input byte: the rebuilt readInput equals what $82A6 made on every pass, on all three controls (${tally.inputMismatches} differ)`, tally.inputMismatches === 0);
check(`every pass: Monty's logic, the room, lives and arrival, the screen and attribute memory, the picture and attribute buffers, the footsteps and the outcome equal (${tally.mismatches} of ${tally.passes} passes differ)`, tally.mismatches === 0);
const need = ['falling', 'jumping', 'on a rope', 'landed', 'died', 'died falling', 'jump started', 'jump ended', 'walked off an edge', 'coal taken', 'object taken', 'tool used on an enemy', 'a chaser about', 'a relay about', 'thud', 'died: crusher', 'died: touch', 'died: cell', 'a gate opened', 'a gate row cleared', 'a conveyor', 'the chain', 'the floor moved'];
const missing = need.filter((n) => (tally.seen.get(n) ?? 0) === 0);
const ways: string[] = [];
for (const room of ROOMS) for (const target of [room.exits.up, room.exits.down, room.exits.left, room.exits.right]) if (target !== room.id) ways.push(`left room ${room.id} for ${target}`);
const notTaken = ways.filter((w) => (tally.seen.get(w) ?? 0) === 0);
check(`every way out of every room was taken in some run (${ways.length} of them${notTaken.length > 0 ? `; not taken: ${notTaken.join(', ')}` : ''}${SHARE < 1 ? '; a short run leaves the sweeps for the ones the edge runs miss to the full run' : ''})`, notTaken.length === 0 || (SHARE < 1 && ways.length - notTaken.length >= 20));
check(`every situation was met: ${need.join(', ')}, and every kind of way out (${tally.roomChanges} room changes)${missing.length > 0 ? `; not met: ${missing.join(', ')}` : ''}`, missing.length === 0 && tally.roomChanges > 0);
finish();
