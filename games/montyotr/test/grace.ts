/**
 * Monty on the Run: a moment's grace (games/shared/grace.ts), headless through the front end: for 3
 * seconds after back to room start, travel or continuing, nothing that would kill Monty does (every
 * death is an event the game's dispatch turns into its sequence: an enemy, the piledriver, the lift,
 * the water, the crusher, the C5's crash; here the enemy's is forced every frame), and after it
 * the same contact costs a life. The treasure's event (the ending) is not a death and goes through.
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/grace.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { GRACE_FRAMES } from '../../shared/grace';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const g = p.game;
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };

tick(5);
tap('Space');
tick(60);
check('in play, no grace in a new game', p.state.mode === 'play' && p.state.grace === 0);

// ---- an enemy's touch in an ordinary game kills ----
const lives0 = g.lives;
g.actionCounter = 2;
tick(200);
check(`no grace: an enemy's touch costs a life (${lives0} -> ${g.lives})`, g.lives === lives0 - 1);
tick(60);

// ---- back to room start: the grace ----
tap('KeyP'); tap('KeyB');
check(`B starts the grace (${p.state.grace} frames)`, p.state.grace > GRACE_FRAMES - 12);
const lives = g.lives;
let killed = false;
while (p.state.grace > 4) { g.actionCounter = 2; tick(); if (g.script || g.lives < lives) killed = true; }
check(`an enemy's touch forced every frame through the grace: no death, no life lost (${lives} -> ${g.lives}, grace ${p.state.grace} left)`, !killed && g.lives === lives);
tick(10);
g.actionCounter = 2;
tick(200);
check(`after it the same touch costs a life (${lives} -> ${g.lives})`, g.lives === lives - 1);
tick(60);

// ---- the other deaths are the same gate: the C5's crash (7), the crusher (1), the water (5) ----
for (const ac of [1, 3, 4, 5, 7]) {
  tap('KeyP'); tap('KeyB');
  const before = g.lives;
  let scripted = false;
  while (p.state.grace > 4) { g.actionCounter = ac; tick(); if (g.script) scripted = true; }
  check(`event ${ac} through the grace: no sequence started, no life lost (${before} -> ${g.lives})`, !scripted && g.lives === before);
}

// ---- the treasure's event goes through ----
tap('KeyP'); tap('KeyB');
g.actionCounter = 6;
tick(3);
check('the treasure (event 6) is not a death: its sequence starts in the grace', !!g.script || g.completionActive !== 0);

finish();
