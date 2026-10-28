/**
 * Jet Set Willy II's ending (games/shared/ending/, src/ending.ts), headless, with the real game under it:
 *
 *  1. the whole show runs from the first frame to THE END and back to the title, every scene of the montage the game itself running on a
 *     new game of its own, Willy steered by the joystick alone along a way found by playing (re/ending/route.ts): he runs about each room
 *     and takes what the way took, without losing a life, and the scenes of rooms with items take them;
 *  2. the credits: every line typed over the montage in the rows between the room's name and the panel (the time and rooms lines put away),
 *     in the credit colour and nothing else, the band empty before the text in every scene; the cast recorded; the title tune;
 *  3. what a win is (the game's own end: on the bed in the Masters Bedroom with 160 items it puts Willy to bed and sleepwalks him through the
 *     Top Landing and the Bathroom to room 136, where it stops for good, $7315 / $7387), through the front end as the browser runs it: coming
 *     into the bedroom with 160 begins nothing; on the bed, walked in or travelled to, the game's own end is seen for its length (the rooms in
 *     order, about 1,900 frames) and only after it has stopped in room 136 for a while does the reward begin; one continued in the bedroom
 *     does not; W on the pause screen once won; none in ORIGINAL (the game's own end plays to its last room and stays there);
 *  4. any key skips it, after the first moment and not before.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/ending.ts [out-dir]
 *
 * With an out-dir: PNG frames of each scene, of the credits, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, unpackState, type MachineState } from 'c64kit';
import { PORT_CREDITS, keepWon, readWon } from '../../shared/ending/credits';
import { Ending, bootGame, placed } from '../../shared/ending/machine-reel';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { checkShow, playShow } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { PlaySession } from '../../shared/test/play-session';
import { ITEM_COUNTS } from '../src/itemcounts';
import { END_HOLD, END_ROOM, SCENE_ROOMS, endingStats, jsw2Ending, room, stand, won } from '../src/ending';
import { WAYS } from '../src/ending-ways';
import { itemsLeft, BEDROOM } from '../src/items';
import { run } from '../src/main';
import { jsw2Map, type Jsw2Found } from '../src/map';
import { port } from '../src/native';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
useMemoryStorage();

const titleBytes = fs.readFileSync('games/jsw2/assets/jsw2-title.state');
stubFetch(titleBytes);
const title = unpackState(new Uint8Array(titleBytes));
const spec = jsw2Ending;
const keep = (ram: Uint8Array) => { ram[0x8096] = 0xff; };
const BAND = { top: 156, bottom: 171 };

// ---- the show, from the start to the end
/** What the show did in each scene: the room it should be in and whether he left it, the items taken in it, how far Willy ran, a life lost. */
interface Seen { left: boolean; took: number; ran: [number, number]; lost: boolean }
const seen: Seen[] = SCENE_ROOMS.map(() => ({ left: false, took: 0, ran: [999, 0], lost: false }));
const result = playShow({
  spec, port, title,
  stats: endingStats(title.ram, { rooms: [1, 2, 3], stand: {}, arrival: null, to: null }),
  band: BAND,
  out,
  onMontage(scene, frame, m) {
    const r = m.ram, n = SCENE_ROOMS[scene], at = seen[scene];
    // (the first frames of a scene are the game's own way in: the room is loaded in the first)
    if (frame > 12 && r[0x13] !== n) at.left = true;
    at.took = Math.max(at.took, (ITEM_COUNTS[n] ?? 0) - itemsLeft(r, n));
    const x = r[0x8062] + 256 * (r[0x8072] & 1);
    at.ran = [Math.min(at.ran[0], x), Math.max(at.ran[1], x)];
    if (r[0x8096] !== 0xff) at.lost = true;
  },
});
const lines = spec.scenes.flatMap((sc) => sc.credits ?? []);
checkShow({ spec, port, title, stats: [], band: BAND }, result, lines, PORT_CREDITS, 'JET SET WILLY II: THE FINAL FRONTIER');
const wayLength = (n: number) => must(WAYS[n], `a way in room ${n}`).path.reduce((t, [, f]) => t + f, 0);
check(`no scene outlasts its way (Willy is never left standing at the guardians' mercy): ${result.sceneFrames.join(' ')}`, SCENE_ROOMS.every((n, i) => (result.sceneFrames[i] ?? 0) <= wayLength(n)));
check('the montage is eight to twelve places, one for each room of the plan', spec.scenes.length >= 8 && spec.scenes.length <= 12 && spec.scenes.length === SCENE_ROOMS.length);
check('every scene has a way found for it, from a spot of its own', SCENE_ROOMS.every((n) => WAYS[n] !== undefined));
const itemScenes = SCENE_ROOMS.map((_, i) => i).filter((i) => (ITEM_COUNTS[SCENE_ROOMS[i]] ?? 0) > 0);
console.log(SCENE_ROOMS.map((n, i) => `${i}: room ${n} ${seen[i].took}/${ITEM_COUNTS[n] ?? 0} items, ran ${seen[i].ran.join('-')}${seen[i].left ? ', LEFT' : ''}${seen[i].lost ? ', LOST A LIFE' : ''}`).join('\n'));
check(`the rooms with items have them taken (${itemScenes.map((i) => `${SCENE_ROOMS[i]}:${seen[i].took}/${ITEM_COUNTS[SCENE_ROOMS[i]]}`).join(' ')})`, itemScenes.length >= 6 && itemScenes.every((i) => seen[i].took >= 1));
const total = seen.reduce((n, s) => n + s.took, 0);
check(`a good many items taken in all (${total})`, total >= 25);
check('every scene stays in its room', seen.every((s) => !s.left));
check('no life lost in any scene (the lives byte is never short of full)', seen.every((s) => !s.lost));
check('he runs about the rooms (his place moves on in every scene)', seen.every((s) => s.ran[1] - s.ran[0] >= 20));
check('the cast is the mansion\'s creatures with plain names (the hero is in every scene, not among them), and they move', result.figures.length === spec.cast.length && result.figures.filter((f) => f.poses > 1).length >= 4);

// ---- THE END's numbers
{
  const ram = new Uint8Array(65536);
  ram[0x8131] = 0x01; ram[0x8132] = 0x63; ram[0x82a1] = 0x01; ram[0x82a2] = 0x23; ram[0x82a3] = 0x45;
  const stats = endingStats(ram, { rooms: [1, 2, 3, 4], stand: {}, arrival: null, to: null });
  check(`the numbers under THE END: items, rooms, the game's clock (${stats.join(' | ')})`, stats[0] === 'ITEMS 163 OF 178' && stats[1] === 'ROOMS 4 OF 136' && stats[2] === 'TIME 01:23:45');
}

// ---- skipping
{
  const input = new Input(nowhere);
  let over = 0;
  const again = new Ending({ host: { renderer: new PixelRenderer(), input, canvas: nowhere }, spec, port, title: () => title, sound: { pushFrame: () => {} }, font: () => new BitmapFont().addDrawn(KIT_GLYPHS), done: () => { over++; } });
  again.start([]);
  for (let i = 0; i < 20; i++) { input.poll(); again.tick(); }
  input.keyDown('Space'); input.poll(); again.tick(); input.keyUp('Space');
  check('a key in the first moment does not skip it', again.active);
  for (let i = 0; i < 120; i++) { input.poll(); again.tick(); }
  input.keyDown('Space'); input.poll(); again.tick(); input.keyUp('Space');
  check('a key after the first moment skips it, back to the title', !again.active && over === 1);
}

// ---- what a win is
{
  const ram = new Uint8Array(65536);
  ram[0x13] = BEDROOM;
  ram[0x8131] = 0x01; ram[0x8132] = 0x60;
  check('not won in the Masters Bedroom with 160 (the game has not ended yet: it wants him on the bed)', !won(ram));
  ram[0x13] = 32;
  check('not won in the Bathroom', !won(ram));
  ram[0x13] = END_ROOM;
  check('won in room 136, where the game\'s own end stops', won(ram));
}

// ---- through the front end, as the browser runs it
/** A game in room `n` (on his way's spot) with `items` taken, saved at the main loop's wait; any room has the Masters Bedroom a way down (the game's own way in). */
function savedIn(n: number, items: number): MachineState {
  const base = must(bootGame(port, title, spec), 'a new game');
  const way = must(WAYS[n], `a way in room ${n}`);
  const g = must(placed(port, base, spec, room(n), stand(n, way.spot)), `room ${n}`);
  const got: { snap: MachineState | null } = { snap: null };
  // (the game's count is BCD: hundreds at $8131, the rest at $8132)
  const bcd = (k: number) => (Math.floor(k / 10) << 4) | (k % 10);
  g.onWait = () => { g.m.ram[0x8131] = bcd(Math.floor(items / 100)); g.m.ram[0x8132] = bcd(items % 100); got.snap = g.save() ?? got.snap; };
  for (let f = 0; f < 60; f++) { g.m.joy1 = g.m.joy2 = 0x1f; keep(g.m.ram); g.tick(); }
  return must(got.snap, 'a save');
}
/** Into the Masters Bedroom as the game's own way down does it. */
const intoBedroom = (s: PlaySession) => { s.ram[0x816c] = BEDROOM; s.ram[0x8063] = 0xa2; };
/** The title's raster interrupt is the vector (the game is at its title). */
const atTitle = (s: PlaySession) => [0x4ace, 0x4a18].includes(s.ram[0x314] | (s.ram[0x315] << 8));
/** Frames of the front end until the ending is on (-1: not within `limit`), and until it is over. */
const untilOn = (s: PlaySession, limit: number) => { for (let f = 0; f < limit; f++) { s.tick(); if (s.p.ending?.active) return f; } return -1; };
const untilOver = (s: PlaySession) => { for (let f = 0; f < 9000; f++) { s.tick(); if (!s.p.ending?.active) return f; } return -1; };
/** The bed (the conveyor, tile type 3), where Willy stands once he has jumped onto it: the game's end wants him on it. */
const BED: readonly [number, number, number] = [48, 0, 0x86];
/** The rooms the game's own end passes through, in order, from the bed. */
const SLEEPWALK = [34, 33, 63, 64, 32, END_ROOM];
/** Willy put on the bed as his feet would (the game reads the tile under him, $82F6, in its next frames). */
const ontoBed = (s: PlaySession) => { s.ram[0x8062] = BED[0]; s.ram[0x8072] = (s.ram[0x8072] & 0xfe) | BED[1]; s.ram[0x8063] = BED[2] - 6; s.ram[0x8292] = 0; s.ram[0x82d7] = 0; };
/**
 * Frames of the front end from now until the game's own end has stopped in room 136, the rooms it passed through in order and whether the
 * reward began meanwhile; then the frames until the reward begins (-1: not within `limit`).
 */
function sleepwalk(s: PlaySession, limit = 4000) {
  const rooms: number[] = [];
  let f = 0, arrived = -1;
  for (; f < limit; f++) {
    s.tick();
    const r = s.ram[0x13];
    if (rooms[rooms.length - 1] !== r) rooms.push(r);
    if (r === END_ROOM && arrived < 0) arrived = f;
    if (s.p.ending?.active) break;
  }
  return { rooms, arrived, began: s.p.ending?.active ? f : -1, early: arrived < 0 && s.p.ending?.active === true };
}
{
  check('ENHANCED: not won yet, the flag is not kept', !readWon('jsw2'));
  const s = await PlaySession.launch(run, 'jsw2', savedIn(96, 160), keep);
  s.tick(20);
  check('160 items in Downstairs: no win yet', !readWon('jsw2') && !s.p.ending?.active);
  intoBedroom(s);
  check('walking into the Masters Bedroom with 160 items begins nothing (not the ending, not the win)', untilOn(s, 600) < 0 && !readWon('jsw2') && s.ram[0x13] === BEDROOM);
  check('$01E0 is the game\'s own end ($7387), not the crack\'s trampoline', s.ram[0x1e0] === 0x87 && s.ram[0x1e1] === 0x73);
  ontoBed(s);
  const w = sleepwalk(s);
  console.log(`the game's own end from the bed: ${w.rooms.join(' > ')}; in room ${END_ROOM} after ${w.arrived} frames, the reward after ${w.began}`);
  check(`on the bed the game's own end plays: ${SLEEPWALK.join(' > ')}`, SLEEPWALK.every((r, i) => w.rooms[i] === r) && !w.early);
  check(`the game's own end is seen for its length before the reward (room 136 after ${w.arrived} frames, 1,800 or more)`, w.arrived >= 1800);
  check(`the reward begins ${END_HOLD} frames after the game has come to room 136 (${w.began - w.arrived})`, w.began - w.arrived >= END_HOLD && w.began - w.arrived <= END_HOLD + 5 && readWon('jsw2'));
  const ended = untilOver(s);
  s.tick(30);
  check('the ending ran and the game is at the title again', ended > 0 && atTitle(s));

  // travel to the bedroom (the map's own way in, above the bed's spot): the same end, the same length, a little later (he drops in from the top)
  const t = await PlaySession.launch(run, 'jsw2', savedIn(96, 160), keep);
  t.tick(20);
  const found: Jsw2Found = { rooms: [], stand: { [BEDROOM]: [BED[0], BED[1], BED[2] - 6] }, arrival: null, to: null };
  must(jsw2Map.go, 'travel').call(jsw2Map, String(BEDROOM), t.ram, found);
  const v = sleepwalk(t);
  check(`travel into the bedroom: the same end (${v.rooms.join(' > ')}), in room 136 after ${v.arrived} frames, the reward ${v.began - v.arrived} frames on`, SLEEPWALK.every((r, i) => v.rooms[i] === r) && v.arrived >= w.arrived - 30 && v.arrived <= w.arrived + 150 && // (travel drops him in from the top of the room, onto the bed)
     v.began - v.arrived === w.began - w.arrived);

  // travel with fewer than 160: nothing
  const few = await PlaySession.launch(run, 'jsw2', savedIn(96, 159), keep);
  few.tick(20);
  intoBedroom(few);
  few.tick(10);
  ontoBed(few);
  few.tick(300);
  check('159 items on the bed: no end, no ending', few.ram[0x13] === BEDROOM && !few.p.ending?.active);

  // W on the pause screen, once won
  const k = await PlaySession.launch(run, 'jsw2', savedIn(96, 10), keep);
  keepWon('jsw2');
  k.press('KeyP');
  check('the pause screen is up', k.p.frontEnd.paused);
  k.press('KeyW');
  check('W watches the ending (the flag kept above)', !!k.p.ending?.active);
  untilOver(k);
  k.tick(30);
  check('and back at the title', !k.p.ending?.active && atTitle(k));

  // continued already in the Masters Bedroom with 160 (what the game saves on coming into it): no ending again
  const here = await PlaySession.launch(run, 'jsw2', savedIn(34, 160), keep);
  check('continued in the Masters Bedroom with 160: no ending again', untilOn(here, 400) < 0 && here.ram[0x13] === BEDROOM);

  // ORIGINAL: the game as it was: its own end plays to room 136 and stays there, no reward (and none offered)
  useMemoryStorage(new Map());
  const o = await PlaySession.launch(run, 'jsw2', savedIn(96, 160), keep, false);
  intoBedroom(o);
  o.tick(20);
  ontoBed(o);
  o.tick(w.arrived + END_HOLD + 200);
  check('ORIGINAL: the game\'s own end reaches room 136 and no ending follows', o.ram[0x13] === END_ROOM && !o.p.ending?.active);
}
finish();
