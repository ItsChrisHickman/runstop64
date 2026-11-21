/**
 * The art of every region together, in the order the regions were made (Moscow's first: a piece's index, its tile number, creature
 * type and decoration type, never changes once a region has shipped, so rooms and saves stay as they are). A region's art is in
 * its own files (Moscow's: tiles.ts, creatures.ts, decorations.ts; Siberia's: siberia-*.ts); this is where they are one set.
 */
import { MOSCOW_CREATURES } from './creatures';
import { MOSCOW_DECOR } from './decorations';
import { SIBERIA_CREATURES } from './siberia-creatures';
import { SIBERIA_DECOR } from './siberia-decor';
import { SIBERIA_TILES } from './siberia-tiles';
import { MOSCOW_TILES, MOTR_TILE_COUNT } from './tiles';

export const WORLD_TILES = { ...MOSCOW_TILES, ...SIBERIA_TILES } as const;
export type WorldTile = keyof typeof WORLD_TILES;
export const WORLD_CREATURES = { ...MOSCOW_CREATURES, ...SIBERIA_CREATURES } as const;
export type WorldCreature = keyof typeof WORLD_CREATURES;
export const WORLD_DECOR = { ...MOSCOW_DECOR, ...SIBERIA_DECOR } as const;
export type WorldDecor = keyof typeof WORLD_DECOR;

// (a name in two regions would silently replace the first's piece)
for (const [name, a, b] of [['tile', MOSCOW_TILES, SIBERIA_TILES], ['creature', MOSCOW_CREATURES, SIBERIA_CREATURES], ['decoration', MOSCOW_DECOR, SIBERIA_DECOR]] as const) {
  const clash = Object.keys(a).filter((k) => k in b);
  if (clash.length) throw new Error(`${name} names in two regions: ${clash.join(', ')}`);
}

/** Every tile in library order. */
export const WORLD_TILE_LIST = Object.values(WORLD_TILES);

/** A tile's index in the library (the original's, then ours in order). */
export function worldTileIndex(name: WorldTile): number {
  return MOTR_TILE_COUNT + Object.keys(WORLD_TILES).indexOf(name);
}
