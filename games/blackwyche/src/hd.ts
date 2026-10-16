import type { ObliqueSpec } from 'c64kit';
import type { DecodeRules } from '../../shared/pendragon/decode';
import { PICTURES } from './pictures';

/**
 * What Blackwyche's characters are to its rooms, for decoding its room pictures into pieces
 * (re/pictures.ts): the floor the floor check ($236B) stands him on, the holes of spaces in some
 * floors ($20: the stairs down where facing up takes him), and the sky and sea over deck 1's rail
 * (solid blocks, $3F, in the decks' characters).
 */
export const blackwycheRules: DecodeRules = { floor: [0x01, 0x16, 0x17, 0x03, 0x15], holes: [0x20], open: { decks: [0x3f] } };

/**
 * Blackwyche in the HD view (c64kit's hd/: the room rebuilt in 3D from the picture's characters,
 * lit). What it needs to know about the game, all read from the game itself (re/README.md, "The HD
 * view"):
 */
export const blackwycheHd: ObliqueSpec = {
  // the play area: character rows 4-20 (under the ornament, over the status lines)
  band: { y: 32, h: 136 },
  // floor: the deck's planks the floor check ($236B) stands him on
  floor: [0x01, 0x16, 0x17, 0x03, 0x15],
  edges: [],
  // the sky and the sea over the deck's rail: solid blocks ($3F) in their cyan and blue, seen past the ship
  open: { chars: [0x3f], colours: [3, 6] },
  // the lanterns on the walls ($13 the hook, $11/$12 the top, $B3 the glass, $25/$37 the bottom):
  // their yellow (pair 3) glows, a light at each glass
  flames: { chars: [0x11, 0x12, 0xb3, 0x25, 0x37], pair: 3, lights: [0xb3] },
  // Pendragon is sprite 2; his sword (sprite 3) is drawn with him
  player: 2,
  attached: { 3: 2 },
  // the rooms as pieces, decoded from the game's room pictures (src/pictures.ts, by re/pictures.ts):
  // every wall, floor and thing where the game's room has it
  pictures: PICTURES,
};
