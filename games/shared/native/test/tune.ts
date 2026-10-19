/**
 * Music tempo: what the front end sends to the speakers on a game's title, against the original's own SID writes (the C64
 * model running the game's code from the same snapshot), nobody pressing anything.
 *
 * The Pendragon games' title tunes are loops that time themselves by counting cycles (a wait for raster line $FF, the work,
 * eight more waits for it): a translation takes no time for the work, the loop comes round to the line it is still on, and the
 * tune plays twice as fast (Blackwyche's notes began every 4.5 frames, the original's every 9; Dragonskulle's every 6, the
 * original's every 12: `NativeHost` alone, `translated` below). Those two games play the tune from the original's own code
 * while the title is up (`titleTune`, native/title-tune.ts); the notes begun (a voice's gate opened) over the same frames, and the
 * writes themselves in order, must be the original's.
 *
 *   nice -n 15 node tools/test.mjs games/shared/native/test/tune.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer, sidLog, type Host } from 'c64kit';
import { C64, unpackState, type SidWrite } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../host';
import { GAMES } from './games';
import { run as runBlackwyche } from '../../../blackwyche/src/main';
import { run as runDragonskulle } from '../../../dragonskulle/src/main';
import { run as runThing } from '../../../thingonaspring/src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../test/browser';
import { check, finish } from '../../test/check';
import { must } from '../../test/must';

const FRAMES = 1500;
/** The first frames: the title sets itself up (and the session starts a frame or two late); not the tune. */
const SKIP = 300;

interface Pair { reg: number; value: number }
const pairs = (frames: readonly SidWrite[][]): Pair[][] => frames.map((w) => w.map((q) => ({ reg: q.reg, value: q.value })));
/** The notes begun: a voice's control register written with its gate open. */
const notes = (frames: Pair[][]) => frames.reduce((n, w) => n + w.filter((q) => (q.reg === 4 || q.reg === 11 || q.reg === 18) && (q.value & 1) === 1).length, 0);
const stream = (frames: Pair[][]) => frames.flatMap((w) => w.map((q) => `${q.reg}=${q.value}`));
/** The longest run of writes the two have the same, whatever the offset between them (the session starts a few frames from the original). */
function longestRun(a: string[], b: string[]) {
  let best = 0;
  for (let s = -300; s <= 300; s++) {
    let run = 0;
    for (let i = 300; i < b.length - 300 && i + s < a.length; i++) {
      if (a[i + s] === b[i]) { run++; if (run > best) best = run; } else run = 0;
    }
  }
  return best;
}

/** What a game's `run` gives that the loop drives. */
interface Session { tick(): void; render(alpha: number): void }
const games: [string, (host: Host) => Session][] = [['blackwyche', runBlackwyche], ['dragonskulle', runDragonskulle], ['thingonaspring', runThing]];
for (const [id, run] of games) {
  const game = must(GAMES[id], `no game ${id}`);
  const bytes = new Uint8Array(fs.readFileSync(game.title));
  const title = unpackState(bytes);

  // the original
  const orig = new C64(); orig.loadState(title);
  const original: SidWrite[][] = [];
  for (let f = 0; f < FRAMES; f++) { orig.keys = []; orig.runFrame(); original.push(orig.sidWrites); }

  // the translation alone (what the title's own code makes of it)
  const host = new NativeHost(game.port, title);
  const translated: SidWrite[][] = [];
  for (let f = 0; f < FRAMES; f++) { host.m.keys = []; host.tick(); translated.push(host.m.sidWrites); }

  // the front end, as the browser runs it
  stubFetch(bytes);
  useMemoryStorage(new Map());
  const input = new Input(nowhere);
  const session = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const shown: SidWrite[][] = [];
  sidLog.record = shown;
  for (let f = 0; f < FRAMES; f++) { input.poll(); session.tick(); session.render(0); }
  sidLog.record = null;

  const o = pairs(original).slice(SKIP), s = pairs(shown).slice(SKIP), t = pairs(translated).slice(SKIP);
  const no = notes(o), ns = notes(s), nt = notes(t);
  console.log(`${id}: notes begun in ${FRAMES - SKIP} frames: original ${no}, the translation alone ${nt}, the front end ${ns}`);
  check(`${id}: the title's tune the front end plays begins as many notes as the original's (${ns} against ${no})`, no > 20 && ns / no > 0.96 && ns / no < 1.04);
  check(`${id}: the same register writes in the same order for long stretches (${longestRun(stream(s), stream(o))} in a row)`, longestRun(stream(s), stream(o)) >= 300);
}

finish();
