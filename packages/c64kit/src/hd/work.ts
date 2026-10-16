import { obliqueBuild, type BandPicture, type Basis, type ObliqueSpec } from './oblique';
import type { HdLight, HdRoom, HdSurface } from './scene';
import type { RoomPicture, RoomPictures, RoomPiece } from '../pendragon/room';

/**
 * Building the HD view's rooms off the main thread (worker.ts): what a build needs, as plain data
 * (`HdWork`: the builder's spec and the band's picture), and what comes back (`HdWorked`: the room
 * and what it was built from). `buildWork` does the work wherever it runs; the messages are checked
 * where they arrive (`isHdWork`, `isHdWorked`: a message's data is untyped). A builder of another
 * kind would add its own `kind`.
 */
export interface HdWork { kind: 'oblique'; spec: ObliqueSpec; band: { y: number; h: number }; picture: BandPicture }
export interface HdWorked { room: HdRoom; basis: Basis }

export function buildWork(work: HdWork): HdWorked {
  return obliqueBuild(work.spec, work.band, work.picture);
}

/** A worker's message: a piece of work (with its number), or a room built (or why not). */
export type ToHdWorker = { id: number; work: HdWork };
export type FromHdWorker = { id: number; done: HdWorked } | { id: number; error: string };

const isRecord = (d: unknown): d is Record<string, unknown> => typeof d === 'object' && d !== null;
const isNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number');
const isBox = (v: unknown): v is { y: number; h: number } => isRecord(v) && typeof v.y === 'number' && typeof v.h === 'number';
const isPoint = (v: unknown): v is Record<string, unknown> & { x: number; y: number; z: number } =>isRecord(v) && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number';
const isTriple = (v: unknown): v is [number, number, number] => isNumbers(v) && v.length === 3;

function isSpec(v: unknown): v is ObliqueSpec {
  if (!isRecord(v) || !isBox(v.band) || !isNumbers(v.floor) || !isNumbers(v.edges)) return false;
  const optNumber = (n: unknown) => n === undefined || typeof n === 'number';
  if (!optNumber(v.floorPair) || !optNumber(v.ragged) || !optNumber(v.player)) return false;
  if (v.open !== undefined && !(isRecord(v.open) && isNumbers(v.open.chars) && isNumbers(v.open.colours))) return false;
  if (v.flames !== undefined && !(isRecord(v.flames) && isNumbers(v.flames.chars) && typeof v.flames.pair === 'number' && isNumbers(v.flames.lights))) return false;
  if (v.pictures !== undefined && !isRoomPictures(v.pictures)) return false;
  return v.attached === undefined || (isRecord(v.attached) && Object.values(v.attached).every((n) => typeof n === 'number'));
}

function isPiece(v: unknown): v is RoomPiece {
  if (!isRecord(v)) return false;
  switch (v.kind) {
    case 'floor': return typeof v.height === 'number';
    case 'side': return (v.slope === 1 || v.slope === -1) && typeof v.at === 'number';
    case 'wall': case 'thing': return typeof v.depth === 'number';
    default: return false;
  }
}

function isRoomPicture(v: unknown): v is RoomPicture {
  if (!isRecord(v) || typeof v.id !== 'number' || typeof v.variant !== 'number' || typeof v.cols !== 'number' || typeof v.rows !== 'number') return false;
  const n = v.cols * v.rows;
  return v.codes instanceof Uint8Array && v.codes.length === n && v.cells instanceof Uint8Array && v.cells.length === n
    && Array.isArray(v.pieces) && v.pieces.every(isPiece) && v.parts instanceof Uint32Array && v.parts.length % 3 === 0;
}

function isRoomPictures(v: unknown): v is RoomPictures {
  return isRecord(v) && Array.isArray(v.pictures) && v.pictures.every(isRoomPicture)
    && Array.isArray(v.beside) && v.beside.every((b) => isNumbers(b) && b.length === 2);
}

function isBandPicture(v: unknown): v is BandPicture {
  return isRecord(v) && v.code instanceof Int16Array && v.colour instanceof Uint8Array && v.pair instanceof Uint8Array && v.row instanceof Int8Array && v.column instanceof Int8Array
    && v.colour.length === v.code.length && v.pair.length === v.code.length && v.row.length === v.code.length && v.column.length === v.code.length;
}

export function isHdWork(v: unknown): v is HdWork {
  return isRecord(v) && v.kind === 'oblique' && isSpec(v.spec) && isBox(v.band) && isBandPicture(v.picture);
}

function isSurface(v: unknown): v is HdSurface {
  if (!isRecord(v) || typeof v.count !== 'number') return false;
  const n = v.count * 3, f = (a: unknown, len: number) => a instanceof Float32Array && a.length === len;
  return f(v.centre, n) && f(v.u, n) && f(v.v, n) && f(v.normal, n) && f(v.colour, n) && f(v.glow, n) && f(v.shade, v.count) && f(v.occlusion, v.count)
    && v.source instanceof Int32Array && v.source.length === v.count && v.cell instanceof Int32Array && v.floor instanceof Uint8Array && v.open instanceof Uint8Array;
}

function isLight(v: unknown): v is HdLight {
  return isPoint(v) && isTriple(v.colour) && typeof v.intensity === 'number' && typeof v.range === 'number' && (v.kind === 'flame' || v.kind === 'player');
}

function isRoom(v: unknown): v is HdRoom {
  return isRecord(v) && isBox(v.band) && isSurface(v.surface) && typeof v.shift === 'number' && typeof v.exact === 'boolean'
    && Array.isArray(v.lights) && v.lights.every(isLight) && isPoint(v.pivot) && typeof v.eye === 'number'
    && isRecord(v.bounds) && isTriple(v.bounds.min) && isTriple(v.bounds.max)
    && (v.player === null || typeof v.player === 'number') && isRecord(v.attached) && Object.values(v.attached).every((n) => typeof n === 'number');
}

function isBasis(v: unknown): v is Basis {
  return isBandPicture(v) && isRecord(v) && v.kind instanceof Uint8Array && v.look instanceof Uint8Array
    && Array.isArray(v.lights) && v.lights.every((l) => isRecord(l) && typeof l.at === 'number' && typeof l.colour === 'number');
}

export function isToHdWorker(v: unknown): v is ToHdWorker {
  return isRecord(v) && typeof v.id === 'number' && isHdWork(v.work);
}

export function isFromHdWorker(v: unknown): v is FromHdWorker {
  if (!isRecord(v) || typeof v.id !== 'number') return false;
  if ('error' in v) return typeof v.error === 'string';
  return isRecord(v.done) && isRoom(v.done.room) && isBasis(v.done.basis);
}

/** Every typed array's buffer in a room built (handed over to the main thread, not copied). */
export function transfers(done: HdWorked): ArrayBuffer[] {
  const s = done.room.surface, b = done.basis, out = new Set<ArrayBuffer>();
  for (const a of [s.centre, s.u, s.v, s.normal, s.colour, s.glow, s.shade, s.occlusion, s.source, s.cell, s.floor, s.open, b.code, b.colour, b.pair, b.row, b.column, b.kind, b.look]) {
    if (a.buffer instanceof ArrayBuffer) out.add(a.buffer);
  }
  return [...out];
}
