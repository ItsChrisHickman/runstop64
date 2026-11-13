import { TABLES } from './data';
import { BANNERS } from './data/awm-data';
import type { Game } from './game';

/**
 * What the game asks for, in one place: the rooms and creatures that take a thing from him. The CARRYING page says what each
 * thing is for from this, and ENHANCED's item hints (hints.ts) say where a thing goes, what a room wants and what a handover paid.
 */

/** A delivery: the room that wants an item, what it pays and how it counts. */
export interface Delivery {
  readonly room: number;
  readonly type: number;
  /** `[amount, times]` added to the money. */
  readonly pay: readonly [number, number];
}

/** $55BF-$5618: the four rooms where handing over the right item pays out, on coming in. */
export const DELIVERIES: readonly Delivery[] = [
  { room: 0x16, type: 0x0b, pay: [0x12, 1] },
  { room: 0x2c, type: 0x0c, pay: [0xfa, 4] },
  { room: 0x3e, type: 0x07, pay: [0xfa, 3] },
  { room: 0x0b, type: 0x04, pay: [0x64, 3] },
];

/** Money a handover paid: the amount, as many times as the game adds it. */
export const paid = ([amount, times]: readonly [number, number]): number => amount * times;

/** The thing a want is for, as far as the state of the game shows it has been handed over. */
type HandedOver = (g: Game) => boolean;

/** A room that wants a thing: `delivery` is the room's own (on coming in), `asked` a creature's or a scene's (`Game.touch`, `Game.scripts`). */
export interface Want {
  readonly room: number;
  readonly type: number;
  readonly kind: 'delivery' | 'asked';
  /** It has been handed over already, read from what has happened (nothing is kept for it). */
  readonly done: HandedOver;
}

/** He has picked the (only) thing of this type up, and no longer holds it: it was handed over. */
const spent = (type: number): HandedOver => (g) =>
  TABLES.items.some((e, i) => e.type === type && g.items.collected[i] === true) && !g.items.has(type);

/** Room 5's creature takes $0A and gives $13 for room $36's; the toll-keeper wants 3 until paid once; room $1B's scene takes 5 once. */
export const WANTS: readonly Want[] = [
  ...DELIVERIES.map((d): Want => ({ room: d.room, type: d.type, kind: 'delivery', done: spent(d.type) })),
  { room: 5, type: 0x0a, kind: 'asked', done: spent(0x0a) },
  { room: 0x36, type: 0x13, kind: 'asked', done: (g) => spent(0x0a)(g) && !g.items.has(0x13) },
  { room: 0x49, type: 3, kind: 'asked', done: (g) => g.helped > 0 },
  { room: 0x1b, type: 5, kind: 'asked', done: (g) => g.quest > 0 },
];

/** What asks for a thing of this type. */
export const wantFor = (type: number): Want | undefined => WANTS.find((w) => w.type === type);

/** What a room asks for. */
export const wantIn = (room: number): Want | undefined => WANTS.find((w) => w.room === room);

/**
 * A room's name short enough for the panel, in the game's banner: the place, or the country where the place is blank or
 * reads as nothing alone (room $1B's banner is "THE, AUSTRIA").
 */
export function placeName(room: number): string {
  const [land = '', place = ''] = (BANNERS[room] ?? '').split('|');
  const p = place.trim();
  return p.length >= 4 && p !== 'THE' ? p : land.trim();
}
