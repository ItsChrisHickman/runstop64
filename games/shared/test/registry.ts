/**
 * The registry (games/registry.ts) and the game folders agree: every game in the registry has a folder under
 * games/ with a src/main.ts and a src/info.ts, and every folder with a src/main.ts is in the registry (a new
 * game is one entry, and forgetting it fails here); ids are unique, names are the directory's capitals, and
 * the entries load (each gives `run` and an `info` with its title).
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/registry.ts
 */
import fs from 'node:fs';
import { GAMES } from '../../registry';
import { check, finish } from './check';

const folders = fs.readdirSync('games').filter((name) => fs.existsSync(`games/${name}/src/main.ts`)).sort();
const ids = GAMES.map((g) => g.id);

check(`the registry's ${ids.length} ids are the game folders with a src/main.ts (${folders.join(', ')})`, JSON.stringify([...ids].sort()) === JSON.stringify(folders));
check('no id twice', new Set(ids).size === ids.length);
check('a name is in the directory\'s letters (capitals, digits, spaces)', GAMES.every((g) => /^[A-Z0-9 ]+$/.test(g.name)));
check('a size in blocks', GAMES.every((g) => Number.isInteger(g.blocks) && g.blocks > 0));
for (const g of GAMES) check(`${g.id}: the info is in its own file (src/info.ts)`, fs.existsSync(`games/${g.id}/src/info.ts`));

for (const g of GAMES) {
  const m = await g.load();
  check(`${g.id}: loads, with run() and an info (${m.info.title})`, typeof m.run === 'function' && m.info.title.length > 0 && m.info.html.length > 0);
}

finish();
