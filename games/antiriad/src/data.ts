import data from './data/antiriad.json';

/**
 * The original's data (tools/extract-antiriad.mjs): memory sections at their
 * original addresses. The port reads the same tables the original did, so its
 * routines index them exactly as the 6502 code did.
 */
export interface Section { at: number; about: string; data: string }

export const ROOMS: number = data.rooms;
/** Each room's exits: right, left, down, up (-1: none). */
export const EXITS: number[][] = data.exits;

function decode(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The game's memory as it stands when it starts: every section in place, the code's area empty. */
export function memoryImage(): Uint8Array {
  const ram = new Uint8Array(0x10000);
  const sections: Record<string, Section> = data.sections;
  for (const s of Object.values(sections)) ram.set(decode(s.data), s.at);
  return ram;
}
