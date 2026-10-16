/**
 * What Tal and the creatures feel (feel.ts): a hurt (Tal or the armour) and a creature destroyed
 * (by a stone, the Pulsar Beam, or touch) are noted as the game's own collision code handles them
 * (collisions.ts, driven here as the VIC's sprite collisions do it), placed with the picture, and
 * made effects and sounds by the shared combat entry (shared/native/combat.ts `playEvents`, the
 * one the Pendragon ports use). Presentation: both modes, as the Pendragon games' EFFECTS (an
 * "always" assist); the game's memory is the same with or without.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/feel.ts
 */
import fs from 'node:fs';
import { C64Machine, EffectsModel, Input, PixelRenderer, unpackState, type SfxName } from 'c64kit';
import { playEvents } from '../../shared/native/combat';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { spriteHits } from '../src/collisions';
import { Game } from '../src/game';
import { heroAt, placeFeel } from '../src/feel';
import { run } from '../src/main';
import { V } from '../src/vars';
import { check, finish } from '../../shared/test/check';

useMemoryStorage();
const CREATURES = 0xc618, CREATURE_HURT = 0xc64a, TOUGH = 0xc608;
const STONE = 0xbc, BEAM = 0xbe;
const machine = () => {
  const m = new C64Machine();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync('games/antiriad/test/armour.state'))));
  m.collisionsPerLine = true;
  return m;
};
const tough = (g: Game, a: number) => [...g.ram.subarray(TOUGH, TOUGH + 16)].includes(a);
const creatureList = (g: Game) => [...g.ram.subarray(CREATURES, CREATURES + 25)];

/** The armour in a room with creatures drawn (room $3F, sprites 6 and 7), ENHANCED or not. */
function inRoom(enhanced: boolean) {
  const g = new Game(machine(), true);
  g.enhanced = enhanced;
  for (let i = 0; i < 700; i++) { g.m.joy1 = 0x1f; g.m.joy2 = 0x1f; g.tick(); }
  g.travelTo = { room: 0x3f, x: 88, y: 0x60, high: 0 };
  for (let i = 0; i < 80; i++) { g.m.joy2 = 0x1f; g.tick(); }
  return g;
}
/** A creature of the room that a blow can destroy and that is drawn. */
function target(g: Game) {
  for (let x = 7; x >= 3; x--) {
    const a = g.ram[V.anim + x];
    if (a & 0x80 && creatureList(g).includes(a) && !tough(g, a) && g.m.capture.sprites.some((s) => s.n === x)) return x;
  }
  throw new Error('no creature drawn in the room');
}
const shotAt = (g: Game, x: number, weapon: number) => {
  g.ram[V.anim + 2] = weapon; g.ram[V.hits + x] = 1; g.ram[V.dying + x] = 0; g.ram[V.appearing + x] = 0;
  g.ram[V.spriteCollisions] = 4 | (1 << x);
  spriteHits(g);
};
/** What the front end does with a frame's notes (main.ts `felt`), on a model and a sound list of our own. */
function show(g: Game, fx: EffectsModel, sounds: SfxName[], now: number) {
  const notes = g.feel;
  g.feel = [];
  const sprites = g.m.capture.sprites;
  const events = placeFeel(sprites, notes, 1);
  playEvents(events, fx, (n) => sounds.push(n), now, { player: heroAt(sprites) });
  return events;
}

// ---- a creature destroyed by a stone, by the Pulsar Beam ---------------------------------------------
for (const [name, weapon] of [['a stone', STONE], ['the Pulsar Beam', BEAM]] as const) {
  const g = inRoom(true);
  const x = target(g);
  const score = g.ram[0x0697];
  shotAt(g, x, weapon);
  check(`${name} destroys sprite ${x} (it is dying, score ${score} -> ${g.ram[0x0697]})`, !!(g.ram[V.dying + x] & 0x80));
  const fx = new EffectsModel(), sounds: SfxName[] = [];
  const events = show(g, fx, sounds, 1000);
  const kill = events.find((e) => e.kind === 'kill');
  const lit = kill?.image ? kill.image.pixels.filter((c) => c >= 0).length : 0;
  check(`  ... a kill event with the creature's own pixels (${lit} lit)`, !!kill && kill.sprite === x && lit > 10);
  check('  ... a burst on the screen and the kill sound', fx.busy(1100) && sounds.join() === 'kill');
  check('  ... the burst is over in a second or so', !fx.busy(3000));
}
// a blow that only hurts (the creature takes two): no kill
{
  const g = inRoom(true);
  const x = target(g);
  g.ram[V.anim + 2] = STONE; g.ram[V.hits + x] = 5; g.ram[V.dying + x] = 0; g.ram[V.appearing + x] = 0;
  g.ram[V.spriteCollisions] = 4 | (1 << x);
  spriteHits(g);
  check('a stone that doesn\'t destroy it: no kill event', !(g.ram[V.dying + x] & 0x80) && g.feel.length === 0);
}

// ---- Tal hurt, the armour hurt -------------------------------------------------------------------------
{
  const g = inRoom(true);
  const x = target(g), a = g.ram[V.anim + x], k = creatureList(g).indexOf(a);
  const amount = g.ram[CREATURE_HURT + k];
  const energy = g.ram[V.suitEnergy];
  g.ram[V.dying + x] = 0; g.ram[V.appearing + x] = 0; g.ram[V.hurtCooldown] = 0;
  g.ram[V.spriteCollisions] = 1 | (1 << x);
  spriteHits(g);
  const fx = new EffectsModel(), sounds: SfxName[] = [];
  const events = show(g, fx, sounds, 1000);
  check(`the armour touched by a creature loses energy (${energy} -> ${g.ram[V.suitEnergy]}, it hurts ${amount}) and that is a hurt event`, amount > 0 && g.ram[V.suitEnergy] < energy && events.some((e) => e.kind === 'hurt'));
  check('  ... and a kill if the touch destroyed it', events.some((e) => e.kind === 'kill') === !!(g.ram[V.dying + x] & 0x80));
  check('  ... red edges on the screen and the hurt sound', fx.busy(1100) && sounds.includes('hurt'));
}
{
  // Tal out of the armour: the same
  const g = inRoom(true);
  g.ram[V.inSuit] = 0; g.ram[V.anim] = 0x88; g.ram[V.life] = 0x1f;
  const x = target(g);
  g.ram[V.dying + x] = 0; g.ram[V.appearing + x] = 0; g.ram[V.hurtCooldown] = 0;
  g.ram[V.spriteCollisions] = 1 | (1 << x);
  spriteHits(g);
  check('Tal touched by a creature: life lost and a hurt event', g.ram[V.life] < 0x1f && g.feel.some((e) => e.kind === 'hurt'));
}
// nothing felt in a moment's grace, or for a hurt of nothing
{
  const g = inRoom(true);
  g.graceActive = () => true;
  const x = target(g);
  g.ram[V.dying + x] = 0; g.ram[V.appearing + x] = 0;
  g.ram[V.spriteCollisions] = 1 | (1 << x);
  spriteHits(g);
  check('in a moment\'s grace nothing hurts, and nothing is felt (a kill by touch still shows)', !g.feel.some((e) => e.kind === 'hurt'));
}

// ---- both modes: the same notes, the same game ------------------------------------------------------------
{
  const felt = (enhanced: boolean) => {
    const g = inRoom(enhanced);
    const x = target(g);
    shotAt(g, x, STONE);
    return { notes: JSON.stringify(g.feel), ram: g.ram.slice(0x0200, 0x0310).join() };
  };
  const a = felt(true), b = felt(false);
  check('ORIGINAL feels the same as ENHANCED (presentation, as the Pendragon games\' EFFECTS), and the game\'s memory is the same', a.notes === b.notes && a.ram === b.ram && a.notes !== '[]');
}

// ---- through the front end: the model and the sound ------------------------------------------------------------
{
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const p = run({ renderer, input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  tick(300);
  input.keyDown('Space'); tick(3); input.keyUp('Space'); tick(2);
  for (let n = 0; !p.game.playing && n < 300; n++) tick();
  tick(400); // (past the moment's grace: a new game has none, but the room is drawn)
  const g = p.game;
  check('in play: effects are on in the front end', g.playing && renderer.effects.enabled);
  p.game.feel.push({ kind: 'hurt' });
  tick(1);
  check('a hurt noted in play shows on the screen (the front end plays it)', renderer.effects.model.busy(performance.now()) && p.game.feel.length === 0);
  renderer.effects.model.clear();
  tick(1);
  g.feel.push({ kind: 'kill', sprite: 7 });
  const drawn = g.m.capture.sprites.some((s) => s.n === 7);
  tick(1);
  check(`a creature noted destroyed shows if it is drawn (sprite 7 ${drawn ? 'is' : 'is not'})`, !drawn || renderer.effects.model.busy(performance.now()));
}

finish();
