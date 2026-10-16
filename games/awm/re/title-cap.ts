import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * What the original's VIC captures of the title: per frame the text rows' modes and the sprites (where the beam starts each one),
 * from a snapshot.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/title-cap.ts games/awm/build/t807.state skip count [402a=1,...]
 */
const [stateFile = "", skipArg = "0", countArg = "1", pokes = ""] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
for (const p of pokes.split(',').filter(Boolean)) {
  const [a = '', v = ''] = p.split('=');
  o.ram[parseInt(a, 16)] = parseInt(v, 16);
}
for (let f = 0; f < Number(skipArg); f++) o.runFrame();
for (let i = 0; i < Number(countArg); i++) {
  o.runFrame();
  const cap = o.capture;
  console.log(`--- frame ${Number(skipArg) + i}: border ${cap.border}`);
  let last = '';
  cap.rows.forEach((r, n) => {
    const k = `${r.d011.toString(16)} ${r.d016.toString(16)} ${r.d018.toString(16)} b${r.bank} bg${r.bg.join(',')} line${r.line}`;
    const m = `${r.d011.toString(16)} ${r.d016.toString(16)} ${r.d018.toString(16)} b${r.bank} bg${r.bg.join(',')}`;
    if (m !== last) console.log(`row ${n}: ${k}`);
    last = m;
  });
  for (const s of cap.sprites) {
    const d = Array.from(s.data.subarray(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
    console.log(`sprite ${s.n} x${s.x} y${s.y} col${s.colour} mc${s.multicolour ? 1 : 0} ex${s.expandX ? 1 : 0}${s.expandY ? 1 : 0} mc1 ${s.mc1} mc2 ${s.mc2} data ${d}`);
  }
}
