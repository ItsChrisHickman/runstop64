/**
 * The art of every region together, in the order the regions were made (Moscow's first: a piece's index, its tile number and creature
 * type, never changes once a region has shipped, so rooms and saves stay as they are; a decoration's kind is in no save: see WORLD_DECOR). A region's art is in
 * its own files (Moscow's: tiles.ts, creatures.ts, decorations.ts; Siberia's: siberia-*.ts; China's: china-*.ts; Japan's: japan-*.ts; the Pacific's: pacific-*.ts; the Andes': andes-*.ts; Rio's: rio-*.ts); this is where they are one set.
 */
import { ANDES_CREATURES } from './andes-creatures';
import { ANDES_DECOR } from './andes-decor';
import { ANDES_TILES } from './andes-tiles';
import { CHINA_CREATURES } from './china-creatures';
import { CHINA_DECOR } from './china-decor';
import { CHINA_TILES } from './china-tiles';
import { JAPAN_CREATURES } from './japan-creatures';
import { JAPAN_DECOR } from './japan-decor';
import { JAPAN_TILES } from './japan-tiles';
import { PACIFIC_CREATURES } from './pacific-creatures';
import { PACIFIC_DECOR } from './pacific-decor';
import { PACIFIC_MORE_CREATURES, PACIFIC_MORE_DECOR, PACIFIC_MORE_TILES } from './pacific-more';
import { PACIFIC_TILES } from './pacific-tiles';
import { PACIFIC_RESET_CREATURES, PACIFIC_RESET_DECOR, PACIFIC_RESET_TILES } from './pacific-reset';
import { MOSCOW_CREATURES } from './creatures';
import { RIO_CREATURES } from './rio-creatures';
import { RIO_DECOR } from './rio-decor';
import { RIO_TILES } from './rio-tiles';
import { SKY_CREATURES, SKY_DECOR, SKY_TILES } from './sky';
import { LATER_TILES } from './later-tiles';
import { MOSCOW_DECOR } from './decorations';
import { SIBERIA_CREATURES } from './siberia-creatures';
import { SIBERIA_DECOR } from './siberia-decor';
import { SIBERIA_TILES } from './siberia-tiles';
import { MOSCOW_TILES, MOTR_TILE_COUNT } from './tiles';

export const WORLD_TILES = { ...MOSCOW_TILES, ...SIBERIA_TILES, ...CHINA_TILES, ...JAPAN_TILES, ...PACIFIC_TILES, ...PACIFIC_MORE_TILES, ...PACIFIC_RESET_TILES, ...ANDES_TILES, ...RIO_TILES, ...SKY_TILES, ...LATER_TILES } as const;
export type WorldTile = keyof typeof WORLD_TILES;
export const WORLD_CREATURES = { ...MOSCOW_CREATURES, ...SIBERIA_CREATURES, ...CHINA_CREATURES, ...JAPAN_CREATURES, ...PACIFIC_CREATURES, ...PACIFIC_MORE_CREATURES, ...PACIFIC_RESET_CREATURES, ...ANDES_CREATURES, ...RIO_CREATURES, ...SKY_CREATURES } as const;
export type WorldCreature = keyof typeof WORLD_CREATURES;
/** Every region's decorations, with the pieces no room places (they stay in their region's art, for its sheets and mock rooms). */
const ALL_DECOR = { ...MOSCOW_DECOR, ...SIBERIA_DECOR, ...CHINA_DECOR, ...JAPAN_DECOR, ...PACIFIC_DECOR, ...PACIFIC_MORE_DECOR, ...PACIFIC_RESET_DECOR, ...ANDES_DECOR, ...RIO_DECOR, ...SKY_DECOR } as const;
/**
 * The game's decoration kinds: every region's, less the pieces no room places (left out so the kinds stay well within the room table's one byte, as on a C64:
 * test/budget.ts holds the kinds to it and reports any no room places). A decoration's kind is not saved (a room is drawn from the tables as it loads), so
 * leaving one out moves the later kinds' numbers and changes no room and no save.
 */
const {
  domeLarge, lampDouble, spasskaya, samovar, // Moscow's
  pineSmall, diningSamovar, pole, stalactites, // Siberia's
  hutongDoor, stall, arrowSlit, rockery, roofEnd, // China's (its slateCell stays: china.ts's back walls may name it)
  jpNeonTall, jpWave, jpShipMast, jpBell, jpSignalLamp, jpBarrels, jpShachi,
  jpNeonRed, jpNeonGreen, // Japan's
  pacDiamondHead, pacSeaWave, pacLawn, // the Pacific's
  fern, giantTree, hangingVines, bromeliad, signBoard, launch, // the Andes'
  ...placed
} = ALL_DECOR;
export const WORLD_DECOR = placed;
export type WorldDecor = keyof typeof WORLD_DECOR;

// (a name in two regions would silently replace the first's piece)
for (const [name, regions] of [
  ['tile', [MOSCOW_TILES, SIBERIA_TILES, CHINA_TILES, JAPAN_TILES, PACIFIC_TILES, PACIFIC_MORE_TILES, PACIFIC_RESET_TILES, ANDES_TILES, RIO_TILES, SKY_TILES, LATER_TILES]], ['creature', [MOSCOW_CREATURES, SIBERIA_CREATURES, CHINA_CREATURES, JAPAN_CREATURES, PACIFIC_CREATURES, PACIFIC_MORE_CREATURES, PACIFIC_RESET_CREATURES, ANDES_CREATURES, RIO_CREATURES, SKY_CREATURES]], ['decoration', [MOSCOW_DECOR, SIBERIA_DECOR, CHINA_DECOR, JAPAN_DECOR, PACIFIC_DECOR, PACIFIC_MORE_DECOR, PACIFIC_RESET_DECOR, ANDES_DECOR, RIO_DECOR, SKY_DECOR]],
] as const) {
  const names = regions.flatMap((r) => Object.keys(r));
  const clash = names.filter((k, i) => names.indexOf(k) !== i);
  if (clash.length) throw new Error(`${name} names in two regions: ${clash.join(', ')}`);
}

/** Every tile in library order. */
export const WORLD_TILE_LIST = Object.values(WORLD_TILES);

/** A tile's index in the library (the original's, then ours in order). */
export function worldTileIndex(name: WorldTile): number {
  return MOTR_TILE_COUNT + Object.keys(WORLD_TILES).indexOf(name);
}
