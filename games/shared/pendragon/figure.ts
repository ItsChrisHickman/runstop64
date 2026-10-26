import type { SpriteCapture } from '../../../packages/c64kit/src/c64/machine';
import { DRAWN_FRAMES } from './figure-drawn';
import { DRAGONSKULLE_FRAMES } from './figure-frames';

/**
 * Pendragon as Dragonskulle draws him, in the games that draw him another way (Karnath, Entombed, Blackwyche): ENHANCED only, and
 * presentation only. After each frame the game ran, the picture it showed for sprite 2 in the frame's capture (`m.capture.sprites`,
 * what the VIC drew) is looked up by its 63 bytes and the entry is given Dragonskulle's picture for the same pose, a little moved so
 * the feet stand where the game's own figure's feet stood, in colours by role. Nothing is written to the machine: its memory, its
 * collision registers (taken at the end of the frame, before this runs), the combat hooks and the saves are the game's. The next
 * frame's capture is the game's own again.
 *
 * All four games share one grid: a multicolour sprite, Y-expanded, 24 x 42 px, so no picture is resized. Each game declares only its
 * `FigureSpec`: which of its pictures becomes which frame (`table`, made from the study in `study/tables.ts`), and how its colour
 * registers map to the figure's three colours. Poses Dragonskulle has no picture for (Karnath's cast, Entombed's whip, Blackwyche's
 * sword) take `throw` frames, or frames drawn for them (`figure-drawn.ts`).
 */

export type Dir = 'R' | 'L' | 'U' | 'D';
export const DIRS: readonly Dir[] = ['R', 'L', 'U', 'D'];
/** What he is doing: `throw` is Dragonskulle's own (the stone), `cast`, `whip` and `sword` are drawn for the games that have them. */
export type Pose = 'stand' | 'walk' | 'jump' | 'throw' | 'cast' | 'whip' | 'sword';
/** A frame of the figure: `stand.R.0`, `walk.U.7`, `jump.L.1`... (the number counts the pose's pictures that way, from 0). */
export type FrameId = `${Pose}.${Dir}.${number}`;
/** The pictures a game shows for sprite 2 (as the 126 hex digits of their 63 bytes) and the frame each becomes. */
export type FigureTable = readonly (readonly [picture: string, frame: FrameId])[];
/** One of the VIC's three sprite colours: its own ($D027+n), or the two all sprites share ($D025, $D026). */
export type Reg = 'own' | 'mc1' | 'mc2';
export type Regs = Readonly<Record<Reg, number>>;

/** What a game declares. */
export interface FigureSpec {
  /** Sprite 2 in every Pendragon game. */
  sprite: number;
  table: FigureTable;
  /** Pictures that stay as the game draws them (Entombed's ghost: he is not Pendragon then). */
  keep?: readonly string[];
  /**
   * The colours: the registers the game normally sets (`normal`), and which of them paints his face and hands, his tunic and his
   * cape. A role whose register is as the game normally sets it takes Dragonskulle's colour; a role the game has recoloured (a
   * hurt flash, the dark chambers) keeps the game's colour.
   */
  colours: { normal: Regs; face: Reg; tunic: Reg; cape: Reg };
  /**
   * A picture not in the table (a walk's first step, a turn: one frame in fifty or so) shows the stand picture of the way he faces,
   * if the game says where it keeps that (`ControlsSpec.facing`). Without it such a picture stays as drawn.
   */
  standIn?: { addr: number; right: number; left: number; up: number; down: number };
}

/** Dragonskulle's colours: his face and arms, his tunic, his cape. */
export const DRAGONSKULLE_COLOURS: Regs = { own: 10, mc1: 5, mc2: 0 };

const FRAMES: ReadonlyMap<FrameId, Uint8Array> = new Map([...DRAGONSKULLE_FRAMES, ...DRAWN_FRAMES].map(([id, hex]) => [id, unhex(hex)]));

export function unhex(hex: string): Uint8Array {
  const out = new Uint8Array(64);
  for (let i = 0; i < 63; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** The frame's picture: throws on an id the library does not have. */
export function frameData(id: FrameId): Uint8Array {
  const d = FRAMES.get(id);
  if (!d) throw new Error(`no figure frame ${id}`);
  return d;
}

/** FNV-1a over a picture's 63 bytes (the 64th is padding). */
export function pictureHash(data: ArrayLike<number>): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < 63; i++) h = Math.imul(h ^ data[i], 0x01000193) >>> 0;
  return h;
}

/** Where a picture's pixels are in its grid: rows 0-20 (each two screen pixels tall) and multicolour pixels 0-11 (each two wide). */
export interface Bounds { top: number; bottom: number; left: number; right: number }
export function boundsOf(data: ArrayLike<number>): Bounds | null {
  let top = 99, bottom = -1, left = 99, right = -1;
  for (let row = 0; row < 21; row++) for (let b = 0; b < 3; b++) {
    const v = data[row * 3 + b];
    if (!v) continue;
    top = Math.min(top, row); bottom = Math.max(bottom, row);
    for (let pair = 0; pair < 4; pair++) if ((v >> (6 - pair * 2)) & 3) { left = Math.min(left, b * 4 + pair); right = Math.max(right, b * 4 + pair); }
  }
  return bottom < 0 ? null : { top, bottom, left, right };
}

/** A replacement picture and how far (screen pixels) the sprite is moved to show it. */
export interface Placed { data: Uint8Array; dx: number; dy: number }

/** The movement that puts `frame` where `from` stood: the same feet line, the same middle (whole multicolour pixels sideways). */
function placeLike(from: Uint8Array, frame: Uint8Array): { dx: number; dy: number } {
  const a = boundsOf(from), b = boundsOf(frame);
  if (!a || !b) return { dx: 0, dy: 0 };
  return { dx: Math.round((a.left + a.right - b.left - b.right) / 2) * 2, dy: (a.bottom - b.bottom) * 2 };
}

export class FigureSwap {
  private readonly byPicture = new Map<number, Placed>();
  private readonly keep = new Set<number>();
  /** The hashes of the library's frames. */
  private readonly frames = new Set<number>();
  private readonly stands = new Map<Dir, Placed>();
  /** Captures already swapped (a frame the game did not run is shown again). */
  private readonly done = new WeakSet<SpriteCapture>();

  constructor(readonly spec: FigureSpec) {
    const own = new Map<Dir, Uint8Array>();
    for (const [picture, id] of spec.table) {
      const dir = dirOf(id);
      if (id.startsWith('stand.') && !own.has(dir)) own.set(dir, unhex(picture));
    }
    // each way's movement comes from that way's stand pictures (the same for every pose facing that way: a walk moves as he does)
    const move = (dir: Dir): { dx: number; dy: number } => {
      const from = own.get(dir);
      return from ? placeLike(from, frameData(`stand.${dir}.0`)) : { dx: 0, dy: 0 };
    };
    for (const [picture, id] of spec.table) {
      const data = unhex(picture), key = pictureHash(data);
      const was = this.byPicture.get(key);
      if (was) throw new Error(`figure table: two pictures with one hash (${picture})`);
      this.byPicture.set(key, { data: frameData(id), ...move(dirOf(id)) });
    }
    // a picture that already is one of the library's (Blackwyche's, apart from its tunic's colour) needs no entry: it is itself, unmoved
    for (const [id, data] of FRAMES) {
      const key = pictureHash(data);
      this.frames.add(key);
      if (!this.byPicture.has(key)) this.byPicture.set(key, { data, dx: 0, dy: 0 });
      if (id.startsWith('stand.')) this.stands.set(dirOf(id), { data, ...move(dirOf(id)) });
    }
    for (const picture of spec.keep ?? []) this.keep.add(pictureHash(unhex(picture)));
  }

  /** What the game's picture becomes: `undefined` if it is none of his (it stays as drawn). */
  lookup(data: ArrayLike<number>): Placed | undefined {
    return this.byPicture.get(pictureHash(data));
  }

  /** Whether a picture is one of the figure's own frames (what the swap leaves in the capture). */
  shows(data: ArrayLike<number>): boolean {
    return this.frames.has(pictureHash(data));
  }

  /** Whether the spec keeps a picture as the game draws it. */
  kept(data: ArrayLike<number>): boolean {
    return this.keep.has(pictureHash(data));
  }

  /** After a frame the game ran (and only in ENHANCED): the capture's figure as Dragonskulle's. `ram`: the game's, for the way he faces. */
  apply(sprites: readonly SpriteCapture[], ram: Uint8Array): void {
    const { spec } = this;
    for (const s of sprites) {
      if (s.n !== spec.sprite || this.done.has(s) || !s.multicolour || !s.expandY || s.expandX) continue;
      this.done.add(s);
      const key = pictureHash(s.data);
      const p = this.byPicture.get(key) ?? (this.keep.has(key) ? undefined : this.standing(ram));
      if (!p) continue;
      s.data = p.data; s.x += p.dx; s.y += p.dy;
      this.recolour(s);
    }
  }

  /** The stand picture of the way he faces, for a picture the table does not have. */
  private standing(ram: Uint8Array): Placed | undefined {
    const f = this.spec.standIn;
    if (!f) return undefined;
    const v = ram[f.addr];
    return this.stands.get(v === f.right ? 'R' : v === f.left ? 'L' : v === f.up ? 'U' : v === f.down ? 'D' : 'D');
  }

  /** His three colours: Dragonskulle's, but what the game has recoloured (a flash, the dark) as the game has it. */
  private recolour(s: SpriteCapture) {
    const { normal, face, tunic, cape } = this.spec.colours;
    const now: Regs = { own: s.colour, mc1: s.mc1, mc2: s.mc2 };
    const role = (reg: Reg, mine: number) => (now[reg] === normal[reg] ? mine : now[reg]);
    s.colour = role(face, DRAGONSKULLE_COLOURS.own);
    s.mc1 = role(tunic, DRAGONSKULLE_COLOURS.mc1);
    s.mc2 = role(cape, DRAGONSKULLE_COLOURS.mc2);
  }
}

/** The way a frame faces. */
export function dirOf(id: FrameId): Dir {
  const d = id.split('.')[1];
  if (d === 'R' || d === 'L' || d === 'U' || d === 'D') return d;
  throw new Error(`frame ${id} has no way`);
}
