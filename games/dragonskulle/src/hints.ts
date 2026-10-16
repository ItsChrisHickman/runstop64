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
];
