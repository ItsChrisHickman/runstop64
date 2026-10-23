/**
 * Study: what sprite 2 shows for one thing at a time (stand, walk each way, each action) from a state in a game, as runs of the
 * numbered pictures of the atlas (`atlas.ts`; "12x3" is picture 12 for three frames).
 *   nice -n 15 node tools/test.mjs games/shared/pendragon/study/scenario.ts <data dir> <game> [state number]
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../native/host';
import { GAMES, setJoy } from '../../native/test/games';
import { readRoutes } from '../../test/data';
import { must } from '../../test/must';
import { readPoses } from './draw';
import { entombedStates } from './states';

const [dir = '', gameId = '', pick = '0'] = process.argv.slice(2);
const game = must(GAMES[gameId], 'game');
const index = new Map(readPoses(`${dir}/${gameId}.json`).map((p) => [p.data, p.room]));

/** The action byte and its values, as each game's tests set it; what keeps him alive. */
const ACT: Record<string, { addr: number; values: Record<string, number>; keep(r: Uint8Array): void }> = {
  karnath: { addr: 0x322c, values: { spell1: 1, spell3: 3, spell5: 5 }, keep: (r) => { r[0x6ffe] = 100; } },
  entombed: { addr: 0x3215, values: { jump: 1, whip: 2, torch: 3 }, keep: (r) => { r[0x37f6] = 0; r[0x323e] = 0; r[0x323d] = 0; r[0x322e] = 1; r[0x322f] = 1; } },
  blackwyche: { addr: 0x3415, values: { jump: 1, sword: 2 }, keep: (r) => { r[0x9d77] = 100; r[0x342b] = 1; } },
  dragonskulle: { addr: 0x12eb, values: { jump: 4, stone: 3, shovel: 0, cloak: 1 }, keep: (r) => { r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; r[0x342f] = 1; r[0x3430] = 0; } },
};
const act = must(ACT[gameId], 'actions');
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;

function states(): MachineState[] {
  if (gameId === 'entombed') return entombedStates();
  const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
  const out: MachineState[] = [];
  const routes = readRoutes(`games/${gameId}/re/routes.json`);
  for (const route of routes.slice(0, 3)) {
    const g = new NativeHost(game.port, title);
    let f = 0;
    for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
      setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : [];
      g.tick(); act.keep(g.m.ram); f++;
      if (f % 1500 === 0) { const s = g.save(); if (s) out.push(s); }
    }
  }
  return out;
}

const start = must(states()[Number(pick)], `state ${pick}`);
const scenes: { name: string; joy: number; frames: number; action?: string }[] = [
  { name: 'stand', joy: 0, frames: 30 },
  { name: 'right', joy: RIGHT, frames: 50 }, { name: 'left', joy: LEFT, frames: 50 },
  { name: 'up', joy: UP, frames: 40 }, { name: 'down', joy: DOWN, frames: 40 },
  ...Object.keys(act.values).flatMap((a) => [
    { name: `${a} facing left`, joy: LEFT, frames: 6, action: a }, { name: `${a} fire`, joy: FIRE, frames: 50, action: a },
    { name: `${a} facing right`, joy: RIGHT, frames: 6, action: a }, { name: `${a} fire`, joy: FIRE, frames: 50, action: a },
  ]),
];
const g = NativeHost.resume(game.port, start);
for (const sc of scenes) {
  if (sc.action) must(act.values[sc.action], 'action') && (g.m.ram[act.addr] = must(act.values[sc.action], 'action'));
  const runs: string[] = [];
  let prev = -1, n = 0;
  for (let f = 0; f < sc.frames * Number(process.env.LONG ?? 1); f++) {
    setJoy(g.m, game, 0x1f & ~sc.joy); g.m.keys = [];
    g.tick(); act.keep(g.m.ram);
    const s = g.m.capture.sprites.find((x) => x.n === 2);
    const id = s ? index.get(Buffer.from(s.data.subarray(0, 63)).toString('hex')) ?? -2 : -1;
    if (id === prev) n++; else { if (n) runs.push(`${prev}x${n}`); prev = id; n = 1; }
  }
  runs.push(`${prev}x${n}`);
  console.log(`${sc.name.padEnd(18)} ${runs.join(' ')}`);
}
