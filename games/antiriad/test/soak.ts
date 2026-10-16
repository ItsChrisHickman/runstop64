/**
 * The port on its own for a long while, from power-on, with a random player (fire often, so
 * games start and end): it must not stop or throw, and it should get about. Reports the rooms
 * seen, deaths, games played.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/soak.ts [frames] [seed]
 */
import { Game } from '../src/game';
import { roomName } from '../src/map';
import { V } from '../src/vars';

const frames = Number(process.argv[2] ?? 30000);
let r = Number(process.argv[3] ?? 1) || 1;
const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
const g = new Game();
const rooms = new Set<number>();
let games = 0, wasPlaying = false, joy = 0x1f, hold = 0;
for (let f = 0; f < frames; f++) {
  if (hold-- <= 0) { joy = 0x1f & ~Math.floor(rnd() * 32); hold = 10 + Math.floor(rnd() * 60); }
  g.m.joy2 = joy;
  g.tick();
  if (g.playing && !wasPlaying) games++;
  wasPlaying = g.playing;
  if (g.playing) rooms.add(g.ram[V.room]);
}
console.log(`${frames} frames: ${games} games, rooms seen ${rooms.size}: ${[...rooms].map(roomName).join(' ')}; now ${g.playing ? 'playing' : 'title'}`);
