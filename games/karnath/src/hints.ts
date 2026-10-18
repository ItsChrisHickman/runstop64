import { cellSpots, spriteShows, spriteSpot, type Spot } from '../../shared/native/spots';

/**
 * The Staff of Karnath's hints (ENHANCED: re/README.md, "Hints"): where the pentacle's pieces are, where a
 * piece carried goes, and what ends the game, read from what the game keeps. The words are in
 * src/hint-lines.ts and the status line's in src/guide.ts; this is the state and the sparkles' places.
 * Nothing here writes to the game.
 */

/** What the game keeps (re/README.md, "How the game is won"). */
export const KEPT = {
  /** 1 while a piece is carried: a pickup sets it ($167C, the rooms' own), BARACATA at the obelisk clears it ($6E40). */
  carrying: 0x322f,
  /** The pieces deposited ($6E73 adds one at each deposit); $11 once the staff is destroyed ($6FA9). */
  count: 0x6fff,
  /** 1 when he is lost ($6FFD: out of energy, out of time, or the wrong spell at the staff). */
  lost: 0x6ffd,
  /** The castle's mode ($3219): 0 the lower floor, 1 the upper, $FF the dungeons, $FE Karn's abode. */
  mode: 0x3219,
  /** The playfield's fine scroll (the low 3 bits go to $D016 for the play area's rows). */
  scroll: 0x7fee,
} as const;

export const MODE = { lower: 0, upper: 1, dungeons: 0xff, abode: 0xfe } as const;

/** Pieces to deposit before the staff shows ($6E79). */
export const PIECES = 0x10;
/** The count once the staff is destroyed ($6FA9). */
export const DESTROYED = 0x11;

export const carrying = (ram: Uint8Array) => ram[KEPT.carrying] === 1;
export const deposited = (ram: Uint8Array) => ram[KEPT.count];
/** The game has ended: the staff destroyed, or he is lost. */
export const over = (ram: Uint8Array) => ram[KEPT.count] >= DESTROYED || ram[KEPT.lost] === 1;
/** Sixteen pieces are laid and the staff stands in its shrine ($6E90): only MENHIR at it ends the game well. */
export const staffUp = (ram: Uint8Array) => ram[KEPT.count] === PIECES && !over(ram);

/**
 * The castle's clock is the status panel's own digits ($07C5, $07C6: the hour; the game counts it there and is
 * lost when the second reaches 2, $15B6). A digit is its screen code: 1-9 are $31-$39, 0 is $3A.
 */
const digit = (code: number) => (code === 0x3a ? 0 : code >= 0x31 && code <= 0x39 ? code - 0x30 : NaN);
/** The hour on the clock (NaN while the panel is not showing one: the screen is being drawn, or it is the game's end). */
export const hourOn = (ram: Uint8Array) => digit(ram[0x07c5]) * 10 + digit(ram[0x07c6]);
/** The last hour: 11 PM. */
export const LAST_HOUR = 11;

// ---- the sparkles ----

/** The play area's rows of the screen ($0400, 40 columns): the panel's are 21 and under. */
const SCREEN = 0x0400, COLUMNS = 40, PLAY_ROWS: [number, number] = [0, 20];
/** A piece of the pentacle in the map: two characters, $D5 then $D4 ($167C reads them; a taken one is floor). */
const MAP_PIECE = [0xd5, 0xd4];
/**
 * A piece as a sprite shows it: the game copies one picture (at $5800) into the sprite of each piece it keeps in a
 * room ($6003 and the other levels' starts), and takes it off the screen when it is taken. A sprite drawn with that
 * picture, and on the screen, is a piece lying there.
 */
const PIECE_PICTURE = 0x5800;
/** The way into the dungeons ($CF facing up from the lower floor, $2961), which is also the way out of the upper floor ($2977). */
const WAY_DOWN = [0xcf];
/**
 * The way down a level: the sign (DOOR: $A5, $A6, $A6, $A7) painted along the floor's front edge, which he goes down
 * through facing down on it ($29EF, $2CE4): the room's last row, 19 on the lower floor (its rooms start at row 4) and 15
 * on the upper. The same sign is also painted along the top edge of some rooms (row 4 on the lower floor), a
 * row he is not standing on: not marked (re/hints/check.ts walks down through a front one).
 */
const STAIRS = [0xa5, 0xa6, 0xa7];
const FRONT_ROW = { [MODE.lower]: 19, [MODE.upper]: 15 } as const;
/** The dungeons' far door to Karn's abode ($B8, $29C1). */
const ABODE_DOOR = [0xb8];
/** The abode's obelisk is sprite 6 ($6E40 reads the spell touching it), and so is the staff's shrine's (5, 6 and 7 together: $6E90). */
const OBELISK = 6;
const STAFF = 6;

const cells = (ram: Uint8Array, codes: readonly number[], rows: [number, number] = PLAY_ROWS) => cellSpots(ram, SCREEN, COLUMNS, rows, codes, ram[KEPT.scroll] & 7);

/** Pieces in the map to take (two characters each). */
export const mapPieceSpots = (ram: Uint8Array) => cells(ram, MAP_PIECE);

/** Pieces lying as sprites to take: each sprite showing the piece's picture, where it is on the screen. */
export function spritePieceSpots(ram: Uint8Array, vic: Uint8Array): Spot[] {
  const out: Spot[] = [];
  for (let n = 0; n < 8; n++) {
    if (!spriteShows(ram, n, PIECE_PICTURE)) continue;
    const s = spriteSpot(ram, vic, n);
    if (s) out.push(s);
  }
  return out;
}

/** The pieces left to take in the room. */
export const pieceSpots = (ram: Uint8Array, vic: Uint8Array) => [...mapPieceSpots(ram), ...spritePieceSpots(ram, vic)];

/** Where a piece carried goes: down to the dungeons, through their far door, to the obelisk. */
export function wayToObelisk(ram: Uint8Array, vic: Uint8Array): Spot[] {
  const mode = ram[KEPT.mode];
  if (mode === MODE.lower || mode === MODE.upper) return [...cells(ram, WAY_DOWN), ...cells(ram, STAIRS, [FRONT_ROW[mode], FRONT_ROW[mode]])];
  if (mode === MODE.dungeons) return cells(ram, ABODE_DOOR);
  if (mode === MODE.abode) { const s = spriteSpot(ram, vic, OBELISK); return s ? [s] : []; }
  return [];
}

/** The staff in its shrine, once sixteen are laid (in the abode: the shrine's sprites are on only there). */
export function staffSpots(ram: Uint8Array, vic: Uint8Array): Spot[] {
  if (ram[KEPT.mode] !== MODE.abode) return [];
  const s = spriteSpot(ram, vic, STAFF);
  return s ? [s] : [];
}

/** The sparkles (play.ts `hints`): on the pieces left to take; carrying one, on the way to the obelisk; after sixteen, on the staff. */
export function hintSpots(ram: Uint8Array, vic: Uint8Array): Spot[] {
  if (over(ram)) return [];
  if (staffUp(ram)) return staffSpots(ram, vic);
  return carrying(ram) ? wayToObelisk(ram, vic) : pieceSpots(ram, vic);
}
