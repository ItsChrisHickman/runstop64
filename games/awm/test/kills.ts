/**
 * Auf Wiedersehen Monty: an enemy touching Monty hurts him, in every way he comes to be in play, as the browser runs it (the
 * front end over the game): a new game; back to the room's start (the moment's grace, 150 frames, then as ever); arriving by the
 * map; after a flight; a save continued. (Reported once as "enemies don't kill me, all of them": the cause was the original's shield,
 * the first thing of the first room, which the original never switched off. That item is gone from the game, in both modes:
 * test/shield.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/kills.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { TICKET } from '../src/items';
import { HIDDEN, isPlane } from '../src/enemies';
import { NEW_GAME_LIVES, type Game } from '../src/game';
import { run } from '../src/main';
import { START_ROOM } from '../src/program';
import { State } from '../src/tiles';

const store = useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const game = (): Game => must(p.program.game, 'a game');

/** The states a hit puts him in (a knock, a death). */
const HURT: readonly number[] = [State.Zap, State.Fire, State.Dying, State.Knocked];

/**
 * Monty put on the first enemy that can hurt him, over and over, for `n` frames: whether he was hurt, and the lives he had and
 * has. (A plane, a harmless frame and the rooms' hidden records are not enemies.)
 */
function touch(n = 100) {
  const lives = game().lives;
  let hurt = false;
  for (let t = 0; t < n; t++) {
    const g = game();
    const slot = [0, 1, 2, 3].find((s) => { const f = g.enemies.frame(s); return f !== HIDDEN && f < 0x80 && !isPlane(f); });
    if (slot !== undefined && t % 8 === 0) { g.monty.x = g.enemies.x(slot); g.monty.y = g.enemies.y(slot); }
    tick();
    if (HURT.includes(game().monty.state)) hurt = true;
  }
  return { hurt, lives, now: game().lives };
}

// ---- a new game ---------------------------------------------------------------------------------------------
tick(120);
tap('Space');
tick(60);
check(`a new game: six lives, no grace (${game().lives}, ${p.state.grace})`, game().lives === NEW_GAME_LIVES && p.state.grace === 0);
// (ORIGINAL: these lose lives; ENHANCED's unlimited lives are checked at the end)
tap('KeyP'); tick(3); tap('KeyE'); tap('KeyP'); tick(3);
check('E: ORIGINAL, no unlimited lives', !p.frontEnd.enhanced && !p.frontEnd.assist.lives);
// ---- arriving by the map -------------------------------------------------------------------------------------
// (out through the top edge into the next room, then the map's travel back to where he first came in)
game().lives = 0x8c;
game().monty.y = 2;
tick(60);
check(`out through the top edge: the next room (${game().world.room.toString(16)})`, game().world.room !== START_ROOM);
p.frontEnd.going = String(START_ROOM);
tick(4);
check(`the map's travel: back in room ${START_ROOM.toString(16)}, a moment's grace (${p.state.grace})`, game().world.room === START_ROOM && p.state.grace > 100);
tick(200);
const mapped = touch();
check(`arriving by the map: enemies hurt him once the grace is over (${mapped.lives.toString(16)} to ${mapped.now.toString(16)})`, mapped.hurt && mapped.now !== mapped.lives);

const fresh = touch();
check(`an enemy on him hurts him, and costs a life (${fresh.lives.toString(16)} to ${fresh.now.toString(16)})`, fresh.hurt && fresh.now !== fresh.lives);

// ---- back to the room's start: a moment's grace, then as ever --------------------------------------------------
tap('KeyP'); tick(3); tap('KeyB'); tick(4);
const graced = p.state.grace;
const during = touch(60);
check(`back to the room's start: the grace (${graced} frames left) spares him (${during.hurt ? 'hurt' : 'not hurt'})`, graced > 100 && !during.hurt && during.now === during.lives);
tick(200);
check(`the grace is over after its 150 frames (${p.state.grace} left)`, p.state.grace === 0);
const after = touch();
check('and then an enemy hurts him again, a life lost', after.hurt && after.now !== after.lives);

// ---- after a flight --------------------------------------------------------------------------------------------
{
  const g = game();
  g.lives = 0x8c;
  g.placeAt({ room: 0, x: 176, y: 104, state: 0, step: 0 });
  tick(6);
  g.items.give(TICKET);
  input.keyDown('KeyC'); tick(4); input.keyUp('KeyC');
  let n = 0;
  while (n++ < 4000 && (p.program.flying || game().flying)) tick();
  tick(200);
  const landed = game();
  check(`a flight from room 0 to the plane of room ${landed.world.room} and down (${n} frames): he stands (state ${landed.monty.state}), the ticket gone`, !landed.flying && landed.monty.state === State.Free && !landed.items.carried.includes(TICKET));
  const flown = touch();
  check(`after the flight an enemy hurts him, a life lost (${flown.lives.toString(16)} to ${flown.now.toString(16)})`, flown.hurt && flown.now !== flown.lives);
}

// ---- a save continued ---------------------------------------------------------------------------------------
{
  const kept = store.get('awm.save.v2');
  check('the room entered is saved', kept !== undefined);
  tap('KeyP'); tick(3); input.keyDown('KeyT'); tick(2); input.keyUp('KeyT'); tick(4);
  check(`T on the pause screen: back to the title (${p.state.kind})`, p.state.kind === 'title');
  tick(30);
  tap('Enter'); // ENTER CONTINUE
  for (let i = 0; i < 400 && p.state.kind !== 'play'; i++) tick();
  check(`ENTER CONTINUE: back in play (${p.state.kind}), with a moment's grace (${p.state.grace})`, p.state.kind === 'play' && p.state.grace > 0);
  tick(200);
  const continued = touch();
  check(`a save continued: enemies hurt him once the grace is over (${continued.lives.toString(16)} to ${continued.now.toString(16)})`, continued.hurt && continued.now !== continued.lives);
}

// ---- ENHANCED: unlimited lives and continues --------------------------------------------------------------------
{
  tap('KeyP'); tick(3); tap('KeyE'); tap('KeyP'); tick(3);
  check('E: ENHANCED, unlimited lives on', p.frontEnd.enhanced && p.frontEnd.assist.lives === true);
  p.grace.clear();
  game().lives = 0x81; // (the last life)
  const last = touch(400);
  check(`ENHANCED: hurt and put back, the lives stay (${last.lives.toString(16)} to ${last.now.toString(16)}), no game over (${p.state.kind})`, last.hurt && last.now === last.lives && p.state.kind === 'play' && !game().gameOver);
}

finish();
