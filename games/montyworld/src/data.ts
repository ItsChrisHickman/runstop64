import sidUrl from '../../montyotr/assets/monty_on_the_run.sid?url';
import { bankImage, ITEM_SPRITES, MOTR_LOOK } from '../../montyotr/src/data';
import type { MontyData, RoomEffect } from '../../montyotr/src/montydata';
import { scrollerMessage } from '../../montyotr/src/title';
import {
  buildRooms, extendBank, extendEnemies, extendTiles, listSpecials, NO_ROOMS, roomCells, specialIndex, type BaseRooms,
} from '../../shared/monty/rooms';
import {
  CART, CHINA_ITEMS, DRAGON_PICTURES, HOOD_COLOUR, hoodWorn, ICICLE_FULL, ICICLE_HALF, ICICLE_SHARDS, ICICLE_SMALL, JAPAN_ITEMS, MOSCOW_ITEMS, SIBERIA_ITEMS, WORLD_CREATURES, WORLD_DECOR, WORLD_TILE_LIST,
  HAT_COLOUR, RICE_HAT_COLOUR, riceHatWorn, ushankaWorn,
} from './art';
import { CHINA_ROOMS, CHINA_COLOURS, CHINA_SECTORS, CHI, DOOR_CELLS, DRAGON, JUNK_RAFT_CODE, PULSES, RAFT_CELLS, TOWER_ROPE_CODE, TRAPDOOR_CELLS, TRAPDOOR_ROPE } from './china';
import { CHINA_SPRITE, DRAGON_POINTERS } from './china-pointers';
import { placeHat } from './hats';
import { LEI_COLOUR, leiWorn } from './art/pacific-lei';
import { PACIFIC_ITEMS } from './art/pacific-items';
import { CHULLO_COLOUR, chulloWorn } from './art/andes-hat';
import { ANDES_ITEMS, BOULDER_FRAMES, CANOPY } from './art/andes-items';
import { ANDES_COLOURS, ANDES_ROOMS, ANDES_SECTORS, AND, BOULDERS, FLIGHTS, TANGLE_CELLS, TANGLE_ROPE, TANGLE_ROPE_CODE, VINES } from './andes';
import { ANDES_SPRITE, BOULDER_POINTERS, CANOPY_POINTERS } from './andes-pointers';
import { BRIDGE_CARS, COVE_CELLS, COVE_ROPE, COVE_ROPE_CODE, PLANE_DOOR_CELLS, LAVA, LOADER, PAC, PAC_SPRITE, PACIFIC_COLOURS, PACIFIC_ROOMS, PACIFIC_SECTORS, POOL_CELLS, POOL_BED_CELLS, POOL_BED, POOL_SEA, CHAIN_CELLS, TORCH_PULSES, TORCH_HEAD_PULSES } from './pacific';
import { DOOR_PULSES, JAPAN_COLOURS, JAPAN_ROOMS, JAPAN_SECTORS, JP, PLANK_CELLS, PLANK_CODE, SHUTTER_CELLS, TRAINS } from './japan';
import { JAPAN_SPRITE } from './japan-pointers';
import { ESCALATORS, ICICLES, MOSCOW_ROOMS, STATION_ANIMS, ROOM, SECTOR_COLOURS, SECTORS, SPRITE } from './moscow';
import { CRACKS, LIFTS, TRAIN_ANIMS, SHAFT_CODE, SHAFT_LEDGES, SHAFT_STONE, SIB, SIB_SPRITE, SIBERIA_COLOURS, SIBERIA_ROOMS, SIBERIA_SECTORS, TUNNELS } from './siberia';
import { tuneForRoom } from './music/regions';
import { WORLD_REGIONS } from './regions';

/**
 * Do Svidaniya Monty's data, for the Monty engine (games/montyotr/src: `MontyData`). A second data set on the same code as Monty on the
 * Run: rooms of its own in runstop64's room format (shared/monty/rooms.ts), made of Monty on the Run's rules, music and what of its
 * tiles and sprites fit, and new tiles, decorations, creatures and items in its style (art/). So far Moscow, the first of its regions
 * (moscow.ts), Siberia (siberia.ts), China (china.ts) and Japan (japan.ts): nine or eleven rooms each at the west end of a wide exit grid, the rest of the world to come a region at a time
 * (docs/dosvidaniya-plan.md).
 */

/** The exit grid: 50 columns for the world west to east (seven regions of about seven rooms), 8 rows for the ways up and down (the Andes' parachute drop falls through four of them). */
export const WORLD_COLS = 50, WORLD_ROWS = 8;

/** Every region's rooms in the order they were made: a room's place in the tables, and so its items' numbers, never change once a region has shipped. */
const ROOMS = [...MOSCOW_ROOMS, ...SIBERIA_ROOMS, ...CHINA_ROOMS, ...JAPAN_ROOMS, ...PACIFIC_ROOMS, ...ANDES_ROOMS];

// ---- the graphics: Monty on the Run's, with ours after them -----------------------------------------------------

const tiles = extendTiles(MOTR_LOOK, WORLD_TILE_LIST);
const creatures = Object.values(WORLD_CREATURES);
const enemies = extendEnemies(MOTR_LOOK, creatures, 35);

/** The hats: Monty's pictures with the hat's place cleared, and the hat as sprites of its own (hats.ts places them in the bank's free blocks, one set for every hat). */
const USHANKA_WORN = ushankaWorn(bankImage);
const USHANKA = placeHat(USHANKA_WORN);
const RICE_WORN = riceHatWorn(bankImage);
const RICE = placeHat(RICE_WORN);
const HOOD_WORN = hoodWorn(bankImage);
const HOOD = placeHat(HOOD_WORN);
const LEI_WORN = leiWorn(bankImage);
const LEI = placeHat(LEI_WORN);
const CHULLO_WORN = chulloWorn(bankImage);
const CHULLO = placeHat(CHULLO_WORN);

/** Each dragon picture with its pointer (named one by one, so a missing picture is a compile error). */
const DRAGON_BLOCKS = [
  { ptr: DRAGON_POINTERS.headLeftOpen, block: DRAGON_PICTURES.headLeftOpen },
  { ptr: DRAGON_POINTERS.headLeftShut, block: DRAGON_PICTURES.headLeftShut },
  { ptr: DRAGON_POINTERS.headRightOpen, block: DRAGON_PICTURES.headRightOpen },
  { ptr: DRAGON_POINTERS.headRightShut, block: DRAGON_PICTURES.headRightShut },
  { ptr: DRAGON_POINTERS.body, block: DRAGON_PICTURES.body },
  { ptr: DRAGON_POINTERS.tailLeft, block: DRAGON_PICTURES.tailLeft },
  { ptr: DRAGON_POINTERS.tailRight, block: DRAGON_PICTURES.tailRight },
] as const;

/** The bank with the items, icicles, the cart, the dragon and the first hat at their pointers. */
const bank = extendBank(bankImage, [
  ...USHANKA.blocks,
  { ptr: SPRITE.token, block: MOSCOW_ITEMS.metroToken.block },
  { ptr: SPRITE.ushanka, block: MOSCOW_ITEMS.ushanka.block },
  { ptr: SPRITE.pirozhok, block: MOSCOW_ITEMS.pirozhok.block },
  { ptr: SPRITE.iceFull, block: ICICLE_FULL },
  { ptr: SPRITE.iceHalf, block: ICICLE_HALF },
  { ptr: SPRITE.iceSmall, block: ICICLE_SMALL },
  { ptr: SPRITE.iceShards, block: ICICLE_SHARDS },
  { ptr: SIB_SPRITE.lamp, block: SIBERIA_ITEMS.lamp.block },
  { ptr: SIB_SPRITE.ticket, block: SIBERIA_ITEMS.ticket.block },
  { ptr: SIB_SPRITE.pelmeni, block: SIBERIA_ITEMS.pelmeni.block },
  { ptr: SIB_SPRITE.cartTop, block: CART.top },
  { ptr: SIB_SPRITE.cartBottom, block: CART.bottom },
  { ptr: CHINA_SPRITE.key, block: CHINA_ITEMS.towerKey.block },
  { ptr: CHINA_SPRITE.riceHat, block: CHINA_ITEMS.riceHat.block },
  { ptr: CHINA_SPRITE.bamboo, block: CHINA_ITEMS.bamboo.block },
  { ptr: CHINA_SPRITE.dumplings, block: CHINA_ITEMS.dumplings.block },
  ...DRAGON_BLOCKS,
  { ptr: PAC_SPRITE.cutters, block: PACIFIC_ITEMS.pacCutters.block },
  { ptr: PAC_SPRITE.snorkel, block: PACIFIC_ITEMS.pacSnorkel.block },
  { ptr: PAC_SPRITE.lei, block: PACIFIC_ITEMS.pacLei.block },
  { ptr: PAC_SPRITE.musubi, block: PACIFIC_ITEMS.pacMusubi.block },
  { ptr: PAC_SPRITE.parachute, block: PACIFIC_ITEMS.pacParachute.block },
  { ptr: JAPAN_SPRITE.fishFood, block: JAPAN_ITEMS.jpFishFood.block },
  { ptr: JAPAN_SPRITE.daruma, block: JAPAN_ITEMS.jpDaruma.block },
  { ptr: JAPAN_SPRITE.sushi, block: JAPAN_ITEMS.jpSushi.block },
  { ptr: JAPAN_SPRITE.hood, block: JAPAN_ITEMS.jpHood.block },
  { ptr: ANDES_SPRITE.chullo, block: ANDES_ITEMS.chullo.block },
  { ptr: ANDES_SPRITE.panpipes, block: ANDES_ITEMS.panpipes.block },
  { ptr: ANDES_SPRITE.machete, block: ANDES_ITEMS.machete.block },
  { ptr: ANDES_SPRITE.empanada, block: ANDES_ITEMS.empanada.block },
  { ptr: CANOPY_POINTERS.left, block: CANOPY.left },
  { ptr: CANOPY_POINTERS.level, block: CANOPY.level },
  { ptr: CANOPY_POINTERS.right, block: CANOPY.right },
  ...BOULDER_POINTERS.map((ptr, i) => ({ ptr, block: BOULDER_FRAMES[i]?.block ?? new Uint8Array(64) })),
]);

/** The key items' and the pirozhki's pointers, with the colour each is drawn in (the pirozhki as the cupcake is: white). */
const ITEM_COLOURS = new Map<number, number>([
  [SPRITE.token, MOSCOW_ITEMS.metroToken.colour], [SPRITE.ushanka, MOSCOW_ITEMS.ushanka.colour], [SPRITE.pirozhok, MOSCOW_ITEMS.pirozhok.colour],
  [SIB_SPRITE.lamp, SIBERIA_ITEMS.lamp.colour], [SIB_SPRITE.ticket, SIBERIA_ITEMS.ticket.colour], [SIB_SPRITE.pelmeni, SIBERIA_ITEMS.pelmeni.colour],
  [CHINA_SPRITE.key, CHINA_ITEMS.towerKey.colour], [CHINA_SPRITE.riceHat, CHINA_ITEMS.riceHat.colour], [CHINA_SPRITE.bamboo, CHINA_ITEMS.bamboo.colour],
  [CHINA_SPRITE.dumplings, CHINA_ITEMS.dumplings.colour],
  [JAPAN_SPRITE.fishFood, JAPAN_ITEMS.jpFishFood.colour], [JAPAN_SPRITE.daruma, JAPAN_ITEMS.jpDaruma.colour], [JAPAN_SPRITE.sushi, JAPAN_ITEMS.jpSushi.colour], [JAPAN_SPRITE.hood, JAPAN_ITEMS.jpHood.colour],
  [PAC_SPRITE.cutters, PACIFIC_ITEMS.pacCutters.colour], [PAC_SPRITE.snorkel, PACIFIC_ITEMS.pacSnorkel.colour], [PAC_SPRITE.lei, PACIFIC_ITEMS.pacLei.colour], [PAC_SPRITE.musubi, PACIFIC_ITEMS.pacMusubi.colour], [PAC_SPRITE.parachute, PACIFIC_ITEMS.pacParachute.colour],
  [ANDES_SPRITE.chullo, ANDES_ITEMS.chullo.colour], [ANDES_SPRITE.panpipes, ANDES_ITEMS.panpipes.colour], [ANDES_SPRITE.machete, ANDES_ITEMS.machete.colour], [ANDES_SPRITE.empanada, ANDES_ITEMS.empanada.colour],
]);
const itemSprites: MontyData['itemSprites'] = {
  ...ITEM_SPRITES,
  collectable: (ptr) => ITEM_SPRITES.collectable(ptr) || ITEM_COLOURS.has(ptr),
  colour: (ptr) => ITEM_COLOURS.get(ptr) ?? ITEM_SPRITES.colour(ptr),
};

// ---- the rooms' tables ------------------------------------------------------------------------------------------

/** Moscow's decorations are the first decoration types. */
const BASE: BaseRooms = { ...NO_ROOMS, decorTypes: Object.values(WORLD_DECOR) };
const tables = buildRooms(BASE, ROOMS, [...SECTORS, ...SIBERIA_SECTORS, ...CHINA_SECTORS, ...JAPAN_SECTORS, ...PACIFIC_SECTORS, ...ANDES_SECTORS], bankImage, SPRITE.pirozhok);

/** The special items by name (si_spawn_tbl's indexes), and the pirozhki (its cakes). */
const TOKEN = specialIndex(ROOMS, 'token');
const USHANKA_ITEM = specialIndex(ROOMS, 'ushanka');
const PIROZHKI = listSpecials(ROOMS).filter((e) => e.item === null).map((e) => e.index);
const LAMP = specialIndex(ROOMS, 'lamp');
const TICKET = specialIndex(ROOMS, 'ticket');
const KEY = specialIndex(ROOMS, 'key');
const RICE_HAT = specialIndex(ROOMS, 'rice hat');
const BAMBOO = specialIndex(ROOMS, 'bamboo');
const DARUMA = specialIndex(ROOMS, 'daruma');
const FISH_FOOD = specialIndex(ROOMS, 'fishFood');
const HOOD_ITEM = specialIndex(ROOMS, 'hood');
const CUTTERS = specialIndex(ROOMS, 'cutters');
const SNORKEL = specialIndex(ROOMS, 'snorkel');
const LEI_ITEM = specialIndex(ROOMS, 'lei');
const PARACHUTE = specialIndex(ROOMS, 'parachute');
const CHULLO_ITEM = specialIndex(ROOMS, 'chullo');
const PANPIPES = specialIndex(ROOMS, 'panpipes');
const MACHETE = specialIndex(ROOMS, 'machete');
/** The food in every region (the pause screen's SNACKS): Moscow's pirozhki, Siberia's pelmeni, China's dumplings, Japan's sushi, the Pacific's Spam musubi, the Andes' empanadas. */
const FOOD = [...PIROZHKI, specialIndex(ROOMS, 'pelmeni1'), specialIndex(ROOMS, 'pelmeni2'), specialIndex(ROOMS, 'dumplings1'), specialIndex(ROOMS, 'dumplings2'), specialIndex(ROOMS, 'sushi1'), specialIndex(ROOMS, 'sushi2'), specialIndex(ROOMS, 'musubi1'), specialIndex(ROOMS, 'musubi2'), specialIndex(ROOMS, 'musubi3'),
  ...[1, 2, 3, 4, 5, 6].map((n) => specialIndex(ROOMS, `empanada${n}`))];

/** Playfield cells (row, column) as the screen's cells a room effect names (the playfield starts at column 4, row 3). */
const onScreen = (cells: readonly (readonly [row: number, col: number])[]) => cells.map(([row, col]) => [row + 3, col + 4] as const);

/** The cells of a playfield rectangle (corners inclusive), as the screen's cells. */
function screenCells(c0: number, r0: number, c1: number, r1: number): (readonly [row: number, col: number])[] {
  const out: (readonly [number, number])[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([r, c]);
  return onScreen(out);
}

const ROOM_EFFECTS: readonly RoomEffect[] = [
  { room: ROOM.hall, when: [{ taken: TOKEN }], clear: screenCells(28, 13, 29, 16) }, // the token opens the turnstile
  { room: ROOM.kremlin, when: [{ taken: USHANKA_ITEM }], removeEnemy: 0 }, // in the fur hat, the guard steps aside
  { room: SIB.shaft, when: [{ taken: LAMP }], place: { code: SHAFT_CODE, cells: onScreen([...SHAFT_LEDGES, ...SHAFT_STONE]) } }, // the lamp shows the ledges
  { room: SIB.border, when: [{ taken: TICKET }], clear: screenCells(28, 13, 29, 16) }, // the ticket lifts the barrier
  // the key takes the trapdoor from the tower's roof, and the rope's last two cells are there to climb
  { room: CHI.tower, when: [{ taken: KEY }], clear: onScreen(TRAPDOOR_CELLS), place: { code: TOWER_ROPE_CODE, cells: onScreen(TRAPDOOR_ROPE) } },
  { room: CHI.gate, when: [{ taken: RICE_HAT }], clear: onScreen(DOOR_CELLS), removeEnemy: 1 }, // in the rice hat the city gate lets him by and the guard steps aside
  { room: CHI.junk, when: [{ taken: BAMBOO }], place: { code: JUNK_RAFT_CODE, cells: onScreen(RAFT_CELLS) } }, // the bamboo is a raft out to the junk
  { room: JP.platform, when: [{ taken: DARUMA }], clear: onScreen(SHUTTER_CELLS) }, // the daruma's wish rolls the platform's shutter up
  { room: JP.garden, when: [{ taken: FISH_FOOD }], removeEnemy: 0, place: { code: PLANK_CODE, cells: onScreen(PLANK_CELLS) } }, // fed, the koi leave the pond (the first) and the pond's planks float up
  { room: JP.garden, when: [{ taken: FISH_FOOD }], removeEnemy: 1 }, // (and the second)
  { room: JP.hall, when: [{ taken: HOOD_ITEM }], removeEnemy: 0 }, // in the ninja hood the castle's guard steps aside
  { room: PAC.box, when: [{ taken: CUTTERS }], clear: onScreen(CHAIN_CELLS) }, // the cutters take the chain off the ramp
  { room: PAC.surf, when: [{ taken: SNORKEL }], place: { code: POOL_SEA, cells: onScreen(POOL_CELLS) } }, // the snorkel opens the sea: the surf is water to wade into
  { room: PAC.surf, when: [{ taken: SNORKEL }], place: { code: POOL_BED, cells: onScreen(POOL_BED_CELLS) } }, // (its floor under the waves is sand then)
  { room: PAC.hana, when: [{ taken: SNORKEL }], clear: onScreen(COVE_CELLS) }, // and the cove's pool is a drop into the reef
  { room: PAC.hana, when: [{ taken: SNORKEL }], place: { code: COVE_ROPE_CODE, cells: onScreen(COVE_ROPE) } }, // with a rope to climb back
  { room: PAC.hilo, when: [{ taken: LEI_ITEM }], removeEnemy: 0 }, // in the lei the airport guard takes him for a tourist
  { room: PAC.hold, when: [{ taken: PARACHUTE }], clear: onScreen(PLANE_DOOR_CELLS) }, // the parachute opens the plane's rear door
  { room: AND.rock, when: [{ taken: PANPIPES }], removeEnemy: 0 }, // a tune settles the spitting llama at the tunnel's mouth, and the well is open
  { room: AND.cloud, when: [{ taken: MACHETE }], clear: onScreen(TANGLE_CELLS) }, // the machete cuts the tangle over the jetty's rope
  { room: AND.cloud, when: [{ taken: MACHETE }], place: { code: TANGLE_ROPE_CODE, cells: onScreen(TANGLE_ROPE) } }, // and the rope hangs through the gap
  { room: AND.boat, when: [{ taken: CHULLO_ITEM }], removeEnemy: 0 }, // in a local's hat the captain steps aside
];

export const WORLD: MontyData = {
  ...tables,
  ...MOTR_LOOK,
  ...tiles,
  ...enemies,
  bankImage: bank,
  // (Hubbard's tune, a version of it for each region: music/regions.ts)
  music: { ...MOTR_LOOK.music, sidUrl, tuneFor: (roomId) => tuneForRoom(WORLD.exitGrid, roomId) },
  id: 'montyworld',

  exitGrid: { image: roomCells(WORLD_COLS * WORLD_ROWS, WORLD_COLS, ROOMS), cols: WORLD_COLS, rows: WORLD_ROWS },
  extensionGrid: new Uint8Array(WORLD_COLS * WORLD_ROWS).fill(0xff),
  isExtensionRoom: () => false,
  // he starts on the platform at the left, facing right, on the floor (row 17)
  start: { mapRow: 1, exitCol: 0, x2: 0x28, y: 0xc2, facing: 0x01 },
  untravellable: [],

  kit: [],
  itemSprites,
  cheatItem: null,
  uncountedItems: [],
  treasure: null,
  roomEffects: ROOM_EFFECTS,

  jetpackRooms: [],
  lifts: LIFTS,
  escalators: [...ESCALATORS, LOADER],
  icicles: ICICLES,
  tunnels: [...TUNNELS, ...TRAINS, ...BRIDGE_CARS],
  cracks: CRACKS,
  charAnims: [...TRAIN_ANIMS, ...STATION_ANIMS],
  pulses: [...PULSES, ...DOOR_PULSES, ...TORCH_PULSES, ...TORCH_HEAD_PULSES],
  swimRooms: [PAC.clam, PAC.kelp, PAC.cave, PAC.fish],
  risingLava: [LAVA],
  dragons: [DRAGON],
  flights: FLIGHTS,
  canopy: { ...CANOPY_POINTERS, colour: CANOPY.colour },
  rollers: BOULDERS,
  vines: VINES,
  iceSprites: { full: SPRITE.iceFull, half: SPRITE.iceHalf, small: SPRITE.iceSmall, shards: SPRITE.iceShards },
  // a region's hat: once taken, Monty's pictures have it on (and the hat's own pictures take the pool's blocks), in place of the last
  costumes: [
    { item: USHANKA_ITEM, blocks: [...USHANKA_WORN.monty, ...USHANKA.blocks], over: { colour: HAT_COLOUR, frames: USHANKA.frames } },
    { item: RICE_HAT, blocks: [...RICE_WORN.monty, ...RICE.blocks], over: { colour: RICE_HAT_COLOUR, frames: RICE.frames } },
    { item: HOOD_ITEM, blocks: [...HOOD_WORN.monty, ...HOOD.blocks], over: { colour: HOOD_COLOUR, frames: HOOD.frames } },
    { item: LEI_ITEM, blocks: [...LEI_WORN.monty, ...LEI.blocks], over: { colour: LEI_COLOUR, frames: LEI.frames } },
    { item: CHULLO_ITEM, blocks: [...CHULLO_WORN.monty, ...CHULLO.blocks], over: { colour: CHULLO_COLOUR, frames: CHULLO.frames } },
  ],
  flashingBases: null,
  bollard: null,
  risingCloud: null,
  c5: null,
  completion: null,

  assists: ['lives', 'respawn', 'hints'],
  hints: {
    take: [
      { item: TOKEN, text: 'TOKEN: FOR THE METRO TURNSTILE' },
      { item: USHANKA_ITEM, text: 'FUR HAT: PAST THE KREMLIN GUARD' },
      { item: LAMP, text: 'LAMP: SHOWS THE MINE\'S LEDGES' },
      { item: TICKET, text: 'TICKET: FOR THE BORDER BARRIER' },
      { item: KEY, text: 'KEY: FOR THE TOWER\'S TRAPDOOR' },
      { item: RICE_HAT, text: 'RICE HAT: PAST THE CITY GATE' },
      { item: BAMBOO, text: 'BAMBOO: A RAFT OUT TO THE JUNK' },
      { item: DARUMA, text: 'DARUMA: ROLLS THE SHUTTER UP' },
      { item: FISH_FOOD, text: 'FISH FOOD: THE KOI LET YOU BY' },
      { item: HOOD_ITEM, text: 'HOOD: PAST THE CASTLE GUARD' },
      { item: CUTTERS, text: 'CUTTERS: THE CHAIN ON THE RAMP' },
      { item: SNORKEL, text: 'SNORKEL: THE SEA IS OPEN NOW' },
      { item: LEI_ITEM, text: 'LEI: PAST THE AIRPORT GUARD' },
      { item: PARACHUTE, text: 'PARACHUTE: FOLLOW THE COINS DOWN' },
      { item: CHULLO_ITEM, text: 'CHULLO: BLEND IN ON THE BOAT' },
      { item: PANPIPES, text: 'PANPIPES: A TUNE FOR THE LLAMA' },
      { item: MACHETE, text: 'MACHETE: CUTS THE TANGLE' },
    ],
    wanted: [
      { room: ROOM.hall, item: TOKEN, text: 'THE TURNSTILE WANTS A TOKEN' },
      { room: ROOM.kremlin, item: USHANKA_ITEM, text: 'THE GUARD WANTS A FUR HAT' },
      { room: SIB.shaft, item: LAMP, text: 'TOO DARK TO SEE: FIND A LAMP' },
      { room: SIB.border, item: TICKET, text: 'THE BARRIER WANTS A TICKET' },
      { room: CHI.tower, item: KEY, text: 'THE TRAPDOOR WANTS A KEY' },
      { room: CHI.gate, item: RICE_HAT, text: 'THE CITY GATE WANTS A RICE HAT' },
      { room: CHI.junk, item: BAMBOO, text: 'OUT TO THE JUNK: FIND BAMBOO' },
      { room: JP.platform, item: DARUMA, text: 'THE SHUTTER WANTS A WISH' },
      { room: JP.garden, item: FISH_FOOD, text: 'THE KOI WANT FEEDING' },
      { room: JP.hall, item: HOOD_ITEM, text: 'THE GUARD WANTS A NINJA HOOD' },
      { room: PAC.box, item: CUTTERS, text: 'THE CHAIN WANTS BOLT CUTTERS' },
      { room: PAC.surf, item: SNORKEL, text: 'THE SEA WANTS A SNORKEL' },
      { room: PAC.hana, item: SNORKEL, text: 'THE SEA WANTS A SNORKEL' },
      { room: PAC.hilo, item: LEI_ITEM, text: 'THE GUARD WANTS A LEI' },
      { room: PAC.hold, item: PARACHUTE, text: 'THE REAR DOOR WANTS A PARACHUTE' },
      { room: AND.rock, item: PANPIPES, text: 'THE LLAMA WANTS A TUNE' },
      { room: AND.cloud, item: MACHETE, text: 'THE UNDERGROWTH WANTS A BLADE' },
      { room: AND.boat, item: CHULLO_ITEM, text: 'THE CAPTAIN WANTS A LOCAL\'S HAT' },
    ],
  },
  // the map shows a region's columns and rows while he is in them
  regions: WORLD_REGIONS.map(({ from, to, rows }) => ({ from, to, rows })),
  progress: { keyItems: [TOKEN, USHANKA_ITEM, LAMP, TICKET, KEY, RICE_HAT, BAMBOO, DARUMA, FISH_FOOD, HOOD_ITEM, CUTTERS, SNORKEL, LEI_ITEM, PARACHUTE, CHULLO_ITEM, PANPIPES, MACHETE], cakes: FOOD, sectorColours: [...SECTOR_COLOURS, ...SIBERIA_COLOURS, ...CHINA_COLOURS, ...JAPAN_COLOURS, ...PACIFIC_COLOURS, ...ANDES_COLOURS], foodName: 'SNACKS' },
  title: {
    message: scrollerMessage([
      [0xfe, 1], 'MONTY MOLE: ', [0xfe, 7], 'WORLD TOUR. ',
      [0xfe, 1], 'A NEW GAME BY ', [0xfe, 13], 'CHRISTOPHER HICKMAN WITH CLAUDE. ',
      [0xfe, 1], 'AFTER ', [0xfe, 7], 'PETER HARRAP. ',
      [0xfe, 1], 'MUSIC BY ', [0xfe, 14], 'ROB HUBBARD. ',
      [0xfe, 1], 'A TRIBUTE: ', [0xfe, 10], 'RUNSTOP64.          ',
    ]),
  },
  ending: null,
};
