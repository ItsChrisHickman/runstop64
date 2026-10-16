/**
 * The first file of a .d64 as a .prg (tools/probe wants a program to boot; there is no c1541 here).
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/d64-prg.ts games/awm/build/awm.d64 games/awm/build/awm.prg
 */
import fs from 'node:fs';

const [diskFile, prgFile] = process.argv.slice(2);
if (!diskFile || !prgFile) throw new Error('usage: d64-prg.ts <disk.d64> <out.prg>');
const disk = fs.readFileSync(diskFile);
const sectorsOn = (track: number) => (track <= 17 ? 21 : track <= 24 ? 19 : track <= 30 ? 18 : 17);
const sector = (track: number, s: number) => {
  let at = 0;
  for (let t = 1; t < track; t++) at += sectorsOn(t);
  return disk.subarray((at + s) * 256, (at + s + 1) * 256);
};

const dir = sector(18, 1);
const entry = Array.from({ length: 8 }, (_, e) => dir.subarray(e * 32, e * 32 + 32)).find((en) => (en[2] & 0x80) !== 0);
if (!entry) throw new Error('no file in the directory');
const chunks: Buffer[] = [];
for (let track = entry[3], s = entry[4], guard = 0; track !== 0 && guard < 700; guard++) {
  const b = sector(track, s);
  if (b[0] === 0) { chunks.push(b.subarray(2, b[1] + 1)); break; }
  chunks.push(b.subarray(2));
  track = b[0];
  s = b[1];
}
fs.writeFileSync(prgFile, Buffer.concat(chunks));
console.log(`${Buffer.from(entry.subarray(5, 21)).toString('latin1').replace(/\xa0+$/, '')}: ${Buffer.concat(chunks).length} bytes -> ${prgFile}`);
