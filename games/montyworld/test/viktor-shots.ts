/**
 * Viktor Vole in play as the real engine draws him (multicolour: art/viktor.ts `VIKTOR_WALK`, `VIKTOR_CAMEO`): Moscow's platform and the Great Wall (his border cameos, stopped at the brink), and the cargo
 * ship (the pursuer on Monty's trail), each the whole picture and a close-up of him four times the size. Pictures only: nothing is checked (viktor.ts plays the cameos and the chases).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/viktor-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { newGame } from '../../shared/monty/test/bot';
import { WORLD } from '../src/data';
import { CHI } from '../src/china';
import { ROOM } from '../src/moscow';
import { PAC } from '../src/pacific';
import { SIB } from '../src/siberia';
import { savePng, settle, shot, standing, W } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: viktor-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

/** The picture, and a close-up of sprite `n` (a box round it, four times the size). */
function save(name: string, g: Game, n: number) {
  const px = shot(g);
  savePng(out ?? '.', `viktor-${name}.png`, px);
  const sp = g.vic.sprites[n];
  if (!sp) return;
  // (the picture's 320 x 200 starts at the VIC's sprite x 24, y 50)
  const x0 = Math.max(0, Math.min(W - 64, sp.x - 24 - 20)), y0 = Math.max(0, Math.min(200 - 48, sp.y - 50 - 14));
  const crop = new Uint8Array(64 * 48);
  for (let y = 0; y < 48; y++) crop.set(px.subarray((y0 + y) * W + x0, (y0 + y) * W + x0 + 64), y * 64);
  rgbPng(path.join(out ?? '.', `viktor-${name}-close.png`), indicesToRgb(crop), 64, 48, 6);
}

const at = (g: Game, col: number, floor: number) => { const p = standing(col, floor); g.x2 = p.x2; g.y = p.y; };

/** A border cameo: Monty in from the room before, past its box (or left to drop out of it: Moscow's, null); the picture once Viktor is stopped at the brink. */
function cameo(name: string, from: number, room: number, entry: { col: number; floor: number }, past: { col: number; floor: number } | null) {
  const c = WORLD.cameos.find((k) => k.room === room);
  if (!c) throw new Error(`no cameo in room ${room}`);
  const s: State = newGame(WORLD, true);
  s.g.graceActive = () => true;
  enterRoom(s.g, from, standing(4, 18).x2, standing(4, 18).y);
  const e = standing(entry.col, entry.floor);
  enterRoom(s.g, room, e.x2, e.y);
  settle(s);
  for (let f = 0; f < 40; f++) frame(s, NONE);
  for (let f = 0; f < 260; f++) { if (past) at(s.g, past.col, past.floor); frame(s, NONE); }
  save(name, s.g, c.sprite);
}

cameo('moscow', ROOM.kremlin, ROOM.station, { col: 16, floor: 3 }, null);
cameo('china', SIB.border, CHI.wall, { col: 1, floor: 17 }, { col: 16, floor: 17 });

// the ship: off the landing he wakes and walks Monty's trail behind him; Monty walks on east along the deck, and stops
{
  const chase = WORLD.pursuers.find((p) => p.room === PAC.ship);
  if (!chase) throw new Error('no pursuer on the ship');
  const s = newGame(WORLD, true);
  s.g.graceActive = () => true;
  const e = standing(14, 9);
  enterRoom(s.g, PAC.ship, e.x2, e.y);
  settle(s);
  const n = 4 + chase.slot;
  let seen = -1;
  for (let f = 0; f < 600 && seen < 40; f++) {
    frame(s, f < 120 ? { ...NONE, right: true } : NONE);
    if (seen >= 0 || ((s.g.vic.enable >> n) & 1)) seen++;
  }
  save('ship', s.g, n);
}
