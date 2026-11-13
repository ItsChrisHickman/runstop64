/**
 * Auf Wiedersehen Monty's ENHANCED quick plane hop, headless (c64kit stood in by games/shared/test/kit.ts). ENHANCED: boarding a
 * plane is a cutscene of about 200 frames in the flight's own sky: his biplane crosses it from the left edge to the right edge, no
 * other plane is shown, the controls are ignored (a press does not leak into the landing), and he lands where a completed
 * flight lands him, a ticket spent, lives and score as they were. ORIGINAL: the full flight (about 2000 frames, the other plane
 * shown), landing in the same place. With an out-dir: the cutscene's first, middle and last frames.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/hop.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import { PLANE_FRAMES } from '../src/enemies';
import { destination, HOP_FRAMES } from '../src/flight';
import type { Game } from '../src/game';
import { TICKET } from '../src/items';
import { run } from '../src/main';
import { State } from '../src/tiles';

useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const program = p.program;
const game = (): Game => must(program.game, 'no game');

const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const px = renderPixels(program);
  const over = renderer.screen.pixels;
  for (let i = 0; i < px.length; i++) if (over[i] !== TRANSPARENT) px[i] = over[i];
  indicesPng(path.join(outDir, `${name}.png`), px, 320, 200);
}

/** Tickets he holds (a count in ENHANCED, hands in ORIGINAL). */
const tickets = (g: Game): number => g.items.tickets + g.items.carried.filter((t) => t === TICKET).length;
/** The sprites the current frame shows, by number. */
const sprites = () => program.capture.sprites;
const plane = () => sprites().filter((s) => s.n === 2 || s.n === 3);

/** The place the first plane of room `room` is: where a completed flight puts him. */
function firstPlane(room: number): { x: number; y: number } {
  const g = game();
  const at = (): { x: number; y: number } | null => {
    const slot = [0, 1, 2, 3].find((s) => g.enemies.frame(s) === PLANE_FRAMES[0]);
    return slot === undefined ? null : { x: g.enemies.x(slot), y: g.enemies.y(slot) };
  };
  return must(at(), `no plane in room ${room}`);
}

tick(120);
tap('Space');
tick(60);
const FROM = 0;
const TO = must(destination(FROM), 'room 0 has a flight');

/** Stand at room 0's plane with a ticket and board with Space (held on, to the end). Returns the state before. */
function board() {
  const g = game();
  g.placeAt({ room: FROM, x: 0xb8, y: 0x68, state: State.Free, step: 0 });
  g.items.give(TICKET);
  tick(6);
  const before = { lives: g.lives, score: JSON.stringify(g.score.digits), tickets: tickets(g), room: g.world.room };
  input.keyDown('Space');
  tick(2);
  return before;
}

// ---- ENHANCED (the default) ---------------------------------------------------------------------------------------
{
  check('ENHANCED (the default): QUICK PLANE HOP is on', p.frontEnd.enhanced && p.frontEnd.assist.hop === true);
  const before = board();
  check('boarding: in the air, a ticket spent', program.flying && tickets(game()) === before.tickets - 1);
  const xs: number[] = [];
  let frames = 0;
  let enemyShown = false, otherShown = false;
  let start = false, middle = false;
  while (program.flying && frames < 1000) {
    const [a] = plane();
    if (a) xs.push(a.x);
    if (sprites().some((s) => s.n === 4 || s.n === 5)) enemyShown = true;
    if (sprites().filter((s) => s.n === 2 || s.n === 3).length !== 2) otherShown = true;
    if (!start && frames === 10) { shot('hop-start'); start = true; }
    if (!middle && frames === HOP_FRAMES / 2) { shot('hop-middle'); middle = true; }
    if (frames === HOP_FRAMES - 35) shot('hop-end');
    // a key and a tap in the sky are ignored
    if (frames === 50) { tap('ArrowLeft'); input.keyDown('ArrowUp'); }
    if (frames === 120) input.keyUp('ArrowUp');
    tick();
    frames++;
  }
  check(`the cutscene lasts about ${HOP_FRAMES} frames (${frames})`, frames >= HOP_FRAMES - 10 && frames <= HOP_FRAMES + 10);
  check('the plane moves left to right the whole way', xs.length > 100 && xs.every((x, i) => i === 0 || x >= (xs[i - 1] ?? 0)) && must(xs[0], 'x') < 30 && must(xs[xs.length - 1], 'x') > 320);
  check('no other plane is shown', !enemyShown && !otherShown);
  tick(4);
  const g = game();
  const where = firstPlane(TO);
  check(`landed in the destination room ${TO} (${g.world.room}) at its plane (${g.monty.x},${g.monty.y} / ${where.x},${where.y})`, g.world.room === TO && g.monty.x === where.x && g.monty.y === where.y);
  check('lives and score are as they were, the ticket is spent once', g.lives === before.lives && JSON.stringify(g.score.digits) === before.score && tickets(g) === before.tickets - 1);
  check(`Space still held: it neither fired nor jumped (state ${g.monty.state})`, g.monty.state === State.Free && !program.flying);
  input.keyUp('Space');
  tick(60);
  check('and the room is saved to carry on from', p.state.roomCount >= 1);
}

// ---- ORIGINAL: the full flight ------------------------------------------------------------------------------------
{
  tap('KeyP'); tick(3); tap('KeyE'); tap('KeyP'); tick(3);
  check('E: ORIGINAL, the hop is off', !p.frontEnd.enhanced && p.frontEnd.assist.hop === false);
  const g = game();
  g.placeAt({ room: FROM, x: 0xb8, y: 0x68, state: State.Free, step: 0 });
  g.items.give(TICKET);
  tick(6);
  const n0 = tickets(g);
  input.keyDown('KeyC');
  tick(2);
  input.keyUp('KeyC');
  let frames = 2, enemy = false;
  while (program.flying && frames < 4000) {
    if (sprites().some((s) => s.n === 4 || s.n === 5)) enemy = true;
    tick();
    frames++;
  }
  tick(4);
  check(`ORIGINAL: the full flight (${frames} frames), the other plane shown`, frames > 1900 && enemy);
  check(`ORIGINAL: one ticket spent (${tickets(g)})`, tickets(g) === n0 - 1);
  const crashed = g.world.room !== TO;
  if (!crashed) {
    const where = firstPlane(TO);
    check('ORIGINAL: landed in the same place as the hop', g.monty.x === where.x && g.monty.y === where.y);
  } else {
    check('ORIGINAL: shot down, back where he boarded (the flight, as it was)', g.world.room === FROM);
  }
}

finish();
