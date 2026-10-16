/**
 * The Pendragon games' rooms as data (Staff of Karnath, Entombed, Blackwyche, Dragonskulle): what a
 * room is made of and where each piece of it stands, decoded once from the game's own room pictures
 * by a tool (games/shared/pendragon/decode.ts; each game's re/pictures.ts) and kept as typed data, for
 * the HD view (hd/placed.ts) and for a native engine to draw rooms from.
 *
 * The engines keep a room as a picture of characters (Blackwyche: 40 × 17 at a page of its own, $7000
 * on, copied to the screen's rows 4-20 by $26AA, a part of two side by side as the deck scrolls), drawn
 * "obliquely": x across, height up, and a step into the room a pixel up and a pixel right. What stands
 * where follows from the picture's floor (the characters the engine's floor check stands him on): the
 * back wall stands on the floor's back edge, a side wall along a back edge that steps back a character
 * a character (a slope of one), and a thing (a barrel, a table, a cannon, a post) on the floor under
 * its front. Each piece is one surface at one place; every pixel of the picture is a piece's.
 *
 * Coordinates are the picture's pixels: x from its left, y down from its top (its bottom, 136 for 17
 * rows, is the ground), and the room's: depth z (into the picture) and height. A pixel's middle at
 * (x + 0.5, y + 0.5) on a piece is the point there: a floor at height h has z = bottom - (y + 0.5) - h;
 * an upright piece stands at a depth (a side wall's going back along its slope), and its height is
 * bottom - (y + 0.5) - z.
 */

/** A level floor at a height (pixels above the ground). The first of a picture's is the ground; Karnath's have more, the tops of what stands on it. */
export interface FloorPiece { kind: 'floor'; height: number }
/** Upright, facing out of the picture (a back wall; the floor's front edge), at a depth. */
export interface WallPiece { kind: 'wall'; depth: number }
/**
 * Upright, going back into the room at an angle (a side wall, a partition; a structure's face turned
 * towards us): z = slope × x - at (x: the pixel's middle). Slope 1: every point the same distance
 * across (X = x - z = at), its foot stepping back a pixel up a pixel right; -1: its foot stepping
 * forward, a pixel down a pixel right.
 */
export interface SidePiece { kind: 'side'; slope: 1 | -1; at: number }
/** Standing on the floor, its front at a depth (a barrel, a table, a post): an upright cut-out there. */
export interface ThingPiece { kind: 'thing'; depth: number }
export type RoomPiece = FloorPiece | WallPiece | SidePiece | ThingPiece;

/** A room's picture: its characters and the pieces they make. */
export interface RoomPicture {
  /** Which picture (Blackwyche: the page it's kept at, $70 for $7000; Karnath: the strip's index in its src/strips.ts), and which of its versions (deck 1's or the lower decks'). */
  id: number;
  variant: number;
  /** Its size in characters (Blackwyche: 40 × 17, the last row the floor's front edge; Karnath: a strip of rooms, 120 × 20). */
  cols: number;
  rows: number;
  /** Each character cell's code (row-major), and its piece (an index into `pieces`). */
  codes: Uint8Array;
  cells: Uint8Array;
  pieces: RoomPiece[];
  /**
   * Cells partly another piece's (a thing's cell showing the wall behind it between its legs, a side
   * wall's foot the floor in front of it): per such cell, three numbers: the cell, the piece, and which
   * of its pixels (a bit per multicolour pixel, row by row from the top left: bit 31 the first) are that piece's.
   */
  parts: Uint32Array;
}

/**
 * A game's room pictures, and which may stand side by side (a long room scrolling along: Blackwyche's deck,
 * `[left, right]` by id). A picture wider than the band (Karnath's strips of rooms, 120 columns) is shown
 * a window of it at a time.
 */
export interface RoomPictures {
  pictures: RoomPicture[];
  beside: [number, number][];
  /**
   * The most columns of the band a scrolled picture may leave over (Entombed's wider chambers: the game scrolls
   * the screen along the picture a few columns either way and draws what's beyond the room's end itself): the
   * band may show a picture from that many columns before its first to that many past its last, and what's
   * over its edge is no part of it. Unset: only the last two (the screen is 38 columns wide while it scrolls).
   */
  overhang?: number;
}


/**
 * The piece of each pixel of a picture (cols × 8 wide, rows × 8 high, row-major): its cell's, or
 * another's where `parts` says so. (Where the game draws a cell differently from its picture, a thing
 * put down or taken, the cell is its own piece's: `parts` are of the picture's own characters.)
 */
export function pixelPieces(p: RoomPicture): Uint8Array {
  const W = p.cols * 8, out = new Uint8Array(W * p.rows * 8);
  for (let y = 0; y < p.rows * 8; y++) for (let x = 0; x < W; x++) out[y * W + x] = p.cells[(y >> 3) * p.cols + (x >> 3)];
  for (let k = 0; k < p.parts.length; k += 3) {
    const c = p.parts[k], cx = (c % p.cols) * 8, cy = Math.floor(c / p.cols) * 8;
    for (let b = 0; b < 32; b++) {
      if (!((p.parts[k + 2] >>> (31 - b)) & 1)) continue;
      const y = cy + (b >> 2), x = cx + (b & 3) * 2;
      out[y * W + x] = out[y * W + x + 1] = p.parts[k + 1];
    }
  }
  return out;
}
