/**
 * Crossing from one region's version of the tune to another's while Monty plays (games/montyworld/src/music/crossing.ts,
 * packages/c64kit/src/sid/crossing.ts): the song carries on and only the version changes, at a phrase of the song, with the SID's
 * master volume dipping over the beat before and swelling over the beat after. Checked:
 *
 * - every version has the song's order and every pattern's length the original's (so a position in one is the same position in all);
 * - the plan: phrases are bars, and a crossing waits for a phrase unless it is further than four seconds off, then for a bar;
 * - Moscow to Siberia and back: the writes to the SID before the boundary are the old version's own, from the boundary they are the
 *   new version's own, frame for frame (so the song did not restart and the version changed at the boundary), the boundary is at
 *   a phrase, and the loop comes round the same;
 * - the volume: full until the beat before, silent at the boundary, full again a beat after; none of it with no dip (`phrase`, `cut`);
 * - the world gives the session this plan (the session crosses only from one version to another: the first room's start, and the title's
 *   return to the original, start the tune again; test/walk.ts holds the first).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-crossing.ts
 */
import fs from 'node:fs';
import { moveGain, pickBoundary, type CrossingPlan } from '../../../packages/c64kit/src/sid/crossing';
import { parsePsid, SidTune } from '../../../packages/c64kit/src/sid/psid';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { crossingPlan, type CrossingStyle } from '../src/music/crossing';
import { ANDES } from '../src/music/andes';
import { CHINA } from '../src/music/china';
import { JAPAN } from '../src/music/japan';
import { MOSCOW } from '../src/music/moscow';
import { PACIFIC } from '../src/music/pacific';
import { patternTicks, TuneImage } from '../src/music/hubbard';
import { GAME_SONG, retune } from '../src/music/region-tune';
import { RIO } from '../src/music/rio';
import { SIBERIA } from '../src/music/siberia';

const original = Uint8Array.from(fs.readFileSync('games/montyotr/assets/monty_on_the_run.sid'));
const moscow = retune(original, MOSCOW);
const siberia = retune(original, SIBERIA);
/** The test's sample rate is low: a frame is a few dozen samples, so the 6502 and the crossing run as in the game and the SID does little. */
const RATE = 2000;

const psid = (file: Uint8Array) => parsePsid(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const equal = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---- every version has the original's order and lengths -------------------------------------------
{
  const was = new TuneImage(original);
  const order = JSON.stringify(was.voices(GAME_SONG));
  const lengths = (image: TuneImage) => was.voices(GAME_SONG).flat().map((p) => patternTicks(image.readPattern(p).events));
  const wanted = lengths(was);
  const versions = [MOSCOW, SIBERIA, CHINA, JAPAN, PACIFIC, ANDES, RIO];
  check(`all ${versions.length} regions' versions keep the song's order and every pattern's length: a position in one is the same in all`,
    versions.every((t) => { const image = new TuneImage(retune(original, t)); return JSON.stringify(image.voices(GAME_SONG)) === order && equal(lengths(image), wanted); }));
}

// ---- the plan -------------------------------------------------------------------------------------
const plan = crossingPlan(original);
{
  check(`the loop is 8768 ticks of two frames (${plan.loopFrames} frames), ${plan.phrases.length} phrases and ${plan.bars.length} bars in it`, plan.loopFrames === 17536 && plan.phrases.length > 10 && plan.bars.length === 274);
  check('every phrase is a bar line, in order', plan.phrases.every((p, i) => plan.bars.includes(p) && (i === 0 || p > (plan.phrases[i - 1] ?? 0))));
  check('the dip is a beat (16 frames) each way, the wait at most four seconds', plan.fadeOutFrames === 16 && plan.fadeInFrames === 16 && plan.maxWaitFrames === 200);
  let bad = 0, phrased = 0, barred = 0;
  for (let now = 0; now < 2 * plan.loopFrames; now += 7) {
    const at = pickBoundary(plan, now);
    const into = at % plan.loopFrames;
    const lead = plan.fadeOutFrames + Math.ceil(into / 60) + 2;
    const onPhrase = plan.phrases.includes(into);
    if (at - now < lead) bad++;
    else if (onPhrase && at - now <= plan.maxWaitFrames) phrased++;
    else if (plan.bars.includes(into)) {
      barred++;
      // a bar only when no phrase within the wait could be had
      const sooner = plan.phrases.some((p) => [0, 1].some((l) => { const f = Math.floor(now / plan.loopFrames) * plan.loopFrames + l * plan.loopFrames + p; return f - now >= plan.fadeOutFrames + Math.ceil(p / 60) + 2 && f - now <= plan.maxWaitFrames; }));
      if (sooner) bad++;
    } else bad++;
  }
  check(`asked at any frame of two loops, a crossing takes the next phrase within four seconds (${phrased} asks) or else the next bar (${barred}), never too soon to fade (${bad} wrong)`, bad === 0 && phrased > 0 && barred > 0);
  const cut = crossingPlan(original, 'cut'), phrase = crossingPlan(original, 'phrase');
  check('the comparison styles: cut crosses at a bar with no dip, phrase at a phrase with no dip', cut.fadeOutFrames === 0 && cut.phrases.length === cut.bars.length && phrase.fadeOutFrames === 0 && phrase.phrases.length === plan.phrases.length);
  check('the dip eases the gain down and back', moveGain(plan, 1, 0) < 1 && moveGain(plan, 0, 1) > 0 && Array.from({ length: 16 }).reduce<number>((g) => moveGain(plan, g, 0), 1) === 0 && Array.from({ length: 16 }).reduce<number>((g) => moveGain(plan, g, 1), 0) > 0.999);
}

// ---- streams: what the player writes to the SID, by frame ------------------------------------------
interface Write { readonly frame: number; readonly reg: number; readonly value: number }
const key = (w: Write) => `${w.frame}:${w.reg}:${w.value}`;

/** A tune started, with every write the player makes; run for `frames` frames. */
function started(file: Uint8Array) {
  const tune = new SidTune(psid(file), RATE);
  tune.start(GAME_SONG + 1);
  const writes: Write[] = [];
  tune.onWrite = (frame, reg, value) => { writes.push({ frame, reg, value }); };
  return { tune, writes };
}
/** Render to a frame count (a frame is `RATE / 50` samples). */
function runTo(tune: SidTune, frame: number) {
  const out = new Float32Array(RATE / 50);
  while (tune.frames < frame) tune.render(out);
}
const own = (file: Uint8Array, frames: number) => { const s = started(file); runTo(s.tune, frames); return s.writes; };
const between = (writes: readonly Write[], from: number, to: number) => writes.filter((w) => w.frame >= from && w.frame < to).map(key);

{
  // the loop comes round with the same gates (what is not the same on the second lap is the drums' pitch and the pulse width, which the
  // driver keeps from the lap before: a version crossed to in a later lap starts those as the first lap has them, which nothing can hear)
  const two = own(moscow, 2 * plan.loopFrames);
  const gates = (n: number) => two.filter((w) => (w.reg === 4 || w.reg === 11 || w.reg === 18) && w.frame >= n * plan.loopFrames && w.frame < (n + 1) * plan.loopFrames).map((w) => `${w.frame - n * plan.loopFrames}:${w.reg}:${w.value}`);
  check(`the song's loop comes round with the same gates on every frame (${gates(0).length} gate writes a lap)`, equal(gates(0), gates(1)));
}

/** Cross at the frame `at` the request is made, from `from` to `to`, with `style`; run on past the boundary. */
function cross(from: Uint8Array, to: Uint8Array, at: number, style: CrossingStyle, after = 400) {
  const p = crossingPlan(original, style);
  const { tune, writes } = started(from);
  const volume: { frame: number; value: number }[] = [];
  const write = tune.sid.write.bind(tune.sid);
  tune.sid.write = (reg: number, value: number) => { if (reg === 0x18) volume.push({ frame: tune.frames, value }); write(reg, value); };
  runTo(tune, at);
  tune.crossTo(psid(to), p);
  const target = pickBoundary(p, at);
  runTo(tune, target + after);
  return { tune, writes, volume, target, plan: p };
}

for (const style of ['dip', 'phrase', 'cut'] as const) {
  const asked = 1000;
  const run = cross(moscow, siberia, asked, style);
  const { target } = run;
  const lap = run.plan.loopFrames;
  check(`${style}: the boundary is at frame ${target} (${((target - asked) / 50).toFixed(1)} s on), ${run.plan.phrases.includes(target % lap) ? 'a phrase' : 'a bar'} of the song (a phrase if one is within four seconds)`,
    target > asked && (style === 'cut' ? run.plan.bars : [...run.plan.phrases, ...run.plan.bars]).includes(target % lap) && target - asked <= 264);
  check(`${style}: up to the boundary the writes are Moscow's own, frame for frame (the song did not start again)`,
    equal(between(run.writes, 0, target), between(own(moscow, target), 0, target)));
  const siberiaOwn = own(siberia, target + 400);
  check(`${style}: from the boundary the writes are Siberia's own from that place in its song, frame for frame (${between(run.writes, target, target + 400).length} writes over 400 frames)`,
    equal(between(run.writes, target, target + 400), between(siberiaOwn, target, target + 400)) && between(run.writes, target, target + 400).length > 100);
  check(`${style}: the position is kept: the frame count never went back`, run.tune.frames >= target + 400);
  // the volume: the last value set in each frame, by nibble
  const level = (frame: number) => run.volume.filter((v) => v.frame === frame).map((v) => v.value & 15).pop();
  const full = level(target - 40) ?? 15;
  if (style === 'dip') {
    check(`dip: full volume (${full}) until the beat before, silent at the boundary, full again a beat after`,
      full > 0 && level(target - plan.fadeOutFrames - 2) === full && level(target - 1) === 0 && (level(target) ?? 99) <= 1 && level(target + plan.fadeInFrames + 1) === full);
    check('dip: it falls and swells in steps, never louder than the song', Array.from({ length: 16 }, (_, i) => level(target - 16 + i) ?? 0).every((v, i, a) => i === 0 || v <= (a[i - 1] ?? 0)) && Array.from({ length: 16 }, (_, i) => level(target + i) ?? 0).every((v, i, a) => i === 0 || v >= (a[i - 1] ?? 0)) && run.volume.every((v) => (v.value & 15) <= full));
  } else {
    check(`${style}: no dip, the volume stays at ${full}`, run.volume.every((v) => (v.value & 15) === full));
  }
}

{
  // and back: Moscow to Siberia at a phrase, then Siberia to Moscow (asked a bar after), the loop's position kept all the way
  const p = crossingPlan(original);
  const { tune, writes } = started(moscow);
  runTo(tune, 3000);
  tune.crossTo(psid(siberia), p);
  const there = pickBoundary(p, 3000);
  runTo(tune, there + 100);
  tune.crossTo(psid(moscow), p);
  const back = pickBoundary(p, there + 100);
  runTo(tune, back + 300);
  check(`there and back: Moscow until ${there}, Siberia until ${back}, Moscow from ${back}, each its own stream at its own place`,
    equal(between(writes, 0, there), between(own(moscow, there), 0, there))
    && equal(between(writes, there, back), between(own(siberia, back), there, back))
    && equal(between(writes, back, back + 300), between(own(moscow, back + 300), back, back + 300)));
  // changing the mind before the boundary: asked for Siberia, then Moscow again before it takes place, nothing changes
  const keep = started(moscow);
  runTo(keep.tune, 3000);
  keep.tune.crossTo(psid(siberia), p);
  runTo(keep.tune, 3040);
  keep.tune.crossTo(psid(moscow), p);
  runTo(keep.tune, there + 300);
  check('asked for Siberia and then Moscow again before the boundary, Moscow plays on as it was', equal(between(keep.writes, 0, there + 300), between(own(moscow, there + 300), 0, there + 300)));
}

// ---- the world gives the session the plan -----------------------------
{
  const make = WORLD.music.crossing;
  const made: CrossingPlan | undefined = make?.(original);
  check('the world has a crossing, the dip, made from the .sid', made !== undefined && made.fadeOutFrames === 16 && JSON.stringify(made) === JSON.stringify(plan));
}

finish();
