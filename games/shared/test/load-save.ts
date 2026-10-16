/**
 * A save Chris exported (the info sheet's "Export save (debug)": `runstop64-<game>-<date>.json`,
 * games/shared/saves.ts `exportSaves`), read back for a test:
 *
 * - `loadSave(file, codec)`: the game's save itself, as its codec unpacks it (a machine state for
 *   `MACHINE_CODEC`, e.g. `NativeHost.resume(port, s)`; Monty's `CODEC` gives a `MontySave`, for
 *   `restore(game, s)`); `'previous'` for the one kept from before the last new game;
 * - `loadIntoStorage(file)`: everything in it put in the (test's) storage, so a game launched
 *   after it (`run(host)`) goes straight back into play from it, as it did for Chris.
 */
import fs from 'node:fs';
import type { SaveCodec } from '../continue';
import { fromBase64, parseExport, putSaves, type SavesExport } from '../saves';
import { readJson } from '../guards';

/** The export file, checked (a clear error if it isn't one). */
export function readExport(file: string): SavesExport {
  let v: unknown;
  try { v = readJson(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file}: not JSON (${e instanceof Error ? e.message : String(e)})`); }
  const saves = parseExport(v);
  if (!saves) throw new Error(`${file}: not a runstop64 saves export (or another save version)`);
  return saves;
}

/** One of its saves, as the game's codec unpacks it. */
export function loadSave<S>(file: string, codec: SaveCodec<S>, which: 'current' | 'previous' = 'current'): S {
  const slot = readExport(file)[which];
  if (!slot) throw new Error(`${file}: no ${which} save`);
  return codec.unpack(fromBase64(slot.data));
}

/** Its saves (and what had been found) in storage in place of the game's own; the export. */
export function loadIntoStorage(file: string): SavesExport {
  const saves = readExport(file);
  putSaves(saves);
  return saves;
}
