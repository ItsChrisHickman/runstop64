/**
 * Moscow's decorations for Monty Mole: World Tour, in Monty on the Run's decoration format: w x h characters drawn row by row
 * over the playfield (no collision: Monty walks in front of them), a colour for the whole piece or one a character. All new, made
 * in its style: solid ink with the detail cut into it as black lines (outlined, hatched with lines, never dithered), one ink a character on black.
 *
 * A room takes a decoration's characters from $9B up, `w * h` of them, 101 in all, so the big pieces are the room's own: St
 * Basil's (`stBasils`, 80 characters) leaves room for about twenty more.
 */
import { characters, colours } from './pixels';
import { onionDome, Raster, stroke } from './raster';
import type { Colour, NewDecor } from './types';

export function decor(name: string, w: number, h: number, r: Raster, colour: Colour | readonly string[]): NewDecor {
  return { w, h, chr: characters(name, r.rows(), w, h), colour: typeof colour === 'number' ? colour : colours(name, colour, w, h) };
}

/** A round-topped window cut out of a wall, x0 to x0 + w - 1 across, `h` tall from y0. */
function arch(r: Raster, x0: number, y0: number, w: number, h: number) {
  r.rect(x0 + 1, y0, x0 + w - 2, y0, false);
  r.rect(x0, y0 + 1, x0 + w - 1, y0 + h - 1, false);
}

/** A drum under a dome: a block `w` wide from `y0` to `y1` with its windows. */
function drum(r: Raster, cx: number, w: number, y0: number, y1: number) {
  r.rect(cx - w / 2, y0, cx + w / 2 - 1, y1);
  r.rect(cx - w / 2 - 1, y0, cx + w / 2, y0);
  const windows = Math.floor((w - 2) / 4);
  for (let k = 0; k < windows; k++) {
    const x = cx - w / 2 + 1 + Math.round(((k + 0.5) * (w - 2)) / windows) - 1;
    if (y1 - y0 > 5) arch(r, x, y0 + 2, 2, Math.min(9, y1 - y0 - 3));
  }
}

/** A small onion dome on a drum: 2 x 3 characters, gold on white. */
function domeSmall(): NewDecor {
  const r = new Raster(16, 24);
  const y = onionDome(r, 8, 0, 14, 9, 'stripes');
  drum(r, 8, 8, y, 23);
  return decor('domeSmall', 2, 3, r, ['77', '77', '11']);
}

/** A bigger one, 3 x 4 characters, green and spiralled. */
function domeMedium(): NewDecor {
  const r = new Raster(24, 32);
  const y = onionDome(r, 12, 0, 20, 13, 'spiral');
  drum(r, 12, 12, y, 31);
  return decor('domeMedium', 3, 4, r, ['555', '555', '111', '111']);
}

/** The biggest, 4 x 5 characters, red with diamonds. */
function domeLarge(): NewDecor {
  const r = new Raster(32, 40);
  const y = onionDome(r, 16, 0, 28, 17, 'diamond');
  drum(r, 16, 18, y, 39);
  return decor('domeLarge', 4, 5, r, ['2222', '2222', '2222', '1111', '1111']);
}

/** The red star of a Kremlin tower: 2 x 2 characters. */
function redStar(): NewDecor {
  const r = new Raster(16, 16);
  r.stamp([
    '.......##.......',
    '.......##.......',
    '......####......',
    '......####......',
    '################',
    '.##############.',
    '..############..',
    '...##########...',
    '....########....',
    '....########....',
    '...####..####...',
    '...###....###...',
    '..###......###..',
    '..##........##..',
    '.##..........##.',
    '.#............#.',
  ], 0, 0);
  return decor('redStar', 2, 2, r, 2);
}

/** A station clock: a round white face, tick marks and hands at ten past ten. 2 x 2 characters. */
function stationClock(): NewDecor {
  const r = new Raster(16, 16);
  r.ring(7.5, 7.5, 7, 2);
  for (const [x, y] of [[7, 2], [8, 2], [7, 13], [8, 13], [2, 7], [2, 8], [13, 7], [13, 8]] as const) r.set(x, y);
  r.line(7.5, 7.5, 4, 4);
  r.line(7.5, 7.5, 7.5, 3);
  r.line(8.5, 7.5, 11, 6);
  r.rect(7, 7, 8, 8);
  return decor('stationClock', 2, 2, r, 1);
}

/** A street lamp on a fluted post: 1 x 4 characters, the lantern yellow, the iron grey. */
function lampStreet(): NewDecor {
  const r = new Raster(8, 32);
  r.stamp([
    '...##...',
    '..####..',
    '.######.',
    '.#.##.#.',
    '.#.##.#.',
    '.######.',
    '..####..',
    '...##...',
    '..####..',
  ], 0, 0);
  r.rect(3, 9, 4, 27);
  r.rect(2, 14, 5, 15);
  r.rect(2, 24, 5, 24);
  r.stamp(['..####..', '.######.', '########'], 0, 28);
  r.rect(0, 31, 7, 31);
  return decor('lampStreet', 1, 4, r, ['7', 'b', 'b', 'b']);
}

/** A double lamp (two globes on curved arms): 2 x 4 characters. */
function lampDouble(): NewDecor {
  const r = new Raster(16, 32);
  for (const cx of [3.5, 11.5]) {
    r.disc(cx, 4.5, 3.5);
    r.rect(Math.floor(cx), 2, Math.floor(cx), 7, false); // the lantern's frame: a black cross cut in the lit globe
    r.rect(Math.floor(cx) - 2, 4, Math.floor(cx) + 3, 4, false);
    r.rect(cx - 1.5, 9, cx + 0.5, 9);
    stroke(r, cx, 10, 7.5, 14, 1);
  }
  r.rect(7, 12, 8, 27);
  r.rect(6, 17, 9, 18);
  r.rect(6, 24, 9, 24);
  r.stamp(['...####...', '..######..', '.########.'], 3, 28);
  r.rect(3, 31, 12, 31);
  return decor('lampDouble', 2, 4, r, ['77', 'bb', 'bb', 'bb']);
}

/** The metro's red M on its board, on a post: 2 x 3 characters. */
function metroSign(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(1, 0, 14, 14);
  r.rect(0, 1, 15, 13);
  r.cut([
    '##......##',
    '###....###',
    '#.##..##.#',
    '#..####..#',
    '#...##...#',
    '#........#',
    '#........#',
    '#........#',
  ], 3, 3);
  r.rect(7, 15, 8, 23);
  r.rect(5, 22, 10, 23);
  return decor('metroSign', 2, 3, r, ['22', '2b', 'bb']);
}

/** A hanging chandelier of the metro's halls: 2 x 3 characters, on a chain. */
function chandelier(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(7, 0, 8, 5);
  r.rect(5, 6, 10, 7);
  r.rect(7, 8, 8, 9);
  r.ring(7.5, 14, 5, 1);
  r.line(7.5, 9, 7.5, 19);
  r.line(2.5, 14, 12.5, 14);
  r.line(4, 10.5, 11, 17.5);
  r.line(11, 10.5, 4, 17.5);
  r.rect(7, 20, 8, 23);
  r.set(2, 8); r.set(13, 8); r.set(0, 14); r.set(15, 14);
  return decor('chandelier', 2, 3, r, ['bb', '77', '77']);
}

/** A fir tree under snow: 2 x 3 characters. */
function firTree(): NewDecor {
  const r = new Raster(16, 24);
  const tier = (top: number, bottom: number, half: number) => {
    for (let y = top; y <= bottom; y++) {
      const w = Math.round(1 + (half - 1) * ((y - top) / (bottom - top)));
      for (let x = 8 - w; x < 8 + w; x++) r.set(x, y);
    }
  };
  tier(1, 7, 4);
  tier(9, 14, 6);
  tier(16, 21, 8);
  r.rect(7, 21, 8, 23);
  return decor('firTree', 2, 3, r, ['11', '55', '55']);
}

/** The GUM arcade's arch: a pier each side, the arch with its keystone, under a cornice. 4 x 4 characters. */
function gumArch(): NewDecor {
  const r = new Raster(32, 32);
  r.rect(0, 0, 31, 2);
  for (let x = 1; x < 32; x += 3) r.set(x, 3);
  r.rect(0, 4, 31, 16);
  r.rect(0, 17, 5, 31);
  r.rect(26, 17, 31, 31);
  const opening = new Raster(32, 32);
  opening.disc(15.5, 17, 9.5);
  opening.rect(6, 17, 25, 31);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (opening.get(x, y)) r.set(x, y, false);
    else if (y >= 4 && y <= 16 && Math.hypot(x - 15.5, y - 17) > 13 && y % 4 === 2) r.set(x, y, false); // the spandrels: courses of brick, a black joint between
  }
  r.rect(13, 7, 18, 10); // keystone
  for (const x of [2, 29]) for (let y = 18; y < 32; y++) r.set(x, y, false); // flutes
  return decor('gumArch', 4, 4, r, ['1111', 'aaaa', 'aaaa', 'aaaa']);
}

/** Spasskaya Tower, the Kremlin's clock tower: star, green tent roof, belfry, clock and red brick. 3 x 8 characters. */
function spasskaya(): NewDecor {
  const r = new Raster(24, 64);
  r.stamp([
    '....#....',
    '....#....',
    '...###...',
    '#########',
    '.#######.',
    '..#####..',
    '..##.##..',
    '.##...##.',
  ], 7, 0);
  for (let y = 9; y <= 26; y++) {
    const half = Math.round(1 + ((y - 9) / 17) * 8);
    for (let x = 12 - half; x < 12 + half; x++) r.set(x, y, x === 12 - half || x === 11 + half || (x + y) % 3 !== 0);
  }
  r.rect(2, 27, 21, 28);
  r.rect(4, 29, 19, 37);
  for (const x of [5, 10, 15]) arch(r, x, 31, 4, 7);
  r.rect(3, 38, 20, 39);
  r.rect(4, 40, 19, 63);
  for (let y = 43; y < 64; y += 4) r.rect(4, y, 19, y, false);
  for (let y = 40; y < 64; y += 4) for (let x = 4 + ((y >> 2) % 2) * 3; x < 20; x += 6) r.set(x, y + 1, false);
  r.disc(11.5, 49, 7);
  const face = new Raster(24, 64);
  face.disc(11.5, 49, 5);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 24; x++) if (face.get(x, y)) r.set(x, y, false);
  r.line(11.5, 49, 8, 46);
  r.line(11.5, 49, 11.5, 45);
  r.line(12.5, 49, 14, 51);
  for (const [x, y] of [[11, 44], [12, 44], [11, 54], [12, 54], [6, 49], [17, 49]] as const) r.set(x, y);
  return decor('spasskaya', 3, 8, r, ['222', '555', '555', '777', '222', '111', '111', '222']);
}

/**
 * Saint Basil's Cathedral: the tent tower in the middle with its gold dome, four onion domes round it each with its own pattern
 * (stripes, a spiral, diamonds, scales) at their own heights, on the arcaded base. Each piece takes whole characters so each is
 * its own colour. 10 x 8 characters.
 */
function stBasils(): NewDecor {
  const r = new Raster(80, 64);
  // the base: cornice, arches, plinth
  r.rect(0, 48, 79, 63);
  r.rect(0, 48, 79, 49);
  for (let x = 3; x < 78; x += 10) arch(r, x, 52, 6, 10);
  for (let x = 0; x < 80; x += 2) r.set(x, 50, false);
  r.rect(0, 62, 79, 62, false);
  // the tent: a ribbed pointed roof under a small gold dome and cross, on its drum
  onionDome(r, 40, 0, 8, 6, 'plain');
  for (let y = 10; y <= 32; y++) {
    const half = Math.round(1 + ((y - 10) / 22) * 7);
    for (let x = 40 - half; x < 40 + half; x++) r.set(x, y, x === 40 - half || x === 39 + half || (x - 40 + 64) % 3 !== 0);
  }
  drum(r, 40, 14, 33, 47);
  // the four domes, each on its drum, at its own height
  const dome = (cx: number, top: number, bulb: number, style: 'stripes' | 'spiral' | 'diamond' | 'scales') => {
    drum(r, cx, 10, onionDome(r, cx, top, 16, bulb, style), 47);
  };
  dome(8, 26, 11, 'stripes');
  dome(24, 10, 13, 'spiral');
  dome(56, 16, 12, 'diamond');
  dome(72, 24, 11, 'scales');
  return decor('stBasils', 10, 8, r, [
    '0000770000',
    '0077220000',
    '007722ee00',
    '557722ee22',
    '551111ee22',
    '1111111111',
    '2222222222',
    '2222222222',
  ]);
}

/** A wooden bench: a slatted back, the seat, a leg at each end. 3 x 2 characters. */
function bench(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(1, 0, 22, 4);
  for (const x of [6, 11, 16]) r.rect(x, 1, x, 3, false); // the gaps between the slats
  r.rect(0, 6, 23, 8); // the seat
  r.rect(2, 9, 3, 15); r.rect(20, 9, 21, 15); // legs
  return decor('bench', 3, 2, r, ['999', '999']);
}

/** A samovar, the tea urn: a knob, its lid, a round body banded in brass, a tap, its stand. 2 x 2 characters. */
function samovar(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(7, 0, 8, 1);
  r.rect(4, 2, 11, 3);
  r.ellipse(7.5, 8.5, 6, 5.2);
  r.rect(13, 7, 15, 8); r.rect(14, 9, 15, 11); // the tap
  r.rect(4, 13, 11, 15);
  r.rect(1, 6, 14, 6, false); // bands round the body
  r.rect(1, 10, 14, 10, false);
  r.rect(5, 12, 10, 12, false); // the stand's foot
  return decor('samovar', 2, 2, r, 7);
}

/** A poster: a framed matryoshka on it, to hang on a wall. 2 x 3 characters. */
function poster(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(0, 0, 15, 23);
  r.rect(2, 2, 13, 21, false);
  r.ellipse(7.5, 15, 4.5, 5.6);
  r.disc(7.5, 8.5, 3);
  r.rect(5, 8, 6, 9, false); r.rect(9, 8, 10, 9, false); // her eyes
  r.rect(6, 12, 9, 12, false); // the scarf's knot
  r.rect(7, 16, 8, 18, false); // a dark panel on the apron
  return decor('poster', 2, 3, r, 14);
}

/** A shop window of the arcade: a frame, a shelf, three little dolls on it, a sign above. 3 x 3 characters. */
function shopWindow(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(0, 0, 23, 23);
  r.rect(2, 7, 21, 21, false); // the glass
  r.rect(4, 3, 19, 4, false); // the sign's lettering, a dark strip
  r.rect(3, 17, 20, 18); // the shelf
  for (const cx of [7, 12, 17]) { r.ellipse(cx, 13, 2.3, 3.2); r.rect(cx - 1, 12, cx - 1, 12, false); r.rect(cx + 1, 12, cx + 1, 12, false); }
  return decor('shopWindow', 3, 3, r, ['222', '777', '777']);
}

export const MOSCOW_DECOR = {
  domeSmall: domeSmall(),
  domeMedium: domeMedium(),
  domeLarge: domeLarge(),
  redStar: redStar(),
  stationClock: stationClock(),
  lampStreet: lampStreet(),
  lampDouble: lampDouble(),
  metroSign: metroSign(),
  chandelier: chandelier(),
  firTree: firTree(),
  gumArch: gumArch(),
  spasskaya: spasskaya(),
  stBasils: stBasils(),
  bench: bench(),
  samovar: samovar(),
  poster: poster(),
  shopWindow: shopWindow(),
} as const satisfies Record<string, NewDecor>;

export type MoscowDecor = keyof typeof MOSCOW_DECOR;
