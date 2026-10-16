import type { ObliqueSpec } from 'c64kit';

/**
 * Dragonskulle in the HD view (c64kit's hd/: the room rebuilt in 3D from the picture's characters,
 * lit). What it needs to know about the game, all read from the game itself (re/README.md, "The HD
 * view"):
 */
export const dragonskulleHd: ObliqueSpec = {
  // the play area: character rows 4-20 as the machine draws them (the front end's layout shows them
  // 4 lines higher, under the status line it moves to the top: the HD view follows it)
  band: { y: 32, h: 136 },
  // floor: the sand the floor check ($24BB, its list at $254B) stands him on ($3F a solid block in
  // the sand's colour)
  floor: [0x3f, 0x12, 0x21, 0x62, 0x16, 0x29],
  // and the pieces drawn round the sand's edges and under the rocks lying on it: their sand (the colour
  // RAM's yellow, pair 3) is floor
  // (and more found along the first route: characters drawn with that sand in nearly every place
  // they're used, or beside the floor in most: the sand at the cliffs' foot, round the rocks and the
  // starfish; without them their sand stood up in blocks)
  edges: [
    0x0d, 0x0e, 0x4d, 0x05, 0x96, 0x7f, 0x7e, 0x7c, 0x8f, 0x4a, 0x4b, 0x49, 0x5d, 0x5e, 0x86, 0x36, 0x70, 0x95, 0x83, 0x6f, 0x91, 0x6a,
    0x61, 0xe0, 0x25, 0x22, 0xf3, 0x26, 0x14, 0xe1, 0x66, 0x85, 0x18, 0x39, 0x7d, 0x01, 0x27, 0x28, 0x5a, 0x47, 0x2a, 0x02, 0x8b, 0x17, 0x23, 0x88, 0xf4, 0xd5,
  ],
  floorPair: 3,
  // the sand's back edge is drawn ragged (up and down a pixel or two, and a character at a time): the
  // cliffs and the caves' walls standing on it are one face where it goes on average
  ragged: 8,
  // the sky and the sea past the beach: the same solid block ($3F), in cyan and blue
  open: { chars: [0x3f], colours: [3, 6] },
  // Pendragon is sprite 2
  player: 2,
};
