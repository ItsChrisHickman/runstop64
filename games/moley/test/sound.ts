/**
 * The sound object the front end drives (src/sound.ts), no original needed: on c64kit's stand-in audio player, which remembers what it
 * was asked. The effects are made when the audio unlocks and the music is given and started; effects are queued one after another
 * (the original blocks while one plays) and not played muted; the death's and the time-out noise's sounds wait for the step that
 * holds the picture for them; a pass's effects play once however many steps follow it; and in a real flow run until the time runs
 * out, the death sounds after the dial's 55 frames and not at the pass.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/sound.ts
 */
import { AyPlayer, ayClock, ayLog } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { effectSeconds, EFFECT_IDS } from '../src/beeper';
import { MoleyFlow } from '../src/flow';
import { Key } from '../src/monty';
import { MUSIC_SECONDS, MUSIC_STEP_HZ, MUSIC_STEPS } from '../src/music';
import { SeededRandom } from '../src/random';
import { MoleySound } from '../src/sound';

const reset = (): void => {
  ayLog.tune = null; ayLog.playing = false; ayLog.samples.length = 0; ayLog.played.length = 0; ayLog.held = false;
  ayClock.now = 0;
};

// ---- unlocking and the music --------------------------------------------------------------------------------------
{
  reset();
  const sound = new MoleySound(new AyPlayer());
  sound.effect(2);
  check('nothing sounds before the audio is unlocked', !sound.unlocked && ayLog.played.length === 0 && ayLog.tune === null);
  await sound.unlock();
  check('unlocking makes the five effects at the audio\'s sample rate', ayLog.samples.length === 5 && EFFECT_IDS.join() === '0,1,2,3,5' && ayLog.samples.every((s) => s.length > 50));
  check('the effects are as long as the original\'s (44 ms death, 265 ms noise, 30 ms pickup)', [0, 1, 2].every((id, i) => Math.abs((ayLog.samples[i]?.length ?? 0) / 48000 - effectSeconds(id)) < 0.001) && Math.abs(effectSeconds(1) - 0.265) < 0.001);
  check('it gives the music (the stream, at 25.01 steps a second) and starts it, on by default', ayLog.tune !== null && ayLog.tune.bytes > 40000 && ayLog.tune.bytes < 60000 && Math.abs(ayLog.tune.rate - 25.0105) < 0.001 && ayLog.playing);
  check(`one pass of the tune is ${MUSIC_STEPS} steps, ${MUSIC_SECONDS.toFixed(1)} s (6 minutes 9)`, MUSIC_STEPS === 9218 && Math.abs(MUSIC_SECONDS - 368.55) < 0.1 && Math.abs(MUSIC_STEP_HZ * 2 - 50.02) < 0.01);
  sound.music(false);
  check('music(false) stops it and music(true) starts it again', !ayLog.playing && (sound.music(true), ayLog.playing));
}

// ---- effects: queued, muted -----------------------------------------------------------------------------------------
{
  reset();
  const sound = new MoleySound(new AyPlayer());
  await sound.unlock();
  ayClock.now = 10;
  sound.effect(2);
  sound.effect(3);
  sound.effect(5);
  const at = ayLog.played.map((p) => p.at);
  check('an effect sounds now', at[0] === 10);
  check('the next sounds when the one before has ended (the original blocks while one plays), then the next', Math.abs((at[1] ?? 0) - (10 + effectSeconds(2))) < 1e-9 && Math.abs((at[2] ?? 0) - (10 + effectSeconds(2) + effectSeconds(3))) < 1e-9);
  ayClock.now = 20;
  sound.effect(0);
  check('after a quiet time an effect is not held back by the old queue', ayLog.played[3]?.at === 20);
  sound.effect(4);
  sound.effect(6);
  check('numbers that are not effects (4 and 6 are never called) are ignored', ayLog.played.length === 4);
  check('M mutes (and again unmutes)', sound.toggleMute() && sound.muted && !sound.toggleMute());
  sound.toggleMute();
  sound.effect(2);
  check('muted, nothing is played', ayLog.played.length === 4);
  sound.hold(true);
  check('hold passes on to the player', ayLog.held);
}

// ---- one pass, however many steps follow ---------------------------------------------------------------------------------
{
  reset();
  const sound = new MoleySound(new AyPlayer());
  await sound.unlock();
  const game: { counter: number; sounds: number[] } = { counter: 5, sounds: [2, 3] };
  sound.afterStep(game, { frames: 2 });
  sound.afterStep(game, { frames: 2 }); // (a step with no pass: the same counter)
  sound.afterStep(game, { frames: 25 });
  check('a pass\'s effects sound once, in order, however many steps follow it', ayLog.played.length === 2);
  game.counter = 6;
  game.sounds = [];
  sound.afterStep(game, { frames: 2 });
  check('a pass with no effects makes none', ayLog.played.length === 2);
  // the death: held for the sound, 3 frames
  game.counter = 7;
  game.sounds = [0];
  sound.afterStep(game, { frames: 1 });
  check('the death waits for the step that holds the picture for it', ayLog.played.length === 2);
  sound.afterStep(game, { frames: 3 });
  check('and sounds in it, once', ayLog.played.length === 3);
  sound.afterStep(game, { frames: 25 });
  check('(not again in the steps after)', ayLog.played.length === 3);
  // a game put into play from a save
  const saved: { counter: number; sounds: number[] } = { counter: 9, sounds: [2] };
  sound.sync(saved);
  sound.afterStep(saved, { frames: 2 });
  check('sync: the pass a saved game ended on is not played again', ayLog.played.length === 3);
}

// ---- in a real flow: the time runs out -----------------------------------------------------------------------------------------
{
  reset();
  const sound = new MoleySound(new AyPlayer());
  await sound.unlock();
  const flow = new MoleyFlow(new SeededRandom(7));
  const frames = (n: number): void => { ayClock.now += n / 50; };
  let step = flow.step({ keys: 0, any: false });
  // (the credits page, then a jump starts the game)
  for (let i = 0; i < 100 && flow.phase === 'credits'; i++) { frames(step.frames); step = flow.step({ keys: Key.jump, any: true }); sound.afterStep(flow.game, step); }
  check('the game is in play', flow.phase === 'play');
  let diedAt = -1;
  let passStart = -1;
  let heldFrames = 0;
  let lastCounter = flow.game.counter;
  const log: string[] = [];
  for (let passes = 0; passes < 40000 && diedAt < 0; passes++) {
    frames(step.frames);
    step = flow.step({ keys: 0, any: false });
    const counter = flow.game.counter;
    if (counter !== lastCounter) { lastCounter = counter; passStart = ayClock.now; heldFrames = 0; }
    sound.afterStep(flow.game, step);
    heldFrames += step.frames;
    if (flow.game.sounds.includes(0)) {
      // (the death: run the steps of the pass out, so its sound has been placed)
      for (let i = 0; i < 80 && ayLog.played.every((p) => p.sample !== 0); i++) { frames(step.frames); step = flow.step({ keys: 0, any: false }); sound.afterStep(flow.game, step); }
      diedAt = ayLog.played.findIndex((p) => p.sample === 0);
      log.push(`death: pass at ${passStart.toFixed(3)} s, sounded at ${(ayLog.played[diedAt]?.at ?? 0).toFixed(3)} s`);
    }
  }
  check('an idle Monty dies in the end, and the death\'s sound is played', diedAt >= 0, false);
  const waited = diedAt >= 0 ? ((ayLog.played[diedAt]?.at ?? 0) - passStart) * 50 : -1;
  console.log(log.join('; '), `(${waited.toFixed(0)} frames after the pass)`);
  check('it sounds after the picture held for it: 3 frames after the pass, or after the dial\'s 55 when the time ran out', Math.abs(waited - 0) < 0.5 || Math.abs(waited - 55) < 0.5 || Math.abs(waited - 56) < 1.5, false);
  void heldFrames;
}

finish();
