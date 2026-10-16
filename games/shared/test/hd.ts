/**
 * The HD view's checks of a room, for each game's test/hd.ts (one per game that has an HD view):
 * the room built from a frame of the game (its ObliqueSpec), drawn by the software renderer
 * (packages/c64kit/test/hd-raster.ts: hd/layer.ts's steps and formulas) and by the Three.js layer
 * on the stand-in GL (packages/c64kit/test/hd-gl.ts), and looked at.
 *
 * - With the camera at rest (no tilt, no perspective) every quad lands on its own pixel of the
 *   picture (the room is the same room); floor faces up, the rest stands (a corridor's side wall
 *   across); Pendragon stands on the floor under his feet; shadows lie under the sprites' footprints,
 *   none under a sprite that's a patch of the floor (`checkShadows`); the room's lights are there.
 * - The picture: lit (not black, not blown out), brightest round its lights, the same every run;
 *   the walls the picture cuts off carried on up (no black where the tilt shows above them); a dark
 *   room (one the game draws black) dark, its flames out.
 * - Visibly the HD view: pixel for pixel well away from the C64's picture (`checkRemastered`: its own
 *   light, depth and camera), the light's own range reported. (Brightness and colours are the look's
 *   to make dramatic; the eye judges them, on phone-size stills.)
 * - The view only: the HD picture shows nothing the C64's hides (where the C64's picture is black,
 *   so is the HD one, but for the sprites the game shows there); none of the pixels of a sprite set
 *   behind the characters that they hide on the C64 (`checkBehind`).
 * - The C64's picture (renderPixels, as every still draws it) has the sprites as the VIC orders them
 *   (`checkC64Priority`).
 * - A way through the game's picture (a stairs' gate, a door: characters the game takes him through when he
 *   walks into them) is where the C64 draws it (`checkHdCharacters`): its pixels show in the HD picture, and what the
 *   picture has above them (the arch, the wall they stand at the foot of) stands against them there too, not far
 *   in front of or behind it (a wall at the depth of what's in front of the stairs hung over them, the way through
 *   drawn a stair's depth from where the game takes him in).
 * - With an out-dir: C64 | HD side by side (`<name>-c64-hd.png`), the HD picture alone, and what's
 *   floor (`<name>-floor.png`: the C64 picture with what stands darkened, flames red) to look at.
 *
 * And the C64/HD switch with the game (`checkHdSwitch`: games/shared/native/play.ts's HD view driven
 * by the shell's switch, games/shared/view.ts, as the browser runs them): C64 by default (no room
 * drawn); switched in play, HD at once, and kept; in play the renderer is given the room; on the
 * title, the pause screen and CONTINUE? it isn't, and the pause screen has nothing of the switch (the
 * same screen in either view); where the GL can't draw it, C64 and no switch; and the view only: the
 * same play in each view leaves the game's memory the same, byte for byte.
 */
import { Input, PixelRenderer, packState, unpackState, type Host, type MachineState } from 'c64kit';
import { NativeHost, type PortConfig } from '../native/host';
import { ViewSwitch } from '../view';
import type { runNative } from '../native/play';
import { nowhere } from './browser';
import { obliqueRoom, obliqueRooms, type ObliqueSpec } from '../../../packages/c64kit/src/hd/oblique';
import { placePictures } from '../../../packages/c64kit/src/hd/placed';
import { decodePicture, hiddenByCharacters } from '../../../packages/c64kit/src/c64/picture';
import { cameraMatrix, HdModel, HdRooms, project, spritesFromCapture, type HdRefresher, type HdRoom, type HdScene, type HdSprite } from '../../../packages/c64kit/src/hd/scene';
import { buildWork, isFromHdWorker, type HdWorked } from '../../../packages/c64kit/src/hd/work';
import { C64View } from '../../../packages/c64kit/src/c64/view';
import type { C64 } from '../../../packages/c64kit/src/c64/machine';
import { Smoothed } from '../../../packages/c64kit/src/loop';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import type { PictureLayout } from '../../../packages/c64kit/src/layout';
import { C64_PALETTE } from '../../../packages/c64kit/src/palette';
import { rasteriseHd } from '../../../packages/c64kit/test/hd-raster';
import { checkHdGl, checkHdSprites, frameTimes } from '../../../packages/c64kit/test/hd-gl';
import { joinLayers, renderPixels, rgbPng, shownLayers, type Picture } from '../../../tools/probe/render';
import { must } from './must';
import { readRoute } from './data';

type Check = (what: string, ok: boolean) => void;

export interface HdStill {
  name: string;
  /** The machine at the frame to look at. */
  m: Picture;
  /** A room lit as usual, or dark (the game draws it black). */
  light?: 'lit' | 'dark';
  /** A corridor whose side wall should face across. */
  sideWall?: boolean;
  /** Whether the room has flames giving light (by default, if the game has any). */
  flames?: boolean;
  /** The picture's layout as the front end shows it then (renderer.layout), if any. */
  layout?: PictureLayout | null;
  /**
   * Of the pixels of a sprite set behind the characters that the C64 shows, the least share the HD view shows (0.8 unless said): the
   * room stands in front of some by depth, more where a sprite drawn over its holder (Entombed's torch flash, a billboard at the depth
   * of the floor under its own box) reaches under things nearer than it.
   */
  behindMost?: number;
}

/** Scale of the stills. */
const S = 3;

/** Returns how much of the room's top the room itself covers in the HD view (`gaps` of `top` columns not). */
export function checkHdRoom(check: Check, spec: ObliqueSpec, still: HdStill, outDir?: string) {
  const stats = { gaps: 0, top: 0 };
  const { name, m, light = 'lit', layout = null } = still;
  const room = obliqueRoom(spec, m.ram, m.capture, layout);
  const sprites = spritesFromCapture(m.capture, layout), { fore: front, back } = shownLayers(m, layout);
  const scene = new HdModel().frame(1000, room, sprites, front);
  const s = room.surface, { band } = room;
  // at rest, every quad lands on its own pixel
  const rest = cameraMatrix(room, 1, 1, 1, 1e9);
  let off = 0, n = 0;
  for (let y = 0; y < band.h; y++) for (let x = 0; x < 320; x++) {
    const c = s.cell[y * 320 + x];
    if (c < 0) continue;
    const q = project(rest, s.centre[c * 3], s.centre[c * 3 + 1], s.centre[c * 3 + 2]);
    off = Math.max(off, Math.hypot(q.x - (x + 0.5), q.y - (band.y + y + 0.5)));
    n++;
  }
  check(`${name}: at rest the room is the picture (${n} quads, each within ${off.toFixed(3)} px of its pixel)`, n > 320 * band.h * 0.6 && off < 0.01);
  const facing = (test: (nx: number, ny: number, nz: number) => boolean, floor: boolean) => {
    let k = 0, all = 0;
    for (let i = 0; i < 320 * band.h; i++) { const c = s.cell[i]; if (c < 0 || !!s.floor[i] !== floor) continue; all++; if (test(s.normal[c * 3], s.normal[c * 3 + 1], s.normal[c * 3 + 2])) k++; }
    return all ? k / all : 0;
  };
  const up = facing((_x, y) => y > 0.95, true), out = facing((_x, y) => Math.abs(y) < 0.4, false);
  const floorShare = s.floor.reduce((a, v) => a + v, 0) / n;
  check(`${name}: floor (${(floorShare * 100).toFixed(0)}% of the room) faces up (${(up * 100).toFixed(1)}%), the rest stands (${(out * 100).toFixed(1)}%)`, up > 0.97 && out > 0.9 && floorShare > 0.1);
  if (still.sideWall) check(`${name}: its side wall faces across (${(facing((x) => x > 0.6, false) * 100).toFixed(1)}% of upright pixels)`, facing((x) => x > 0.6, false) > 0.03);
  // (his feet: the bottom of his sprite's lit pixels; the floor: where his shadow lies)
  const player = must(scene.billboards.find((b) => b.sprite.n === spec.player), 'Pendragon in the room');
  let bottom = 0;
  player.sprite.pixels.forEach((v, i) => { if (v !== 0xff) bottom = Math.max(bottom, Math.floor(i / player.sprite.w) + 1); });
  const feetY = player.y - bottom, shadow = scene.shadows.find((sh) => Math.abs(sh.z - player.z) < 0.1);
  check(`${name}: Pendragon stands on the floor (feet at ${feetY.toFixed(1)}, the floor ${shadow ? shadow.y.toFixed(1) : 'not found'})`, !!shadow && Math.abs(feetY - shadow.y) < 1);
  // every sprite the C64 shows is wholly in the HD frame (the camera keeps the band in view: a player cut off by the framing is worse than any warp)
  {
    let out = 0, total = 0;
    for (const b of scene.billboards) {
      const s = b.sprite;
      let lo = Infinity, hi = -Infinity, top = Infinity, low = -Infinity;
      s.pixels.forEach((v, i) => { if (v !== TRANSPARENT) { const c = i % s.w, r = Math.floor(i / s.w); lo = Math.min(lo, c); hi = Math.max(hi, c + 1); top = Math.min(top, r); low = Math.max(low, r + 1); } });
      if (hi < 0) continue;
      total++;
      // (as the C64 has it, inside the picture's band; the box's corners through the camera)
      const inC64 = s.x + lo >= 0 && s.x + hi <= 320 && s.y + top >= band.y && s.y + low <= band.y + band.h;
      if (!inC64) continue;
      const corners = [[lo, top], [hi, top], [lo, low], [hi, low]].map(([c, r]) => project(scene.camera.matrix, b.x + (c * b.w) / s.w, b.y - (r * b.h) / s.h, b.z));
      // (2 pixels' give: a sprite standing on the floor's front edge has its soles at the frame's)
      if (corners.some((q) => q.x < -2 || q.x > 322 || q.y < band.y - 2 || q.y > band.y + band.h + 2)) out++;
    }
    check(`${name}: every sprite the C64 shows is wholly in the HD frame (${out} of ${total} cut off by it)`, out === 0);
  }
  checkShadows(check, name, scene);
  const kinds = scene.lights.map((l) => l.kind).join(', ');
  const flames = still.flames ?? !!spec.flames;
  if (light === 'lit') check(`${name}: lights: Pendragon's${flames ? ' and the flames\'' : ''} (${kinds})`, scene.lights.some((l) => l.kind === 'player') && (!flames || scene.lights.some((l) => l.kind === 'flame')));
  else check(`${name}: dark: the walls' flames out (lights: ${kinds || 'none'})`, !scene.lights.some((l) => l.kind === 'flame'));
  // the Three.js layer, on the stand-in GL
  checkHdGl(check, name, room, sprites);
  checkHdSprites(check, name, m, room, layout);
  // the pictures
  const pic = renderPixels(m, layout), behind = joinLayers(front, back);
  const hd = rasteriseHd(scene, pic, behind, S);
  checkSpritesCrisp(check, name, scene, pic, behind, S);
  const again = rasteriseHd(new HdModel().frame(1000, room, sprites, front), pic, behind, S);
  check(`${name}: the same picture every run`, hd.rgb.every((v, i) => v === again.rgb[i]));
  /** The mean luminance of a box of a picture (C64 pixels). */
  const lum = (img: ReturnType<typeof rasteriseHd>, x0: number, y0: number, w: number, h: number) => {
    let t = 0, n = 0;
    for (let y = y0 * S; y < (y0 + h) * S; y++) for (let x = x0 * S; x < (x0 + w) * S; x++) {
      const i = y * img.W + x;
      t += 0.2126 * img.rgb[i * 3] + 0.7152 * img.rgb[i * 3 + 1] + 0.0722 * img.rgb[i * 3 + 2]; n++;
    }
    return t / n;
  };
  const mean = lum(hd, 0, band.y, 320, band.h);
  const round = (img: ReturnType<typeof rasteriseHd>, x: number, y: number, z: number) => { const q = project(scene.camera.matrix, x, y, z); return lum(img, Math.max(0, Math.min(300, Math.round(q.x) - 10)), Math.max(band.y, Math.min(band.y + band.h - 20, Math.round(q.y) - 10)), 20, 20); };
  // (round the flames, and the floor round his feet: his light falls there; with the lights and without)
  const unlit = rasteriseHd({ ...scene, lights: [] }, pic, behind, S);
  const at = [{ x: player.x + player.w / 2, y: feetY, z: player.z }, ...scene.lights.filter((l) => l.kind === 'flame')];
  const gain = Math.max(...at.map((p) => round(hd, p.x, p.y, p.z) / Math.max(1e-3, round(unlit, p.x, p.y, p.z))));
  if (light === 'lit') {
    check(`${name}: lit, not black or blown out (mean ${mean.toFixed(2)}), its lights adding light round them (${gain.toFixed(2)}× as bright there as without them)`, mean > 0.12 && mean < 0.7 && gain > 1.04);
    // the walls the picture cuts off go on up: where the room's top is (the first thing of it down
    // each column), the room covers it in the HD view too (the tilt shows above it); where the room
    // leaves a gap there (a seam where a side wall's end and the wall behind it part, a corner the
    // swing opens), the picture shows through, dimmed: no black hole either way
    let gaps = 0, holes = 0, top = 0;
    for (let x = 8; x < 312; x++) {
      let y = 0;
      while (y < band.h && s.cell[y * 320 + x] < 0) y++;
      if (y >= band.h) continue;
      top++;
      for (let yy = (band.y + y) * S; yy < (band.y + y + 2) * S; yy++) {
        const i = yy * hd.W + x * S + 1;
        if (hd.covered[i]) continue;
        gaps++;
        if (hd.rgb[i * 3] + hd.rgb[i * 3 + 1] + hd.rgb[i * 3 + 2] < 0.01) holes++;
        break;
      }
    }
    check(`${name}: no black where the room's top is (${gaps} of the ${top} columns there show the picture behind the room, ${holes} black)`, holes === 0);
    stats.gaps = gaps; stats.top = top;
  } else {
    // dark: black but for the sprites as the game shows them
    const him = round(hd, player.x + player.w / 2, player.y - player.h / 2, player.z);
    check(`${name}: dark (mean ${mean.toFixed(3)}), he shows (${him.toFixed(3)})`, mean < 0.08 && him > 0.01);
  }
  checkHdPieces(check, name, spec, m, room, layout);
  checkHidden(check, name, decodePicture(m.ram, m.capture).colour, spec.band.y, pic, room, hd, outDir && `${outDir}/${name}`);
  checkC64Priority(check, name, m, layout);
  checkBehind(check, name, sprites, front, scene, hd, still.behindMost ?? 0.8);
  // (a room the game draws dark stays dark: nothing to see different there)
  if (light === 'lit') checkRemastered(check, name, pic, band, hd);
  if (!outDir) return stats;
  // C64 | HD, side by side
  const W = 320 * S * 2 + 8, H = 200 * S, both = new Float32Array(W * H * 3);
  const put = (to: Float32Array, o: number, c: number, k = 1) => { to[o] = ((c >> 16) / 255) * k; to[o + 1] = (((c >> 8) & 255) / 255) * k; to[o + 2] = ((c & 255) / 255) * k; };
  for (let y = 0; y < H; y++) for (let x = 0; x < 320 * S; x++) {
    const h = (y * hd.W + x) * 3, o2 = (y * W + x + 320 * S + 8) * 3;
    put(both, (y * W + x) * 3, C64_PALETTE[pic[Math.floor(y / S) * 320 + Math.floor(x / S)] & 15]);
    both[o2] = hd.rgb[h]; both[o2 + 1] = hd.rgb[h + 1]; both[o2 + 2] = hd.rgb[h + 2];
  }
  rgbPng(`${outDir}/${name}-c64-hd.png`, both, W, H, 1);
  rgbPng(`${outDir}/${name}-hd.png`, hd.rgb, hd.W, hd.H, 1);
  // what's floor: the picture, what stands darkened, nothing black, flames red
  const floor = new Float32Array(320 * 200 * 3);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
    const i = y * 320 + x, o = i * 3, by = y - band.y, j = by * 320 + x;
    if (by < 0 || by >= band.h) { put(floor, o, C64_PALETTE[pic[i] & 15], 0.5); continue; }
    const c = s.cell[j];
    if (c < 0) continue;
    if (s.glow[c * 3] > 0) { floor[o] = 1; continue; }
    put(floor, o, C64_PALETTE[pic[i] & 15], s.floor[j] ? 1 : 0.3);
  }
  rgbPng(`${outDir}/${name}-floor.png`, floor, 320, 200, 2);
  return stats;
}

/**
 * A room built from the game's rooms as pieces (an ObliqueSpec's `pictures`, hd/placed.ts): the band
 * is one of the game's room pictures (or two side by side, or a window of a strip of rooms wider than the band), and every piece is one surface: each
 * piece's pixels all on its plane (a wall's at one depth, a side wall's along its slope, the floor's
 * at one height), and neighbouring pixels of a piece side by side on it (no depth breaks inside a
 * piece: the planks of a wall run on across the posts in front of them, a table is one thing). Says
 * how many such neighbours the depth worked out from the picture alone (no `pictures`) breaks apart.
 */
function checkHdPieces(check: Check, name: string, spec: ObliqueSpec, m: Picture, room: HdRoom, layout: PictureLayout | null) {
  if (!spec.pictures) return;
  const pic = decodePicture(m.ram, m.capture), { band } = spec, a = band.y * 320, b = (band.y + band.h) * 320;
  const placed = placePictures(spec.pictures, band, { code: pic.code.slice(a, b), colour: pic.colour.slice(a, b), pair: pic.pair.slice(a, b), row: pic.row.slice(a, b), column: pic.column.slice(a, b) });
  if (!placed) { check(`${name}: the band is one of the game's room pictures`, false); return; }
  const s = placed.shows, id = (p: typeof s.left) => `$${p.id.toString(16)}${p.variant ? ' (lower decks)' : ''}`;
  check(`${name}: the band is the game's room picture ${id(s.left)}${s.from ? ` from its column ${s.from}${s.right === s.left ? '' : `, ${id(s.right)} beside it`}` : ''} (${s.differ} of its ${s.cells} cells drawn otherwise)`, s.differ <= 40);
  const { piece } = placed, H = band.h;
  const pieceOf = (n: number) => (Math.floor(n / 256) === spec.pictures?.pictures.indexOf(s.right) ? s.right : s.left).pieces[n % 256];
  /**
   * Neighbouring pixels of one piece (right, below), and how many aren't side by side on it in this room
   * (their quads' middles further apart than a step along the piece: √2; a side wall coming nearer as it
   * goes right, slope -1, a step right is a step nearer and a step up, 2 across: √6).
   */
  const step = (n: number) => { const q = pieceOf(n); return q.kind === 'side' && q.slope === -1 ? Math.sqrt(6) : Math.SQRT2; };
  const breaks = (r: HdRoom) => {
    const c = r.surface.cell, at = r.surface.centre;
    let pairs = 0, broken = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < 320; x++) {
      const i = y * 320 + x;
      if (piece[i] < 0 || c[i] < 0) continue;
      for (const j of [x < 319 ? i + 1 : -1, y < H - 1 ? i + 320 : -1]) {
        if (j < 0 || piece[j] !== piece[i] || c[j] < 0) continue;
        pairs++;
        const d = Math.hypot(at[c[i] * 3] - at[c[j] * 3], at[c[i] * 3 + 1] - at[c[j] * 3 + 1], at[c[i] * 3 + 2] - at[c[j] * 3 + 2]);
        if (d > step(piece[i]) + 1e-3) broken++;
      }
    }
    return { pairs, broken };
  };
  // each piece on its own plane: how far its pixels' places spread from it
  const planes = new Map<number, { lo: number; hi: number }>();
  let off = 0;
  for (let i = 0; i < 320 * H; i++) {
    const n = piece[i], c = room.surface.cell[i];
    if (n < 0 || c < 0) continue;
    const q = pieceOf(n), x = room.surface.centre[c * 3], y = room.surface.centre[c * 3 + 1], z = room.surface.centre[c * 3 + 2];
    // (a side wall's: z - slope × its x in the picture, the same along it; the picture's x is the world's x + z)
    const v = q.kind === 'floor' ? y : q.kind === 'side' ? z - q.slope * (x + z) : z;
    const e = planes.get(n) ?? { lo: v, hi: v };
    e.lo = Math.min(e.lo, v); e.hi = Math.max(e.hi, v);
    planes.set(n, e);
    off = Math.max(off, e.hi - e.lo);
  }
  const now = breaks(room), guessed = breaks(obliqueRoom({ ...spec, pictures: undefined }, m.ram, m.capture, layout));
  check(`${name}: every piece one surface (${planes.size} pieces, each within ${off.toFixed(3)} of its plane; of ${now.pairs} neighbouring pixels of one piece, ${now.broken} apart: the depth guessed from the picture alone broke ${guessed.broken})`, off < 0.01 && now.broken === 0);
}

/**
 * Sprites always crisp (Chris: no blur on them): the depth of field and the tilt-shift never soften a
 * sprite standing in the room, nor smear it over what's round it (one lying on the floor as a patch of
 * it is the floor's: Dragonskulle's dig spot). Drawn again with them off, every pixel a sprite shows is
 * the same; and drawn with every sprite in other colours (bloom and shafts off in both: they're light,
 * not blur), every pixel no sprite shows is the same.
 */
function checkSpritesCrisp(check: Check, name: string, scene: HdScene, picture: Uint8Array, behind: Uint8Array, S: number) {
  const plain = { ...scene.post, bloom: { ...scene.post.bloom, strength: 0 }, rays: { ...scene.post.rays, strength: 0 } };
  const a = rasteriseHd({ ...scene, post: plain }, picture, behind, S);
  const sharp = rasteriseHd({ ...scene, post: { ...plain, dof: { ...plain.dof, range: 1e9, sharp: 10 } } }, picture, behind, S);
  const other = scene.billboards.map((b) => (b.flat ? b : { ...b, sprite: { ...b.sprite, pixels: b.sprite.pixels.map((v) => (v === TRANSPARENT ? v : (v + 5) & 15)) } }));
  const standing = (img: typeof a, i: number) => img.board[i] >= 0 && !scene.billboards[img.board[i]].flat;
  const b = rasteriseHd({ ...scene, post: plain, billboards: other }, picture, behind, S);
  let sprite = 0, soft = 0, round = 0, leak = 0;
  for (let i = 0; i < a.W * a.H; i++) {
    const same = (x: typeof a) => Math.abs(x.rgb[i * 3] - a.rgb[i * 3]) + Math.abs(x.rgb[i * 3 + 1] - a.rgb[i * 3 + 1]) + Math.abs(x.rgb[i * 3 + 2] - a.rgb[i * 3 + 2]) < 1e-6;
    if (standing(a, i)) { sprite++; if (!same(sharp)) soft++; } else { round++; if (!standing(b, i) && !same(b)) leak++; }
  }
  check(`${name}: sprites crisp (of ${sprite} sprite pixels ${soft} softened by the depth of field or the tilt-shift; of ${round} round them ${leak} take a sprite's colour from the blur)`, sprite > 0 && soft === 0 && leak === 0);
}

/**
 * A way through (`chars`: the characters the game takes him through when he walks into them, a stairs' gate, a
 * door) in a frame: nearly all its pixels show in the HD picture (not hidden behind geometry; found by the quad each
 * HD pixel shows, `source`, the room alone: who stands in front of it is the game's); and what the C64's picture has
 * right above them (the arch, the wall they stand at the foot of) is put against them in the HD view too: the middles
 * of the two quads are within `reach` C64 pixels of each other on the screen at the HD camera (it was 18 where the
 * wall stood at the depth of the ground in front of the stairs, the gate a stair's depth behind it). With `png`: C64 | HD
 * of the frame (sprites in) to look at. Returns how many pixels were looked at.
 */
export function checkHdCharacters(check: Check, spec: ObliqueSpec, name: string, m: Picture, chars: number[], o: { reach?: number; layout?: PictureLayout | null; png?: string } = {}) {
  const { reach = 4, layout = null } = o;
  const room = obliqueRoom(spec, m.ram, m.capture, layout), { band, surface } = room;
  const { fore, back } = shownLayers(m, layout), pic = renderPixels(m, layout), behind = joinLayers(fore, back);
  // (the room alone: what hides the way through is the room's geometry, not whoever stands in front of it)
  const scene = new HdModel().frame(1000, room, [], fore), bare = rasteriseHd(scene, pic, behind, S);
  const { code } = decodePicture(m.ram, m.capture), want = new Set(chars);
  const shown = new Set<number>();
  for (let i = 0; i < bare.W * bare.H; i++) if (bare.source[i] >= 0) shown.add(bare.source[i]);
  let looked = 0, seen = 0;
  const apart: number[] = [];
  const at = (px: number, py: number) => {
    const c = surface.cell[(py - band.y) * 320 + px];
    return c < 0 ? null : project(scene.camera.matrix, surface.centre[c * 3] + room.shift, surface.centre[c * 3 + 1], surface.centre[c * 3 + 2]);
  };
  for (let y = band.y; y < band.y + band.h; y++) for (let x = 0; x < 320; x++) {
    if (!want.has(code[y * 320 + x])) continue;
    looked++;
    if (shown.has((y - band.y) * 320 + x)) seen++;
    // (the top of the way through, the pixel above it the picture's)
    if (y - 1 >= band.y && !want.has(code[(y - 1) * 320 + x])) {
      const a = at(x, y), b = at(x, y - 1);
      if (a && b) apart.push(Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  apart.sort((a, b) => a - b);
  const far = apart.length ? apart[Math.floor(apart.length * 0.9)] : 0;
  check(`${name}: the way through (characters ${chars.map((c) => '$' + c.toString(16).toUpperCase()).join(', ')}) is where the C64 draws it: ${seen} of its ${looked} pixels show in the HD picture (the room alone)`, looked >= 24 && seen >= looked * 0.9);
  check(`${name}: and what's above it (the arch, the wall) stands against it (nine in ten of ${apart.length} columns within ${far.toFixed(1)} px, at most ${reach})`, apart.length > 0 && far <= reach);
  if (o.png) {
    const hd = rasteriseHd(new HdModel().frame(1000, room, spritesFromCapture(m.capture, layout), fore), pic, behind, S);
    const W = 320 * S * 2 + 8, H = 200 * S, both = new Float32Array(W * H * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < 320 * S; x++) {
      const c = C64_PALETTE[pic[Math.floor(y / S) * 320 + Math.floor(x / S)] & 15], a = (y * W + x) * 3, h = (y * hd.W + x) * 3, b = (y * W + x + 320 * S + 8) * 3;
      both[a] = (c >> 16) / 255; both[a + 1] = ((c >> 8) & 255) / 255; both[a + 2] = (c & 255) / 255;
      both[b] = hd.rgb[h]; both[b + 1] = hd.rgb[h + 1]; both[b + 2] = hd.rgb[h + 2];
    }
    rgbPng(o.png, both, W, H, 1);
  }
  return looked;
}

/**
 * Shadows under the feet: each shadow's middle (where the camera at rest puts it) is under the
 * footprint of a sprite standing at its depth (the columns whose lowest pixel is within 6 rows of the
 * sprite's lowest: both feet of a stride), not beside it; a sprite that's a patch of the floor (drawn
 * in the floor's colour, lying on it) has none.
 */
function checkShadows(check: Check, name: string, scene: HdScene) {
  const span = (s: HdSprite) => {
    let bottom = -1, left = Infinity, right = -Infinity;
    s.pixels.forEach((v, i) => { if (v !== TRANSPARENT) bottom = Math.max(bottom, Math.floor(i / s.w)); });
    for (let x = 0; x < s.w; x++) {
      let y = bottom;
      while (y >= 0 && s.pixels[y * s.w + x] === TRANSPARENT) y--;
      if (y >= 0 && y >= bottom - 6) { left = Math.min(left, x); right = Math.max(right, x + 1); }
    }
    return { left: s.x + left, right: s.x + right };
  };
  // (where the camera at rest puts a shadow: its x, and a step into the room as far right)
  let under = 0;
  for (const sh of scene.shadows) {
    const at = sh.x + sh.z;
    if (scene.billboards.some((b) => !b.flat && Math.abs(b.z - sh.z) < 0.1 && at >= span(b.sprite).left && at <= span(b.sprite).right)) under++;
  }
  const flat = scene.billboards.filter((b) => b.flat), cast = flat.filter((b) => scene.shadows.some((sh) => Math.abs(sh.z - b.z) < 0.1 && sh.x + sh.z >= b.sprite.x && sh.x + sh.z <= b.sprite.x + b.sprite.w));
  check(`${name}: shadows under the feet (${under} of ${scene.shadows.length} under a footprint; ${flat.length} sprites lying as patches of the floor, ${cast.length} with a shadow)`, under === scene.shadows.length && cast.length === 0);
}

/**
 * How far (C64 pixels) round a sprite or a flame in the HD picture is left out of `checkHidden` (its
 * glow, a flame's embers); and
 * how far round a pixel the C64's picture must be black too for it to count (not a line between
 * colours, which the view's softening blends a little).
 */
const SPRITE_MARGIN = 8, BLACK_ROUND = 3;

/**
 * The view only: the HD picture shows nothing the C64's hides. Every pixel of the HD picture's band
 * shows a pixel of the C64's picture (`chars`: the characters' colours as the machine draws them, 320 × 200,
 * the room's band from its line `charsTop`, where a layout may show it elsewhere; `shown`: the picture with its sprites): a quad of the room shows the pixel it was made from (in the
 * machine's picture), and where the room left a gap, the picture behind it shows. Where that pixel
 * is black in the C64's picture (and round it, BLACK_ROUND), the HD one is black too (no room lit
 * that the game draws dark, no colours it doesn't draw, no light out of nothing), but for the sprites
 * and flames the game shows (and their glow, SPRITE_MARGIN round them).
 */
function checkHidden(check: Check, name: string, chars: Uint8Array, charsTop: number, shown: Uint8Array, room: HdRoom, hd: ReturnType<typeof rasteriseHd>, out?: string) {
  const { band, surface } = room, S = hd.W / 320;
  // (black in a picture: it and all round it, BLACK_ROUND)
  const blackRound = (pic: Uint8Array) => {
    const t = new Int32Array(321 * 201);
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) t[(y + 1) * 321 + x + 1] = (pic[y * 320 + x] & 15 ? 1 : 0) + t[y * 321 + x + 1] + t[(y + 1) * 321 + x] - t[y * 321 + x];
    return Uint8Array.from(pic, (_, i) => {
      const x = i % 320, y = (i - x) / 320, R = BLACK_ROUND;
      const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R), x1 = Math.min(320, x + R + 1), y1 = Math.min(200, y + R + 1);
      return t[y1 * 321 + x1] - t[y0 * 321 + x1] - t[y1 * 321 + x0] + t[y0 * 321 + x0] === 0 ? 1 : 0;
    });
  };
  const machine = blackRound(chars), behind = blackRound(shown);
  // (summed areas of where a sprite or a flame is in the HD picture)
  const at = new Int32Array((hd.W + 1) * (hd.H + 1)), W1 = hd.W + 1;
  const lit = (i: number) => { const c = hd.source[i] >= 0 ? surface.cell[hd.source[i]] : -1; return hd.sprite[i] >= 0 || (c >= 0 && surface.glow[c * 3] > 0); };
  for (let y = 0; y < hd.H; y++) for (let x = 0; x < hd.W; x++) at[(y + 1) * W1 + x + 1] = (lit(y * hd.W + x) ? 1 : 0) + at[y * W1 + x + 1] + at[(y + 1) * W1 + x] - at[y * W1 + x];
  const r = Math.round(SPRITE_MARGIN * S);
  const near = (x: number, y: number) => {
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(hd.W, x + r + 1), y1 = Math.min(hd.H, y + r + 1);
    return at[y1 * W1 + x1] - at[y0 * W1 + x1] - at[y1 * W1 + x0] + at[y0 * W1 + x0] > 0;
  };
  const lums: number[] = [];
  // (with an out-dir: where it looked, blue, and what's lit there, red, over the HD picture dimmed)
  const where = out ? hd.rgb.map((v) => v * 0.3) : null;
  for (let y = Math.round(band.y * S); y < Math.round((band.y + band.h) * S); y++) for (let x = 0; x < hd.W; x++) {
    const i = y * hd.W + x, src = hd.source[i];
    const black = src >= 0 ? machine[charsTop * 320 + src] : hd.covered[i] ? 0 : behind[Math.floor(y / S) * 320 + Math.floor(x / S)];
    if (!black || near(x, y)) continue;
    const l = 0.2126 * hd.rgb[i * 3] + 0.7152 * hd.rgb[i * 3 + 1] + 0.0722 * hd.rgb[i * 3 + 2];
    lums.push(l);
    if (where) { where[i * 3] = l > 0.02 ? 1 : 0; where[i * 3 + 2] = l > 0.02 ? 0 : 0.6; }
  }
  if (where && out) rgbPng(`${out}-hidden.png`, where, hd.W, hd.H, 1);
  if (!lums.length) { check(`${name}: shows nothing the C64's picture hides (nothing black there)`, true); return; }
  lums.sort((a, b) => a - b);
  const mean = lums.reduce((a, b) => a + b, 0) / lums.length, top = lums[Math.floor(lums.length * 0.99)];
  check(`${name}: shows nothing the C64's picture hides (of what's black there, ${(lums.length / S / S).toFixed(0)} pixels: HD mean ${mean.toFixed(4)}, brightest 1% ${top.toFixed(3)})`, mean < 0.01 && top < 0.05);
}

/**
 * The C64's picture as every still draws it (renderPixels) has its sprites as the VIC orders them:
 * worked out here pixel by pixel from the frame's sprites (at each pixel the lowest-numbered sprite
 * with a pixel there; the characters instead where that one is set behind them and they have a pixel
 * there, whatever the other sprites), against the picture. Says how many pixels each rule decided.
 */
function checkC64Priority(check: Check, name: string, m: Picture, layout: PictureLayout | null = null) {
  const pic = renderPixels(m, layout), { fore, back } = shownLayers(m, layout), sprites = spritesFromCapture(m.capture, layout);
  let wrong = 0, hidden = 0, meet = 0;
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
    let top: { s: HdSprite; v: number } | null = null, here = 0;
    for (const s of sprites) {
      const sx = x - Math.round(s.x), sy = y - Math.round(s.y);
      if (sx < 0 || sy < 0 || sx >= s.w || sy >= s.h || s.pixels[sy * s.w + sx] === TRANSPARENT) continue;
      here++;
      if (!top || s.n < top.s.n) top = { s, v: s.pixels[sy * s.w + sx] };
    }
    const i = y * 320 + x, chars = fore[i] !== TRANSPARENT;
    let want = chars ? fore[i] : back[i];
    if (here > 1) meet++;
    if (top && top.s.behind && chars) hidden++;
    else if (top) want = top.v;
    if (pic[i] !== want) wrong++;
  }
  check(`${name}: the C64's picture has its sprites as the VIC orders them (${hidden} sprite pixels behind the characters, ${meet} where sprites meet; ${wrong} pixels otherwise)`, wrong === 0);
  return { hidden, meet };
}

/**
 * What stands in front of a sprite in the HD view stands in front of it in the room (with `pictures`:
 * the rooms as pieces): of the pixels of the sprites the C64 shows (not set behind the characters
 * there), the HD room hides none behind a part of a thing (its pixels joined, corner to corner too)
 * whose foot (the floor under its lowest pixel) is behind where the sprite stands. (A wardrobe against
 * the back wall stood at a post's foot three rows nearer, cannonballs against the bulwark at a cannon's
 * wheels', and hid Pendragon or the ghosts walking in front of them; a ghost leaping over a cannon, in
 * the air, stood at the bulwark behind it.) Returns the pixels looked at and those wrong.
 */
export function inFront(spec: ObliqueSpec, m: Picture, layout: PictureLayout | null = null) {
  const { pictures } = spec;
  if (!pictures) return { shown: 0, wrong: 0 };
  const room = obliqueRoom(spec, m.ram, m.capture, layout), sprites = spritesFromCapture(m.capture, layout), { fore } = shownLayers(m, layout);
  const scene = new HdModel().frame(1000, room, sprites, fore), { surface, band } = room, shift = Math.round(room.shift);
  const pic = decodePicture(m.ram, m.capture), a = band.y * 320, e = (band.y + band.h) * 320;
  const placed = placePictures(pictures, band, { code: pic.code.slice(a, e), colour: pic.colour.slice(a, e), pair: pic.pair.slice(a, e), row: pic.row.slice(a, e), column: pic.column.slice(a, e) });
  if (!placed) return { shown: 0, wrong: 0 };
  const kindOf = (n: number) => pictures.pictures[Math.floor(n / 256)]?.pieces[n % 256]?.kind;
  // (each thing's parts in the band, and each part's foot: the depth of the floor under its lowest pixel)
  const part = new Int32Array(320 * band.h).fill(-1), foot: number[] = [];
  const partOf = (i: number) => {
    if (part[i] >= 0) return part[i];
    const id = foot.length, g = [i], n = placed.piece[i];
    part[i] = id;
    let z = Infinity;
    for (let k = 0; k < g.length; k++) {
      const j = g[k], x = j % 320, y = (j - x) / 320;
      const below = j + 320 < 320 * band.h && surface.floor[j + 320] ? surface.cell[j + 320] : -1;
      if (below >= 0) z = Math.min(z, surface.centre[below * 3 + 2]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, q = Y * 320 + X;
        if (X >= 0 && Y >= 0 && X < 320 && Y < band.h && part[q] < 0 && placed.piece[q] === n) { part[q] = id; g.push(q); }
      }
    }
    foot.push(z);
    return id;
  };
  let shown = 0, wrong = 0;
  for (const b of scene.billboards) {
    if (b.flat) continue;
    const s = b.sprite, hid = hiddenByCharacters(s, fore);
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (s.pixels[y * s.w + x] === TRANSPARENT || hid[y * s.w + x]) continue;
      const X = Math.round(s.x) + x - shift, Y = Math.round(s.y) + y - band.y, i = Y * 320 + X;
      if (X < 0 || X >= 320 || Y < 0 || Y >= band.h) continue;
      shown++;
      const c = surface.cell[i];
      if (c < 0 || surface.floor[i] || surface.centre[c * 3 + 2] >= b.z - 1 || placed.piece[i] < 0 || kindOf(placed.piece[i]) !== 'thing') continue;
      const f = foot[partOf(i)];
      if (f < Infinity && f > b.z + 2) wrong++;
    }
  }
  return { shown, wrong };
}

/**
 * The view only, for sprites set behind the characters: of their pixels, the HD picture shows none the
 * C64's hides behind a character (wherever the camera puts them), and most of those it shows (the rest
 * the room stands in front of, by depth).
 */
function checkBehind(check: Check, name: string, sprites: HdSprite[], front: Uint8Array, scene: HdScene, hd: ReturnType<typeof rasteriseHd>, most: number) {
  // (each billboard of a sprite set behind: which of its pixels the C64 hides, which it shows)
  const hides = scene.billboards.map((b) => {
    const s = sprites.find((o) => o.n === b.sprite.n && o.x === b.sprite.x && o.y === b.sprite.y);
    return s?.behind ? { s, hidden: hiddenByCharacters(s, front) } : null;
  });
  let hidden = 0, shown = 0;
  for (const h of hides) if (h) h.s.pixels.forEach((v, i) => { if (v !== TRANSPARENT) { if (h.hidden[i]) hidden++; else shown++; } });
  if (!hides.some((h) => h)) return;
  const seen = new Set<number>();
  let leaks = 0;
  for (let i = 0; i < hd.W * hd.H; i++) {
    const h = hd.board[i] >= 0 ? hides[hd.board[i]] : null;
    if (!h) continue;
    if (h.hidden[hd.pixel[i]]) leaks++;
    else seen.add(hd.board[i] * 4096 + hd.pixel[i]);
  }
  check(`${name}: sprites set behind the characters: of the ${hidden} pixels the C64 hides there none shows in HD (${leaks} HD pixels), of the ${shown} it shows ${seen.size} do`, leaks === 0 && seen.size >= shown * most);
}

/** Luminance (of sRGB values, 0..1). */
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** A C64 colour as sRGB, 0..1. */
const srgbOf = (c: number): [number, number, number] => { const v = C64_PALETTE[c & 15]; return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };

/**
 * How far the HD picture's band is from the C64's, pixel for pixel (the mean difference in
 * luminance; its own light, depth and camera, not the same picture a bit off), at least this.
 */
const REMASTERED = 0.08;

/**
 * Visibly the HD view, not the C64's picture: pixel for pixel (where the camera puts things, how they're
 * lit) the band differs from the C64's by REMASTERED or more on average, and in the light's range (its
 * brightest and darkest tenths further apart than the C64's: pools of light and shadow).
 */
function checkRemastered(check: Check, name: string, pic: Uint8Array, band: { y: number; h: number }, hd: ReturnType<typeof rasteriseHd>) {
  let diff = 0, n = 0;
  const ours: number[] = [], c64: number[] = [], S = hd.W / 320;
  for (let y = Math.round(band.y * S); y < Math.round((band.y + band.h) * S); y++) for (let x = 0; x < hd.W; x++) {
    const i = y * hd.W + x, a = luma(hd.rgb[i * 3], hd.rgb[i * 3 + 1], hd.rgb[i * 3 + 2]), b = luma(...srgbOf(pic[Math.floor(y / S) * 320 + Math.floor(x / S)]));
    diff += Math.abs(a - b); n++;
    if (x % 3 === 0 && y % 3 === 0) { ours.push(a); c64.push(b); }
  }
  diff /= n;
  const spread = (v: number[]) => { v.sort((p, q) => p - q); return v[Math.floor(v.length * 0.9)] - v[Math.floor(v.length * 0.1)]; };
  check(`${name}: visibly the HD view (the band ${diff.toFixed(3)} from the C64's on average, pixel for pixel; light from ${spread(c64).toFixed(2)} to ${spread(ours).toFixed(2)} between its brightest and darkest tenths)`, diff >= REMASTERED);
}

/**
 * A game played along a recorded route (its re/routes.json: joystick, and the space bar in bit 5, a
 * value and how many frames, found by automatic play), a frame at a time from its title snapshot,
 * kept alive by `cheat` as the travel check does: `next()` plays a frame and gives the machine (null
 * at the route's end), `frame` the frames played.
 */
export function routeWalker(o: { port: PortConfig; title: Uint8Array; routes: string; route?: number; cheat(ram: Uint8Array): void }) {
  const steps = readRoute(o.routes, o.route ?? 0);
  const g = new NativeHost(o.port, unpackState(o.title));
  let i = 0, left = steps[1] ?? 0;
  const walker = {
    frame: 0,
    host: g,
    next(): Picture | null {
      while (left <= 0 && i + 2 < steps.length) { i += 2; left = steps[i + 1]; }
      if (left <= 0) return null;
      left--;
      g.m.joy1 = g.m.joy2 = steps[i] & 0x1f;
      g.m.keys = steps[i] & 32 ? [[1, 2]] : [];
      g.tick(); o.cheat(g.m.ram); walker.frame++;
      return g.m;
    },
    /** Played on to this frame, and saved there. */
    at(frame: number): MachineState {
      while (walker.frame < frame) if (!walker.next()) throw new Error(`the route ends before frame ${frame}`);
      return must(g.save(), 'a save');
    },
  };
  return walker;
}

/**
 * The rooms over frames of play (`next()` runs a frame and gives the machine, or null at the end),
 * as play.ts makes them (HdRooms with the game's builder): only what changed made again (`built`
 * from scratch, `painted` new colours in the same places, `moved` for a scroll, `kept`), and every
 * moved room where a fresh build has it (away from the edges, where new columns come in; nearly all of it). Says what
 * each costs, the builder and the drawing layer (its JavaScript; uploading to the GPU not counted).
 * (`moved` > 10 and fewer built than moved: give it frames where the picture scrolls.)
 */
export function checkHdFrames(check: Check, what: string, spec: ObliqueSpec, next: () => Picture | null, layout: PictureLayout | null = null) {
  const builder = obliqueRooms(spec);
  type Made = 'built' | 'painted' | 'moved' | 'kept';
  const made: Record<Made, number> = { built: 0, painted: 0, moved: 0, kept: 0 }, ms: Record<Made, number> = { built: 0, painted: 0, moved: 0, kept: 0 };
  const seen: { room: HdRoom; made: Made }[] = [];
  const rooms = new HdRooms({
    ...builder,
    build: (pic, last, l, reach) => {
      const t = performance.now(), built = builder.build(pic, last, l, reach), dt = performance.now() - t, room = built.room;
      const k: Made = !last || room.surface.centre !== last.surface.centre ? 'built' : room.surface !== last.surface ? 'painted' : room.shift !== last.shift ? 'moved' : 'kept';
      made[k]++; ms[k] += dt;
      seen.push({ room, made: k });
      return built;
    },
  });
  // (a fresh build of a scrolled picture can read the room differently where new columns came in: a
  // patch of floor's height from more of its front edge; a moved room keeps the reading it was built
  // with until it's built again a column on, or when the scroll stops)
  let frames = 0, moved = 0, same = 0, all = 0, m: Picture | null = null;
  for (let at = next(); at; at = next()) {
    m = at; frames++;
    const room = rooms.room(at.ram, at.capture, layout);
    if (room.exact) continue;
    moved++;
    const fresh = obliqueRoom(spec, at.ram, at.capture, layout), a = room.surface, b = fresh.surface;
    for (let y = 0; y < room.band.h; y++) for (let x = 16; x < 304; x++) {
      const ca = a.cell[y * 320 + x - room.shift], cb = b.cell[y * 320 + x];
      if (ca < 0 && cb < 0) continue;
      all++;
      if (ca >= 0 && cb >= 0 && Math.max(Math.abs(a.centre[ca * 3] + room.shift - b.centre[cb * 3]), Math.abs(a.centre[ca * 3 + 1] - b.centre[cb * 3 + 1]), Math.abs(a.centre[ca * 3 + 2] - b.centre[cb * 3 + 2])) < 0.01) same++;
    }
  }
  const each = (k: Made) => `${made[k]} ${k} (${(ms[k] / Math.max(1, made[k])).toFixed(1)} ms)`;
  check(`${what}, ${frames} frames: ${each('built')}, ${each('painted')}, ${each('moved')}, ${each('kept')}`, moved > 10 && made.built < moved / 2);
  check(`${what}: a scrolled room moved is where a fresh build has it (${moved} frames: ${((same / Math.max(1, all)) * 100).toFixed(1)}% of their pixels)`, same >= all * 0.95);
  if (!m) return;
  const times = frameTimes(seen.map((s) => s.room), spritesFromCapture(m.capture, layout));
  const cost = (k: Made) => { const t = times.filter((_, i) => seen[i].made === k); return t.length ? (t.reduce((p, q) => p + q, 0) / t.length).toFixed(1) : '-'; };
  console.log(`     the layer, a frame: built ${cost('built')} ms, painted ${cost('painted')} ms, moved ${cost('moved')} ms, kept ${cost('kept')} ms`);
}

/**
 * Room and sprites locked together, as the browser draws them (play.ts: HdRooms each frame of the
 * game, `rooms.at(alpha)` and C64View's sprites at the same alpha, FixedLoop's alphas at a display's
 * rate) while he walks across a room that scrolls: on every frame drawn, 60 and 144 a second,
 * including between the game's frames:
 *
 * - the camera is the same (it never moves after him: no lag, no swing);
 * - the room is drawn scrolled exactly as far as the picture has scrolled, smoothed as the sprites
 *   are (the scroll measured here from the C64's pictures themselves, frame to frame, independent of
 *   the builder), so the floor under his feet keeps to him as it does on the C64;
 * - his shadow (where the HD view stands him on the floor) is under his drawn feet.
 *
 * With `refresher` true the rooms are built "off the main thread" (a stand-in: each built here, its
 * answer through structuredClone and work.ts's message check, arriving `lag` frames later), as the
 * browser does with its worker: the same, the room built again moved on by the scroll since.
 */
export async function checkHdLockstep(check: Check, what: string, spec: ObliqueSpec, m: C64, step: () => boolean, frames: number, o: { refresher?: boolean; lag?: number; layout?: PictureLayout | null } = {}) {
  const layout = o.layout ?? null, lag = o.lag ?? 3;
  // (the stand-in worker: the work done now, its answer kept till `lag` frames on)
  const queue: { due: number; resolve: (d: HdWorked) => void; reply: unknown }[] = [];
  let tick = 0, posted = 0;
  const refresher: HdRefresher | null = o.refresher ? {
    post(work) {
      posted++;
      const reply: unknown = structuredClone({ id: posted, done: buildWork(structuredClone(work)) });
      return new Promise<HdWorked>((resolve) => queue.push({ due: tick + lag, resolve, reply }));
    },
  } : null;
  const rooms = new HdRooms(obliqueRooms(spec), refresher), renderer = new PixelRenderer(), view = new C64View(renderer, m), model = new HdModel();
  // the scroll measured from the pictures: each frame's band against the last's, moved (away from the edges)
  // (null: another picture, a room come into)
  const scrollOf = (a: Uint8Array, b: Uint8Array) => {
    let best = 0, fewest = Infinity;
    for (const s of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8]) {
      let wrong = 0;
      for (let y = spec.band.y; y < spec.band.y + spec.band.h; y++) for (let x = 24; x < 296; x++) if (b[y * 320 + x] !== a[y * 320 + x - s]) wrong++;
      if (wrong < fewest) { fewest = wrong; best = s; }
    }
    return fewest < 320 * spec.band.h * 0.02 ? best : null;
  };
  const truth = new Smoothed();
  let total = 0, last: Uint8Array | null = null;
  let camera: Float64Array | null = null, cameraMoved = 0, drawn = 0, worst = 0, worstFeet = 0, scrolled = 0, waited = 0, places = 0, right = 0;
  const steps: number[] = [];
  let lastFloor: number | null = null;
  for (const hz of [60, 144]) {
    let acc = 0;
    for (let f = 0; tick < frames * (hz === 60 ? 1 : 2) && f < frames * 4; f++) {
      acc += 1000 / hz;
      while (acc >= 20) {
        acc -= 20;
        if (!step()) break;
        tick++;
        // (answers due now arrive before the frame, as a worker's message would between frames)
        for (const q of queue.filter((e) => e.due <= tick)) {
          queue.splice(queue.indexOf(q), 1);
          if (!isFromHdWorker(q.reply) || 'error' in q.reply) throw new Error('the worker stand-in\'s answer isn\'t one');
          q.resolve(q.reply.done);
          waited++;
          await new Promise((r) => setTimeout(r, 0)); // (its answer taken, as between two of the browser's frames)
        }
        const now = decodePicture(m.ram, m.capture).colour;
        const s = last ? scrollOf(last, now) : null;
        if (s === null) { total = 0; truth.reset(0, 0); } else { total += s; scrolled += Math.abs(s); truth.push(total, 0); }
        last = now.slice();
        const room = rooms.room(m.ram, m.capture, layout);
        view.update();
        // (every few frames: the room as kept, moved and built again, where a fresh build of this frame has it)
        if (tick % 4) continue;
        const fresh = obliqueRoom(spec, m.ram, m.capture, layout), a = room.surface, b = fresh.surface;
        for (let y = 0; y < room.band.h; y++) for (let x = 24; x < 296; x++) {
          const ca = a.cell[y * 320 + x - room.shift], cb = b.cell[y * 320 + x];
          if (ca < 0 && cb < 0) continue;
          places++;
          if (ca >= 0 && cb >= 0 && Math.max(Math.abs(a.centre[ca * 3] + room.shift - b.centre[cb * 3]), Math.abs(a.centre[ca * 3 + 1] - b.centre[cb * 3 + 1]), Math.abs(a.centre[ca * 3 + 2] - b.centre[cb * 3 + 2])) < 0.01) right++;
        }
      }
      const alpha = acc / 20, room = rooms.at(alpha);
      if (!room) continue;
      view.render(alpha);
      const sprites: HdSprite[] = renderer.sprites.filter((h) => h.visible && h.surface).map((h) => ({ n: h.n ?? -1, x: h.x, y: h.y, w: h.surface?.width ?? 0, h: h.surface?.height ?? 0, pixels: h.surface?.pixels ?? new Uint8Array(0), version: 0, behind: h.z < 0 }));
      const scene = model.frame(f * (1000 / hz), room, sprites);
      drawn++;
      if (!camera) camera = scene.camera.matrix;
      else if (scene.camera.matrix.some((v, i) => v !== camera?.[i])) cameraMoved++;
      // the scroll drawn against the picture's own, smoothed as the sprites are
      worst = Math.max(worst, Math.abs(rooms.scrolled(alpha) - truth.at(alpha).x));
      // his shadow under his drawn feet (both in the picture's pixels: where the camera at rest puts them)
      const him = scene.billboards.find((b) => b.sprite.n === spec.player && !b.flat);
      if (him) {
        const s = him.sprite;
        let sum = 0, n = 0, bottom = -1;
        s.pixels.forEach((v, i) => { if (v !== TRANSPARENT) bottom = Math.max(bottom, Math.floor(i / s.w)); });
        for (let x = 0; x < s.w; x++) for (let y = Math.max(0, bottom - 6); y <= bottom; y++) if (s.pixels[y * s.w + x] !== TRANSPARENT) { sum += x; n++; break; }
        const feet = s.x + sum / n + 0.5, sh = scene.shadows.filter((x) => Math.abs(x.z - him.z) < 0.1).sort((a, b) => Math.abs(a.x + a.z - feet) - Math.abs(b.x + b.z - feet))[0];
        if (sh) worstFeet = Math.max(worstFeet, Math.abs(sh.x + sh.z - feet));
      }
      // how far the floor moved on the screen from the frame before (a step a frame, evenly: no stutter)
      const floor = rooms.scrolled(alpha);
      if (lastFloor !== null && hz === 60) steps.push(floor - lastFloor);
      lastFloor = floor;
    }
    lastFloor = null;
  }
  const moving = steps.filter((d) => Math.abs(d) > 1e-6);
  const mean = moving.reduce((a, b) => a + Math.abs(b), 0) / Math.max(1, moving.length);
  check(`${what}: ${drawn} frames drawn (60 and 144 a second) over ${tick} of the game, the picture scrolling ${scrolled} pixels${refresher ? `, ${posted} rooms built off the main thread (${waited} come back, ${lag} frames later)` : ''}`, drawn > frames && scrolled >= 16 && (!refresher || waited > 2));
  check(`${what}: the camera the same every frame (${cameraMoved} frames it moved)`, cameraMoved === 0);
  check(`${what}: the room shown (kept, moved, built again) where a fresh build of the frame has it (${((right / Math.max(1, places)) * 100).toFixed(1)}% of its pixels, every 4th frame)`, right >= places * 0.95);
  check(`${what}: the room drawn scrolled as far as the picture, smoothed as the sprites are (worst ${worst.toFixed(4)} px out)`, worst < 1e-3);
  check(`${what}: his shadow under his drawn feet every frame (worst ${worstFeet.toFixed(2)} px)`, worstFeet < 1.5);
  console.log(`     the floor's steps at 60 a second while it scrolls: ${moving.length} frames, ${mean.toFixed(2)} px a frame on average, the largest ${Math.max(0, ...moving.map(Math.abs)).toFixed(2)}`);
}

export interface HdSwitchSpec {
  /** The game's id (its saves' keys), its run, and the memory store the test uses. */
  id: string;
  run(host: Host): ReturnType<typeof runNative>;
  store: Map<string, string>;
  /** A save in play to continue from (somewhere a few steps each way can be walked). */
  save: MachineState;
  /** The key of an action to use in play (as well as walking right and left). */
  action: string;
}

export async function checkHdSwitch(check: Check, o: HdSwitchSpec, outDir?: string) {
  const { store } = o;
  const kept = () => store.get('runstop64.view');
  store.set(`${o.id}.save.v1`, Buffer.from(packState(o.save)).toString('base64'));
  store.delete('runstop64.view');
  const input = new Input(nowhere), renderer = new PixelRenderer(), p = o.run({ renderer, input, canvas: nowhere });
  // (the shell's switch, as games/shell.ts drives it: given the game's HD view, told each frame)
  const view = new ViewSwitch(renderer);
  view.attach(p.hd);
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { view.sync(); input.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { input.keyDown(code); tick(1); input.keyUp(code); tick(1); };
  /** The front end's screen (the stand-in renderer's: its panels, over the picture) as a PNG. */
  const shot = (file: string) => {
    const px = renderPixels(must(p.machine, 'the machine')), sc = renderer.screen.pixels, rgb = new Float32Array(320 * 200 * 3);
    for (let i = 0; i < 320 * 200; i++) { const c = C64_PALETTE[(sc[i] === 0xff ? px[i] : sc[i]) & 15]; rgb[i * 3] = (c >> 16) / 255; rgb[i * 3 + 1] = ((c >> 8) & 255) / 255; rgb[i * 3 + 2] = (c & 255) / 255; }
    rgbPng(file, rgb, 320, 200, 2);
  };
  await new Promise((r) => setTimeout(r, 0));
  for (let f = 0; f < 400 && !p.state.playing; f++) tick();
  tick(4);
  check('continued into play', p.state.playing);
  check('the game has an HD view: the switch offered, C64 by default (no room drawn in 3D)', view.offered && view.label === 'C64' && renderer.hd.room === null);
  // at any time in play (the shell's button, its touch key, H): at once, kept
  view.toggle(); tick();
  check('switched in play: HD at once (the room in 3D), kept', p.state.playing && !p.frontEnd.paused && view.label === 'HD' && renderer.hd.room !== null && kept() === 'hd');
  view.toggle(); tick();
  check('switched again: C64, kept', p.state.playing && view.label === 'C64' && renderer.hd.room === null && kept() === 'c64');
  // the pause screen is the game's: nothing of the switch on it (the same screen in either view), no room under it
  press('KeyP');
  const c64Pause = renderer.screen.pixels.slice();
  view.toggle(); tick();
  check('the pause screen: no room under it, nothing of the switch on it (the same screen in either view)', p.frontEnd.paused && view.hd && renderer.hd.room === null && renderer.screen.pixels.every((v, i) => v === c64Pause[i]));
  if (outDir) shot(`${outDir}/pause.png`);
  press('KeyP');
  tick(2);
  check('back in play: the room in 3D', renderer.hd.room !== null);
  press('KeyP'); press('KeyT');
  tick(60);
  check('on the title: no room, the switch kept', !p.state.playing && renderer.hd.room === null && view.hd);
  if (outDir) shot(`${outDir}/title.png`);
  // where the GL can't draw the HD view (renderer.hd.available false: hd-gl.ts checks the renderer's
  // side), the C64 view and no switch for the session; what was chosen is kept for another time
  renderer.hd.available = false;
  tick(2);
  check('a GL without the HD view: C64, no switch, HD kept as chosen', !view.offered && !view.hd && p.hd?.on === false && kept() === 'hd');
  renderer.hd.available = true;
  // the view only: the same play in the C64 view and the HD view leaves the game the same, byte for
  // byte; switched to C64 and back on the way
  const play = () => {
    store.set(`${o.id}.save.v1`, Buffer.from(packState(o.save)).toString('base64'));
    const inp = new Input(nowhere), r = new PixelRenderer(), q = o.run({ renderer: r, input: inp, canvas: nowhere });
    return { q, r, inp, hd: must(q.hd, 'the HD view') };
  };
  const a = play(), b = play();
  await new Promise((r) => setTimeout(r, 0));
  let rooms = 0;
  for (let f = 0; f < 400; f++) {
    const keys = f % 120 < 50 ? ['ArrowRight'] : f % 120 < 70 ? [o.action] : f % 120 < 110 ? ['ArrowLeft'] : [];
    b.hd.on = f < 150 || f >= 190;
    for (const x of [a, b]) {
      for (const k of ['ArrowRight', 'ArrowLeft', o.action]) if (keys.includes(k)) x.inp.keyDown(k); else x.inp.keyUp(k);
      x.inp.poll(); x.q.tick(); x.q.render(0);
    }
    if (b.r.hd.room) rooms++;
  }
  const ra = must(a.q.machine, 'the C64 view').ram, rb = must(b.q.machine, 'the HD view').ram;
  check(`the view only: 400 frames of the same play in each view (switched to C64 and back on the way), the game's memory the same (the HD room drawn ${rooms} frames, none in the C64 view)`, rooms > 200 && rooms < 400 && !a.r.hd.room && ra.every((v, i) => v === rb[i]));
}
