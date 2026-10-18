import { BRIDGES, BRIDGE_OPEN, DRAGONS } from './rules';

/**
 * Dragonskulle's hints (re/hints: read from the blocks' code, solved by playing, checked by
 * replaying; re/README.md, "Hints"): what moves the game on, on the screens where it's done.
 * Each is a sprite the game draws (`sprite`), on screens using a room block (`room`, $341C),
 * shown until `until` (address, value) is done, while `when` holds.
 */
export interface Hint {
  room: number;
  sprite: number;
  until: [number, number];
  when?: [number, number][];
  what: string;
}

export const HINTS: Hint[] = [
  // the beach (block $C000): touching a starfish (sprite 6, $625E) stops the skull's rays at the
  // caves' mouth ($6273: the way on, $3441)
  { room: 1, sprite: 6, until: [0x3441, 1], what: 'touch a starfish: the way into the caves opens' },
  // where he landed, the mound (sprite 7, $6294): digging there with the shovel four times ($63D2)
  // turns up the cloak ($342E, then $63A2 gives the CLOAK icon, $3430)
  { room: 1, sprite: 7, until: [0x342e, 1], when: [[0x342f, 1]], what: 'dig here with the shovel: the cloak' },
  // the shovel's room (block $EF20): a stone on the shovel (sprite 6, $6235) takes it ($342F); in
  // ENHANCED (where the hints show) so does touching it (src/shovel.ts)
  { room: 18, sprite: 6, until: [0x342f, 1], what: 'walk up to the shovel (or throw a stone at it)' },
  // the river screens (rooms 3, 4, 5: blocks $6000 and $CD50): a stone on the wizard walking along the far
  // bank (sprite 5) counts one towards the bridge ($343A, $343B, $343C), and the bridge is shut until the
  // count is $FF (src/rules.ts)
  ...BRIDGES.map((b): Hint => ({ room: b.room, sprite: 5, until: [b.counter, BRIDGE_OPEN], what: `kill the wizard on the far bank: ${b.need} open the bridge` })),
  // the dragons' screens (rooms 6-9: block $D870): ten stones thrown facing up on the head (sprite 1, $65CF)
  // kill it, and only then is the way up open ($3441); each keeps its flag ($72B0-$72B3)
  ...DRAGONS.map((d): Hint => ({ room: d.room, sprite: 1, until: [d.flag, 1], what: `the dragon of room ${d.room}: ten stones thrown facing up` })),
  // the room of the falling rocks (room 17, block $E900): sprite 5's colour flickers once it has fallen once
  // ($65F2 = 1, $659E): with the cloak dug up ($342E) catching that one gives the cloak again ($61F7, $65B1:
  // $3430), as often as it falls. Shown while he has none to put on.
  { room: 17, sprite: 5, until: [0x3430, 1], when: [[0x342e, 1], [0x65f2, 1]], what: 'catch the flickering rock: the cloak again' },
];
