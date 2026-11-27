/**
 * Every way between two rooms goes both ways, and every edge he can get to leads somewhere (Chris, 2026-11-24: THE WATCHTOWER's top right door that seemed one-way;
 * "a path drawn as walkable must lead somewhere": the rooftops' left side open onto nothing). Found by playing, not by reading the picture: from the game's start,
 * with every find held (every gate open, as at the end), Monty is put at each place he comes to rest in a room (standing, or still on a rope; afloat in open water or
 * under the canopy, where the stroke left him) and tries what a player tries there: a step either way, a jump either way or straight up, holding up, holding down; in a
 * room where the moment matters (a lift, a cart, a cable car, a surge, doors that open and shut) also standing still and the same tries after waits, from the game as it
 * was. Scripted moves play out (the plane's legs, the bail-out). Where he comes to rest is a new place; where he leaves the room is a crossing, and where he comes to rest
 * across is a new place there. No creatures, and nothing kills him (the grace): passing a danger is a matter of timing, which the region bots and mechanism tests check;
 * this is about the ways. Out through the bottom over deadly water, or up into it, is a death, not a way; he is at an edge once he is into the margin the picture shows
 * beyond it (a wall there stops him at column 0, as the exit grid does past it). Then:
 *  - every room is reached;
 *  - a crossing from A to B with none from B back to A is one way: a fault unless `ONE_WAY` names it with its reason (a drop, a ride that carries him on);
 *  - each way is judged by its door too, not only by the two rooms: a door is an opening in A's edge (a run of open cells along it) where it meets one in B's, and
 *    a door crossed one way only is a fault even when the rooms join both ways through another (THE WATCHTOWER's top right door beside its floor's way into the
 *    market). `ONE_WAY` excuses a door only where its rooms have no way back at all;
 *  - an opening drawn as a way out (an open run at the left or right edge with a walkway under it, three cells in from the edge, tall enough for him) that he never gets to is a
 *    fault too: into a neighbour, a door never used; with no room beyond, a path drawn to lead nowhere (`NOWHERE` names those meant, as for edges he gets to);
 *  - a place where he reaches a room's edge with no room beyond it is an opening that leads nowhere: a fault unless `NOWHERE` names it with its reason;
 *  - an entry of either list that no longer holds is stale and fails, so the lists stay true. `PENDING` lists what other work owns or Chris is to decide: reported, not failed.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/one-way.ts [--room <rooms>] [--doors]   (--room: only the crossings and edges of those rooms are judged; the play is always the whole world's;
 *   --doors: list every door of those rooms and how often each way was crossed)
 */
import { enterRoom } from '../../montyotr/src/ending';
import { Game } from '../../montyotr/src/game';
import { copyGame, copyInto } from '../../montyotr/src/game-copy';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { standY } from './route';
import { SCOPE } from './scope';

type Side = 'left' | 'right' | 'up' | 'down';
type Stick = typeof NONE;

/** Crossings meant to go one way, `from>to` (room ids), each with its reason. */
export const ONE_WAY: Readonly<Record<string, string>> = {
  '2>8': 'SEEING RED\'s drain drops into the platform\'s gallery; the way back is the up escalator to the hall (moscow.ts)',
  '4>5': 'KREMLIN GREMLINS\' gorge drops to the station; the way on is the train (moscow.ts)',
  '41>49': 'Waikiki\'s surf dives into Hana; a swim room is never left upward (swim.ts), the way on is Hilo\'s shore',
  '52>79': 'Hilo\'s apron boards the mail biplane: THE FLIGHT (pacific.ts biplaneBoarding)',
  '79>80': 'the flight\'s first leg; the clock moves him on east (planes.ts)',
  '80>81': 'the flight\'s second leg; the clock moves him on east (planes.ts)',
  '81>55': 'the bail-out from ON HIS TAIL into JUMP FOR JOY (planes.ts)',
  '55>56': 'the parachute drop, JUMP FOR JOY into OUT OF THIN AIR: under the canopy he cannot go up (flight.ts)',
  '56>57': 'the parachute drop, OUT OF THIN AIR into CONDOR COUNTRY: under the canopy he cannot go up (flight.ts)',
  '57>58': 'the parachute drop lands on the terraces: under the canopy he cannot go up (flight.ts)',
  '32>98': 'MOUNT FUJI\'s open mountainside drops into the ice cave at its foot (GONE WITH THE WIND); the way back up is the tengu\'s gust, a teleport back to the foot hut on the way in (japan.ts CAVE)',
};

/** Edges he gets to with no room beyond, `room side`, each with its reason. */
export const NOWHERE: Readonly<Record<string, string>> = {
  '0 left': 'the game\'s start, open at its back as Monty on the Run\'s start is (Chris, 2026-11-22: no wall for no reason; edges.ts)',
};

/** Edges and crossings found faulty that are not this test's to mend: another region's work, or Chris's call. Reported each run; one that no longer shows says so. */
export const PENDING: Readonly<Record<string, string>> = {
  '58 left': 'the Andes (another job): the terraces\' left edge',
  '59 right': 'the Andes (another job): Machu Picchu\'s right edge',
  '62 left': 'the Andes (another job): the canopy\'s left edge',
  '66 left': 'the Amazon (another job): the sandbar\'s left edge',
  '77 right': 'Rio (another job): the carnival bust\'s right edge',
  '73 right 0-3': 'Rio (another job): HOUSE OF COLOUR\'s rooftop walkway (the floor at row 4) runs to the right edge over THE LAPA ARCHES and is never crossed (found merging Rio into the Andes\' grid, 2026-11-26)',
  '55 right': 'the Andes (another job): JUMP FOR JOY\'s ledge at row 11 runs to the right edge, nothing beyond (he does not get there under the canopy)',
  '74>68 down ?': 'Rio (another job): from STEAK YOUR CLAIM\'s floor west of the rope (cols 1-2) he sinks through the floor\'s platform tiles into LAPA, whose ceiling is solid there; no way back up through it',
};

const grid = WORLD.exitGrid;
const OPPOSITE: Readonly<Record<Side, Side>> = { left: 'right', right: 'left', up: 'down', down: 'up' };
const SIDES: readonly Side[] = ['left', 'right', 'up', 'down'];
const cellOf = (id: number) => { const at = grid.image.indexOf(id); return at < 0 ? null : { row: Math.floor(at / grid.cols), col: at % grid.cols }; };
const roomAt = (row: number, col: number) => (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols ? 0xff : grid.image[row * grid.cols + col] ?? 0xff);
const neighbours = (room: number): Record<Side, number> => {
  const c = cellOf(room);
  if (!c) return { left: 0xff, right: 0xff, up: 0xff, down: 0xff };
  return { left: roomAt(c.row, c.col - 1), right: roomAt(c.row, c.col + 1), up: roomAt(c.row - 1, c.col), down: roomAt(c.row + 1, c.col) };
};

// ---- each room as it is with every find held, loaded once ----
const bases = new Map<number, Game>();
function base(room: number): Game | null {
  const had = bases.get(room);
  if (had) return had;
  const g = new Game(WORLD);
  g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
  g.start();
  g.siCollected.fill(0x81);
  if (!enterRoom(g, room, 0x30, standY(10))) return null;
  g.enemies = []; g.enable &= 0x0f; g.vic.enable &= 0x0f;
  g.gameMode = 0; g.actionCounter = 0; g.falling = 0; g.montyAction = 0; g.onRope = 0; // (wherever the load put him: each try puts him in his place)
  bases.set(room, g);
  return g;
}

// ---- the openings in a room's edges ----
const solidAt = (g: Game, c: number, r: number) => { const f = g.flagAt(3 + r, 4 + c); return f === 1 || f === 2; };
/** The cells across a side at each place along it: rows down the left and right (the edge column and the margin's next to it: a wall in either closes it), columns along the top and bottom. */
const along = (side: Side): readonly (readonly (readonly [number, number])[])[] =>
  side === 'left' || side === 'right'
    ? Array.from({ length: 20 }, (_, r) => (side === 'left' ? [[0, r], [-1, r]] as const : [[31, r], [32, r]] as const))
    : Array.from({ length: 32 }, (_, c) => [[c, side === 'up' ? 0 : 19]] as const);
/** The runs of open cells along a side of a room (with every find held): `[first, last]`, rows or columns. */
const runsMemo = new Map<string, readonly (readonly [number, number])[]>();
function runs(room: number, side: Side): readonly (readonly [number, number])[] {
  const k = `${room} ${side}`, had = runsMemo.get(k);
  if (had) return had;
  const g = base(room), out: [number, number][] = [];
  if (g) {
    along(side).forEach((cells, i) => {
      if (cells.some(([c, r]) => solidAt(g, c, r))) return;
      const last = out[out.length - 1];
      if (last && last[1] === i - 1) last[1] = i; else out.push([i, i]);
    });
  }
  runsMemo.set(k, out);
  return out;
}
/** The run along a side that his body (rows for a side edge, columns for the top or bottom) is in: `first-last`, or `?` when none is. */
function runOf(room: number, side: Side, body: readonly number[]): string {
  const r = runs(room, side).find(([a, b]) => body.some((i) => i >= a && i <= b));
  return r ? `${r[0]}-${r[1]}` : '?';
}
/** His body's rows (left, right) or columns (up, down) in the playfield. */
const bodyOn = (side: Side, row: number, col: number): readonly number[] => (side === 'left' || side === 'right' ? [row, row + 1, row + 2] : [col, col + 1]);

// ---- the places, and what is tried from each ----
/** A place he rests at; in a room with something that carries him, the game as it was then (where the cart or the car is matters to what comes next). */
interface Place { room: number; x2: number; y: number; rope: boolean; snap?: Game }
/**
 * Rooms where the way depends on the moment: something carries him (a lift, a float, a cable car, a swinging vine) or a way opens and shuts (the timed strikes: the hall's paper doors).
 * Tries there start from the game as it was when he came to rest and also wait before each step or jump.
 */
const CARRY = new Set([...WORLD.lifts, ...WORLD.floats, ...WORLD.cableCars, ...WORLD.pulses, ...WORLD.currents, ...WORLD.vines].map((m) => m.room));
const keyOf = (p: Place) => AFLOAT.has(p.room) ? `${p.room}:${p.x2 >> 3}:${p.y >> 4}` : `${p.room}:${p.x2 >> 2}:${p.y}:${p.rope ? 1 : 0}`;
const dead = (g: Game) => (g.actionCounter & 0x80) !== 0;
/** What is held at frame n of a try (the game as it is then): NONE once the try is over. */
type Try = (n: number, g: Game) => Stick;
const hold = (stick: Partial<Stick>, frames: number): Try => (n) => (n < frames ? { ...NONE, ...stick } : NONE);
/** A jump, the way held while he is in the air. */
const jump = (way: 'left' | 'right' | null): Try => (n, g) => (n < 2 ? { ...NONE, fire: true, ...(way ? { [way]: true } : {}) } : way && (g.montyAction || g.falling) ? { ...NONE, [way]: true } : NONE);
const TRIES: readonly Try[] = [
  hold({ left: true }, 8), hold({ right: true }, 8), // a step
  jump('left'), jump('right'), jump(null),
  hold({ up: true }, 240), hold({ down: true }, 240), // a climb
];
/** Standing still for a while (for a lift, a cart or a car to carry him): the one try that goes on while he does not move. */
const WAIT = hold({}, 480);
/** Rooms where he never comes to rest: open water and a flight under the canopy (he steers four ways, as a swimmer). */
const AFLOAT = new Set([...WORLD.swimRooms, ...WORLD.flights.map((f) => f.room)]);
/** In a plane's leg the clock moves him on (planes.ts): he sits it out. */
const PLANE_LEGS = new Map(WORLD.planes.map((l) => [l.room, l.frames]));
const RIDE = hold({}, Math.max(0, ...PLANE_LEGS.values()) + 200);
/** The tries that go on while he stands still (the waits, the plane's leg). */
const PATIENT = new Set<Try>([WAIT, RIDE]);
/** In a room with something that carries him: wait, then step or jump (on to it or off it). */
function after(wait: number, t: Try): Try {
  const w: Try = (n, g) => (n < wait ? { ...NONE } : t(n - wait, g));
  PATIENT.add(w);
  return w;
}
/** The tries in a room: a walker's or a swimmer's, and where the moment matters the same after waits. */
const WAITS = Array.from({ length: 8 }, (_, k) => (k + 1) * 50);
const LAND_TIMED: readonly Try[] = [...TRIES, WAIT, ...WAITS.flatMap((w) => [hold({ left: true }, 8), hold({ right: true }, 8), jump('left'), jump('right')].map((t) => after(w, t)))];
/** In open water: a stroke each of eight ways (he is still once he lets go: buoyant, he floats on; the surge carries him). */
const SWIM: readonly Try[] = [{ left: true }, { right: true }, { up: true }, { down: true }, { left: true, up: true }, { right: true, up: true }, { left: true, down: true }, { right: true, down: true }].map((way) => hold(way, 40));
const SWIM_TIMED: readonly Try[] = [...SWIM, ...WAITS.flatMap((w) => SWIM.map((t) => after(w, t)))];

const scratch = new Game(WORLD);
const seen = new Set<string>();
const queue: Place[] = [];
/** Crossings found: `from>to` and how many tries made it. */
const crossings = new Map<string, number>();
/**
 * Doors crossed: `A side run | B side run` with A the lower room id, and how many tries went each way. `run` is the open run along the edge
 * (`first-last` rows or columns) his body was in on that side as he went.
 */
const doors = new Map<string, { there: number; back: number; at: string }>();
/** Crossings made only by a teleporter (`from>to`): a way back that is no door, so a drop named in `ONE_WAY` whose way back is a teleport is still one way through its door. */
const warps = new Map<string, number>();
/** Openings used either way: `room side run`. */
const used = new Set<string>();
/** A crossing through a door: false when it is through deadly cells (water, lava) at the floor of the room above, a death the grace refused, not a way. */
function crossed(from: number, to: number, row: number, col: number): boolean {
  const nb = neighbours(from), sides = SIDES.filter((s) => nb[s] === to);
  const side = sides.length === 1 ? sides[0] : sides.find((s) => (s === 'left' ? col <= 1 : s === 'right' ? col >= 29 : s === 'up' ? row <= 1 : row >= 17));
  if (side === undefined) return true;
  const above = side === 'down' ? from : side === 'up' ? to : null;
  if (above !== null && [col, col + 1].some((c) => base(above)?.flagAt(3 + 19, 4 + c) === 4)) return false;
  const body = bodyOn(side, row, col), mine = `${from} ${side} ${runOf(from, side, body)}`, theirs = `${to} ${OPPOSITE[side]} ${runOf(to, OPPOSITE[side], body)}`;
  used.add(mine); used.add(theirs);
  const k = from < to ? `${mine} | ${theirs}` : `${theirs} | ${mine}`, d = doors.get(k) ?? { there: 0, back: 0, at: `from col ${col} row ${row} of ${from}` };
  if (from < to) d.there++; else d.back++;
  doors.set(k, d);
  return true;
}
/** Edges reached with nothing beyond: `room side` and the cell where he was (his column, the row under his feet). */
const edges = new Map<string, string>();
function add(p: Place) {
  const k = keyOf(p);
  if (seen.has(k)) return;
  seen.add(k); queue.push(p);
}
/** At the edge with no room beyond: which sides. */
function atEdge(g: Game, room: number) {
  const nb = neighbours(room), col = g.montyCol - 4, sides: Side[] = [];
  if (col < 0) sides.push('left'); // (into the margin the picture shows either side: a wall there stops him at column 0, the exit grid beyond it)
  if (col > 30) sides.push('right');
  if (g.y <= standY(2)) sides.push('up');
  if (g.y >= standY(20) && [col, col + 1].every((c) => g.flagAt(3 + 19, 4 + c) !== 4)) sides.push('down'); // (out through deadly water or spikes is a death the grace refused, not a way)
  for (const side of sides) if (nb[side] === 0xff && !edges.has(`${room} ${side}`)) edges.set(`${room} ${side}`, `col ${col} row ${((g.y - 0x32) >> 3) - 1}`);
}

function attempt(p: Place, stick: Try) {
  const g0 = p.snap ?? base(p.room);
  if (!g0) return;
  const s: State = { g: copyInto(scratch, g0), col: 0 };
  const g = s.g;
  g.graceActive = () => true;
  if (!p.snap) { g.x2 = p.x2; g.y = p.y; g.falling = 0; g.montyAction = 0; g.arcIdx = 0; g.onRope = p.rope ? 1 : 0; }
  let room = p.room, still = 0, idle = 0, px = g.x2, py = g.y;
  for (let n = 0; n < (PLANE_LEGS.has(p.room) ? 3000 + (PLANE_LEGS.get(p.room) ?? 0) : 700); n++) {
    const held = stick(n, g);
    const wasRow = g.montyRow - 3, wasCol = g.montyCol - 4, wasScripted = Boolean(g.script || g.freeze || g.gameMode);
    frame(s, held);
    const warp = g.roomId !== room && g.dissolvePending !== 0; // (a teleporter: its dissolve holds the game as a death's start does, but it is a way)
    if (dead(g) && !warp && !g.tele.lift) return; // (and the lift up its beam before it: MontyData.teleportLift)
    if (warp) warps.set(`${room}>${g.roomId}`, (warps.get(`${room}>${g.roomId}`) ?? 0) + 1);
    if (g.script || g.freeze || g.gameMode) { still = 0; if (!warp) continue; } // (a scripted move: the plane, the ship; he goes where it takes him)
    if (g.roomId !== room) {
      if (!cellOf(g.roomId)) return;
      if (!wasScripted && !warp && !crossed(room, g.roomId, wasRow, wasCol)) return;
      crossings.set(`${room}>${g.roomId}`, (crossings.get(`${room}>${g.roomId}`) ?? 0) + 1);
      room = g.roomId; still = 0;
      continue;
    }
    atEdge(g, room);
    const moved = g.x2 !== px || g.y !== py;
    px = g.x2; py = g.y;
    still = moved || g.falling || g.montyAction ? 0 : still + 1;
    if ((still >= 4 && held === NONE) || (still >= 8 && !PATIENT.has(stick))) break; // (at rest, or held against a wall or with nothing to climb)
    idle = held === NONE ? idle + 1 : 0;
    if (AFLOAT.has(room) && idle >= 4) break; // (afloat or under the canopy he never rests: the sea lifts him, the canopy sinks; where the stroke left him is the place)
  }
  if (AFLOAT.has(room) || (!g.falling && !g.montyAction)) add({ room, x2: g.x2, y: g.y, rope: g.onRope !== 0, ...(CARRY.has(room) ? { snap: copyGame(g) } : {}) });
}

const t0 = Date.now();
add({ room: WORLD.exitGrid.image[WORLD.start.mapRow * grid.cols + WORLD.start.exitCol] ?? 0, x2: WORLD.start.x2, y: WORLD.start.y, rope: false });
let tries = 0;
while (queue.length) {
  const p = queue.shift();
  if (!p) break;
  for (const t of PLANE_LEGS.has(p.room) ? [RIDE] : AFLOAT.has(p.room) ? (CARRY.has(p.room) ? SWIM_TIMED : SWIM) : CARRY.has(p.room) ? LAND_TIMED : TRIES) { tries++; attempt(p, t); }
}

// ---- the report ----
const reached = new Set([...[...seen].map((k) => Number(k.split(':')[0])), ...[...crossings.keys()].map((k) => Number(k.split('>')[1]))]);
const rooms = [...new Set(Array.from(grid.image).filter((r) => r !== 0xff))];
const unreached = rooms.filter((r) => !reached.has(r));
const oneWay: string[] = [], stale: string[] = [], nowhere: string[] = [], pending: string[] = [], unused: string[] = [];
/** Whether a fault is this test's to judge: not when PENDING names it (then it is reported, with where it shows). */
function judged(k: string, where?: string): boolean {
  const why = PENDING[k];
  if (why === undefined) return true;
  pending.push(`${k} (${where ?? edges.get(k) ?? `${crossings.get(k) ?? 0} tries`}): ${why}`);
  return false;
}
for (const k of crossings.keys()) {
  const [a, b] = k.split('>').map(Number);
  if (a === undefined || b === undefined || !SCOPE.any([a, b])) continue;
  const back = crossings.has(`${b}>${a}`);
  if (!back && !ONE_WAY[k] && judged(k)) oneWay.push(`${k} (${crossings.get(k)} tries go there, none back)`);
}
const roomOf = (opening: string) => Number(opening.split(' ')[0]);
/** A crossing back by some way other than a teleporter (a door, a ride). */
const doorBack = (k: string) => (crossings.get(k) ?? 0) > (warps.get(k) ?? 0);
for (const [k, d] of doors) {
  const [lo, hi] = k.split(' | ');
  if (lo === undefined || hi === undefined || !SCOPE.any([roomOf(lo), roomOf(hi)]) || (d.there && d.back)) continue;
  const [from, to] = d.there ? [lo, hi] : [hi, lo];
  const pair = `${roomOf(from)}>${roomOf(to)}`;
  if (ONE_WAY[pair] && !doorBack(`${roomOf(to)}>${roomOf(from)}`)) continue; // (a drop or a ride: the rooms have no way back at all, or only by a teleport, as ONE_WAY says)
  const key = `${pair} ${from.split(' ').slice(1).join(' ')}`;
  if (judged(key, `${d.there + d.back} tries, ${d.at}`)) oneWay.push(`door ${from} into ${to} (${d.there + d.back} tries, ${d.at}), none back through it`);
}
for (const k of Object.keys(ONE_WAY)) {
  const [a, b] = k.split('>').map(Number);
  if (a === undefined || b === undefined || !SCOPE.any([a, b])) continue;
  if (!crossings.has(k) || doorBack(`${b}>${a}`)) stale.push(`ONE_WAY ${k}: ${crossings.has(k) ? 'goes back now' : 'not crossed'}`);
}
// the openings drawn as ways out: an open run at a side edge, tall enough for him, with a floor under it at the edge
for (const room of rooms) {
  if (!SCOPE.has(room)) continue;
  const g = base(room), nb = neighbours(room);
  if (!g) continue;
  for (const side of ['left', 'right'] as const) {
    for (const [a, b] of runs(room, side)) {
      const inward = side === 'left' ? [0, 1, 2] : [31, 30, 29];
      if (b - a < 2 || b >= 19 || !inward.every((x) => solidAt(g, x, b + 1) && !solidAt(g, x, b))) continue; // (a walkway: a wall's top two wide at the edge is not one)
      const opening = `${room} ${side} ${a}-${b}`, floor = `row ${b + 1}`;
      if (nb[side] === 0xff) { if (!edges.has(`${room} ${side}`) && !NOWHERE[`${room} ${side}`] && judged(`${room} ${side}`, `drawn: the floor at ${floor}, not reached`)) nowhere.push(`${room} ${side} (drawn: the floor at ${floor} runs to the edge, nothing beyond; he does not get there)`); }
      else if (!used.has(opening) && judged(opening, `drawn: the floor at ${floor}, never crossed`)) unused.push(`${opening} into ${nb[side]} (the floor at ${floor}): never crossed either way`);
    }
  }
}
for (const [k, from] of edges) if (SCOPE.has(Number(k.split(' ')[0])) && !NOWHERE[k] && judged(k)) nowhere.push(`${k} (${from})`);
for (const k of Object.keys(NOWHERE)) if (SCOPE.has(Number(k.split(' ')[0])) && !edges.has(k)) stale.push(`NOWHERE ${k}: not reached`);

const shown = new Set([...pending.map((l) => l.split(' (')[0])]);
for (const k of Object.keys(PENDING)) if (SCOPE.has(Number.parseInt(k, 10)) && !shown.has(k)) console.log(`pending ${k} no longer shows: take it off the list`);
if (process.argv.includes('--doors')) for (const [k, d] of doors) if (SCOPE.any(k.split(' | ').map(roomOf))) console.log(`door ${k}: ${d.there} there, ${d.back} back`);
console.log(`${seen.size} places in ${reached.size} rooms, ${tries} tries, ${crossings.size} crossings through ${doors.size} doors, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (const line of [...oneWay.map((l) => `one way: ${l}`), ...unused.map((l) => `door unused: ${l}`), ...nowhere.map((l) => `leads nowhere: ${l}`), ...stale.map((l) => `stale: ${l}`), ...pending.map((l) => `pending: ${l}`)]) console.log(line);
check(`every room is reached from the start (${unreached.length ? `not: ${unreached.join(', ')}` : 'all'})`, unreached.length === 0);
check(`every crossing between rooms goes back too, or is a one-way drop named with its reason (${oneWay.length} one way)`, oneWay.length === 0);
check(`every opening drawn as a way into the next room is crossed (${unused.length} never)`, unused.length === 0);
check(`every edge he gets to leads to a room, or is named with its reason (${nowhere.length} lead nowhere)`, nowhere.length === 0);
check(`the named one-way crossings and dead ends are still so (${stale.length} stale)`, stale.length === 0);
finish();
