/**
 * Makes the picture tables the games' swaps use (`../figure.ts`) from the study's data and its map (`map.ts`): Dragonskulle's frames
 * (`figure-frames.ts`) and, for each game, which of its pictures becomes which frame (`src/figure-table.ts`). Run again after the map
 * changes; the collector's output (`collect.ts`) is the input.
 *   nice -n 15 node tools/test.mjs games/shared/pendragon/study/tables.ts <data dir>
 */
import fs from 'node:fs';
import { type FrameId } from '../figure';
import { DIRS, DRAGONSKULLE, SETS, swapsFor } from './map';
import { readPoses, type PoseRecord } from './draw';
import { must } from '../../test/must';

const [dir = ''] = process.argv.slice(2);
const read = (game: string) => new Map(readPoses(`${dir}/${game}.json`).map((p) => [p.room, p]));
const ds = read('dragonskulle');

/** The frame id of each Dragonskulle picture the swaps use: its place in his stand, walk, jump and stone throw. */
const frameOf = new Map<number, FrameId>();
for (const d of DIRS) {
  frameOf.set(DRAGONSKULLE.stand[d], `stand.${d}.0`);
  [...new Set(DRAGONSKULLE.walk[d])].filter((n) => n !== DRAGONSKULLE.stand[d]).forEach((n, k) => frameOf.set(n, `walk.${d}.${k}`));
  must(DRAGONSKULLE.jump, 'jump')[d].forEach((n, k) => frameOf.set(n, `jump.${d}.${k}`));
  must(DRAGONSKULLE.strike, 'strike').frames[d].forEach((n, k) => frameOf.set(n, `throw.${d}.${k}`));
}
const hex = (n: number) => must(ds.get(n), `Dragonskulle picture ${n}`).data;

/** The pose a game's strike pictures become (frames drawn in \`figure-drawn.ts\`); none for Blackwyche, whose sword pictures are already his figure's. */
const STRIKE_POSE: Record<string, 'cast' | 'whip' | undefined> = { karnath: 'cast', entombed: 'whip' };

let frames = '/** Dragonskulle\'s pictures of Pendragon (the games\' own pictures of him are mapped to these): stand, walk, jump and the stone throw, as `study/tables.ts` made them from his game. */\n';
frames += "import type { FrameId } from './figure';\n\nexport const DRAGONSKULLE_FRAMES: readonly (readonly [FrameId, string])[] = [\n";
for (const [n, id] of [...frameOf].sort((a, b) => a[1].localeCompare(b[1], 'en', { numeric: true }))) frames += `  ['${id}', '${hex(n)}'], // ${n}\n`;
frames += '];\n';
fs.writeFileSync('games/shared/pendragon/figure-frames.ts', frames);

/** Pictures kept as the game draws them (his ghost: he is not Pendragon then), by the study's numbers. */
const KEEP: Record<string, number[]> = { entombed: [106, 107] };
const GAME_DIRS: Record<string, { file: string; name: string }> = {
  karnath: { file: 'games/karnath/src/figure-table.ts', name: 'KARNATH_FIGURE' },
  entombed: { file: 'games/entombed/src/figure-table.ts', name: 'ENTOMBED_FIGURE' },
  blackwyche: { file: 'games/blackwyche/src/figure-table.ts', name: 'BLACKWYCHE_FIGURE' },
};
for (const [game, to] of Object.entries(GAME_DIRS)) {
  const from = read(game), set = must(SETS[game], game);
  const swaps = swapsFor(set);
  let out = `/**\n * Which of ${game[0].toUpperCase() + game.slice(1)}'s pictures of Pendragon becomes which of Dragonskulle's frames (\`../../shared/pendragon/figure.ts\`). Made by\n * \`games/shared/pendragon/study/tables.ts\` from the study (poses.md); the number is the study's picture number.`;
  if (game === 'blackwyche') out += '\n * Only what is not already Dragonskulle\'s picture byte for byte: the rest needs no entry.';
  out += ' */\nimport type { FigureTable } from \'../../shared/pendragon/figure\';\n\n';
  out += `export const ${to.name}: FigureTable = [\n`;
  const dsHex = new Set([...frameOf.keys()].map(hex));
  const wanted = new Map<number, PoseRecord>();
  for (const [id] of swaps) wanted.set(id, must(from.get(id), `${game} picture ${id}`));
  const lines: string[] = [], already: string[] = [];
  for (const [id, sw] of [...swaps].sort((a, b) => a[0] - b[0])) {
    const p = must(wanted.get(id), 'picture');
    const target = sw.ds;
    let frame: FrameId;
    if (sw.role.startsWith('strike')) {
      // the pose Dragonskulle has no picture of: the frame drawn for it (figure-drawn.ts), the first and second of the game's own pictures of it
      // a way. Blackwyche's sword pictures are already drawn in his figure: no entry, they stay (the swap leaves a picture it does not know
      // alone but for its colours)
      const pose = STRIKE_POSE[game];
      if (!pose) { already.push(`  '${p.data}', // ${id} ${sw.role} ${sw.dir}`); continue; }
      frame = `${pose}.${sw.dir}.${Math.min(Number(sw.role.split(' ')[1].split('/')[0]) - 1, 1)}`;
    } else {
      frame = must(frameOf.get(target), `no frame for Dragonskulle ${target}`);
      if (game === 'blackwyche' && dsHex.has(p.data) && hex(target) === p.data) continue;
    }
    lines.push(`  ['${p.data}', '${frame}'], // ${id} ${sw.role} ${sw.dir}`);
  }
  out += lines.join('\n') + '\n];\n';
  if (already.length) out += `\n/** His pictures already drawn in Dragonskulle's figure (the sword): kept, only recoloured. */\nexport const ${to.name.replace('_FIGURE', '_OWN')}: readonly string[] = [\n${already.join('\n')}\n];\n`;
  const keep = KEEP[game];
  if (keep) {
    out += `\n/** Pictures that stay as the game draws them (the ghost that rises when he dies). */\nexport const ${to.name.replace('_FIGURE', '_KEEP')}: readonly string[] = [\n`;
    for (const id of keep) out += `  '${must(from.get(id), 'kept picture').data}', // ${id}\n`;
    out += '];\n';
  }
  fs.writeFileSync(to.file, out);
  console.log(`${game}: ${lines.length} pictures`);
}
console.log(`frames: ${frameOf.size}`);
