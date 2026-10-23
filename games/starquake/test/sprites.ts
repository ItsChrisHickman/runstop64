/**
 * Starquake's sprite pictures in the live session: the original keeps them with its program ($5000-$5BFF, pointers $40-$6F), so
 * the VIC's bank has them from the start. They were only put there by the ending: in play BLOB's body was an empty sprite (his
 * yellow layer, built as he goes, was all of him). Played through the front end: BLOB's body has pixels; a save made without the
 * pictures gets them back when it is resumed, and the pictures the game has drawn itself since are kept.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/sprites.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { Game } from '../src/game';
import { run } from '../src/main';
import { CODEC, restore, snapshot } from '../src/save';
import { ROM } from '../src/data';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
tick(360);
tap('Space'); tick(32); tap('Space'); tick(105);
const opaque = (s: { surface: { pixels: Uint8Array } | null }) => (s.surface ? s.surface.pixels.filter((v) => v !== 0xff).length : 0);
const shown = renderer.sprites.filter((s) => s.visible);
check(`in play (room ${p.game.room}) BLOB's body, the first sprite, has pixels (${opaque(shown[0])}), and his yellow layer (${opaque(shown[1])})`, p.state.mode === 'play' && opaque(shown[0]) > 20 && opaque(shown[1]) > 0);
const same = (bank: Uint8Array, ptr: number) => bank.subarray(ptr * 64, ptr * 64 + 64).every((b, i) => b === ROM[0x4000 + ptr * 64 + i]);
check('the bank holds the original\'s pictures for the pointers $40-$54 and $56-$69', [...Array(0x15).keys(), ...Array(0x14).keys()].every((k) => same(p.game.scr.bank, k < 0x15 ? 0x40 + k : 0x56 + (k - 0x15))));

// a save from before: the pictures empty; resumed they are back, and a picture drawn since (the pad's turning flame) stays
const old = snapshot(p.game);
old.bank.fill(0, 0x1000, 0x1c00);
old.bank[0x1a80 + 5] = 0x77; // (a block the game has drawn into)
const bytes = CODEC.pack(old);
const g = new Game();
restore(g, CODEC.unpack(bytes, 1));
check('an old save resumed: the pictures are back', same(g.scr.bank, 0x45) && same(g.scr.bank, 0x60));
check('and a picture the game had drawn since is kept', g.scr.bank[0x1a80 + 5] === 0x77);
finish();
