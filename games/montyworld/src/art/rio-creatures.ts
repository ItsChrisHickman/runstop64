/**
 * Rio's creatures for Monty Mole: World Tour (region 7), in Monty on the Run's formats and the earlier regions' manner: bold cartoon
 * figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps, a big face with an
 * expression, no dither. A samba dancer, a drummer, a gaucho waiter (his skewer is a sprite of its own: rio-items.ts), a marmoset, a
 * macaw, a vulture, a capoeirista, a football with a face, Viktor Vole who follows Monty (the agent: his pictures are viktor.ts), a kite and a bat.
 */
import { lay, pair, sym } from './creature-kit';
import { limb, Raster } from './raster';
import type { NewCreature } from './types';
import { VIKTOR_WALK } from './viktor';

// ---- the samba dancer: a fan of plumes, a big smile, arms up, a flaring feathered skirt, hips swaying

/** The dancer's headdress and face, the left half (the right is its mirror), rows 0-7. */
const DANCER_HEAD = [
  '#..#..#.', '##.##.##', '.#######', '....####', '....#.##', '....####', '....#.##', '....####',
] as const;

/** A samba dancer dancing in place, seen front on: arms up and out in turn, the skirt swinging. */
function dancer(): NewCreature {
  const frame = (arms: 0 | 1 | 2 | 3, sway: number) => {
    const r = new Raster(16, 16);
    const skirt = new Raster(16, 16);
    skirt.triangle(7.5 + sway * 0.5, 9, 0.5 + sway, 15.5, 15.5 + sway, 15.5);
    for (let x = 2; x < 15; x += 3) skirt.rect(x + sway, 12, x + sway, 15, false); // the feathers' gaps
    r.stamp(sym(DANCER_HEAD), 0, 0);
    r.rect(5, 8, 10, 10); // the body
    r.rect(6, 9, 9, 9, false);
    lay(r, (s) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (skirt.get(x, y)) s.set(x, y); });
    const hands: readonly (readonly [number, number, number, number])[] = [[1, 4, 14, 4], [1, 4, 15, 10], [0, 8, 15, 8], [0, 10, 14, 4]];
    const [lx, ly, rx, ry] = hands[arms] ?? hands[0] ?? [1, 4, 14, 4];
    limb(r, 4.5, 9, lx, ly, 2); limb(r, 11, 9, rx, ry, 2); // the arms
    r.rect(6 + (sway > 0 ? 1 : 0), 14, 7 + (sway > 0 ? 1 : 0), 15); r.rect(9 + (sway < 0 ? -1 : 0), 14, 10 + (sway < 0 ? -1 : 0), 15);
    return r.rows();
  };
  return pair('dancer', [frame(0, 0), frame(1, 1), frame(2, 0), frame(3, -1)], 3, true);
}

// ---- the drummer: a cap, a big grin, a surdo drum in front, sticks alternating

/** A bateria drummer beating a big surdo drum hung in front of him, the sticks up and down in turn. */
function drummer(): NewCreature {
  const frame = (left: boolean) => {
    const r = new Raster(16, 16);
    r.disc(7.5, 3.8, 3.3); // the head
    r.rect(4, 0, 11, 1); r.rect(3, 2, 12, 2); // the cap and its peak
    r.cut(['#.#'], 5, 3); r.cut(['#.#'], 8, 3); r.cut(['#####'], 5, 6); // the eyes and the grin
    r.rect(6, 5, 9, 5, false); r.rect(6, 5, 6, 5); r.rect(9, 5, 9, 5);
    r.ellipse(7.5, 11.5, 7.4, 4); // the drum
    r.ellipse(7.5, 11.5, 5.4, 2.6, false); r.ellipse(7.5, 11.5, 3.6, 1.6); // its skin
    for (let x = 1; x < 15; x += 3) { r.set(x, 9, false); r.set(x + 1, 14, false); } // the lacing at the rim
    limb(r, 3.5, 8, left ? 1 : 3, left ? 4 : 9, 2); limb(r, 11.5, 8, left ? 12 : 14, left ? 9 : 4, 2); // the arms with their sticks
    r.set(left ? 0 : 3, left ? 3 : 10); r.set(left ? 13 : 15, left ? 10 : 3);
    r.rect(5, 15, 6, 15); r.rect(9, 15, 10, 15);
    return r.rows();
  };
  return pair('drummer', [frame(true), frame(false), frame(true), frame(false)], 5, true);
}

// ---- the gaucho: a wide hat, a moustache, a poncho, one arm up with the skewer (its sprite is rio-items.ts SKEWER_POSES)

/** A gaucho waiter marching to the left, seen front on, his left arm raised to hold the skewer (it is a sprite at his hand: x 1, y 5). */
function gaucho(): NewCreature {
  const frame = (step: number) => {
    const r = new Raster(16, 16);
    r.stamp(sym(['....####', '....####', '########', '.#######', '....####', '....#.##', '....####', '..######']), 0, 0); // the hat, face, moustache
    r.cut(['####'], 6, 7); r.rect(6, 7, 9, 7); r.cut(['##'], 7, 7); // (the moustache's gap)
    const poncho = new Raster(16, 16);
    poncho.triangle(7.5, 8, 0.5, 13, 15.5, 13); poncho.rect(1, 12, 14, 13);
    poncho.rect(6, 9, 9, 10, false); poncho.rect(7, 8, 8, 8);
    lay(r, (s) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (poncho.get(x, y)) s.set(x, y); });
    r.cut(['#.#.#.#.#.#'], 2, 12); // the poncho's stripe
    limb(r, 3.5, 10, 1.5, 6, 2); // the raised arm
    const a = step & 1 ? 1 : 0;
    r.rect(5 - a, 14, 7 - a, 15); r.rect(9 + a, 14, 11 + a, 15); // the legs
    return r.rows();
  };
  return pair('gaucho', [frame(0), frame(1), frame(0), frame(1)], 8);
}

// ---- the marmoset (sagui): a small monkey with white ear tufts and a long tail, leaping

/** A marmoset seen front on, clinging to a rock: a round face between two great white ear tufts, huge eyes, a small grin, a long tail curling up. */
function marmoset(): NewCreature {
  const frame = (a: number) => {
    const r = new Raster(16, 16);
    limb(r, 12, 14, 14.5, 9 + a, 2); limb(r, 14.5, 9 + a, 13, 4 + a * 2, 2); r.set(12, 3 + a * 2); // the tail curling up
    r.ellipse(7.5, 13, 3.6, 3); // the body
    lay(r, (s) => { limb(s, 3.5, 12, 1.5, 15, 2); limb(s, 11.5, 12, 13.5 - a, 15, 2); });
    lay(r, (s) => s.disc(7.5, 7, 4.4)); // the round face
    lay(r, (s) => { limb(s, 3.5, 4.5, 0.5, 1 + a, 3); limb(s, 11.5, 4.5, 14.5, 1 - a, 3); }); // the ear tufts
    r.cut(['##', '##'], 4, 5); r.cut(['##', '##'], 9, 5); r.rect(4, 6, 4, 6); r.rect(10, 6, 10, 6); // the huge eyes
    r.cut(['##'], 7, 8); r.cut(['#....#', '.####.'], 5, 10); // the nose and the grin
    return r.rows();
  };
  return pair('marmoset', [frame(0), frame(1), frame(0), frame(-1)], 8, true);
}

// ---- the macaw: red, a huge hooked beak, a long tail, wings beating

/** A scarlet macaw flying to the left: a hooked beak over a white face patch, a ringed eye, a long tail streaming behind, the wing beating. */
function macaw(): NewCreature {
  const frame = (w: number) => {
    const r = new Raster(16, 16);
    limb(r, 11, 10, 15, 15, 3); // the long tail
    r.ellipse(9, 9, 3.8, 4.6); // the body
    const y = [1, 5, 10, 5][w] ?? 5;
    lay(r, (s) => { s.triangle(8, 8, 14, y, 15, y + 5); s.triangle(8, 8, 15, y + 5, 11, 13); }); // the wing
    r.disc(4.7, 5, 3.4); // the head
    r.triangle(2, 3, 0, 7, 4.5, 8.5); r.rect(0, 5, 3, 8); r.set(0, 8, false); r.set(1, 8, false); // the hooked beak
    r.cut(['.#.', '#.#', '.#.'], 3.5, 3.5); r.rect(4, 4, 4, 4); // the ringed eye
    r.cut(['#'], 1, 6); // the beak's line
    return r.rows();
  };
  return pair('macaw', [0, 1, 2, 3].map(frame), 2);
}

// ---- the vulture (urubu): black, a bare head, wings held in a shallow V, hunched

/** A black vulture soaring, seen front on: broad wings held up in a V and a bare head hunched between them. */
function vulture(): NewCreature {
  const frame = (w: number) => {
    const r = new Raster(16, 16);
    const tip = [1, 4, 8, 4][w] ?? 4;
    for (const s of [0, 1]) {
      const sx = s ? 9 : 6, ex = s ? 15.5 : 0.5;
      limb(r, sx, 8, ex, tip, 4); limb(r, sx, 10, ex, tip + 4, 3);
      r.rect(s ? 12 : 3, tip + 4, s ? 12 : 3, tip + 6, false); r.rect(s ? 14 : 1, tip + 3, s ? 14 : 1, tip + 5, false); // the wing's fingers
    }
    r.ellipse(7.5, 10, 3.2, 4.6); // the hunched body
    r.disc(7.5, 4.6, 2.6); // the bare head
    r.cut(['#.#'], 6, 4); // the eyes
    r.rect(7, 6, 8, 7); r.cut(['#'], 8, 7); // the hooked beak
    r.rect(5, 12, 5, 14); r.rect(10, 12, 10, 14); // the tail feathers
    return r.rows();
  };
  return pair('vulture', [0, 1, 2, 3].map(frame), 12, true);
}

// ---- the capoeirista: a cartwheel, a headband

/** A capoeira dancer turning a cartwheel, a quarter turn a frame: head, trunk, two arms and two legs spread like the spokes of a wheel. */
function capoeirista(): NewCreature {
  const frame = (turn: number) => {
    const r = new Raster(16, 16);
    const a0 = (turn * Math.PI) / 2;
    const at = (deg: number, d: number) => [7.5 + Math.sin(a0 + (deg * Math.PI) / 180) * d, 7.5 - Math.cos(a0 + (deg * Math.PI) / 180) * d] as const;
    for (const deg of [150, 210]) { const [x, y] = at(deg, 7); limb(r, 7.5, 7.5, x, y, 3); } // the legs, wide
    for (const deg of [-35, 35]) { const [x, y] = at(deg, 7); limb(r, 7.5, 7.5, x, y, 2); } // the arms
    const [tx, ty] = at(0, 3); r.disc(7.5, 7.5, 3); // the trunk
    const [hx, hy] = at(0, 5.8); r.disc(hx, hy, 2.5); // the head
    void tx; void ty;
    r.cut(['##'], hx - 1, hy - 0.5); // the headband, dark across the face
    return r.rows();
  };
  return pair('capoeirista', [frame(0), frame(1), frame(2), frame(3)], 1, true);
}


// ---- the kite (pipa): a diamond on its line, its tail of bows swaying

/** A favela kite, a pipa, hanging on its line and bobbing: a diamond with its cross spars cut in black, the tail of bows below it swaying from side to side. */
function rioKite(): NewCreature {
  const frame = (sway: number) => {
    const r = new Raster(16, 16);
    r.triangle(7.5, 0, 1.5, 5, 13.5, 5); r.triangle(1.5, 5, 13.5, 5, 7.5, 11); // the diamond
    r.line(7.5, 1, 7.5, 10, false); r.line(3, 5, 12, 5, false); // the spars
    for (let k = 0; k < 3; k++) { const x = Math.round(7.5 + sway * (k + 1) * 0.6), y = 12 + k * 1.5; r.rect(x - 1, Math.round(y), x + 1, Math.round(y)); } // the bows
    r.set(Math.round(7.5 + sway * 0.3), 11); r.set(Math.round(7.5 + sway * 1.5), 15);
    return r.rows();
  };
  return pair('rioKite', [frame(0), frame(1), frame(0), frame(-1)], 3, true);
}

// ---- the bat: wings flapping, ears up, a grin of fangs

/** A fruit bat of the arches, seen front on, dropping and rising: big ears, eyes, two fangs, the wings beating from up to down. */
function rioBat(): NewCreature {
  const frame = (w: number) => {
    const r = new Raster(16, 16);
    const tip = [1, 4, 9, 4][w] ?? 4;
    for (const side of [0, 1]) {
      const sx = side ? 9 : 6, ex = side ? 15.5 : 0.5;
      r.triangle(sx, 6, ex, tip, sx, 11);
      r.triangle(ex, tip, sx, 11, ex - (side ? 3 : -3), tip + 5);
    }
    r.ellipse(7.5, 8, 2.8, 4); // the body
    r.triangle(5, 2, 6.5, 5, 4.5, 5); r.triangle(10, 2, 8.5, 5, 10.5, 5); // the ears
    r.cut(['#..#'], 6, 6); // the eyes
    r.cut(['####'], 6, 9); r.set(6, 10); r.set(9, 10); // the mouth and its fangs
    return r.rows();
  };
  return pair('rioBat', [0, 1, 2, 3].map(frame), 10, true);
}

// ---- the football: a face on it, bouncing

/** A football with a cheeky face, bouncing: the panels cut in black, squashed flat as it lands and stretched as it leaves. */
function football(): NewCreature {
  const frame = (squash: number, lift: number) => {
    const r = new Raster(16, 16);
    const ry = 7.4 - squash * 1.5, rx = 7.4 + squash * 0.9, cy = Math.round(15.5 - ry - lift);
    r.ellipse(7.5, cy, rx, ry);
    r.cut(['##..##'], 5, cy - 2); r.rect(5, cy - 2, 10, cy - 1); r.cut(['##..##'], 5, cy - 2); // the eyes, two dark squares
    r.cut(['.#..#.'], 5, cy - 1); // (with a lit pupil in each)
    r.cut(['#....#', '.####.'], 5, cy + 1); // the grin
    r.cut(['##'], 1, cy - 4); r.cut(['##'], 13, cy - 4); r.cut(['#'], 7, cy - 5); // panel seams
    return r.rows();
  };
  return pair('football', [frame(0, 0), frame(1.4, 0), frame(0, 5), frame(-0.5, 8)], 3, true);
}

export const RIO_CREATURES = {
  dancer: dancer(),
  drummer: drummer(),
  gaucho: gaucho(),
  marmoset: marmoset(),
  macaw: macaw(),
  vulture: vulture(),
  capoeirista: capoeirista(),
  football: football(),
  agent: VIKTOR_WALK,
  rioKite: rioKite(),
  rioBat: rioBat(),
} as const satisfies Record<string, NewCreature>;

export type RioCreature = keyof typeof RIO_CREATURES;

// ---- the baiana: the turbaned matron of every samba school, her great hooped white skirt turning as she spins

/** A baiana spinning: a white turban, a big smile, beads at the neck, arms out, the wide hooped skirt filling the bottom with its bands turning round (four frames of the spin). */
function baiana(): NewCreature {
  const frame = (turn: number) => {
    const r = new Raster(16, 16);
    r.ellipse(7.5, 1.6, 3.6, 1.8); r.rect(5, 0, 10, 2); // the turban
    r.disc(7.5, 4.6, 2.6); // the face
    r.cut(['#..#'], 6, 4); r.cut(['##'], 7, 6); // the eyes and the smile
    r.rect(6, 7, 9, 8); r.rect(6, 8, 9, 8, false); r.set(7, 8); // the beads at the neck
    limb(r, 5, 8, 1, 7 + (turn % 2), 2); limb(r, 10, 8, 14, 7 + ((turn + 1) % 2), 2); // the arms out, waving
    r.triangle(7.5, 8, -1, 15.5, 16, 15.5); r.rect(1, 13, 14, 15); // the hooped skirt
    for (let k = 0; k < 3; k++) { const x = 1 + ((turn * 2 + k * 5) % 14); r.rect(x, 11, x, 15, false); } // its bands, turning
    r.rect(0, 12, 15, 12, false); // the hoop
    return r.rows();
  };
  return pair('baiana', [frame(0), frame(1), frame(2), frame(3)], 1, true);
}

// ---- the passista: a samba school's star dancer, the great fan of feathers on her back, high stepping

/** A passista dancing: the wide fan of plumes behind her (the costeiro), a smile, arms waving high, a sequinned two-piece, one knee up and then the other. */
function passista(): NewCreature {
  const frame = (step: 0 | 1 | 2 | 3) => {
    const r = new Raster(16, 16);
    for (let k = -4; k <= 4; k++) { const a = (k * 20 * Math.PI) / 180; r.line(7.5, 7, 7.5 + Math.sin(a) * 8, 7 - Math.cos(a) * 7); } // the fan of plumes
    r.ellipse(7.5, 3, 7.5, 3.4); r.ellipse(7.5, 4, 4, 2, false); // (its feathered rim, cut inside)
    r.disc(7.5, 5, 2.4); r.cut(['#..#'], 6, 4); r.cut(['##'], 7, 6); // the face, the eyes, the smile
    r.rect(6, 8, 9, 9); r.rect(6, 10, 9, 10, false); r.rect(6, 11, 9, 11); // the top and the belt
    const arms: readonly (readonly [number, number, number, number])[] = [[1, 3, 14, 6], [2, 7, 13, 2], [1, 6, 14, 3], [3, 2, 12, 7]];
    const [lx, ly, rx, ry] = arms[step] ?? [1, 3, 14, 6];
    limb(r, 5, 9, lx, ly, 2); limb(r, 10, 9, rx, ry, 2);
    const leftUp = step % 2 === 0;
    if (leftUp) { r.rect(5, 12, 6, 13); r.rect(5, 13, 7, 13); r.rect(9, 12, 10, 15); } else { r.rect(9, 12, 10, 13); r.rect(8, 13, 10, 13); r.rect(5, 12, 6, 15); } // a knee up, the other leg down
    return r.rows();
  };
  return pair('passista', [frame(0), frame(1), frame(2), frame(3)], 7, true);
}

/** Rio's creatures added after the region shipped (the carnival's rooms brought back, 2026-11-25): after every region's in the world's list, so no earlier creature's type moves. */
export const RIO_CARNIVAL_CREATURES = {
  baiana: baiana(),
  passista: passista(),
} as const satisfies Record<string, NewCreature>;

