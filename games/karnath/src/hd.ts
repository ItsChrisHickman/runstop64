import type { ObliqueSpec } from 'c64kit';
import type { DecodeRules } from '../../shared/pendragon/decode';
import { PICTURES } from './pictures';

/**
 * What Karnath's characters are to its rooms, for decoding its room maps into pieces (re/pictures.ts): the
 * planks the floor check ($27BA, its list at $2835) stands him on, and the floor drawn over the top of
 * the lower floor's back walls, the room beyond.
 */
export const karnathRules: DecodeRules = { floor: [0x4f, 0x16, 0x17, 0x18], beyond: true, raised: true };

/**
 * The Staff of Karnath in the HD view (c64kit's hd/: the room built in 3D from the game's own rooms,
 * lit). What it needs to know about the game, all read from the game itself
 * (re/README.md, "The HD view"):
 */
export const karnathHd: ObliqueSpec = {
  // the play area: character rows 0-19 (the status panel is under it)
  band: { y: 0, h: 160 },
  // floor: the planks the floor check ($27BA, $2835) stands him on
  floor: [0x4f, 0x16, 0x17, 0x18],
  edges: [],
  // the candles on the candelabras ($58/$59 over their stands $6A/$6B) and the fires in the
  // fireplaces ($B4/$B5): their yellow (pair 3) glows; a light at each candelabra and along each fire
  flames: { chars: [0x58, 0x59, 0xb4, 0xb5], pair: 3, lights: [0x58, 0xb4] },
  // Pendragon is sprite 2
  player: 2,
  // the rooms as pieces, decoded from the game's room maps (src/pictures.ts, by re/pictures.ts):
  // every wall, floor and thing where the game's room has it
  pictures: PICTURES,
};
