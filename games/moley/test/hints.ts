/**
 * ENHANCED's sparkles (src/hints.ts), on the rebuilt game alone (no original needed; the game's logic is not touched by them, which
 * test/lockstep.ts and the "unchanged" check below say):
 *
 * - each room's hints in forced states, at the edges: what is marked is exactly what the room's script treats as a puzzle or a way
 *   out, and the game agrees when Monty is put on the mark and a pass is run on a copy (he leaves, or starts the puzzle, or picks
 *   up) and when he is put where nothing is marked (he dies, or nothing happens). A mark never sits on something that kills when
 *   touched, and nothing leaves, starts or picks up without a mark;
 * - the passes in which a mark appears and goes: the exit cassette's three passes on the floor, room 1's twelve, room 4's open
 *   window, room 2's spot until the puzzle starts and the prize's last picture;
 * - the whole game played by the bot (test/players.ts): the hints equal an oracle written from the room notes, pass by pass, and
 *   everything the bot needed (each exit, the spot, each pile and delivery, each lane's end) was marked the pass before it did it;
 * - broad: random play in every room, only the hints each room may have, at most one, inside the picture;
 * - hints read the game and change nothing: two games fed the same keys, one asked for its hints every pass, are the same game;
 * - the view puts them on the renderer's sparkles in the surface's pixels (`MoleyView.sparkle`); the front end shows them in ENHANCED
 *   only (test/frontend.ts).
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/hints.ts
 */
import { PixelRenderer } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { Spectrum, keyPosition } from '../../../tools/zx/spectrum';
import { BLANK_FRAME } from '../src/data';
import { Display } from '../src/display';
import { Game } from '../src/game';
import { CAR_PAST, hintsOf, LANE_END, PRIZE_LAST, SPOT, type Hint, type HintKind } from '../src/hints';
import { bitsOf, KEYBOARD_KEYS, readKeys } from '../src/input';
import { Key } from '../src/monty';
import { SeededRandom } from '../src/random';
import { MoleyView, PICTURE_LEFT, PICTURE_TOP, SPARKLE_GAIN, SPARKLE_SIZE } from '../src/view';
import { writeStills } from './hints-shots';
import { Player } from './players';

// ---- helpers ------------------------------------------------------------------------------------------------------

/** A game at a room's start, its first pass done (so the room's things are in place). */
function atRoom(room: number, seed = 1): Game {
  const game = new Game(new SeededRandom(seed));
  game.travel(room);
  game.pass(0);
  return game;
}

const text = (hints: readonly Hint[]): string => hints.map((h) => `${h.kind}@${h.x},${h.y}`).join(' ');
const kinds = (hints: readonly Hint[]): HintKind[] => hints.map((h) => h.kind);

/** What putting Monty with his corner at x, y and running one pass does, on a copy of the game. */
type Touch = 'left' | 'died' | 'stayed';
interface Touched { readonly outcome: Touch; readonly sim: Game }
function touch(game: Game, x: number, y: number): Touched {
  const sim = new Game(new SeededRandom(99), false);
  sim.restore(game.snapshot());
  sim.monty.x = x;
  sim.monty.y = y;
  sim.monty.state = 0;
  sim.monty.phase = 0;
  const room = sim.room, lives = sim.lives;
  sim.pass(0);
  const outcome: Touch = sim.lives < lives ? 'died' : sim.room !== room ? 'left' : 'stayed';
  return { outcome, sim };
}
/** Monty put on a hint (his 16 x 16 box centred on it). */
const touchHint = (game: Game, h: Hint): Touched => touch(game, h.x - 8, h.y - 8);

/** Run passes with nobody home (Monty parked, the gauge full), calling `each` before each with the game as it then is. */
function idle(game: Game, passes: number, each: (pass: number) => void, park: { x: number; y: number }): void {
  for (let i = 0; i < passes; i++) {
    each(i);
    game.gauge.refill();
    game.monty.x = park.x;
    game.monty.y = park.y;
    game.monty.state = 0;
    game.monty.phase = 0;
    game.pass(0);
  }
}

// ---- before a room's things are placed, and when the game is over --------------------------------------------------------
{
  let early = 0, others = 0;
  for (let room = 0; room < 6; room++) {
    const game = new Game(new SeededRandom(3));
    game.travel(room);
    early += hintsOf(game).length;
    game.pass(0);
    others++;
  }
  check(`no sparkles in the pass a room is entered, before its script has placed anything (${others} rooms, ${early} found)`, early === 0 && others === 6);
  const over = atRoom(0);
  over.items.left = 0;
  const shown = hintsOf(over).length;
  over.lives = -1;
  check('and none when the game is over', shown === 1 && hintsOf(over).length === 0);
}

// ---- room 0: the exit cassette -----------------------------------------------------------------------------------------
{
  const g = atRoom(0);
  check(`room 0, items left: no sparkle (7 items, ${g.itemsLeft} left; ${text(hintsOf(g)) || 'none'})`, g.itemsLeft === 7 && hintsOf(g).length === 0);
  g.items.left = 0;
  const c = g.entities[6];
  const h = hintsOf(g);
  check(`room 0, none left, the cassette hanging (x ${c.x.toString(16)}, y ${c.y.toString(16)}): a sparkle on it (${text(h)})`, h.length === 1 && h[0].kind === 'exit' && h[0].x === c.x + 8 && h[0].y === c.y + 8);
  check('touching it up there does nothing', touchHint(g, h[0]).outcome === 'stayed');
  // let it fall: placed at the foot of its fall, the hint through the floor's passes, the touch at each
  const f = atRoom(0);
  f.items.left = 0;
  f.entities[6].x = 0xd8;
  f.entities[6].y = 0x70;
  const log: string[] = [];
  let left = 0, onFloor = 0, badMark = 0, unmarkedLeave = 0, markedKill = 0, goneKills = 0;
  idle(f, 12, () => {
    const hints = hintsOf(f);
    const c6 = f.entities[6];
    const t = hints.length > 0 ? touchHint(f, hints[0]) : touch(f, c6.x, c6.y);
    const wantMark = c6.frame !== BLANK_FRAME;
    if (hints.length !== (wantMark ? 1 : 0)) badMark++;
    if (c6.y === 0x78 && c6.frame !== BLANK_FRAME) onFloor++;
    if (t.outcome === 'left') { left++; if (hints.length === 0) unmarkedLeave++; }
    if (t.outcome === 'died' && hints.length > 0) markedKill++;
    if (t.outcome === 'died' && c6.frame === BLANK_FRAME) goneKills++;
    log.push(`${c6.y.toString(16)}/${c6.frame.toString(16)}${hints.length > 0 ? '*' : ''}:${t.outcome}`);
  }, { x: 0x04, y: 0x78 });
  console.log(`   room 0, the fall: ${log.join(' ')}`);
  check(`room 0: marked exactly while the cassette shows (no mismatch: ${badMark}), it leaves 3 passes on the floor (${left}, ${onFloor} on the floor), never unmarked (${unmarkedLeave}), never kills a marked touch (${markedKill}); once it is gone touching it kills (${goneKills})`,
    badMark === 0 && left === 3 && unmarkedLeave === 0 && markedKill === 0 && goneKills >= 1);
  // an item left: on the floor it kills, and is not marked
  const k = atRoom(0);
  k.items.left = 1;
  k.entities[6].x = 0xd8;
  k.entities[6].y = 0x78;
  const t = touch(k, 0xd8, 0x78);
  check(`room 0, an item left, the cassette on the floor: no sparkle, and touching it kills (${t.outcome})`, hintsOf(k).length === 0 && t.outcome === 'died');
}

// ---- room 1: the exit object ---------------------------------------------------------------------------------------------
{
  const run = (itemsLeft: number) => {
    const g = atRoom(1);
    g.items.left = itemsLeft;
    g.rooms.r1.stage = 0x63; // (the last pass of the spinning reels is next, then the exit object comes in)
    const marked: number[] = [];
    let leaves = 0, unmarkedLeave = 0, markedKill = 0, marks = 0, wrong = 0, sawY = '';
    idle(g, 120, (i) => {
      const o = g.entities[2];
      const stage = g.rooms.r1.stage;
      const hints = hintsOf(g);
      const expect = itemsLeft === 0 && stage === 0x64 && o.y < 0x50;
      if (hints.length !== (expect ? 1 : 0)) wrong++;
      if (hints.length > 0) { marks++; marked.push(i); if (hints[0].x !== o.x + 8 || hints[0].y !== o.y + 8) wrong++; }
      if (stage === 0x64) {
        const t = hints.length > 0 ? touchHint(g, hints[0]) : touch(g, o.x, o.y);
        if (t.outcome === 'left') { leaves++; if (hints.length === 0) unmarkedLeave++; }
        if (t.outcome === 'died' && hints.length > 0) markedKill++;
        if (t.outcome === 'left' && sawY === '') sawY = o.y.toString(16);
      }
    }, { x: 0xee, y: 0x78 });
    return { marks, leaves, unmarkedLeave, markedKill, wrong, first: marked[0], last: marked[marked.length - 1], sawY, lives: g.lives };
  };
  const none = run(0);
  console.log(`   room 1, none left: marked ${none.marks} passes (${none.first} to ${none.last}), leaving possible in ${none.leaves}, first at y ${none.sawY}; wrong ${none.wrong}, unmarked leaves ${none.unmarkedLeave}, marked kills ${none.markedKill}, lives ${none.lives}`);
  check(`room 1, none left: the exit object marked from when it comes in until it sinks to where it kills (${none.marks} passes); touching it leaves in 12 passes (y $38 to $4E), all marked, none marked kills, and left alone it kills (a life lost) as soon as it is not marked`,
    none.wrong === 0 && none.marks > 60 && none.leaves === 12 && none.unmarkedLeave === 0 && none.markedKill === 0 && none.lives === 4);
  const some = run(1);
  check(`room 1, an item left: never marked (${some.marks}), and never the way out (${some.leaves})`, some.wrong === 0 && some.marks === 0 && some.leaves === 0);
}

// ---- room 2: the spot and the prize --------------------------------------------------------------------------------------
{
  const g = atRoom(2);
  const h = hintsOf(g);
  check(`room 2, puzzle not started: a sparkle on the spot (${text(h)})`, h.length === 1 && h[0].kind === 'spot' && h[0].x === SPOT.x + 8 && h[0].y === SPOT.y + 8);
  const on = touch(g, SPOT.x, SPOT.y);
  check(`Monty on the spot starts the puzzle (counter ${on.sim.rooms.r2.puzzle})`, on.sim.rooms.r2.puzzle !== 0 && on.outcome === 'stayed');
  const off = [[SPOT.x - 2, SPOT.y], [SPOT.x + 2, SPOT.y], [SPOT.x, SPOT.y - 1], [SPOT.x, SPOT.y + 8]].map(([x, y]) => touch(g, x, y).sim.rooms.r2.puzzle);
  check(`a step either side, or off the ledge, does not (${off.join(',')}): the spot is the exact one the sparkle marks`, off.every((p) => p === 0));
  // the puzzle started: the spot is no longer marked, and nothing is until the prize shows its last picture
  const p = atRoom(2);
  p.monty.x = SPOT.x;
  p.monty.y = SPOT.y;
  p.pass(0);
  check('the puzzle running: the spot is not marked', p.rooms.r2.puzzle !== 0 && hintsOf(p).length === 0);
  // the prize: its halves at x $DC, y $70 (first) and $60 (second), the second one's picture by picture
  const sequence: [number, number][] = [[BLANK_FRAME, BLANK_FRAME], [0x21, BLANK_FRAME], [0x22, BLANK_FRAME], [0x23, BLANK_FRAME], [0x24, BLANK_FRAME], [0x24, 0x21], [0x24, 0x22], [0x24, 0x23], [0x24, PRIZE_LAST]];
  const rows: string[] = [];
  let marked = 0, kills = 0, leaves = 0, wrong = 0;
  for (const [a, b] of sequence) {
    const q = atRoom(2);
    q.rooms.r2.puzzle = 1;
    const [first, second] = [q.entities[4], q.entities[5]];
    first.x = 0xdc; first.y = 0x70; first.frame = a;
    second.x = 0xdc; second.y = 0x60; second.frame = b;
    const hints = hintsOf(q);
    const shows = a !== BLANK_FRAME || b !== BLANK_FRAME;
    const t = touch(q, 0xdc, 0x68);
    rows.push(`${a === BLANK_FRAME ? '-' : a.toString(16)}/${b === BLANK_FRAME ? '-' : b.toString(16)}:${hints.length > 0 ? '*' : ''}${t.outcome}`);
    if (hints.length > 0) { marked++; if (hints[0].kind !== 'prize' || hints[0].x !== 0xdc + 8 || hints[0].y !== 0x70) wrong++; }
    if (hints.length > 0 !== (b === PRIZE_LAST)) wrong++;
    if (t.outcome === 'left') { leaves++; if (hints.length === 0) wrong++; }
    if (t.outcome === 'died' && hints.length > 0) wrong++;
    if (shows && b !== PRIZE_LAST && t.outcome === 'died') kills++;
  }
  console.log(`   room 2, the prize (first half/second half): ${rows.join(' ')}`);
  check(`room 2, the prize: marked only when its second half shows the last picture ($24), where touching leaves (+400); the pictures before it kill (${kills} of 7), and are not marked (${marked} marked)`, wrong === 0 && marked === 1 && leaves === 1 && kills === 7);
  // and a death in the room starts the puzzle's mark again
  const d = atRoom(2);
  d.rooms.r2.puzzle = 5;
  d.monty.x = 0x70;
  d.monty.y = 0x78; // (into the pit)
  d.pass(0);
  check(`a death in room 2 sends Monty back and the spot is marked again (puzzle ${d.rooms.r2.puzzle}, ${text(hintsOf(d))})`, d.rooms.r2.puzzle === 0 && kinds(hintsOf(d)).join() === 'spot');
}

// ---- room 3: the lanes ---------------------------------------------------------------------------------------------------
{
  const rows: [number, number, HintKind][] = [[0x08, 0x08, 'lane'], [0x20, 0x40, 'lane'], [0x40, 0x40, 'lane'], [0x78, 0x78, 'exit']];
  let right = 0;
  const log: string[] = [];
  for (const [y, row, kind] of rows) {
    const g = atRoom(3);
    g.monty.y = y;
    const h = hintsOf(g);
    const t = touch(g, LANE_END, y);
    const goes = kind === 'exit' ? t.outcome === 'left' && t.sim.room === 4 : t.outcome === 'stayed' && t.sim.monty.x === 6 && t.sim.monty.y === (y < 0x09 ? 0x40 : 0x78);
    log.push(`y ${y.toString(16)}: ${text(h)} -> ${t.outcome} ${t.sim.room}/${t.sim.monty.x},${t.sim.monty.y.toString(16)}`);
    if (h.length === 1 && h[0].kind === kind && h[0].x === LANE_END + 8 && h[0].y === row + 8 && goes) right++;
  }
  console.log(`   room 3: ${log.join('; ')}`);
  check(`room 3: the right end of the lane he is on is marked, and going off it there leads on (top and middle lanes to the next lane, the bottom to room 4): ${right} of 4`, right === 4);
}

// ---- room 3: the parked car's way past -----------------------------------------------------------------------------------------
{
  const probeAt = (g: Game, x: number): Touched => touch(g, x, 0x78);
  const bottom = (sleep: number, waking: number, x: number): Game => {
    const g = atRoom(3);
    g.monty.x = x;
    g.monty.y = 0x78;
    g.rooms.r3.sleep = sleep;
    g.rooms.r3.waking = waking;
    return g;
  };
  const has = (g: Game): boolean => kinds(hintsOf(g)).includes('past');
  const armed = bottom(0, 0, 0x40);
  const asleep = bottom(50, 0, 0x40);
  const waking = bottom(0, 5, 0x40);
  const past = bottom(50, 0, CAR_PAST);
  const top = atRoom(3);
  top.rooms.r3.sleep = 50;
  const armedTouch = probeAt(armed, 0x94), sleepTouch = probeAt(asleep, 0x94);
  check(`room 3, the parked car armed (not asleep, not waking): no way-past sparkle (${text(hintsOf(armed))}), and being by it wakes it (${armedTouch.sim.rooms.r3.waking})`, !has(armed) && armedTouch.sim.rooms.r3.waking === 1);
  check(`asleep, Monty short of it on the bottom lane: a sparkle just right of the car (${text(hintsOf(asleep))}), and being by it does nothing (${sleepTouch.sim.rooms.r3.waking}, ${sleepTouch.outcome})`,
    has(asleep) && hintsOf(asleep)[0].x === CAR_PAST + 8 && sleepTouch.sim.rooms.r3.waking === 0 && sleepTouch.outcome === 'stayed');
  check('none while it is waking, none once he is past it, none on another lane', !has(waking) && !has(past) && !has(top));
  // the whole of it, played: Monty stands at the edge of its trigger (x $8C, not in its jaws), it wakes, finishes, sleeps; the sparkle is there exactly while it sleeps
  const g = atRoom(3);
  g.rooms.r3.sleep = 0;
  let marked = 0, wrong = 0, wokenByProbe = 0, woken = 0, sleptFor = 0;
  idle(g, 400, () => {
    const on = has(g);
    const r3 = g.rooms.r3;
    if (on !== (r3.waking === 0 && r3.sleep !== 0)) wrong++;
    if (on) { marked++; if (probeAt(g, 0x94).sim.rooms.r3.waking !== 0) wokenByProbe++; }
    if (!on && r3.waking === 0 && probeAt(g, 0x94).sim.rooms.r3.waking === 1) woken++;
    if (!on && r3.waking !== 0) sleptFor++;
  }, { x: 0x8c, y: 0x78 });
  console.log(`   room 3, the parked car played: marked ${marked} passes, armed-and-wakeable ${woken}, waking ${sleptFor}`);
  check(`room 3: while the car sleeps the way past is marked and being by it never wakes it (${marked} passes, ${wokenByProbe} woken); whenever it is not marked and not waking, being by it wakes it (${woken}); marks match the car's own state (${wrong} off)`,
    wrong === 0 && marked > 100 && wokenByProbe === 0 && woken >= 1 && g.lives === 5);
}

// ---- room 4: the exit while it is open ----------------------------------------------------------------------------------------
{
  const run = (itemsLeft: number) => {
    const g = atRoom(4);
    g.items.left = itemsLeft;
    let marks = 0, leaves = 0, unmarkedLeave = 0, markedKill = 0, wrong = 0, openFor = 0, died = 0, markedBefore = 0;
    let first = -1, last = -1;
    const lives = g.lives;
    // (the staircase collapses on its own; the exit opens for 100 passes and then kills)
    idle(g, 380, (i) => {
      const open = g.rooms.r4.open;
      const hints = hintsOf(g);
      if (open !== 0) openFor++;
      const expect = itemsLeft === 0 && open >= 2;
      if (hints.length !== (expect ? 1 : 0)) wrong++;
      if (hints.length > 0) { marks++; if (first < 0) first = i; last = i; markedBefore++; }
      const exit = g.entities[3];
      if (open !== 0 || hints.length > 0) {
        const t = hints.length > 0 ? touchHint(g, hints[0]) : touch(g, exit.x, exit.y);
        if (t.outcome === 'left') { leaves++; if (hints.length === 0) unmarkedLeave++; }
        if (t.outcome === 'died' && hints.length > 0) markedKill++;
        if (t.outcome === 'died') died++;
      }
    }, { x: 0xee, y: 0x78 });
    return { marks, leaves, unmarkedLeave, markedKill, wrong, openFor, died, first, last, lives: g.lives - lives };
  };
  const a = run(0);
  console.log(`   room 4, none left: open ${a.openFor} passes, marked ${a.marks} (passes ${a.first} to ${a.last})`);
  check(`room 4, none left: marked while the exit is open (${a.marks} of its ${a.openFor} passes, not the last), touching leaves in each, none marked kills`, a.wrong === 0 && a.marks === 99 && a.openFor === 100 && a.leaves === 99 && a.unmarkedLeave === 0 && a.markedKill === 0);
  const b = run(2);
  check(`room 4, items left: the open exit is not marked (${b.marks}) and touching it kills (${b.died} passes)`, b.wrong === 0 && b.marks === 0 && b.leaves === 0 && b.openFor >= 99 && b.died >= 99);
}

// ---- room 5: the pile and the shop -----------------------------------------------------------------------------------------
{
  const g = atRoom(5);
  const [, , , , , , pile, shop] = g.entities;
  const empty = hintsOf(g);
  check(`room 5, empty-handed: a sparkle on the pile (${text(empty)})`, empty.length === 1 && empty[0].kind === 'pile' && empty[0].x === pile.x + 8 && empty[0].y === pile.y + 8);
  const atPile = touchHint(g, empty[0]);
  const atShop = touch(g, shop.x, shop.y);
  check(`on the pile he picks up (carrying ${atPile.sim.rooms.r5.carrying}); at the shop empty-handed nothing happens (${atShop.sim.rooms.r5.carrying}, shop picture ${atShop.sim.entities[7].frame.toString(16)})`, atPile.sim.rooms.r5.carrying === 1 && atShop.sim.rooms.r5.carrying === 0 && atShop.sim.entities[7].frame === BLANK_FRAME);
  g.rooms.r5.carrying = 1;
  const full = hintsOf(g);
  check(`room 5, carrying a paper: a sparkle on the shop (${text(full)})`, full.length === 1 && full[0].kind === 'shop' && full[0].x === shop.x + 8 && full[0].y === shop.y + 8);
  const delivered = touchHint(g, full[0]);
  const again = touch(g, pile.x, pile.y);
  check(`at the shop he delivers (carrying ${delivered.sim.rooms.r5.carrying}, shop picture ${delivered.sim.entities[7].frame.toString(16)}); at the pile loaded nothing happens (${again.sim.rooms.r5.carrying}, pile ${again.sim.entities[6].frame.toString(16)})`,
    delivered.sim.rooms.r5.carrying === 0 && delivered.sim.entities[7].frame !== BLANK_FRAME && again.sim.rooms.r5.carrying === 1 && again.sim.entities[6].frame === pile.frame);
  // after the fourth delivery the game is over: no sparkle
  g.rooms.r5.carrying = 1;
  shop.frame = 0x27;
  g.pass(0);
  const t = touch(g, shop.x, shop.y);
  check(`the last delivery ends the game (${t.sim.ended}), and then there is nothing to mark`, t.sim.ended && hintsOf(t.sim).length === 0);
}

// ---- the whole game, played by the bot -------------------------------------------------------------------------------------
/** The hints as the room notes say, from the raw numbers (the oracle the hints are compared with). */
function oracle(g: Game): string[] {
  if (g.first || g.lives < 0 || g.ended) return [];
  const e = g.entities, none = g.items.left === 0;
  const at = (kind: string, x: number, y: number): string => `${kind}@${x + 8},${y + 8}`;
  switch (g.room) {
    case 0: return none && e[6].frame !== BLANK_FRAME ? [at('exit', e[6].x, e[6].y)] : [];
    case 1: return none && g.rooms.r1.stage === 100 && e[2].y < 80 ? [at('exit', e[2].x, e[2].y)] : [];
    case 2: return g.rooms.r2.puzzle === 0 ? [at('spot', 46, 56)] : e[5].frame === 36 ? [at('prize', 220, 104)] : [];
    case 3: {
      const y = g.monty.y;
      if (y < 9) return [at('lane', 236, 8)];
      if (y < 65) return [at('lane', 236, 64)];
      const asleep = g.rooms.r3.waking === 0 && g.rooms.r3.sleep > 0 && g.monty.x < 156;
      return asleep ? [at('past', 156, 120), at('exit', 236, 120)] : [at('exit', 236, 120)];
    }
    case 4: return none && g.rooms.r4.open > 1 ? [at('exit', e[3].x, e[3].y)] : [];
    case 5: return g.rooms.r5.carrying === 0 ? [at('pile', e[6].x, e[6].y)] : [at('shop', e[7].x, e[7].y)];
    default: return [];
  }
}
const asText = (hints: readonly Hint[]): string[] => hints.map((h) => `${h.kind}@${h.x},${h.y}`);

/** The keys a Spectrum with nothing pressed but what the bot pressed gives a pass. */
const keysOf = (m: Spectrum): number => {
  const down = (name: string): boolean => {
    const pos = keyPosition(name);
    return pos !== null && (m.keys[pos.row] & (1 << pos.bit)) === 0;
  };
  return readKeys({ keyboard: bitsOf(KEYBOARD_KEYS, down), kempston: null, sinclair: 0 });
};

{
  const g = new Game(new SeededRandom(7));
  const m = new Spectrum(new Uint8Array(0x4000));
  const player = new Player();
  const seen = new Map<string, number>();
  const needed = new Map<string, number>();
  const missing: string[] = [];
  let compared = 0, differing = 0, over = 1, first = '';
  let ended = false;
  const need = (what: string, hints: readonly Hint[], wanted: HintKind): void => {
    needed.set(what, (needed.get(what) ?? 0) + 1);
    if (!hints.some((h) => h.kind === wanted)) missing.push(`${what} (pass ${g.counter}, ${text(hints) || 'no sparkle'})`);
  };
  for (let n = 0; n < 16000 && !ended; n++) {
    player.choose(m, g);
    const keys = keysOf(m);
    const hints = hintsOf(g);
    compared++;
    const want = oracle(g);
    const got = asText(hints);
    if (want.join() !== got.join()) { differing++; if (first === '') first = `pass ${n} room ${g.room}: ${got.join(',')} != ${want.join(',')}`; }
    for (const h of hints) seen.set(`${g.room} ${h.kind}`, (seen.get(`${g.room} ${h.kind}`) ?? 0) + 1);
    const before = { room: g.room, lives: g.lives, puzzle: g.rooms.r2.puzzle, carrying: g.rooms.r5.carrying, x: g.monty.x, y: g.monty.y };
    const outcome = g.pass(keys);
    const lost = g.lives < before.lives;
    if (g.lives < 2) { g.lives = 5; over++; } // (the bot may lose a few; this is a test of the hints, not of the bot)
    if (lost) continue;
    // nothing was lost: a way out, a start, a pickup or a delivery was marked the pass before
    if (before.room === 2 && g.room === 3) need('leaving room 2 by the prize', hints, 'prize');
    else if (before.room === 3 && g.room === 4) need('leaving room 3 by the bottom lane', hints, 'exit');
    else if (g.room === before.room + 1) need(`leaving room ${before.room}`, hints, 'exit');
    else if (before.room === 2 && before.puzzle === 0 && g.rooms.r2.puzzle !== 0) need('starting the puzzle', hints, 'spot');
    else if (before.room === 3 && g.room === 3 && g.monty.x === 6 && before.x > 0xe0) need('going on to the next lane', hints, 'lane');
    else if (before.room === 5 && g.room === 5 && before.carrying === 0 && g.rooms.r5.carrying === 1) need('taking a paper', hints, 'pile');
    else if (before.room === 5 && g.room === 5 && before.carrying === 1 && g.rooms.r5.carrying === 0) need('delivering a paper', hints, 'shop');
    if (outcome === 'ended') ended = true;
  }
  console.log(`   the bot's game: ${compared} passes, the game ${ended ? 'ended' : 'did not end'}; hints seen ${[...seen].map(([k, v]) => `${k} x${v}`).join(', ')}`);
  console.log(`   needed and marked: ${[...needed].map(([k, v]) => `${k} x${v}`).join(', ')}`);
  check(`the bot's whole game (${compared} passes, ${over - 1} lives topped up): the hints equal the oracle on every pass${first === '' ? '' : ` (${first})`}`, ended && differing === 0);
  check(`everything the bot needed was marked the pass before: ${[...needed.values()].reduce((a, b) => a + b, 0)} times${missing.length === 0 ? '' : ` (missing: ${missing.slice(0, 4).join('; ')})`}`, missing.length === 0 && needed.size === 9);
  const wanted = ['0 exit', '1 exit', '2 spot', '2 prize', '3 lane', '3 exit', '3 past', '4 exit', '5 pile', '5 shop'];
  check(`and every kind of hint was seen in the game: ${wanted.filter((k) => !seen.has(k)).join(', ') || 'all of them'}`, wanted.every((k) => seen.has(k)));
}

// ---- random play in every room ----------------------------------------------------------------------------------------------
{
  const ALLOWED: readonly (readonly HintKind[])[] = [['exit'], ['exit'], ['spot', 'prize'], ['lane', 'exit', 'past'], ['exit'], ['pile', 'shop']];
  let passes = 0, bad = 0, many = 0, outside = 0, off = 0;
  let state = 12345;
  const rnd = (): number => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  for (let room = 0; room < 6; room++) {
    for (let life = 0; life < 6; life++) {
      const g = new Game(new SeededRandom(room * 10 + life));
      g.travel(room);
      let keys = 0;
      for (let i = 0; i < 700; i++) {
        if (i % 6 === 0) keys = [0, Key.right, Key.left, Key.up, Key.down, Key.jump, Key.jump | Key.right, Key.jump | Key.left][Math.floor(rnd() * 8)] ?? 0;
        if (g.lives < 2) g.lives = 5;
        // (a quarter of the lives, the items are all taken at once, to open the exits)
        if (life % 2 === 1 && i === 5) g.items.left = 0;
        const room0 = g.room;
        g.pass(keys);
        passes++;
        const hints = hintsOf(g);
        if (g.room !== room0) continue;
        if (hints.length > (g.room === 3 ? 2 : 1)) many++;
        if (hints.some((h) => !(ALLOWED[g.room] ?? []).includes(h.kind))) bad++;
        if (hints.some((h) => h.x < 0 || h.x >= 256 || h.y < 0 || h.y >= 192)) outside++;
        if (asText(hints).join() !== oracle(g).join()) off++;
      }
    }
  }
  check(`random play in each room (${passes} passes): at most one hint (two in room 3), only the kinds the room has (${bad} wrong), inside the picture (${outside} outside), equal to the oracle (${off} differ), ${many} with more than one`, bad === 0 && many === 0 && outside === 0 && off === 0);
}

// ---- hints change nothing ---------------------------------------------------------------------------------------------------------
{
  let passes = 0, differing = 0;
  for (let room = 0; room < 6; room++) {
    const a = new Game(new SeededRandom(40 + room));
    const b = new Game(new SeededRandom(40 + room));
    a.travel(room);
    b.travel(room);
    let state = 777 + room;
    const rnd = (): number => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    for (let i = 0; i < 1200; i++) {
      const keys = [0, Key.right, Key.left, Key.up, Key.jump | Key.right][Math.floor(rnd() * 5)] ?? 0;
      if (a.lives < 2) { a.lives = 5; b.lives = 5; }
      hintsOf(a);
      a.pass(keys);
      b.pass(keys);
      passes++;
      const sa = a.snapshot(), sb = b.snapshot();
      if (sa.numbers.join() !== sb.numbers.join() || sa.map.join() !== sb.map.join() || sa.attrs.join() !== sb.attrs.join()) differing++;
    }
  }
  check(`asking for the hints every pass changes nothing: two games fed the same keys are the same game (${passes} passes in the six rooms, ${differing} differences)`, passes === 7200 && differing === 0);
}

// ---- the view -----------------------------------------------------------------------------------------------------------------------
{
  const game = atRoom(2);
  const renderer = new PixelRenderer();
  const view = new MoleyView(renderer, new Display(game));
  const hints = hintsOf(game);
  view.sparkle(hints);
  const marks = renderer.sparkles.markers;
  check(`the view puts the hint on the sparkles in the surface's pixels (${marks.map((p) => `${p.x},${p.y}`).join(' ')})`, marks.length === 1 && marks[0].x === PICTURE_LEFT + hints[0].x && marks[0].y === PICTURE_TOP + hints[0].y && marks[0].size === SPARKLE_SIZE && marks[0].gain === SPARKLE_GAIN);
  view.sparkle([]);
  check('and none puts none', renderer.sparkles.markers.length === 0);
}

// ---- stills (with an out-dir) -----------------------------------------------------------------------------------------------------
if (process.argv[2] !== undefined) console.log(`   ${writeStills(process.argv[2])} stills in ${process.argv[2]}`);

finish();
