/**
 * ENHANCED's stored recharge cells (cells.ts). The original carries one ($A7 bit 7, "ALREADY
 * CARRYING RECHARGE CELL") and uses it up stepping into the armour. ENHANCED: every cell Tal
 * crouches over is his, counted; C fills the armour from one (not when it's full); stepping into
 * the armour fills it too; the count is in the save and the pause screen; the panel says
 * RECHARGE CELL STORED. ORIGINAL is the original's: the second cell is refused, C does nothing.
 *
 * Tal crouches by the game's own down (anim $8A/$8C, what `reaching` wants); the cell is touched
 * as the VIC's sprite collision interrupt reports it (as grace.ts does a creature).
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/cells.ts
 */
import fs from 'node:fs';
import { C64Machine, Input, PixelRenderer, unpackState } from 'c64kit';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { CELLS, cellCount } from '../src/cells';
import { spriteHits } from '../src/collisions';
import { intoArmour } from '../src/fades';
import { Game } from '../src/game';
import { antiriadMap } from '../src/map';
import { messageAt } from '../src/plus';
import { repairSave, run } from '../src/main';
import { V } from '../src/vars';
import { check, finish } from '../../shared/test/check';

useMemoryStorage();
const stick = (s: string) => 0x1f & ~((s.includes('U') ? 1 : 0) | (s.includes('D') ? 2 : 0) | (s.includes('L') ? 4 : 0) | (s.includes('R') ? 8 : 0));
const machine = (file: string) => {
  const m = new C64Machine();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(file))));
  m.collisionsPerLine = true;
  return m;
};
const frames = (g: Game, n: number, j = '') => { for (let i = 0; i < n; i++) { g.m.joy1 = 0x1f; g.m.joy2 = stick(j); g.tick(); } };
const RECHARGE_CELL = 0xc6;
const queued = (g: Game, n: number) => [...g.ram.subarray(0x066a, 0x0672)].includes(n) || g.ram[V.message] === n;

/** Tal on foot, crouching (down held until he reaches). */
function crouching(enhanced: boolean) {
  const g = new Game(machine('games/antiriad/test/original.state'), true);
  g.enhanced = enhanced;
  g.ram[CELLS] = 0; // (the original's own snapshot has leftovers there; a game of ours has 0)
  g.ram[V.panelOn] = 0x80; // (the panel lights with the armour's first power-up; the cell wants it on)
  frames(g, 60);
  crouch(g);
  return g;
}
/** Down, from the stance he stands in turned (left first), until he reaches. */
function crouch(g: Game) {
  frames(g, 10, 'L'); frames(g, 10);
  for (let i = 0; i < 60 && ![0x8a, 0x8c].includes(g.ram[V.anim]); i++) frames(g, 1, 'D');
}
/** A recharge cell in sprite `x` touches Tal, as the VIC's sprite collision reports it. */
function touchCell(g: Game, x: number) {
  const { ram } = g;
  ram[V.anim + x] = RECHARGE_CELL; ram[V.dying + x] = 0; ram[V.appearing + x] = 0;
  ram[V.spriteCollisions] = 1 | (1 << x);
  spriteHits(g);
}
/** The armour, powered up and full. */
function armour(enhanced: boolean) {
  const g = new Game(machine('games/antiriad/test/armour.state'), true);
  g.enhanced = enhanced;
  for (let i = 0; i < 600 && !(g.ram[0x92] >= 0x20 && g.ram[V.suitEnergy] >= 0x1f); i++) frames(g, 1);
  return g;
}
const ask = (g: Game) => { g.cellAsked = true; frames(g, 1); };
const pause = (g: Game) => antiriadMap.info(g, antiriadMap.found.empty());

// ---- ENHANCED: every cell is kept ----------------------------------------------------------------
{
  const g = crouching(true);
  check(`Tal crouches by the game's own down (anim ${g.ram[V.anim].toString(16)})`, [0x8a, 0x8c].includes(g.ram[V.anim]));
  check('no cells to begin with; the pause screen shows none', cellCount(g.ram) === 0 && !pause(g).some((l) => l.startsWith('CELLS')));
  touchCell(g, 3);
  check(`the first cell is kept (count ${cellCount(g.ram)}), the original's own carry untouched`, cellCount(g.ram) === 1 && !(g.ram[0xa7] & 0x80));
  check('  ... the cell is gone from the room (the sprite stopped)', g.ram[V.anim + 3] === 0);
  frames(g, 30);
  check('  ... the panel says RECHARGE CELL STORED', (g.ram[V.message] & 0x7f) === 0x17 && String.fromCharCode(...[...Array(20)].map((_, i) => g.ram[messageAt(g, 0x97) + i])) === 'RECHARGE CELL STORED');
  crouch(g);
  touchCell(g, 4);
  check(`a second cell is kept too (count ${cellCount(g.ram)}), no "ALREADY CARRYING"`, cellCount(g.ram) === 2 && !queued(g, 0x89));
  check('the pause screen shows CELLS 2', pause(g).includes('CELLS     2'));
  frames(g, 30); // (up again: not reaching) a cell isn't picked up
  touchCell(g, 5);
  check('a cell Tal isn\'t crouching over stays (count 2)', cellCount(g.ram) === 2 && g.ram[V.anim + 5] === RECHARGE_CELL);
}

// ---- ENHANCED: the key refuels from a cell ---------------------------------------------------------
{
  const g = armour(true);
  g.ram[CELLS] = 2;
  g.ram[V.suitEnergy] = 0;
  check(`the pause screen, empty with cells: CELLS 2 and the hint (${pause(g).slice(3).join(' / ')})`, pause(g).slice(3).join('/') === 'CELLS     2/C: REFUEL');
  ask(g);
  check(`C in the armour out of energy fills it (energy ${g.ram[V.suitEnergy]}, cells ${cellCount(g.ram)})`, g.ram[V.suitEnergy] === 0x1f && cellCount(g.ram) === 1);
  ask(g);
  check('C with the armour full keeps the cell', cellCount(g.ram) === 1 && g.ram[V.suitEnergy] === 0x1f);
  g.ram[V.suitEnergy] = 9;
  ask(g);
  check(`C part empty fills it again (cells ${cellCount(g.ram)})`, g.ram[V.suitEnergy] === 0x1f && cellCount(g.ram) === 0);
  g.ram[V.suitEnergy] = 9;
  ask(g);
  check('C with no cell does nothing', g.ram[V.suitEnergy] === 9 && cellCount(g.ram) === 0);
}
// stepping into the armour with a cell fills it (as the original's one does)
{
  const g = armour(true);
  g.ram[CELLS] = 1; g.ram[V.suitEnergy] = 0;
  intoArmour(g);
  check('stepping into the armour with a cell fills it', g.ram[V.suitEnergy] === 0x1f && cellCount(g.ram) === 0);
  g.ram[CELLS] = 1;
  intoArmour(g);
  check('  ... not when it\'s full', cellCount(g.ram) === 1);
}
// C is only the armour's: out of it, nothing (the cell is kept)
{
  const g = crouching(true);
  g.ram[CELLS] = 1; g.ram[V.suitEnergy] = 3;
  ask(g);
  check('C on foot does nothing', cellCount(g.ram) === 1 && g.ram[V.suitEnergy] === 3);
}

// ---- ORIGINAL: one cell, as it was -------------------------------------------------------------------
{
  const g = crouching(false);
  touchCell(g, 3);
  check('ORIGINAL: the first cell is carried the original\'s way ($A7), none stored', !!(g.ram[0xa7] & 0x80) && cellCount(g.ram) === 0);
  touchCell(g, 4);
  check('ORIGINAL: the second is refused: ALREADY CARRYING RECHARGE CELL', queued(g, 0x89) && g.ram[V.anim + 4] === RECHARGE_CELL && !pause(g).some((l) => l.startsWith('CELLS')));
  const a = armour(false);
  a.ram[CELLS] = 1; a.ram[V.suitEnergy] = 3;
  ask(a);
  check('ORIGINAL: C does nothing', a.ram[V.suitEnergy] === 3 && cellCount(a.ram) === 1);
  intoArmour(a);
  check('ORIGINAL: stepping in doesn\'t use a stored cell', a.ram[V.suitEnergy] === 3);
  a.ram[0xa7] = 0x80;
  frames(a, 3);
  check('ORIGINAL: its own carried cell fills the armour stepping in, as ever', a.ram[V.suitEnergy] === 0x1f && !(a.ram[0xa7] & 0x80));
}

// ---- the save keeps the count ---------------------------------------------------------------------------
{
  const g = armour(true);
  g.ram[CELLS] = 3;
  g.flushShapes();
  const m = new C64Machine();
  m.loadState(g.m.saveState());
  const h = new Game(m, true);
  h.enhanced = true;
  repairSave(h);
  check(`a saved game keeps the cells (${cellCount(h.ram)}) and the message's words`, cellCount(h.ram) === 3 && h.ram[messageAt(h, 0x97)] === 'R'.charCodeAt(0));
  // (a save from before the cell message has no words there: they are put back on loading)
  const old = new Game(g.m, true);
  old.ram.fill(0, 0x81c8, 0x81f0);
  repairSave(old);
  check('a save from before the message gets its words on loading', old.ram[messageAt(old, 0x97)] === 'R'.charCodeAt(0));
  h.ram[V.suitEnergy] = 5;
  ask(h);
  check('  ... and the loaded game uses them', cellCount(h.ram) === 2 && h.ram[V.suitEnergy] === 0x1f);
  // a new game on the same machine starts with none
  const fresh = new Game();
  check('a new game starts with no cells', cellCount(fresh.ram) === 0);
}

// ---- the front end: C and the touch CELL button ----------------------------------------------------------
{
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  tick(300);
  input.keyDown('Space'); tick(3); input.keyUp('Space'); tick(2);
  for (let n = 0; !p.game.playing && n < 300; n++) tick();
  tick(150);
  const { ram } = p.game;
  check('the game is in play, ENHANCED', p.game.playing && p.state.enhanced);
  // (put him in the armour, powered up, with a cell, for the key)
  ram[V.panelOn] = 0x80; ram[V.inSuit] = 0x80; ram[0x92] = 0x20; ram[V.suitEnergy] = 5; ram[CELLS] = 2;
  input.keyDown('KeyC'); tick(3); input.keyUp('KeyC'); tick(2);
  check(`the C key fills the armour from a cell (energy ${ram[V.suitEnergy]}, cells ${cellCount(ram)})`, ram[V.suitEnergy] >= 0x1f && cellCount(ram) === 1);
  check('the touch layer has a CELL button on that key', p.touch.buttons.some((b) => b.label === 'CELL' && b.key === 'KeyC'));
}

finish();
