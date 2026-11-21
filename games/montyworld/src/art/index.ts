/**
 * The art of Monty Mole: World Tour, a region at a time, as data in Monty on the Run's own formats. Region 1, Moscow: its tiles
 * (8 x 8 characters with their collision classes), decorations (w x h characters with colours), creatures (16 x 16 hires, 8
 * frames) and items (hires sprite blocks). Every piece is new, made for this game in Monty on the Run's style; how each is
 * written and what it becomes is in pixels.ts, and the shapes are in types.ts.
 */
export * from './china-dragon';
export * from './china-items';
export * from './creatures';
export * from './decorations';
export * from './escalator';
export * from './hat';
export * from './japan-hood';
export * from './japan-items';
export * from './ice';
export * from './siberia-items';
export * from './tiles';
export * from './world';
export type { Colour, NewCreature, NewDecor, NewItem, NewTile, TileClass } from './types';
