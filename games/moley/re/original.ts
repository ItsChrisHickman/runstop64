/**
 * What the rebuild takes from the original, read the way the notes (re/README.md) say where it is: the pristine 64K image of
 * the tape's code block (re/image.ts), the 48K ROM for the glyphs the game prints, and the game in play for the beeper
 * effects. Shared by the generator (re/extract.ts) and the test that proves the generated data (test/data.ts).
 */
import { FRAME_T, Spectrum } from '../../../tools/zx/spectrum';
import { unpackState } from '../../../tools/zx/snapshot';
import { headerOf, parseTap } from '../../../tools/zx/tape';

/** The tape's code block as the game's 64K image (zeros below it). */
export function imageFromTape(tap: Uint8Array): Uint8Array {
  const image = new Uint8Array(65536);
  let start = -1;
  for (const b of parseTap(tap)) {
    const h = headerOf(b.bytes);
    if (h) start = h.type === 3 ? h.param1 : -1;
    else if (start >= 0) image.set(b.bytes.subarray(1, b.bytes.length - 1), start);
  }
  return image;
}

/** A named span of the image: where the original keeps it. */
export interface Span { readonly name: string; readonly at: number; readonly length: number }

/** Every block of data the rebuild uses, with its place in the original. */
export const SPANS = {
  maps: { name: 'tile maps of rooms 0-5 (576 each) and the card, room 6 (768)', at: 0x6000, length: 6 * 576 + 768 },
  attrs: { name: 'attribute tables, the same layout', at: 0x7080, length: 6 * 576 + 768 },
  tiles: { name: 'room tile set, 250 tiles (the pistons use up to $F9)', at: 0xd800, length: 250 * 8 },
  endingTiles: { name: 'ending tile set, 192 tiles', at: 0xf800, length: 192 * 8 },
  sprites: { name: 'sprite frames, 192 of 32 bytes', at: 0xc000, length: 192 * 32 },
  gauge: { name: 'energy gauge images, 8 levels of 2 frames', at: 0xd200, length: 512 },
  panelBitmap: { name: 'HUD panel bitmap (screen rows 18-23)', at: 0xb500, length: 2048 },
  panelAttrs: { name: 'HUD panel attributes', at: 0xbd40, length: 192 },
  credits: { name: 'credits picture: 768 attribute bytes, then 8 bytes for each cell with bit 7 set', at: 0xa564, length: 3416 },
  creditsText: { name: 'credits page scroller text', at: 0xa111, length: 0xa276 - 0xa111 },
  endingText: { name: 'ending scroller text', at: 0x8391, length: 0x8520 - 0x8391 },
  gameOverText: { name: 'GAME OVER text', at: 0x82ab, length: 12 },
  jumpTable: { name: 'the 24 vertical steps of a jump', at: 0x8e12, length: 24 },
  jumpFrames: { name: 'the jump frame for each phase', at: 0x9129, length: 24 },
} as const satisfies Record<string, Span>;

export function bytesOf(image: Uint8Array, span: Span): Uint8Array {
  return image.slice(span.at, span.at + span.length);
}

/** The characters the game prints: its three texts, the score's digits and the space the score pads with. */
export function printedCharacters(image: Uint8Array): number[] {
  const set = new Set<number>();
  for (const s of [SPANS.creditsText, SPANS.endingText, SPANS.gameOverText]) for (const c of bytesOf(image, s)) set.add(c);
  for (let c = 0x30; c <= 0x39; c++) set.add(c);
  set.add(0x20);
  return [...set].sort((a, b) => a - b);
}

/** The ROM's glyph for a character: 8 bytes at $3C00 + char * 8 (the game's $A2B5). */
export function romGlyph(rom: Uint8Array, c: number): Uint8Array {
  return rom.slice(0x3c00 + c * 8, 0x3c00 + c * 8 + 8);
}

/** The beeper effects the game calls (the others, 4 and 6, are never called). */
export const EFFECTS_USED = [0, 1, 2, 3, 5] as const;

/** One beeper effect as the speaker did it: T-states before the first toggle, the gaps between toggles, and T-states from the last toggle to the end. */
export interface Effect { readonly id: number; readonly lead: number; readonly gaps: number[]; readonly tail: number }

/**
 * Call each effect as the game does ($A017, A = effect) from the game in play, run to its return, and record the speaker's
 * toggles. Effects 1 and 3 read bytes of the ROM as noise, so the record includes them.
 */
export function recordEffects(rom: Uint8Array, state: Uint8Array): Effect[] {
  const RETURN = 0x822b;
  return EFFECTS_USED.map((id) => {
    const m = new Spectrum(rom);
    unpackState(m, state);
    const cpu = m.cpu;
    cpu.sp = (cpu.sp - 2) & 0xffff;
    m.mem[cpu.sp] = RETURN & 255; m.mem[cpu.sp + 1] = RETURN >> 8;
    cpu.regs[7] = id;
    cpu.pc = 0xa017;
    const start = m.frame * FRAME_T + cpu.t;
    let end = -1;
    m.onStep = (pc) => { if (pc === RETURN && end < 0) end = m.frame * FRAME_T + cpu.t; };
    m.beeper.length = 0;
    for (let f = 0; f < 400 && end < 0; f++) m.runFrame();
    if (end < 0) throw new Error(`effect ${id} did not return`);
    const times = m.beeper.map((b) => b.frame * FRAME_T + b.t);
    if (times.length === 0) throw new Error(`effect ${id} made no sound`);
    return { id, lead: times[0] - start, gaps: times.slice(1).map((t, i) => t - times[i]), tail: end - times[times.length - 1] };
  });
}
