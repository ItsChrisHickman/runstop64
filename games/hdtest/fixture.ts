import type { HdLight, HdRoom, HdSprite, HdSurface } from '../../packages/c64kit/src/hd/scene';
import { isNumber, isNumbers, isRecord, isString, readJson } from '../shared/guards';

/**
 * A frame of the HD view as the drawing layer is given it, kept in a file: for the HD GPU test page
 * (hdtest.html) to draw with the real layer on a real GPU and set beside what the software renderer
 * (packages/c64kit/test/hd-raster.ts) made of the same frame. Written by a game's test
 * (games/blackwyche/test/hd-fixtures.ts), read by the page.
 *
 * - `room`, `sprites`: what the layer draws (the room as built, the sprites as shown);
 * - `front`, `back`, `background`: the C64's picture as the renderer has it (its screen: the characters,
 *   TRANSPARENT where the background shows; its backdrop; the background colour);
 * - `picture`: the C64's picture as shown (the sprites over it, as the VIC orders them): what the
 *   software renderer draws round the band and behind the room;
 * - `t`: the time (ms) the scene is drawn at (the flames' flicker, dust and embers);
 * - `view`: the size the software renderer drew it at (device pixels, the 320×200 picture).
 */
export interface HdFixture {
  name: string;
  t: number;
  view: { w: number; h: number };
  room: HdRoom;
  sprites: HdSprite[];
  front: Uint8Array;
  back: Uint8Array;
  background: number;
  picture: Uint8Array;
}

/**
 * The file: "HDFX", the header's length (4 bytes, little-endian), the header (JSON: the numbers, and the
 * arrays in order: name, kind, length), then each array's bytes (each starting on a multiple of 4).
 * Compressed (zlib) as a whole by the writer; `inflateFixture` undoes that.
 */
const MAGIC = 'HDFX';

type Kind = 'f32' | 'i32' | 'u8';
type Arrays = Map<string, Float32Array | Int32Array | Uint8Array>;
const kindOf = (a: Float32Array | Int32Array | Uint8Array): Kind => (a instanceof Float32Array ? 'f32' : a instanceof Int32Array ? 'i32' : 'u8');
const pad4 = (n: number) => (n + 3) & ~3;

export function encodeFixture(f: HdFixture): Uint8Array {
  const { surface: s, ...room } = f.room;
  const arrays: [string, Float32Array | Int32Array | Uint8Array][] = [
    ['centre', s.centre], ['u', s.u], ['v', s.v], ['normal', s.normal], ['colour', s.colour], ['glow', s.glow],
    ['source', s.source], ['shade', s.shade], ['occlusion', s.occlusion], ['cell', s.cell], ['floor', s.floor], ['open', s.open],
    ['front', f.front], ['back', f.back], ['picture', f.picture],
    ...f.sprites.map((sp, i): [string, Uint8Array] => [`sprite${i}`, sp.pixels]),
  ];
  const header = {
    name: f.name, t: f.t, view: f.view, background: f.background, room, count: s.count,
    sprites: f.sprites.map(({ pixels: _pixels, ...sp }) => sp),
    arrays: arrays.map(([name, a]) => ({ name, kind: kindOf(a), length: a.length })),
  };
  const json = new TextEncoder().encode(JSON.stringify(header));
  let size = pad4(8 + json.length);
  for (const [, a] of arrays) size += pad4(a.byteLength);
  const out = new Uint8Array(size), view = new DataView(out.buffer);
  out.set(new TextEncoder().encode(MAGIC));
  view.setUint32(4, json.length, true);
  out.set(json, 8);
  let at = pad4(8 + json.length);
  for (const [, a] of arrays) {
    out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), at);
    at += pad4(a.byteLength);
  }
  return out;
}

/** The file as fetched: compressed (zlib, as written) or already not (a server that undid it). */
export async function inflateFixture(bytes: Uint8Array): Promise<Uint8Array> {
  if (new TextDecoder().decode(bytes.subarray(0, 4)) === MAGIC) return bytes;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function decodeFixture(bytes: Uint8Array): HdFixture {
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC) throw new Error('not an HD fixture');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = view.getUint32(4, true);
  const header: unknown = readJson(new TextDecoder().decode(bytes.subarray(8, 8 + n)));
  if (!isRecord(header) || !Array.isArray(header.arrays)) throw new Error('an HD fixture without its header');
  const arrays: Arrays = new Map();
  let at = pad4(8 + n);
  for (const d of header.arrays) {
    if (!isRecord(d) || !isString(d.name) || !isNumber(d.length) || (d.kind !== 'f32' && d.kind !== 'i32' && d.kind !== 'u8')) throw new Error('an HD fixture\'s array, not described');
    const len = d.kind === 'u8' ? d.length : d.length * 4, raw = bytes.slice(at, at + len).buffer;
    if (raw.byteLength !== len) throw new Error(`an HD fixture cut short (${d.name})`);
    arrays.set(d.name, d.kind === 'f32' ? new Float32Array(raw) : d.kind === 'i32' ? new Int32Array(raw) : new Uint8Array(raw));
    at += pad4(len);
  }
  const f32 = (name: string, length: number) => { const a = arrays.get(name); if (!(a instanceof Float32Array) || a.length !== length) throw new Error(`an HD fixture's ${name}: not ${length} floats`); return a; };
  const i32 = (name: string, length: number) => { const a = arrays.get(name); if (!(a instanceof Int32Array) || a.length !== length) throw new Error(`an HD fixture's ${name}: not ${length} integers`); return a; };
  const u8 = (name: string, length: number) => { const a = arrays.get(name); if (!(a instanceof Uint8Array) || a.length !== length) throw new Error(`an HD fixture's ${name}: not ${length} bytes`); return a; };
  const { name, t, view: size, background, room: r, count, sprites } = header;
  if (!isString(name) || !isNumber(t) || !isBox(size) || !isNumber(background) || !isNumber(count) || !Array.isArray(sprites)) throw new Error('an HD fixture\'s header, not as written');
  if (!isRecord(r) || !isBand(r.band) || !isNumber(r.shift) || typeof r.exact !== 'boolean' || !Array.isArray(r.lights) || !r.lights.every(isLight) || !isPoint(r.pivot) || !isNumber(r.eye)
    || !isRecord(r.bounds) || !isTriple(r.bounds.min) || !isTriple(r.bounds.max) || !(r.player === null || isNumber(r.player)) || !isRecord(r.attached)) throw new Error('an HD fixture\'s room, not as written');
  const attached: Record<number, number> = {};
  for (const [k, v] of Object.entries(r.attached)) { if (!isNumber(v)) throw new Error('an HD fixture\'s room, not as written'); attached[Number(k)] = v; }
  const cells = 320 * r.band.h;
  const surface: HdSurface = {
    count, centre: f32('centre', count * 3), u: f32('u', count * 3), v: f32('v', count * 3), normal: f32('normal', count * 3), colour: f32('colour', count * 3), glow: f32('glow', count * 3),
    source: i32('source', count), shade: f32('shade', count), occlusion: f32('occlusion', count), cell: i32('cell', cells), floor: u8('floor', cells), open: u8('open', cells),
  };
  const room: HdRoom = {
    band: { y: r.band.y, h: r.band.h }, surface, shift: r.shift, exact: r.exact, lights: r.lights, pivot: { x: r.pivot.x, y: r.pivot.y, z: r.pivot.z }, eye: r.eye,
    bounds: { min: r.bounds.min, max: r.bounds.max }, player: r.player, attached,
  };
  return {
    name, t, view: { w: size.w, h: size.h }, background, room,
    sprites: sprites.map((sp, i): HdSprite => {
      if (!isRecord(sp) || !isNumber(sp.n) || !isNumber(sp.x) || !isNumber(sp.y) || !isNumber(sp.w) || !isNumber(sp.h) || !isNumber(sp.version) || typeof sp.behind !== 'boolean') throw new Error('an HD fixture\'s sprite, not as written');
      return { n: sp.n, x: sp.x, y: sp.y, w: sp.w, h: sp.h, version: sp.version, behind: sp.behind, pixels: u8(`sprite${i}`, sp.w * sp.h) };
    }),
    front: u8('front', 320 * 200), back: u8('back', 320 * 200), picture: u8('picture', 320 * 200),
  };
}

const isBox = (v: unknown): v is { w: number; h: number } => isRecord(v) && isNumber(v.w) && isNumber(v.h);
const isBand = (v: unknown): v is { y: number; h: number } => isRecord(v) && isNumber(v.y) && isNumber(v.h);
const isPoint = (v: unknown): v is Record<string, unknown> & { x: number; y: number; z: number } => isRecord(v) && isNumber(v.x) && isNumber(v.y) && isNumber(v.z);
const isTriple = (v: unknown): v is [number, number, number] => isNumbers(v) && v.length === 3;
function isLight(v: unknown): v is HdLight {
  return isPoint(v) && isTriple(v.colour) && isNumber(v.intensity) && isNumber(v.range) && (v.kind === 'flame' || v.kind === 'player');
}
