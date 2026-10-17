/**
 * Measures the colour the original shows its sprites in, which decides the colour of every sprite in ENHANCED (`SPRITE_INK`, src/look.ts).
 *
 * In the original a sprite has no colour of its own: where it shows it is the ink of the cell it is over. So the original is played
 * (random players in every room, the bot in rooms 2 and 5 and through the whole game: test/players.ts) and at the end of each
 * pass, for each entity, the pixels its picture adds to the screen (the original's screen shows them and the scenery alone does not:
 * `Display.plain`) are counted by the ink of their cell. Prints the share of each colour, and each picture's dominant colour.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/colours.ts
 */
import { A, mulberry, Run, Tally } from '../test/lockstep-core';
import { PictureTally, SpriteInks, watchPicture } from '../test/picture-core';
import { Player } from '../test/players';
import { RandomPlayer } from '../test/random-player';

const STATES = 'games/moley/build';
const inks = new SpriteInks();
const tally = new Tally();
const pictures = new PictureTally();
for (let room = 0; room < 6; room++) {
  for (let k = 0; k < 6; k++) {
    const rnd = mulberry(1000 * room + k + 1);
    const run = new Run(tally, `${STATES}/room${room}.state`, `random room ${room}.${k}`, rnd() < 0.5);
    watchPicture(run, pictures, run.label, inks);
    run.play(new RandomPlayer(rnd), 800);
  }
}
const atStart = (x: number, y: number) => (mem: Uint8Array): void => {
  mem[A.x] = x; mem[A.y] = y; mem[A.state] = 0; mem[A.phase] = 0; mem[A.gauge] = 0x7f; mem[A.lives] = 5;
};
const r2 = new Run(tally, `${STATES}/room2.state`, 'bot room 2', false, atStart(0x04, 0x68));
watchPicture(r2, pictures, r2.label, inks);
r2.play(new Player(), 6000, (g) => g.room !== 2);
const r5 = new Run(tally, `${STATES}/room5.state`, 'bot room 5', false, atStart(0x28, 0x70));
watchPicture(r5, pictures, r5.label, inks);
r5.play(new Player(), 8000);
const all = new Run(tally, `${STATES}/play.state`, 'bot whole game', false, atStart(0x04, 0x64));
watchPicture(all, pictures, all.label, inks);
all.play(new Player(), 14000);

const { total } = inks.share(15);
const names = ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white', 'bright black', 'bright blue', 'bright red', 'bright magenta', 'bright green', 'bright cyan', 'bright yellow', 'bright white'];
console.log(`${tally.passes} passes of the original, ${total} sprite pixels counted`);
for (let ink = 0; ink < 16; ink++) {
  const { of } = inks.share(ink);
  if (of > 0) console.log(`   ${names[ink]}: ${((100 * of) / total).toFixed(2)} %`);
}
const dominant = inks.dominant();
const notWhite = dominant.filter(([, ink]) => ink !== 15);
console.log(`${dominant.length} pictures seen; dominant colour bright white for ${dominant.length - notWhite.length}${notWhite.length > 0 ? `; not: ${notWhite.map(([f, ink, n]) => `$${f.toString(16)} ${names[ink]} (${n})`).join(', ')}` : ''}`);
