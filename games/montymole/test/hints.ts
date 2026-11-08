/**
 * ENHANCED's coal count and sparkles (src/hints.ts), on the rebuilt game alone (no original needed):
 *
 * - the count says how many pieces are left to the next gate (16, 32, 48, 64 taken), nothing once all four have counted, nothing in the opening scene, and it is written in
 *   the game's own letters;
 * - the count is drawn on the surface only, in the top row to the right of the score, as coloured text with no box: every pixel it changes is inside its own cells and
 *   those cells' colours, and the picture the original look shows is untouched;
 * - the opener is marked only in the gate's room, only when one piece is left to the count, and taking a marked piece there opens the gate (`Gates`), while a piece taken
 *   in another room at that count (which is not marked) shuts it for good; the tool is marked while it lies there and he carries none, and standing on the mark takes it;
 * - hints read the game and change nothing: two games fed the same keys, one asked for its hints every pass, are the same game;
 * - the front end shows both in ENHANCED only (the renderer's sparkles, the count in the picture).
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/hints.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { check, finish } from '../../shared/test/check';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { PICTURE_LEFT, PICTURE_TOP } from '../../shared/spectrum';
import { STILL_THERE } from '../src/coal';
import { portsFor, Key } from '../src/controls';
import { ROOMS } from '../src/data/rooms-data';
import { codeOf } from '../src/letters';
import { GATES } from '../src/gates';
import { Game, ENDING_ROOM } from '../src/game';
import { coalCount, hintsOf, piecesToGate } from '../src/hints';
import { run } from '../src/main';
import { piecesOfRoom } from '../src/map';
import { Flag } from '../src/monty';
import { COUNT_LINE, MontyView, SPARKLE_GAIN, SPARKLE_SIZE } from '../src/view';

/** A game in `room` at its first way in, the coal as the gift of the opening scene leaves it (all there) and `taken` pieces then taken from the first of the list. */
function atRoom(room: number, taken: readonly number[] = []): Game {
  const g = new Game();
  g.newGame();
  g.coal.flags.forEach((_, i) => { g.coal.flags[i] = (g.coal.flags[i] ?? 0) | STILL_THERE; });
  for (const id of taken) g.coal.flags[id] = (g.coal.flags[id] ?? 0) & ~STILL_THERE;
  g.place(room, 0x18, 0x27);
  return g;
}

const FIRST = must(GATES[0], 'no gate');

/** `n` pieces taken, none from `keep`. */
const firstTaken = (n: number, keep: readonly number[]): number[] => Array.from({ length: 64 }, (_, i) => i).filter((i) => !keep.includes(i)).slice(0, n);

// ---- the count ----------------------------------------------------------------------------------------------------------------
{
  const g = atRoom(3);
  check(`the count starts at 16 to the first gate (${coalCount(g)})`, coalCount(g) === 'COAL TO GATE: 16');
  const counts: string[] = [];
  for (const taken of [1, 15, 16, 17, 31, 32, 47, 48, 63]) {
    const h = atRoom(3, firstTaken(taken, []));
    counts.push(`${taken}:${piecesToGate(h)}`);
  }
  check(`pieces to the next gate after 1, 15, 16, 17, 31, 32, 47, 48, 63 taken (${counts.join(' ')})`, counts.join(' ') === '1:15 15:1 16:16 17:15 31:1 32:16 47:1 48:16 63:1');
  const all = atRoom(3, firstTaken(64, []));
  check('after the fourth gate\'s count there is nothing to show', piecesToGate(all) === null && coalCount(all) === null);
  check('the text is in the game\'s letters (its font has every character)', (() => { try { for (const ch of 'COAL TO GATE: 16') codeOf(ch); return true; } catch { return false; } })());
  const opening = new Game();
  opening.newGame();
  check('none in the opening scene', coalCount(opening) === null && hintsOf(opening).length === 0);
  const ending = atRoom(3);
  ending.outcome = 'ending';
  ending.room = ENDING_ROOM;
  check('none at the ending', coalCount(ending) === null && hintsOf(ending).length === 0);
  check('the four gates are the counts the count goes to', GATES.map((x) => x.count).join() === '16,32,48,64');
}

// ---- drawn on the surface only, in its own cells -------------------------------------------------------------------------------
{
  const g = atRoom(3);
  const renderer = new PixelRenderer();
  const view = new MontyView(renderer, g, 'enhanced');
  view.update();
  const without = renderer.screen.pixels.slice();
  const screenBefore = g.field.screen.slice(), attrsBefore = g.field.attrs.slice();
  view.count = coalCount(g);
  view.update();
  const withText = renderer.screen.pixels.slice();
  const text = must(view.count, 'no count');
  const left = PICTURE_LEFT + COUNT_LINE.column * 8, right = left + text.length * 8;
  const top = PICTURE_TOP, bottom = PICTURE_TOP + 16; // (the cells of the top two rows: the glyphs are in the first, the second is the colour below)
  let outside = 0, inside = 0;
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
    if (without[y * 320 + x] === withText[y * 320 + x]) continue;
    if (x >= left && x < right && y >= top && y < bottom) inside++; else outside++;
  }
  check(`the count changes pixels only in its own cells (${inside} inside, ${outside} outside)`, inside > 0 && outside === 0);
  check('the game\'s own screen and attributes are not touched by it', g.field.screen.every((v, i) => v === screenBefore[i]) && g.field.attrs.every((v, i) => v === attrsBefore[i]));
  // no box: the cells under the text keep the paper they had (black), the text is the ink
  const ink = new Set<number>();
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) ink.add(withText[y * 320 + x] ?? 0);
  check(`coloured text on the black the status rows have, one ink and nothing else (${[...ink].join(',')})`, ink.size === 2 && ink.has(8) && ink.has(14));
  view.look = 'original';
  view.count = null;
  view.update();
  const originalWithout = renderer.screen.pixels.slice();
  view.count = text;
  view.update();
  check('the original look does not have the count, asked for or not', renderer.screen.pixels.every((v, i) => v === originalWithout[i]));
  view.count = null;
  view.look = 'enhanced';
  view.update();
  check('no count asked for: the surface is as it was', renderer.screen.pixels.every((v, i) => v === without[i]));
}

// ---- the opener -----------------------------------------------------------------------------------------------------------------
{
  const gateRoom = FIRST.room;
  const mine = piecesOfRoom(gateRoom);
  check(`the first gate's room is ${gateRoom} and it has pieces (${mine.join(',')})`, gateRoom === 6 && mine.length > 0);
  const early = atRoom(gateRoom, firstTaken(10, mine));
  check('far from the count: no opener marked', hintsOf(early).every((h) => h.kind !== 'opener'));
  // fifteen taken elsewhere: the one piece left to the count is any of this room's
  const g = atRoom(gateRoom, firstTaken(15, mine));
  const marks = hintsOf(g).filter((h) => h.kind === 'opener');
  check(`one left to the count, in the gate's room: every piece of the room is marked (${marks.length} of ${mine.length})`, marks.length === mine.length);
  // put Monty on the first piece: the piece is taken and the gate opens
  const piece = must(ROOMS[gateRoom]?.coal.find((c) => c.col !== 0 || c.row !== 0 && g.coal.flags[c.id] !== undefined), 'no piece');
  check('a mark is the middle of the piece\'s cell', marks.some((m) => m.x === piece.col * 8 + 4 && m.y === piece.row * 8 + 4));
  g.monty.x = piece.col * 8;
  g.monty.y = (23 - piece.row) * 8 + 4;
  g.field.screen.set(g.field.picture);
  g.pass(portsFor(0));
  check(`taking it makes 16 (${g.coal.taken})`, g.coal.taken === 16);
  for (let i = 0; i < 12 && g.room === gateRoom; i++) g.pass(portsFor(0));
  check(`and the gate opens: its flags say done (${g.gates.flags.toString(16)})`, g.room === gateRoom && (g.gates.flags & FIRST.done) !== 0);
  check('the next count is 16 more', coalCount(g) === 'COAL TO GATE: 16');
  // the same count, the piece taken in another room: not marked there, and it shuts the gate for good
  const other = 3;
  const away = atRoom(other, firstTaken(15, piecesOfRoom(other)));
  check('one left, in another room: nothing marked on its pieces', hintsOf(away).every((h) => h.kind !== 'opener'));
  const there = must(ROOMS[other]?.coal.find((c) => c.col !== 0 || c.row !== 0), 'no piece');
  away.monty.x = there.col * 8;
  away.monty.y = (23 - there.row) * 8 + 4;
  away.field.screen.set(away.field.picture);
  away.pass(portsFor(0));
  check(`taken there it is the 16th (${away.coal.taken}) and the gate is marked done without opening (${away.gates.flags.toString(16)})`, away.coal.taken === 16 && (away.gates.flags & FIRST.done) !== 0);
}

// ---- the tool ----------------------------------------------------------------------------------------------------------------------
{
  const withObject = ROOMS.find((r) => r.object.sprite !== 0);
  const room = must(withObject, 'no room has an object');
  const g = atRoom(room.id);
  const marks = hintsOf(g).filter((h) => h.kind === 'tool');
  check(`room ${room.id}: the tool is marked at its middle (${marks.map((m) => `${m.x},${m.y}`).join(' ')})`, marks.length === 1 && marks[0]?.x === g.object.x + 8 && marks[0]?.y === 191 - g.object.y + 8);
  g.monty.x = g.object.x;
  g.monty.y = g.object.y;
  g.field.screen.set(g.field.picture);
  g.pass(portsFor(0));
  check('standing on it takes it (the game agrees)', (g.monty.flags & Flag.tool) !== 0 && g.object.frame === 0);
  check('carrying one, and with it gone, nothing is marked', hintsOf(g).every((h) => h.kind !== 'tool'));
  const bare = ROOMS.find((r) => r.object.sprite === 0);
  if (bare !== undefined) check(`room ${bare.id} has no object, so no tool is marked`, hintsOf(atRoom(bare.id)).every((h) => h.kind !== 'tool'));
}

// ---- hints read the game and change nothing ---------------------------------------------------------------------------------------
{
  const a = atRoom(3), b = atRoom(3);
  let state = 12345;
  let same = true;
  for (let i = 0; i < 1500 && same; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const keys = (state >> 8) % 3 === 0 ? [Key.left, Key.right, Key.jump, Key.up, Key.down][(state >> 12) % 5] ?? 0 : 0;
    a.pass(portsFor(keys));
    b.pass(portsFor(keys));
    hintsOf(b);
    coalCount(b);
    const sa = a.snapshot(), sb = b.snapshot();
    same = sa.numbers.join() === sb.numbers.join() && sa.screen.every((v, k) => v === sb.screen[k]);
  }
  check('two games with the same keys, one asked for its hints every pass, stay the same game (1500 passes)', same);
}

// ---- the front end ----------------------------------------------------------------------------------------------------------------
{
  useMemoryStorage();
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const p = run({ renderer, input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  tick(60);
  tap('Space');
  await new Promise((resolve) => setTimeout(resolve, 0));
  tick(20);
  tap('Space');
  tick(20);
  const game = (): Game => p.flow.game;
  game().place(room6(), 0x18, 0x27);
  tick(6);
  const sparkling = (): number => renderer.sparkles.markers.length;
  const screenText = (): Uint8Array => renderer.screen.pixels.slice();
  check(`ENHANCED: sparkles on the tool and the count in the picture (${sparkling()})`, p.state.enhanced && p.frontEnd.assist.hints === true && p.frontEnd.assist.count === true && sparkling() === 1);
  const markers = renderer.sparkles.markers;
  check(`a sparkle is the size and gain the Spectrum's colours need (${markers.map((m) => `${m.size}/${m.gain}`).join(' ')})`, markers.every((m) => m.size === SPARKLE_SIZE && m.gain === SPARKLE_GAIN));
  const enhanced = screenText();
  tap('KeyP');
  tap('KeyE');
  tap('KeyP');
  tick(6);
  check('ORIGINAL: no sparkles', !p.state.enhanced && sparkling() === 0);
  const original = screenText();
  let differing = 0;
  for (let i = 0; i < original.length; i++) if (original[i] !== enhanced[i]) differing++;
  check(`ORIGINAL: the count is not in the picture (the status rows are the game's: ${differing} pixels differ from ENHANCED's, the sprites' colours and the count)`, differing > 0);
}

function room6(): number { return FIRST.room; }

finish();
