import { Surface, TRANSPARENT, decodeSprite, type FrameCapture, type Vic } from 'c64kit';

/**
 * The cast of a game's ending, as the engine draws it: a figure is made of the sprites a game shows for a
 * creature, recorded a frame at a time (every distinct picture, with how long it was held), so the montage shows
 * the game's own frames at the pace it showed them.
 */

/** A sprite as a game showed it at one moment: where, its colours and its 63 bytes (what `decodeSprite` reads). */
export interface SpriteShot {
  x: number; y: number; colour: number;
  multicolour: boolean; mc1: number; mc2: number;
  expandX: boolean; expandY: boolean;
  data: Uint8Array;
}

/** Sprite `n` of a VIC as it shows now (null if it is not shown). */
export function vicShot(vic: Vic, n: number): SpriteShot | null {
  if (!(vic.enable & (1 << n))) return null;
  const r = vic.sprites[n];
  return {
    x: r.x >= 504 ? r.x - 504 : r.x, y: r.y, colour: r.colour & 15,
    multicolour: !!(vic.multicolour & (1 << n)), mc1: vic.mc1 & 15, mc2: vic.mc2 & 15,
    expandX: !!(vic.expandX & (1 << n)), expandY: !!(vic.expandY & (1 << n)),
    data: Uint8Array.from(vic.spriteData(r.ptr).subarray(0, 63)),
  };
}

/** A sprite of a C64's frame capture (a native game's picture: C64View draws it), as a shot. */
export function captureShot(s: FrameCapture['sprites'][number]): SpriteShot {
  return {
    x: s.x >= 504 ? s.x - 504 : s.x, y: s.y, colour: s.colour & 15,
    multicolour: s.multicolour, mc1: s.mc1 & 15, mc2: s.mc2 & 15, expandX: s.expandX, expandY: s.expandY,
    data: Uint8Array.from(s.data.subarray(0, 63)),
  };
}

/** One part of a figure at one moment: its image (the game's own pixels), and where it stands against the figure's top left. */
export interface Part { surface: Surface; dx: number; dy: number }
/** A figure at one moment, and how long (frames) it was so. */
export interface Pose { parts: Part[]; frames: number }
/** A figure: its poses, the box it fits in, and `foot`, the row (from its top) where its lowest pixels end in any pose (the floor it stands on; a sprite may leave rows empty at the bottom). */
export interface Figure { name: string; poses: Pose[]; width: number; height: number; foot: number }

/** Where the lowest pixels of any pose end, from the figure's top. */
export function footOf(poses: readonly Pose[]): number {
  let foot = 0;
  for (const pose of poses) {
    for (const { surface: s, dy } of pose.parts) {
      for (let row = s.height - 1; row >= 0; row--) {
        let any = false;
        for (let x = 0; x < s.width && !any; x++) any = s.pixels[row * s.width + x] !== TRANSPARENT;
        if (any) { foot = Math.max(foot, dy + row + 1); break; }
      }
    }
  }
  return foot;
}

/** A flat picture (the game's pixels, 1:1) as a part of a figure, its top left at (dx, dy). */
export function flatPart(flat: Surface, dx = 0, dy = 0): Part {
  return { surface: flat, dx, dy };
}

/** A part of a figure, from the game's sprite. */
function partOf(s: SpriteShot, left: number, top: number): Part {
  const flat = new Surface(24 * (s.expandX ? 2 : 1), 21 * (s.expandY ? 2 : 1));
  decodeSprite(s.data, s.colour, s.multicolour, s.mc1, s.mc2, s.expandX, s.expandY, flat);
  return flatPart(flat, s.x - left, s.y - top);
}

/**
 * A figure from pictures of it, a frame at a time (null: not seen that frame): a creature a game draws with characters, which
 * has no sprite to record, only the pixels it was drawn in. Each distinct picture is a pose, with how long it was held.
 */
export function recordPictures(name: string, pictures: Iterable<Surface | null>): Figure | null {
  const poses: Pose[] = [];
  let last = '';
  let width = 0, height = 0;
  for (const flat of pictures) {
    if (!flat) continue;
    const key = `${flat.width}x${flat.height}:${flat.pixels.join('.')}`;
    const prev = poses[poses.length - 1];
    if (key === last && prev) { prev.frames++; continue; }
    last = key;
    const part = flatPart(flat);
    poses.push({ parts: [part], frames: 1 });
    width = Math.max(width, part.surface.width);
    height = Math.max(height, part.surface.height);
  }
  return poses.length ? { name, poses, width, height, foot: footOf(poses) } : null;
}

/** The picture row a sprite's lowest pixels end on (the VIC's sprite coordinates are 50 down; a sprite may leave rows empty at its foot). */
export function shotFeet(s: SpriteShot): number {
  let rows = 0;
  for (let row = 20; row >= 0 && rows === 0; row--) if (s.data[row * 3] !== 0 || s.data[row * 3 + 1] !== 0 || s.data[row * 3 + 2] !== 0) rows = row + 1;
  return s.y - 50 + rows * (s.expandY ? 2 : 1);
}

/** The pictures a figure's sprites made (a moment at a time: its sprites, rearmost first), as a figure. Null if it was never seen. */
export function recordFigure(name: string, moments: Iterable<readonly SpriteShot[]>): Figure | null {
  const poses: Pose[] = [];
  let last = '';
  let width = 0, height = 0;
  for (const shots of moments) {
    if (shots.length === 0) continue;
    const left = Math.min(...shots.map((s) => s.x)), top = Math.min(...shots.map((s) => s.y));
    const key = shots.map((s) => `${s.x - left},${s.y - top},${s.colour},${s.multicolour ? 1 : 0},${s.mc1},${s.mc2},${s.expandX ? 1 : 0},${s.expandY ? 1 : 0},${s.data.join('.')}`).join('|');
    const prev = poses[poses.length - 1];
    if (key === last && prev) { prev.frames++; continue; }
    last = key;
    const parts = shots.map((s) => partOf(s, left, top));
    poses.push({ parts, frames: 1 });
    width = Math.max(width, ...parts.map((p) => p.dx + p.surface.width));
    height = Math.max(height, ...parts.map((p) => p.dy + p.surface.height));
  }
  return poses.length ? { name, poses, width, height, foot: footOf(poses) } : null;
}

/** The pose a figure is in `t` frames into its cycle (it goes round again after the last). */
export function poseAt(figure: Figure, t: number): Pose {
  const cycle = figure.poses.reduce((n, p) => n + p.frames, 0);
  let at = t % cycle, pose = figure.poses[0];
  for (const p of figure.poses) { pose = p; if (at < p.frames) break; at -= p.frames; }
  return pose;
}
