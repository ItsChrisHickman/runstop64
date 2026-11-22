/**
 * The Pacific's decorations for Monty Mole: World Tour (region 5), in Monty on the Run's decoration format and Moscow's manner
 * (decorations.ts): solid ink with the detail cut into it as black lines. The ship's funnel, bridge and crane; Honolulu's tower;
 * Waikiki's palms, hotel and surfboards; the luau's torches, totem and roast pig; Molokai's sea cliffs (the backdrop of the reef);
 * the reef's coral and kelp; Maui's waterfall, bamboo and signs; the volcano; the airport and the cargo plane. Names start `pac`.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

// ---- the cargo ship

/** The funnel: a tall oval stack with a band round it and a rim, smoke at its mouth. 3 x 4 characters. */
function funnel(): NewDecor {
  const r = new Raster(24, 32);
  r.ellipse(8, 3.5, 4.5, 3); r.ellipse(12, 1.5, 3, 2); // smoke
  r.rect(3, 8, 20, 9); // the rim
  r.rect(4, 10, 19, 31);
  r.rect(4, 17, 19, 22, false); r.rect(4, 19, 19, 20); // the band: black with a bright line across
  r.rect(8, 12, 9, 15, false); // a vent slot
  return decor('pacFunnel', 3, 4, r, ['111', '222', '222', '222']);
}

/** The bridge: a wheelhouse with a row of windows, a flying deck on top, a mast and its radar. 5 x 3 characters. */
function bridge(): NewDecor {
  const r = new Raster(40, 24);
  r.rect(19, 0, 20, 5); r.rect(14, 2, 25, 2); r.rect(14, 1, 14, 1); r.rect(25, 1, 25, 1); // mast and radar
  r.rect(4, 6, 35, 8); // roof
  r.rect(2, 9, 37, 23);
  for (let k = 0; k < 6; k++) r.rect(4 + k * 6, 11, 7 + k * 6, 15, false); // windows
  r.rect(2, 18, 37, 18, false); r.rect(18, 19, 21, 23, false); // a rail and a door
  return decor('pacBridge', 5, 3, r, ['11111', '11111', '11111']);
}

/** A deck crane: a mast on its base, a jib out to the right and a hook's chain. 4 x 6 characters. */
function crane(): NewDecor {
  const r = new Raster(32, 48);
  r.rect(4, 8, 7, 47); r.rect(0, 44, 11, 47); // the mast on its foot
  for (let y = 12; y < 44; y += 6) { r.line(4, y, 7, y + 5, false); } // the lattice
  r.rect(2, 4, 31, 7); r.line(4, 8, 28, 8); // the jib
  r.rect(27, 8, 28, 14); r.rect(24, 14, 31, 17); // the hook block's rope and block
  r.rect(0, 0, 11, 3);
  return decor('pacCrane', 4, 6, r, 14);
}

/** A porthole: a ring of brass with the sea in it. 1 x 1 character. */
function porthole(): NewDecor {
  const r = new Raster(8, 8);
  r.disc(3.5, 3.5, 3.5); r.disc(3.5, 3.5, 2, ); r.ellipse(3.5, 3.5, 2.2, 2.2, false); r.rect(1, 5, 6, 5, false); r.rect(2, 4, 5, 4);
  return decor('pacPorthole', 1, 1, r, 7);
}

/** A life ring on the rail: a white ring with its red bands. 2 x 2 characters. */
function lifeRing(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(7.5, 7.5, 7); r.disc(7.5, 7.5, 3, ); r.ellipse(7.5, 7.5, 3.2, 3.2, false);
  for (const [x, y] of [[7, 0], [7, 13], [0, 7], [13, 7]] as const) r.rect(x, y, x + 1, y + 1, false);
  return decor('pacLifeRing', 2, 2, r, 1);
}

/** An anchor: the ring, the stock, the shank and the flukes. 2 x 2 characters. */
function anchor(): NewDecor {
  const r = new Raster(16, 16);
  r.ring(7.5, 2.5, 2, 1); r.rect(4, 5, 11, 5); r.rect(7, 4, 8, 13);
  r.rect(2, 11, 13, 12); r.triangle(0, 8, 2, 13, 5, 13); r.triangle(15, 8, 13, 13, 10, 13);
  r.rect(7, 14, 8, 15);
  return decor('pacAnchor', 2, 2, r, 12);
}

/** The engine room's engine block: a cylinder head with its bolts, a flywheel and a gauge. 4 x 3 characters. */
function engineBlock(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(0, 8, 21, 23); r.rect(2, 4, 19, 7); // block and head
  for (const x of [4, 10, 16]) { r.rect(x, 9, x + 2, 12, false); r.rect(x, 15, x + 2, 18, false); } // the bolts' plates
  r.disc(27, 13, 4.5); r.ellipse(27, 13, 2.6, 2.6, false); r.rect(26, 12, 28, 14); // flywheel
  r.rect(7, 0, 8, 3); r.rect(14, 0, 15, 3);
  return decor('pacEngineBlock', 4, 3, r, 12);
}

/** A steam gauge: a round dial with its needle. 1 x 1 character. */
function gauge(): NewDecor {
  const r = new Raster(8, 8);
  r.disc(3.5, 3.5, 3.6); r.ellipse(3.5, 3.5, 2.6, 2.6, false); r.line(3, 5, 5, 2); r.rect(3, 5, 4, 5);
  return decor('pacGauge', 1, 1, r, 1);
}

// ---- Oahu

/** A palm: a leaning trunk ringed with growth, a crown of long drooping fronds, a bunch of coconuts. `w` x `h` characters. */
function palm(w: number, h: number, name: string): NewDecor {
  const r = new Raster(w * 8, h * 8);
  const cx = Math.round(w * 4), top = Math.round(h * 2.2);
  for (let y = top; y < h * 8; y++) {
    const lean = Math.round(((h * 8 - y) / (h * 8 - top)) * (w * 1.2));
    r.rect(cx - 2 - lean + 3, y, cx - lean + 3, y);
    if (y % 4 === 0) r.rect(cx - 2 - lean + 3, y, cx - 2 - lean + 3, y, false);
  }
  const tx = cx + 3 - 0, ty = top;
  const reach = w * 3.6;
  for (const [dx, dy] of [[-reach, 3], [-reach * 0.7, -3], [reach * 0.7, -3], [reach, 3], [0, -8], [-reach * 0.4, 7], [reach * 0.4, 7]] as const) {
    r.line(tx, ty, tx + dx, ty + dy + 4); r.line(tx, ty + 1, tx + dx, ty + dy + 5); r.line(tx, ty - 1, tx + dx, ty + dy + 3);
  }
  r.disc(tx - 1, ty + 4, 1.6); r.disc(tx + 3, ty + 4, 1.6); // coconuts
  r.set(tx - 2, ty + 4, false); r.set(tx + 2, ty + 4, false);
  const rows = Array.from({ length: h }, (_, j) => (j < Math.ceil(h * 0.45) ? '5'.repeat(w) : '9'.repeat(w)));
  return decor(name, w, h, r, rows);
}

/** Aloha Tower: a slim tower with a clock face in each side of its top, a flagstaff. 2 x 6 characters. */
function alohaTower(): NewDecor {
  const r = new Raster(16, 48);
  r.rect(7, 0, 8, 5); r.triangle(7.5, 6, 3, 14, 12, 14); // spire
  r.rect(2, 15, 13, 28); r.ellipse(7.5, 21, 3.6, 3.6, false); r.line(7, 21, 7, 18); r.line(7, 21, 9, 22); // clock
  r.rect(1, 29, 14, 47); r.rect(5, 33, 6, 36, false); r.rect(9, 33, 10, 36, false); r.rect(5, 40, 6, 43, false); r.rect(9, 40, 10, 43, false);
  return decor('pacAlohaTower', 2, 6, r, 1);
}

/** A Waikiki hotel tower: a slab of balconies, rows of windows, a roof sign. 4 x 6 characters. */
function hotel(): NewDecor {
  const r = new Raster(32, 48);
  r.rect(2, 0, 29, 3); r.rect(14, 4, 17, 5);
  r.rect(0, 6, 31, 47);
  for (let y = 9; y < 46; y += 6) { for (let x = 3; x < 30; x += 6) r.rect(x, y, x + 3, y + 2, false); r.rect(0, y + 4, 31, y + 4, false); }
  r.rect(12, 40, 19, 47, false);
  return decor('pacHotel', 4, 6, r, 1);
}

/** Diamond Head: the crater's long sloping ridge rising to its high rim at the left, ridged with gullies. 8 x 3 characters. */
function diamondHead(): NewDecor {
  const r = new Raster(64, 24);
  for (let x = 0; x < 64; x++) {
    const h = x < 18 ? 22 - x * 0.6 : 11 + (x - 18) * 0.3 - (x > 48 ? (x - 48) * 0.5 : 0);
    const top = Math.max(0, Math.round(24 - h * 1.0));
    r.rect(x, Math.min(23, top), x, 23);
  }
  for (const x of [8, 20, 32, 44]) r.line(x, 10 + (x > 30 ? 4 : 0), x + 3, 23, false); // gullies
  return decor('pacDiamondHead', 8, 3, r, 5);
}

/** A stand of surfboards: a rack with four boards leaning, their stripes. 3 x 2 characters. */
function surfboards(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 14, 23, 15); r.rect(2, 8, 2, 14); r.rect(21, 8, 21, 14);
  for (const [x, w] of [[3, 3], [8, 3], [13, 3], [18, 3]] as const) {
    r.ellipse(x + 1, 6, w / 2, 6); r.rect(x + 1, 1, x + 1, 11, false); r.rect(x - 1, 8, x + 3, 8, false);
  }
  return decor('pacSurfboards', 3, 2, r, ['777', '222']);
}

/** A beach umbrella: a scalloped canopy on a pole, a stripe up its panels. 3 x 2 characters. */
function umbrella(): NewDecor {
  const r = new Raster(24, 16);
  r.ellipse(11.5, 6, 11.5, 6); r.rect(0, 6, 23, 12, false);
  r.rect(0, 5, 23, 6); for (const x of [3, 7, 11, 15, 19]) r.rect(x, 5, x, 6, false);
  for (const x of [1, 6, 11, 16, 21]) r.rect(x, 7, x + 1, 8);
  r.rect(11, 6, 12, 15); r.rect(0, 15, 23, 15, false);
  return decor('pacUmbrella', 3, 2, r, ['222', '999']);
}

/** The snorkel shop: a thatched roof over a counter, a board with a diving mask and snorkel hung over it. 5 x 4 characters. */
function snorkelShop(): NewDecor {
  const r = new Raster(40, 32);
  r.triangle(20, 0, 0, 12, 39, 12); r.rect(0, 12, 39, 13);
  for (let x = 2; x < 38; x += 4) r.line(x, 12, x - 2, 14); // straw ends
  r.rect(2, 14, 3, 31); r.rect(36, 14, 37, 31); // posts
  r.rect(2, 26, 37, 31); r.rect(5, 28, 34, 28, false); // counter
  r.rect(10, 15, 29, 23); r.ellipse(16, 19, 3, 2.6, false); r.ellipse(23, 19, 3, 2.6, false); r.rect(19, 19, 20, 19, false); // the mask
  r.rect(27, 16, 28, 22, false); r.rect(26, 16, 28, 16, false); // the snorkel
  return decor('pacSnorkelShop', 5, 4, r, ['99999', '99999', '99999', '99999']);
}

/** A tiki torch: a bamboo pole and a bowl with its flame. 1 x 3 characters. */
function tikiTorch(): NewDecor {
  const r = new Raster(8, 24);
  r.ellipse(3.5, 4, 2, 3.4); r.rect(3, 0, 4, 2); r.rect(3, 3, 4, 6, false); // the flame, a core cut out
  r.rect(1, 8, 6, 9); r.rect(2, 10, 5, 10);
  r.rect(3, 11, 4, 23);
  return decor('pacTikiTorch', 1, 3, r, ['7', '9', '9']);
}

/** The gangway's rail: a rope between three posts, lowered off the ship's bow onto the pier. 4 x 1 character each... (4 characters) */
function gangwayRail(): NewDecor {
  const r = new Raster(32, 8);
  for (const x of [1, 15, 29]) r.rect(x, 0, x + 1, 7);
  r.line(2, 2, 14, 4); r.line(16, 4, 28, 2); r.line(2, 3, 14, 5); r.line(16, 5, 28, 3);
  return decor('pacGangwayRail', 4, 1, r, 7);
}

/** A tiki totem: three carved heads stacked, eyes, tusks and open mouths. 2 x 3 characters. */
function totem(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(1, 0, 14, 23);
  for (const y of [0, 8, 16]) {
    r.rect(3, y + 2, 5, y + 3, false); r.rect(10, y + 2, 12, y + 3, false); // eyes
    r.rect(5, y + 5, 10, y + 6, false); r.rect(6, y + 5, 6, y + 5); r.rect(9, y + 5, 9, y + 5); // mouth and teeth
    r.rect(1, y + 7, 14, y + 7, false);
  }
  return decor('pacTotem', 2, 3, r, ['99', '99', '99']);
}

/** A roast pig on a spit over the pit: the pig on its pole, the fire's flames under. 3 x 2 characters. */
function roastPig(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 7, 23, 7); r.rect(0, 5, 0, 9); r.rect(23, 5, 23, 9); // the spit
  r.ellipse(11, 5, 8, 3.4); r.ellipse(19, 4, 3, 2.8); r.rect(21, 4, 23, 4, false); r.set(20, 3, false); // pig and head
  r.rect(4, 6, 6, 8); r.rect(14, 6, 16, 8); // trotters
  r.rect(2, 11, 21, 15); r.triangle(4, 15, 6, 10, 9, 15, false); r.triangle(12, 15, 15, 10, 18, 15, false);
  return decor('pacRoastPig', 3, 2, r, ['888', '222']);
}

/** A hibiscus: five petals round a long stamen on a leaf. 2 x 2 characters. */
function hibiscus(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(11, 12, 5, 2.4); r.rect(2, 13, 9, 14);
  for (const [dx, dy] of [[0, -4], [4, -1], [2, 4], [-3, 4], [-4, -1]] as const) r.disc(7.5 + dx, 6.5 + dy, 2.6);
  r.rect(7, 6, 8, 7, false); r.line(8, 6, 13, 1); r.set(13, 1, true);
  return decor('pacHibiscus', 2, 2, r, ['22', '55']);
}

// ---- Molokai, the reef and Maui

/** Molokai's sea cliffs: a wall of green fluted ridges falling to the sea, their folds as black lines. 4 x 8 characters. */
function seaCliff(name: string, shift: number): NewDecor {
  const r = new Raster(32, 64);
  for (let y = 0; y < 64; y++) r.rect(Math.max(0, Math.round(shift + 3 * Math.sin(y / 9))), y, 31, y);
  for (const x of [4, 10, 16, 22, 28]) {
    for (let y = 0; y < 64; y++) r.set(x + Math.round(2 * Math.sin((y + x) / 6)), y, false);
    r.line(x, 0, x + 1, 63, false);
  }
  for (let y = 7; y < 64; y += 14) r.rect(0, y, 31, y, false);
  return decor(name, 4, 8, r, 5);
}

/** A fan of coral: a spread of branches from one stalk. 2 x 3 characters. */
function seaFan(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(7, 16, 8, 23);
  for (const x of [1, 4, 7, 10, 13]) r.line(7.5, 17, x + 1, 1); for (const x of [2, 7, 12]) r.rect(x, 1, x + 1, 2);
  r.line(0, 8, 15, 8, false); r.line(3, 13, 12, 13, false);
  return decor('pacSeaFan', 2, 3, r, 10);
}

/** A strand of kelp: a slow wave in a long ribbon. 1 x 3 characters. */
function kelp(): NewDecor {
  const r = new Raster(8, 24);
  for (let y = 0; y < 24; y++) r.rect(Math.round(3 + 2 * Math.sin(y / 3)), y, Math.round(4 + 2 * Math.sin(y / 3)), y);
  for (const y of [5, 12, 19]) { r.rect(Math.round(1 + 2 * Math.sin(y / 3)), y, Math.round(3 + 2 * Math.sin(y / 3)), y + 1); }
  return decor('pacKelp', 1, 3, r, 5);
}

/** A rise of bubbles: three rings, small to large. 1 x 2 characters. */
function bubbles(): NewDecor {
  const r = new Raster(8, 16);
  r.ring(4, 12, 1.5, 1); r.ring(3, 7, 2, 1); r.ring(4.5, 2, 2, 1);
  return decor('pacBubbles', 1, 2, r, 1);
}

/** A cascade: a stream falling over a lip in lines, its mist at the foot. 2 x 5 characters. */
function waterfall(): NewDecor {
  const r = new Raster(16, 40);
  r.rect(0, 0, 15, 2);
  for (const x of [3, 7, 11]) for (let y = 4; y < 34; y += 6) r.rect(x, y, x + 1, y + 4);
  r.ellipse(4, 37, 4, 2.4); r.ellipse(11, 37, 4.4, 2.4); r.ellipse(8, 35, 3, 2);
  return decor('pacWaterfall', 2, 5, r, ['55', '33', '33', '33', '11']);
}

/** A clump of bamboo: three stalks with their rings, leaves out at the top. 2 x 4 characters. */
function bambooClump(): NewDecor {
  const r = new Raster(16, 32);
  for (const x of [2, 7, 12]) { r.rect(x, 5, x + 1, 31); for (let y = 9; y < 31; y += 7) r.rect(x - 1, y, x + 2, y, false); }
  for (const [x, y, dx] of [[2, 5, -2], [7, 3, 0], [12, 5, 2], [7, 5, 6], [8, 5, -6]] as const) r.triangle(x, y, x + dx - 1, y - 4, x + dx + 3, y - 1);
  return decor('pacBambooClump', 2, 4, r, 13);
}

/** A road sign: a triangle on a post, with a bar across it (a one-lane bridge). 1 x 2 characters. */
function laneSign(): NewDecor {
  const r = new Raster(8, 16);
  r.triangle(3.5, 0, 0, 8, 7, 8); r.rect(0, 8, 7, 8);
  r.triangle(3.5, 3, 2, 7, 5, 7, false); r.rect(3, 9, 4, 15);
  return decor('pacLaneSign', 1, 2, r, ['7', '9']);
}

/** An outrigger canoe on the water: the long hull, the float on its booms. 4 x 2 characters. */
function outrigger(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(2, 6, 29, 8); r.triangle(0, 4, 3, 9, 3, 4); r.triangle(31, 4, 28, 9, 28, 4);
  r.rect(8, 9, 22, 9); r.rect(9, 3, 9, 5); r.rect(20, 3, 20, 5); // two paddlers' seats
  r.rect(7, 10, 8, 12); r.rect(21, 10, 22, 12); r.rect(3, 12, 26, 14); r.rect(5, 13, 24, 13, false); // booms and float
  return decor('pacOutrigger', 4, 2, r, 7);
}

/** A whale's tail breaching over the harbour: two flukes and the stock they rise from. 3 x 2 characters. */
function whaleTail(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(10, 6, 13, 15); r.triangle(11.5, 8, 0, 0, 10, 4); r.triangle(11.5, 8, 23, 0, 13, 4);
  r.rect(11, 8, 12, 14, false);
  return decor('pacWhaleTail', 3, 2, r, 14);
}

// ---- the Big Island

/** Mauna Kea: a long cone, snow on its top third with a ragged edge and a dark flank. 8 x 4 characters. */
function maunaKea(): NewDecor {
  const r = new Raster(64, 32);
  for (let x = 0; x < 64; x++) {
    const top = Math.round(31 - Math.max(0, 30 - Math.abs(x - 34) * 0.62) + (x < 6 ? 6 - x : 0));
    r.rect(x, Math.min(31, top), x, 31);
  }
  for (let x = 14; x < 54; x += 2) r.set(x, Math.round(31 - Math.max(0, 30 - Math.abs(x - 34) * 0.62)) + 8 + (x % 5), false); // the snow line's ragged edge
  for (const x of [20, 28, 44]) r.line(x, 17, x + 2, 31, false);
  return decor('pacMaunaKea', 8, 4, r, ['11111111', '11111111', '99999999', '99999999']);
}

/** A lava fountain: a column of fire flung up from a vent, drops falling away. 2 x 4 characters. */
function lavaFountain(): NewDecor {
  const r = new Raster(16, 32);
  r.triangle(8, 10, 3, 31, 13, 31); r.rect(0, 28, 15, 31);
  r.rect(7, 0, 8, 9); r.ellipse(8, 6, 4, 6); r.rect(7, 4, 8, 7, false);
  for (const [x, y] of [[1, 4], [14, 3], [3, 12], [12, 11]] as const) r.rect(x, y, x + 1, y + 1);
  return decor('pacLavaFountain', 2, 4, r, ['77', '88', '22', '22']);
}

/** A coffee tree: a glossy bush with its red cherries. 3 x 3 characters. */
function coffeeTree(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(11, 14, 12, 23); r.ellipse(11.5, 9, 11, 8);
  for (let k = 0; k < 4; k++) r.line(2 + k * 6, 9, 5 + k * 6, 3, false);
  for (const [x, y] of [[5, 9], [11, 6], [17, 10], [9, 12], [14, 4]] as const) { r.rect(x, y, x + 1, y + 1, false); }
  return decor('pacCoffeeTree', 3, 3, r, ['555', '555', '999']);
}

/** Sacks of coffee beans stacked at the farm, tied at the neck. 2 x 2 characters. */
function sacks(): NewDecor {
  const r = new Raster(16, 16);
  for (const [x, y] of [[0, 8], [8, 8], [4, 1]] as const) {
    r.ellipse(x + 3.5, y + 4.5, 4, 3.6); r.rect(x + 2, y, x + 5, y + 1); r.rect(x + 3, y + 1, x + 4, y + 1, false);
  }
  return decor('pacSacks', 2, 2, r, 9);
}

/** Lava rocks: three black boulders in a heap. 2 x 1 characters. */
function lavaRocks(): NewDecor {
  const r = new Raster(16, 8);
  r.ellipse(4, 5, 4, 3); r.ellipse(11, 5, 5, 3); r.ellipse(8, 3, 3, 2.6);
  r.line(3, 3, 5, 6, false); r.line(11, 3, 12, 7, false);
  return decor('pacLavaRocks', 2, 1, r, 11);
}

// ---- the airport and the cargo plane

/** Hilo's control tower: a shaft with the glass cab flared out at the top, a mast. 2 x 6 characters. */
function controlTower(): NewDecor {
  const r = new Raster(16, 48);
  r.rect(7, 0, 8, 5); r.rect(1, 6, 14, 14); r.rect(0, 15, 15, 17);
  for (let x = 2; x < 14; x += 4) r.rect(x, 8, x + 2, 12, false);
  r.rect(5, 18, 10, 47); r.rect(7, 22, 8, 26, false); r.rect(7, 32, 8, 36, false);
  return decor('pacControlTower', 2, 6, r, 1);
}

/**
 * The cargo plane on the apron, seen from the side as itself: the long fuselage with its nose at the right, the cockpit's windows in the hump
 * of the upper deck, the wing with an engine slung under it, the tall tail fin and tailplane at the left, the wheels. 15 x 5 characters.
 */
function cargoPlane(): NewDecor {
  const r = new Raster(120, 40);
  r.rect(16, 20, 108, 33); r.ellipse(108, 26.5, 10, 7.5); // the fuselage and nose
  r.triangle(16, 22, 16, 33, 3, 22); // the tail's upsweep
  r.ellipse(86, 19, 24, 5.5); r.rect(62, 19, 110, 20); // the upper-deck hump
  for (let x = 96; x < 112; x += 5) r.rect(x, 17, x + 2, 19, false); // cockpit windows
  r.rect(8, 0, 22, 2); r.triangle(8, 2, 24, 22, 8, 22); r.rect(4, 2, 8, 22); // the tail fin
  r.rect(0, 22, 22, 25); // the tailplane
  r.triangle(50, 30, 82, 30, 36, 38); r.line(52, 30, 40, 38, false); // the wing
  r.ellipse(58, 35, 7, 3); r.rect(52, 33, 54, 36, false); // the engine on its pylon, its intake
  for (let x = 30; x < 100; x += 14) r.rect(x, 24, x, 32, false); // panel lines
  r.rect(112, 23, 116, 24, false); // the nose door's seam
  r.rect(30, 34, 31, 36); r.disc(30.5, 37, 2.6); r.rect(64, 34, 65, 36); r.disc(64.5, 37, 2.6); r.rect(98, 34, 99, 36); r.disc(98.5, 37, 2.6); // wheels
  r.rect(0, 39, 119, 39); // the apron
  const fin = '222' + '1'.repeat(12);
  return decor('pacCargoPlane', 15, 5, r, [fin, fin, '1'.repeat(15), '1'.repeat(15), '1'.repeat(15)]);
}

/** A cargo loader: a scissor lift's platform on crossed arms, a rail round it. 3 x 3 characters. */
function loader(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(0, 0, 23, 2); r.rect(0, 0, 0, 5); r.rect(23, 0, 23, 5);
  r.line(3, 3, 20, 17); r.line(4, 3, 21, 17); r.line(20, 3, 3, 17); r.line(21, 3, 4, 17);
  r.rect(0, 18, 23, 19); r.disc(4, 21.5, 2.4); r.disc(19, 21.5, 2.4);
  return decor('pacLoader', 3, 3, r, 7);
}

/** A cargo pallet: boxes under a net on a flat base. 2 x 2 characters. */
function pallet(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 13, 15, 15); r.rect(1, 12, 14, 12, false);
  r.rect(1, 2, 14, 11); r.rect(7, 2, 7, 11, false); r.rect(1, 7, 14, 7, false); r.rect(4, 3, 4, 3, false);
  r.line(1, 2, 14, 11, false); r.line(14, 2, 1, 11, false);
  return decor('pacPallet', 2, 2, r, 8);
}

/** The jump lamp: a red lamp in a housing on the hold's wall. 1 x 2 characters. */
function jumpLamp(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(1, 0, 6, 15); r.ellipse(3.5, 5, 2.4, 3, false); r.rect(3, 4, 4, 6); r.rect(2, 11, 5, 13, false);
  return decor('pacJumpLamp', 1, 2, r, 2);
}

/** A strap hung on the hold's frames: webbing with its ratchet and hooks. 1 x 3 characters. */
function strap(): NewDecor {
  const r = new Raster(8, 24);
  r.rect(2, 0, 5, 22); r.rect(3, 3, 4, 8, false); r.rect(1, 9, 6, 13); r.rect(3, 10, 4, 12, false); r.rect(3, 22, 4, 23);
  return decor('pacStrap', 1, 3, r, 7);
}

// ---- the luau at sunset (LEI OF THE LAND): the sky's bands, the sun on the sea, the lawn, the stage, the feast, the lei's arch

/** One character of sunset sky: lines of `colour` that thicken from the purple at the top to the gold at the horizon (placed a cell at a time over the room, as China's wall cells are). */
function skyBand(name: string, rows: readonly string[], colour: number): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(rows, 0, 0);
  return decor(name, 1, 1, r, colour);
}

/** The sun on the sea's edge: a half disc with the black stripes of a retro sunset cut across its lower half. 4 x 2 characters. */
function sun(): NewDecor {
  const r = new Raster(32, 16);
  r.disc(15.5, 16, 15.5);
  for (const y of [8, 11, 14]) r.rect(0, y, 31, y, false);
  return decor('pacSun', 4, 2, r, 7);
}

/** A cell of the sea behind the beach: short waves. 1 x 1 character. */
function seaWave(): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(['........', '........', '.##..##.', '#..##..#', '........', '..##....', '.#..#...', '........'], 0, 0);
  return decor('pacSeaWave', 1, 1, r, 6);
}

/** A cell of the lawn behind the lane: grass tufts over a dithered turf. 1 x 2 characters (the tufts above the turf). */
function lawn(): NewDecor {
  const r = new Raster(8, 16);
  r.stamp(['........', '.#..#...', '.#.##.#.', '########', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#'], 0, 0);
  r.stamp(['#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#'], 0, 8);
  return decor('pacLawn', 1, 2, r, ['d', '5']);
}

/** A cell of the stage: planks over a grass-skirt fringe. 1 x 2 characters. */
function stageBoard(): NewDecor {
  const r = new Raster(8, 16);
  r.stamp(['########', '########', '........', '########', '########', '........', '########', '########'], 0, 0);
  r.stamp(['########', '#.#.#.#.', '#.#.#.#.', '.#.#.#.#', '.#.#.#.#', '#.#.#.#.', '#.#.#.#.', '........'], 0, 8);
  return decor('pacStageBoard', 1, 2, r, ['8', 'd']);
}

/** Two conga drums, striped. 2 x 2 characters. */
function drums(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(3.5, 5, 3.5, 1.6); r.rect(1, 6, 6, 14); r.rect(1, 9, 6, 9, false); r.rect(1, 12, 6, 12, false);
  r.ellipse(11.5, 3, 3.5, 1.6); r.rect(9, 4, 14, 14); r.rect(9, 7, 14, 7, false); r.rect(9, 10, 14, 10, false);
  return decor('pacDrums', 2, 2, r, ['88', '99']);
}

/** The feast: a long low table with a cloth, platters of coconut shrimp and fruit on it. 6 x 2 characters. */
function feast(): NewDecor {
  const r = new Raster(48, 16);
  for (let k = 0; k < 5; k++) { r.ellipse(5 + k * 9, 6, 4, 2); r.rect(2 + k * 9, 7, 8 + k * 9, 7, false); r.set(4 + k * 9, 4, false); }
  r.rect(0, 8, 47, 11); r.rect(0, 12, 47, 12, false); r.rect(2, 12, 3, 15); r.rect(44, 12, 45, 15); r.rect(0, 13, 47, 13);
  for (let x = 1; x < 47; x += 4) r.rect(x, 9, x, 10, false);
  return decor('pacFeast', 6, 2, r, ['787878', '222222']);
}

/** The top of a frangipani arch: a curved bough strung with blossoms. 4 x 2 characters. */
function archTop(): NewDecor {
  const r = new Raster(32, 16);
  r.ring(15.5, 17, 15, 3);
  for (const [x, y] of [[3, 9], [7, 4], [13, 2], [19, 2], [25, 4], [29, 9]] as const) { r.disc(x, y, 2); r.set(x, y, false); }
  return decor('pacArchTop', 4, 2, r, 10);
}

/** One leg of the arch: a post wound with blossoms. 1 x 2 characters. */
function archLeg(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 15);
  for (const y of [2, 7, 12]) { r.disc(2, y, 1.5); r.disc(5, y + 2, 1.5); }
  return decor('pacArchLeg', 1, 2, r, ['a', '5']);
}

export const PACIFIC_DECOR = {
  pacFunnel: funnel(),
  pacBridge: bridge(),
  pacCrane: crane(),
  pacPorthole: porthole(),
  pacLifeRing: lifeRing(),
  pacAnchor: anchor(),
  pacEngineBlock: engineBlock(),
  pacGauge: gauge(),
  pacPalm: palm(4, 6, 'pacPalm'),
  pacPalmSmall: palm(3, 4, 'pacPalmSmall'),
  pacAlohaTower: alohaTower(),
  pacHotel: hotel(),
  pacDiamondHead: diamondHead(),
  pacSurfboards: surfboards(),
  pacUmbrella: umbrella(),
  pacSnorkelShop: snorkelShop(),
  pacTikiTorch: tikiTorch(),
  pacTotem: totem(),
  pacRoastPig: roastPig(),
  pacHibiscus: hibiscus(),
  pacSeaCliff: seaCliff('pacSeaCliff', 4),
  pacSeaCliffB: seaCliff('pacSeaCliffB', 11),
  pacSeaFan: seaFan(),
  pacKelp: kelp(),
  pacBubbles: bubbles(),
  pacWaterfall: waterfall(),
  pacBambooClump: bambooClump(),
  pacLaneSign: laneSign(),
  pacOutrigger: outrigger(),
  pacWhaleTail: whaleTail(),
  pacMaunaKea: maunaKea(),
  pacLavaFountain: lavaFountain(),
  pacCoffeeTree: coffeeTree(),
  pacSacks: sacks(),
  pacLavaRocks: lavaRocks(),
  pacControlTower: controlTower(),
  pacCargoPlane: cargoPlane(),
  pacLoader: loader(),
  pacPallet: pallet(),
  pacJumpLamp: jumpLamp(),
  pacStrap: strap(),
  pacGangwayRail: gangwayRail(),
  pacSkyPurple: skyBand('pacSkyPurple', ['........', '..#.....', '........', '.....#..', '........', '.#......', '........', '....#...'], 4),
  pacSkyRed: skyBand('pacSkyRed', ['########', '........', '########', '........', '########', '........', '########', '........'], 2),
  pacSkyOrange: skyBand('pacSkyOrange', ['########', '########', '........', '########', '########', '........', '########', '########'], 8),
  pacSkyGold: skyBand('pacSkyGold', ['########', '########', '########', '........', '########', '########', '########', '........'], 7),
  pacSun: sun(),
  pacSeaWave: seaWave(),
  pacLawn: lawn(),
  pacStageBoard: stageBoard(),
  pacDrums: drums(),
  pacFeast: feast(),
  pacArchTop: archTop(),
  pacArchLeg: archLeg(),
} as const satisfies Record<string, NewDecor>;

export type PacificDecor = keyof typeof PACIFIC_DECOR;
