/**
 * The rebuilt picture (src/display.ts) against the original's screen, in lockstep (test/picture-core.ts says how): random players in
 * every room, with the scripts shaken, at the exits, and the bot (test/players.ts) playing room 2, room 5 and the whole game.
 *
 * Bots: 0 none; 1 the whole game, from the recorded keys (test/demos.ts: it passes through rooms 2 and 5 too); 2 the bot planning
 * live, in room 2, in room 5 and through the whole game (the slow set).
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/picture.ts [random-passes-per-room] [shaken-runs-per-room] [passes-per-shaken-run] [bots 0|1|2] [placements-per-tile-kind] [passes-per-placement]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';
import { ROOM_SIZE } from '../src/data';
import { A, MAP_START, mulberry, Run, Tally } from './lockstep-core';
import { PictureTally, SpriteInks, watchPicture } from './picture-core';
import { SPRITE_INK } from '../src/look';
import { replayOf } from './demos';
import { Player } from './players';
import { RandomPlayer } from './random-player';
import { shake, shakeExit } from './shake';

const [randomArg = '600', shakenArg = '2', shakenPassesArg = '200', botsArg = '1', placementsArg = '2', placementPassesArg = '40'] = process.argv.slice(2);
const STATES = 'games/moley/build';
const tally = new Tally();
const pictures = new PictureTally();
const inks = new SpriteInks();
const parts: { name: string; passes: number; different: number }[] = [];
let mark = { passes: 0, different: 0 };
const part = (name: string): void => {
  parts.push({ name, passes: pictures.passes - mark.passes, different: pictures.differentPasses - mark.different });
  mark = { passes: pictures.passes, different: pictures.differentPasses };
};
const t0 = Date.now();

for (let room = 0; room <= 5; room++) {
  for (let k = 0; k < 2; k++) {
    const rnd = mulberry(1000 * room + k + 1);
    const run = new Run(tally, `${STATES}/room${room}.state`, `random room ${room}.${k}`, rnd() < 0.5);
    watchPicture(run, pictures, run.label, inks);
    run.play(new RandomPlayer(rnd), Math.ceil(Number(randomArg) / 2));
  }
}
part('random players');

for (let room = 0; room <= 5; room++) {
  for (let k = 0; k < Number(shakenArg); k++) {
    const rnd = mulberry(50000 + room * 100 + k);
    const run = new Run(tally, `${STATES}/room${room}.state`, `shaken room ${room} #${k}`, rnd() < 0.5, (mem) => { shake(mem, room, rnd); if (rnd() < 0.3) mem[A.lives] = 0; });
    watchPicture(run, pictures, run.label, inks);
    run.play(new RandomPlayer(rnd), Number(shakenPassesArg));
  }
  for (let k = 0; k < 3; k++) {
    const rnd = mulberry(90000 + room * 100 + k);
    const run = new Run(tally, `${STATES}/room${room}.state`, `exit of room ${room} #${k}`, rnd() < 0.5, (mem) => shakeExit(mem, room, rnd));
    watchPicture(run, pictures, run.label, inks);
    run.play(new RandomPlayer(rnd), 120);
  }
}
part('shaken players and the exits');

// Monty placed round each kind of tile of each room (as test/lockstep.ts does): sprites over every tile
for (let room = 0; room <= 5; room++) {
  const file = `${STATES}/room${room}.state`;
  const original = new Spectrum(readRom());
  unpackState(original, new Uint8Array(fs.readFileSync(file)));
  const map = original.mem.slice(MAP_START + room * ROOM_SIZE, MAP_START + room * ROOM_SIZE + ROOM_SIZE);
  const cells = new Map<number, number[]>();
  map.forEach((t, i) => { const list = cells.get(t) ?? []; list.push(i); cells.set(t, list); });
  const rnd = mulberry(7000 + room);
  for (const [tile, list] of [...cells].sort((a, b) => a[0] - b[0])) {
    for (let k = 0; k < Number(placementsArg); k++) {
      const cell = list[Math.floor(rnd() * list.length)];
      const col = cell & 31, row = cell >> 5;
      const kind = rnd();
      const place = {
        x: Math.max(2, Math.min(0xee, col * 8 + Math.floor(rnd() * 24) - 16)),
        y: Math.max(0, Math.min(0x78, row * 8 + Math.floor(rnd() * 32) - 24)),
        state: kind < 0.6 ? 0 : kind < 0.82 ? 2 : kind < 0.94 ? 1 : kind < 0.98 ? 3 : 4,
        phase: Math.floor(rnd() * 24),
        jumpKeys: [0, 1, 2, 16, 17, 18][Math.floor(rnd() * 6)],
        gauge: rnd() < 0.2 ? Math.floor(rnd() * 3) : 0x7f,
      };
      const prng = mulberry(100000 + room * 1000 + tile * 7 + k);
      if (process.env.ONLY !== undefined && process.env.ONLY !== `room ${room} tile $${tile.toString(16)} #${k}`) continue;
      const run = new Run(tally, file, `room ${room} tile $${tile.toString(16)} #${k}`, prng() < 0.5, (mem) => {
        mem[A.x] = place.x; mem[A.y] = place.y; mem[A.state] = place.state; mem[A.phase] = place.phase; mem[A.jumpKeys] = place.jumpKeys; mem[A.gauge] = place.gauge;
      });
      watchPicture(run, pictures, run.label, inks);
      run.play(new RandomPlayer(prng), Number(placementPassesArg));
    }
  }
}
part('Monty placed round every kind of tile');

if (botsArg !== '0') {
  const live = botsArg === '2';
  const atStart = (x: number, y: number) => (mem: Uint8Array): void => {
    mem[A.x] = x; mem[A.y] = y; mem[A.state] = 0; mem[A.phase] = 0; mem[A.gauge] = 0x7f; mem[A.lives] = 5;
  };
  if (live) {
    const r2 = new Run(tally, `${STATES}/room2.state`, 'bot room 2', false, atStart(0x04, 0x68));
    watchPicture(r2, pictures, r2.label, inks);
    r2.play(new Player(), 6000, (g) => g.room !== 2);
    part('the bot in room 2');
    const r5 = new Run(tally, `${STATES}/room5.state`, 'bot room 5', false, atStart(0x28, 0x70));
    watchPicture(r5, pictures, r5.label, inks);
    r5.play(new Player(), 8000);
    part('the bot in room 5');
  }
  const all = new Run(tally, `${STATES}/play.state`, 'bot whole game', false, atStart(0x04, 0x64));
  watchPicture(all, pictures, all.label, inks);
  all.play(live ? new Player() : replayOf('game'), 14000);
  part('the bot, the whole game');
}

const f = pictures.frames;
const frameTotal = f.new + f.old + f.torn + f.different + f.transition;
console.log(`   ${pictures.passes} passes compared (${pictures.skipped} more skipped: a shaken entity showed a frame the original's interrupt table sits on) in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${parts.map((p) => `${p.name} ${p.passes} (${p.different} differ)`).join(', ')}`);
console.log(`   ${frameTotal} frames the original showed: ${f.new} the pass's new picture, ${f.old} the one before (not drawn yet), ${f.torn} torn between them, ${f.different} different, ${f.transition} in a pass that entered a room or lost a life`);
console.log(`   ${pictures.windows} passes with a death or a time-out: ${pictures.shots} pictures it shows (Monty's three, none, the face going, the dial flashing), ${pictures.shots} frames in all, ${pictures.shotsEqual} of them found in order among the original's frames; ${pictures.windowsExact} of the ${pictures.windows} passes fit entirely, ${pictures.windowsSlack} but for one frame (the death sound holds the screen for 2 or 3)`);
console.log(`   logic: ${tally.passes} passes, ${tally.mismatches} differences; ${tally.deaths} deaths, ${tally.roomChanges} room changes, ${tally.endings} endings, ${tally.gameOvers} game overs`);
if (pictures.where.size > 0) console.log(`   where passes differ: ${[...pictures.where].map(([k, n]) => `${k} ${n}`).join(', ')}`);
for (const line of pictures.oddShots) console.log(`   odd shot ${line}`);
for (const line of pictures.oddFrames) console.log(`   odd frame ${line}`);
for (const line of pictures.first) console.log(`   ${line}`);
check(`every pass: the rebuilt picture equals the original's screen, bitmap and attributes (${pictures.differentPasses} of ${pictures.passes} passes differ)`, pictures.differentPasses === 0);
check(`every frame the original showed is the pass's new picture, the one before, or a mix of the two (${f.different} of ${frameTotal - f.transition} are not)`, f.different === 0);
check(`every death and every time-out: the pictures it shows are the original's frames, in order (${pictures.windowsExact} of ${pictures.windows} passes entirely, ${pictures.windowsSlack} but for the sound's third frame)`, pictures.windowsExact + pictures.windowsSlack === pictures.windows && pictures.windowsSlack * 20 <= pictures.windows);
const white = inks.share(SPRITE_INK), dominant = inks.dominant().filter(([, , n]) => n >= 500);
check(`the colour of sprites in ENHANCED (bright white) is the one the original usually shows: ${((100 * white.of) / Math.max(1, white.total)).toFixed(1)} % of ${white.total} sprite pixels, and the dominant colour of ${dominant.filter(([, ink]) => ink === SPRITE_INK).length} of ${dominant.length} pictures`, white.of > 0.9 * white.total && dominant.every(([, ink]) => ink === SPRITE_INK));
check(`the logic stayed equal (${tally.mismatches} differences)`, tally.mismatches === 0);
finish();
