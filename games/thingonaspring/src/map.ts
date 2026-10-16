import { isRecord } from '../../shared/guards';
import { COL, type Box, type Found, type PauseMap } from '../../shared/native/pause';
import { roomOf } from './factory';
import { canTravel, go } from './travel';

/**
 * Thing on a Spring's map, for the pause screen: the toy factory's four levels (I-IV), each a
 * row of screens as the game strings them together (see re/README.md and factory.ts): the
 * lift, then corridor, room, corridor, room... to the eighth screen. Each is drawn as long as
 * it is (a corridor is 120 characters; a room's length is its entry in the table at $4C95),
 * dark until Thing has been in it; the one he's in shows where he is along it.
 *
 * Things in the rooms (each room shows one at a time, $5875: its jigsaw piece if it has one and
 * it's not taken, else its oil can, else its switch) are marked once Thing has seen them, until
 * taken. Only once seen: the game picks the pieces' rooms at random as a game starts ($57A9) and
 * never says where they are; the map remembers what the player has found.
 */
const ROMAN = ['I', 'II', 'III', 'IV'];
/** Screens 1-8 of each level (the lift is screen 0; past the eighth is nowhere the game goes). */
export const SCREENS = 8;
const CORRIDOR = 0x78;
/** A screen's length (characters): a corridor's, or its room's ($4C95). */
export const widthOf = (ram: Uint8Array, level: number, screen: number) => { const r = roomOf(level, screen); return r === null ? CORRIDOR : ram[0x4c95 + r]; };

/** The things in a room, where they are (column along the room, sprite y), and whether they're still there. */
export function things(ram: Uint8Array, room: number) {
  const out: { kind: 'piece' | 'oil' | 'switch' | 'goblin'; col: number; y: number; left: boolean }[] = [];
  if (room === 15) return [{ kind: 'goblin' as const, col: 0xab, y: 0x3f, left: ram[0x1c] === 0 }];
  const piece = ram[0x39f + room];
  if (piece !== 0xff) out.push({ kind: 'piece', col: ram[0x5830 + room * 2], y: ram[0x5831 + room * 2], left: !(piece & 0x80) });
  out.push({ kind: 'oil', col: ram[0x5810 + room * 2], y: ram[0x5811 + room * 2], left: !(ram[0x3af + room] & 0x80) });
  const sw = ram[0x5850 + room];
  if (sw !== 0xff) out.push({ kind: 'switch', col: ram[0x5860 + (sw & 0x7f) * 2], y: ram[0x5861 + (sw & 0x7f) * 2], left: !(sw & 0x80) });
  return out;
}
/** The thing a room shows now (one at a time, $5875), if any. */
export function shown(ram: Uint8Array, room: number) {
  if (room === 15) return ram[0xcc] === 0 ? things(ram, 15)[0] : null;
  return things(ram, room).find((t) => t.left) ?? null;
}

export const piecesTaken = (ram: Uint8Array) => { let n = 0; for (let r = 0; r < 15; r++) if (ram[0x39f + r] !== 0xff && ram[0x39f + r] & 0x80) n++; return n; };
export const switchesOn = (ram: Uint8Array) => [0, 1, 2, 3, 4].filter((i) => ram[0x370 + i]).length;

type Side = 'L' | 'R';
const isSide = (x: unknown): x is Side => x === 'L' || x === 'R';
/**
 * What the map keeps in what's found (plain JSON, kept with the saves; read back checked):
 * the screens been in ("level.screen") with the ends come in by (to go back to), the things
 * seen ("piece.3": room 3's piece), and the screen he was last on.
 */
function seen(f: Found) {
  const screens: Record<string, Side[]> = {}, things: Record<string, true> = {};
  if (isRecord(f.screens)) for (const [k, v] of Object.entries(f.screens)) if (Array.isArray(v)) screens[k] = v.filter(isSide);
  if (isRecord(f.things)) for (const [k, v] of Object.entries(f.things)) if (v) things[k] = true;
  f.screens = screens; f.things = things;
  return { screens, things, last: typeof f.last === 'string' ? f.last : undefined, setLast: (k: string) => { f.last = k; } };
}
/** Sprite 7's picture when it's one of the things in a room. */
const KIND_OF = new Map<number, 'piece' | 'oil' | 'switch'>([[0xd3, 'piece'], [0xd4, 'oil'], [0xd5, 'switch']]);
const KIND_COL = { piece: COL.yellow, oil: COL.orange, switch: COL.cyan, goblin: COL.red } as const;

function layout(ram: Uint8Array, box: Box) {
  const total = (l: number) => Array.from({ length: SCREENS }, (_, i) => widthOf(ram, l, i + 1)).reduce((a, b) => a + b, 0);
  const x0 = box.x + 30, lift = 8, gap = 2;
  const scale = (box.w - (x0 - box.x) - lift - gap * SCREENS - 2) / Math.max(...[0, 1, 2, 3].map(total));
  const band = Math.floor(box.h / 4);
  /** Each screen's box (screen 0: the lift). */
  const at = (level: number, screen: number) => {
    const cy = box.y + level * band + (band >> 1);
    if (screen === 0) return { x: x0, y: cy - 8, w: lift, h: 16, cy };
    let x = x0 + lift + gap;
    for (let s = 1; s < screen; s++) x += Math.round(widthOf(ram, level, s) * scale) + gap;
    const w = Math.round(widthOf(ram, level, screen) * scale), room = roomOf(level, screen) !== null;
    return { x, y: room ? cy - 7 : cy - 3, w, h: room ? 14 : 6, cy };
  };
  return { at, band, scale };
}

export function makeMap(): PauseMap {
  return {
    observe(ram, found, vic) {
      const s = seen(found), level = ram[0x5f], screen = ram[0x5e];
      if (screen < 1 || screen > SCREENS || level > 3 || ram[0x63] || ram[0x5d]) return;
      const key = `${level}.${screen}`;
      if (s.last !== key) {
        // come in: at its left end (walking right, or out of the lift) or its right end
        const side = ram[0x19] === 0 ? 'L' : 'R';
        const ends = (s.screens[key] ??= []);
        if (!ends.includes(side) && canTravel(ram)) ends.push(side);
        s.setLast(key);
      }
      // the thing the room shows, once it's on screen (sprite 7, with its picture: $D3 piece, $D4 oil, $D5 switch)
      const room = roomOf(level, screen);
      if (room !== null && vic[0x15] & 0x80) {
        const kind = KIND_OF.get(ram[0x3f]);
        if (kind) s.things[`${kind}.${room}`] = true;
        else if (room === 15) s.things['goblin.15'] = true;
      }
    },
    title: (ram) => (ram[0x5f] <= 3 ? `LEVEL ${ROMAN[ram[0x5f]]}` : 'THE FACTORY'),
    draw(s, box, ram, found, blink, _page, font) {
      const v = seen(found), { at } = layout(ram, box);
      const here = { level: ram[0x5f], screen: ram[0x5e] };
      for (let level = 0; level < 4; level++) {
        const a0 = at(level, 0);
        font?.draw(s, ROMAN[level], box.x + 2, a0.cy - 4, here.level === level ? COL.yellow : COL.grey);
        // the lift's shaft, through the levels
        if (level < 3) s.fillRect(a0.x + 3, a0.y + a0.h, 2, at(level + 1, 0).y - a0.y - a0.h, ram[0x371] ? COL.lgrey : COL.dgrey);
        s.fillRect(a0.x, a0.y, a0.w, a0.h, ram[0x371] ? COL.lgrey : COL.dgrey);
        for (let screen = 1; screen <= SCREENS; screen++) {
          const b = at(level, screen), key = `${level}.${screen}`, room = roomOf(level, screen);
          const been = !!v.screens[key], isHere = here.level === level && here.screen === screen;
          // a screen been in: filled (rooms lighter than corridors); not yet: an outline
          const fill = isHere ? (blink ? COL.white : COL.yellow) : been ? (room !== null ? COL.lgrey : COL.grey) : -1;
          if (fill >= 0) s.fillRect(b.x, b.y, b.w, b.h, fill);
          else { s.fillRect(b.x, b.y, b.w, 1, COL.dgrey); s.fillRect(b.x, b.y + b.h - 1, b.w, 1, COL.dgrey); s.fillRect(b.x, b.y, 1, b.h, COL.dgrey); s.fillRect(b.x + b.w - 1, b.y, 1, b.h, COL.dgrey); }
          if (room === 15) { s.fillRect(b.x, b.y - 2, b.w, 1, COL.red); s.fillRect(b.x, b.y + b.h + 1, b.w, 1, COL.red); }
          // where Thing is along it
          if (isHere) {
            const fx = Math.max(0, Math.min(1, ((ram[0x19] * 4 + ram[0x1d] * 1) - 12) / (widthOf(ram, level, screen) * 4)));
            const tx = b.x + Math.round(fx * (b.w - 1));
            s.fillRect(tx, b.y - 3, 1, b.h + 6, blink ? COL.red : COL.black);
          }
          // the things in it, once seen
          if (room !== null) for (const t of things(ram, room)) {
            if (!t.left) continue;
            if (!v.things[`${t.kind}.${room}`]) continue;
            const w = widthOf(ram, level, screen), tx = b.x + Math.round(Math.min(1, t.col / w) * (b.w - 3));
            s.fillRect(tx, b.y + b.h + 2, 3, 3, KIND_COL[t.kind]);
          }
        }
      }
      // (the lift: a level's screens start from it)
      if (here.screen === 0 && here.level <= 3) { const a = at(here.level, 0); s.fillRect(a.x, a.y, a.w, a.h, blink ? COL.white : COL.yellow); }
    },
    info: (ram, found) => [
      `PIECES ${piecesTaken(ram)}/9`,
      `SWITCH ${switchesOn(ram)}/5`,
      `OIL    ${String(Math.round((ram[0x8f] * 100) / 255)).padStart(3)}%`,
      `SCREENS ${String(Object.keys(seen(found).screens).length).padStart(2)}`,
    ],
    legend: [{ colour: COL.yellow, text: 'PIECE' }, { colour: COL.orange, text: 'OIL' }, { colour: COL.cyan, text: 'SWITCH' }, { colour: COL.red, text: 'GOBLIN' }],
    // Places to go back to: each screen's ends he's come in by.
    places(box, ram, found) {
      const v = seen(found), { at } = layout(ram, box), out: { id: string; x: number; y: number; here?: boolean }[] = [];
      if (!canTravel(ram)) return out;
      for (const [key, ends] of Object.entries(v.screens)) {
        const [level, screen] = key.split('.').map(Number), b = at(level, screen);
        for (const side of ends) out.push({ id: `${key}${side}`, x: side === 'L' ? b.x + 1 : b.x + b.w - 2, y: b.cy, here: ram[0x5f] === level && ram[0x5e] === screen });
      }
      return out;
    },
    go(id, ram, found) {
      const m = id.match(/^(\d)\.(\d)([LR])$/), side = m?.[3];
      if (!m || !isSide(side) || !seen(found).screens[`${m[1]}.${m[2]}`]?.includes(side)) return false;
      return go(ram, Number(m[1]), Number(m[2]), side);
    },
  };
}
