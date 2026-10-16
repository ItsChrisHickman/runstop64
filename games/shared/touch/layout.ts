/**
 * Touch controls: what a game asks for (a `TouchLayout`), and where everything
 * goes on a phone (pure geometry, no DOM, so it can be tested headless).
 *
 * Landscape: the C64 picture in the middle (a C64 screen is ~16:10, a phone on
 * its side ~20:9), the stick in the left gutter and the buttons in the right one,
 * so a thumb never covers the picture. Portrait: the picture on top, the controls
 * underneath.
 */

/** How the stick moves: 8 or 4 directions, left and right only, or no stick. */
export type StickKind = '8' | '4' | 'lr' | 'none';

export interface ButtonSpec {
  /** Label on the button (short: a word or two). */
  label: string;
  /** The key it stands for, by KeyboardEvent.code (Space is fire). */
  key: string;
  /** 'big' for the main button (fire/jump), 'small' for rarely used ones. */
  size?: 'big' | 'normal' | 'small';
  /** 'hold' (default): held while touched. 'toggle': each tap turns it on or off (e.g. run). */
  mode?: 'hold' | 'toggle';
  /** Red (a joystick's fire button) or grey (the default for other buttons). */
  colour?: 'red' | 'grey';
}

/** What a game declares: its stick and its buttons (the first is the main one, nearest the thumb). */
export interface TouchLayout {
  stick: StickKind;
  buttons: ButtonSpec[];
}

/** No controls (the loader: tap a game in its list). */
export const NO_CONTROLS: TouchLayout = { stick: 'none', buttons: [] };

/** The small buttons every game gets, by id. */
export type SystemId = 'pause' | 'enter' | 'home' | 'layout' | 'view';
/** A small button: it presses `key` while touched, or (without one) acts when tapped. */
export interface SystemSpec { id: SystemId; label: string; key?: string }

export interface Rect { x: number; y: number; w: number; h: number }
export interface Insets { top: number; right: number; bottom: number; left: number }
export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface PlacedButton { index: number; spec: ButtonSpec; x: number; y: number; r: number }
export interface PlacedSystem { spec: SystemSpec; x: number; y: number; r: number }

export interface Geometry {
  mode: 'landscape' | 'portrait';
  /** Where the C64 picture (with its thin border) is drawn. */
  picture: Rect;
  /** Where a thumb landing starts the stick (null: no stick). */
  stickZone: Rect | null;
  /** Where the stick rests when no thumb is on it, and its reach. */
  stickHome: { x: number; y: number };
  stickRadius: number;
  /** Any touch in here goes to the nearest button. */
  buttonZone: Rect | null;
  buttons: PlacedButton[];
  system: PlacedSystem[];
}

/** The picture's shape: 320×200 plus the thin border kept around it on small screens. */
export const PICTURE_ASPECT = (320 + 8) / (200 + 8);
const SYSTEM_ROW = 46; // height of the row of small buttons at the top of each gutter
const SYSTEM_R = 17;
const MIN_GUTTER = 96;

const SIZE: Record<NonNullable<ButtonSpec['size']>, number> = { big: 1, normal: 0.8, small: 0.66 };

/**
 * Where everything goes on a stage `w`×`h` (CSS px, the stage's own orientation:
 * for landscape, w > h). `system` lists the small buttons: HOME and TURN on the left, the rest on
 * the right, each side a row from its outer edge (a second row under it where the gutter is narrow:
 * the stick and the buttons go below the rows).
 */
export function layoutStage(w: number, h: number, mode: 'landscape' | 'portrait', game: TouchLayout, system: SystemSpec[], inset: Insets = NO_INSETS): Geometry {
  const W = w - inset.left - inset.right, H = h - inset.top - inset.bottom;
  const X0 = inset.left, Y0 = inset.top;
  const controls = game.stick !== 'none' || game.buttons.length > 0;
  const leftSys = system.filter((s) => s.id === 'home' || s.id === 'layout'), rightSys = system.filter((s) => !leftSys.includes(s));
  const g: Geometry = { mode, picture: { x: 0, y: 0, w, h }, stickZone: null, stickHome: { x: 0, y: 0 }, stickRadius: 0, buttonZone: null, buttons: [], system: [] };

  if (mode === 'landscape') {
    // The picture as tall as the screen, unless that leaves the gutters too narrow for thumbs
    // (the buttons' gutter is wider when there are more of them).
    const n = game.buttons.length;
    const minLeft = controls ? Math.max(MIN_GUTTER + 14, W * 0.12) : SYSTEM_R * 2 + 12;
    const minRight = !controls ? SYSTEM_R * 2 + 12 : Math.max(W * 0.12, n >= 4 ? 150 : n === 3 ? 130 : MIN_GUTTER + 14);
    let ph = H, pw = ph * PICTURE_ASPECT;
    if (pw > W - minLeft - minRight) { pw = Math.max(0, W - minLeft - minRight); ph = pw / PICTURE_ASPECT; }
    const spare = W - minLeft - minRight - pw;
    const px = X0 + minLeft + spare / 2, py = Y0 + (H - ph) / 2;
    g.picture = { x: px, y: py, w: pw, h: ph };
    const gw = px - X0;
    const left: Rect = { x: X0, y: Y0, w: gw, h: H };
    const right: Rect = { x: px + pw, y: Y0, w: X0 + W - (px + pw), h: H };
    g.system = [...rowOf(leftSys, left, 'start'), ...rowOf(rightSys, right, 'end')];
    const below = (r: Rect, list: SystemSpec[]): Rect => { const top = rowsHeight(list, r); return { x: r.x, y: r.y + top, w: r.w, h: r.h - top }; };
    if (game.stick !== 'none') placeStick(g, below(left, leftSys));
    if (game.buttons.length) placeButtons(g, game.buttons, below(right, rightSys));
  } else {
    // The picture across the top, the controls underneath.
    const pw = W, ph = pw / PICTURE_ASPECT;
    g.picture = { x: X0, y: Y0, w: pw, h: ph };
    const under: Rect = { x: X0, y: Y0 + ph, w: W, h: H - ph };
    g.system = [...rowOf(leftSys, { ...under, w: W / 2 }, 'start'), ...rowOf(rightSys, { ...under, x: X0 + W / 2, w: W / 2 }, 'end')];
    const top = Math.max(rowsHeight(leftSys, { ...under, w: W / 2 }), rowsHeight(rightSys, { ...under, w: W / 2 }));
    const rest: Rect = { x: X0, y: under.y + top, w: W, h: under.h - top };
    // (on a tall phone the controls sit low, where thumbs are, rather than spread up to the picture)
    const tall = Math.max(0, rest.h - Math.min(rest.h, W * 0.9));
    const low: Rect = { ...rest, y: rest.y + tall, h: rest.h - tall };
    if (game.stick !== 'none') placeStick(g, { ...low, w: game.buttons.length ? W / 2 : W }, { ...rest, w: game.buttons.length ? W / 2 : W });
    if (game.buttons.length) placeButtons(g, game.buttons, { ...low, x: X0 + (game.stick !== 'none' ? W / 2 : 0), w: game.stick !== 'none' ? W / 2 : W }, { ...rest, x: X0 + (game.stick !== 'none' ? W / 2 : 0), w: game.stick !== 'none' ? W / 2 : W });
  }
  return g;
}

const SYSTEM_STEP = SYSTEM_R * 2 + 8;
/** How many small buttons go in a row across a gutter `r`. */
const perRowIn = (r: Rect) => Math.max(1, Math.floor((r.w - 8) / SYSTEM_STEP));
/** How far down a gutter its rows of small buttons reach (one row's height, however few: SYSTEM_ROW). */
function rowsHeight(list: SystemSpec[], r: Rect) {
  return SYSTEM_ROW + Math.max(0, Math.ceil(list.length / perRowIn(r)) - 1) * SYSTEM_STEP;
}

/** Small buttons in a row along the top of a gutter, from its outer edge. */
function rowOf(list: SystemSpec[], r: Rect, from: 'start' | 'end'): PlacedSystem[] {
  const step = SYSTEM_STEP;
  // (in a narrow gutter, a second row)
  const perRow = perRowIn(r);
  return list.map((spec, i) => {
    const col = i % perRow, row = Math.floor(i / perRow);
    const x = from === 'start' ? r.x + 6 + SYSTEM_R + col * step : r.x + r.w - 6 - SYSTEM_R - col * step;
    return { spec, x, y: r.y + 6 + SYSTEM_R + row * step, r: SYSTEM_R };
  });
}

function placeStick(g: Geometry, z: Rect, zone: Rect = z) {
  g.stickZone = zone;
  g.stickRadius = Math.max(30, Math.min(58, z.w * 0.36, z.h * 0.3));
  g.stickHome = { x: z.x + z.w / 2, y: z.y + Math.max(g.stickRadius + 8, Math.min(z.h - g.stickRadius - 12, z.h * 0.62)) };
}

/**
 * The buttons: the main one (first) lowest, where the thumb rests; the rest above it,
 * in one column or two. Touches anywhere in the zone go to the nearest button.
 */
function placeButtons(g: Geometry, specs: ButtonSpec[], z: Rect, zone: Rect = z) {
  g.buttonZone = zone;
  const n = specs.length;
  const cols = n <= 2 || z.w < 150 && n <= 3 ? 1 : 2;
  const rowsAbove = Math.ceil((n - 1) / cols);
  // unit u: the main button's radius (others are smaller)
  const u = Math.max(16, Math.min(40, z.w / (cols === 1 ? 2.5 : 4.2), (z.h - 16) / (2.4 + 1.9 * rowsAbove * 0.85)));
  const main = specs[0];
  const mx = z.x + z.w / 2, my = z.y + Math.min(z.h - u * 1.3, Math.max(u * 1.2 + rowsAbove * u * 1.9 * 0.85, z.h * 0.66));
  g.buttons.push({ index: 0, spec: main, x: mx, y: my, r: u * SIZE[main.size ?? 'big'] });
  for (let i = 1; i < n; i++) {
    const k = i - 1, row = Math.floor(k / cols), col = k % cols;
    const r = u * SIZE[specs[i].size ?? 'normal'];
    // two columns zig-zag a little, so neighbours are easy to tell apart under a thumb
    const x = cols === 1 ? mx : z.x + z.w * (col === 0 ? 0.28 : 0.72);
    const y = my - u * 1.15 - u * 0.85 - row * u * 1.9 * 0.85 + (cols === 2 && col === 1 ? u * 0.35 : 0);
    g.buttons.push({ index: i, spec: specs[i], x, y, r });
  }
}

// ---- which way round -------------------------------------------------------------------

/**
 * How the stage is shown:
 * - 'landscape': the viewport is landscape (the phone was turned and the page turned with
 *   it, or the orientation lock in full screen did it), drawn as laid out;
 * - 'rotated': the viewport is portrait but the player turned the phone (rotation locked):
 *   the stage is laid out landscape and drawn turned a quarter, `turn` says which way;
 * - 'portrait': the picture on top, the controls under it (chosen, or not turned yet).
 */
export type StageMode = 'landscape' | 'rotated' | 'portrait';

export interface ModeInput {
  /** Viewport size (CSS px). */
  vw: number;
  vh: number;
  /** The player prefers portrait (picture on top). */
  preferPortrait: boolean;
  /** The first tap has happened (before it, a phone in portrait shows "turn your phone"). */
  started: boolean;
  /** An orientation lock to landscape was asked for and hasn't answered yet. */
  lockPending: boolean;
}

export function decideMode(m: ModeInput): StageMode {
  if (m.vw >= m.vh) return 'landscape';
  if (m.preferPortrait) return 'portrait';
  if (!m.started || m.lockPending) return 'portrait';
  return 'rotated';
}

/** Rotated: which way the stage is turned. 90 = clockwise (the phone turned anticlockwise, its top to the left). */
export type Turn = 90 | -90;

/**
 * A client (viewport) position to stage coordinates, for a stage of the viewport's
 * size (vw×vh) turned by `turn` (the stage is then vh wide and vw tall).
 */
export function clientToStage(cx: number, cy: number, vw: number, vh: number, turn: Turn | 0) {
  if (turn === 90) return { x: cy, y: vw - cx };
  if (turn === -90) return { x: vh - cy, y: cx };
  return { x: cx, y: cy };
}

/** The CSS transform that turns a stage laid out vh×vw into a vw×vh viewport (origin at the top left). */
export function stageTransform(vw: number, vh: number, turn: Turn | 0) {
  if (turn === 90) return `translate(${vw}px, 0px) rotate(90deg)`;
  if (turn === -90) return `translate(0px, ${vh}px) rotate(-90deg)`;
  return '';
}

/** Whether to offer touch controls at all: a phone or tablet, or a touch seen on this page. */
export function wantsTouch(coarsePointer: boolean, touchSeen: boolean) {
  return coarsePointer || touchSeen;
}
