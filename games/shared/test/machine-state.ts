/**
 * A machine save is checked as it is read back (`unpackState`, packages/c64kit/src/c64/machine.ts):
 * a good one round-trips; a wrong length, a header that isn't JSON, and a header with a missing or
 * mistyped field are refused with a clear error and never reach the game.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/machine-state.ts
 */
import { C64Machine, packState, unpackState } from 'c64kit';
import { isRecord, readJson } from '../guards';
import { check, finish } from './check';

const m = new C64Machine();
m.cpu.a = 7; m.cpu.pc = 0x1234;
const good = packState(m.saveState());
const headerLength = new DataView(good.buffer, good.byteOffset).getUint32(0, true);
const blocks = good.subarray(4 + headerLength);

const back = unpackState(good);
check('a good save round-trips (cpu, ram, colour, vic, sid)',
  back.cpu.a === 7 && back.cpu.pc === 0x1234 && back.ram.length === 0x10000 && back.colour.length === 1024 && back.vic.length === 0x40 && back.sid.length === 0x20);

const header = readJson(new TextDecoder().decode(good.subarray(4, 4 + headerLength)));
if (!isRecord(header)) throw new Error('the header of a good save is not an object');

/** A save with `text` as its JSON header and the good byte blocks. */
const withHeader = (text: string): Uint8Array => {
  const json = new TextEncoder().encode(text);
  const out = new Uint8Array(4 + json.length + blocks.length);
  new DataView(out.buffer).setUint32(0, json.length, true);
  out.set(json, 4);
  out.set(blocks, 4 + json.length);
  return out;
};

const refused = (what: string, bytes: Uint8Array, message: RegExp) => {
  let error = '';
  try { unpackState(bytes); } catch (e) { error = e instanceof Error ? e.message : String(e); }
  check(`${what}: refused (${error || 'not refused'})`, message.test(error));
};

refused('too short', new Uint8Array(2), /too short/);
refused('a cut-off save', good.subarray(0, good.length - 1), /bytes, expected/);
refused('a header that is not JSON', withHeader('{nope'), /JSON/);
refused('a header that is a list', withHeader('[1,2]'), /not an object/);
refused('no cpu', withHeader(JSON.stringify({ ...header, cpu: undefined })), /bad cpu/);
refused('a cpu register that is text', withHeader(JSON.stringify({ ...header, cpu: { ...(isRecord(header.cpu) ? header.cpu : {}), a: 'x' } })), /bad cpu/);
refused('no cia1', withHeader(JSON.stringify({ ...header, cia1: null })), /bad cia1/);
refused('a raster compare that is text', withHeader(JSON.stringify({ ...header, rasterCompare: '3' })), /raster/);
refused('collisions that are not numbers', withHeader(JSON.stringify({ ...header, collisions: ['a'] })), /collisions/);
refused('a native state with text in it', withHeader(JSON.stringify({ ...header, native: { owed: 'much' } })), /native/);
refused('a frame without rows', withHeader(JSON.stringify({ ...header, frame: { sprites: [] } })), /frame/);

finish();
