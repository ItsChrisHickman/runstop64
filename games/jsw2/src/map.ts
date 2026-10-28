import type { Surface } from 'c64kit';
import { COL, foundCodec, MAP_BOX, S, type Box, type PauseMap } from '../../shared/native/pause';
import { BEDROOM, itemsFound, itemsLeft, NEED, TOTAL } from './items';
import { LINKS, MANSION, MANSION_SIZE } from './mansion';

/**
 * Jet Set Willy II's map, for the pause screen: the whole mansion (laid out from the
 * game's own room data, see re/mansion.ts), dark until Willy has been in a room. The
 * room he's in is $13; his lives are the bits of $8096 (the HUD's sprites). Items (src/items.ts):
 * a room he's been in that still has some shows a dot, and once he has the NEED the ending wants,
 * the Masters Bedroom blinks.
 */
const roomOf = (ram: Uint8Array) => ram[0x13];
const livesOf = (ram: Uint8Array) => { let n = 0; for (let b = ram[0x8096]; b; b >>= 1) n += b & 1; return n; };

const spot = S.tuple(S.number, S.number, S.number);
type Spot = S.Infer<typeof spot>;
/** A place picked on the map to go to, still to be put right once he is in the room. */
const destination = S.object({ room: S.number, at: spot });

/**
 * Coming into a room (kept in what's been found while he's there): the spot to travel back to,
 * once he's found his feet (`at`), and how long he's lived since (`n`, passes of the main loop);
 * `air`: he's been off his feet since he came in; `feet`: his steps on his feet in a row (on the
 * level or on stairs); `y`: his height as last seen; `count`: his step countdown ($8207) as last seen.
 */
const arrival = S.object({ room: S.number, at: S.nullable(spot), n: S.number, air: S.boolean, feet: S.number, y: S.number, lives: S.number, count: S.number });
type Arrival = S.Infer<typeof arrival>;

/**
 * What the map keeps of the player's progress: the rooms visited; travel: where Willy came into
 * each room (x, its high bit, y), to put him back there; the arrival being noted in the room he is
 * in; and the place picked to go to. Willy is at
 * ($8062 + 256 * bit 0 of $8072, $8063) (the game keeps copies: $82C0/$82D9 of x, $82C8/$82DA of
 * its high bit). The game notes where he came into a room ($4C3A: $82A8 x, $82AC its high bit,
 * $82A9 y) and starts him there again after he loses a life.
 */
const found = S.object({ rooms: S.numbers, stand: S.record(spot), arrival: S.nullable(arrival), to: S.nullable(destination) });
export type Jsw2Found = S.Infer<typeof found>;
const FOUND = foundCodec(found, () => ({ rooms: [], stand: {}, arrival: null, to: null }));
/** On his feet: not jumping ($82E4), not in a jump's rise ($8292), not on a rope ($835D), not falling ($82D7). */
const standing = (ram: Uint8Array) => !ram[0x82e4] && !ram[0x8292] && !ram[0x835d] && !ram[0x82d7];
const here = (ram: Uint8Array): Spot => [ram[0x8062], ram[0x8072] & 1, ram[0x8063]];
const entry = (ram: Uint8Array): Spot => [ram[0x82a8], ram[0x82ac] & 1, ram[0x82a9]];

/**
 * His steps on his feet that make sure of it. Willy moves every few passes of the main loop (the
 * countdown at $8207, set again from the room's speed when it runs out), and only then does the game look
 * for floor under him ($58D9) and set the fall byte: until his first step in a room he stands
 * wherever he came in, in mid-air too (as he does when a life starts again).
 */
const FEET = 2;
/** Passes of the main loop he must live on after finding his feet in a room for the spot to be kept (about a second). */
const LIVED = 50;

/**
 * Where to put him on travelling to a room: where he came in, the game's own arrival, if he
 * came in on his feet (walking in at a side); if he came in in the air (dropping in from above,
 * jumping up into it, a jump across a side), where he first landed on his feet (a landing he
 * lived through: a fall too far kills on landing). "On his feet" is FEET steps of his running with
 * the game finding floor (or stairs) under him, so a spot is never in the air and arriving there
 * can't start a fall. Kept once he has lived a second after it in the room (or left it alive): a
 * spot where something kills him at once isn't kept, and the room's spot is looked for again.
 */
function noteArrival(ram: Uint8Array, found: Jsw2Found, room: number) {
  const lives = livesOf(ram), last = found.arrival;
  let a: Arrival;
  if (last && last.room === room) a = last;
  else {
    // a spot found in the room he left, and he left it alive: kept
    if (last?.at && last.lives <= lives) keep(found, last.room, last.at);
    // On his feet coming in: walking in at a side (at the height he left at). Through the bottom
    // of a room he comes in at the top of the next ($5352: y $36), through the top at the bottom
    // ($9E), in the air either way, though the room's first frames leave him standing there.
    const side = last?.y === ram[0x8063];
    a = { room, at: null, n: 0, air: !side || !standing(ram), feet: 0, y: ram[0x8063], lives, count: 0x100 }; // (no step counted on the pass he comes in)
    found.arrival = a;
  }
  if (lives < a.lives) { a.at = null; a.n = 0; a.air = true; a.feet = 0; } // lost a life: start again (he's back where he came in)
  a.lives = lives;
  const feet = standing(ram), stepped = ram[0x8207] >= a.count; // (the countdown set again, once a pass: he's had a step)
  a.count = ram[0x8207];
  if (!feet) a.feet = 0;
  else if (stepped) a.feet++;
  a.y = ram[0x8063];
  if (!feet && !a.at) a.air = true;
  if (!a.at && a.feet >= FEET) a.at = a.air ? here(ram) : entry(ram);
  if (a.at && ++a.n >= LIVED) keep(found, room, a.at);
}
/**
 * Whether he's found his feet in the room he's in (FEET steps with floor under him, as travel's spot
 * needs): the autosave waits for it (main.ts `safe`), so a save is never in mid-air.
 */
export const footing = (ram: Uint8Array, found: Jsw2Found) => found.arrival !== null && found.arrival.room === roomOf(ram) && found.arrival.at !== null;
function keep({ stand }: Jsw2Found, room: number, at: Spot) {
  if (!stand[room] && MANSION[room]) stand[room] = at;
}

export const jsw2Map: PauseMap<Uint8Array, Jsw2Found> = {
  found: FOUND,
  observe(ram, found) {
    const room = roomOf(ram), seen = found.rooms, to = found.to;
    if (MANSION[room] && !seen.includes(room)) seen.push(room);
    // arriving somewhere picked on the map: put him where he came in before (the game's own restart spot too)
    if (to && to.room === room) {
      const [x, hi, y] = to.at;
      ram[0x8062] = ram[0x82a8] = ram[0x82c0] = ram[0x82d9] = x; ram[0x8063] = ram[0x82a9] = y;
      ram[0x8072] = (ram[0x8072] & 0xfe) | hi; ram[0x82c8] = ram[0x82ac] = ram[0x82da] = hi;
      ram[0x82e4] = 0; ram[0x82d7] = 0; ram[0x8306] = 1; // not falling; collisions read afresh
      // and a fall begun before travel is forgotten: the game starts him again where a fall from another
      // room began ($5236, the spot and room at $7ABA-$7ABD), which would be the room left
      ram[0x7aba] = x; ram[0x7abb] = hi; ram[0x7abc] = y; ram[0x7abd] = room;
      found.to = null;
      return;
    }
    noteArrival(ram, found, room);
  },
  // the room he's in; while picking a room to go to, that room's name
  title: (ram, _page, pick) => (MANSION[pick ? Number(pick) : roomOf(ram)]?.name ?? 'THE MANSION').slice(0, 26),
  draw(s, box, ram, found, blink) {
    const seen = new Set(found.rooms), here = roomOf(ram);
    const { cell, cx, cy } = layout(box);
    const size = Math.max(3, cell - 2), done = itemsFound(ram) >= NEED;
    // connectors first (under the rooms): exits to rooms that are not beside the room on the map (the mansion is not a
    // consistent grid), dotted from room to room
    for (const [a, , b] of LINKS) {
      const ra = MANSION[a], rb = MANSION[b];
      if (!ra || !rb) continue;
      dotted(s, cx(ra.x), cy(ra.y), cx(rb.x), cy(rb.y), seen.has(a) && seen.has(b) ? COL.lblue : COL.blue);
    }
    // exits between rooms side by side on the map, the way they lead (each pair once)
    const drawn = new Set<string>();
    for (const [n, r] of Object.entries(MANSION)) {
      r.exits.forEach((to, k) => {
        const t = MANSION[to];
        if (to === Number(n) || !t || t.x !== r.x + STEP[k][0] || t.y !== r.y + STEP[k][1]) return;
        const id = Number(n) < to ? `${n},${to}` : `${to},${n}`;
        if (drawn.has(id)) return;
        drawn.add(id);
        const lit = seen.has(Number(n)) && seen.has(to), colour = lit ? COL.yellow : COL.dgrey;
        const x = Math.min(cx(r.x), cx(t.x)), y = Math.min(cy(r.y), cy(t.y));
        if (STEP[k][0]) s.fillRect(x, cy(r.y), cell + 1, 1, colour);
        else s.fillRect(cx(r.x), y, 1, cell + 1, colour);
      });
    }
    for (const [n, r] of Object.entries(MANSION)) {
      const room = Number(n);
      // been in and can travel back to (he found his feet there): yellow; only passed through: brown
      const stood = !!found.stand[room];
      const colour = room === here ? (blink ? COL.white : COL.yellow) : !seen.has(room) ? COL.dgrey : stood ? COL.yellow : COL.brown;
      const lit = room === BEDROOM && done && !blink && room !== here ? COL.white : colour;
      s.fillRect(cx(r.x) - (size >> 1), cy(r.y) - (size >> 1), size, size, lit);
      // items left, only in rooms he's been in
      if (seen.has(room) && itemsLeft(ram, room) > 0) s.fillRect(cx(r.x) - 1, cy(r.y) - 1, 2, 2, COL.cyan);
    }
  },
  // Places to go back to: the rooms he's found his feet in.
  places(box, ram, found) {
    const { cx, cy } = layout(box), { stand } = found;
    return Object.keys(stand).map(Number).filter((n) => MANSION[n]).map((n) => ({ id: String(n), x: cx(MANSION[n].x), y: cy(MANSION[n].y), here: n === roomOf(ram) }));
  },
  // Going: the game's own way into a room, as if he'd dropped out of the bottom of this one
  // into it (the room left is kept as it is, the new one set up); then he's where he came in (noteArrival).
  go(id, ram, found) {
    const room = Number(id), at = found.stand[room];
    if (!at || !MANSION[room]) return false;
    ram[0x816c] = room; // the way down leads there
    ram[0x8063] = 0xa2; // and he's at the bottom
    // above the spot: the frames before `observe` puts him on it have him at the top of the room, at this x,
    // and a sprite there is a collision the game reads after (from Hades, at its x, a life lost in the drain)
    ram[0x8062] = at[0]; ram[0x8072] = (ram[0x8072] & 0xfe) | at[1];
    ram[0x82e4] = 0; ram[0x8292] = 0; ram[0x835d] = 0;
    found.to = { room, at };
  },
  legend: [{ colour: COL.yellow, text: 'TRAVEL' }, { colour: COL.brown, text: 'NO TRAVEL' }, { colour: COL.cyan, text: 'ITEMS' }],
  info(ram, found) {
    const n = itemsFound(ram);
    return [`ROOMS   ${String(found.rooms.length).padStart(3)}`, `ITEMS   ${String(n).padStart(3)}`, `   OF ${TOTAL}`, n >= NEED ? 'GO TO BED' : `NEED    ${NEED}`, `LIVES     ${livesOf(ram)}`];
  },
};

/** left, right, up, down: where an exit leads on the map. */
const STEP = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

/** A dotted line (two pixels in three) between two places on the picture. */
function dotted(s: Surface, x0: number, y0: number, x1: number, y1: number, colour: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) if (i % 3 !== 2) s.set(Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), colour);
}

function layout(box: Box) {
  const cell = Math.floor(Math.min(box.w / MANSION_SIZE.w, box.h / MANSION_SIZE.h));
  const ox = box.x + Math.floor((box.w - cell * MANSION_SIZE.w) / 2), oy = box.y + Math.floor((box.h - cell * MANSION_SIZE.h) / 2);
  return { cell, cx: (x: number) => ox + x * cell + (cell >> 1), cy: (y: number) => oy + y * cell + (cell >> 1) };
}

/** Where a room's mark is on the pause screen (C64 pixels, its middle), for checks. */
export function roomSpot(room: number) {
  const { cx, cy } = layout(MAP_BOX), r = MANSION[room];
  return { x: cx(r.x), y: cy(r.y) };
}
