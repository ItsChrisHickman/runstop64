/**
 * Every hazard and creature is drawn in front of the scenery, in every room of the world (Chris on the Andes: the boulders "sometimes go behind the mountain art"): the VIC's priority register
 * puts a sprite behind the characters' ink when its bit is set, and the game sets it for one sprite only, a find's (Monty on the Run's items hide behind what they are in). Each room is entered and
 * run for a while with the creatures, boulders, leaping fish, dragons and the rest moving; in every frame no sprite of a creature or a hazard (any sprite but the item's own, sprite 0, and the
 * second find's, sprite 1, in the rooms that have two) has its priority bit set while it is enabled, and none is placed under a cell of the picture's own colour (creature-contrast.ts checks the colours).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/sprites-front.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { newPlay, settle, standing } from './shots-kit';

Math.random = () => 0.3;

/** Frames each room is watched. */
const WATCH = 500;

/** The room ids of the world's exit grid. */
const rooms = [...new Set(Array.from(WORLD.exitGrid.image).filter((id) => id !== 0xff))].sort((a, b) => a - b);

let behind = 0;
for (const id of rooms) {
  const s = newPlay();
  const at = standing(0, 17);
  enterRoom(s.g, id, at.x2, at.y);
  settle(s);
  s.g.graceActive = () => true;
  const g = s.g;
  const finds = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => g.data.specialItems[i * 4]).filter((r) => r === id).length;
  /** The sprites that may hide behind the scenery: the find's. */
  const allowed = finds >= 2 ? 0x03 : 0x01;
  const bad = new Set<number>();
  for (let n = 0; n < WATCH; n++) {
    frame(s, NONE);
    if (g.roomId !== id) break;
    const hidden = g.vic.priority & g.vic.enable & ~allowed & 0xff;
    for (let k = 0; k < 8; k++) if (hidden & (1 << k)) bad.add(k);
  }
  if (bad.size) behind++;
  check(`room $${id.toString(16)}: no creature or hazard is drawn behind the scenery${bad.size ? ` (sprites ${[...bad].join(', ')} have the priority bit)` : ''}`, bad.size === 0);
}
check(`${rooms.length} rooms watched`, rooms.length > 70 && behind === 0);
finish();
