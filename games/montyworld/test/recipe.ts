/**
 * What a room holds, read from a Monty game's data the engine plays (`MontyData`), for the tools that measure rooms against Monty on the
 * Run's (room-stats.ts, the recipe numbers; challenge.ts, the challenge check). One owner, so the two count alike.
 */
import type { MontyData } from '../../montyotr/src/montydata';

/** A creature as the room's enemy record gives it (7 bytes: colour, x, y, direction, type, speed, range). */
export interface CreatureRecord { colour: number; vertical: boolean; speed: number; range: number; /** its patrol, in cells (8 px) */ cells: number }

/** The creatures of a room, from its enemy records. */
export function creaturesOf(data: MontyData, id: number): CreatureRecord[] {
  const rec = data.enemyRecords(id);
  const out: CreatureRecord[] = [];
  for (let i = 0; i + 6 < rec.length && rec[i] !== 0xff; i += 7) {
    const dir = rec[i + 3] ?? 0, speed = rec[i + 5] ?? 0, range = rec[i + 6] ?? 0;
    const vertical = dir === 3 || dir === 4;
    // (across, x is stored halved: a step of `speed` is 2 px a unit; up and down, a pixel a unit)
    out.push({ colour: (rec[i] ?? 0) & 15, vertical, speed, range, cells: Math.round((range * speed) / (vertical ? 8 : 16)) });
  }
  return out;
}

/** The mechanisms the data names in a room, by kind. */
export function mechanismsOf(data: MontyData, id: number): string[] {
  const named: readonly (readonly [string, readonly { room: number }[]])[] = [
    ['lift', data.lifts], ['escalator', data.escalators], ['icicle', data.icicles], ['tunnel', data.tunnels], ['cracking ice', data.cracks],
    ['timed strike', data.pulses], ['dragon', data.dragons], ['rising lava', data.risingLava], ['flight', data.flights], ['boulder', data.rollers],
    ['vine', data.vines], ['cable car', data.cableCars], ['float', data.floats], ['skewer', data.skewers],
  ];
  const out = named.flatMap(([name, specs]) => specs.filter((s) => s.room === id).map(() => name));
  if (data.swimRooms.includes(id)) out.push('swim');
  if (data.risingCloud?.room === id) out.push('cloud');
  if (data.jetpackRooms.includes(id)) out.push('jetpack');
  if (data.c5?.rooms.includes(id)) out.push('c5 street');
  if (data.flashingBases?.room === id) out.push('flashing bases');
  if (data.bollard?.room === id) out.push('bollard');
  return out;
}

export function table(bytes: Uint8Array, stride: number, room: number): number {
  let n = 0;
  for (let i = 0; i + stride <= bytes.length; i += stride) if (bytes[i] === room) n++;
  return n;
}

/** The Mole Crushers in a room. */
export const crushersIn = (data: MontyData, id: number): number => table(data.piledriverCfg, 5, id);
