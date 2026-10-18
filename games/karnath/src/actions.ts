import * as engine from './gen/engine';

/** The ten spells, by the number the game keeps in $322C (shown by $150E from the names at $0FF4; re/README.md, "The spells"). */
export const SPELL = { forthrin: 1, throbin: 2, knossos: 3, omphalos: 4, menhir: 5, aeolus: 6, baracata: 7, ibrahim: 8, stolv: 9, yerobas: 10 } as const;

/**
 * The spell in hand and picking one, the game's own way ($150E shows its name). 1-9 and 0 pick one in play (main.ts), and the ending's Pendragon
 * (ending.ts) uses it too; what he casts with by default is FORTHRIN, the spell that works on most things.
 */
export const ACTIONS = {
  strike: SPELL.forthrin,
  /** No spell in flight ($3216: 1 while one flies): the game takes a cast only then. */
  ready: (ram: Uint8Array) => ram[0x3216] === 0,
  get: (ram: Uint8Array) => ram[0x322c],
  set: (ram: Uint8Array, n: number, call: (fn: () => void) => void) => { ram[0x322c] = n; call(engine.r_150e); },
};
