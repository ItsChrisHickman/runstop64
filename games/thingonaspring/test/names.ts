/**
 * Thing on a Spring's high score name ($7A21: ten letters, RETURN puts it in), headless (c64kit
 * stood in by games/shared/test/kit.ts): a game (ORIGINAL) ended with a score for the table (the oil run
 * out with the last life), then the name entered (before CONTINUE?, which follows it)
 *
 *  1. on a phone, through the touch layer (games/shared/test/touchpad.ts: the stick picks each
 *     letter, JUMP puts it in, RET the name; games/shared/letters.ts): the letter under the
 *     cursor drawn there, the line naming the controls under the table, the name in the table;
 *  2. with the keyboard, as it always was (its keys typed straight into the game's entry).
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/test/names.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { touchPad } from '../../shared/test/touchpad';
import { indicesToRgb, renderPixels, rgbPng } from '../../../tools/probe/render';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
stubFetch(fs.readFileSync('games/thingonaspring/assets/toas-title.state'));
const outDir = process.argv[2];

/** The table's names ($77AA + 16 × rank: ten letters, screen codes or PETSCII), as text. */
const tableName = (ram: Uint8Array, rank: number) => Array.from(ram.subarray(0x77aa + rank * 16, 0x77aa + rank * 16 + 10), (b) => { const c = b & 0x3f; return String.fromCharCode(c < 0x20 ? c + 0x40 : c); }).join('');

async function game(score: number[]) {
  store.clear();
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const p = run({ renderer, input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  const ram = () => { const m = p.machine; if (!m) throw new Error('no game yet'); return m.ram; };
  await new Promise((r) => setTimeout(r, 10));
  tick(60);
  input.keyDown('Space'); tick(10); input.keyUp('Space');
  until(() => p.state.playing && ram()[0x63] === 0, 400);
  // (ORIGINAL: in ENHANCED the oil running out is a life lost, not a game over with a score for the table)
  for (const code of ['KeyP', 'KeyE', 'KeyP']) { input.keyDown(code); tick(2); input.keyUp(code); tick(2); }
  if (p.options.enhanced !== false || !p.state.playing) throw new Error('names: ORIGINAL not chosen');
  ram().set(score, 0x364); // (the score's digits)
  // (the oil run out with the last life: game over, then the table asks for the name, before CONTINUE?)
  until(() => { ram()[0x8f] = 0; ram()[0x90] = 0; return p.state.lastWait === 0x79aa || p.state.lastWait === 0x7abd; }, 3000);
  const asked = p.state.prompt === null && !p.state.paused;
  tick(20);
  const picture = (file: string) => {
    if (!outDir) return;
    fs.mkdirSync(outDir, { recursive: true });
    const m = p.machine, under = m ? renderPixels(m) : new Uint8Array(320 * 200);
    // (the machine's picture, our drawing over it, as the front end shows them)
    rgbPng(path.join(outDir, file), indicesToRgb(renderer.screen.pixels.map((v, i) => (v === 0xff ? under[i] : v))), 320, 200, 2);
  };
  return { p, input, renderer, tick, until, ram, asked, picture };
}

// ---- 1. touch ---------------------------------------------------------------------------------------
{
  const t = await game([0, 5, 0, 0, 0, 0]);
  check(`a score of 50000, the oil out: the name is asked for (the entry's key scan: $${(t.p.state.lastWait ?? 0).toString(16)})`, t.asked);
  const pad = touchPad(t.input, t.p.touch, t.tick);
  pad.stick('up', 2, 4); pad.stick('up', 2, 4);
  const hint = t.renderer.screen.pixels.subarray(177 * 320, 185 * 320).filter((v) => v === 7).length;
  // the cursor: column $AE, row $AF (where the entry prints its *)
  const cx = t.ram()[0xae] * 8, cy = t.ram()[0xaf] * 8, s = t.renderer.screen;
  const cell = Array.from({ length: 64 }, (_, i) => s.pixels[(cy + (i >> 3)) * 320 + cx + (i & 7)]);
  check(`touch: the line naming our controls under the table (${hint} yellow pixels), the letter picked (C) in the cursor's place (${cell.filter((v) => v === 7).length} yellow pixels there)`,
    hint > 100 && cell.filter((v) => v === 7).length >= 8);
  t.picture('name-touch-c.png');
  pad.stick('down', 2, 4); pad.stick('down', 2, 4);
  pad.pickName({ alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. ', max: 10, button: { label: 'JUMP', key: 'Space' } }, 'CHRIS 64', 6);
  t.tick(60);
  check(`touch: CHRIS 64 picked with the stick and JUMP, RET: in the table at the top ("${tableName(t.ram(), 0)}")`, tableName(t.ram(), 0) === 'CHRIS 64..');
  t.picture('name-touch-done.png');
  t.until(() => t.p.state.prompt === 'continue', 600);
  check(`touch: then CONTINUE? (${t.p.state.prompt})`, t.p.state.prompt === 'continue');
}

// ---- 2. the keyboard, as ever -----------------------------------------------------------------------
{
  const t = await game([0, 4, 0, 0, 0, 0]);
  check('a score of 40000: the name is asked for', t.asked);
  for (const k of ['KeyB', 'KeyO', 'KeyB', 'Enter']) { t.input.keyDown(k); t.tick(4); t.input.keyUp(k); t.tick(6); }
  t.tick(60);
  check(`keyboard: B O B, RETURN: in the table ("${tableName(t.ram(), 0)}"), no line for touch drawn`, tableName(t.ram(), 0) === 'BOB.......'
    && t.renderer.screen.pixels.subarray(177 * 320, 185 * 320).filter((v) => v === 7).length === 0);
}

finish();
