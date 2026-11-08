/**
 * Monty on the Run's screen, shared: how its memory is laid out (the VIC bank with the characters at 0, the screen at $0800), the
 * playfield in it, the score row, the coins and the animation of a room's theme characters. Monty on the Run (montyotr) and the
 * remix draw their rooms and their rows the same way, from here.
 *
 * Memory model: `mem` is VIC bank 1 ($4000-$7FFF): charset at 0, screen RAM at SCREEN ($4800), sprite data by pointer.
 * `col` is colour RAM ($D800).
 */

export const SCREEN = 0x800;
/** Characters in a screen row. */
export const ROW = 40;

/** The playfield: 32 x 20 cells at screen column 4, row 3. */
export const PLAY_COL = 4;
export const PLAY_ROW = 3;
export const PLAY_COLS = 32;
export const PLAY_ROWS = 20;

/** What a game plays the sound with (`musicOff` effects only play when music is off, as in the original). */
export interface Sound {
  sfx(id: number, musicOff: boolean): void;
  /** original Music.Init(n) */
  song(n: number): void;
  stop(): void;
}

/** The memory the rows are drawn into. */
export interface Rows {
  readonly mem: Uint8Array;
  readonly col: Uint8Array;
}

// ---- HUD (original HUD.Init / HUD.Update) --------------------------------------

/** The score row's frame: SCORE, the lives' icon and HI-SCORE, then the data. */
export function drawHudFrame(s: Rows, score: number, hiScore: number, lives: number) {
  const text = 'SCORE:           00 HI-SCORE:      ';
  for (let i = 0; i < 36; i++) {
    s.mem[SCREEN + 2 + i] = text.charCodeAt(i) === 32 ? 0x60 : (text.charCodeAt(i) & 0x3f) | 0x40;
    s.col[2 + i] = 1;
    s.col[ROW + 2 + i] = 1;
  }
  for (let x = 15; x >= 0; x--) {
    if (x < 13) s.mem[SCREEN + ROW + 2 + x] = 0x64;
    s.mem[SCREEN + ROW + 0x16 + x] = 0x64;
  }
  const icon = [0x3d, 0x3e, 0x3f, 0x40];
  [0, 1, ROW, ROW + 1].forEach((o, i) => {
    s.mem[SCREEN + 0x10 + o] = icon[i] ?? 0;
    s.col[0x10 + o] = 8;
  });
  s.col[0x13] = 8;
  s.col[0x14] = 8;
  drawHudData(s, score, hiScore, lives);
}

/** The score, the high score and the lives in the score row. */
export function drawHudData(s: Rows, score: number, hiScore: number, lives: number) {
  const sc = String(score % 100000).padStart(5, '0');
  const h = String(hiScore % 100000).padStart(5, '0');
  for (let i = 0; i < 5; i++) {
    s.mem[SCREEN + 0x0a + i] = (sc.charCodeAt(i) & 0x3f) | 0x40;
    s.mem[SCREEN + 0x21 + i] = (h.charCodeAt(i) & 0x3f) | 0x40;
  }
  s.mem[SCREEN + 0x14] = ((Math.min(9, Math.max(0, lives)) + 0x30) & 0x3f) | 0x70;
}

// ---- coins (original CollectCoin, CharacterAnimation) -------------------------------

/** The coin's character in the charset. */
export const COIN_CHAR = 0x34;
/** The colours a collectible shimmers through (an 11-step cycle). */
const COIN_COLOURS = [2, 4, 4, 10, 7, 1, 1, 7, 10, 4, 4];

/** A collectible on the screen: where it is (a screen offset), its colour phase, and what the game knows it by. */
export interface Collectible { at: number; phase: number; index: number }

/**
 * CollectCoin: a coin character in Monty's 2 x 2 cells (his top-left cell at `base`, a screen offset) is taken: the character
 * goes. Null when there was none; else the collectible it was (`item` null when it was not one the game counts).
 */
export function takeCoin(mem: Uint8Array, base: number, items: readonly Collectible[]): { item: Collectible | null } | null {
  for (const o of [ROW + 1, ROW, 1, 0]) {
    const at = (base + o) & 0x3fff;
    if (mem[at] !== COIN_CHAR) continue;
    mem[at] = 0;
    return { item: items.find((x) => x.at === base + o && x.index >= 0) ?? null };
  }
  return null;
}

/** CharacterAnimation: collectibles shimmer through the colour cycle. */
export function shimmer(items: readonly Collectible[], setCol: (at: number, colour: number) => void) {
  for (const e of items) {
    e.phase = (e.phase + 1) % 11;
    setCol(e.at, COIN_COLOURS[e.phase] ?? 1);
  }
}

// ---- theme characters (original AnimateThemeChar) -----------------------------------

/**
 * A room's theme character (water, lava, a conveyor, a chain) turns a step each time: `flags` is the room's metadata (bit 0-2 the
 * character 1-8, then the way: bit 7 rows up, 6 rows down, 5 and 4 the first three rows left and right).
 */
export function animateTheme(mem: Uint8Array, flags: number) {
  if (!flags) return;
  const g = mem.subarray(8 + (flags & 7) * 8, 16 + (flags & 7) * 8);
  if (flags & 0x80) {
    const first = g[0] ?? 0;
    g.copyWithin(0, 1);
    g[7] = first;
  } else if (flags & 0x40) {
    const last = g[7] ?? 0;
    g.copyWithin(1, 0, 7);
    g[0] = last;
  } else if (flags & 0x20) {
    for (let i = 0; i < 3; i++) g[i] = (((g[i] ?? 0) << 1) | ((g[i] ?? 0) >> 7)) & 0xff;
  } else if (flags & 0x10) {
    for (let i = 0; i < 3; i++) g[i] = (((g[i] ?? 0) >> 1) | ((g[i] ?? 0) << 7)) & 0xff;
  }
}

// ---- random numbers (original GenerateRandomNumber) ---------------------------------

/** The generator's state at the start (four bytes). */
export const PRNG_START = [0x5a, 0xa5, 0x3c, 0xc3] as const;

/** GenerateRandomNumber: four-byte state, returns one byte. */
export function nextRandom(prng: Uint8Array): number {
  const r = (Math.random() * 256) | 0;
  for (let i = 0; i < 4; i++) prng[i] = ((prng[i] ?? 0) + 0x29 + (r >> i)) & 0xff;
  return prng[r & 3] ?? 0;
}
