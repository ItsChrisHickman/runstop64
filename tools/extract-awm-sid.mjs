#!/usr/bin/env node
// Builds Auf Wiedersehen Monty's .sid: the original's own music driver ($E400-$F52F, the tunes) and sound
// effect driver ($C000-$CBFF) taken from a RAM dump of the running game, with a little glue, as the other games
// do (tools/extract-starquake.mjs). Like everything of the original's it is NOT committed: it is built into
// games/awm/build/ (ignored) from the dump the build README describes.
//
// Usage: node tools/extract-awm-sid.mjs <play.ram> [out.sid]
//
// The glue ($CC00; the voice table is a copy of the game's own):
//   init:  A = song - 1. Songs 1-13 are the tunes 0-12 (the game's $E409 with A = the tune); song 14 is the
//          game with its effects ($E40C stops the music; the three voices' effects are cleared, as $5B63 does).
//   play:  one call a frame, as the play IRQ's tail ($64C2): the music's tick ($E40F), then the effects' ($C7F2).
//   sfx:   A = a sound number $40-$4C, as the game's $85A6 (without its $4066 test): the voice for the sound
//          from the table at $85BD goes into the voice's slot ($C7E0 + voice); $48 also starts $49 on voice 1.
import fs from 'node:fs';

// `--ensure` (what `npm run build` runs, so a deploy ships the music): the same, from games/awm/build/play.ram, unless
// games/awm/build/awm.sid is already newer than both it and this script; without the dump the build stops, saying why.
const args = process.argv.slice(2);
const ensure = args[0] === '--ensure';
const [ramFile, outFile = 'games/awm/build/awm.sid'] = ensure ? ['games/awm/build/play.ram'] : args;
if (!ramFile) {
  console.error('usage: node tools/extract-awm-sid.mjs <play.ram> [out.sid]   |   --ensure');
  process.exit(1);
}
if (ensure) {
  if (!fs.existsSync(ramFile)) {
    console.error(`${ramFile} is missing: Auf Wiedersehen Monty's music is built from the original's RAM dump, which is never committed (games/awm/build/README.md says how to make it). The site can't ship that game without it.`);
    process.exit(1);
  }
  const newest = Math.max(fs.statSync(ramFile).mtimeMs, fs.statSync(new URL(import.meta.url)).mtimeMs);
  if (fs.existsSync(outFile) && fs.statSync(outFile).mtimeMs >= newest) {
    console.log(`${outFile} is up to date`);
    process.exit(0);
  }
}
const ram = fs.readFileSync(ramFile);
if (ram.length !== 0x10000) throw new Error(`${ramFile} is not a 64K RAM dump`);

const LOAD = 0xc000, END = 0xf52f, GLUE = 0xcc00;
const image = new Uint8Array(0x10000);
image.set(ram.subarray(LOAD, 0xcc00), LOAD); // the effect driver and its effects
image.set(ram.subarray(0xe400, END), 0xe400); // the music driver and the tunes
const VOICES_AT = 0x85bd, SOUNDS = 13;

const lo = (a) => a & 0xff, hi = (a) => a >> 8;
const glue = [];
const labels = {}, fix = [];
const here = () => GLUE + glue.length;
const emit = (...b) => glue.push(...b);
const branch = (op, name) => { emit(op); fix.push([glue.length, name, 'rel']); emit(0); };
const jsr = (a) => emit(0x20, lo(a), hi(a));

labels.init = here();
emit(0xc9, 13); branch(0xb0, 'effects'); // cmp #13 / bcs effects
emit(0x4c, 0x09, 0xe4); // jmp $E409 (A = the tune)
labels.effects = here();
jsr(0xe40c);
for (const v of [0, 1, 2]) { emit(0xa9, v); jsr(0xc7e3); } // each voice's effect stopped
emit(0x60);
labels.play = here();
jsr(0xe40f); jsr(0xc7f2); emit(0x60);
labels.sfx = here();
emit(0xaa); // tax
emit(0xbc); fix.push([glue.length, 'voices-0x40']); emit(0, 0); // ldy voices - $40,x
emit(0x8a, 0x99, 0xe0, 0xc7); // txa / sta $C7E0,y
emit(0xc9, 0x48); branch(0xd0, 'done'); // cmp #$48 / bne done
emit(0xa9, 0x49, 0x8d, 0xe1, 0xc7); // lda #$49 / sta $C7E1
labels.done = here();
emit(0x60);
labels.voices = here();
emit(...ram.subarray(VOICES_AT, VOICES_AT + SOUNDS));
for (const [at, name, kind] of fix) {
  const target = name === 'voices-0x40' ? labels.voices - 0x40 : labels[name];
  if (target === undefined) throw new Error(`no label ${name}`);
  if (kind === 'rel') glue[at] = (target - (GLUE + at + 1)) & 0xff;
  else { glue[at] = lo(target); glue[at + 1] = hi(target); }
}
image.set(glue, GLUE);

const header = Buffer.alloc(0x7c);
header.write('PSID', 0);
header.writeUInt16BE(2, 4); header.writeUInt16BE(0x7c, 6);
header.writeUInt16BE(LOAD, 8); header.writeUInt16BE(labels.init, 0x0a); header.writeUInt16BE(labels.play, 0x0c);
header.writeUInt16BE(14, 0x0e); header.writeUInt16BE(1, 0x10);
header.writeUInt32BE(0, 0x12); // a call a frame (vertical blank) for every song
header.write('Auf Wiedersehen Monty', 0x16, 'latin1'); header.write('Robb and Benn', 0x36, 'latin1'); header.write('1987 Gremlin Graphics', 0x56, 'latin1');
header.writeUInt16BE(0x14, 0x76); // PAL
fs.writeFileSync(outFile, Buffer.concat([header, Buffer.from(image.subarray(LOAD, END))]));
console.log(`wrote ${outFile}: ${END - LOAD} bytes, init $${labels.init.toString(16)}, play $${labels.play.toString(16)}, sfx $${labels.sfx.toString(16)}`);
