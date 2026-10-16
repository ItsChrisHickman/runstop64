/**
 * Blackwyche's GUIDED assist (ENHANCED): Pendragon's narration on the status line and the sparkles
 * (src/guided.ts, src/guided-lines.ts; games/shared/native/narrate.ts), headless, through the front
 * end as the browser runs it (run(host): the keyboard, the frame loop, the render).
 *
 *  1. the words: every line is in the game's lettering, shown in parts that fit its line, balanced;
 *  2. the story, room by room: travel (src/travel.ts `go`) to each puzzle room with the flags set as
 *     the game sets them, launch from that save, and the right line is on the status line (the
 *     screen's text read back), after the game's own "YOU HAVE FOUND ..." message and never over it;
 *  3. taken by playing, with the keyboard (X sword, Z jump, the arrows): the shelf's piece, the bell,
 *     the book, the mirror (and used after 128 frames), the captain's blow, a trapdoor giving way;
 *  4. the sparkles: for every thing, in its room, on its sprite when the game would give it, and
 *     not before what the game asks for first is in hand, nor once it is taken;
 *  5. the next thing to get (NEXT:) after 20 seconds with nothing to do, and a walk through the whole
 *     chain of things with each next one something the game gives;
 *  6. ORIGINAL shows none of it, and the switch puts the game's own line back.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/guided.ts [out-dir]
 *
 * With an out-dir: stills of the status line with a line showing (and the sparkles, ringed).
 */
import fs from 'node:fs';
import { clean, partsOf, sentences, wrap } from '../../shared/native/narrate';
import { ITEMS } from '../src/items';
import { FLAG, IDLE_FRAMES, STATUS, THINGS, deckOf, guidedSpots, hereNow, nextThing, roomOf, spriteSpot } from '../src/guided';
import { LINES, type Say } from '../src/guided-lines';
import { HALLS } from '../src/ship';
import { SEARCHING, Session, saveAt, type Where } from './guided-kit';
import { check, finish } from '../../shared/test/check';

const outDir = process.argv[2];
/** A check made of parts: when it fails, which parts did, and what the status line said (the last of it). */
const verdict = (what: string, parts: Record<string, boolean>, ...sessions: Session[]) => {
  const bad = Object.entries(parts).filter(([, ok]) => !ok).map(([k]) => k);
  const covered = sessions.reduce((n, s) => n + s.covered, 0);
  check(`${what}${bad.length ? ` (failed: ${bad.join(', ')})` : ''}${covered ? ` (the game's own message covered ${covered} frames)` : ''}`, bad.length === 0 && covered === 0);
  if (bad.length) for (const s of sessions) console.log(`     status line: ${s.trace.slice(-8).map((t) => `${t.at}:${t.text}`).join(' | ')}`);
};
const still = (name: string) => `${outDir}/guided-${name}.png`;
if (outDir) fs.mkdirSync(outDir, { recursive: true });

/** A line's texts, and the parts they are shown in. */
const texts = (say: Say) => (typeof say === 'string' ? [say] : [...say]);
const partsOf2 = (say: Say) => texts(say).flatMap((t) => partsOf(t, STATUS));
/** Whether the status line says all of it, part after part, in order (each within `within` frames of the last). */
const says = (s: Session, say: Say, within = 900) => partsOf2(say).every((p) => s.until(p, within));
/** What the game does on taking a thing: its found flag, and the number of its name for the status line ($342F). */
const took = (s: Session, flag: number, value = 1) => {
  const item = ITEMS.find((i) => i.flag === flag);
  s.tick(2); // (a frame or two for the guide to have seen how things stand)
  s.ram[flag] = value;
  if (item) s.ram[0x342f] = item.name + 1;
};
/** The sparkles are on exactly these sprites: one on each, inside the sprite's box as the VIC has it. */
const sparkleAt = (s: Session, sprites: number[]) => {
  const want = sprites.map((n) => spriteSpot(s.ram, s.vic, n));
  const inBox = (n: number, m: { x: number; y: number }) => {
    const bit = 1 << n, v = s.vic;
    const left = (v[n * 2] | (v[0x10] & bit ? 256 : 0)) - 24, top = v[n * 2 + 1] - 50, w = (v[0x1d] & bit ? 48 : 24), h = (v[0x17] & bit ? 42 : 21);
    return m.x >= left && m.x < left + w && m.y >= top && m.y < top + h;
  };
  return want.every((w) => w !== null) && s.sparkles.length === want.length
    && sprites.every((n, i) => want[i] !== null && s.sparkles.some((m) => m.x === want[i]?.x && m.y === want[i]?.y) && s.sparkles.some((m) => inBox(n, m)));
};

// ---------------------------------------------------------------- 1. the words
{
  const everything: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === 'string') everything.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (typeof v === 'object' && v !== null) Object.values(v).forEach(collect);
  };
  collect(LINES);
  const lettering = (t: string) => [...t].every((ch) => ch === ' ' || ch === '.' || ch === ',' || STATUS.code(ch) !== null);
  check(`${everything.length} texts, all in the game's lettering (letters, digits, a colon; a full stop or a comma at most)`, everything.every(lettering));
  const parts = everything.flatMap((t) => partsOf(t, STATUS));
  check('every part fits the line (32 letters) and has a letter in it', parts.every((p) => p.length <= STATUS.width && /[A-Z0-9]/.test(p)));
  check('a short line is one part', partsOf('IT FALLS', STATUS).join('|') === 'IT FALLS');
  check('"A SEALED DOOR. FOUR MARKS UPON IT" is two parts (no full stop in the lettering, 33 letters with the gap)', partsOf2(LINES.doorSeen).join('|') === 'A SEALED DOOR|FOUR MARKS UPON IT');
  check('sentences that fit together share a line, with a gap', partsOf('NOW. STRIKE IT DOWN', STATUS).join('|') === 'NOW  STRIKE IT DOWN');
  check('a long line is cut at its words and balanced', partsOf('THE CAPTAINS SOUL IS BOUND TO THIS SHIP', STATUS).join('|') === 'THE CAPTAINS SOUL IS|BOUND TO THIS SHIP');
  check('commas are left out, apostrophes too', partsOf('BELL, BOOK AND CANDLE', STATUS).join('|') === 'BELL BOOK AND CANDLE' && clean("CAPTAIN'S", STATUS) === 'CAPTAIN S');
  check('sentences() cuts at full stops', sentences('ONE. TWO. THREE', STATUS).join('|') === 'ONE|TWO|THREE');
  const long = 'ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN ELEVEN';
  check('wrap() keeps every word whole', wrap(long, 20).every((l) => l.length <= 20) && wrap(long, 20).join(' ') === long);
  const searching = [...SEARCHING].map((ch) => (ch === ' ' ? 0x20 : STATUS.code(ch)));
  check('the code for the game\'s own words is the screen codes the game draws (S E A R C H I N G ...)', searching.slice(0, 9).join(',') === '19,5,1,18,3,8,9,14,7');
}

// ---------------------------------------------------------------- 2. the story
/** A launched game in a place, a check on what it does there. */
async function story(name: string, at: Where, play: (s: Session) => boolean, shot?: string) {
  const s = await Session.launch(saveAt(at));
  verdict(name, { 'what it should say': play(s) }, s);
  if (outDir && shot) s.shot(still(shot));
}
const RITE_FLAGS = { [FLAG.bell]: 1, [FLAG.book]: 1, [FLAG.candle]: 1 };
const FOUR = { [FLAG.piece1]: 1, [FLAG.piece2]: 1, [FLAG.piece3]: 1, [FLAG.piece4]: 1 };

await story('a new game: the story starts (two lines, each in parts)', { deck: 1 }, (s) => says(s, LINES.start, 1200), 'start');
await story('on deck 5, in sight of where the door will be: A SEALED DOOR. FOUR MARKS UPON IT', { deck: 5 }, (s) => {
  const seen = s.walk(['ArrowLeft'], () => s.ram[0x1f87] === 1 || s.ram[0x1f88] === 1, 3000);
  return seen && says(s, LINES.doorSeen) && s.ram[0x6e8c] !== 0x73;
}, 'door');
await story('the door seen once, not again', { deck: 5 }, (s) => {
  s.walk(['ArrowLeft'], () => s.ram[0x1f87] === 1 || s.ram[0x1f88] === 1, 3000);
  s.tick(900);
  s.walk(['ArrowRight'], () => s.ram[0x1f87] >= 4, 3000);
  s.walk(['ArrowLeft'], () => s.ram[0x1f87] === 1 || s.ram[0x1f88] === 1, 3000);
  s.tick(900);
  return s.trace.filter((t) => t.text === 'A SEALED DOOR').length === 1;
});
await story('with the four pieces found the door is the game\'s, and nothing is said of it', { deck: 5, flags: { ...FOUR, 0x6e8c: 0x73 } }, (s) => {
  s.walk(['ArrowLeft'], () => s.ram[0x1f87] === 1 || s.ram[0x1f88] === 1, 3000);
  s.tick(600);
  return !s.trace.some((t) => t.text.includes('SEALED DOOR'));
});

// the sword
{
  const s = await Session.launch(saveAt({ room: 2 }));
  const first = says(s, LINES.sword.room);
  const sparkle = sparkleAt(s, [0]);
  if (outDir) s.shot(still('sword-room'));
  s.goTo(165, 168);
  const got = s.ram[FLAG.sword] === 1;
  const gone = s.sparkles.length === 0 || (s.tick(), s.sparkles.length === 0);
  const found = s.until('YOU HAVE FOUND A MAGIC SWORD', 200);
  const after = says(s, LINES.sword.taken);
  if (outDir) s.shot(still('sword-taken'));
  check(`the sword room says ${partsOf2(LINES.sword.room).join(' / ')}, the sparkle is on the sword, he takes it by walking in, the game says it first and then: ${partsOf2(LINES.sword.taken).join(' / ')}`, first && sparkle && got && gone && found && after && s.covered === 0);
}

// the shelf's piece (deck 1, room 4): struck from the front of the sack pile
{
  const s = await Session.launch(saveAt({ room: 4, flags: { [FLAG.sword]: 1 } }));
  const first = says(s, LINES.shelf.room);
  const sparkle = sparkleAt(s, [6]);
  if (outDir) s.shot(still('shelf-room'));
  // (the front of the cabin, in front of the sacks, then along it to where the sword reaches up the shelf)
  s.walk(['ArrowDown'], () => s.ram[0x3420] >= 146);
  s.walk(['ArrowLeft'], () => s.ram[0x341f] <= 104);
  for (let k = 0; k < 6 && s.ram[0x638f] < 1 && !s.ram[FLAG.piece1]; k++) s.swing();
  const struck = s.until('IT FALLS', 200);
  const got = s.wait(() => s.ram[FLAG.piece1] === 1, 400);
  const found = s.until('YOU HAVE FOUND A PIECE OF MAP', 200);
  const remain = says(s, LINES.pieceRemain[3]);
  check(`piece 1 on the shelf, by play (down to the front, left to x ${s.ram[0x341f]}, X): ${partsOf2(LINES.shelf.room).join(' / ')}, the sparkle on it, IT FALLS, it is his, then ${partsOf2(LINES.pieceRemain[3]).join(' / ')}`,
    first && sparkle && struck && got && found && remain && s.sparkles.length === 0 && s.covered === 0);
}

// the bell (deck 2's hall): the sword on the wall from the back, 32 frames of contact
{
  const s = await Session.launch(saveAt({ room: 0x15, side: 2, flags: { [FLAG.sword]: 1 } }));
  const first = says(s, LINES.bell.room);
  const sparkle = sparkleAt(s, [4]);
  if (outDir) s.shot(still('bell-room'));
  s.walk(['ArrowUp'], () => s.ram[0x3420] <= 128);
  s.walk(['ArrowLeft'], () => s.ram[0x341f] <= 176);
  for (let k = 0; k < 14 && !s.ram[FLAG.bell]; k++) s.swing();
  const got = s.ram[FLAG.bell] === 1;
  const found = s.until('YOU HAVE FOUND A BELL', 300);
  const after = says(s, LINES.bell.taken);
  check(`the bell, by play (up to the back, left, X until it rings out): ${partsOf2(LINES.bell.room).join(' / ')}, the sparkle on it, taken (y ${s.ram[0x3420]}), then ${partsOf2(LINES.bell.taken).join(' / ')}`, first && sparkle && got && found && after && s.sparkles.length === 0 && s.covered === 0);
}

// the book (deck 3's hall): locked without the key; with it, standing against the door 32 frames
{
  const s = await Session.launch(saveAt({ room: 0x10, side: 1, flags: { [FLAG.sword]: 1, [FLAG.bell]: 1 } }));
  const noSparkle = s.sparkles.length === 0;
  s.walk(['ArrowUp'], () => s.ram[0x3420] <= 128);
  s.walk(['ArrowLeft'], () => s.ram[0x341f] <= 150);
  const locked = says(s, LINES.book.locked, 300);
  const stillNone = s.sparkles.length === 0 && !s.ram[FLAG.book];
  took(s, FLAG.key);
  s.tick(2);
  const sparkle = sparkleAt(s, [4]);
  if (outDir) s.shot(still('book-room'));
  const got = s.wait(() => s.ram[FLAG.book] === 1, 600);
  const found = s.until('YOU HAVE FOUND A LARGE BOOK', 300);
  const keyLine = says(s, LINES.key, 1200);
  const after = says(s, LINES.book.nowCandle);
  verdict(`the book, by play (against it 32 frames): no sparkle without the key, ${partsOf2(LINES.book.locked).join(' / ')}, with the key the sparkle on it, taken, then ${partsOf2(LINES.book.nowCandle).join(' / ')}`, { noSparkle, locked, stillNone, keyLine, sparkle, got, found, after }, s);
}

// the mirror (deck 4, room 8): the sword on the yellow sacks from the front, then 128 frames in the room
{
  const s = await Session.launch(saveAt({ room: 8, flags: { [FLAG.sword]: 1 } }));
  const first = says(s, LINES.mirror.room);
  const sparkle = sparkleAt(s, [4]);
  if (outDir) s.shot(still('mirror-room'));
  // (round the trapdoor at the back right: down a little, left, then down to the front and left to the sacks)
  s.walk(['ArrowDown'], () => s.ram[0x3420] >= 126);
  s.walk(['ArrowLeft'], () => s.ram[0x341f] <= 150);
  s.walk(['ArrowDown'], () => s.ram[0x3420] >= 160);
  s.walk(['ArrowLeft'], () => s.ram[0x341f] <= 112);
  for (let k = 0; k < 14 && !s.ram[FLAG.mirror]; k++) s.swing();
  const found = s.ram[FLAG.mirror] === 1;
  const foundLine = s.until('YOU HAVE FOUND A SMALL MIRROR', 300) && says(s, LINES.mirror.found);
  const used = s.wait(() => s.ram[FLAG.mirror] === 2, 400);
  const usedLine = says(s, LINES.mirror.used, 1500);
  check(`the mirror, by play (front of the room, X, then 128 frames there): ${partsOf2(LINES.mirror.room).join(' / ')}, sparkle, found: ${partsOf2(LINES.mirror.found).join(' / ')}, used: ${partsOf2(LINES.mirror.used).join(' / ')}`, first && sparkle && found && foundLine && used && usedLine && s.covered === 0);
}

// a trapdoor giving way (the same room, the back right)
await story('the trapdoor in room 8: THE BOARDS GAVE WAY BENEATH ME', { room: 8, flags: { [FLAG.sword]: 1, [FLAG.mirror]: 2 } }, (s) => {
  s.goTo(187, 134, 400);
  s.tick(10);
  return partsOf2(LINES.trapdoor).every((p) => s.trace.some((t) => t.text === p));
});

// the captain (deck 5, room $C): two lines on coming in, one blow, REST NOW, CAPTAIN
{
  const s = await Session.launch(saveAt({ room: 0x0c, flags: { [FLAG.sword]: 1, ...FOUR } }));
  const first = says(s, LINES.captain.room);
  const sparkle = sparkleAt(s, [4]);
  if (outDir) s.shot(still('captain'));
  s.walk(['ArrowDown'], () => s.ram[0x3420] >= 122);
  s.walk(['ArrowLeft'], () => s.ram[0x341f] <= 164);
  for (let k = 0; k < 10 && s.ram[0x633b] < 1; k++) s.swing();
  const struck = s.ram[0x633b] >= 1;
  const end = says(s, LINES.captain.end, 300);
  if (outDir) s.shot(still('captain-end'));
  check(`the captain: ${partsOf2(LINES.captain.room).join(' / ')}, the sparkle on him, one blow (x ${s.ram[0x341f]}), then ${partsOf2(LINES.captain.end).join(' / ')}`, first && sparkle && struck && end && s.covered === 0);
}

// the rest, by what the game sets (the flag and the name of the thing for its own message): room by room
{
  const s = await Session.launch(saveAt({ room: 0x12 }));
  const refuse = says(s, LINES.guard.refuse);
  check(`the guard without the rite: ${partsOf2(LINES.guard.refuse).join(' / ')}`, refuse && s.sparkles.length === 0);
}
{
  const s = await Session.launch(saveAt({ room: 0x12, flags: RITE_FLAGS }));
  const ready = says(s, LINES.guard.ready);
  const sparkle = sparkleAt(s, [4]);
  if (outDir) s.shot(still('guard-ready'));
  s.ram[0x631c] = 0xff; // (struck sixteen times)
  s.tick(2);
  const piece = sparkleAt(s, [6]);
  took(s, FLAG.piece3);
  const done = s.until('YOU HAVE FOUND A PIECE OF MAP', 200) && says(s, LINES.guard.done) && says(s, LINES.pieceRemain[3]);
  check(`the guard with the rite complete: ${partsOf2(LINES.guard.ready).join(' / ')}, the sparkle on the guard, after the blows on the piece, taken: ${partsOf2(LINES.guard.done).join(' / ')}`, ready && sparkle && piece && done && s.covered === 0);
}
{
  const s = await Session.launch(saveAt({ room: 0x11 }));
  const without = says(s, LINES.chart.without);
  if (outDir) s.shot(still('chart-without'));
  let ok = without && s.sparkles.length === 0;
  const tool = (flag: number, name: string, n: 1 | 2 | 3) => {
    took(s, flag);
    return s.until(`YOU HAVE FOUND ${name}`, 300) && says(s, `${n === 1 ? LINES.tool.telescope : n === 2 ? LINES.tool.sextant : LINES.tool.compass}. ${LINES.toolCount[n]}`);
  };
  ok = ok && tool(FLAG.telescope, 'A TELESCOPE', 1) && tool(FLAG.sextant, 'A SEXTANT', 2);
  const before = s.sparkles.length === 0;
  ok = ok && tool(FLAG.compass, 'A COMPASS', 3);
  s.tick(2);
  const sparkle = sparkleAt(s, [4]);
  took(s, FLAG.piece2);
  const done = s.until('YOU HAVE FOUND A PIECE OF MAP', 300) && says(s, LINES.chart.done) && says(s, LINES.pieceRemain[3]);
  verdict(`the chart: ${partsOf2(LINES.chart.without).join(' / ')}; the tools (${LINES.toolCount[1]}, ${LINES.toolCount[2]}, ${LINES.toolCount[3]}); sparkle only with all three; ${partsOf2(LINES.chart.done).join(' / ')}`, { ok, before, sparkle, done }, s);
}
{
  const s = await Session.launch(saveAt({ room: 0x17, flags: { [FLAG.mirror]: 1 } }));
  const without = says(s, LINES.sirens.without);
  let ok = without && s.sparkles.length === 0;
  took(s, FLAG.comb);
  ok = ok && s.until('YOU HAVE FOUND A SMALL COMB', 300) && says(s, LINES.comb);
  const combOnly = s.sparkles.length === 0;
  s.ram[FLAG.mirror] = 2; // (the mirror used: the game goes to 2 after 128 frames in its room)
  ok = ok && says(s, LINES.mirror.used) && says(s, LINES.sirens.ready);
  s.tick(2);
  const sparkle = sparkleAt(s, [4, 6]);
  if (outDir) s.shot(still('sirens-ready'));
  took(s, FLAG.piece4);
  const done = s.until('YOU HAVE FOUND A PIECE OF MAP', 300) && says(s, LINES.sirens.done) && says(s, LINES.pieceRemain[3]);
  check(`the sirens: ${partsOf2(LINES.sirens.without).join(' / ')}; the comb: ${partsOf2(LINES.comb).join(' / ')}; mirror used: ${partsOf2(LINES.sirens.ready).join(' / ')}; sparkles on both and the piece; ${partsOf2(LINES.sirens.done).join(' / ')}`, ok && combOnly && sparkle && done && s.covered === 0);
}
{
  // the rite, in the order the game allows (the book only needs the key): each the third, and the others
  const a = await Session.launch(saveAt({ room: 0x15, flags: { [FLAG.book]: 1, [FLAG.candle]: 1 } }));
  took(a, FLAG.bell);
  const bellLast = a.until('YOU HAVE FOUND A BELL', 300) && says(a, LINES.riteComplete);
  const b = await Session.launch(saveAt({ room: 0x16 }));
  took(b, FLAG.candle);
  const early = b.until('YOU HAVE FOUND A CANDLE', 300) && says(b, LINES.candle.early);
  const c = await Session.launch(saveAt({ room: 0x16, flags: { [FLAG.bell]: 1 } }));
  took(c, FLAG.candle);
  const needsBook = c.until('YOU HAVE FOUND A CANDLE', 300) && says(c, LINES.candle.needsBook);
  const d = await Session.launch(saveAt({ room: 0x10, flags: { [FLAG.bell]: 1, [FLAG.candle]: 1 } }));
  took(d, FLAG.book);
  const complete = d.until('YOU HAVE FOUND A LARGE BOOK', 300) && says(d, LINES.riteComplete);
  const e = await Session.launch(saveAt({ room: 0x10 }));
  took(e, FLAG.book);
  const bookEarly = e.until('YOU HAVE FOUND A LARGE BOOK', 300) && says(e, LINES.book.needsBell);
  verdict(`the rite: the third of the three is ${partsOf2(LINES.riteComplete).join(' / ')}; candle first ${partsOf2(LINES.candle.early).join(' / ')}; the book before the bell: ${partsOf2(LINES.book.needsBell).join(' / ')}`, { bellLast, early, needsBook, complete, bookEarly }, a, b, c, d, e);
}
{
  // the four pieces, one after the other: how many remain, the last the whole chart
  const s = await Session.launch(saveAt({ deck: 3 }));
  const order: [number, Say | null][] = [[FLAG.piece1, null], [FLAG.piece2, LINES.chart.done], [FLAG.piece3, LINES.guard.done], [FLAG.piece4, LINES.sirens.done]];
  const remain: Say[] = [LINES.pieceRemain[3], LINES.pieceRemain[2], LINES.pieceRemain[1], LINES.chartWhole];
  let ok = true;
  order.forEach(([flag, done], i) => {
    took(s, flag);
    ok = ok && s.until('YOU HAVE FOUND A PIECE OF MAP', 300) && (done === null || says(s, done)) && says(s, remain[i]);
  });
  verdict(`the pieces: ${remain.map((r) => partsOf2(r).join(' / ')).join(' ; ')}`, { ok }, s);
}
{
  // the other things that serve a puzzle (lines of ours, not in the draft)
  const s = await Session.launch(saveAt({ room: 3 }));
  took(s, FLAG.gunpowder);
  const gun = s.until('YOU HAVE FOUND SOME GUNPOWDER', 300) && says(s, LINES.gunpowder);
  const c = await Session.launch(saveAt({ room: 7 }));
  const cannon = says(c, LINES.cannon.without);
  const l = await Session.launch(saveAt({ room: 7, flags: { [FLAG.gunpowder]: 1 } }));
  const loaded = says(l, LINES.cannon.loaded) && sparkleAt(l, [0]);
  l.ram[0x6252] = 2; // (fired)
  l.tick(2);
  const firedNone = l.sparkles.length === 0;
  l.ram[0x6255] = 2; // (the chest blown: the anchor to take)
  l.tick(2);
  const anchor = sparkleAt(l, [1]);
  const e = await Session.launch(saveAt({ room: 0x0e }));
  const drain = says(e, LINES.drain);
  const f = await Session.launch(saveAt({ room: 0x0f }));
  const keyRoom = says(f, LINES.keyRoom);
  verdict(`gunpowder, the cannon (${partsOf2(LINES.cannon.without).join(' / ')}; sparkle on the cannon, then the anchor), the drain, the key's guard`, { gun, cannon, loaded, firedNone, anchor, drain, keyRoom }, s, c, l, e, f);
}

{
  // the game's other message (X before the sword is found: YOU HAVENT FOUND THE SWORD YET) is never covered either
  const s = await Session.launch(saveAt({ room: 0x15, side: 2 }));
  s.tick(30);
  s.hold('KeyX', 20, 60);
  const msg = s.trace.some((t) => t.text === 'YOU HAVENT FOUND THE SWORD YET');
  s.tick(300);
  verdict('the sword not yet found: the game\'s own YOU HAVENT FOUND THE SWORD YET shows in full, our line before and after it', { msg, back: partsOf2(LINES.bell.room).every((p) => s.trace.some((t) => t.text === p)) }, s);
}

// ---------------------------------------------------------------- 4. the sparkles, thing by thing
/** What the game wants in hand before it gives each thing (read from the rooms' code: re/README.md), and the sprites it is on. */
const GATE: Record<string, number[]> = {
  shelf: [FLAG.sword], chart: [FLAG.telescope, FLAG.sextant, FLAG.compass], bell: [FLAG.sword], pearl: [FLAG.seaweed],
  key: [FLAG.skull, FLAG.crossbones], book: [FLAG.key], guard: [FLAG.bell, FLAG.book, FLAG.candle], anchor: [FLAG.gunpowder],
  comb: [FLAG.anchor], mirror: [FLAG.sword], sirens: [FLAG.comb, FLAG.mirror], captain: [FLAG.sword, FLAG.piece1, FLAG.piece2, FLAG.piece3, FLAG.piece4], water: [FLAG.bucket],
};
const SPRITES: Record<string, number[]> = {
  sword: [0], shelf: [6], telescope: [4], sextant: [4], compass: [7], chart: [4], bell: [4], seaweed: [0], pearl: [4], skull: [6], crossbones: [6],
  key: [6], book: [4], candle: [4], guard: [4], gunpowder: [1], anchor: [0], comb: [4], mirror: [4], mirrorWait: [], sirens: [4, 6], captain: [4],
  doubloons: [1], bucket: [1], water: [4],
};
/** The flag each thing is taken by. */
const OWN: Record<string, number> = {
  sword: FLAG.sword, shelf: FLAG.piece1, telescope: FLAG.telescope, sextant: FLAG.sextant, compass: FLAG.compass, chart: FLAG.piece2, bell: FLAG.bell, seaweed: FLAG.seaweed, pearl: FLAG.pearl,
  skull: FLAG.skull, crossbones: FLAG.crossbones, key: FLAG.key, book: FLAG.book, candle: FLAG.candle, guard: FLAG.piece3, gunpowder: FLAG.gunpowder, anchor: FLAG.anchor, comb: FLAG.comb,
  mirror: FLAG.mirror, mirrorWait: FLAG.mirror, sirens: FLAG.piece4, captain: 0x342c, doubloons: FLAG.doubloons1, bucket: FLAG.bucket, water: FLAG.water,
};
{
  let ok = 0, total = 0;
  const bad: string[] = [];
  for (const t of THINGS) {
    if (t.id === 'mirrorWait') continue;
    const sprites = SPRITES[t.id] ?? [];
    const gates = GATE[t.id] ?? [];
    const flagsFor = (list: number[]) => Object.fromEntries(list.map((f) => [f, f === FLAG.mirror ? 2 : 1]));
    // where the thing is (the halls by the side the sprite shows from, the anchor's cannon before the chest is blown)
    const place = async (flags: Record<number, number>, side: 1 | 2) => {
      let s: Session;
      try { s = await Session.launch(saveAt({ room: t.room, flags, side })); } catch (e) { throw new Error(`${t.id} in room ${t.room.toString(16)}: ${e instanceof Error ? e.message : e}`); }
      s.tick(40);
      if (t.id === 'anchor') { s.ram[0x6255] = 2; s.tick(2); }
      return s;
    };
    const sprs = t.id === 'anchor' ? [1] : sprites;
    const sides: (1 | 2)[] = HALLS.some((h) => h.room === t.room) ? [2, 1] : [2];
    const own = t.id === 'doubloons' && t.room === 0x1e ? FLAG.doubloons2 : OWN[t.id];
    let got = false;
    for (const side of sides) {
      const s = await place(flagsFor(gates), side);
      if (roomOf(s.ram) === t.room && sprs.every((n) => spriteSpot(s.ram, s.vic, n) !== null)) { got = sparkleAt(s, sprs); if (got) break; }
    }
    // not before the game would give it (the last thing asked for missing), nor once it is taken
    let early = true;
    if (gates.length) {
      const last = gates[gates.length - 1];
      for (const side of sides) { const s = await place(flagsFor(gates.filter((g) => g !== last)), side); early = early && s.sparkles.length === 0; }
    }
    let late = true;
    // (the captain taken is the game's end: nothing to save there)
    if (t.id !== 'captain') for (const side of sides) {
      const s = await place({ ...flagsFor(gates), [own]: 1 }, side);
      late = late && s.sparkles.length === 0 && !hereNow(s.ram).some((h) => h.id === t.id);
    }
    total++;
    if (got && early && late) ok++; else bad.push(`${t.id}@${t.room.toString(16)}${got ? '' : ' (not on its sprite)'}${early ? '' : ' (early)'}${late ? '' : ' (late)'}`);
  }
  check(`sparkles: ${ok} of ${total} things carry them on their own sprite exactly when the game would give them (${bad.join(', ') || 'none wrong'})`, ok === total);
  check('guidedSpots is empty on a deck', (() => { const s = new Uint8Array(0x10000); return guidedSpots(s, new Uint8Array(0x40)).length === 0; })());
}

// ---------------------------------------------------------------- 5. what to do next
{
  const s = await Session.launch(saveAt({ deck: 3 }));
  s.tick(IDLE_FRAMES - 100);
  const quiet = !s.trace.some((t) => t.text.startsWith('NEXT'));
  const line = `${LINES.next.prefix} ${LINES.next.things.sword} ${LINES.next.deck} 1`;
  const next = says(s, line, 400);
  if (outDir) s.shot(still('next'));
  check(`nothing said for 20 seconds on a deck: ${line} (not before)`, quiet && next && s.covered === 0);
  const t = await Session.launch(saveAt({ room: 2 }));
  t.tick(IDLE_FRAMES * 2 + 400);
  check('in a room with something to take the sparkles are enough: no NEXT line', !t.trace.some((x) => x.text.startsWith('NEXT')));
}
{
  // the whole chain: take what is next, again and again; each one something the game gives, nothing left out, ending with the captain
  const ram = new Uint8Array(0x10000);
  const taken: string[] = [];
  const flagsOf = (id: string, room: number) => (id === 'doubloons' ? (room === 6 ? FLAG.doubloons1 : FLAG.doubloons2) : OWN[id]);
  let ok = true;
  for (let i = 0; i < THINGS.length + 2; i++) {
    ram[0x342e] = 0; ram[0x341c] = 0;
    const n = nextThing(ram);
    if (!n) break;
    if (!n.ready(ram) || n.taken(ram)) ok = false;
    const flag = flagsOf(n.id, n.room);
    if (flag === undefined) { ok = false; break; }
    ram[flag] = n.id === 'mirrorWait' || n.id === 'captain' ? 2 : 1;
    taken.push(n.id);
  }
  check(`the chain of ${taken.length} things, each next one something the game gives: ${taken.join(' ')}`, ok && taken.length === THINGS.length && nextThing(ram) === null && taken[taken.length - 1] === 'water');
  const decks = THINGS.every((t) => deckOf(t.room) >= 1 && deckOf(t.room) <= 5);
  check('every thing is on a deck the ship has (the NEXT line says which)', decks);
  check('every NEXT line fits (a deck 1-5 and a name)', THINGS.every((t) => partsOf(`${LINES.next.prefix} ${LINES.next.things[t.id] ?? ''} ${LINES.next.deck} ${deckOf(t.room)}`, STATUS).every((p) => p.length <= 32)) && THINGS.every((t) => LINES.next.things[t.id] !== undefined));
}

// ---------------------------------------------------------------- 6. ORIGINAL
{
  const s = await Session.launch(saveAt({ room: 2 }), false);
  s.tick(1300);
  const quiet = s.trace.every((t) => t.text === SEARCHING) && s.sparkles.length === 0;
  s.goTo(165, 168);
  const sword = s.ram[FLAG.sword] === 1;
  s.tick(500);
  const found = s.trace.some((t) => t.text === 'YOU HAVE FOUND A MAGIC SWORD');
  const only = s.trace.every((t) => t.text === SEARCHING || t.text === 'YOU HAVE FOUND A MAGIC SWORD');
  check('ORIGINAL: the game\'s own line all the way (1,800 frames, the sword taken, its own message), no sparkles', quiet && sword && found && only && s.line() === SEARCHING && s.sparkles.length === 0);
  const t = await Session.launch(saveAt({ deck: 1 }), false);
  t.tick(1200);
  const e = await Session.launch(saveAt({ room: 4, flags: { [FLAG.sword]: 1 } }), false);
  e.tick(600);
  check('ORIGINAL: no start story on deck 1, no shelf hint, no sparkle on the piece', t.trace.every((x) => x.text === SEARCHING) && e.trace.every((x) => x.text === SEARCHING) && e.sparkles.length === 0);
  // switched while a line is showing: the game's own line comes back at once, the sparkles go
  const sw = await Session.launch(saveAt({ room: 2 }), true);
  const showing = sw.until('A BLADE GLEAMS IN THE DARK', 900) && sw.sparkles.length > 0;
  sw.p.frontEnd.toggleEnhanced();
  sw.tick(4);
  const back = sw.line() === SEARCHING && sw.sparkles.length === 0;
  sw.p.frontEnd.toggleEnhanced();
  sw.tick(2);
  const again = sw.sparkles.length > 0;
  check('switching to ORIGINAL puts the game\'s own line back and takes the sparkles away; ENHANCED again brings the sparkles', showing && back && again);
  if (outDir) { const r = await Session.launch(saveAt({ room: 2 })); r.until('A BLADE GLEAMS IN THE DARK', 900); r.shot(still('status-line')); }
}

finish();
