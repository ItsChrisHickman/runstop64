/**
 * Pictures of rooms as the real engine draws them (the game's own frame with Monty in it, the creatures and mechanisms where they are a moment in): what the
 * regions' picture tests (siberia-shots.ts, china-shots.ts) share. Pictures only: nothing is checked.
 */
import path from 'node:path';
import { PixelRenderer, VicView } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { enterRoom } from '../../montyotr/src/ending';
import { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import type { MontyData } from '../../montyotr/src/montydata';
import { MOTR } from '../../montyotr/src/motr';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { standY } from './route';

export const W = 320, H = 200;

/** Where he stands: the cell's column and the floor's row. */
export const standing = (col: number, floor: number) => ({ x2: 0x0c + (col + 4) * 4, y: standY(floor) });

/** The picture of a game's frame (320 x 200, palette indices). */
export function shot(g: Game): Uint8Array {
  const r = new PixelRenderer(), view = new VicView(r, g.vic);
  view.update(); view.render(0);
  return r.picture();
}

/** A new game settled in its first room, without the helps (as ORIGINAL). */
export function newPlay(data: MontyData = WORLD): State {
  const g = new Game(data);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
  g.start();
  const s: State = { g, col: 0 };
  settle(s);
  return s;
}

/** Frames until the room has loaded and no scripted sequence runs. */
export function settle(s: State) {
  for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
}

/** What to show: Monty in a room (col, floor) after some frames of standing, wearing a costume (an item's index) and holding items (their indexes in the table). */
export interface Place { room: number; col: number; floor: number; frames: number; items?: readonly number[]; worn?: number | null; noEnemies?: boolean }

/** The game with Monty placed, the frames played: the state and its picture. */
export function placed(p: Place, data: MontyData = WORLD): { s: State; px: Uint8Array } {
  const s = newPlay(data);
  if (p.worn !== undefined && p.worn !== null) wear(s.g, p.worn);
  for (const i of p.items ?? []) s.g.siCollected[i] = 0x81;
  const at = standing(p.col, p.floor);
  enterRoom(s.g, p.room, at.x2, at.y);
  settle(s);
  if (p.noEnemies) s.g.enemies = [];
  for (let n = 0; n < p.frames; n++) frame(s, NONE);
  return { s, px: shot(s.g) };
}

export const savePng = (out: string, name: string, px: Uint8Array) => rgbPng(path.join(out, name), indicesToRgb(px), W, H, 3);

/** Pictures in a grid three across, as one. */
export function contactSheet(out: string, name: string, pics: readonly Uint8Array[]) {
  const rows = Math.ceil(pics.length / 3);
  const sheet = new Uint8Array(W * 3 * H * rows);
  pics.forEach((px, i) => {
    for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W, y * W + W), ((Math.floor(i / 3) * H + y) * 3 + (i % 3)) * W);
  });
  rgbPng(path.join(out, name), indicesToRgb(sheet), W * 3, H * rows, 1);
}

/** A room of Monty on the Run's as the engine draws it after a few frames, to put beside ours. */
export function motrRoom(room: number): Uint8Array {
  const s = newPlay(MOTR);
  enterRoom(s.g, room, 0x40, 0xb2);
  for (let n = 0; n < 30; n++) frame(s, NONE);
  return shot(s.g);
}

/** Two pictures side by side (ours, Monty on the Run's). */
export function compare(out: string, name: string, mine: Uint8Array, theirs: Uint8Array) {
  const both = new Uint8Array(W * 2 * H);
  for (let y = 0; y < H; y++) { both.set(mine.subarray(y * W, y * W + W), y * W * 2); both.set(theirs.subarray(y * W, y * W + W), y * W * 2 + W); }
  rgbPng(path.join(out, name), indicesToRgb(both), W * 2, H, 2);
}
