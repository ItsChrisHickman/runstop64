/**
 * Monty on the Run's Monty, shared: what a game gives it to move him (docs/montymole-remix-plan.md, "Shared with montyotr").
 *
 * Coordinates are the original's: `x2` is the sprite X in 2-pixel units, `y` the VIC sprite Y, the collision box 2 x 2 cells from
 * his top-left cell (3 across or down when he is between cells). A game's state object has these fields (montyotr's `Game`, the
 * remix's `RemixGame`); the physics (physics.ts), the animation (anim.ts) and the deaths (deaths.ts) work on them and on the
 * little a game must say about its world (`MontyWorld`).
 */

/** What the player holds. */
export interface MontyInput { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean }

/** The fields of Monty the physics reads and writes (the original's zero page: the names follow the reconstruction's labels). */
export interface MontyBody {
  input: MontyInput;
  /** fire pressed this frame (cleared at the end of a jump) */
  inputFire: boolean;
  x2: number;
  y: number;
  /** player_facing: $01 right, $81 left */
  facing: number;
  frameIndex: number;
  /** sprite_xmsb: the step gate, the low bit of x2 (Monty moves a pixel every other frame sideways) */
  stepGate: number;
  /** 0 on the ground, else the jump's action */
  montyAction: number;
  /** monty_jumping_flag2: falling */
  falling: number;
  arcIdx: number;
  savedLeft: boolean;
  savedRight: boolean;
  /** monty_tile_state: on a rope */
  onRope: number;
  isMoving: boolean;
  dirLeft: boolean;
  dirRight: boolean;
  dirUp: boolean;
  dirDown: boolean;
  upSteps: number;
  downSteps: number;
  animTimer: number;
  ticker: number;
  stateCur: number;
  statePrev: number;
  /** a sequence has him (a death): the physics and the animation leave him alone */
  gameMode: number;
  /** a pending event: 5 when both feet are on water or lava (the hazard death) */
  actionCounter: number;
  /** the room grid's cell he is in, and the exit he leaves by */
  mapRow: number;
  exitCol: number;
  roomExit: number;
}

/** What Monty needs to know of the room he is in. */
export interface MontyWorld {
  /** The collision class of the cell at a screen row and column (0 none, 1 solid, 2 holds from above, 3 rope, 4 hazard). */
  flagAt(row: number, col: number): number;
  /** The room at a cell of the room grid ($FF: none, so the way is closed). */
  roomAt(row: number, col: number): number;
}

/** The first screen pixel of the playfield: x2 and y of the cell (0, 0). */
export const X2_ORIGIN = 0x0c;
export const Y_ORIGIN = 0x32;

/** The screen row and column of his top-left cell. */
export const montyRow = (b: Pick<MontyBody, 'y'>): number => ((b.y - Y_ORIGIN) & 0xff) >> 3;
export const montyCol = (b: Pick<MontyBody, 'x2'>): number => ((b.x2 - X2_ORIGIN) & 0xff) >> 2;
