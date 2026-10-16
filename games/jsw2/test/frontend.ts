/**
 * Jet Set Willy II's front end, headless (games/shared/native/play.ts as the browser runs it,
 * c64kit stood in by games/shared/test/kit.ts): a new game, standing in the bathroom, down the
 * toilet into the drain (Willy must stop when the keys are let go), then the pause map: pick
 * the bathroom and travel back, then to the drain (where he landed in it). Then a new game over the
 * save asks first (NEW GAME?), and a jump held as the last life goes brings CONTINUE?, not a new game.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/frontend.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { readSaves } from '../../shared/saves';

useMemoryStorage();
const titleBytes = fs.readFileSync('games/jsw2/assets/jsw2-title.state');
stubFetch(titleBytes);

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
await new Promise((r) => setTimeout(r, 50));
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(3); input.keyUp(code); tick(3); };
const ram = () => { const m = p.machine; if (!m) throw new Error('no machine yet'); return m.ram; };
const room = () => ram()[0x13];

tick(80);
tap('Space');
tick(200);
check(`a new game, in the bathroom (room ${room()})`, room() === 32);
tick(30); // standing still a moment: the bathroom becomes a place to travel back to
input.keyDown('ArrowRight');
let n = 0;
while (room() === 32 && n++ < 1500) tick();
input.keyUp('ArrowRight');
tick(60);
check(`down the toilet into the drain (room ${room()})`, room() === 138);
// (the drain carries him along its channels by itself, as in the original: not checked here)

tap('KeyP');
const places = p.state.found;
check('the bathroom is on the map as a place to travel to (he was on his feet there)', JSON.stringify(places).includes('"32"'));
tap('ArrowUp');
tap('Enter');
tick(120);
check(`picked the bathroom on the map and went there (room ${room()})`, room() === 32);

// and back into the drain: he dropped into it from the toilet (in the air), so travel puts him where
// he landed in its channel (not up where he came in), and the drain carries him on, alive
const drainSpot = JSON.stringify(p.state.found.stand).match(/"138":\[(\d+),(\d+),(\d+)\]/);
check(`the drain is a place to travel to, where he landed (${drainSpot?.slice(1).join(',')}: y 70, the channel)`, drainSpot?.[3] === '70');
tap('KeyP');
tap('ArrowDown');
const livesBefore = ram()[0x8096];
tap('Enter');
tick(200);
check(`picked the drain and went there, alive 200 frames on (room ${room()}, lives ${livesBefore.toString(2)} -> ${ram()[0x8096].toString(2)})`, room() === 138 && ram()[0x8096] === livesBefore);

// T on the pause screen: back to the title (the game's own, from its snapshot), the save kept; ENTER CONTINUE goes back
const saved = readSaves('jsw2').current;
tap('KeyP');
tap('KeyT');
tick(60);
check('T on the pause screen: the title (play over), ENTER CONTINUE offered, the save as it was', !p.state.playing && p.state.prompt === 'title' && readSaves('jsw2').current?.data === saved?.data);
check(`the save described from the map ("${saved?.summary.join(' / ')}")`, (saved?.summary[0] ?? '').startsWith('NOW YOUR IN IT') && !!saved?.summary.includes('LIVES 8'));
tap('Enter');
tick(30);
check(`Enter: back in play in the drain (room ${room()})`, p.state.playing && room() === 138);

// A new game over the save asks first (NEW GAME?), from the title and in the moment before CONTINUE? is up
const mid = readSaves('jsw2').current;
const newGameAsked = (what: string) => check(`${what}: NEW GAME? (the title held, the save as it was)`, p.state.prompt === 'newGame' && !p.state.playing && readSaves('jsw2').current?.data === mid?.data);
tap('KeyP'); tap('KeyT'); tick(60);
tap('Space');
newGameAsked('Space on the title');
tap('Escape');
check('Esc: back to the title, ENTER CONTINUE', p.state.prompt === 'title' && !p.state.playing);
tap('Space');
newGameAsked('Space again on the title');
tap('Enter');
tick(30);
check(`Enter on NEW GAME?: back in play in the drain (room ${room()})`, p.state.playing && room() === 138 && readSaves('jsw2').current?.data === mid?.data);
// the last life lost with jump pressed: CONTINUE? comes up at once (the press doesn't start a new game)
// (the death is a collision that kills, forced: ENHANCED ends a fall in a landing, so waiting for a fall would wait forever)
input.keyDown('Space');
for (let i = 0; i < 4000 && p.state.playing; i++) { ram()[0x8096] = 0; ram()[0x8304] |= 1; ram()[0x8173] = 0; tick(); }
for (let i = 0; i < 20 && p.state.prompt === null; i++) tick();
input.keyUp('Space');
tick(5);
check(`jump held as the last life goes: CONTINUE? (${p.state.prompt}), no new game`, p.state.prompt === 'continue' && !p.state.playing);
tap('Escape');
tap('Space');
newGameAsked('Esc on CONTINUE?, then Space');
tap('Space');
tick(200);
const after = readSaves('jsw2');
check(`Space again: a new game, in the bathroom (room ${room()}), the save before it kept as the previous`, p.state.playing && room() === 32 && after.previous?.data === mid?.data);

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
