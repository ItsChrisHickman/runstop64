import { HINTS } from './hints';

/** The corridors' block's first jump: at $6000 while he's in the corridors (else in a chamber). */
const CORRIDORS = 0x60f8;

/**
 * The hints assist: the places in the chamber he's in where something can be done and hasn't
 * been yet (HINTS, src/hints.ts: each shows until its byte has its done value, and while what it
 * needs holds). The places are on the unscrolled screen; the wider chambers scroll a little when
 * he walks near an edge, by how far his sprite ($321F, with the high bit it must have) is from
 * where he is in the chamber ($3212/$3213). A hint on a moving thing (`sprite`) follows it.
 */
export function hintSpots(ram: Uint8Array, vic: Uint8Array): { x: number; y: number }[] {
  if ((ram[0x6001] | (ram[0x6002] << 8)) === CORRIDORS) return [];
  const hints = HINTS[ram[0x321c]];
  if (!hints) return [];
  const x = ram[0x3212] | (ram[0x3213] << 8), lo = ram[0x321f];
  const scroll = x - (Math.abs(x - lo - 256) < Math.abs(x - lo) ? lo + 256 : lo);
  return hints
    // (`seen`: only while he's to be seen, his sprite 2 shown: in 7 he sinks out of sight in a pool)
    .filter((h) => ram[h.until[0]] !== h.until[1] && (h.when ?? []).every(([a, v]) => ram[a] === v) && (!h.seen || vic[0x15] & 4))
    .flatMap((h) => {
      if (h.sprite === undefined) return h.spots.map(([sx, sy]) => ({ x: sx - scroll, y: sy }));
      // on a sprite (where the VIC-II has it; while it's shown)
      const n = h.sprite, bit = 1 << n;
      if (!(vic[0x15] & bit)) return [];
      const sx = (vic[n * 2] | (vic[0x10] & bit ? 256 : 0)) - 24, sy = vic[n * 2 + 1] - 50;
      return h.spots.map(([dx, dy]) => ({ x: sx + dx, y: sy + dy })).filter((p) => p.y >= 0 && p.y < 200 && p.x >= 0 && p.x < 320);
    });
}
