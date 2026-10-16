import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
/**
 * Pictures of the original from a snapshot, as the checks render them (renderPixels): after the pokes
 * (`addr=value`, hex, comma separated: e.g. 402a=1 for the ending's flag, 4061=1 for the last life), `skip`
 * frames are run, then a picture every `step` frames, `count` of them, written as PNGs into `out`. Prints what
 * the frame changed of the VIC registers that matter for a picture (D011, D016, D018, DD00).
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/shot.ts games/awm/build/title.state out-dir 0 10 3 [402a=1]
 */
const [stateFile = '', out = '.', skipArg = '0', stepArg = '1', countArg = '1', pokes = ''] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
for (const p of pokes.split(',').filter(Boolean)) {
  const [a = '', v = ''] = p.split('=');
  o.ram[parseInt(a, 16)] = parseInt(v, 16);
}
fs.mkdirSync(out, { recursive: true });
for (let f = 0; f < Number(skipArg); f++) o.runFrame();
for (let i = 0; i < Number(countArg); i++) {
  for (let f = 0; f < Number(stepArg); f++) o.runFrame();
  indicesPng(`${out}/f${String(i).padStart(3, '0')}.png`, renderPixels(o), 320, 200, 1);
}
