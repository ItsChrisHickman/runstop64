/**
 * Making a headless Spectrum, loading a tape into it as a person would (LOAD "" at the keyboard, the ROM's loader
 * trapped so the blocks arrive at once), and pressing keys over frames.
 */
import fs from 'node:fs';
import { Spectrum } from './spectrum';
import { parseTap, parseTzx, type TapeBlock } from './tape';

/** Where the 48K ROM is kept (fetched at build time, not committed: games/moley/build/README.md). */
export const ROM_FILE = 'games/moley/build/48.rom';

/** The 48K ROM from a file. */
export function readRom(file = ROM_FILE): Uint8Array {
  if (!fs.existsSync(file)) throw new Error(`${file} is missing: games/moley/build/README.md says how to fetch the 48K ROM`);
  return new Uint8Array(fs.readFileSync(file));
}

/** A tape file's blocks (.tap or .tzx by its name). */
export function readTape(file: string): TapeBlock[] {
  const bytes = new Uint8Array(fs.readFileSync(file));
  return file.toLowerCase().endsWith('.tzx') ? parseTzx(bytes) : parseTap(bytes);
}

/** A machine (48K, or with the 128K paging and AY chip) that has run the ROM's start-up to the "(C) 1982 Sinclair Research Ltd" prompt. */
export function bootedSpectrum(rom: Uint8Array = readRom(), ram128 = false): Spectrum {
  const m = new Spectrum(rom, ram128);
  m.run(100);
  return m;
}

/** Press the keys named (together), run `frames`, then let go. */
export function tap(m: Spectrum, keys: readonly string[], frames = 4, after = 4) {
  for (const k of keys) m.setKey(k, true);
  m.run(frames);
  for (const k of keys) m.setKey(k, false);
  m.run(after);
}

/** Type LOAD "" ENTER at the BASIC prompt (J is LOAD; SYMBOL SHIFT with P is the quote). */
export function typeLoad(m: Spectrum) {
  tap(m, ['J']);
  tap(m, ['SYMBOL', 'P']);
  tap(m, ['SYMBOL', 'P']);
  tap(m, ['ENTER']);
}
