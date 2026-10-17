/**
 * Shaking a room's state before a random player starts: what the scripts keep (counters, where their things are, how far a sequence
 * has got) is put somewhere else in the room's own story, and Monty near whatever matters there, so a random player meets the later
 * parts of the scripts (the exits, the sequences, the traffic) in the few hundred passes a run has. The original and the rebuilt
 * game both start from the shaken memory (test/lockstep-core.ts takes the rebuilt game's state from it), so the comparison is
 * as good as from any other state. Values stay inside what the game can have: a counter within its range, a frame among the
 * pictures the thing really shows, a position where the thing can be.
 */
import { A } from './lockstep-core';

type Rnd = () => number;
const pick = (rnd: Rnd, from: number, to: number): number => from + Math.floor(rnd() * (to - from + 1));
const oneOf = <T>(rnd: Rnd, list: readonly T[]): T => list[Math.floor(rnd() * list.length)];

/** Where each of the eight entity records is. */
const entity = (n: number): { x: number; y: number; frame: number; flags: number } => ({ x: 0x8121 + n * 4, y: 0x8122 + n * 4, frame: 0x8123 + n * 4, flags: 0x8124 + n * 4 });

/** Put Monty at x, y standing (or falling to what is below). */
function putMonty(mem: Uint8Array, x: number, y: number): void {
  mem[A.x] = Math.max(2, Math.min(0xee, x));
  mem[A.y] = Math.max(0, Math.min(0x78, y));
  mem[A.state] = 0;
  mem[A.phase] = 0;
}

/** Put Monty within `reach` pixels of a point. */
function nearMonty(mem: Uint8Array, rnd: Rnd, x: number, y: number, reach: number): void {
  putMonty(mem, x + pick(rnd, -reach, reach), y + pick(rnd, -reach, reach));
}

/** Take every item of the room, as if Monty had: the map cells turn to $F0-$F3, the records go, the count is 0. */
function takeItems(mem: Uint8Array): void {
  for (let i = 0; i < 8; i++) {
    const at = A.items + i * 4;
    const address = mem[at + 2] | (mem[at + 3] << 8);
    if (address === 0) continue;
    const cell = address - 0x5800;
    const room = mem[A.room];
    mem[0x6000 + room * 576 + cell] += 4;
    mem[address] = 0x47;
    mem[at + 2] = 0;
    mem[at + 3] = 0;
  }
  mem[A.itemsLeft] = 0;
}

function room0(mem: Uint8Array, rnd: Rnd): void {
  mem[0x9377] = pick(rnd, 0, 15);
  mem[0x9e19] = pick(rnd, 0, 0x17);
  if (rnd() < 0.7) {
    const e = entity(6);
    mem[e.x] = pick(rnd, 0x64, 0xdf); // (an entity at x $F0 or more on the bottom row would write past the original's redraw table, over its own code)
    mem[e.y] = oneOf(rnd, [0x10, 0x20, 0x40, 0x60, 0x70, 0x78]);
    mem[e.frame] = oneOf(rnd, [0x1c, 0x1c, 0x1d, 0x1e, 0x1f, 0xbf]);
  }
  if (rnd() < 0.5) takeItems(mem);
  if (rnd() < 0.6) nearMonty(mem, rnd, mem[entity(6).x], 0x78, 24);
}

function room1(mem: Uint8Array, rnd: Rnd): void {
  // how far the machines' sequence has got: each step full before the one it is at, none after it
  const steps = [0x68, 0x18, 0x58, 0x18, 0x58, 0x28]; // $94DF, $94E0, $94E3, $94E1, $94E4, $94E2
  const at = [0x94df, 0x94e0, 0x94e3, 0x94e1, 0x94e4, 0x94e2];
  const stage = pick(rnd, 0, 7);
  mem.fill(0, 0x94de, 0x94e5);
  if (stage < 6) {
    for (let i = 0; i < stage; i++) mem[at[i]] = steps[i];
    mem[at[stage]] = pick(rnd, 0, steps[stage] - 1);
  } else {
    for (let i = 0; i < 6; i++) mem[at[i]] = steps[i];
    mem[0x94de] = stage === 6 ? pick(rnd, 1, 0x63) : 0x64;
    if (stage === 7) {
      const o = entity(2);
      mem[o.x] = pick(rnd, 0x80, 0xf4) & 0xfe;
      mem[o.y] = pick(rnd, 0x18, 0x4e) & 0xfe;
      mem[o.frame] = 0x6f;
    }
  }
  if (rnd() < 0.5) takeItems(mem);
  if (stage === 7 && rnd() < 0.8) nearMonty(mem, rnd, mem[entity(2).x], mem[entity(2).y], 14);
  else if (stage >= 2 && stage <= 4 && rnd() < 0.6) nearMonty(mem, rnd, stage === 3 ? 0x3a : 0x66, 0x40, 14);
}

function room2(mem: Uint8Array, rnd: Rnd): void {
  const puzzle = oneOf(rnd, [0, 1, 5, 9, 10, 11, 30, 58, 59, 0x3c, 0x3c]);
  mem[0x9904] = puzzle;
  mem[0x9905] = rnd() < 0.5 ? 1 : 0;
  mem[0x98fe] = rnd() < 0.7 ? 0 : 0xff;
  mem[0x98ff] = oneOf(rnd, [0, 1, 0xff, 0x10, 0x40]);
  if (puzzle !== 0) {
    const a = entity(1), b = entity(2);
    mem[a.x] = 0x38; mem[a.y] = 0x38; mem[a.frame] = 0x6f;
    mem[b.x] = 0xb8; mem[b.y] = 0x39; mem[b.frame] = 0x6f;
    // the prize's halves: how far each has got (BF = not shown)
    const first = oneOf(rnd, [0xbf, 0x21, 0x22, 0x23, 0x24]);
    const second = first === 0x24 ? oneOf(rnd, [0xbf, 0x21, 0x22, 0x23, 0x24]) : 0xbf;
    const e4 = entity(4), e5 = entity(5);
    mem[e4.x] = 0xdc; mem[e4.y] = 0x70; mem[e4.frame] = first;
    mem[e5.x] = 0xdc; mem[e5.y] = 0x60; mem[e5.frame] = second;
    mem[0x97b4] = second === 0x24 && rnd() < 0.5 ? 1 : 0;
    const c = entity(3);
    if (mem[0x9905] !== 0) {
      mem[c.x] = pick(rnd, 0x9a, 0xdc) & 0xfe;
      mem[c.y] = oneOf(rnd, [0x80, 0x78, 0x70, 0x70]);
      mem[c.frame] = 0x20;
    }
    if (rnd() < 0.7) nearMonty(mem, rnd, 0xdc, 0x70, 40);
  } else if (rnd() < 0.5) {
    putMonty(mem, 0x2e, 0x38);
    if (rnd() < 0.5) mem[A.x] -= 2;
  }
}

function room3(mem: Uint8Array, rnd: Rnd): void {
  mem[0x9b1c] = oneOf(rnd, [0, 1, 0x40, 0x7f, 0xff, 0xff]);
  mem[0x9b1d] = oneOf(rnd, [0, 1, 0x14, 0xff, 0xff]);
  mem[0x9b1e] = oneOf(rnd, [0, 1, 0x28, 0xff, 0xff]);
  mem[0x9b1f] = oneOf(rnd, [0, 0, 1, 0x1e]);
  mem[0x9b20] = oneOf(rnd, [0, 0, 1, 2, 5, 9, 12, 13]);
  mem[0x9b21] = mem[0x9b20] !== 0 && rnd() < 0.5 ? 4 : 0;
  const car1 = entity(4), car2 = entity(5), post = entity(6);
  mem[car1.x] = pick(rnd, 0, 0xe4) & 0xfc; mem[car1.y] = 0x40; mem[car1.flags] = 0x80;
  mem[car2.x] = pick(rnd, 1, 0xe8); mem[car2.y] = 0x40; mem[car2.flags] = 0;
  mem[post.x] = 0x91; mem[post.y] = 0x78; mem[post.frame] = 0x4f;
  const r = rnd();
  if (r < 0.3) nearMonty(mem, rnd, 0x94, 0x78, 12); // at the lamp
  else if (r < 0.5) putMonty(mem, oneOf(rnd, [0x30, 0x40, 0x60, 0x94, 0xb4, 0xd0]), 8); // on the top lane
  else if (r < 0.65) putMonty(mem, oneOf(rnd, [0x2, 0x3, 0x4, 0xe8, 0xea, 0xec, 0xee]), oneOf(rnd, [8, 0x40, 0x78])); // at a lane's end
  if (mem[0x9b1c] === 0xff && rnd() < 0.5) { // the lorry on its way, with Monty held by it
    mem[A.state] = 3;
    for (let i = 1; i <= 3; i++) { const p = entity(i); mem[p.x] = (i - 1) * 16 + pick(rnd, 0, 0xc0); mem[p.y] = 8; mem[p.frame] = 0x14 + i; }
  }
}

function room4(mem: Uint8Array, rnd: Rnd): void {
  const open = oneOf(rnd, [0, 0, 1, 2, 50, 100]);
  mem[0x9c1a] = open;
  mem[0x9c1b] = oneOf(rnd, [0, 1, 0x28, 0x64]);
  const top = entity(1), ghost = entity(2), exit = entity(3);
  mem[top.frame] = oneOf(rnd, [0x24, 0x23, 0x22, 0x21, 0xbf, 0xbe]);
  mem[ghost.frame] = pick(rnd, 0x0a, 0x11);
  mem[exit.frame] = oneOf(rnd, [0xbf, 0x25, 0x26, 0x27, 0x28]);
  if (rnd() < 0.5 || open !== 0) takeItems(mem);
  if (rnd() < 0.7) nearMonty(mem, rnd, 0xb8, 0x30, 24);
}

function room5(mem: Uint8Array, rnd: Rnd): void {
  mem[0x9df2] = rnd() < 0.5 ? 1 : 0;
  const pile = entity(6), shop = entity(7);
  mem[pile.frame] = oneOf(rnd, [0x28, 0x27, 0x26, 0x25, 0xbf]);
  mem[shop.frame] = oneOf(rnd, [0xbf, 0x25, 0x26, 0x27]);
  for (let i = 0; i < 5; i++) { // the traffic: where each vehicle is
    const at = 0x9ddc + i * 4, v = entity(1 + i);
    const lane = pick(rnd, 0, 3) | (rnd() < 0.5 ? 0x80 : 0);
    mem[at + 1] = lane;
    mem[at + 2] = oneOf(rnd, [0x18, 0x52, 0x34]);
    const waiting = rnd() < 0.4;
    mem[at + 3] = waiting ? pick(rnd, 1, 8) : 0;
    if (!waiting) {
      mem[v.x] = pick(rnd, 0, 0xee);
      mem[v.y] = (lane & 0x80) !== 0 ? 0x60 - (lane & 3) * 8 : 0x28 + (lane & 3) * 8;
      mem[v.flags] = (lane & 0x80) !== 0 ? 0 : 0x80;
    } else mem[v.frame] = 0xbf;
  }
  const r = rnd();
  if (r < 0.35) nearMonty(mem, rnd, 0x10, 0x70, 20);
  else if (r < 0.6) nearMonty(mem, rnd, 0xd0, 0x26, 20);
}

export function shake(mem: Uint8Array, room: number, rnd: Rnd): void {
  switch (room) {
    case 0: room0(mem, rnd); break;
    case 1: room1(mem, rnd); break;
    case 2: room2(mem, rnd); break;
    case 3: room3(mem, rnd); break;
    case 4: room4(mem, rnd); break;
    case 5: room5(mem, rnd); break;
    default: throw new Error(`no room ${room}`);
  }
}

/**
 * A room's state put at its exit: the exit open and Monty near it (items left or not, so the exit either lets him through or kills
 * him), for the passes in which the way out is taken.
 */
export function shakeExit(mem: Uint8Array, room: number, rnd: Rnd): void {
  const items = rnd() < 0.5;
  if (!items) takeItems(mem);
  switch (room) {
    case 0: {
      const c = entity(6);
      mem[c.x] = pick(rnd, 0xd8, 0xde); mem[c.y] = 0x78; mem[c.frame] = oneOf(rnd, [0x1c, 0x1d, 0x1e, 0x1f, 0xbf]);
      nearMonty(mem, rnd, mem[c.x], 0x78, 20);
      break;
    }
    case 1: {
      room1(mem, rnd);
      mem.fill(0, 0x94de, 0x94e5);
      const steps = [0x68, 0x18, 0x58, 0x18, 0x58, 0x28];
      [0x94df, 0x94e0, 0x94e3, 0x94e1, 0x94e4, 0x94e2].forEach((a, i) => { mem[a] = steps[i]; });
      mem[0x94de] = 0x64;
      const o = entity(2);
      mem[o.x] = 0xec; mem[o.y] = pick(rnd, 0x30, 0x4c) & 0xfe; mem[o.frame] = 0x6f;
      nearMonty(mem, rnd, 0xec, mem[o.y], 16);
      break;
    }
    case 2: {
      mem[0x9904] = pick(rnd, 1, 0x3c);
      const a = entity(1), b = entity(2), e4 = entity(4), e5 = entity(5);
      mem.set([0x38, 0x38, 0x6f, 0], a.x); mem.set([0xb8, 0x39, 0x6f, 0], b.x);
      mem.set([0xdc, 0x70, 0x24, 0], e4.x); mem.set([0xdc, 0x60, 0x24, 0], e5.x);
      mem[0x97b4] = rnd() < 0.5 ? 1 : 0;
      nearMonty(mem, rnd, 0xdc, 0x68, 24);
      break;
    }
    case 3:
      putMonty(mem, pick(rnd, 0xe0, 0xea) & 0xfe, 0x78);
      mem[0x9b1c] = 0x7f;
      break;
    case 4: {
      mem[0x9c1a] = pick(rnd, 1, 100);
      const exit = entity(3);
      mem[exit.x] = 0xb8; mem[exit.y] = 0x30; mem[exit.frame] = 0x28;
      nearMonty(mem, rnd, 0xb8, 0x30, 24);
      break;
    }
    case 5: {
      mem[0x9df2] = 1;
      const shop = entity(7);
      mem[shop.frame] = oneOf(rnd, [0xbf, 0x25, 0x26, 0x27]);
      nearMonty(mem, rnd, 0xd0, 0x26, 24);
      break;
    }
    default: throw new Error(`no room ${room}`);
  }
}
