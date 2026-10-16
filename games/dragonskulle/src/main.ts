import { obliqueRooms, type FrameCapture, type Gauge, type Host, type PictureLayout } from 'c64kit';
import { runNative } from '../../shared/native/play';
import { cpu, ram as bound } from '../../shared/native/cpu';
import { port } from './native';
import * as engine from './gen/engine';
import { dragonskulleMap, cellOf } from './map';
import { dragonskulleCombat, dragonskulleControls } from './combat';
import { hintSpots } from './hint-spots';
import { shovelByHand } from './shovel';
import { dragonskulleHd } from './hd';
import stateUrl from '../assets/dragonskulle-title.state?url';

/**
 * Dragonskulle — a translated port: the original 1986 code translated routine by
 * routine to TypeScript (src/gen, see re/README.md), on the shared native
 * runtime. It starts from the game's memory as it stands at the title screen
 * (see build/README.md), so there's no loading.
 */
export const info = {
  title: 'Dragonskulle',
  progress: 'Your progress is saved each time Pendragon comes onto a screen: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Dragon_Skulle">Dragonskulle</a> (1986): Sir Arthur Pendragon lands on the
    Island of the Skull and must find and destroy the Crystal Skull of Souls, deep in the caves under it. The fourth and
    last of the Pendragon adventures, after <a href="https://en.wikipedia.org/wiki/The_Staff_of_Karnath">The Staff of Karnath</a>,
    <a href="https://en.wikipedia.org/wiki/Entombed_(video_game)">Entombed</a> and
    <a href="https://en.wikipedia.org/wiki/Blackwyche">Blackwyche</a>. All credit belongs to its creators:</p>
    <ul>
      <li>Created and designed by Dave Thomas and Bob Thomas</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Ultimate_Play_the_Game">Ultimate Play the Game</a>
        (Ashby Computers &amp; Graphics), January 1986 (the title screen says 1985)</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64, so it plays exactly as it did in 1986.
    The title screen's copyright line is restored (this copy had a cracker's name in it).</p>
    <p>Controls: arrows (or WASD) move, hold Shift to run &middot; Z jump, X stone, C dig, V cloak: each one straight
    away, as the bar along the bottom of the screen shows them &middot; Space (or pad A) uses the action the hand points
    at, Enter (or any other key) moves the hand one along &middot; P or Esc pauses, with a map &middot; R (or F1)
    restarts &middot; M mutes</p>
    <p>Added for runstop64: the status line (score, lives) at the top of the screen and the actions at the bottom, in
    the order of their keys and labelled with them (the PAUSE icon is P or Esc now); a map of the island on the pause screen (P, or the gear) with travel back to any screen
    you've been on; progress saved each time you come onto a screen (coming back carries on where you were; T on the pause screen goes to the title); after
    losing, continue from the last screen you came onto with all five lives; back to the start of a screen. Fights get
    effects over the picture and sounds of their own. ENHANCED (on unless you switch to ORIGINAL with E on the pause
    screen): 8-way controls, safe for a moment after a hit, knockback, hit-stop, full energy on coming onto each
    screen, the shovel taken by walking up to it (the original only gave it to a well-aimed stone), and sparkles on
    what moves the game on. The C64/HD button (bottom right; on a phone beside PAUSE; or H) switches to the HD view (a first version): the same game
    as a lit 3D scene built from its own picture. The full list is in
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/dragonskulle/QOL.md">QOL.md</a>.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

const JOYSTICK_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'KeyX', 'ControlLeft', 'ControlRight'];

/** The five faces (lives) in the status line, from the left: the game draws a skull over each one lost ($1501) and a face back ($9CBD). */
const FACE = { chars: [0x7b, 0x7c, 0x7d, 0x7e, 0x7f, 0x1b, 0x1c, 0x1d, 0x1e], colours: [9, 9, 9, 10, 10, 10, 10, 10, 10] };
/** All five lives, a full face of energy, nothing still to take: as a game starts. */
export function allLives(ram: Uint8Array, colour: Uint8Array) {
  ram[0x1248] = 0; ram[0x123e] = 0x14; ram[0x3432] = 0; ram[0x125f] = 0; ram[0x1249] = 0;
  for (let face = 0; face < 5; face++) for (let i = 0; i < 9; i++) {
    const at = 0x387 + face * 3 + (i % 3) + Math.floor(i / 3) * 40;
    ram[0x400 + at] = FACE.chars[i]; colour[at] = FACE.colours[i];
  }
}
/** The energy of the life under way: $123E, 20 at full (a face, the lives' column in the status line, goes when it's gone). */
export const ENERGY = { max: 0x14, get: (ram: Uint8Array) => ram[0x123e] };
/**
 * The energy shown on the face of the life under way (the original shows nothing until a whole life
 * is gone): the leftmost face not yet a skull ($1248: three per face lost, the skulls from the left),
 * its picture (lines 2-22 of its 3x3 characters, in status row 22 from column 23 + 3 a face) emptying
 * from the top to dark grey as the energy goes. At none the game draws its skull there, as ever.
 */
export const energyFace: Gauge = {
  at: (ram) => {
    const face = Math.floor(ram[0x1248] / 3);
    return face < 5 ? { x: (23 + 3 * face) * 8 + PANEL_SCROLL, y: 22 * 8 + 2, w: 24, h: 21 } : null;
  },
  level: (ram) => ENERGY.get(ram) / ENERGY.max,
  empty: 11,
};

/** The actions, as the hand points at them ($12EB; the hand's place $12EC, 7 columns each). */
export const ACTION = { shovel: 0, cloak: 1, pause: 2, stone: 3, jump: 4 };

/**
 * The bar as we show it: the actions in the order of their keys, each labelled with its key (no
 * PAUSE: P or Esc open the pause screen, which covers it). The game draws its icons in its own
 * order at the top of the screen (rows 0-2: an icon in columns 7n+2 to 7n+4 and the hand pointing
 * at it in 7n+5 to 7n+7, coloured in only where it points: $12CF), with the status line (score,
 * faces) at the bottom (rows 22-24). The picture is shown with those swapped: the status line at
 * the top, the play area under it, then the bar: each icon and its hand moved as the game draws
 * them (so the hand, and the flash of an icon not yet found, are the game's own), each labelled
 * below, centred under its icon, in the panel's own letters. To make room for the labels below
 * the icons, the play area's top four pixel lines (y 24-27, the top half of row 3) are left out:
 * no character is ever drawn there in play (every screen of the island's table, entered by the
 * game's own change of screen, and the recorded routes: re/README.md, "The action bar"). Sprites
 * reaching up into them are drawn whole, moved up with the play area. The game's memory, and its
 * logic, are untouched.
 */
export const BAR = [
  { action: ACTION.jump, key: 'Z', name: 'JUMP' },
  { action: ACTION.stone, key: 'X', name: 'STONE' },
  { action: ACTION.shovel, key: 'C', name: 'DIG' },
  { action: ACTION.cloak, key: 'V', name: 'CLOAK' },
];
/** The panels' rows are drawn 7 pixels to the right (their $D016 is 7): a character column c is at 8c + 7. */
export const PANEL_SCROLL = 7;
/** Where action n's icon (then its hand) is in the game's panel: columns 7n+2 to 7n+7 of rows 0-2. */
export const ICON_AT = (n: number) => ({ x: (7 * n + 2) * 8 + PANEL_SCROLL, y: 0, w: 6 * 8, h: 24 });
/** The play area as the game draws it (rows 3-20), less the lines left out at its top; and where it's shown (under the status line). */
export const PLAY = { from: { x: 0, y: 28, w: 320, h: 140 }, y: 24 };
/**
 * Where the bar is shown (pixels): slot k's icon (24 wide, its hand to its right), the icons' and
 * the labels' tops. The icons' pictures fill their first 23 lines, the letters their cell's last 7:
 * 2 lines between the play area (to 163) and the icons (166-188), 3 between the icons and their
 * labels (192-198). The slots are 76 apart, the whole (labels to the last hand) centred.
 */
export const BAR_AT = { icon: (k: number) => 28 + 76 * k, icons: 166, labels: 191 };
/** Where a label starts for its text to be centred under slot k's icon (drawLabels adds the panel's scroll). */
const labelX = (k: number, text: string) => BAR_AT.icon(k) + 12 - (text.length * 8) / 2 - PANEL_SCROLL;
export const dragonskulleLayout: PictureLayout = {
  moves: [
    // the play area up under the status line, with what's drawn over it (sprites reach up over the
    // panel, and down onto row 21, as in the original)
    { from: PLAY.from, to: { x: 0, y: PLAY.y }, over: { x: 0, y: 0, w: 320, h: 176 } },
    // the status line (rows 22-24) to the top
    { from: { x: 0, y: 22 * 8, w: 320, h: 24 }, to: { x: 0, y: 0 } },
    // each icon with its hand, from the game's order at the top to the bar's at the bottom
    ...BAR.map((b, k) => ({ from: ICON_AT(b.action), to: { x: BAR_AT.icon(k), y: BAR_AT.icons } })),
  ],
  // under the play area (inside the 38-column border)
  clear: [{ x: 7, y: PLAY.y + PLAY.from.h, w: 306, h: 200 - PLAY.y - PLAY.from.h, colour: 0 }],
  // the key white, the action light grey
  labels: BAR.flatMap((b, k) => {
    const x = labelX(k, `${b.key} ${b.name}`);
    return [
      { text: b.key, x, y: BAR_AT.labels, colour: 1 },
      { text: b.name, x: x + 16, y: BAR_AT.labels, colour: 15 },
    ];
  }),
  font: 22, // (the status line's letters: SCORE, HIGH SCORE)
  gauges: [energyFace],
};
/** The play screen: the panels' charset ($3000) on rows 0-2 and 22-24, the playfield's ($3800) between (the raster split). */
const playScreen = ({ capture: cap }: { capture: FrameCapture }) => cap.rows[0]?.d018 === 0x1c && cap.rows[3]?.d018 === 0x1e && cap.rows[22]?.d018 === 0x1c;

/**
 * The title's key instructions, for this keyboard (same lengths as the originals'). The action keys
 * aren't listed (the bar in play labels them): the line that said 'ANY OTHER KEY TO CHANGE ACTION'
 * is left blank, the row ENTER CONTINUE goes on when there's a save.
 */
const TITLE_TEXT: Record<number, string> = {
  0x9327: 'PRESS P   TO PAUSE GAME', // was 'PRESS F7  TO PAUSE GAME'
  0x933e: 'PRESS R   TO RESTART   ', // was 'PRESS F1  TO RESTART   '
  0x9355: '                              ', // was 'ANY OTHER KEY TO CHANGE ACTION'
  0x9373: ' PRESS SPACE OR FIRE TO START ', // was 'PUSH JOYSTICK BUTTON TO START '
};
/** The title's row that line was on (row 19): ENTER CONTINUE goes there. */
const TITLE_FREE_ROW = 19;

export function run(host: Host) {
  let options: Readonly<Record<string, boolean>> = {};
  return runNative(host, {
    id: 'dragonskulle',
    strip: { y: TITLE_FREE_ROW * 8 },
    state: stateUrl,
    port,
    // the screen he's on (each is a room for the autosave)
    room: (ram) => { const { x, y } = cellOf(ram); return (y << 5) | x; },
    titleWaits: [0x9951, 0x995c, 0x9960],
    // continuing: all five lives back, as the game starts with
    fullHealth: (ram, colour) => allLives(ram, colour),
    // full energy on coming onto a screen (ENHANCED): the face going ($123E, 20 to a face)
    health: { ...ENERGY, set: (ram, _colour, v) => { ram[0x123e] = v; } },
    map: dragonskulleMap,
    // sparkles on what moves the game on (ENHANCED): re/hints
    hints: hintSpots,
    // ENHANCED's own play changes: the shovel taken by walking up to it (src/shovel.ts), at the room's check of the collisions
    onAssists: (a) => { options = a; },
    assists: [{ id: 'enhanced', long: 'ENHANCED', default: true }],
    onHook: (pc, ram) => { if (options.enhanced) shovelByHand(pc, ram); },
    // the fights (src/combat.ts): effects and sounds, the combat assists; and the 8-way controls
    combat: dragonskulleCombat,
    controls: dragonskulleControls,
    // the status line at the top, the bar (in the keys' order, labelled) at the bottom: both modes
    layout: [{ picture: dragonskulleLayout, when: playScreen }],
    // the HD view (the shell's C64/HD switch): the room rebuilt in 3D from its characters, lit (src/hd.ts),
    // where the layout shows the play area
    hd: obliqueRooms(dragonskulleHd),
    // straight to an action (the original only moves the hand on with "any other key", one icon each 5 frames held);
    // Enter (or any other key) moves it to the next one along the bar, one a press
    actions: {
      keys: { KeyZ: ACTION.jump, KeyX: ACTION.stone, KeyC: ACTION.shovel, KeyV: ACTION.cloak },
      also: 'fire',
      next: { order: BAR.map((b) => b.action), get: (ram) => ram[0x12eb] },
      set: (ram, n, call) => call(() => {
        // the hand off the icon it was on, onto the new one ($12CF colours it, as $12A1 does)
        cpu.x = ram[0x12ec]; cpu.a = 0; engine.r_12cf();
        ram[0x12eb] = n; ram[0x12ec] = n * 7; ram[0x12ed] = 0;
        cpu.x = ram[0x12ec]; cpu.a = 0x0a; engine.r_12cf();
      }),
    },
    // Touch: the stick, USE (the action the hand points at), straight to an action, and RUN (added for `run`).
    touch: {
      stick: '8',
      buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'STONE', key: 'KeyX' }, { label: 'DIG', key: 'KeyC' }, { label: 'CLOAK', key: 'KeyV' }],
    },
    // hold Shift to run: his handling ($16C1) runs twice a frame (not while the hand is on PAUSE: that waits)
    run: { player: () => { if (bound[0x12eb] !== ACTION.pause) for (const _ of engine.r_16c1()) break; } },
    reserved: [...JOYSTICK_KEYS, 'KeyC', 'KeyV'],
    remap: { KeyP: 'F7', Escape: 'F7', KeyR: 'F1', F1: 'F1' },
    text: TITLE_TEXT,
  });
}
