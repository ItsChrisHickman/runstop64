/**
 * Blackwyche: climbing a ladder, as the browser runs it (keyboard through play.ts and the front
 * end): standing at the foot of a ladder, holding Up (in ORIGINAL and ENHANCED, with and without
 * Shift, which runs) takes him up into the cabin above, where he stays.
 *
 * The start is a save made on a recorded route (re/routes.json) the moment he has come down that
 * ladder, so continuing it from the title (ENTER CONTINUE) puts him there.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/ladder.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer, type KeyEventLike, type KeyTarget } from 'c64kit';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { MACHINE_CODEC, packSlot } from '../../shared/continue';
import { NativeHost } from '../../shared/native/host';
import { setJoy, GAMES } from '../../shared/native/test/games';
import { cpu, wr } from '../../shared/native/cpu';
import { keepFound, writeCurrent } from '../../shared/saves';
import { continueFromTitle } from '../../shared/test/continue-from-title';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { blackwycheMap } from '../src/map';
import { run } from '../src/main';
import { readRoute } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

const titleBytes = fs.readFileSync('games/blackwyche/assets/blackwyche-title.state');
stubFetch(titleBytes);

/**
 * The state at the foot of the ladder from deck 2's cabin $18 (C2.0.7) to deck 3's: a recorded route's end, travel to the
 * upper cabin, and down the ladder with Up held (the hole is behind him), until the climb is over (and what the map had found).
 */
function atLadderFoot() {
  const game = GAMES.blackwyche;
  const route = readRoute('games/blackwyche/re/routes.json');
  const g = new NativeHost(game.port, unpackState(new Uint8Array(titleBytes)));
  const found = blackwycheMap.found.empty();
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    const v = route[i];
    setJoy(g.m, game, v & 0x1f); g.m.keys = v & 32 ? [[1, 2]] : [];
    g.tick(); g.m.ram[0x9d77] = 100; g.m.ram[0x3417] = 0; frame++;
    if (g.lastWait === game.mainLoopWait && frame > 200) blackwycheMap.observe(g.m.ram, found, g.m.vic);
  }
  // travel to the cabin above, standing over the hole (where the climb up from the cabin below puts him)
  const h = NativeHost.resume(game.port, must(g.save(), 'a save'));
  let went: boolean | null = null, wasClimbing = false, foot: MachineState | null = null;
  h.onWait = (site) => {
    if (went !== null || site !== game.mainLoopWait) return;
    const regs = { ...cpu };
    went = blackwycheMap.go?.('C2.0.7', h.m.ram, found) ?? false;
    h.m.ram[0x341f] = 0x72; h.m.ram[0x3420] = 0x86; wr(0xd004, 0x72); wr(0xd005, 0x86);
    Object.assign(cpu, regs);
  };
  for (let f = 0; f < 600 && !foot; f++) {
    setJoy(h.m, game, 0x1e); h.tick(); h.m.ram[0x9d77] = 100;
    const climbing = h.m.ram[0x1ec7] === 2;
    if (wasClimbing && !climbing) foot = must(h.save(), 'a save');
    wasClimbing = climbing;
  }
  if (went !== true || !foot) throw new Error(`could not come down the ladder (went ${String(went)}, foot ${String(!!foot)}, climb ${h.m.ram[0x1ec7]}, deck ${h.m.ram[0x9d78]})`);
  return { state: foot, found };
}
const foot = atLadderFoot();

async function launch(enhanced: boolean) {
  const store = new Map<string, string>();
  useMemoryStorage(store);
  store.set('blackwyche.assist', JSON.stringify({ enhanced }));
  writeCurrent('blackwyche', packSlot(MACHINE_CODEC, foot.state, { at: 1, summary: ['LADDER'], rooms: 1 }));
  keepFound('blackwyche', foot.found);
  const listeners = new Map<string, ((e: KeyEventLike) => void)[]>();
  const target: KeyTarget = { addEventListener(type: string, fn: (e: KeyEventLike) => void) { listeners.set(type, [...(listeners.get(type) ?? []), fn]); } };
  const input = new Input(target);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const key = (type: 'keydown' | 'keyup', code: string) => { for (const fn of listeners.get(type) ?? []) fn({ code, repeat: false, metaKey: false, preventDefault() {} }); };
  const s = {
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    down(code: string) { key('keydown', code); },
    up(code: string) { key('keyup', code); },
    ram: () => must(p.machine, 'the machine').ram,
    where: () => { const r = s.ram(); return `deck ${r[0x9d78]} room ${r[0x341c]}`; },
    deck: () => s.ram()[0x9d78],
  };
  continueFromTitle(p, input, s.tick);
  s.tick(10);
  return s;
}

for (const enhanced of [false, true]) for (const shift of [false, true]) {
  const label = `${enhanced ? 'ENHANCED' : 'ORIGINAL'}${shift ? ' + Shift' : ''}`;
  const s = await launch(enhanced);
  const deck0 = s.deck();
  if (shift) s.down('ShiftLeft');
  s.down('ArrowUp');
  let up = -1, back = -1;
  const trace: string[] = [];
  for (let f = 0; f < 600; f++) { s.tick(); if (f % 20 === 0) trace.push(`${f}:${s.where()} c${s.ram()[0x1ec7]} y${s.ram()[0x3420]}`); if (up < 0 && s.deck() === deck0 - 1 && s.ram()[0x1ec7] === 0) up = f; else if (up >= 0 && back < 0 && s.deck() === deck0) back = f; }
  const end = s.deck();
  check(`${label}: holding Up at the foot of the ladder, he gets up to the deck above (frame ${up})`, up >= 0);
  if (enhanced) {
    check(`${label}: and stays there, the stick still up (deck ${deck0} -> ${end})`, end === deck0 - 1);
  }
  // (the original: the stick still up walks him into the hole behind him, back down the ladder)
  else console.log(`note ${label}: ${back >= 0 ? `back down the ladder at frame ${back}, as the original` : 'stays up'}`);
  if (up < 0 || (enhanced && end !== deck0 - 1)) console.log(trace.join(' '));
}

finish();
