/**
 * The sound keys (games/shared/audio.ts), headless: the audio unlocks on the first key or tap and only then starts the
 * game's sound, M mutes (through the game's own mute when it has one), V toggles pixel steps unless the game uses V,
 * and while letters are typed M and V are letters.
 *
 *   node tools/test.mjs games/shared/test/audio-keys.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { AudioKeys, type Unlockable } from '../audio';
import { nowhere } from './browser';
import { check, finish } from './check';

/** An AudioKeys on fakes of everything it touches, with a log of what happened. */
function makeKeys(opts: { mute?: boolean; snapKey?: boolean; unlocked?: boolean } = {}) {
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const log: string[] = [];
  const unlocks: Promise<void>[] = [];
  const canvas = new EventTarget();
  const player: Unlockable = {
    unlocked: opts.unlocked ?? false,
    unlock: () => { log.push('unlock'); const done = Promise.resolve(); unlocks.push(done); return done; },
    toggleMute: () => { log.push('player mute'); return true; },
  };
  const keys = new AudioKeys({
    canvas,
    input, renderer, player,
    started: () => { log.push('started'); },
    mute: opts.mute ? () => { log.push('game mute'); } : undefined,
    snapKey: opts.snapKey,
  });
  /** Presses keys for one frame, then ticks. */
  const frame = (typing: boolean, ...codes: string[]) => { for (const c of codes) input.keyDown(c); input.poll(); for (const c of codes) input.keyUp(c); keys.tick(typing); };
  /** Waits for the unlocks asked for so far (and the sound started after each). */
  const settled = async () => { await Promise.all(unlocks); };
  /** A tap on the picture. */
  const tap = () => { canvas.dispatchEvent(new Event('pointerdown')); };
  return { input, renderer, log, tap, frame, keys, player, settled };
}

{
  const t = makeKeys();
  t.frame(false);
  check('a frame with no key does not unlock the audio', t.log.length === 0);
  t.frame(false, 'Space');
  await t.settled();
  check('the first key unlocks the audio and then starts the game\'s sound', t.log.join() === 'unlock,started');
}

{
  const t = makeKeys();
  t.tap();
  await t.settled();
  check('the first tap on the picture unlocks and starts too', t.log.join() === 'unlock,started');
}

{
  const t = makeKeys({ unlocked: true });
  t.frame(false, 'Space');
  t.tap();
  await t.settled();
  check('once unlocked, keys and taps unlock nothing again', t.log.length === 0);
}

{
  const t = makeKeys({ unlocked: true });
  t.frame(false, 'KeyM');
  check('M mutes the player', t.log.join() === 'player mute');
  const g = makeKeys({ unlocked: true, mute: true });
  g.frame(false, 'KeyM');
  check('M calls the game\'s own mute instead when it has one', g.log.join() === 'game mute');
}

{
  const t = makeKeys({ unlocked: true });
  t.frame(false, 'KeyV');
  check('V turns pixel steps on', t.renderer.snap);
  t.frame(false, 'KeyV');
  check('and V again turns them off', !t.renderer.snap);
  const own = makeKeys({ unlocked: true, snapKey: false });
  own.frame(false, 'KeyV');
  check('a game that uses V itself keeps its pixel steps as they were', !own.renderer.snap);
}

{
  const t = makeKeys();
  t.frame(true, 'KeyM', 'KeyV');
  await t.settled();
  check('while letters are typed, M and V mute and toggle nothing', t.log.join() === 'unlock,started' && !t.renderer.snap);
}

finish();
