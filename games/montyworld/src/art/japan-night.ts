/**
 * Japan's city at night and its station, in the same manner as the rest of Japan's decorations (japan-decor.ts): solid ink with the detail cut into it as black
 * lines, one ink a character. Towers with their windows lit, tall neon signs in several colours (no real names: strokes of an invented script), the crowd of the
 * scramble crossing as coloured silhouettes, the dog statue by the station, a pachinko machine in four colours, and the bullet train's platform: its overhead
 * wire and mast, the safety line along its edge, a destination sign and a clock. Every name starts `jp`.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A lit window grid: a 2 x 3 pixel window every 4 x 5, some dark (a fixed pattern by position, so every tower differs). */
function windows(r: Raster, x0: number, y0: number, x1: number, y1: number, seed: number) {
  for (let y = y0; y + 2 <= y1; y += 5) for (let x = x0; x + 1 <= x1; x += 4) {
    if ((x * 7 + y * 3 + seed) % 5 !== 0) r.rect(x, y, x + 1, y + 2);
  }
}

/** A tower block: its outline, a lit window grid, a stepped crown and an aerial with a red lamp. `w` x `h` characters. */
function tower(name: string, w: number, h: number, colour: number, seed: number, crown: boolean): NewDecor {
  const r = new Raster(w * 8, h * 8);
  const top = crown ? 12 : 3;
  r.frame(0, top, w * 8 - 1, h * 8 - 1);
  windows(r, 3, top + 3, w * 8 - 4, h * 8 - 3, seed);
  if (crown) {
    r.frame(w * 4 - 5, 6, w * 4 + 4, top); // the step on the roof
    r.rect(w * 4 - 1, 0, w * 4, 6); r.rect(w * 4 - 2, 0, w * 4 + 1, 1); // the aerial and its lamp
    windows(r, w * 4 - 3, 8, w * 4 + 2, 11, seed + 1);
  }
  return decor(name, w, h, r, colour);
}

/** A tall vertical neon sign: a bar of light each end, a frame, and strokes of an invented script down it. `w` x `h` characters, a colour a row of characters. */
function neonSign(name: string, w: number, h: number, seed: number, colours: readonly string[]): NewDecor {
  const r = new Raster(w * 8, h * 8);
  r.rect(0, 0, w * 8 - 1, h * 8 - 1); r.rect(2, 2, w * 8 - 3, h * 8 - 3, false);
  for (let k = 0; k < h * 8 / 10 - 1; k++) { // a glyph every ten pixels: a few strokes picked by position
    const y = 5 + k * 10, x = 4, gw = w * 8 - 9;
    if ((seed + k) % 3 !== 0) r.rect(x, y, x + gw, y + 1);
    if ((seed + k) % 2 === 0) r.rect(x + Math.floor(gw / 2), y, x + Math.floor(gw / 2) + 1, y + 6);
    if ((seed + k * 2) % 3 === 0) r.rect(x, y + 2, x + 1, y + 6);
    if ((seed + k) % 4 !== 1) r.rect(x + gw - 1, y + 3, x + gw, y + 7);
    r.rect(x, y + 7, x + gw - 2, y + 7, (seed + k) % 2 === 0);
  }
  return decor(name, w, h, r, colours);
}

/** A crowd: heads and shoulders of figures at their own heights, `w` characters across and two tall, in one ink. */
function crowd(name: string, w: number, colour: number, seed: number): NewDecor {
  const r = new Raster(w * 8, 16);
  for (let x = 3, k = seed; x < w * 8 - 2; x += 6, k++) {
    const up = [0, 2, 1, 3, 0, 2][k % 6] ?? 0;
    r.disc(x, 5 + up, 2.6); // the head
    r.rect(x - 3, 9 + up, x + 3, 15); // the shoulders and body
    r.rect(x - 1, 8 + up, x + 1, 8 + up); // the neck
    if (k % 5 === 0) { r.rect(x + 4, 6 + up, x + 4, 12 + up); r.rect(x - 7, 6 + up, x + 6, 6 + up); } // a raised umbrella
    if (k % 4 === 1) r.rect(x + 3, 10 + up, x + 5, 14 + up, false); // a bag's strap, cut
  }
  return decor(name, w, 2, r, colour);
}

/** Hachiko, the faithful dog's statue: a sitting Akita on a plinth, ears pricked, tail curled. 3 x 3 characters. */
function hachiko(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(0, 18, 23, 23); r.rect(2, 20, 21, 20, false); // the plinth
  r.ellipse(11, 14, 6.5, 5); // the haunch and body
  r.rect(7, 8, 12, 15); // the chest, upright
  r.disc(9.5, 6, 4); r.triangle(5.5, 4, 6.5, -1, 8.5, 3); r.triangle(10.5, 3, 12.5, -1, 13.5, 4.5); // head and ears
  r.rect(4, 6, 7, 8); // the muzzle
  r.set(8, 5, false); r.set(9, 5, false); r.set(4, 7, false); // the eye, the nose
  r.rect(7, 16, 8, 17, false); r.rect(12, 13, 12, 17, false); // the forelegs' line, the haunch's line
  r.ellipse(18, 11, 3, 4); r.ellipse(18, 11, 1.4, 2.2, false); // the curled tail
  return decor('jpHachiko', 3, 3, r, 9);
}

// ---- the platform

/** A stretch of the overhead wire: the contact wire, a messenger wire over it with droppers between, drawn a cell wide so it runs across the room. 1 x 1 characters. */
function wire(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 5, 7, 5); r.rect(0, 1, 7, 1); r.rect(2, 2, 2, 4); r.rect(6, 2, 6, 4); // two wires and droppers
  return decor('jpWire', 1, 1, r, 12);
}

/** The bullet train's catenary mast: a steel post with a bracket arm over the track that carries the wires. 2 x 6 characters. */
function mast(): NewDecor {
  const r = new Raster(16, 48);
  r.rect(3, 6, 4, 47); r.rect(7, 6, 8, 47, false); r.rect(5, 12, 5, 12); // the post
  r.rect(0, 4, 15, 5); r.rect(0, 0, 0, 5); r.line(3, 9, 12, 5); // the bracket arm and its stay
  for (let y = 16; y < 44; y += 8) { r.line(3, y, 4, y + 8); r.line(4, y, 3, y + 8); } // the lattice
  r.rect(0, 44, 7, 47); // the foot
  return decor('jpMast', 2, 6, r, 12);
}

/** The platform's safety line: a yellow studded strip along the edge, drawn on the bottom of a cell. 1 x 1 characters. */
function edge(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 6, 7, 7); r.rect(1, 6, 1, 6, false); r.rect(5, 6, 5, 6, false); r.rect(3, 7, 3, 7, false); r.rect(7, 7, 7, 7, false);
  return decor('jpEdge', 1, 1, r, 7);
}

/** A hanging station sign: a blue board with a frame, an arrow and strokes of script. 4 x 2 characters. */
function stationSign(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(3, 0, 4, 3); r.rect(27, 0, 28, 3); // the hangers
  r.rect(0, 4, 31, 15); r.rect(2, 6, 29, 13, false);
  r.rect(4, 8, 5, 12); r.rect(4, 8, 8, 8); r.rect(7, 10, 8, 12); r.rect(10, 8, 14, 9); r.rect(12, 8, 13, 12); // strokes
  r.rect(17, 10, 24, 11); r.triangle(23, 8, 23, 13, 28, 10.5); // an arrow
  return decor('jpStationSign', 4, 2, r, ['66', '66'].map((a, i) => a + (i === 0 ? '66' : '66')));
}

/** A station clock: a round face with its hands, on a bracket. 2 x 2 characters. */
function clock(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(7.5, 7.5, 7); r.disc(7.5, 7.5, 5.6); r.rect(7, 3, 8, 8, false); r.rect(8, 8, 11, 8, false); r.rect(7, 1, 8, 1, false); r.rect(7, 13, 8, 13, false);
  r.rect(14, 7, 15, 8, false); r.rect(0, 7, 1, 8, false);
  r.rect(7, 15, 8, 15);
  return decor('jpClock', 2, 2, r, 1);
}

/** A far skyline of stars: a sprinkle of points, a few brighter. 4 x 2 characters. */
function stars(): NewDecor {
  const r = new Raster(32, 16);
  for (const [x, y] of [[3, 2], [10, 8], [17, 3], [25, 11], [29, 4], [6, 13], [21, 14]] as const) r.set(x, y);
  r.rect(13, 12, 14, 12); r.rect(13, 11, 13, 13); r.rect(26, 7, 26, 7);
  return decor('jpStars', 4, 2, r, 1);
}

export const JAPAN_NIGHT = {
  jpTowerYellow: tower('jpTowerYellow', 3, 5, 7, 0, true),
  jpTowerCyan: tower('jpTowerCyan', 2, 6, 3, 2, false),
  jpTowerGreen: tower('jpTowerGreen', 2, 4, 13, 3, false),
  jpNeonRed: neonSign('jpNeonRed', 1, 4, 1, ['2', '2', '7', '7']),
  jpNeonGreen: neonSign('jpNeonGreen', 1, 3, 2, ['5', '5', 'd']),
  jpNeonPink: neonSign('jpNeonPink', 2, 4, 3, ['44', '44', 'aa', 'aa']),
  jpNeonCyan: neonSign('jpNeonCyan', 1, 5, 0, ['3', '3', '3', 'e', 'e']),
  jpCrowdRed: crowd('jpCrowdRed', 4, 2, 0),
  jpCrowdPurple: crowd('jpCrowdPurple', 4, 4, 4),
  jpHachiko: hachiko(),
  jpWire: wire(),
  jpMast: mast(),
  jpEdge: edge(),
  jpStationSign: stationSign(),
  jpClock: clock(),
  jpStars: stars(),
} as const satisfies Record<string, NewDecor>;
