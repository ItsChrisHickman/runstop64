/**
 * Mock rooms of Rio (pre-production) drawn with the new art in Monty on the Run's own terms, to judge the art in place: S (Sugarloaf's
 * cable car on its cable), W (the churrascaria with its gauchos and swinging skewers), Q (the carnival's floats over the channel) and B
 * (the beach: the finale's last picture, Christ the Redeemer over Copacabana at dusk, the acai bowl on its table). Not the game's rooms:
 * the layouts in docs/dosvidaniya-rio.md are its. Each is written alone and beside one of Monty on the Run's own rooms (`compare-*.png`).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-rooms.ts <out-dir>
 */
import { bankImage } from '../../montyotr/src/data';
import { ANDES_DECOR } from '../src/art/andes-decor';
import { chulloWorn, CHULLO_COLOUR } from '../src/art/andes-hat';
import { ANDES_TILES } from '../src/art/andes-tiles';
import { RIO_CREATURES } from '../src/art/rio-creatures';
import { RIO_DECOR } from '../src/art/rio-decor';
import { headdressWorn, RIO_HAT_COLOUR } from '../src/art/rio-hat';
import { CABLE_CAR, RIO_SPRITES, SKEWER_COLOUR, SKEWER_POSES } from '../src/art/rio-items';
import { RIO_TILES } from '../src/art/rio-tiles';
import { Grid, write, type At, type RoomArt } from './room-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-rooms.ts <out-dir>');
const art: RoomArt = {
  tiles: { ...RIO_TILES, woodLadder: ANDES_TILES.woodLadder },
  decor: { ...RIO_DECOR, signBoard: ANDES_DECOR.signBoard },
  creatures: RIO_CREATURES,
  sprites: RIO_SPRITES,
};
const chullo = chulloWorn(bankImage), headdress = headdressWorn(bankImage);

/** A gaucho's skewer in pose `k` at the gaucho's top left (playfield pixels), facing left or right. */
function skewerAt(x: number, y: number, k: number, facing: 'left' | 'right'): readonly [{ block: Uint8Array; colour: number }, At] {
  const pose = SKEWER_POSES[facing][k];
  if (pose === undefined) throw new Error(`no skewer pose ${k}`);
  return [{ block: pose.block, colour: SKEWER_COLOUR }, { x: x + pose.dx, y: y + pose.dy }];
}

// ---- SUGAR RUSH: the cable climbs from the lower station on the left to the upper platform, a pylon standing in the bay under it, two cars
{
  const g = new Grid();
  g.fill(0, 16, 11, 16, '6'); g.fill(0, 17, 11, 19, '1'); g.fill(12, 18, 26, 19, '3');
  for (let i = 0; i < 10; i++) { g.fill(6 + 2 * i, 15 - i, 6 + 2 * i, 15 - i, '4'); g.fill(7 + 2 * i, 15 - i, 7 + 2 * i, 15 - i, '5'); }
  g.fill(26, 6, 31, 6, '6'); g.fill(27, 7, 31, 19, '1'); g.fill(24, 18, 26, 19, '3');
  g.fill(12, 17, 26, 17, '.');
  write(out, art, {
    name: 'SUGAR RUSH', nameCol: 11,
    codes: [['granite'], ['graniteLedge'], ['bayWater'], ['cableLow'], ['cableHigh'], ['stationFloor']],
    grid: g,
    decor: [['sugarloaf', 12, 1], ['cableStation', 0, 13], ['pylon', 18, 10], ['pylon', 18, 14], ['cableStation', 27, 2, 15]],
    coins: [[14, 14], [22, 12], [29, 4], [10, 14]],
    creatures: [['vulture', 6, 3, 1], ['crab', 9, 14, 0]],
    items: [[{ block: CABLE_CAR.top, colour: CABLE_CAR.colour }, { x: 40, y: 90 }], [{ block: CABLE_CAR.bottom, colour: CABLE_CAR.colour }, { x: 40, y: 111 }],
      [{ block: CABLE_CAR.top, colour: CABLE_CAR.colour }, { x: 226, y: 10 }], [{ block: CABLE_CAR.bottom, colour: CABLE_CAR.colour }, { x: 226, y: 31 }]],
    monty: [{ ptr: 0x54, at: { x: 44, y: 107 }, worn: chullo, hat: CHULLO_COLOUR }],
  }, 'sugar-rush', 0x1a);
}

// ---- STEAK YOUR CLAIM: the dining floor under red lamps, the stage on the mezzanine with the headdress, gauchos on the floor with their skewers in three poses
{
  const g = new Grid();
  g.fill(0, 0, 31, 1, '2'); g.fill(0, 2, 1, 19, '2'); g.fill(30, 2, 31, 19, '2');
  g.fill(0, 18, 31, 18, '1'); g.fill(0, 19, 31, 19, '2');
  g.fill(2, 9, 13, 9, '6'); g.fill(18, 9, 29, 9, '6');
  g.fill(14, 9, 14, 17, '5'); g.fill(17, 9, 17, 17, '5');
  g.fill(2, 16, 3, 17, '4');
  const gx1 = 19 * 8, gy1 = 16 * 8, gx2 = 22 * 8, gy2 = 7 * 8, gx3 = 11 * 8;
  write(out, art, {
    name: 'STEAK YOUR CLAIM', nameCol: 8,
    codes: [['restTile'], ['restBrick'], ['tableTop'], ['barrel'], ['woodLadder'], ['pierPlanks'], ['riser']],
    grid: g,
    decor: [['saladBar', 5, 16], ['restTable', 8, 16], ['restTable', 20, 16], ['rotisserie', 24, 15], ['archKitchen', 27, 13, 2], ['lampRed', 8, 2], ['lampRed', 16, 2], ['lampRed', 24, 2], ['curtain', 2, 6], ['curtain', 12, 6]],
    coins: [[5, 14], [16, 14], [26, 7], [8, 7]],
    creatures: [['gaucho', 19, 16, 4], ['gaucho', 22, 7, 1], ['gaucho', 11, 16, 0]],
    items: [['headdress', { col: 6, row: 7 }], ['skewer', { col: 4, row: 14 }], skewerAt(gx1, gy1, 1, 'right'), skewerAt(gx2, gy2, 3, 'left'), skewerAt(gx3, gy1, 2, 'left')],
    monty: [{ ptr: 0x54, at: { x: 15 * 8, y: 18 * 8 - 21 }, worn: chullo, hat: CHULLO_COLOUR }],
  }, 'steak-your-claim', 0x0f);
}

// ---- FLOAT YOUR BOAT: the channel to cross by riding the floats, the stands behind, banners and bunting, dancers on the decks
{
  const g = new Grid();
  g.fill(0, 16, 3, 19, '1'); g.fill(0, 15, 3, 15, '5'); g.fill(27, 16, 28, 19, '1'); g.fill(30, 16, 31, 19, '1'); g.fill(29, 16, 29, 19, '6');
  g.fill(4, 17, 26, 19, '3');
  g.fill(5, 14, 10, 14, '4'); g.fill(16, 14, 21, 14, '4'); g.fill(12, 8, 16, 8, '4'); g.fill(22, 8, 27, 8, '4');
  write(out, art, {
    name: 'FLOAT YOUR BOAT', nameCol: 8,
    codes: [['paradeStreet'], ['riser'], ['bayWater', 6], ['floatDeck'], ['paradeBarrier'], ['woodLadder']],
    grid: g,
    decor: [['stands', 0, 2], ['stands', 4, 2], ['stands', 24, 2], ['stands', 28, 2], ['bunting', 14, 3], ['bunting', 18, 3], ['floatGalleon', 5, 11], ['floatBird', 16, 10], ['floatSun', 12, 5], ['surdo', 24, 6]],
    coins: [[8, 8], [18, 6], [24, 12], [14, 15]],
    creatures: [['dancer', 8, 12, 1], ['dancer', 14, 6, 2], ['dancer', 18, 12, 3]],
    items: [],
    monty: [{ ptr: 0x54, at: { x: 8, y: 16 * 8 - 21 }, worn: headdress, hat: RIO_HAT_COLOUR }, { ptr: 0x54, at: { x: 22 * 8, y: 8 * 8 - 21 }, worn: headdress, hat: RIO_HAT_COLOUR }],
  }, 'float-your-boat', 0x07);
}

// ---- RIO OR BUST: the beach at dusk: Christ the Redeemer on Corcovado, Sugarloaf across the bay, the wave pavement, the sea, the acai bowl on its table
{
  const g = new Grid();
  g.fill(0, 16, 31, 16, '1'); g.fill(0, 17, 31, 19, '2'); g.fill(0, 11, 31, 12, '3'); g.fill(3, 0, 3, 15, '5');
  g.fill(27, 15, 28, 15, '4');
  write(out, art, {
    name: 'RIO OR BUST', nameCol: 10,
    codes: [['wavePavement'], ['sand'], ['seaSwell'], ['tableTop'], ['woodLadder']],
    grid: g,
    decor: [['christ', 22, 4], ['sugarloaf', 6, 8], ['parasol', 24, 13], ['deckchair', 22, 15], ['signBoard', 5, 14]],
    coins: [],
    creatures: [],
    items: [['acaiBowl', { col: 27, row: 13 }], ['sun', { col: 15, row: 9 }]],
    monty: [{ ptr: 0x54, at: { x: 19 * 8, y: 16 * 8 - 21 }, worn: headdress, hat: RIO_HAT_COLOUR }],
  }, 'rio-or-bust', 0x30);
}
console.log('ok');
