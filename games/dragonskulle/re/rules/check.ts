/**
 * Dragonskulle's rules the game never explains, proved by running its code (re/README.md, "Rules the
 * game never explains"): the bridges, the dragons, the cloak and the second cloak, the starfish. Each is
 * read from the blocks' code and then played: on the native port, and on the original (the 6502 code on
 * c64kit's C64, from the same state with the same inputs and pokes) where that is cheap.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/re/rules/check.ts [bridges|dragons|cloak|cloak2|starfish]
 */
import { must } from '../../../shared/test/must';
import { check, finish } from '../../../shared/test/check';
import type { MachineState } from '../../../../packages/c64kit/src/c64/machine';
import {
  ACTION, DOWN, DRAGON_ROOMS, FIRE, FRAMES_A_SECOND, LEFT, MACHINES, RIGHT, RIVERS, STAND, UP, cellOf, enter, faceUp, hex, kill, native, original, routeState, sprite, titleState, walkTo,
  type Player, type River,
} from './lab';

const only = process.argv[2] ?? '';
const wanted = (name: string) => !only || only === name;

// ---- the bridges --------------------------------------------------------------------------------------
if (wanted('bridges')) {
  /** What would hurt him or push him back parked: the skull, the insect, the foot's hurt flag; the unseen skull at the foot too, if `trip`. */
  const park = (river: River, trip = true) => (p: Player) => {
    p.ram[river.skull] = 0; p.ram[river.insect] = 0; p.ram[river.hurt] = 0;
    if (trip) p.vic[0x0d] = 0; // (sprite 6's y: the unseen skull at the bridge's foot)
  };
  const tiles = (r: Uint8Array) => { let n = 0; for (let a = 0x400 + 3 * 40; a < 0x400 + 22 * 40; a++) if (r[a] === 0x62) n++; return n; };
  /** The unseen skull's picture: the 64 bytes at $0980 (sprite 6's data), and the skull's own, kept at $5540. */
  const footImage = (r: Uint8Array) => r.slice(0x980, 0x9c0).join(',');
  const skullImage = (r: Uint8Array) => r.slice(0x5540, 0x5580).join(',');

  for (const river of RIVERS) {
    const name = `room ${river.room} (cell ${river.cell.join(',')})`;
    const start = enter(river.cell[0], river.cell[1]);
    const r0 = native(start).ram;
    check(`${name}: block ${river.room}, the bridge is tile $62 (${tiles(r0)} of them), the setup sets $72C0 = ${r0[0x72c0]}, the count ${hex(river.counter, 4)} = ${r0[river.counter]}`, r0[0x341c] === river.room && tiles(r0) > 0 && r0[0x72c0] === 1 && r0[river.counter] === 0);

    // the count is kept at its address, one a kill, and the bridge opens at the last
    for (const m of MACHINES) {
      if (m.name === 'original' && river.room !== 3) continue; // (the original is slower: one bridge, two kills)
      const p = m.make(start);
      faceUp(p, STAND.x, STAND.y);
      const counts: number[] = [];
      let frames = 0;
      const kills = m.name === 'original' ? 2 : 3;
      for (let k = 0; k < kills; k++) {
        const f = kill(p, river);
        counts.push(p.ram[river.counter]);
        frames += f;
        if (!f) break;
      }
      check(`${name}, ${m.name}: ${kills} stones on the wizard count ${counts.map((_, i) => i + 1).join(', ')} (${counts.join(', ')}) in ${frames} frames`, counts.length === kills && counts.every((n, i) => n === i + 1));
    }

    // the last kill: $FF, and a frame later the river's hazards are gone and the bridge is open ($72C0 = 0)
    for (const m of MACHINES) {
      if (m.name === 'original' && river.room !== 3) continue;
      const p = m.make(start);
      faceUp(p, STAND.x, STAND.y);
      p.ram[river.counter] = river.need - 1;
      const f = kill(p, river);
      const at = p.ram[river.counter], c0 = p.ram[0x72c0];
      p.step(0); p.step(0);
      const hidden = [0, 1, 4, 5, 6].every((n) => p.vic[n * 2 + 1] === 0);
      check(`${name}, ${m.name}: the ${river.need}th kill (${f} frames) makes the count $${hex(at)}, and a frame on $72C0 = ${p.ram[0x72c0]} (was ${c0}) with every creature gone`, f > 0 && at === 0xff && p.ram[0x72c0] === 0 && hidden);
    }

    // what holds the bridge: its tiles ($62 are floor only while $72C0 is 0), and the unseen skull at its foot
    const up = (r: Uint8Array) => r[0x20a8] === river.cell[0] && r[0x20a9] === river.cell[1] + 1;
    const stay = (r: Uint8Array) => r[0x20a8] === river.cell[0] && r[0x20a9] === river.cell[1] && r[0x341c] === river.room;
    const score = (r: Uint8Array) => r[0x341e];
    const closed = walkTo(start, up, park(river), { stay, score, maxNodes: 60000 });
    check(`${name}: with the count short, no way across the bridge to the cave mouth, the unseen skull set aside (${closed.exhausted ? 'every place he can stand' : 'not all places'} tried: ${closed.nodes} moves)`, closed.path === null && closed.exhausted);
    const switched = walkTo(start, up, (p) => { park(river)(p); p.ram[0x72c0] = 0; }, { stay, score, maxNodes: 60000 });
    check(`${name}: with $72C0 = 0 held and the count still short there is one (${switched.path ? switched.path.length : 0} moves of 3 frames): the tiles are what is shut`, switched.path !== null);
    const solved = native(start);
    solved.ram[river.counter] = 0xff;
    for (let k = 0; k < 3; k++) solved.step(0);
    const solvedState = solved.save();
    const open = walkTo(solvedState, up, park(river, false), { stay, score, maxNodes: 60000 });
    check(`${name}: with the count at $FF there is, the unseen skull as it is (${open.path ? open.path.length : 0} moves of 3 frames, ${open.nodes} tried)`, open.path !== null);

    // the unseen skull at the foot: a skull in the picture, a hurt, and he is put back, each time he steps there
    for (const m of MACHINES) {
      if (m.name === 'original' && river.room !== 3) continue;
      const trip = (s: MachineState) => {
        const p = m.make(s);
        for (let k = 0; k < 3; k++) p.step(0);
        p.place(0x98, 0x94);
        p.ram[river.hurt] = 0;
        let hurt = 0;
        for (let k = 0; k < 4; k++) { p.step(0); hurt = Math.max(hurt, p.ram[river.hurt]); }
        return { hurt, y: p.ram[0x341e], image: footImage(p.ram) === skullImage(p.ram) };
      };
      const t = trip(start), done = trip(solvedState);
      check(`${name}, ${m.name}: stepping onto the foot with the count short: hurt ${t.hurt}, put back at y $${hex(t.y)}, the unseen sprite is the skull ${t.image}; with the count at $FF: hurt ${done.hurt}`, t.hurt === 1 && t.y === 0x99 && t.image && done.hurt === 0);
    }

    // only the wizard counts: a stone put on each creature in turn (the game reads the VIC's collision register and compares places)
    for (const m of MACHINES) {
      if (m.name === 'original' && river.room !== 3) continue;
      const struck = (n: number, dy = 0) => {
        const p = m.make(start);
        let frames = 0;
        for (; frames < 1500; frames++) {
          const s = sprite(p, n);
          if (s.on && s.y > 0 && s.x > 60 && s.x < 230) break;
          p.ram[river.skull] = n === 1 ? p.ram[river.skull] : 0;
          p.ram[river.insect] = n === 4 ? p.ram[river.insect] : 0;
          p.step(0);
        }
        const t = sprite(p, n);
        const counter = p.ram[river.counter];
        // a stone in flight (its state $1FEF = 2, its place $1256/$1257 and the VIC's sprite 3) on it, put there each frame
        // (the game moves it 12 up first, and the skull bobs): until it is taken or 40 frames have gone
        for (let k = 0; k < 40 && sprite(p, n).y > 0; k++) {
          const at = sprite(p, n);
          p.ram[0x1fef] = 2; p.ram[0x1256] = at.x & 255; p.ram[0x1257] = at.y + dy;
          p.vic[0x06] = at.x & 255; p.vic[0x07] = at.y + dy; p.vic[0x10] = (p.vic[0x10] & ~8) | (at.x > 255 ? 8 : 0); p.vic[0x15] |= 8;
          p.step(0);
        }
        return { gone: sprite(p, n).y === 0, counted: p.ram[river.counter] - counter, at: `${t.x},${t.y}` };
      };
      const wizard = struck(5), skull = struck(1, 14), insect = struck(4, 14);
      check(`${name}, ${m.name}: a stone on the wizard (${wizard.at}) counts ${wizard.counted}, he is gone ${wizard.gone}`, wizard.counted === 1 && wizard.gone);
      check(`${name}, ${m.name}: a stone on the skull (${skull.at}) takes it (${skull.gone}) and counts ${skull.counted}; on the insect (${insect.at}) takes it (${insect.gone}), counts ${insect.counted}`, skull.gone && skull.counted === 0 && insect.gone && insect.counted === 0);
    }

    // kept: by a save (and the original from it), and by travel away and back
    {
      const p = native(start);
      faceUp(p, STAND.x, STAND.y);
      for (let k = 0; k < 2; k++) kill(p, river);
      for (let k = 0; k < 120; k++) p.step(0);
      const kept = p.ram[river.counter];
      const saved = p.save();
      const again = native(saved), orig = original(saved);
      for (let k = 0; k < 60; k++) { again.step(0); orig.step(0); }
      const there = enter(river.cell[0], river.cell[1] - 1, saved);
      const back = native(enter(river.cell[0], river.cell[1], there));
      check(`${name}: two kills ($${hex(kept)}) are kept by a save (${again.ram[river.counter]}, and in the original ${orig.ram[river.counter]}) and by travel to the screen below and back (${back.ram[river.counter]})`, kept === 2 && again.ram[river.counter] === 2 && orig.ram[river.counter] === 2 && back.ram[river.counter] === 2);
    }
  }

  // the screen below a bridge: walked down to, $72C0 is 0 (the exit down clears it, $26BF); travel must leave it so too
  {
    const river = must(RIVERS[0], 'a river');
    const start = enter(river.cell[0], river.cell[1]);
    const walked = native(start);
    for (let k = 0; k < 90 && cellOf(walked.ram) === river.cell.join(','); k++) walked.step(DOWN);
    const travelled = native(enter(river.cell[0], river.cell[1] - 1, start));
    for (let k = 0; k < 3; k++) { walked.step(0); travelled.step(0); }
    check(`walking down out of room ${river.room} into ${cellOf(walked.ram)} (room ${walked.ram[0x341c]}): $72C0 = ${walked.ram[0x72c0]}; travelling there: $72C0 = ${travelled.ram[0x72c0]}`, cellOf(walked.ram) === `${river.cell[0]},${river.cell[1] - 1}` && walked.ram[0x72c0] === 0 && travelled.ram[0x72c0] === walked.ram[0x72c0]);
  }
  // a new game clears every count and the dragons ($0A9D-$0AAC, $0AD7: the code's own bytes)
  {
    const ram = titleState().ram;
    const clears = (at: number, addr: number) => ram[at] === 0x8d && ram[at + 1] === (addr & 255) && ram[at + 2] === addr >> 8;
    check('the start of a game stores 0 in $343A, $343B, $343C ($0A9D, $0AA0, $0AA3) and clears $72B0-$72BF (the loop at $0AD7)', clears(0xa9d, 0x343a) && clears(0xaa0, 0x343b) && clears(0xaa3, 0x343c) && ram[0xad9] === 0x9d && ram[0xada] === 0xb0 && ram[0xadb] === 0x72 && ram[0xade] === 0x10);
  }
}

// ---- the dragons --------------------------------------------------------------------------------------
if (wanted('dragons')) {
  const HITS = 0x676f, DYING = 0x6763, THROWN = 0x72b7, WAY_UP = 0x3441;
  /** Stones thrown without pause from (x, y a3), facing `key`, for `frames` frames; the frame each hit was counted. */
  const volley = (p: Player, x: number, key: number, frames: number, stop = 99) => {
    for (let k = 0; k < 2; k++) p.step(key);
    const hits: number[] = [];
    let last = p.ram[HITS];
    for (let f = 0; f < frames && hits.length < stop; f++) {
      p.ram[0x12eb] = ACTION.stone;
      p.place(x, STAND.y);
      p.step(FIRE);
      if (p.ram[HITS] !== last) { hits.push(f); last = p.ram[HITS]; }
    }
    return hits;
  };

  for (const d of DRAGON_ROOMS) {
    const name = `room ${d.room} (cell ${d.cell.join(',')})`;
    const start = enter(d.cell[0], d.cell[1]);
    const r0 = native(start).ram;
    check(`${name}: block $D870; arriving: the way up ($3441) shut, ${hex(d.flag, 4)} = ${r0[d.flag]} (not killed), hits ($676F) ${r0[HITS]}`, r0[0x341c] === d.room && r0[WAY_UP] === 0 && r0[d.flag] === 0 && r0[HITS] === 0);

    // stones thrown up are counted, one each, and only they (the way he faces when he throws: $72B7 = 3)
    for (const m of MACHINES) {
      if (m.name === 'original' && d.room !== 8) continue;
      const want = m.name === 'original' ? 2 : 3; // (the original's timers run a little differently: fewer in the same time)
      const up = volley(m.make(start), 0xb8, UP, 3000, want);
      const sideways = [LEFT, RIGHT].map((key) => [0x60, 0x80, 0xa0, 0xc0].reduce((n, x) => n + volley(m.make(start), x, key, 400).length, 0));
      check(`${name}, ${m.name}: ${up.length} stones thrown facing up are counted (at frames ${up.join(', ')}); thrown left ${sideways[0]}, thrown right ${sideways[1]} from four places each`, up.length === want && sideways[0] === 0 && sideways[1] === 0);
    }

    // the tenth: the dragon dies (240 frames), then its flag is set for good and the way up opens
    for (const m of MACHINES) {
      if (m.name === 'original' && d.room !== 8) continue;
      const p = m.make(start);
      p.ram[HITS] = 9;
      const hit = volley(p, 0xb8, UP, 3000, 1);
      const r = p.ram, thrown = r[THROWN];
      let dying = 0, frames = 0;
      while (r[d.flag] !== 1 && frames++ < 400) { if (r[DYING] !== 0 && !dying) dying = frames; p.step(0); }
      const hidden = [0, 1, 4, 5, 6, 7].every((n) => p.vic[n * 2 + 1] === 0);
      check(`${name}, ${m.name}: the tenth hit (frame ${hit[0] ?? -1}, thrown facing ${thrown}) starts the death ($6763 counts to $F0), ${frames} frames on the flag is set ($${hex(r[d.flag])}), the way up ($3441) is ${r[WAY_UP]}, every part of it gone ${hidden}`, hit.length === 1 && thrown === 3 && r[d.flag] === 1 && r[WAY_UP] === 1 && hidden && frames >= 200 && frames <= 260);
    }

    // coming back: nothing left of it, the way up open; a living one starts again from no hits
    {
      const p = native(start);
      p.ram[HITS] = 6;
      p.step(0);
      const killed = native(start);
      killed.ram[d.flag] = 1;
      killed.step(0);
      const s2 = enter(d.cell[0], d.cell[1], killed.save());
      const after = native(s2);
      const alive = native(enter(d.cell[0], d.cell[1], p.save()));
      const hid = [0, 1, 4, 5, 6, 7].every((n) => after.vic[n * 2 + 1] === 0);
      check(`${name}: with its flag set, coming in finds no dragon (${hid}) and the way up open ($3441 = ${after.ram[WAY_UP]}); with 6 hits and no flag, coming in finds ${alive.ram[HITS]} hits and the way shut (${alive.ram[WAY_UP]})`, hid && after.ram[WAY_UP] === 1 && alive.ram[HITS] === 0 && alive.ram[WAY_UP] === 0);
    }
  }

  // the way up out of a screen needs $3441 (the engine's check on facing up at the exit, $264C): shut until the dragon is dead
  {
    const d = must(DRAGON_ROOMS[2], 'a dragon room');
    const start = enter(d.cell[0], d.cell[1]);
    const out = (open: number) => {
      const p = native(start);
      p.ram[WAY_UP] = open;
      p.place(0x54, 0x72);
      for (let k = 0; k < 40 && cellOf(p.ram) === d.cell.join(','); k++) { p.ram[0x72c0] = 0; p.ram[WAY_UP] = open; p.step(UP); }
      return cellOf(p.ram);
    };
    const shut = out(0), opened = out(1);
    check(`room ${d.room}: standing at the way up facing up: with $3441 = 0 he stays (${shut}); with $3441 = 1 he goes up to ${opened}`, shut === d.cell.join(',') && opened === `${d.cell[0]},${d.cell[1] + 1}`);
  }
}

// ---- the cloak ----------------------------------------------------------------------------------------
if (wanted('cloak')) {
  const IN_USE = 0x3417, HAVE = 0x3430, LOW = 0x124a, HIGH = 0x124b;
  /** One frame with the cloak icon (the hand on it) and fire, from the first frame: the cloak is put on. */
  const putOn = (p: Player) => { for (let k = 0; k < 3; k++) { p.ram[0x12eb] = ACTION.cloak; p.step(k < 2 ? FIRE : 0); } };
  const quiet = enter(4, 1); // (a screen with nothing in it: block 0)

  for (const m of MACHINES) {
    const p = m.make(quiet);
    p.ram[HAVE] = 1;
    p.step(0);
    const colours = new Set<number>();
    const before = { use: p.ram[IN_USE], hires: p.vic[0x1c] & 4 };
    let frames = 0;
    p.ram[0x12eb] = ACTION.cloak; p.step(FIRE); frames++;
    const started = p.ram[IN_USE];
    p.step(0); frames++;
    // (pressing it again, and trying a stone: nothing; the counter runs on)
    let thrown = 0, counters: string[] = [];
    while (p.ram[IN_USE] !== 0 && frames < 1200) {
      if (frames % 100 === 0) { p.ram[0x12eb] = ACTION.cloak; p.step(FIRE); } else if (frames % 100 === 50) { p.ram[0x12eb] = ACTION.stone; p.step(FIRE); } else p.step(0);
      thrown = Math.max(thrown, p.ram[0x1fef]);
      colours.add(p.vic[0x29]);
      if (frames % 256 === 1) counters.push(`${p.ram[HIGH]}:${p.ram[LOW]}`);
      frames++;
    }
    check(`${m.name}: the cloak ($3430 = 1, the hand on it, fire) sets $3417 = ${started}, Pendragon's colour flickers (${colours.size} colours seen) and he is drawn hi-res (was ${before.hires ? 'multicolour' : 'hi-res'}); a stone is never thrown while it is on (${thrown}); the counter $124B:$124A runs ${counters.join(' ')}`, before.use === 0 && started === 1 && colours.size > 20 && thrown === 0);
    check(`${m.name}: it lasts ${frames} frames (${(frames / FRAMES_A_SECOND).toFixed(1)} seconds at 50.125 a second): the cloak is gone ($3430 = ${p.ram[HAVE]}), $3417 = ${p.ram[IN_USE]}, multicolour back (${(p.vic[0x1c] >> 2) & 1}), the colour the game's own again (${p.vic[0x29]})`, frames === 769 && p.ram[HAVE] === 0 && p.ram[IN_USE] === 0 && (p.vic[0x1c] & 4) !== 0 && p.vic[0x29] === 10);
  }
  // walking about it lasts as long; a jump or a dig runs the counter a little faster (a few frames count twice)
  {
    const run = (actions: number[], keysOf: (r: () => number) => number) => {
      const p = native(quiet);
      p.ram[HAVE] = 1; p.step(0);
      putOn(p);
      let frames = 3, seed = 5;
      const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
      while (p.ram[IN_USE] !== 0 && frames < 2000) {
        const keys = keysOf(rnd);
        p.ram[0x12eb] = actions[Math.floor(rnd() * actions.length)];
        p.ram[0x342f] = 1;
        p.place(0x80, 0xa0);
        for (let k = 0; k < 7 && p.ram[IN_USE] !== 0; k++) { p.step(keys); frames++; }
      }
      return frames;
    };
    const walking = run([ACTION.jump], () => LEFT);
    const stopping = run([ACTION.jump], (r) => [0, LEFT, RIGHT][Math.floor(r() * 3)]);
    const busy = run([ACTION.jump, ACTION.shovel], (r) => [0, LEFT, RIGHT, FIRE, LEFT | FIRE, RIGHT | FIRE][Math.floor(r() * 6)]);
    check(`walking steadily it lasts the same (${walking} frames); stopping and starting all the time ${stopping}, jumping and digging all the time ${busy}: a little less (the counter takes an extra step each time he stops, jumps or digs)`, walking === 769 && stopping < 769 && stopping > 700 && busy < 769 && busy > 700);
  }

  // what it is for: the beach's skull (the barred mouth, sprite 4) hurts him unless the cloak is on; and nothing else it does not stop
  const beach = routeState(0, 800);
  for (const m of MACHINES) {
    const gate = (cloaked: boolean) => {
      const p = m.make(beach);
      if (cloaked) { p.ram[HAVE] = 1; putOn(p); }
      let hurt = 0;
      for (let f = 0; f < 40; f++) {
        const g = sprite(p, 4);
        p.place((g.x + 4) & 255, 0x92, g.x + 4 > 255);
        p.step(0);
        hurt += p.ram[0x63d0];
      }
      return { hurt, collided: (p.ram[0x3414] & 0x14) === 0x14 };
    };
    const bare = gate(false), cloaked = gate(true);
    check(`${m.name}: on the beach in the skull's mouth (sprite 4, his y under $9A) he is hurt (${bare.hurt > 0}) unless cloaked (${cloaked.hurt > 0}, though the sprites touch: ${cloaked.collided})`, bare.hurt > 0 && cloaked.hurt === 0 && cloaked.collided);
  }
  // ... and still the starfish is needed to go on: the way up at the mouth wants $3441, cloak or not
  {
    const goes = (way: number) => {
      const p = native(beach);
      p.ram[HAVE] = 1; putOn(p);
      let from = cellOf(p.ram);
      for (let f = 0; f < 80 && cellOf(p.ram) === from; f++) { p.ram[0x3441] = way; p.place(0x0a, 0x92, true); p.step(UP); }
      return cellOf(p.ram);
    };
    const shut = goes(0), open = goes(1);
    check(`cloaked at the mouth, facing up: with $3441 = 0 he stays on the beach (${shut}); with $3441 = 1 he goes on (${open})`, shut === '0,0' && open !== '0,0');
  }
  // what else it does: his sprite is hi-res, and every block's hurt checks run only for a multicolour one ($D01C bit 2): nothing hurts him while it is on
  {
    const hurts = (cloaked: boolean, frames: number) => {
      const p = native(enter(3, 2));
      p.ram[HAVE] = 1; p.step(0);
      if (cloaked) putOn(p);
      let n = 0, was = 0;
      for (let f = 0; f < frames; f++) { p.step(0); if (p.ram[0x65f6] === 1 && was === 0) n++; was = p.ram[0x65f6]; }
      return { n, on: p.ram[IN_USE] !== 0 };
    };
    const bare = hurts(false, 700), cloaked = hurts(true, 700);
    check(`room 17, 700 frames standing under the falling rocks: ${bare.n} hurts without the cloak, ${cloaked.n} with it (still on: ${cloaked.on})`, bare.n >= 3 && cloaked.n === 0 && cloaked.on);
    // every block that hurts reads $D01C first: the bytes `LDA $D01C; AND #$04; CMP #$04` before its first collision test
    const reads = (ram: Uint8Array, lo: number, hi: number) => { let n = 0; for (let a = lo; a < hi; a++) if (ram[a] === 0xad && ram[a + 1] === 0x1c && ram[a + 2] === 0xd0 && ram[a + 3] === 0x29 && ram[a + 4] === 0x04 && ram[a + 5] === 0xc9 && ram[a + 6] === 0x04) n++; return n; };
    const ram = titleState().ram;
    const homes: [string, number, number][] = [['$6000 (rooms 3, 4)', 0x6000, 0x6c00], ['$C400 (room 2)', 0xc400, 0xce00], ['$CD50 (room 5)', 0xcd50, 0xd950], ['$D870 (rooms 6-9)', 0xd870, 0xe170], ['$E010 (rooms 10-15)', 0xe010, 0xe510], ['$E900 (room 17)', 0xe900, 0xf000], ['$EF20 (room 18)', 0xef20, 0xf320], ['$F220 (room 19)', 0xf220, 0xf520], ['$F470 (room 20)', 0xf470, 0xf770]];
    const lacking = homes.filter(([, lo, hi]) => reads(ram, lo, hi) === 0).map(([n]) => n);
    check(`every block with creatures tests his sprite's multicolour bit before its collisions (${homes.length - lacking.length} of ${homes.length}${lacking.length ? `, not: ${lacking.join(', ')}` : ''})`, lacking.length === 0);
  }
}

// ---- the second cloak ---------------------------------------------------------------------------------
if (wanted('cloak2')) {
  const HAVE = 0x3430, DUG = 0x342e, STATE = 0x65f2, FALLING = 0x6600;
  /**
   * Room 17 (cell 3,2 and nine others, block $E900): every 240 frames a rock falls from the top (sprites 0, 1 and 5) at where he was; sprite 5's
   * colour flickers once it has been let go once ($65F2 = 1). Standing where sprite 5 will land at the time it starts to fall: caught?
   */
  const catches = (m: (typeof MACHINES)[number], dug: boolean, want: number) => {
    const p = m.make(enter(3, 2));
    p.ram[DUG] = dug ? 1 : 0; p.ram[HAVE] = 0; p.step(0);
    const log: string[] = [];
    let got = 0, hurtBy5 = 0, placed = false;
    for (let f = 0; f < 6000 && got < want && hurtBy5 < 2; f++) {
      const s5 = sprite(p, 5);
      if (!placed && p.ram[FALLING] === 1 && s5.on && s5.y < 100) { p.place(s5.x & 255, 0xa3, s5.x > 255); placed = true; }
      if (p.ram[FALLING] === 0) placed = false;
      const had = p.ram[HAVE], state = p.ram[STATE], hurt = p.ram[0x65f6];
      p.step(0);
      if (p.ram[STATE] === 2 && state === 1) {
        got++;
        log.push(`caught at frame ${f}: $65F2 1 -> 2, $3430 ${had} -> ${p.ram[HAVE]}`);
        // use it up (the cloak runs out after 769 frames) and wait for the next
        for (let k = 0; k < 3; k++) { p.ram[0x12eb] = ACTION.cloak; p.step(k < 2 ? FIRE : 0); }
        let n = 3;
        while (p.ram[HAVE] === 1 && n < 1200) { p.step(0); n++; }
        log.push(`used up after ${n} frames ($3430 = ${p.ram[HAVE]})`);
        f += n; placed = false;
      } else if (placed && p.ram[0x65f6] === 1 && hurt === 0 && p.ram[STATE] === 1) hurtBy5++;
    }
    return { got, hurtBy5, log };
  };
  for (const m of MACHINES) {
    const want = m.name === 'original' ? 2 : 3;
    const dug = catches(m, true, want), bare = catches(m, false, 1);
    check(`${m.name}: having dug the cloak up ($342E = 1), catching the flickering rock in room 17 gives the cloak again, ${dug.got} times in a row (${dug.log.join('; ')})`, dug.got === want);
    check(`${m.name}: without the cloak dug up ($342E = 0) the same rock only hurts him (${bare.hurtBy5} times, ${bare.got} cloaks)`, bare.got === 0 && bare.hurtBy5 >= 1);
  }
}

// ---- the tombs ----------------------------------------------------------------------------------------
if (wanted('tombs')) {
  // Block $E010 (rooms 10-15): a grave to dig up with the shovel, four digs of sixteen frames while his sprite is on the mound. Rooms 10-12
  // ($6426 = 1) give a harmless sprite; rooms 13-15 ($6426 = 0) send a ghost up through him, which hurts him over and over.
  const TOMBS: readonly { room: number; cell: readonly [number, number]; good: boolean }[] = [
    { room: 10, cell: [5, 4], good: true }, { room: 11, cell: [4, 10], good: true }, { room: 12, cell: [7, 21], good: true },
    { room: 13, cell: [1, 2], good: false }, { room: 14, cell: [13, 4], good: false }, { room: 15, cell: [15, 15], good: false },
  ];
  for (const t of TOMBS) {
    const start = enter(t.cell[0], t.cell[1]);
    for (const cloaked of [false, true]) {
      const p = native(start);
      p.ram[0x342f] = 1; p.ram[0x3430] = 1; p.step(0);
      if (cloaked) for (let k = 0; k < 3; k++) { p.ram[0x12eb] = ACTION.cloak; p.step(k < 2 ? FIRE : 0); }
      let hurts = 0, was = 0, done = -1;
      for (let f = 0; f < 400; f++) {
        p.ram[0x12eb] = ACTION.shovel;
        const s5 = sprite(p, 5), s6 = sprite(p, 6);
        if (done < 0) p.place(s5.x & 255, s6.y - 12, s5.x > 255);
        p.step(done < 0 ? FIRE : 0);
        if (done < 0 && p.ram[0x6430] === 4) done = f;
        if (p.ram[0x642d] === 1 && was === 0) hurts++;
        was = p.ram[0x642d];
      }
      if (cloaked) { check(`room ${t.room} (cell ${t.cell.join(',')}), cloaked: the digging goes nowhere (the stage stays ${p.ram[0x6430]}: the grave's collisions are among what the cloak turns off), and no hurts (${hurts})`, done < 0 && hurts === 0); continue; }
      check(`room ${t.room} (cell ${t.cell.join(',')}), ${t.good ? 'a good grave ($6426 = 1)' : 'an evil grave ($6426 = 0)'}: four digs of sixteen frames (the fourth by frame ${done}), then ${hurts} hurts standing there`, p.ram[0x6426] === (t.good ? 1 : 0) && done > 0 && (t.good ? hurts === 0 : hurts >= 3));
    }
  }
}

// ---- the starfish -------------------------------------------------------------------------------------
if (wanted('starfish')) {
  const WAY_ON = 0x3441, STARFISH_COLOUR = 0x2d;
  const beach = routeState(0, 880);
  for (const m of MACHINES) {
    const touch = (y: number, wayOn: number, frames: number) => {
      const p = m.make(beach);
      p.ram[WAY_ON] = wayOn;
      const star = sprite(p, 6);
      const colours = new Set<number>();
      let first = -1;
      for (let f = 0; f < frames; f++) {
        p.place((star.x + 8) & 255, y, star.x + 8 > 255);
        p.step(0);
        colours.add(p.vic[STARFISH_COLOUR]);
        if (first < 0 && p.ram[WAY_ON] === 1) first = f;
      }
      const bars = p.ram.slice(0x912, 0x930).every((b) => b === 0);
      return { colours: colours.size, way: p.ram[WAY_ON], first, bars, star };
    };
    const on = sprite(m.make(beach), 6);
    const ahead = touch(0x90, 0, 20), below = touch(0xa0, 0, 20), after = touch(0x90, 1, 20), none = m.make(beach);
    for (let f = 0; f < 20; f++) none.step(0);
    check(`${m.name}: the starfish is sprite 6 (on screen at ${on.x},${on.y} on the beach); with his y under $9A on it, $3441 becomes ${ahead.way} (frame ${ahead.first}) and the cave mouth's bars (sprite 4's picture, $0912-$092F) are rubbed out (${ahead.bars}); lower down than that, $3441 stays ${below.way}`, on.on && ahead.way === 1 && ahead.bars && below.way === 0);
    check(`${m.name}: it blinks (its colour, $D02D, takes ${ahead.colours} different values in 20 frames) whenever he is on it, with $3441 = 0 (${ahead.colours}), with it already 1 (${after.colours}) and below the line (${below.colours} value${below.colours === 1 ? '' : 's'}: it only flashes when it counts); standing off it, ${(() => { const c = new Set<number>(); for (let f = 0; f < 20; f++) { none.step(0); c.add(none.vic[STARFISH_COLOUR]); } return c.size; })()} value`, ahead.colours > 8 && after.colours > 8 && none.vic[STARFISH_COLOUR] === 12);
  }
}

finish();
