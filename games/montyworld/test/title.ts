/**
 * Do Svidaniya Monty's own title screen (src/title.ts, title-art.ts), through the front end: the logo, the map from Montos to Rio and
 * its labels, Monty walking the route on a loop, the story scroller, the credits; the C64's limits (one set of 256 characters, the
 * sprites in blocks the bank leaves empty, the palette); nothing of Monty on the Run's title in it; ENTER CONTINUE's row left empty;
 * and the title given back on leaving it. With an out-dir, three frames of it.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/title.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { WORLD } from '../src/data';
import { run } from '../src/main';
import { MapTitle, SPRITE_BLOCKS, STAND, STORY, STRIP_Y, WALK_FRAMES } from '../src/title';
import { buildTitleArt, CREDIT_LINES, glyphOf, MC1, MC2, ROUTE_LENGTH, routeAt, ROWS, STOPS, TAGLINE } from '../src/title-art';
import { savePng } from './shots-kit';

const out = process.argv[2];
useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const g = p.game;
const title = p.title;

// ---- the art within the C64's limits -------------------------------------------------------------------------------
const art = buildTitleArt(WORLD.bankImage);
check(`the logo, the map, the lettering and the scroller's 80 characters take ${art.used} of the set's 256`, art.used <= 256);
check('one set: every character the screen shows is one of 256, and the scroller\'s are the first 80 after the blank', art.screen.every((c) => c < 256) && art.scrollerCodes.length === 80 && art.scrollerCodes[0] === 1);
check('the logo is cut with a light edge (MC1), a dark edge and shadow (MC2) and a body (the cell\'s colour): all three in its cells', [1, 2, 3].every((v) => art.pairs.slice(8 * 160, 64 * 160).some((x) => x === v)));
check('the multicolour colours are white and brown, the cells\' own colours 0-7', MC1 === 1 && MC2 === 9 && [...art.colour].every((c) => c < 16));
check('every colour is the C64\'s (0-15)', art.colour.every((c) => c < 16));
check('the sprite blocks Monty and his hat use are empty in the bank', [...Array(8).keys()].every((i) => WORLD.bankImage.subarray((SPRITE_BLOCKS.monty + i) * 64, (SPRITE_BLOCKS.monty + i) * 64 + 64).every((b) => b === 0)));

// ---- the title is up -------------------------------------------------------------------------------------------------
tick(3);
check('the title is up (Do Svidaniya Monty\'s own, not Monty on the Run\'s)', p.state.mode === 'title' && title instanceof MapTitle);
const letters = new Map<string, string>();
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!-'(") letters.set(glyphOf(WORLD.bankImage, ch).join(','), ch);
const rowText = (r: number) => Array.from(g.mem.subarray(0x800 + r * 40, 0x800 + r * 40 + 40), (c) => letters.get(Array.from(g.mem.subarray(c * 8, c * 8 + 8)).join(',')) ?? ' ').join('').trim();
check(`"${TAGLINE}" is over the logo`, rowText(ROWS.line) === TAGLINE);
const logoCells = (r0: number, r1: number) => { let n = 0; for (let r = r0; r < r1; r++) for (let c = 0; c < 40; c++) if (g.mem[0x800 + r * 40 + c] !== 0) n++; return n; };
check(`the logo's seven rows and the map's six are drawn (${logoCells(1, 8)} and ${logoCells(8, 14)} cells)`, logoCells(1, 8) > 80 && logoCells(8, 14) > 60);
check('in multicolour: the logo and map cells are 8-15, the text cells 0-7', g.vic.multicolourChars && g.col[1 * 40 + 5] >= 8 && g.col[ROWS.credits * 40 + 10] < 8);
CREDIT_LINES.forEach((l, i) => check(`credit: ${l.text}`, rowText(ROWS.credits + i).replace(/[()]/g, '').trim() === l.text.replace(/[()]/g, '').trim()));
check('the credits are the new game\'s, then Peter Harrap\'s, then Gremlin\'s', CREDIT_LINES.map((l) => l.text).join('|') === "A NEW GAME BY CHRISTOPHER HICKMAN|WITH CLAUDE  MUSIC BY ROB HUBBARD|AFTER PETER HARRAP'S MONTY ON THE RUN|(GREMLIN GRAPHICS 1985)");
check('the stops, in order, from Montos to Rio', STOPS.map((s) => s.name).join(' ') === 'MONTOS MOSCOW SIBERIA CHINA JAPAN HAWAII ANDES RIO');
{
  // each stop's name is on the screen, beside its mark and not over the route
  const mapText = Array.from({ length: 6 }, (_, r) => rowText(ROWS.map + r)).join(' ');
  check('every stop is named on the map', STOPS.every((s) => mapText.includes(s.name)));
  for (const l of art.labels) {
    const s = must(STOPS.find((x) => x.name === l.name), 'its stop');
    const mx = Math.floor(s.x / 8), my = Math.floor(s.y / 8);
    const near = l.col <= mx + 1 && l.col + l.name.length - 1 >= mx - 1 && Math.abs(l.row - my) <= 2 && Math.abs(l.row - my) >= 1;
    check(`${l.name} is right above or below its mark (cells ${l.col}-${l.col + l.name.length - 1} row ${l.row}; mark ${mx},${my}) and wholly on the screen`, near && l.col >= 0 && l.col + l.name.length <= 40);
  }
}

// ---- Monty walks the route on a loop ----------------------------------------------------------------------------------
{
  const spot = () => ({ x: g.vic.sprites[0].x - 24 + 12, y: g.vic.sprites[0].y - 50 + 21, on: (g.vic.enable & 3) === 3 });
  const seen: { x: number; y: number }[] = [];
  let backwards = 0, offRoute = 0;
  for (let f = 3; f < WALK_FRAMES + STAND - 2; f++) {
    tick();
    const s = spot();
    if (!s.on) continue;
    const t = Math.min(f, WALK_FRAMES) / WALK_FRAMES, want = routeAt(t);
    if (Math.abs(s.x - want.x) > 6 || Math.abs(s.y - want.y) > 8) offRoute++;
    const last = seen[seen.length - 1];
    if (last && s.x < last.x - 1) backwards++;
    seen.push(s);
  }
  const first = must(seen[0], 'a first sighting'), last = must(seen[seen.length - 1], 'a last sighting');
  check(`Monty starts by Montos (${first.x},${first.y}) and reaches Rio (${last.x},${last.y}) along the route (${Math.round(ROUTE_LENGTH)} px, ${WALK_FRAMES} frames)`, first.x < 60 && last.x > 285);
  check(`his feet stay on the dotted route (${offRoute} frames off it) and he never walks back (${backwards})`, offRoute === 0 && backwards === 0);
  check('he is two sprites (his picture and his hat), hires, in front, not expanded', g.vic.enable === 3 && g.vic.multicolour === 0 && g.vic.priority === 0 && g.vic.expandX === 0);
  tick(10);
  check('after a pause at Rio he is gone for a moment', (g.vic.enable & 3) === 0);
  tick(30);
  check('and he is back at Montos, to walk it again (a loop)', spot().x < 60 && (g.vic.enable & 3) === 3);
}

// ---- the scroller and the strip --------------------------------------------------------------------------------------------
{
  const rowsBlank = (r0: number, r1: number) => { for (let r = r0; r < r1; r++) for (let c = 0; c < 40; c++) if (g.mem[0x800 + r * 40 + c] !== 0) return false; return true; };
  let always = true, scrolled = false;
  let before: string | null = null;
  for (let n = 0; n < 1500; n++) {
    tick();
    if (!rowsBlank(ROWS.scroller + 2, ROWS.credits)) always = false;
    if (n % 50 === 0) { const now = Array.from(g.mem.subarray(1 * 8, 81 * 8)).join(','); if (before !== null && now !== before) scrolled = true; before = now; }
  }
  check(`ENTER CONTINUE's row (y ${STRIP_Y}) and the rows round it stay empty while the scroller runs`, always && STRIP_Y === ROWS.strip * 8);
  check('the story scrolls in two rows of 16-pixel letters under the map', scrolled);
}

// ---- nothing of Monty on the Run's title ---------------------------------------------------------------------------------------
{
  const story = STORY.map((piece) => piece.text).join('');
  check('every letter of the story is in the game\'s lettering (no apostrophe)', [...story].every((c) => c === ' ' || letters.has(glyphOf(WORLD.bankImage, c).join(','))) && STORY.every((piece) => piece.colour < 8));
  const everything = `${story} ${CREDIT_LINES.map((l) => l.text).join(' ')} ${TAGLINE}`;
  const banned = ['MONTY ON THE RUN!', 'MICRO PROJECTS', 'JOINT PRODUCTION', 'SCUDMORE', 'SAM STOAT', 'HELL OF', 'FREEDOM KIT', 'HIGH SCORES', 'HI SCORES', 'WRITTEN BY', 'TONY AND JASON', 'TRIBUTE', 'RUNSTOP64', 'FAN GAME', 'REMAKE', 'SAFETY'];
  const hits = banned.filter((b) => everything.includes(b));
  check(`the scroller and credits have none of Monty on the Run's title (${hits.join(', ') || 'none found'}): no Scudmore story, joint production, high scores, freedom kit, tribute`, hits.length === 0);
  check('the story ends with the thanks, and begins with Montos', story.includes('INTERMOLE HAS FOUND MONTY ON HIS ISLAND OF MONTOS') && story.includes('WITH THANKS TO PETER HARRAP, ROB HUBBARD AND EVERYONE AT GREMLIN'));
  // the picture too: no band of high scores, no kit (rows 6-7 and 21-24 of Monty on the Run's)
  const screenText = Array.from({ length: 25 }, (_, r) => rowText(r)).join(' ');
  check('the screen\'s lettering is only ours', !['HIGH SCORES', 'FREEDOM', 'MONTY ON THE RUN!'].some((b) => screenText.includes(b)));
}

// ---- the picture, three frames ------------------------------------------------------------------------------------------------------
if (out !== undefined) {
  fs.mkdirSync(out, { recursive: true });
  const shot = (name: string) => {
    savePng(out, name, renderer.picture());
  };
  // from the start: Monty a quarter, a half and three quarters of the way
  const fresh = (n: number) => { g.vic.enable = 0; title.start(); tick(n); };
  fresh(Math.round(WALK_FRAMES * 0.2)); shot('title-frame1.png');
  tick(Math.round(WALK_FRAMES * 0.3)); shot('title-frame2.png');
  tick(Math.round(WALK_FRAMES * 0.27)); shot('title-frame3.png');
  check(`pictures written to ${path.basename(out)}`, true);
}

// ---- Space starts a game, and the title is given back --------------------------------------------------------------------------------------
title.start();
tick(5);
input.keyDown('Space'); tick(2); input.keyUp('Space'); tick(80);
check('Space starts a game (as before)', p.state.mode === 'play' && g.roomId === 0);
check('the title\'s sprites and characters are gone: the game\'s lettering and tiles are the bank\'s', (g.vic.enable & 3) !== 3 || g.vic.sprites[0].ptr !== SPRITE_BLOCKS.monty);

finish();
