/**
 * The .sid the extractor builds against the original game: the same SID
 * register writes, frame by frame.
 *
 * - Music: the title tune as the original plays it on its title screen
 *   (from title.state) and as the .sid plays song 1.
 * - Effects: each effect asked for in the original (its $21B3, with its
 *   interrupt running) and in the .sid (song 6, SFX_REQUEST).
 *
 *   node sound.mjs title.state game.state [starquake.sid]
 */
import fs from 'node:fs';
import { parsePsid, SidTune } from '../../../packages/c64kit/src/sid/psid';
import { reference } from './ref';
import data from '../src/data/starquake.json';

const [titleFile, gameFile] = process.argv.slice(2);
const sidFile = process.argv[4] ?? 'games/starquake/assets/starquake.sid';
const file = parsePsid(new Uint8Array(fs.readFileSync(sidFile)).buffer);

/** The .sid's register writes for `frames` frames of `song` (after `setup`), as one string per frame. */
function tuneWrites(song: number, frames: number, perFrame: number, setup?: (t: SidTune) => void) {
  const t = new SidTune(file, 44100);
  const out: string[][] = [];
  let cur: string[] = [];
  const w = t.sid.write.bind(t.sid);
  t.sid.write = (reg: number, v: number) => { cur.push(`${reg.toString(16)}=${v.toString(16)}`); w(reg, v); };
  t.start(song);
  cur = [];
  setup?.(t);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < perFrame; i++) t.cpu.call(file.playAddress);
    out.push(cur); cur = [];
  }
  return out;
}

/** Find the .sid's sequence inside the original's (they start at different moments). */
function align(orig: string[], port: string[]) {
  const key = port.slice(0, 40).join(' ');
  const o = orig.join(' ');
  const at = o.indexOf(key);
  if (at < 0) return -1;
  return o.slice(0, at).split(' ').filter(Boolean).length;
}

// ---- music: the title tune ------------------------------------------------------------------
{
  const m = reference(titleFile);
  const orig: string[] = [];
  for (let f = 0; f < 9000; f++) { m.runFrame(); for (const w of m.sidWrites) orig.push(`${w.reg.toString(16)}=${w.value.toString(16)}`); }
  for (const song of [1, 4]) {
    const port = tuneWrites(song, 3000, 1).flat();
    const at = align(orig, port);
    let same = 0;
    if (at >= 0) while (same < port.length && orig[at + same] === port[same]) same++;
    console.log(`music, song ${song}: ${port.length} writes from the .sid; ${at < 0 ? 'not found in the original\'s title' : `the same as the original's from its write ${at}, for ${same} writes`}`);
  }
}

// ---- effects ---------------------------------------------------------------------------------
{
  const ids = [0x02, 0x04, 0x06, 0x08, 0x0a, 0x0c, 0x0e, 0x10, 0x12, 0x16, 0x2c, 0x2e, 0x30, 0x32, 0x34, 0x36];
  let ok = 0;
  for (const id of ids) {
    for (const voice of [0, 1, 2]) {
      const m = reference(gameFile);
      // let the game run a moment, then ask for the effect between frames, with nothing else going on
      m.ram.set([0x60], 0x1437); m.ram.set([0x60], 0x4407 + 0); // enemies and BLOB quiet (no other effects)
      m.ram.set([0xa9, 0x00, 0xa2, 0x00, 0xa0, 0x00, 0x60], 0x4407);
      for (let f = 0; f < 60; f++) m.runFrame();
      const before = m.ram.slice(0x244e, 0x24e0);
      void before;
      m.cpu.a = id; // (asked for through a hook at the frame wait)
      let asked = false;
      const step = m.cpu.step.bind(m.cpu);
      m.cpu.step = () => {
        if (!asked && m.cpu.pc === 0x4c2d) {
          asked = true;
          // JSR $21B3 with A, X: done by hand (the game's own routine)
          const x = voice;
          if (m.ram[0x244e + x]) m.ram[0x2454 + x] = id;
          m.ram[0x2451 + x] = id;
        }
        return step();
      };
      const orig: string[] = [];
      for (let f = 0; f < 200; f++) { m.runFrame(); for (const w of m.sidWrites) orig.push(`${w.reg.toString(16)}=${w.value.toString(16)}`); }
      const port = tuneWrites(6, 150, 4, (t) => { t.cpu.call(data.sound.request, id, voice); }).flat();
      const at = align(orig, port);
      let same = 0;
      if (at >= 0) while (same < port.length && orig[at + same] === port[same]) same++;
      const good = at >= 0 && same === port.length;
      if (good) ok++;
      else console.log(`effect $${id.toString(16)} voice ${voice}: ${port.length} writes; ${at < 0 ? "not found" : `same for ${same}: orig ${orig.slice(at + same - 2, at + same + 6).join(" ")} port ${port.slice(same - 2, same + 6).join(" ")}`}`);
    }
  }
  console.log(`effects: ${ok} of ${ids.length * 3} identical to the original's`);
}
