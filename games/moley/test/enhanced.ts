/**
 * ENHANCED's two changes to the game itself, and that they touch nothing else (no original needed; test/lockstep.ts proves ORIGINAL, which has
 * them off, equal to the original):
 * - air steering: left and right work in a jump and in a fall. With no lateral key at take-off or in the air, two games (ORIGINAL, ENHANCED) fed
 *   the same keys are the same game pass by pass, to the last number, map and attribute; steering a straight jump moves him, and turns him; a
 *   wall still stops him; a fall steers too;
 * - the items-left count in the pocket box: the screen is the same outside the box's 16 x 16, the box shows the count (the game's own numeral,
 *   doubled) while items are left and the box is empty, nothing else; the game itself is the same pass by pass;
 * - travel (`Game.travel`) puts him at a screen's start with a full gauge and its items back; a death in grace is a fresh start, a life kept;
 * - our controls and text: the credits page's text prints only what the original's glyphs have, names no original key; our font has every
 *   character our screens print; Space, Z and X jump, arrows and WASD move.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/enhanced.ts
 */
import { Input } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { nowhere } from '../../shared/test/browser';
import { CREDITS_TEXT_OURS, keyByte } from '../src/controls';
import { BLANK_FRAME, CREDITS_TEXT, GLYPHS } from '../src/data';
import { Display, rowOffset } from '../src/display';
import { FONT_CHARACTERS } from '../src/font';
import { Game } from '../src/game';
import { moleyMap, ITEMS_IN } from '../src/map';
import { Key, State } from '../src/monty';
import { SeededRandom } from '../src/random';

/** A small generator for the keys (the game's own is `SeededRandom`; this one is the test's). */
function keyRandom(seed: number): () => number {
  const rng = new SeededRandom(seed);
  return () => rng.byte() / 256;
}

const LATERAL = Key.left | Key.right;
const KEY_SETS = [0, 0, Key.right, Key.right, Key.left, Key.jump, Key.jump | Key.right, Key.jump | Key.left, Key.up, Key.down, Key.up | Key.right, Key.down | Key.left];

/** The whole state of a game: numbers, map and attributes. */
function state(g: Game): string {
  const s = g.snapshot();
  return `${s.numbers.join(',')}|${s.map.join(',')}|${s.attrs.join(',')}`;
}

/** A game in a room, ENHANCED or not. */
function made(room: number, seed: number, enhanced: boolean): Game {
  const g = new Game(new SeededRandom(seed));
  g.enterRoom(room);
  g.enhanced.airSteering = enhanced;
  return g;
}

// ---- touches nothing else without a lateral key in the air --------------------------------------------------------------
{
  let passes = 0, differing = 0, airborne = 0;
  for (let room = 0; room < 5; room++) {
    const original = made(room, 40 + room, false), enhanced = made(room, 40 + room, true);
    const rnd = keyRandom(900 + room);
    let keys = 0;
    for (let pass = 0; pass < 4000; pass++) {
      if (pass % 5 === 0) keys = KEY_SETS[Math.floor(rnd() * KEY_SETS.length)] ?? 0;
      // (sideways keys only on the ground and not with a jump, so there are none at take-off and none in the air)
      let used = keys;
      if (original.monty.state !== State.walking || (used & Key.jump) !== 0) used &= ~LATERAL;
      if (original.monty.state !== State.walking) airborne++;
      const a = original.pass(used), b = enhanced.pass(used);
      passes++;
      if (a !== b || state(original) !== state(enhanced)) differing++;
      if (a !== 'playing') break;
    }
  }
  check(`ENHANCED's air steering changes nothing when he does not steer: ${passes} passes in rooms 0-4 (${airborne} in the air), ${differing} differences`, passes > 8000 && airborne > 1500 && differing === 0);
}

// ---- steering in a jump ------------------------------------------------------------------------------------------------
/** Room 0 with Monty standing on the floor at x 0x60. */
function standing(enhanced: boolean): Game {
  const g = made(0, 5, enhanced);
  for (let i = 0; i < 30; i++) g.pass(0);
  g.monty.x = 0x60;
  g.monty.y = 0x78;
  g.monty.state = State.walking;
  g.monty.phase = 0;
  for (let i = 0; i < 6; i++) g.pass(0);
  return g;
}
{
  const original = standing(false), enhanced = standing(true);
  const start = original.monty.x;
  check('the two start on the same spot, on the floor', enhanced.monty.x === start && original.monty.state === State.walking && original.monty.y === 0x78);
  for (const g of [original, enhanced]) g.pass(Key.jump);
  check('a straight jump has begun in both', original.monty.state === State.jumping && enhanced.monty.state === State.jumping);
  for (let i = 0; i < 8; i++) { original.pass(Key.right); enhanced.pass(Key.right); }
  check(`right in the air: ENHANCED moves him (${start} to ${enhanced.monty.x}), ORIGINAL does not (${original.monty.x})`, enhanced.monty.x > start && original.monty.x === start);
  const there = enhanced.monty.x;
  for (let i = 0; i < 6; i++) enhanced.pass(Key.left);
  check(`left in the air turns him round (${there} to ${enhanced.monty.x}), facing left`, enhanced.monty.x < there && (enhanced.monty.flags & 0x80) !== 0);
  for (let i = 0; i < 40 && enhanced.monty.state !== State.walking; i++) enhanced.pass(0);
  check('and he lands', enhanced.monty.state === State.walking);
}
{
  // a jump with a direction at take-off, which the original keeps all the way (and ENHANCED lets go of when the key is let go)
  const original = standing(false), enhanced = standing(true);
  for (const g of [original, enhanced]) g.pass(Key.jump | Key.right);
  for (let i = 0; i < 8; i++) { original.pass(0); enhanced.pass(0); }
  check(`a jump with right at take-off: ORIGINAL goes on to the right with no key (${original.monty.x - 0x60}), ENHANCED goes straight when it is let go (${enhanced.monty.x - 0x60})`, original.monty.x > enhanced.monty.x);
}
{
  // a fall steers: put him high above the floor, ENHANCED moves, ORIGINAL falls straight
  const original = standing(false), enhanced = standing(true);
  for (const g of [original, enhanced]) { g.monty.y = 0x30; g.monty.state = State.falling; }
  for (let i = 0; i < 6; i++) { original.pass(Key.right); enhanced.pass(Key.right); }
  check(`right in a fall: ENHANCED steers (${enhanced.monty.x}), ORIGINAL falls straight (${original.monty.x})`, enhanced.monty.x > original.monty.x && enhanced.monty.state === State.falling);
}
{
  // a wall still stops him: the steering is the walking step (the room's left edge, x 2, will not take another)
  const g = standing(true);
  g.monty.x = 2;
  g.pass(Key.jump);
  for (let i = 0; i < 10; i++) g.pass(Key.left);
  check(`left against the edge in a jump goes nowhere (${g.monty.x})`, g.monty.x <= 4);
}

// ---- the items-left count ---------------------------------------------------------------------------------------------------
const BOX = { row: 21, column: 19 };
/** What the box should hold for `count` items: the game's numeral, each pixel doubled, in the 16 x 16 (two columns of bytes). */
function expectedBox(count: number): number[] {
  const glyph = must(GLYPHS.get(0x30 + count), 'no numeral');
  const out: number[] = [];
  for (let line = 0; line < 16; line++) {
    let wide = 0;
    for (let bit = 7; bit >= 0; bit--) wide = (wide << 2) | (((glyph[line >> 1] >> bit) & 1) * 3);
    out.push(wide >> 8, wide & 0xff);
  }
  return out;
}
function must<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(what);
  return v;
}
/** The 16 x 16 of the pocket box in a screen: line by line, two bytes. */
function boxOf(d: Display): number[] {
  const out: number[] = [];
  for (let line = 0; line < 16; line++) out.push(d.bits[rowOffset(BOX.row * 8 + line) + BOX.column], d.bits[rowOffset(BOX.row * 8 + line) + BOX.column + 1]);
  return out;
}
{
  let compared = 0, outsideDiffers = 0, gameDiffers = 0, countShown = 0, countWrong = 0, blankWrong = 0, taken = 0;
  for (let room = 0; room < 6; room++) {
    const plain = made(room, 70 + room, false), counted = made(room, 70 + room, false);
    const dPlain = new Display(plain), dCounted = new Display(counted);
    counted.enhanced.itemCount = true;
    plain.enterRoom(room);
    counted.enterRoom(room);
    const rnd = keyRandom(300 + room);
    let keys = 0;
    for (let pass = 0; pass < 3000; pass++) {
      if (pass % 5 === 0) keys = KEY_SETS[Math.floor(rnd() * KEY_SETS.length)] ?? 0;
      const a = plain.pass(keys), b = counted.pass(keys);
      if (a !== b || state(plain) !== state(counted)) gameDiffers++;
      if (a !== 'playing') break;
      compared++;
      // outside the box the two screens are one
      let same = true;
      for (let i = 0; i < dPlain.bits.length; i++) {
        if (dPlain.bits[i] !== dCounted.bits[i]) {
          // (a byte of the box: rows 21-22 of cells, columns 19 and 20)
          const y = ((i >> 8) & 7) | (((i >> 5) & 7) << 3) | ((i >> 11) << 6);
          const col = i & 31;
          if (!(y >= BOX.row * 8 && y < BOX.row * 8 + 16 && (col === BOX.column || col === BOX.column + 1))) { same = false; break; }
        }
      }
      if (!same) outsideDiffers++;
      const left = counted.itemsLeft;
      if (left > 0 && counted.pocket === BLANK_FRAME) {
        countShown++;
        if (boxOf(dCounted).join() !== expectedBox(left).join()) countWrong++;
      } else if (boxOf(dCounted).join() !== boxOf(dPlain).join()) blankWrong++;
      if (dPlain.game.itemsLeft !== left) taken++;
    }
  }
  check(`the items-left count: ${compared} passes in rooms 0-5, the game itself the same pass by pass (${gameDiffers} differences)`, compared > 10000 && gameDiffers === 0);
  check(`the screen is the same outside the pocket box (${outsideDiffers} passes differ)`, outsideDiffers === 0);
  check(`the box shows the number of items left, the game's numeral doubled, whenever items are left (${countShown} passes, ${countWrong} wrong)`, countShown > 3000 && countWrong === 0);
  check(`and is the empty box otherwise: rooms 2, 3 and 5 have no items, and none left means none shown (${blankWrong} wrong)`, blankWrong === 0 && ITEMS_IN.join() === '7,3,0,0,4,0' && taken === 0);
}
{
  // an item taken: the count goes down
  const g = made(0, 9, false);
  const d = new Display(g);
  g.enhanced.itemCount = true;
  g.enterRoom(0);
  g.pass(0);
  check('room 0 starts with 7 items and the box says 7', g.itemsLeft === 7 && boxOf(d).join() === expectedBox(7).join());
  const record = must(g.items.records.find((r) => r.cell >= 0), 'no item');
  g.monty.x = record.x; g.monty.y = record.y;
  g.pass(0);
  g.pass(0);
  check(`an item taken: 6 left, the box says 6 (${g.itemsLeft})`, g.itemsLeft === 6 && boxOf(d).join() === expectedBox(6).join());
}

// ---- travel and grace -------------------------------------------------------------------------------------------------------
{
  const g = made(0, 11, false);
  for (let i = 0; i < 20; i++) g.pass(Key.right);
  g.gauge.value = 0x40;
  for (const room of [3, 0, 5, 1, 4, 2]) {
    g.travel(room);
    g.pass(0);
    check(`travel to room ${room}: there, gauge full-ish, items all there (${g.room}, ${g.gauge.value.toString(16)}, ${g.itemsLeft})`, g.room === room && g.gauge.value >= 0x7e && g.itemsLeft === ITEMS_IN[room]);
  }
}
{
  const g = made(1, 12, false);
  const lives = g.lives;
  g.graceActive = () => true;
  g.gauge.value = 0x80;
  const outcome = g.pass(0);
  check(`a death in grace is a fresh start of the room with the life kept (${lives} to ${g.lives}, ${outcome})`, g.lives === lives && g.room === 1 && outcome === 'playing');
  g.graceActive = () => false;
  g.gauge.value = 0x80;
  g.pass(0);
  check('and with no grace it costs the life', g.lives === lives - 1);
}

// ---- our text, font and controls -------------------------------------------------------------------------------------------------
{
  const printable = new Set([...GLYPHS.keys()].map((c) => String.fromCharCode(c)));
  const missing = [...new Set(CREDITS_TEXT_OURS)].filter((ch) => !printable.has(ch));
  check(`the credits page's text prints only what the original's glyphs have (missing: ${missing.join('') || 'none'})`, missing.length === 0);
  check('it names none of the original\'s keys or devices', !/Z-left|X right|O up|K down|Kempston|Sinclair joystick|JOYSTICK/i.test(CREDITS_TEXT_OURS.replace('Your Sinclair', '')) && CREDITS_TEXT.includes('Z-left'));
  check('it says our keys: arrows, WASD, Space, Z, X, a gamepad, touch, JUMP', ['ARROWS', 'WASD', 'SPACE', 'Z', 'X', 'gamepad', 'touch', 'JUMP'].every((w) => CREDITS_TEXT_OURS.includes(w)));
  const screens = [
    'THE SIX SCREENS', 'LIVES 5', 'SCREENS 1/6', 'ITEMS 7/14', 'SCORE 1234', '1 7/7', '4 -', 'SCREEN 2', 'NOT REACHED YET', 'FINISHED, ALL ITEMS TAKEN', '0 OF 3 ITEMS TAKEN', 'NO ITEMS HERE',
    'NOT SEEN', 'FINISHED', 'PAUSED', 'E ENHANCED', 'E ORIGINAL', 'B BACK TO', ' ROOM START', 'T TITLE', 'ARROWS PICK  ENTER GO  P BACK', 'P OR ESC  BACK TO THE GAME',
    'TAP A PLACE, TAP AGAIN TO GO THERE', 'TAP HERE TO GO BACK TO THE GAME', '< >  OTHER PAGES    P  BACK',
    'NEW GAME?', 'FIRE YES        TAP NO', 'SPACE YES     ESC NO', 'ENTER CONTINUE', 'CONTINUE?', 'YES              NO', 'ENTER YES     ESC NO',
    'TAP: CONTINUE    FIRE: NEW GAME', 'ENTER  CONTINUE    SPACE  NEW GAME', 'TAP  CONTINUE', 'ENTER YES     ESC NO',
  ];
  const lacking = [...new Set(screens.join(''))].filter((ch) => !FONT_CHARACTERS.includes(ch));
  check(`our font has every character our screens print (missing: ${lacking.join('') || 'none'})`, lacking.length === 0);
  check('the map is the six screens with a title in capitals', moleyMap.title() === 'THE SIX SCREENS');

  const input = new Input(nowhere);
  const held = (codes: string[]): number => {
    for (const c of codes) input.keyDown(c);
    input.poll();
    const bits = keyByte(input.held, input.held.fire);
    for (const c of codes) input.keyUp(c);
    input.poll();
    return bits;
  };
  check('arrows and WASD move, left with right cancels', held(['ArrowLeft']) === Key.left && held(['KeyD']) === Key.right && held(['ArrowUp']) === Key.up && held(['KeyS']) === Key.down && held(['ArrowLeft', 'ArrowRight']) === 0);
  check('Space, Z and X jump', held(['Space']) === Key.jump && held(['KeyZ']) === Key.jump && held(['KeyX']) === Key.jump);
  check('a spent press is not a jump', keyByte({ left: false, right: false, up: false, down: false, fire: true }, false) === 0);
}
finish();
