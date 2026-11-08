/**
 * Looking at the maps (not a check): a room put Monty down at its left side (x2 21, the way in from the left) on each row, what Monty alone
 * can reach from there (the bot's map: coal, tool, ways out), and with one row the map as text (`o` where he can be, `#` solid, `=` a
 * ledge, `|` a rope, `~` water, the digits the coal).
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/room-map.ts <room> <x2> [row]
 */
import { ROOM_ROWS } from '../../montymole/src/room';
import { ascii, bitOf, factsOf, goalsOf, RoomMap } from './bot';
import { newGame } from './harness';
import { PLAY_ROW } from '../../shared/monty/screen';
const [room, x2, ...rows] = process.argv.slice(2).map(Number);
const starts = rows.length ? rows : Array.from({ length: ROOM_ROWS - 2 }, (_, r) => r);
for (const row of starts) {
  const p = newGame();
  p.g.enterAt(room ?? 0, x2 ?? 0x15, 0x32 + (PLAY_ROW + row) * 8);
  const facts = factsOf(p.g);
  const map = new RoomMap(facts);
  map.addStart(p.g);
  map.explore();
  const reach = goalsOf(p.g, facts).filter((g) => map.reaches(p.g, bitOf(facts, g)));
  console.log(`row ${row}: ${map.size} states, reaches ${reach.map((g) => (g.kind === 'piece' ? `coal ${g.id}` : g.kind === 'tool' ? 'tool' : g.direction)).join(', ')}`);
  if (rows.length === 1) console.log(ascii(map, p.g).join('\n'));
}
