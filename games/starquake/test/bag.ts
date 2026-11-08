/**
 * Starquake's bag (bag.ts, ENHANCED's `Game.bag`): BLOB carries any number of things; picking up never drops or swaps one and nothing is ever
 * put down; the panel's four places show the four newest and "+n" the rest; the core puts in every piece he carries, doors, pyramids and
 * barriers look at everything carried; a Cheops trade gives up the least useful thing; the bag is kept with the saves (an older save, which has
 * none, empties it). ORIGINAL (bag off) keeps its four places and its swap.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/bag.ts
 */
import * as Bag from '../src/bag';
import * as Blob from '../src/blob';
import * as Flow from '../src/flow';
import { Game } from '../src/game';
import * as Items from '../src/items';
import { leastUseful, piecesPlaced, rolesOf } from '../src/places';
import { drawRoom } from '../src/room';
import { restore, snapshot } from '../src/save';
import { Screen, cellAt } from '../src/screen';
import * as Specials from '../src/specials';
import { check, finish } from '../../shared/test/check';

/** A game with BLOB in a room; the bag on or off. */
function setUp(bag: boolean) {
  const g = new Game();
  Flow.newGame(g, 424242);
  g.room = 8; drawRoom(g);
  Blob.place(g, 0, 21, 16);
  g.bag = () => bag;
  g.carried.fill(0x80);
  g.stash.length = 0;
  for (const s of g.shown) s.graphic = 0xff;
  return g;
}
/** Put a thing at BLOB's feet and pick it up with up, as a player does. */
function pickUp(g: Game, graphic: number) {
  Items.show(g, graphic, g.col, g.row);
  g.input = 0xfc; g.inputPickup = 0xff;
  Items.touch(g);
}
const lyingAbout = (g: Game) => g.shown.some((s) => !(s.graphic & 0x80));
/** Run a screen's script to its end. */
function finishScript<T>(gen: Generator<void, T, void>, until?: () => boolean): T | undefined {
  for (let n = 0; n < 20000; n++) {
    if (until?.()) return undefined;
    const r = gen.next();
    if (r.done) return r.value;
  }
  throw new Error('a screen that does not end');
}
/** Graphics the core does not want, to carry as filler. */
const unwanted = (g: Game) => [0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20].filter((t) => !g.core.includes(t));

// ---- picking up ----
{
  const g = setUp(true);
  const things = [0x1a, 0x1b, 0x0f, 0x10, 0x0a, 0x1c];
  things.forEach((t) => pickUp(g, t));
  check(`ENHANCED: six things, all carried, newest first (${Bag.all(g).map((c) => c.toString(16))})`, Bag.all(g).join() === [...things].reverse().join());
  check('...the panel\'s four places are the four newest, the stash the other two', g.carried.join() === things.slice(2).reverse().join() && g.stash.join() === [0x1b, 0x1a].join());
  check('...and none was put down in the room', !lyingAbout(g));
  const before = Bag.all(g).join();
  g.input = 0xfc; g.inputPickup = 0xff;
  Items.touch(g);
  check('up on nothing puts nothing down', Bag.all(g).join() === before && !lyingAbout(g));
}
{
  const g = setUp(false);
  [0x1a, 0x1b, 0x0f, 0x10].forEach((t) => pickUp(g, t));
  pickUp(g, 0x0a);
  check(`ORIGINAL: the fifth swaps the oldest into the room (four carried ${g.carried.map((c) => c.toString(16))}, lying: ${lyingAbout(g)})`, g.carried.join() === [0x0a, 0x10, 0x0f, 0x1b].join() && lyingAbout(g) && g.stash.length === 0);
}

// ---- the panel: "+n" ----
{
  const g = setUp(true);
  const s = g.scr, cells = [0, 1, 2].map((i) => cellAt(Bag.MORE.col, Bag.MORE.row) + i);
  const snap = () => cells.map((c) => [...s.bank.slice(Screen.bitmapAt(c), Screen.bitmapAt(c) + 8), s.colour(c)].join());
  Items.drawCarried(g);
  const clean = snap();
  [0x1a, 0x1b, 0x1c, 0x1d].forEach((t) => pickUp(g, t));
  check('four things: no "+n"', g.moreShown === 0 && snap().join() === clean.join());
  pickUp(g, 0x1e); pickUp(g, 0x1f);
  check(`six: "+2" is drawn where the track was (${g.moreShown})`, g.moreShown === 2 && snap().join() !== clean.join());
  pickUp(g, 0x20);
  check('seven: "+3"', g.moreShown === 3);
  const shown = snap();
  const back = snapshot(g), other = setUp(true);
  restore(other, back);
  check('a save keeps the bag, "+n" and what it covers', other.stash.join() === g.stash.join() && other.moreShown === 3 && other.moreBehind.join() === g.moreBehind.join() && snapshot(other).bank.join() === back.bank.join());
  Bag.settle(g, Bag.all(g).slice(0, 4));
  Items.drawCarried(g);
  check('back to four: the track is as it was', g.moreShown === 0 && snap().join() === clean.join() && shown.join() !== clean.join());
  const old = snapshot(setUp(true));
  delete old.fields.stash; delete old.fields.moreShown; delete old.fields.moreBehind;
  const full = setUp(true);
  Bag.settle(full, [1, 2, 3, 4, 5, 6]);
  restore(full, old);
  check('a save from before the bag empties it', full.stash.length === 0 && full.moreShown === 0);
}

// ---- doors, barriers, the core and pyramids see everything carried ----
/** What a door shows, learned from a first run with nothing carried. */
function doorSymbols() {
  const g = setUp(true);
  g.doorRandom = 0x5a;
  const gen = Specials.door(g);
  gen.next();
  return { symbols: g.shown.filter((s) => s.graphic >= 0x0a && s.graphic <= 0x0d).map((s) => s.graphic), doorRandom: g.doorRandom };
}
{
  const { symbols, doorRandom } = doorSymbols();
  const wanted = [...new Set(symbols)];
  const run = (list: number[]) => {
    const g = setUp(true);
    g.doorRandom = doorRandom;
    Bag.settle(g, list);
    return finishScript(Specials.door(g));
  };
  const filler = (g: Game) => unwanted(g).slice(0, 5);
  const f = filler(setUp(true));
  check(`a door (symbols ${symbols.map((s) => s.toString(16))}): the access card in the stash opens it`, run([...f, 0x0f]) === true);
  check('...all its symbols in the stash open it', run([...f, ...wanted]) === true);
  check('...five trade goods alone do not', run(f) === false);
  const g = setUp(true);
  Bag.settle(g, [...f, 0x10]);
  check('a key in the stash opens an upright barrier', Specials.openKeyBarrier(g));
  const h = setUp(true);
  check('...none, it does not', !Specials.openKeyBarrier(h));
}
{
  const g = setUp(true);
  const empties = g.core.filter((c) => !(c & 0x80));
  const [w1, w2] = [empties[0], empties[1]];
  const filler = unwanted(g).slice(0, 4);
  Bag.settle(g, [...filler, w1, w2]);
  const placedBefore = piecesPlaced(g);
  finishScript(Specials.core(g));
  check(`the core: both pieces carried, one in the stash, go in (${piecesPlaced(g) - placedBefore} placed), the rest stay (${Bag.all(g).map((c) => c.toString(16))})`, piecesPlaced(g) === placedBefore + 2 && Bag.all(g).join() === filler.join());
  check('...the places are packed again, nothing missing between them', g.carried.join() === filler.join() && g.stash.length === 0);
}

// ---- a pyramid takes the least useful thing ----
{
  const g = setUp(true);
  const need = g.core.filter((c) => !(c & 0x80));
  const [piece] = need, trade = unwanted(g);
  const sym = [0x0a, 0x0b].find((s) => !need.includes(s)) ?? 0x0a;
  const role = (things: number[]) => rolesOf(g, things).join();
  check(`roles: a wanted piece, the card, the key, a symbol, a trade good (${role([piece, 0x0f, 0x10, sym, trade[0]])})`, role([piece, 0x0f, 0x10, sym, trade[0]]) === 'piece,card,key,symbol,trade');
  check('...a second copy of a wanted piece is a trade good', role([piece, piece]) === 'piece,trade');
  check('least useful: a trade good before anything', leastUseful(g, [piece, 0x0f, trade[0], 0x10, sym]) === trade[0]);
  check('...of two, the older (last in the list)', leastUseful(g, [trade[0], piece, trade[1]]) === trade[1]);
  check('...a symbol before the key, the key before the card, the card before a piece', leastUseful(g, [piece, 0x0f, 0x10, sym]) === sym && leastUseful(g, [piece, 0x0f, 0x10]) === 0x10 && leastUseful(g, [piece, 0x0f]) === 0x0f);
  check('...a spare copy of a symbol goes before the one symbol', leastUseful(g, [sym, 0x0f, sym]) === sym && rolesOf(g, [sym, sym]).join() === 'symbol,symbol');
  check('...nothing carried: nothing', leastUseful(g, []) === undefined);
}
{
  const g = setUp(true);
  const piece = g.core.find((c) => !(c & 0x80)) ?? 0, [t1, t2, t3, t4] = unwanted(g);
  const list = [piece, t1, t2, t3, 0x0f, t4]; // (the card is in the stash; t4, the oldest, is the one to go)
  Bag.settle(g, list);
  g.cheopsOffer = 0x33;
  const gen = Specials.cheops(g);
  finishScript(gen, () => g.asking === 'trade');
  check('a pyramid: the card in the stash opens it, and it asks for the trade', g.asking === 'trade');
  g.key = 0x0b; // (the second of the five)
  finishScript(gen);
  const after = Bag.all(g);
  check(`the trade gives up the oldest trade good, not the card or the piece (${after.map((c) => c.toString(16))})`, after.length === 6 && !after.includes(t4) && after.includes(0x0f) && after[0] === piece);
  check('...and the same number is carried', after.length === 6);
}
finish();
