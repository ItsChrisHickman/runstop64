import sidUrl from '../../montyotr/assets/monty_on_the_run.sid?url';
import { bankImage, ITEM_SPRITES, MOTR_LOOK } from '../../montyotr/src/data';
import type { CharAnim, CharRef, FloatSpec, MontyData, RoomEffect } from '../../montyotr/src/montydata';
import { regionAt } from '../../montyotr/src/regions';
import {
  buildRooms, extendBank, extendChars, extendEnemies, extendTiles, listSpecials, NO_ROOMS, roomCells, specialIndex, type BaseRooms, type RoomSpec,
} from '../../shared/monty/rooms';
import {
  CHINA_ITEMS, DRAGON_PICTURES, HOOD_COLOUR, hoodWorn, ICICLE_FULL, ICICLE_HALF, ICICLE_SHARDS, ICICLE_SMALL, JAPAN_ITEMS, MOSCOW_ITEMS, SIBERIA_ITEMS, WORLD_CREATURES, WORLD_DECOR, WORLD_TILE_LIST,
  HAT_COLOUR, RICE_HAT_COLOUR, riceHatWorn, ushankaWorn,
} from './art';
import { MapTitle, STRIP_Y } from './title';
import { LATER_COLOURS, LATER_SECTORS } from './later-sectors';
import { AWNING_CRACKS, CHINA_ROOMS, CHINA_COLOURS, CHINA_SECTORS, CHI, DOOR_CELLS, DRAGON, JUNK_CRACKS, JUNK_RAFT_CODE, PULSES, RAFT_CELLS, TOWER_ROPE_CODE, TRAPDOOR_CELLS, TRAPDOOR_ROPE, } from './china';
import { YETI_PICTURES } from './art/siberia-yeti';
import { CHINA_SPRITE, DRAGON_POINTERS } from './china-pointers';
import { placeHat } from './hats';
import { LEI_COLOUR, leiWorn } from './art/pacific-lei';
import { PACIFIC_ITEMS } from './art/pacific-items';
import { swimBlock, swimCrown, swimPictures } from './art/pacific-swim';
import { SWIM_CYCLE, SWIM_POINTERS } from './pacific-pointers';
import { CHULLO_COLOUR, chulloWorn } from './art/andes-hat';
import { ANDES_ITEMS, BOULDER_FRAMES, CANOPY, LEAP_FRAMES } from './art/andes-items';
import { ANDES_ARRIVALS, ANDES_COLOURS, ANDES_ROOMS, ANDES_SECTORS, AND, FLIGHTS, LOG_CRACKS, ROLLERS, spitPulses, TANGLE_CELLS, VINES } from './andes';
import { ANDES_SPRITE, BOULDER_POINTERS, CANOPY_POINTERS, LEAP_POINTERS } from './andes-pointers';
import { ARRIVALS, biplaneBoarding, BRIDGE_CARS, BUBBLE_ANIMS, CRUST_CRACKS, CAVE_STALACTITES, DOME_LADDER, DOME_LADDER_CODE, FALLS_ANIMS, HULA_ANIM, LAVA, TURTLE_PULSES, PIT_LAVA, PAC, PAC_SPRITE, PACIFIC_COLOURS, PACIFIC_ROOMS, PACIFIC_SECTORS, ROCKS, SURF_CELLS, PACIFIC_CURRENTS, PACIFIC_FLOW_PULSES, SURGE_ANIMS, SWIM_ROOMS, SWIM_SURFACES, TORCH_HEAD_PULSES, TORCH_PULSES, VENT_PULSES, WAVE_PULSES } from './pacific';
import { BALL_STREAM, DOOR_PULSES, FUJI_BLOCKS, FUJI_SNOWBALLS, GALLERY_DOOR_PULSES, HIDEOUT_CRACKS, JAPAN_COLOURS, MOLE_SINKING, JAPAN_ROOMS, JAPAN_ANIMS, JAPAN_SECTORS, JP, PLANK_CELLS, PLANK_CODE, SHUTTER_CELLS, JAPAN_TUNNELS } from './japan';
import { JAPAN_SPRITE } from './japan-pointers';
import { ESCALATORS, ICICLES, MOSCOW_ROOMS, STATION_ANIMS, ROOM, SECTOR_COLOURS, SECTORS, SPRITE } from './moscow';
import { CRACKS, GANGWAYS, INSPECTOR_SLOT, MINE_CART, SIBERIA_ICICLES, YETI, YETI_POINTERS, TRAIN_ANIMS, TRAPDOOR, SIB, SIB_SPRITE, SIBERIA_COLOURS, SIBERIA_ROOMS, SIBERIA_SECTORS, TUNNELS } from './siberia';
import { crossingPlan } from './music/crossing';
import { tuneForRoom } from './music/regions';
import { WORLD_REGIONS } from './regions';
import { completion } from './finale';
import { WORLD_ENDING } from './ending-scenes';
import { isBackdrop } from './layout';
import { BARS_CELLS, BOOTH_LIGHT, CABLE_CAR as CABLE_CAR_SPEC, CLOSED_CELLS, GATE_CELLS, LAPA_STONE, leverOf, LIT_CODE, pursuerOf, RIO_ANIMS, RIO_COLOURS, RIO_ROOM, RIO_ROOMS, RIO_SECTORS, SKEWERS, TRAM } from './rio';
import { CAR_POINTERS, FINALE_POINTERS, RIO_SPRITE, SKEWER_POINTERS } from './rio-pointers';
import { FINALE_PICTURES, type FinalePicture } from './art/rio-finale';
import { shipPursuer, trainPursuer, VIKTOR_BLOCKS, viktorCameos } from './viktor';
import { headdressWorn, RIO_HAT_COLOUR } from './art/rio-hat';
import { CABLE_CAR, RIO_ITEMS, SKEWER_POSES } from './art/rio-items';
import { TALLY_FACE, TALLY_STAR } from './art/sky';
import { FLY, PLANE_LOOK, TAKE_OFF, planeLegs, SKY_ANIMS, SKY_ARRIVALS, SKY_BLOCKS, SKY_COLOURS, SKY_CURRENTS, SKY_PULSES, SKY_ROOMS, SKY_SECTORS, SKY_TUNNELS, skyRollers, tailPursuer } from './sky';

/**
 * Do Svidaniya Monty's data, for the Monty engine (games/montyotr/src: `MontyData`). A second data set on the same code as Monty on the
 * Run: rooms of its own in runstop64's room format (shared/monty/rooms.ts), made of Monty on the Run's rules, music and what of its
 * tiles and sprites fit, and new tiles, decorations, creatures and items in its style (art/). So far Moscow, the first of its regions
 * (moscow.ts), Siberia (siberia.ts), China (china.ts) and Japan (japan.ts): nine or eleven rooms each at the west end of a wide exit grid, the rest of the world to come a region at a time
 * (docs/dosvidaniya-plan.md).
 */

/** The exit grid: 50 columns for the world west to east (seven regions of about seven rooms), 8 rows for the ways up and down (the Andes' parachute drop falls through four of them). */
export const WORLD_COLS = 50, WORLD_ROWS = 8;

/** Rooms added to a region after it shipped: they go last in the tables (their coins and finds take new places at the ends), so no save's places move. */
const ADDED: readonly number[] = [CHI.heaven];
/** Every region's rooms in the order they were made: a room's place in the tables, and so its items' numbers, never change once a region has shipped. */
const ROOMS = [...[...MOSCOW_ROOMS, ...SIBERIA_ROOMS, ...CHINA_ROOMS, ...JAPAN_ROOMS, ...PACIFIC_ROOMS, ...ANDES_ROOMS, ...RIO_ROOMS, ...SKY_ROOMS].filter((r) => !ADDED.includes(r.id)), ...ADDED.flatMap((id) => CHINA_ROOMS.filter((r) => r.id === id))];

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
/** The lei's crown on each of the swimming pictures (a picture of its own set on his hair, as the lei sits on his walking ones), and the swimming pictures, made from his own (pacific-swim.ts). */
const SWIM = swimPictures(bankImage), SWIM_CROWN = swimCrown(bankImage);
const LEI_SWIM_FRAMES = new Map([
  ...LEI.frames,
  ...SWIM_CYCLE.left.map((ptr) => [ptr, { ptr: SWIM_POINTERS.crownLeft, dx: 0, dy: SWIM_CROWN.dy }] as const),
  ...SWIM_CYCLE.right.map((ptr) => [ptr, { ptr: SWIM_POINTERS.crownRight, dx: 0, dy: SWIM_CROWN.dy }] as const),
]);
/** The swimming pictures in the blocks Rio's skewers use in Rio (the swim rooms borrow them while they are loaded). */
const SWIM_BLOCKS = [
  ...SWIM.left.map((rows, i) => ({ ptr: SWIM_POINTERS.left[i] ?? 0, block: swimBlock(`swim left ${i}`, rows) })),
  ...SWIM.right.map((rows, i) => ({ ptr: SWIM_POINTERS.right[i] ?? 0, block: swimBlock(`swim right ${i}`, rows) })),
  { ptr: SWIM_POINTERS.crownLeft, block: swimBlock('crown left', SWIM_CROWN.left) },
  { ptr: SWIM_POINTERS.crownRight, block: swimBlock('crown right', SWIM_CROWN.right) },
];
const CHULLO_WORN = chulloWorn(bankImage);
const CHULLO = placeHat(CHULLO_WORN);
const HEADDRESS_WORN = headdressWorn(bankImage);
const HEADDRESS = placeHat(HEADDRESS_WORN);

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

/** The finale's pictures, put in with the beach (finale.ts). */
const FINALE_NAMES = ['chair', 'bowlFull', 'bowlEmpty', 'berries3', 'berries2', 'berries1', 'sitDip', 'sitUp', 'sitMouth', 'sitChew', 'danceLeft', 'danceRight', 'spoonDip', 'spoonUp', 'spoonMouth'] as const satisfies readonly FinalePicture[];
const FINALE_BLOCKS = FINALE_NAMES.map((name) => ({ ptr: FINALE_POINTERS[name], block: FINALE_PICTURES[name] }));

/** The tally's characters in the HUD (tally.ts): Viktor's face and the star, in characters the charset leaves blank and nothing draws ($0A-$0E; $38-$3B, blank too, are Monty on the Run's teleporter beam). */
export const TALLY_CHARS = { face: 0x0a, star: 0x0e } as const;

/** The bank with the items, icicles, the dragon and the first hat at their pointers, and the tally's characters. */
const bank = extendChars(extendBank(bankImage, [
  ...USHANKA.blocks,
  { ptr: SPRITE.token, block: MOSCOW_ITEMS.metroToken.block },
  { ptr: SPRITE.ushanka, block: MOSCOW_ITEMS.ushanka.block },
  { ptr: SPRITE.pirozhok, block: MOSCOW_ITEMS.pirozhok.block },
  { ptr: SPRITE.iceFull, block: ICICLE_FULL },
  { ptr: SPRITE.iceHalf, block: ICICLE_HALF },
  { ptr: SPRITE.iceSmall, block: ICICLE_SMALL },
  { ptr: SPRITE.iceShards, block: ICICLE_SHARDS },
  { ptr: SIB_SPRITE.ticket, block: SIBERIA_ITEMS.ticket.block },
  { ptr: SIB_SPRITE.pelmeni, block: SIBERIA_ITEMS.pelmeni.block },
  { ptr: CHINA_SPRITE.key, block: CHINA_ITEMS.towerKey.block },
  { ptr: CHINA_SPRITE.riceHat, block: CHINA_ITEMS.riceHat.block },
  { ptr: CHINA_SPRITE.bamboo, block: CHINA_ITEMS.bamboo.block },
  { ptr: CHINA_SPRITE.dumplings, block: CHINA_ITEMS.dumplings.block },
  ...DRAGON_BLOCKS,
  { ptr: YETI_POINTERS.topLeft, block: YETI_PICTURES.topLeft },
  { ptr: YETI_POINTERS.topRight, block: YETI_PICTURES.topRight },
  ...YETI_PICTURES.bottomLeft.map((block, i) => ({ ptr: YETI_POINTERS.bottomLeft[i] ?? 0, block })),
  ...YETI_PICTURES.bottomRight.map((block, i) => ({ ptr: YETI_POINTERS.bottomRight[i] ?? 0, block })),
  { ptr: PAC_SPRITE.snorkel, block: PACIFIC_ITEMS.pacSnorkel.block },
  { ptr: PAC_SPRITE.lei, block: PACIFIC_ITEMS.pacLei.block },
  { ptr: PAC_SPRITE.musubi, block: PACIFIC_ITEMS.pacMusubi.block },
  { ptr: PAC_SPRITE.parachute, block: PACIFIC_ITEMS.pacParachute.block },
  { ptr: PAC_SPRITE.coffee, block: PACIFIC_ITEMS.pacCoffee.block },
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
  ...LEAP_POINTERS.map((ptr, i) => ({ ptr, block: LEAP_FRAMES[i]?.block ?? new Uint8Array(64) })),
  { ptr: RIO_SPRITE.crank, block: RIO_ITEMS.crank.block },
  { ptr: RIO_SPRITE.headdress, block: RIO_ITEMS.headdress.block },
  { ptr: RIO_SPRITE.skewer, block: RIO_ITEMS.skewer.block },
  { ptr: RIO_SPRITE.bowl, block: RIO_ITEMS.acaiBowl.block },
  { ptr: CAR_POINTERS.roof, block: CABLE_CAR.top },
  { ptr: CAR_POINTERS.floor, block: CABLE_CAR.bottom },
  ...SKEWER_POSES.left.map((pose, i) => ({ ptr: pointerOf(SKEWER_POINTERS.left, i), block: pose.block })),
  ...SKEWER_POSES.right.map((pose, i) => ({ ptr: pointerOf(SKEWER_POINTERS.right, i), block: pose.block })),
]), [{ chr: TALLY_CHARS.face, bytes: TALLY_FACE }, { chr: TALLY_CHARS.star, bytes: TALLY_STAR }]);

/** The key items' and the pirozhki's pointers, with the colour each is drawn in (the pirozhki as the cupcake is: white). */
const ITEM_COLOURS = new Map<number, number>([
  [SPRITE.token, MOSCOW_ITEMS.metroToken.colour], [SPRITE.ushanka, MOSCOW_ITEMS.ushanka.colour], [SPRITE.pirozhok, MOSCOW_ITEMS.pirozhok.colour],
  [SIB_SPRITE.ticket, SIBERIA_ITEMS.ticket.colour], [SIB_SPRITE.pelmeni, SIBERIA_ITEMS.pelmeni.colour],
  [CHINA_SPRITE.key, CHINA_ITEMS.towerKey.colour], [CHINA_SPRITE.riceHat, CHINA_ITEMS.riceHat.colour], [CHINA_SPRITE.bamboo, CHINA_ITEMS.bamboo.colour],
  [CHINA_SPRITE.dumplings, CHINA_ITEMS.dumplings.colour],
  [JAPAN_SPRITE.fishFood, JAPAN_ITEMS.jpFishFood.colour], [JAPAN_SPRITE.daruma, JAPAN_ITEMS.jpDaruma.colour], [JAPAN_SPRITE.sushi, JAPAN_ITEMS.jpSushi.colour], [JAPAN_SPRITE.hood, JAPAN_ITEMS.jpHood.colour],
  [PAC_SPRITE.snorkel, PACIFIC_ITEMS.pacSnorkel.colour], [PAC_SPRITE.lei, PACIFIC_ITEMS.pacLei.colour], [PAC_SPRITE.musubi, PACIFIC_ITEMS.pacMusubi.colour], [PAC_SPRITE.parachute, PACIFIC_ITEMS.pacParachute.colour], [PAC_SPRITE.coffee, PACIFIC_ITEMS.pacCoffee.colour], [PAC_SPRITE.moonRock, PACIFIC_ITEMS.pacMoonRock.colour],
  [RIO_SPRITE.crank, RIO_ITEMS.crank.colour], [RIO_SPRITE.headdress, RIO_ITEMS.headdress.colour], [RIO_SPRITE.skewer, RIO_ITEMS.skewer.colour], [RIO_SPRITE.bowl, RIO_ITEMS.acaiBowl.colour],
  [ANDES_SPRITE.chullo, ANDES_ITEMS.chullo.colour], [ANDES_SPRITE.panpipes, ANDES_ITEMS.panpipes.colour], [ANDES_SPRITE.machete, ANDES_ITEMS.machete.colour], [ANDES_SPRITE.empanada, ANDES_ITEMS.empanada.colour],
]);
const itemSprites: MontyData['itemSprites'] = {
  ...ITEM_SPRITES,
  treasure: RIO_SPRITE.bowl, // (the acai bowl: touching it ends the game)
  collectable: (ptr) => ITEM_SPRITES.collectable(ptr) || ITEM_COLOURS.has(ptr),
  colour: (ptr) => ITEM_COLOURS.get(ptr) ?? ITEM_SPRITES.colour(ptr),
};

// ---- the rooms' tables ------------------------------------------------------------------------------------------

/** The sprite pointer of a pose (a pose without one is a mistake in the data). */
function pointerOf(pointers: readonly number[], i: number): number {
  const ptr = pointers[i];
  if (ptr === undefined) throw new Error(`no sprite pointer for skewer pose ${i}`);
  return ptr;
}

/** The decoration library (art/world.ts): what the rooms' pieces are numbered by; each region's list is made of the ones its rooms place. */
const BASE: BaseRooms = { ...NO_ROOMS, decorTypes: Object.entries(WORLD_DECOR).map(([name, type]) => (isBackdrop(name) ? { ...type, backdrop: true } : type)) };
/** The library's kinds as the engine draws them (a backdrop marked), by a room's `RoomSpec` number (`decorIndex`). */
export const DECOR_LIBRARY = BASE.decorTypes;
/** The region a room's decorations are loaded with: the region of the map (regions.ts) its cell is in. */
function decorRegion(r: RoomSpec): number {
  const region = regionAt(WORLD_REGIONS, r.row, r.col);
  if (!region) throw new Error(`room ${r.id} at [${r.row},${r.col}]: in no region`);
  return WORLD_REGIONS.indexOf(region);
}
const built = buildRooms(BASE, ROOMS, [...SECTORS, ...SIBERIA_SECTORS, ...CHINA_SECTORS, ...JAPAN_SECTORS, ...PACIFIC_SECTORS, ...ANDES_SECTORS, ...RIO_SECTORS, ...SKY_SECTORS, ...LATER_SECTORS], bankImage, SPRITE.pirozhok, decorRegion);

/** A library piece an animation or a float names, as its room's region numbers it (a piece the region's rooms place none of is a mistake in the data). */
function regionKind(room: number, libraryKind: number): number {
  const kind = built.decorKindIn(room, libraryKind);
  if (kind === undefined) throw new Error(`room ${room}: a mechanism of decoration ${Object.keys(WORLD_DECOR)[libraryKind] ?? libraryKind}, which its region's rooms do not place`);
  return kind;
}
const regionRef = (room: number) => (ref: CharRef): CharRef => (typeof ref === 'number' ? ref : { decor: regionKind(room, ref.decor), cell: ref.cell });
const regionAnim = (a: CharAnim): CharAnim => (a.kind === 'scroll' ? { ...a, rings: a.rings.map((ring) => ring.map(regionRef(a.room))) } : { ...a, chars: a.chars.map(regionRef(a.room)) });
const regionFloat = (f: FloatSpec): FloatSpec => ({ ...f, decor: regionKind(f.room, f.decor) });

/** The special items by name (si_spawn_tbl's indexes), and the pirozhki (its cakes). */
const TOKEN = specialIndex(ROOMS, 'token');
const USHANKA_ITEM = specialIndex(ROOMS, 'ushanka');
const PIROZHKI = listSpecials(ROOMS).filter((e) => e.item === null).map((e) => e.index);
const TICKET = specialIndex(ROOMS, 'ticket');
const KEY = specialIndex(ROOMS, 'key');
const RICE_HAT = specialIndex(ROOMS, 'rice hat');
const BAMBOO = specialIndex(ROOMS, 'bamboo');
const DARUMA = specialIndex(ROOMS, 'daruma');
const FISH_FOOD = specialIndex(ROOMS, 'fishFood');
const HOOD_ITEM = specialIndex(ROOMS, 'hood');
const SNORKEL = specialIndex(ROOMS, 'snorkel');
const LEI_ITEM = specialIndex(ROOMS, 'lei');
const PARACHUTE = specialIndex(ROOMS, 'parachute');
const COFFEE = specialIndex(ROOMS, 'coffee');
const MOON_ROCK = specialIndex(ROOMS, 'moon rock');
const CHULLO_ITEM = specialIndex(ROOMS, 'chullo');
const PANPIPES = specialIndex(ROOMS, 'panpipes');
const MACHETE = specialIndex(ROOMS, 'machete');
const CRANK = specialIndex(ROOMS, 'crank');
const HEADDRESS_ITEM = specialIndex(ROOMS, 'headdress');
const BOWL = specialIndex(ROOMS, 'bowl');

/**
 * Finds no room shows (their room is none: $FF), for what must be remembered through a death and a save: the crank fitted in the Sambadrome's booth and Viktor squashed there (levers.ts takes them; the room's
 * effects read them), Viktor knocked off the cargo ship and swept off the train's roof (pursuers.ts) and his shadow seen on THE LAST MOLE's moon (cameos.ts: once only). They come after every room's finds, so no room's find moves; they count for nothing on the pause screen.
 */
const HIDDEN = ['crank fitted', 'agent squashed', 'viktor overboard', 'viktor on the moon', 'viktor off the train', 'viktor won the plane'] as const;
const tables = { ...built, specialItems: Uint8Array.from([...built.specialItems, ...HIDDEN.flatMap(() => [0xff, 0, 0, 0])]) };
const FITTED = built.specialItems.length / 4, SQUASHED = FITTED + 1, OVERBOARD = FITTED + 2, MOON_SEEN = FITTED + 3, SWEPT = FITTED + 4, PLANE_LOST = FITTED + 5;
/** The hidden finds the tests read (the tally's rounds). */
export const ROUNDS = { train: SWEPT, ship: OVERBOARD, plane: PLANE_LOST } as const;
/** The food in every region (the pause screen's SNACKS): Moscow's pirozhki, Siberia's pelmeni, China's dumplings, Japan's sushi, the Pacific's Spam musubi, the Andes' empanadas. */
const FOOD = [...PIROZHKI, specialIndex(ROOMS, 'pelmeni1'), specialIndex(ROOMS, 'dumplings1'), specialIndex(ROOMS, 'dumplings2'), specialIndex(ROOMS, 'sushi1'), specialIndex(ROOMS, 'sushi2'), ...[1, 2, 3].map((n) => specialIndex(ROOMS, `musubi${n}`)),
  ...[1, 2].map((n) => specialIndex(ROOMS, `empanada${n}`)), ...[1, 2].map((n) => specialIndex(ROOMS, `skewer${n}`))];

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
  // the inspector sees the ticket and steps out of the sleeper's far gangway: the way under the roof is open into the tender (one effect a room)
  ...[...new Set(GANGWAYS.map((g) => g.room))].map((room): RoomEffect => ({
    room, when: [{ taken: TICKET }], clear: GANGWAYS.filter((g) => g.room === room).flatMap(({ cols }) => screenCells(cols[0], 15, cols[1], 16)), ...(room === SIB.sleeper ? { removeEnemy: INSPECTOR_SLOT } : {}),
  })),
  // and the provodnitsa unbolts the luggage closet's floor: the closet's ladder runs on down into the corridor, the way in from the roof
  { room: SIB.sleeper, when: [{ taken: TICKET }], clear: onScreen(TRAPDOOR.clear), place: { code: TRAPDOOR.code, cells: onScreen(TRAPDOOR.ladder) } },
  // the key takes the trapdoor from the tower's roof, and the rope's last two cells are there to climb
  { room: CHI.tower, when: [{ taken: KEY }], clear: onScreen(TRAPDOOR_CELLS), place: { code: TOWER_ROPE_CODE, cells: onScreen(TRAPDOOR_ROPE) } },
  { room: CHI.gate, when: [{ taken: RICE_HAT }], clear: onScreen(DOOR_CELLS), removeEnemy: 1 }, // in the rice hat the city gate lets him by and the guard steps aside
  { room: CHI.junk, when: [{ taken: BAMBOO }], place: { code: JUNK_RAFT_CODE, cells: onScreen(RAFT_CELLS) } }, // the bamboo is a raft out to the junk
  { room: JP.platform, when: [{ taken: DARUMA }], clear: onScreen(SHUTTER_CELLS) }, // the daruma's wish rolls the platform's shutter up
  { room: JP.garden, when: [{ taken: FISH_FOOD }], removeEnemy: 0, place: { code: PLANK_CODE, cells: onScreen(PLANK_CELLS) } }, // fed, the koi leave the pond (the first) and the pond's planks float up
  { room: JP.garden, when: [{ taken: FISH_FOOD }], removeEnemy: 1 }, // (and the second)
  { room: JP.hideout, when: [{ taken: HOOD_ITEM }], removeEnemy: 0 }, // the hideout's door guard, a ninja himself, lets him by (the way on to the port runs through that door)
  { room: PAC.summit, when: [{ taken: MOON_ROCK }], removeEnemy: 0, place: { code: DOME_LADDER_CODE, cells: onScreen(DOME_LADDER) } }, // the astronomer lets his ladder down and takes the moon rock in to look at it
  { room: PAC.waikiki, when: [{ taken: SNORKEL }], clear: onScreen(SURF_CELLS) }, // with the snorkel the surf is the way down into Hana's sea
  { room: AND.picchu, when: [{ taken: PANPIPES }], removeEnemy: 0 }, // a tune settles the spitting llama at the tunnel's mouth (and its spit, a pulse: calmedBy), and the tunnel and its well are open
  { room: AND.kapok, when: [{ taken: MACHETE }], clear: onScreen(TANGLE_CELLS) }, // the machete cuts the tangle off the kapok's crown branch: the way out east to Rio
  { room: RIO_ROOM.sugar, when: [{ taken: CRANK }], clear: onScreen(GATE_CELLS) }, // the crank works the cable car's winch: its bars go,
  { room: RIO_ROOM.sugar, when: [{ taken: CRANK }], late: true, clear: onScreen(CLOSED_CELLS) }, // and the CLOSED sign (a decoration) comes down
  { room: RIO_ROOM.drum, when: [{ taken: FITTED }], late: true, place: { code: LIT_CODE, cells: onScreen(BOOTH_LIGHT) } }, // the crank fitted, the booth's window lights up
  { room: RIO_ROOM.drum, when: [{ taken: SQUASHED }], clear: onScreen(BARS_CELLS) }, // the agent squashed, the bars at the avenue's end lift
  { room: RIO_ROOM.bust, removeEnemy: 0 }, { room: RIO_ROOM.bust, removeEnemy: 1 }, // (the finale's troupe waits off the beach)
];

export const WORLD: MontyData = {
  ...tables,
  ...MOTR_LOOK,
  ...tiles,
  ...enemies,
  bankImage: bank,
  // (Hubbard's tune, a version of it for each region: music/regions.ts)
  music: { ...MOTR_LOOK.music, sidUrl, tuneFor: (roomId) => tuneForRoom(WORLD.exitGrid, roomId), crossing: (original) => crossingPlan(original) },
  id: 'montyworld',

  exitGrid: { image: roomCells(WORLD_COLS * WORLD_ROWS, WORLD_COLS, ROOMS), cols: WORLD_COLS, rows: WORLD_ROWS },
  extensionGrid: new Uint8Array(WORLD_COLS * WORLD_ROWS).fill(0xff),
  isExtensionRoom: () => false,
  // he starts on the platform at the left, facing right, on the floor (row 17)
  start: { mapRow: 1, exitCol: 0, x2: 0x28, y: 0xc2, facing: 0x01 },
  untravellable: [],
  ropeHoldRooms: [SIB.yeti], // (jumping up the pine into the cave, he holds it there)

  kit: [],
  itemSprites,
  cheatItem: null,
  uncountedItems: [BOWL, FITTED, SQUASHED, OVERBOARD, MOON_SEEN, SWEPT, PLANE_LOST],
  treasure: null,
  roomEffects: ROOM_EFFECTS,

  jetpackRooms: [],
  lifts: [],
  escalators: ESCALATORS,
  icicles: [...ICICLES, ...SIBERIA_ICICLES, ...CAVE_STALACTITES],
  tunnels: [...TUNNELS, ...JAPAN_TUNNELS, ...BRIDGE_CARS, ...SKY_TUNNELS],
  cracks: [...CRACKS, ...AWNING_CRACKS, ...JUNK_CRACKS, ...HIDEOUT_CRACKS, ...MOLE_SINKING, ...CRUST_CRACKS, ...LOG_CRACKS],
  charAnims: [...TRAIN_ANIMS, ...STATION_ANIMS, ...JAPAN_ANIMS, ...SURGE_ANIMS, HULA_ANIM, ...FALLS_ANIMS, ...BUBBLE_ANIMS, ...RIO_ANIMS, ...SKY_ANIMS].map(regionAnim),
  pulses: [...PULSES, ...DOOR_PULSES, ...GALLERY_DOOR_PULSES, BALL_STREAM, ...TORCH_PULSES, ...TORCH_HEAD_PULSES, ...TURTLE_PULSES, ...PACIFIC_FLOW_PULSES, ...VENT_PULSES, ...WAVE_PULSES, ...spitPulses(PANPIPES), ...SKY_PULSES],
  swimRooms: SWIM_ROOMS,
  swimSurfaces: SWIM_SURFACES,
  swimGate: SNORKEL,
  currents: [...PACIFIC_CURRENTS, ...SKY_CURRENTS],
  arrivals: [...ARRIVALS, ...ANDES_ARRIVALS, ...SKY_ARRIVALS],
  swimPictures: { left: SWIM_CYCLE.left, right: SWIM_CYCLE.right },
  roomBlocks: [{ rooms: SWIM_ROOMS, blocks: SWIM_BLOCKS }, { rooms: [PAC.loa], blocks: [{ ptr: PAC_SPRITE.moonRock, block: PACIFIC_ITEMS.pacMoonRock.block }] }, { rooms: [RIO_ROOM.bust], blocks: FINALE_BLOCKS }, ...VIKTOR_BLOCKS, { rooms: Object.values(FLY), blocks: SKY_BLOCKS }, FUJI_BLOCKS],
  risingLava: [LAVA, { ...PIT_LAVA, wakenBy: MOON_ROCK }], // (the pit's sleeps until the moon rock is taken)
  dragons: [DRAGON, YETI],
  flights: FLIGHTS,
  canopy: { ...CANOPY_POINTERS, colour: CANOPY.colour },
  planes: planeLegs(PLANE_LOST),
  planeLook: PLANE_LOOK,
  // the yellow mail biplane at Hilo: with the parachute and the coffee, it takes him off into the flight's first leg
  boardings: [biplaneBoarding(PARACHUTE, COFFEE, TAKE_OFF)],
  // the Spy vs Spy tally: Monty wins the train and the ship, Viktor the plane (Monty 2 v Viktor 1 into SPY VERSUS MOLE)
  tally: {
    rounds: [{ find: SWEPT, winner: 'hero' }, { find: OVERBOARD, winner: 'hero' }, { find: PLANE_LOST, winner: 'villain' }],
    face: TALLY_CHARS.face, star: TALLY_CHARS.star, colours: { hero: 8, villain: 1, open: 11, away: 11 },
  },
  rollers: [...ROLLERS, ...ROCKS, LAPA_STONE, ...FUJI_SNOWBALLS, ...skyRollers(MOTR_LOOK.sfx.warp)],
  vines: VINES,
  cableCars: [CABLE_CAR_SPEC],
  floats: [TRAM, MINE_CART].map(regionFloat),
  skewers: SKEWERS,
  pursuers: [trainPursuer(SWEPT), shipPursuer(OVERBOARD), pursuerOf(SQUASHED), tailPursuer(PLANE_LOST)],
  levers: [leverOf(CRANK, FITTED, SQUASHED)],
  cameos: viktorCameos(MOON_SEEN, HOOD_ITEM),
  iceSprites: { full: SPRITE.iceFull, half: SPRITE.iceHalf, small: SPRITE.iceSmall, shards: SPRITE.iceShards },
  // a region's hat: once taken, Monty's pictures have it on (and the hat's own pictures take the pool's blocks), in place of the last
  costumes: [
    { item: USHANKA_ITEM, blocks: [...USHANKA_WORN.monty, ...USHANKA.blocks], over: { colour: HAT_COLOUR, frames: USHANKA.frames } },
    { item: RICE_HAT, blocks: [...RICE_WORN.monty, ...RICE.blocks], over: { colour: RICE_HAT_COLOUR, frames: RICE.frames } },
    { item: HOOD_ITEM, blocks: [...HOOD_WORN.monty, ...HOOD.blocks], over: { colour: HOOD_COLOUR, frames: HOOD.frames } },
    { item: LEI_ITEM, blocks: [...LEI_WORN.monty, ...LEI.blocks], over: { colour: LEI_COLOUR, frames: LEI_SWIM_FRAMES } },
    { item: CHULLO_ITEM, blocks: [...CHULLO_WORN.monty, ...CHULLO.blocks], over: { colour: CHULLO_COLOUR, frames: CHULLO.frames } },
    { item: HEADDRESS_ITEM, blocks: [...HEADDRESS_WORN.monty, ...HEADDRESS.blocks], over: { colour: RIO_HAT_COLOUR, frames: HEADDRESS.frames } },
  ],
  flashingBases: null,
  bollard: null,
  risingCloud: null,
  c5: null,
  completion,

  assists: ['lives', 'respawn', 'hints'],
  // Our hints give the reason in the story, not the answer (Chris: not "THE CITY GATE WANTS A RICE HAT" but that the guards turn away
  // foreigners): what is picked up says why someone wants it, a room that wants a thing says what is in the way. One name row: 32 characters.
  hints: {
    take: [
      { item: TOKEN, text: 'A TOKEN: FARE FOR THE METRO' },
      { item: USHANKA_ITEM, text: 'FUR HAT: LOOK LIKE A LOCAL' },
      { item: TICKET, text: 'A TICKET: THE INSPECTOR ASKS' },
      { item: KEY, text: 'A KEY: SOMETHING IS LOCKED UP' },
      { item: RICE_HAT, text: 'A RICE HAT: LOOK LIKE A LOCAL' },
      { item: BAMBOO, text: 'BAMBOO: SOMETHING TO FLOAT ON' },
      { item: DARUMA, text: 'DARUMA DOLLS GRANT WISHES' },
      { item: FISH_FOOD, text: 'FISH FOOD: KOI FOLLOW FOOD' },
      { item: HOOD_ITEM, text: 'A HOOD HIDES HIM FROM GUARDS' },
      { item: SNORKEL, text: 'WITH A SNORKEL HE CAN SWIM' },
      { item: LEI_ITEM, text: 'A LEI: TRAVELLERS WEAR ONE' },
      { item: PARACHUTE, text: 'PARACHUTE: FOR A LONG DROP' },
      { item: COFFEE, text: 'COFFEE KEEPS A PILOT AWAKE' },
      { item: MOON_ROCK, text: 'A MOON ROCK: FOR AN ASTRONOMER' },
      { item: CHULLO_ITEM, text: 'A CHULLO: LOOK LIKE A LOCAL' },
      { item: PANPIPES, text: 'PANPIPES: MUSIC CALMS BEASTS' },
      { item: MACHETE, text: 'MACHETE: HACKS THROUGH VINES' },
      { item: HEADDRESS_ITEM, text: 'A HEADDRESS: JOIN THE PARADE' },
    ],
    wanted: [
      { room: ROOM.hall, item: TOKEN, text: 'THE TURNSTILE TAKES A TOKEN' },
      { room: ROOM.kremlin, item: USHANKA_ITEM, text: 'THE GUARD LETS ONLY LOCALS BY' },
      { room: SIB.sleeper, item: TICKET, text: 'THE INSPECTOR CHECKS TICKETS' },
      { room: CHI.tower, item: KEY, text: 'THE TRAPDOOR IS LOCKED UP' },
      { room: CHI.gate, item: RICE_HAT, text: 'THE CITY TURNS FOREIGNERS AWAY' },
      { room: CHI.junk, item: BAMBOO, text: 'THE RIVER IS TOO WIDE TO WADE' },
      { room: JP.platform, item: DARUMA, text: 'THE SHUTTER OPENS FOR LUCK' },
      { room: JP.garden, item: FISH_FOOD, text: 'HUNGRY KOI CROWD THE POND' },
      { room: JP.hideout, item: HOOD_ITEM, text: 'THE DOOR IS FOR NINJAS ONLY' },
      { room: PAC.waikiki, item: SNORKEL, text: 'A MOLE CANNOT SWIM THAT FAR' },
      { room: PAC.summit, item: MOON_ROCK, text: 'THE ASTRONOMER WANTS A MOON ROCK' },
      { room: AND.picchu, item: PANPIPES, text: 'THE LLAMA IS CROSS: CALM IT' },
      { room: AND.kapok, item: MACHETE, text: 'THE UNDERGROWTH IS TOO THICK' },
      { room: RIO_ROOM.sugar, item: CRANK, text: 'THE CABLE CAR STATION IS LOCKED' },
    ],
  },
  // the map shows a region's columns and rows while he is in them
  regions: WORLD_REGIONS.map(({ label, from, to, rows, except, flown }) => ({ name: label, from, to, rows, ...(except ? { except } : {}), ...(flown ? { flown } : {}) })),
  progress: { keyItems: [TOKEN, USHANKA_ITEM, TICKET, KEY, RICE_HAT, BAMBOO, DARUMA, FISH_FOOD, HOOD_ITEM, SNORKEL, LEI_ITEM, PARACHUTE, MOON_ROCK, COFFEE, CHULLO_ITEM, PANPIPES, MACHETE, CRANK, HEADDRESS_ITEM], cakes: FOOD, sectorColours: [...SECTOR_COLOURS, ...SIBERIA_COLOURS, ...CHINA_COLOURS, ...JAPAN_COLOURS, ...PACIFIC_COLOURS, ...ANDES_COLOURS, ...RIO_COLOURS, ...SKY_COLOURS, ...LATER_COLOURS], foodName: 'SNACKS' },
  title: { screen: (g, sound) => new MapTitle(g, sound, WORLD.bankImage, USHANKA_WORN), stripY: STRIP_Y },
  ending: WORLD_ENDING,
};
