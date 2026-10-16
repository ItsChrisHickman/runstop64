/**
 * Blackwyche's TRAPDOORS STAY OPEN (ENHANCED), as the browser runs it: in each cabin with a
 * trapdoor, Pendragon walks onto it until it gives way and drops him a deck; taken back to the
 * cabin (the pause map's travel), the trapdoor shows as the hole it became, and the hole still
 * drops him. In ORIGINAL the boards are back.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/trapdoors.ts
 */
import { must } from '../../shared/test/must';
import { CABINS } from '../src/ship';
import { TRAPS } from '../src/trapdoors';
import { saveAt, Session } from './guided-kit';

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const cabinId = (ram: Uint8Array) => `C${ram[0x9d78]}.${ram[0x1ecd]}.${ram[0x1ee5]}`;
const traps = (ram: Uint8Array) => must(TRAPS[ram[0x341c]], 'a trapdoor room');
/** Where a trapdoor's sprite is (VIC coordinates). */
const spriteAt = (vic: Uint8Array, n: number) => ({ x: vic[2 * n] + (vic[0x10] & (1 << n) ? 256 : 0), y: vic[2 * n + 1] });

/** His place (VIC coordinates, x with its ninth bit). */
const himAt = (s: Session) => ({ x: s.ram[0x341f] + (s.vic[0x10] & 4 ? 256 : 0), y: s.ram[0x3420] });

/** Walk towards (x, y) with the arrows a step at a time, until there, `max` frames, or a trapdoor gives way. */
function walkTo(s: Session, x: number, y: number, max: number) {
  for (let i = 0; i < max && !s.ram[0x342a]; i++) {
    const p = himAt(s), keys: string[] = [];
    if (p.y < y - 2) keys.push('ArrowDown'); else if (p.y > y + 2) keys.push('ArrowUp');
    if (p.x < x - 2) keys.push('ArrowRight'); else if (p.x > x + 2) keys.push('ArrowLeft');
    if (!keys.length) return;
    for (const k of keys) s.input.keyDown(k);
    s.tick();
    for (const k of keys) s.input.keyUp(k);
  }
}

/** Walk about over the trapdoor's sprite until it gives way (true: he fell). */
function fallThrough(s: Session, sprite: number) {
  const at = spriteAt(s.vic, sprite);
  // (a few spots over it, then finer)
  for (const dy of [-30, -24, -18, -12, -6, 0, 6]) for (const dx of [-12, -4, 4, 12]) { if (s.ram[0x342a]) return true; walkTo(s, at.x + dx, at.y + dy, 200); s.tick(4); }
  for (let dy = -50; dy <= 10 && !s.ram[0x342a]; dy += 3) for (const dx of [-8, 0, 8]) walkTo(s, at.x + dx, at.y + dy, 40);
  // (where the cabin's things are in the way of the arrows: put him beside it, and the game's own step and check)
  for (let dy = -45; dy <= 0 && !s.ram[0x342a]; dy += 3) for (let dx = -8; dx <= 8 && !s.ram[0x342a]; dx += 4) {
    const x = at.x + dx;
    s.ram[0x341f] = x & 0xff; s.ram[0x3420] = at.y + dy;
    s.vic[4] = x & 0xff; s.vic[5] = at.y + dy; s.vic[0x10] = (s.vic[0x10] & ~4) | (x > 255 ? 4 : 0);
    s.tick(2);
  }
  return s.ram[0x342a] !== 0;
}

/** Travel (the pause map's way) to a cabin, and a moment there. */
function travelTo(s: Session, id: string) {
  s.p.frontEnd.going = id;
  return s.wait(() => cabinId(s.ram) === id && s.ram[0x342e] !== 0, 300);
}

// (room $21's trapdoors are where he comes in, both cabins: it gives way at once, the map's NO TRAVEL; not walked to here)
const rooms = [...new Set(CABINS.map((c) => c.room))].filter((r) => TRAPS[r] && r !== 0x21);
for (const room of rooms) for (let t = 0; t < must(TRAPS[room], 'traps').length; t++) {
  const s = await Session.launch(saveAt({ room }));
  const id = cabinId(s.ram), trap = traps(s.ram)[t], what = `room $${room.toString(16)} (${id}) trapdoor ${trap.sprite}`;
  s.tick(30);
  check(`${what}: boards to begin with`, !trap.isOpen(s.ram));
  const fell = fallThrough(s, trap.sprite);
  check(`${what}: gives way`, fell && trap.isOpen(s.ram));
  if (!fell) continue;
  s.wait(() => s.ram[0x342a] === 0 && cabinId(s.ram) !== id, 300);
  check(`${what}: noted`, JSON.stringify(s.p.state.found.trapdoors ?? []).includes(`${id}:${trap.sprite}`));
  s.tick(40);
  if (!travelTo(s, id)) { check(`${what}: back in the cabin`, false); continue; }
  s.tick(20);
  check(`${what}: back in the cabin, the hole shows`, trap.isOpen(s.ram));
  check(`${what}: and the other trapdoors' boards`, traps(s.ram).every((o) => o === trap || !o.isOpen(s.ram)));
  check(`${what}: the hole still drops him`, fallThrough(s, trap.sprite));
}

// ORIGINAL: the boards come back
{
  const s = await Session.launch(saveAt({ room: 0x08 }), false);
  const trap = traps(s.ram)[0], id = cabinId(s.ram);
  const fell = fallThrough(s, trap.sprite);
  s.wait(() => s.ram[0x342a] === 0 && cabinId(s.ram) !== id, 300);
  s.tick(40);
  const back = travelTo(s, id);
  s.tick(20);
  check('ORIGINAL: the boards are back', fell && back && !trap.isOpen(s.ram));
}

console.log(failures ? `${failures} failed` : 'all good');
process.exit(failures ? 1 : 0);
