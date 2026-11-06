/**
 * The small shared rules, headless: the fire latch (a press a menu spent does not fire the game), the grace countdown,
 * ENHANCED's unlimited lives, and the room-save bookkeeping.
 *
 *   node tools/test.mjs games/shared/test/small.ts
 */
import { FireLatch } from '../fire-latch';
import { Grace, GRACE_FRAMES } from '../grace';
import { afterLoss } from '../lives';
import { RoomSaves } from '../room-saves';
import { check, finish } from './check';

{
  const latch = new FireLatch();
  check('FireLatch: fire passes while nothing was spent', latch.filter(true) && !latch.filter(false));
  latch.hold();
  const held = latch.filter(true), stillHeld = latch.filter(true);
  const freed = latch.filter(false);
  check('FireLatch: a spent press is ignored for as long as it is held', !held && !stillHeld);
  check('FireLatch: and the next press after it is let go counts', !freed && latch.filter(true));
}

{
  const g = new Grace();
  check('Grace: not active before it starts', !g.active && g.left === 0);
  g.start(10);
  g.start(5);
  check('Grace: a shorter start leaves what is left', g.left === 10);
  g.start(20);
  check('Grace: a longer start extends it', g.left === 20);
  g.clear();
  g.start(3);
  for (let i = 0; i < 2; i++) g.tick();
  check('Grace: active until the last frame has passed', g.active && g.left === 1);
  g.tick();
  check('Grace: over after the frames are counted', !g.active && g.left === 0);
  g.tick();
  check('Grace: counting past zero stays at zero', g.left === 0);
  g.start();
  check(`Grace: a start with no length is ${GRACE_FRAMES} frames`, g.left === GRACE_FRAMES);
  g.clear();
  check('Grace: clear ends it', !g.active);
  check('Grace: three seconds of PAL frames', GRACE_FRAMES === 3 * 50);
}

const LOSSES: [number, boolean, number][] = [[3, false, 2], [1, false, 0], [3, true, 3], [0, true, 0]];
for (const [lives, unlimited, want] of LOSSES) check(`afterLoss(${lives}, unlimited ${unlimited}) = ${want}`, afterLoss(lives, unlimited) === want);

{
  const rs = new RoomSaves<string>();
  check('RoomSaves: nothing to save before a room begins', rs.status(false, true).room === null && rs.status(false, true).save() === null);
  rs.enter('room A');
  const a = rs.status(false, true);
  check('RoomSaves: a room entered is saved', a.room === 1 && a.save() === 'room A' && !a.onTitle);
  check('RoomSaves: no save point while a screen holds the game', rs.status(false, false).room === null);
  check('RoomSaves: the title is reported', rs.status(true, true).onTitle);
  rs.enter('room B');
  check('RoomSaves: each room has a new number and its own save', rs.status(false, true).room === 2 && rs.status(false, true).save() === 'room B');
  rs.enter();
  const kept = rs.status(false, true);
  check('RoomSaves: a room entered with no save counts as new but keeps the last save', kept.room === 3 && kept.save() === 'room B');
  rs.clear();
  check('RoomSaves: a new game clears the save', rs.status(false, true).room === null && rs.status(false, true).save() === null);
}

finish();
