/**
 * Every creature of Do Svidaniya Monty stands out from what is behind it (Chris on Mount Fuji: a white crane over the snow, a brown one on the mountain): in every room of the
 * world each creature is run for a while (as it patrols: walkers, fliers, the up-and-down ones), and the colour it is drawn in must differ from the colour of every cell with
 * something drawn in it (a tile, a decoration) in the box of cells its picture sweeps. Nothing can end him while the patrols are watched.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/creature-contrast.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE } from '../../montyotr/test/play';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS, ROW, SCREEN } from '../../shared/monty/screen';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { newPlay, settle, standing } from './shots-kit';

/** The game's own random numbers start from Math.random: the same every run. */
Math.random = () => 0.3;

/** Frames each room's creatures are watched: longer than any patrol's there and back. */
const WATCH = 900;

/**
 * Rooms of regions other than Japan whose creatures still share a colour with something they pass (found when this test was written, 2026-11-22: Moscow, Siberia, the Pacific, the Andes
 * and Rio were being built by others): listed so the suite passes while their owners recolour a creature or a decoration, and to be emptied as they do. Japan's rooms are never on it.
 */
const PENDING = new Set([0x11, 0x13, 0x28, 0x2d, 0x2f, 0x36, 0x38, 0x39, 0x3a, 0x40, 0x4a]);

/** The room ids of the world's exit grid. */
const rooms = [...new Set(Array.from(WORLD.exitGrid.image).filter((id) => id !== 0xff))].sort((a, b) => a - b);

/** Colours of the C64 by name, for a message. */
const NAME = ['black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow', 'orange', 'brown', 'light red', 'dark grey', 'grey', 'light green', 'light blue', 'light grey'];

for (const id of rooms) {
  const s = newPlay();
  const at = standing(0, 17);
  enterRoom(s.g, id, at.x2, at.y);
  settle(s);
  s.g.graceActive = () => true;
  const g = s.g;
  /** For each creature: the cells (screen column, row) its 16 by 16 picture covers over the watch. */
  const swept = g.enemies.map(() => new Set<number>());
  for (let n = 0; n < WATCH; n++) {
    frame(s, NONE);
    if (g.roomId !== id) break;
    g.enemies.forEach((e, k) => {
      const px = e.x * 2 - 24, py = e.y - 50;
      for (let cy = Math.floor(py / 8); cy <= Math.floor((py + 15) / 8); cy++) for (let cx = Math.floor(px / 8); cx <= Math.floor((px + 15) / 8); cx++) swept[k]?.add(cy * 64 + cx);
    });
  }
  g.enemies.forEach((e, k) => {
    const clash = new Set<number>();
    for (const cell of swept[k] ?? []) {
      const cx = cell % 64, cy = Math.floor(cell / 64);
      if (cx < PLAY_COL || cx >= PLAY_COL + PLAY_COLS || cy < PLAY_ROW || cy >= PLAY_ROW + PLAY_ROWS) continue;
      const here = cy * ROW + cx;
      const chr = g.mem[SCREEN + here] ?? 0;
      let lit = false;
      for (let b = 0; b < 8; b++) if (g.mem[chr * 8 + b]) lit = true;
      if (lit && (g.col[here] ?? 0) % 16 === e.colour % 16) clash.add(cx);
    }
    check(`room $${id.toString(16)}: creature ${k} (${NAME[e.colour % 16] ?? e.colour}) differs from what it passes${clash.size ? `: ${clash.size} cells of its own colour (columns ${[...clash].map((c) => c - PLAY_COL).sort((a, b) => a - b).join(',')})${PENDING.has(id) ? ' (pending: another region\'s)' : ''}` : ''}`, clash.size === 0 || PENDING.has(id));
  });
}
finish();
