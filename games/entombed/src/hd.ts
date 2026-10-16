import type { ObliqueSpec } from 'c64kit';
import type { DecodeRules } from '../../shared/pendragon/decode';
import { PICTURES } from './pictures';

/** What Entombed's characters are to its rooms, for decoding its room pictures into pieces (re/pictures.ts): the floor the floor check ($2550) stands him on, and its ways in and out. */
export const entombedRules: DecodeRules = { floor: [0x01, 0x0b, 0x14, 0x1e, 0x27, 0x31, 0x37, 0x3e, 0xbe], raised: true, stacked: true, holes: [0x20], skyAbove: true };

/**
 * Entombed in the HD view (c64kit's hd/: the room rebuilt in 3D from the picture's characters, lit).
 * What it needs to know about the game, all read from the game itself (re/README.md, "The HD view"):
 */
export const entombedHd: ObliqueSpec = {
  // the play area: character rows 4-20 (under the header, over the status line)
  band: { y: 32, h: 136 },
  // floor: the characters the game's own floor check ($2550) stands him on, and the ways in and out,
  floor: [0x01, 0x0b, 0x14, 0x1e, 0x27, 0x31, 0x37, 0x3e, 0xbe],
  // and the pieces drawn along the floor's edges (only their pixels in the floor's colour)
  edges: [0x07, 0x0d, 0x19, 0x23, 0x32, 0x33, 0x36, 0x4c, 0x51, 0x66],
  // the torches on the walls: three by three characters ($C3/$B8 the sides; $4E at the top, where the light is)
  flames: { chars: [0xc3, 0x4e, 0xb8, 0x2d, 0x1b], pair: 2, lights: [0x4e] },
  // Pendragon is sprite 2; the whip (sprite 3) is drawn with him
  player: 2,
  attached: { 3: 2 },
  // the rooms as pieces, decoded from the game's room pictures (src/pictures.ts, by re/pictures.ts)
  pictures: PICTURES,
  // (the dark chambers, 19, 22 and 24, are drawn black by the game, $D022/$D023 and the colour RAM
  // all 0, however he uses the torch: the HD view takes the colours as drawn, so they're black too)
};
