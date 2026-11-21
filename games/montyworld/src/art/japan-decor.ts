/**
 * Japan's decorations for Monty Mole: World Tour (region 4), in Monty on the Run's decoration format and Moscow's manner
 * (decorations.ts): solid ink with the detail cut into it as black lines. The junk's sail, the market, Tokyo's neon, the parlour's
 * machines, the keep, the garden's cherry tree, lantern and dragon, the
 * port's gantry and ship's mast, the Great Wave. Every name starts `jp`.
 */
import { decor } from './decorations';
import { limb, Raster } from './raster';
import type { NewDecor } from './types';

/** The junk's mast and its great battened sail, 6 x 8 characters: the mast up the left, the sail's ribs (battens) across it, a rope. */
function junkSail(): NewDecor {
  const r = new Raster(48, 64);
  r.rect(5, 0, 7, 63); r.rect(6, 4, 6, 63, false); // the mast, its grain
  r.triangle(9, 2, 40, 14, 9, 14); // the sail's high peak: a swept wing
  r.rect(9, 14, 41, 58); // the body of the sail
  for (let y = 22; y < 58; y += 9) r.rect(9, y, 41, y + 1, false); // the dark seams between the panels
  for (let y = 14; y < 58; y += 9) r.rect(42, y + 3, 45, y + 5); // the battens' ends stick out at the leech
  for (let y = 18; y < 58; y += 9) r.rect(2, y, 4, y + 1); // and a short way at the mast
  r.rect(26, 15, 26, 57, false); // a seam up the middle
  r.rect(0, 62, 47, 63); // the deck line at its foot
  r.line(8, 2, 0, 20); // a stay to the bow
  return decor('jpJunkSail', 6, 8, r, 8);
}

/** A fish stall: a striped awning, a slab with a tuna on ice. 4 x 3 characters. */
function stall(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(0, 0, 31, 6); // the awning
  for (let x = 2; x < 32; x += 8) r.rect(x, 0, x + 3, 6, false); // its stripes
  r.rect(0, 7, 31, 7);
  for (let x = 0; x < 32; x += 4) r.rect(x, 8, x + 1, 9); // the scalloped edge
  r.rect(1, 8, 1, 23); r.rect(30, 8, 30, 23); // the posts
  r.rect(0, 17, 31, 23); r.rect(2, 19, 29, 21, false); // the counter
  r.ellipse(14, 14.5, 9, 3.2); r.triangle(23, 14.5, 29, 10, 29, 18); // the tuna
  r.rect(9, 13, 9, 13, false); r.rect(18, 14, 19, 14, false); // its eye and gill
  r.rect(3, 16, 27, 16); // the ice
  return decor('jpStall', 4, 3, r, ['2222', '2222', '7777']);
}

/** A red paper lantern, hanging by its cord: ribs and black caps. 2 x 2 characters. */
function lantern(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(7, 0, 8, 2);
  r.rect(4, 3, 11, 4); // the cap
  r.ellipse(7.5, 9, 6.2, 5.4);
  r.rect(2, 8, 13, 8, false); r.rect(1, 10, 14, 10, false); r.rect(3, 6, 12, 6, false); // the ribs
  r.rect(4, 14, 11, 15); // the foot
  r.rect(7, 15, 8, 15, false);
  return decor('jpLantern', 2, 2, r, 2);
}

/** A cargo ship's foremast on the deck: the mast, a crow's nest, a yard with its rigging and a pennant at the top. 2 x 5 characters. */
function shipMast(): NewDecor {
  const r = new Raster(16, 40);
  r.rect(7, 0, 8, 39); r.rect(4, 7, 11, 10); r.rect(5, 8, 10, 9, false); // the mast and its crow's nest
  r.triangle(9, 0, 15, 2, 9, 4); // the pennant
  r.rect(1, 20, 14, 21); r.line(7, 11, 1, 20); r.line(8, 11, 14, 20); // the yard and the stays
  r.rect(0, 38, 15, 39); // the deck line at its foot
  return decor('jpShipMast', 2, 5, r, ['22', '11', '11', '11', '11']);
}

/** A tall vertical neon board: a frame and strokes of an invented script, a bar of light under it. 2 x 4 characters. */
function neonTall(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(1, 0, 14, 31); r.rect(3, 2, 12, 29, false);
  r.rect(5, 4, 10, 5); r.rect(7, 4, 8, 11); r.rect(5, 8, 10, 8, false); // strokes
  r.rect(5, 13, 10, 14); r.rect(9, 13, 10, 20); r.rect(5, 17, 8, 17);
  r.rect(5, 22, 6, 27); r.rect(5, 27, 10, 27); r.rect(9, 22, 10, 25);
  return decor('jpNeonTall', 2, 4, r, ['66', '66', '44', '44']);
}

/** A ramen sign: a bowl with steam and chopsticks on a board. 3 x 2 characters. */
function neonRamen(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 0, 23, 15); r.rect(2, 2, 21, 13, false);
  r.ellipse(12, 9, 7, 4.2); r.rect(4, 5, 20, 8, false); // the bowl
  r.rect(4, 9, 20, 9); r.rect(9, 13, 14, 13);
  for (const x of [8, 12, 16]) { r.set(x, 3, true); r.set(x + 1, 4, true); } // steam
  r.line(17, 4, 21, 1); r.line(18, 5, 22, 2); // chopsticks
  return decor('jpNeonRamen', 3, 2, r, ['222', '222']);
}

/** A glowing drinks machine: a lit panel of cans, a coin slot and a drop tray. 2 x 3 characters. */
function vending(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(0, 0, 15, 23); r.rect(2, 2, 13, 3, false); // the cap
  for (let y = 5; y < 13; y += 4) for (let x = 2; x < 14; x += 4) r.rect(x, y, x + 2, y + 2, false); // the cans
  r.rect(11, 15, 13, 16, false); r.rect(2, 18, 13, 21, false); r.rect(4, 19, 11, 19); // slot, tray
  return decor('jpVending', 2, 3, r, ['11', '11', '33']);
}

/** A bank of three pachinko machines: a lit board each with pins, a tray and a screen on top. 6 x 4 characters. */
function machines(): NewDecor {
  const r = new Raster(48, 32);
  for (let k = 0; k < 3; k++) {
    const x = k * 16;
    r.rect(x, 0, x + 14, 31); r.rect(x + 2, 2, x + 12, 8, false); // the screen
    r.rect(x + 4, 4, x + 10, 6); r.rect(x + 7, 4, x + 7, 6, false);
    r.rect(x + 2, 11, x + 12, 24, false); // the board
    for (let y = 13; y < 24; y += 3) for (let i = 0; i < 4; i++) r.set(x + 4 + i * 2 + (y % 2), y, true); // pins
    r.rect(x + 4, 26, x + 10, 29, false); r.rect(x + 5, 28, x + 9, 28); // the tray with its balls
  }
  return decor('jpMachines', 6, 4, r, ['aaaaaa', 'aaaaaa', 'aaaaaa', '777777']);
}

/** A claw machine: a glass cabinet, prizes heaped, the claw hanging. 4 x 5 characters. */
function clawMachine(): NewDecor {
  const r = new Raster(32, 40);
  r.rect(0, 0, 31, 39); r.rect(3, 4, 28, 29, false); // the glass
  r.rect(15, 4, 16, 12); r.triangle(11, 12, 20, 12, 15.5, 18, true); r.rect(14, 14, 17, 15, false); // the claw
  for (const cx of [8, 14, 21, 25]) { r.disc(cx, 25, 3); r.rect(cx - 1, 24, cx - 1, 24, false); r.rect(cx + 1, 24, cx + 1, 24, false); } // prizes with faces
  r.rect(3, 31, 28, 38, false); r.rect(5, 33, 12, 35); r.disc(22, 35, 2); // the panel
  return decor('jpClawMachine', 4, 5, r, ['3333', '3333', '3333', '3333', '2222']);
}

/** A stone garden lantern (toro): a cap, a lit box with its window, a post and a foot. 2 x 3 characters. */
function toro(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(7, 0, 8, 1); r.triangle(1, 6, 14, 6, 7.5, 1); r.rect(0, 6, 15, 7); // the cap
  r.rect(3, 8, 12, 14); r.rect(5, 10, 10, 12, false); // the lamp box and its window
  r.rect(1, 15, 14, 16); r.rect(6, 17, 9, 20); r.rect(2, 21, 13, 23); // the plate, the post, the foot
  return decor('jpToro', 2, 3, r, 12);
}

/** A cherry tree in blossom: a gnarled trunk, a cloud of blossom with its pale gaps, petals falling. 5 x 6 characters. */
function sakura(): NewDecor {
  const r = new Raster(40, 48);
  r.rect(17, 30, 22, 47); r.line(19, 34, 8, 22); r.line(20, 34, 32, 20); r.line(20, 30, 20, 16); // the trunk and boughs
  r.rect(19, 36, 19, 46, false);
  for (const [cx, cy, rad] of [[9, 16, 8], [20, 9, 9], [31, 15, 8], [15, 22, 7], [26, 23, 7]] as const) { // blossom clouds
    r.disc(cx, cy, rad);
    for (let k = 0; k < 4; k++) r.rect(cx - 4 + k * 3, cy - 3 + (k % 2) * 4, cx - 3 + k * 3, cy - 2 + (k % 2) * 4, false);
  }
  for (const [x, y] of [[4, 32], [33, 36], [28, 42], [8, 40]] as const) r.rect(x, y, x + 1, y + 1); // petals
  return decor('jpSakura', 5, 6, r, ['44444', '44444', '44444', '44444', '99999', '99999']);
}

/** A bonsai in its pot: a twisted trunk and cloud-pruned pads. 2 x 2 characters. */
function bonsai(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(4, 12, 11, 15); r.rect(5, 14, 10, 15, false); r.rect(6, 15, 9, 15);
  r.line(7, 12, 8, 7); r.line(8, 7, 4, 5); r.line(8, 8, 12, 5);
  r.ellipse(4, 4, 4, 2.4); r.ellipse(12, 4, 3.6, 2.2); r.ellipse(8, 2, 3.5, 1.9);
  return decor('jpBonsai', 2, 2, r, ['55', '99']);
}

/** A stone dragon coiled round a pillar: scales in bands, a horned head with an open mouth at the top. 5 x 5 characters. */
function dragon(): NewDecor {
  const r = new Raster(40, 40);
  r.rect(16, 8, 23, 39); r.rect(14, 36, 25, 39); // the pillar
  for (let k = 0; k < 4; k++) { const y = 12 + k * 7; r.rect(8, y, 31, y + 3); r.rect(8, y, 31, y, true); r.rect(10, y + 1, 29, y + 1, false); r.rect(12, y + 2, 16, y + 2, false); } // the coils
  r.ellipse(30, 6, 7, 5.4); r.triangle(33, 2, 37, 0, 36, 5); r.triangle(27, 2, 25, 0, 26, 5); // the head, horns
  r.rect(36, 6, 39, 9); r.rect(33, 7, 39, 8, false); r.rect(34, 8, 38, 8); // the open jaws
  r.rect(29, 4, 30, 5, false); r.rect(30, 4, 30, 4); // the eye
  r.rect(2, 12, 6, 14); r.rect(0, 14, 3, 17); // the tail
  return decor('jpDragon', 5, 5, r, 12);
}

/** The full moon with a cloud over its lower edge. 3 x 3 characters. */
function moon(): NewDecor {
  const r = new Raster(24, 24);
  r.disc(11.5, 11.5, 10.5);
  r.rect(15, 5, 16, 6, false); r.rect(12, 14, 14, 15, false); r.rect(6, 11, 7, 12, false); // a few maria
  r.rect(0, 19, 23, 19, false); r.rect(3, 21, 20, 21, false); // thin strips of cloud across its foot
  return decor('jpMoon', 3, 3, r, 1);
}

/** The castle keep: three storeys of white plaster, each with its curved roof and windows, a stone base, golden dolphins on the top gables. 10 x 6 characters. */
function keep(): NewDecor {
  const r = new Raster(80, 48);
  r.rect(8, 40, 71, 47); for (let x = 12; x < 70; x += 12) r.rect(x, 41, x, 46, false); // the stone base
  const tier = (cx: number, half: number, y: number) => {
    r.rect(cx - half, y + 6, cx + half, y + 13); // the wall
    for (const w of [-half * 0.55, 0, half * 0.55]) { const wx = Math.round(cx + w); r.rect(wx - 1, y + 8, wx + 1, y + 11, false); r.rect(wx, y + 8, wx, y + 11); }
    r.triangle(cx - half - 5, y + 6, cx + half + 5, y + 6, cx, y - 3); // the roof
    r.rect(cx - half - 6, y + 5, cx + half + 5, y + 7); // its eaves
    r.rect(cx - half - 7, y + 4, cx - half - 7, y + 4); r.rect(cx + half + 6, y + 4, cx + half + 6, y + 4);
    r.rect(cx - half + 2, y + 6, cx + half - 2, y + 6, false);
  };
  tier(39, 29, 26); tier(39, 21, 12); tier(39, 13, 0);
  r.rect(26, 0, 27, 2); r.rect(52, 0, 53, 2); // the finials
  return decor('jpKeep', 10, 6, r, ['1111771111', '1111111111', '1111111111', '1111111111', '1111111111', '1111111111']);
}

/** A harbour gantry crane: two tall legs on rails, the long jib out over the water, a hanging hook. 6 x 6 characters. */
function gantry(): NewDecor {
  const r = new Raster(48, 48);
  r.rect(4, 8, 7, 47); r.rect(24, 8, 27, 47); r.rect(3, 44, 28, 47); // the legs
  for (let y = 14; y < 44; y += 10) { r.line(8, y, 23, y + 10); r.line(23, y, 8, y + 10); } // the bracing
  r.rect(0, 2, 47, 7); r.rect(2, 4, 45, 5, false); // the jib
  r.rect(36, 8, 36, 22); r.rect(33, 22, 39, 24); r.rect(35, 25, 37, 27); // the cable, the hook
  r.rect(10, 0, 22, 1); // the machinery house's roof
  return decor('jpGantry', 6, 6, r, 8);
}

/** The Great Wave: a long arm of water rising from the left, arching over and curling down at the right in claw-like fingers of foam, a hollow under the curl, the trough in front. 8 x 3 characters. */
function wave(): NewDecor {
  const r = new Raster(64, 24);
  const arc: readonly (readonly [number, number])[] = [[0, 23], [6, 19], [12, 13], [19, 7], [27, 4], [35, 4], [42, 7], [47, 12]];
  arc.forEach(([x, y], i) => { const next = arc[i + 1]; if (next) limb(r, x, y, next[0], next[1], 7); }); // the arm of water
  r.rect(0, 21, 63, 23); // the sea
  r.ellipse(33, 15, 11, 7, false); // the hollow under the curl
  r.rect(22, 20, 52, 20, false); // the trough's line
  for (const [x, y] of [[44, 10], [48, 13], [51, 17]] as const) { r.triangle(x, y, x + 6, y + 1, x + 2, y + 7); r.rect(x + 2, y + 3, x + 2, y + 3, false); } // the claws of foam
  r.rect(30, 3, 31, 3, false); r.rect(36, 5, 38, 5, false); r.rect(24, 7, 25, 7, false); r.rect(14, 12, 15, 12, false); r.rect(8, 17, 9, 17, false); // the arm's lines
  for (let x = 2; x < 64; x += 9) r.rect(x, 22, x + 4, 22, false);
  return decor('jpWave', 8, 3, r, 14);
}

/** A small shrine on a plinth: a curved roof, a lattice door, a step; a bare altar slab on it for the hood. 4 x 3 characters. */
function shrine(): NewDecor {
  const r = new Raster(32, 24);
  r.triangle(0, 8, 31, 8, 16, 0); r.rect(0, 8, 31, 9); r.rect(0, 7, 1, 7); r.rect(30, 7, 31, 7);
  r.rect(3, 10, 28, 17); r.rect(6, 12, 25, 17, false); for (const x of [10, 15, 20]) r.rect(x, 12, x, 17); // the lattice
  r.rect(0, 18, 31, 23); r.rect(2, 20, 29, 20, false);
  return decor('jpShrine', 4, 3, r, 2);
}

/** A temple bell in its timber frame with the striking beam. 3 x 4 characters. */
function bell(): NewDecor {
  const r = new Raster(24, 32);
  r.rect(1, 0, 22, 2); r.rect(1, 0, 2, 31); r.rect(21, 0, 22, 31); // the frame
  r.rect(11, 3, 12, 6); r.ellipse(11.5, 15, 7, 8.5); r.rect(5, 22, 18, 23); r.rect(7, 12, 16, 12, false); r.rect(7, 18, 16, 18, false); // the bell and its bands
  r.rect(0, 29, 23, 31); r.rect(4, 26, 19, 26, false);
  r.rect(3, 24, 20, 24); // the beam
  return decor('jpBell', 3, 4, r, 7);
}

/** A hanging scroll with a brush stroke. 2 x 3 characters. */
function scroll(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(1, 0, 14, 1); r.rect(3, 2, 12, 20); r.rect(5, 4, 10, 18, false); r.rect(1, 21, 14, 22);
  r.rect(7, 6, 8, 12); r.line(5, 14, 10, 9); r.rect(6, 15, 9, 16);
  return decor('jpScroll', 2, 3, r, 7);
}

/** A signal lamp on a post, its red lens lit. 1 x 2 characters. */
function lamp(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(1, 0, 6, 7); r.rect(2, 1, 5, 6, false); r.disc(3.5, 3.5, 1.8); r.rect(3, 8, 4, 15);
  return decor('jpSignalLamp', 1, 2, r, ['2', '8']);
}

/** Sake barrels stacked, hooped. 3 x 2 characters. */
function barrels(): NewDecor {
  const r = new Raster(24, 16);
  for (const [cx, cy] of [[6, 11], [18, 11], [12, 4]] as const) {
    r.ellipse(cx, cy, 5.8, 4.4); r.rect(cx - 5, cy - 2, cx + 5, cy - 2, false); r.rect(cx - 5, cy + 1, cx + 5, cy + 1, false); r.rect(cx - 1, cy - 1, cx, cy);
  }
  return decor('jpBarrels', 3, 2, r, 9);
}

/** The castle's golden dolphin-fish finial (shachi): a curled tail over a fish's head. 2 x 2 characters. */
function shachi(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(8, 10, 4.5, 5.5); r.triangle(8, 6, 13, 0, 11, 8); r.triangle(5, 5, 1, 1, 8, 5); r.rect(4, 13, 11, 15);
  r.rect(5, 7, 6, 8, false); r.rect(5, 10, 8, 10, false); r.rect(9, 5, 9, 6, false);
  return decor('jpShachi', 2, 2, r, 7);
}

/** A flat-topped pine, the garden's: layered pads of needles on a bent trunk. 3 x 4 characters. */
function pine(): NewDecor {
  const r = new Raster(24, 32);
  r.line(12, 31, 11, 10); r.line(13, 31, 12, 10); r.line(12, 20, 20, 17);
  r.ellipse(12, 6, 9, 3.4); r.ellipse(5, 14, 5.5, 2.6); r.ellipse(20, 13, 4.5, 2.6); r.ellipse(14, 24, 6.5, 2.4);
  for (const [x, y] of [[8, 5], [14, 6], [4, 14], [19, 13], [12, 24]] as const) r.rect(x, y, x + 2, y, false);
  return decor('jpPine', 3, 4, r, ['555', '555', '999', '999']);
}

/** A traffic signal on a pole at the crossing, a red man lit. 1 x 3 characters. */
function trafficLight(): NewDecor {
  const r = new Raster(8, 24);
  r.rect(0, 0, 7, 9); r.rect(1, 1, 6, 8, false); r.rect(3, 2, 4, 3); r.rect(2, 4, 5, 4); r.rect(3, 5, 3, 7); r.rect(4, 5, 4, 7); r.rect(3, 10, 4, 23);
  return decor('jpTrafficLight', 1, 3, r, ['2', '1', '1']);
}

/** The giant video screen over the crossing: a frame with a face grinning from it. 6 x 3 characters. */
function screen(): NewDecor {
  const r = new Raster(48, 24);
  r.rect(0, 0, 47, 23); r.rect(2, 2, 45, 19, false);
  r.disc(24, 11, 7); r.rect(20, 8, 21, 9, false); r.rect(26, 8, 27, 9, false); r.rect(19, 13, 29, 13, false); r.rect(20, 14, 28, 14, false);
  r.rect(4, 4, 10, 4); r.rect(38, 17, 44, 17); // glints of light
  r.rect(20, 20, 27, 23);
  return decor('jpScreen', 6, 3, r, 6);
}

/** A departure board over the platform: a dark panel with rows of lit characters and an arrow. 4 x 1 characters. */
function board(): NewDecor {
  const r = new Raster(32, 8);
  r.rect(0, 0, 31, 7); r.rect(1, 1, 30, 6, false);
  for (let x = 3; x < 20; x += 3) r.rect(x, 2, x + 1, 5);
  r.rect(22, 3, 28, 4); r.triangle(26, 1, 26, 6, 30, 3.5);
  return decor('jpBoard', 4, 1, r, 7);
}

export const JAPAN_DECOR = {
  jpJunkSail: junkSail(),
  jpStall: stall(),
  jpLantern: lantern(),
  jpNeonTall: neonTall(),
  jpNeonRamen: neonRamen(),
  jpVending: vending(),
  jpMachines: machines(),
  jpClawMachine: clawMachine(),
  jpToro: toro(),
  jpSakura: sakura(),
  jpBonsai: bonsai(),
  jpDragon: dragon(),
  jpMoon: moon(),
  jpKeep: keep(),
  jpGantry: gantry(),
  jpWave: wave(),
  jpShipMast: shipMast(),
  jpShrine: shrine(),
  jpBell: bell(),
  jpScroll: scroll(),
  jpSignalLamp: lamp(),
  jpBarrels: barrels(),
  jpShachi: shachi(),
  jpPine: pine(),
  jpTrafficLight: trafficLight(),
  jpScreen: screen(),
  jpBoard: board(),
} as const satisfies Record<string, NewDecor>;

export type JapanDecor = keyof typeof JAPAN_DECOR;
