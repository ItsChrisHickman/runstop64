/**
 * Do Svidaniya Monty's own title screen (src/title.ts, title-art.ts), through the front end: the logo, the map from Montos to Rio and
 * its labels, Monty walking the route on a loop with Viktor after him (a different turn each loop), the story scroller, the credits; the C64's limits (one set of 256 characters, the
 * sprites in blocks the bank leaves empty, the palette); nothing of Monty on the Run's title in it; ENTER CONTINUE's row left empty;
 * and the title given back on leaving it. With an out-dir, three frames of it and frames of each loop's turn.
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
import { MapTitle, MONTY_BITS, MONTY_HEIGHT, SCENES, SPRITE_BLOCKS, STAND, STORY, STRIP_Y, VIKTOR_BITS, VIKTOR_GAP, WALK_FRAMES } from '../src/title';
import { chaseAt, HIDE_DROP, loopLength, type ChaseAt, type Scene } from '../src/title-chase';
import { buildTitleArt, CREDIT_LINES, glyphOf, MC1, MC2, ROUTE_LENGTH, routeAt, ROWS, SEA, SKY, STOPS } from '../src/title-art';
import { VIKTOR_HEIGHT } from '../src/title-viktor';
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
check('the logo is cut with a light edge (MC1), a dark edge and shadow (MC2) and a body (the cell\'s colour): all three in its cells', [1, 2, 3].every((v) => art.pairs.slice(0, 64 * 160).some((x) => x === v)));
check('the multicolour colours are white and brown, the cells\' own colours 0-7', MC1 === 1 && MC2 === 9 && [...art.colour].every((c) => c < 16));
check('every colour is the C64\'s (0-15)', art.colour.every((c) => c < 16));
check('the sprite blocks Monty, his hat and Viktor use ($30-$4B) are empty in the bank', [...Array(SPRITE_BLOCKS.hiddenHat - SPRITE_BLOCKS.monty + 1).keys()].every((i) => WORLD.bankImage.subarray((SPRITE_BLOCKS.monty + i) * 64, (SPRITE_BLOCKS.monty + i) * 64 + 64).every((b) => b === 0)));

// ---- the title is up -------------------------------------------------------------------------------------------------
tick(3);
check('the title is up (Do Svidaniya Monty\'s own, not Monty on the Run\'s)', p.state.mode === 'title' && title instanceof MapTitle);
const letters = new Map<string, string>();
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!-'(") letters.set(glyphOf(WORLD.bankImage, ch).join(','), ch);
const rowText = (r: number) => Array.from(g.mem.subarray(0x800 + r * 40, 0x800 + r * 40 + 40), (c) => letters.get(Array.from(g.mem.subarray(c * 8, c * 8 + 8)).join(',')) ?? ' ').join('').trim();
check('no tagline over the logo: the logo starts at the top, row 0', Array.from(g.mem.subarray(0x800, 0x828)).some((c) => c !== 0) && !Array.from({ length: 25 }, (_, r) => rowText(r)).join(' ').includes('ADVENTURE'));
check('the screen is black all over (border and background); the sea\'s strip alone is blue, behind the map\'s six rows, and nowhere else', g.vic.border === SKY && g.vic.background === SKY && SKY === 0 && [...Array(200).keys()].every((y) => [0, 160, 319].every((x) => title.backdrop?.pixels[y * 320 + x] === (y >= ROWS.map * 8 && y < (ROWS.map + 6) * 8 ? SEA : SKY))));
check('the front end shows that backdrop under the title', renderer.backdrop !== null && renderer.backdrop === title.backdrop);
const logoCells = (r0: number, r1: number) => { let n = 0; for (let r = r0; r < r1; r++) for (let c = 0; c < 40; c++) if (g.mem[0x800 + r * 40 + c] !== 0) n++; return n; };
check(`the logo's seven rows and the map's six are drawn (${logoCells(0, 7)} and ${logoCells(ROWS.map, ROWS.map + 6)} cells)`, logoCells(0, 7) > 80 && logoCells(ROWS.map, ROWS.map + 6) > 60);
check('in multicolour: the logo and map cells are 8-15, the text cells 0-7', g.vic.multicolourChars && g.col[0 * 40 + 5] >= 8 && g.col[ROWS.credits * 40 + 10] < 8);
CREDIT_LINES.forEach((l, i) => check(`credit: ${l.text}`, rowText(ROWS.credits + i).replace(/[()]/g, '').trim() === l.text.replace(/[()]/g, '').trim()));
check('the credits are the new game\'s, a tribute to Peter Harrap, the music (no Claude in them)', CREDIT_LINES.map((l) => l.text).join('|') === 'A NEW GAME BY CHRISTOPHER HICKMAN|A TRIBUTE TO PETER HARRAP|MUSIC BY ROB HUBBARD');
check('the stops, in order, from Montos to Rio', STOPS.map((s) => s.name).join(' ') === 'MONTOS MOSCOW SIBERIA CHINA JAPAN HAWAII ANDES RIO');
{
  // each stop's name is on the screen, beside its mark and not over the route
  const mapText = Array.from({ length: 6 }, (_, r) => rowText(ROWS.map + r)).join(' ');
  check('every stop is named on the map', STOPS.every((s) => mapText.includes(s.name)));
  for (const l of art.labels) {
    const s = must(STOPS.find((x) => x.name === l.name), 'its stop');
    const mx = Math.floor(s.x / 8), my = Math.floor(s.y / 8);
    const near = l.col <= mx + 5 && l.col + l.name.length - 1 >= mx - 5 && Math.abs(l.row - my) <= 3;
    check(`${l.name} is above or below its mark, near it (clear of where the walkers pass) (cells ${l.col}-${l.col + l.name.length - 1} row ${l.row}; mark ${mx},${my}) and wholly on the screen`, near && l.col >= 0 && l.col + l.name.length <= 40);
  }
}

// ---- Monty walks the route on a loop ----------------------------------------------------------------------------------
{
  const spot = () => ({ x: g.vic.sprites[0].x - 24 + 8, y: g.vic.sprites[0].y - 50 + MONTY_HEIGHT, on: (g.vic.enable & MONTY_BITS) === MONTY_BITS });
  const viktor = () => ({ x: g.vic.sprites[2].x - 24 + 12, y: g.vic.sprites[2].y - 50 + VIKTOR_HEIGHT, on: (g.vic.enable & VIKTOR_BITS) === VIKTOR_BITS });
  let covered = 0, behind = 0, viktorFrames = 0, viktorFirst = '';
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
    // neither figure ever covers a place name (a figure is about 13 x 18 pixels, its feet on the route)
    const hides = (f: { x: number; y: number }) => art.labels.some((l) => f.x + 7 > l.col * 8 && f.x - 7 < (l.col + l.name.length) * 8 && f.y > (ROWS.map + l.row) * 8 && f.y - 18 < (ROWS.map + l.row + 1) * 8);
    const w0 = viktor();
    if (hides(s) || (w0.on && hides(w0))) covered++;
    // Viktor: on the route too, the same distance behind Monty along it (not past him, not on top of him), the same sprite colours each frame
    const w = viktor();
    if (w.on) {
      viktorFrames++;
      if (viktorFrames === 1) viktorFirst = `${w.x},${w.y}`;
      if (w.x > s.x + 1) behind++;
    }
  }
  const first = must(seen[0], 'a first sighting'), last = must(seen[seen.length - 1], 'a last sighting');
  check(`Monty starts by Montos (${first.x},${first.y}) and reaches Rio (${last.x},${last.y}) along the route (${Math.round(ROUTE_LENGTH)} px, ${WALK_FRAMES} frames)`, first.x < 60 && last.x > 285);
  check(`no walker covers a place name (${covered} frames)`, covered === 0);
  check(`his feet stay on the dotted route (${offRoute} frames off it) and he never walks back (${backwards})`, offRoute === 0 && backwards === 0);
  check(`the first loop is the trip: Viktor Vole follows him from Montos (first seen at ${viktorFirst}) to Rio, ${viktorFrames} frames, never ahead of him (${behind})`, SCENES[0]?.name === 'trip' && viktorFrames > WALK_FRAMES * 0.8 && behind === 0);
  check('Viktor is four hires sprites one over the other (coat, star, hat, fur), black, red, grey, orange, with his own sprite blocks', (g.vic.enable & VIKTOR_BITS) === VIKTOR_BITS && [2, 3, 4, 5].every((n, i) => g.vic.sprites[n].colour === [0, 2, 12, 8][i] && g.vic.sprites[n].ptr >= SPRITE_BLOCKS.viktor && g.vic.sprites[n].ptr < SPRITE_BLOCKS.viktor + 8));
  check('he is two sprites (his picture and his hat), hires, in front, not expanded', (g.vic.enable & MONTY_BITS) === MONTY_BITS && g.vic.multicolour === 0 && g.vic.priority === 0 && g.vic.expandX === 0);
  tick(10);
  check('after a pause at Rio, he and Viktor are gone for a moment', (g.vic.enable & (MONTY_BITS | VIKTOR_BITS)) === 0);
  tick(30);
  check('and he is back at Montos, to walk it again (a loop)', spot().x < 60 && (g.vic.enable & 3) === 3);
}

// ---- each loop's turn, in the choreography (title-chase.ts) ---------------------------------------------------------------
{
  const frames = (sc: Scene) => Array.from({ length: loopLength(sc) }, (_, f) => ({ f, at: chaseAt(sc, f) })).filter((x): x is { f: number; at: ChaseAt } => x.at !== null);
  check('the loops take the three turns in order: Viktor trips, Monty hides, Viktor overtakes', SCENES.map((sc) => sc.name).join(' ') === 'trip duck overtake');
  for (const sc of SCENES) {
    const all = frames(sc), end = must(all[all.length - 1], 'a last frame').at;
    let backwards = 0, last = 0;
    for (const { at } of all) { if (at.monty.d < last - 0.01) backwards++; last = at.monty.d; }
    check(`${sc.name}: Monty never walks back (${backwards}), reaches Rio and stands there with Viktor ${VIKTOR_GAP} pixels behind him`, backwards === 0 && Math.abs(end.monty.d - ROUTE_LENGTH) < 0.01 && end.viktor !== null && Math.abs(end.monty.d - end.viktor.d - VIKTOR_GAP) < 0.5);
  }
  const [tripS, duckS, overS] = SCENES;
  {
    const f = frames(must(tripS, 'the trip'));
    const lying = f.filter((x) => x.at.viktor?.fallen === true);
    const flies = f.filter((x) => x.at.viktor?.fallen === true && x.at.viktor.hat !== null && x.at.viktor.hat.lift > 0);
    const gap = Math.max(...f.map((x) => x.at.monty.d - (x.at.viktor?.d ?? x.at.monty.d)));
    const ahead = f.filter((x) => x.at.viktor !== null && x.at.viktor.d > x.at.monty.d - 12).length;
    check(`trip: Viktor lies flat ${lying.length} frames, his hat is knocked off ahead of him (${flies.length} frames); Monty gets ${Math.round(gap)} pixels ahead and Viktor runs to catch up, never closer than a few steps (${ahead})`, lying.length > 30 && flies.length > 3 && gap > VIKTOR_GAP + 30 && ahead === 0 && f.some((x) => x.at.viktor?.running === true));
  }
  {
    const f = frames(must(duckS, 'the hiding'));
    const hidden = f.filter((x) => x.at.monty.drop >= HIDE_DROP);
    const past = hidden.filter((x) => (x.at.viktor?.d ?? 0) > x.at.monty.d + 20);
    const looks = hidden.filter((x) => x.at.viktor?.facing === 'west');
    const ahead = f.filter((x) => x.at.monty.drop === 0 && x.at.viktor !== null && x.at.viktor.d > x.at.monty.d - 12).length;
    check(`duck: Monty is down behind the names ${hidden.length} frames; Viktor runs past him (${past.length}) and looks back (${looks.length}); on the route Viktor is never on him (${ahead})`, hidden.length > 100 && past.length > 30 && looks.length > 30 && ahead === 0);
  }
  {
    const f = frames(must(overS, 'the overtaking'));
    const ahead = f.filter((x) => x.at.viktor !== null && x.at.viktor.d > x.at.monty.d + 12);
    const facesHim = ahead.filter((x) => x.at.viktor?.facing === 'west');
    const backs = f.filter((x) => x.at.viktor !== null && x.at.viktor.facing === 'east' && x.at.viktor.moving && (chaseAt(must(overS, 'it'), x.f + 1)?.viktor?.d ?? 0) < x.at.viktor.d);
    check(`overtake: Viktor gets ahead of Monty (${ahead.length} frames), turns to look at him (${facesHim.length}), then backs off past him (${backs.length} frames backwards)`, ahead.length > 40 && facesHim.length > 20 && backs.length > 30);
  }
}

// ---- drawn: nobody covers a name over three loops; Monty behind the names shows only what is above them ---------------------------------
{
  title.start();
  const rects = art.labels.map((l) => ({ x0: l.col * 8, x1: (l.col + l.name.length) * 8, y0: (ROWS.map + l.row) * 8, y1: (ROWS.map + l.row + 1) * 8 }));
  let covered = 0, peeks = 0, hiddenFrames = 0, whole = 0;
  const cut: number[] = [];
  const total = SCENES.reduce((n, sc) => n + loopLength(sc), 0);
  for (let n = 0; n < total; n++) {
    tick();
    let montyLit = 0;
    for (let i = 0; i < 6; i++) {
      if (!(g.vic.enable & (1 << i))) continue;
      const sp = g.vic.sprites[i], sx = sp.x - 24, sy = sp.y - 50;
      for (let r = 0; r < 21; r++) for (let c = 0; c < 24; c++) {
        if (!((g.mem[sp.ptr * 64 + r * 3 + (c >> 3)] ?? 0) & (0x80 >> (c & 7)))) continue;
        if (i < 2) montyLit++;
        if (rects.some((q) => sx + c >= q.x0 && sx + c < q.x1 && sy + r >= q.y0 && sy + r < q.y1)) covered++;
      }
    }
    if (g.vic.sprites[0].ptr === SPRITE_BLOCKS.hidden && (g.vic.enable & 1)) cut.push(montyLit); else whole = Math.max(whole, montyLit);
  }
  hiddenFrames = cut.length; peeks = cut.filter((n) => n > 0 && n < whole / 2).length;
  check(`no sprite pixel is drawn over a place name in the three loops (${covered})`, covered === 0);
  check(`behind JAPAN and ANDES only a little of Monty shows (his hat and eyes) (under half of him) in ${peeks} of the ${hiddenFrames} frames he is cut`, hiddenFrames > 100 && peeks > 100);
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
  const everything = `${story} ${CREDIT_LINES.map((l) => l.text).join(' ')}`;
  const banned = ['MONTY ON THE RUN!', 'MICRO PROJECTS', 'JOINT PRODUCTION', 'SCUDMORE', 'SAM STOAT', 'HELL OF', 'FREEDOM KIT', 'HIGH SCORES', 'HI SCORES', 'WRITTEN BY', 'TONY AND JASON', 'RUNSTOP64', 'FAN GAME', 'REMAKE', 'SAFETY', 'CLAUDE', 'MONTY MOLE ADVENTURE'];
  const hits = banned.filter((b) => everything.includes(b));
  check(`the scroller and credits have none of Monty on the Run's title (${hits.join(', ') || 'none found'}): no Scudmore story, joint production, high scores, freedom kit, Claude`, hits.length === 0);
  check('the story is Chris\'s: Intermole finds him, he flees east, the Russian operative Viktor Vole on his trail (2026-11-27), Moscow to Rio, good luck; and no thanks line', story.replace(/ +/g, ' ').trim() === 'INTERMOLE HAS FOUND MONTY ON MONTOS... MONTY FLEES EAST... BUT RUSSIAN OPERATIVE VIKTOR VOLE IS HOT ON HIS TRAIL... THE LONG WAY ROUND: MOSCOW TO RIO... GOOD LUCK!' && !story.includes('THANKS'));
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
  // each loop's turn: the frames picked from the choreography
  let offset = 0;
  for (const sc of SCENES) {
    const pick = (what: string, test: (at: ChaseAt) => boolean, after = 0) => {
      for (let f = 0; f < loopLength(sc); f++) {
        const at = chaseAt(sc, f);
        if (at !== null && test(at)) { fresh(offset + f + after); shot(`title-${sc.name}-${what}.png`); return; }
      }
      check(`${sc.name}: no frame for ${what}`, false);
    };
    if (sc.name === 'trip') {
      pick('1-falls', (a) => a.viktor?.fallen === true, 4);
      pick('2-down', (a) => a.viktor?.fallen === true, 30);
      pick('3-gets-hat', (a) => a.viktor !== null && !a.viktor.fallen && a.viktor.hat !== null && a.viktor.moving);
      pick('4-runs', (a) => a.viktor?.running === true, 10);
    } else if (sc.name === 'duck') {
      pick('1-ducks', (a) => a.monty.drop > 8);
      pick('2-runs-past', (a) => a.monty.drop >= HIDE_DROP && (a.viktor?.d ?? 0) > a.monty.d + 10);
      pick('3-looks-back', (a) => a.viktor?.facing === 'west', 10);
      pick('4-comes-out', (a) => a.monty.drop > 4 && a.monty.drop < HIDE_DROP - 6 && a.viktor?.facing === 'west');
    } else {
      pick('1-passes', (a) => a.viktor !== null && a.viktor.d > a.monty.d - 4);
      pick('2-ahead', (a) => a.viktor !== null && !a.monty.moving && a.viktor.d > a.monty.d + 12, 4);
      pick('3-looks', (a) => a.viktor?.facing === 'west', 10);
      pick('4-backs-off', (a) => a.viktor !== null && a.viktor.facing === 'east' && a.viktor.moving && !a.viktor.running && a.monty.moving && a.viktor.d > a.monty.d + 4 && a.viktor.d < a.monty.d + 16);
    }
    offset += loopLength(sc);
  }
  check(`pictures written to ${path.basename(out)}`, true);
}

// ---- Space starts a game, and the title is given back --------------------------------------------------------------------------------------
title.start();
tick(5);
input.keyDown('Space'); tick(2); input.keyUp('Space'); tick(80);
check('Space starts a game (as before)', p.state.mode === 'play' && g.roomId === 0);
check('the title\'s sprites and characters are gone: the game\'s lettering and tiles are the bank\'s, and the sea is gone from behind the picture', renderer.backdrop === null && (g.vic.enable & 3) !== 3 || g.vic.sprites[0].ptr !== SPRITE_BLOCKS.monty);

finish();
