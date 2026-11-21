import { COL } from '../../shared/native/pause';
import { MANSION, UNENTERABLE } from './mansion';

/**
 * The map's layout: every room's cell on the grid, laid out by hand (once, here: nothing else holds a place). The mansion's exits
 * do not make a consistent grid (new rooms were squeezed into Jet Set Willy's house), so the cells follow the ways Willy walks and
 * the old game's geography, with a small number of JOINS where an exit cannot lead to a neighbour.
 *
 *   x 0-20, y 0-4    the starship: a row of sixteen (Teleport .. Foot Room) with its decks, lifts and bays under it, Maria in Space
 *                    and the star drive up the right, the Rocket Room (14, 4) at the foot of Docking Bay;
 *   x 8-21, y 5-9    the house from the watch tower down: the roof and battlements, the east wall (17), the landings (13) with the
 *                    Masters Bedroom, the attic row (7), the first floor (y 9) with the Study, Library and Chapel; the Top Landing
 *                    (13, 8), Macaroni Ted, Dumb Jetman and the Bathroom (the start) run along y 8 in the order Willy walks them;
 *   x 8-21, y 9-10   the megatree (x 21-22 up to the cuckoo's nest and the tree top), the front door (19, 10), the ballroom, the kitchen;
 *   x 5-25, y 11     the ground floor and the grounds, one row: the bow, the yacht and the beach at the left, the wine cellar and
 *                    the crypts, the security guards, the drive, the megatree's foot, the bridge, the garden and the off licence;
 *   x 6-10, y 13-15  the sewer under the beach; x 12-19, y 12-14 the pit and the zoo, the dustbins, Hades and the drain; the wells.
 */
export type Cell = readonly [number, number];

/** Room number -> [x, y] on the grid (x right, y down), and its name. Edit here: nothing else says where a room is. */
export const CELLS: Record<number, Cell> = {
  1: [25, 11], // THE OFF LICENCE
  2: [23, 11], // THE BRIDGE
  3: [22, 11], // UNDER THE MEGA TREE
  4: [21, 11], // AT THE FOOT OF THE MEGATREE
  5: [20, 11], // THE DRIVE
  6: [19, 11], // THE SECURITY GUARDS
  7: [19, 13], // ENTRANCE TO HADES
  8: [22, 10], // CUCKOO'S NEST
  9: [21, 10], // INSIDE THE MEGATREE
  10: [20, 10], // ON A BRANCH OVER THE DRIVE
  11: [19, 10], // THE FRONT DOOR
  12: [18, 10], // THE HALL
  13: [21, 9], // TREE TOP
  14: [20, 9], // OUT ON A LIMB
  15: [16, 6], // RESCUE ESMERELDA
  16: [15, 6], // I'M SURE I'VE SEEN THIS BEFORE..
  17: [14, 6], // WE MUST PERFORM A QUIRKAFLEEG
  18: [13, 6], // UP ON THE BATTLEMENTS
  19: [12, 6], // ON THE ROOF
  20: [16, 10], // BALLROOM WEST
  21: [13, 10], // TO THE KITCHEN / MAIN STAIRWAY
  22: [12, 10], // THE KITCHEN
  23: [11, 10], // WEST OF THE KITCHEN
  24: [10, 10], // COLD STORE
  25: [17, 9], // EAST WALL BASE
  26: [16, 9], // THE CHAPEL
  27: [13, 9], // FIRST LANDING
  28: [7, 11], // THE BEACH
  29: [12, 9], // NIGHTMARE ROOM
  30: [11, 9], // BANYAN TREE
  31: [17, 8], // HALF WAY UP THE EAST WALL
  32: [16, 8], // THE BATHROOM (WITH PURPLE BATH)
  33: [13, 8], // TOP LANDING
  34: [12, 8], // MASTERS BEDROOM
  35: [11, 8], // A BIT OF TREE
  36: [10, 8], // THE ORANGERY
  37: [17, 7], // PRIEST'S HOLE
  38: [16, 7], // EMERGENCY POWER STATION
  39: [14, 7], // I MEAN--EVEN I DON'T BELEVE THIS>
  40: [12, 7], // THE ATTIC
  41: [11, 7], // UNDER THE ROOF
  42: [10, 7], // CONSERVATORY ROOF
  43: [17, 6], // ON TOP OF THE HOUSE
  44: [20, 12], // UNDER THE DRIVE
  45: [21, 12], // TREE ROOT
  46: [11, 6], // NOMEN LUNI TOP OF PLANE ?
  47: [9, 11], // THE NEW WINE CELLAR
  48: [8, 11], // TOOL SHED
  49: [14, 5], // THE WATCH TOWER
  50: [9, 10], // BACK STAIRWAY
  51: [8, 10], // THE NEW BACK DOOR
  52: [9, 9], // WEST WING
  53: [8, 9], // WEST BEDROOM
  54: [9, 8], // WEST WING ROOF
  55: [8, 8], // ABOVE THE WEST BEDROOM
  56: [5, 11], // THE BOW
  57: [6, 11], // THE YACHT
  58: [10, 11], // FORGOTTEN ABBEY
  59: [17, 10], // BALL ROOM EAST
  60: [19, 12], // ATTACK OF THE MUTANT DUSTYBINS
  61: [13, 7], // HERO WORSHIP
  62: [15, 7], // SPIT-THE CAMEL
  63: [14, 8], // MACARONI TED
  64: [15, 8], // DUMB JETMAN
  65: [14, 9], // STUDY
  66: [15, 9], // THE LIBRARY
  67: [14, 10], // MEGARON
  68: [15, 10], // BUTLERS PANTRY
  69: [16, 5], // BELFRY
  70: [24, 11], // THE GARDEN
  71: [10, 9], // SWIMMING POOL
  72: [11, 11], // TRIP SWITCH
  73: [12, 11], // WILLY'S LOOKOUT
  74: [13, 11], // SKY BLUE PINK
  75: [14, 11], // POTTY POT PLANT
  76: [15, 11], // RIGOR MORTIS
  77: [16, 11], // THE CRYPT
  78: [17, 11], // DECAPITARE
  79: [18, 11], // MONEY BAGS
  82: [12, 12], // WONGA'S SPILLAGE TRAY (R.I.P)
  83: [13, 12], // WILLY'S BIRD BATH
  84: [14, 12], // SEEDY HOLE
  85: [15, 12], // THE ZOO (BEAR BRAND COMPLEX)
  86: [16, 12], // PIT GEAR ON
  87: [16, 13], // IN T' RAT HOLE
  88: [17, 13], // DOWN T' PIT
  89: [17, 14], // THE TIME LOOP (BYE!!!)
  90: [6, 14], // THE OUTLET
  91: [7, 14], // IN THE DRAINS
  92: [8, 14], // NASTIES
  93: [9, 14], // MAIN ENTRANCE (THE SEWER)
  94: [10, 14], // HOLT ROAD
  95: [10, 13], // MEGA HILL
  96: [10, 15], // DOWNSTAIRS
  97: [8, 1], // BEAM ME DOWN SPOTTY
  98: [9, 1], // CAPTAIN SLOG
  99: [10, 1], // ALIENATE?
  100: [11, 1], // SHIP'S CONFUSER
  101: [12, 1], // MAIN LIFT 1
  102: [13, 1], // PHASER POWER
  103: [14, 1], // SICK BAY !!
  104: [15, 1], // FOOTROOM
  105: [11, 2], // DEFENCE SYSTEM
  106: [12, 2], // MAIN LIFT 2
  107: [11, 3], // PHOTON TUBE
  108: [12, 3], // MAIN LIFT 3
  109: [13, 3], // CARTOGRAPHY ROOM
  110: [14, 3], // DOCKING BAY
  111: [15, 3], // STARSHIP SURPRISE
  112: [16, 3], // AYE 'APPEN
  113: [17, 3], // SHUTTLE BAY
  114: [17, 2], // THE TRUBBLE WIV TRIBBLES IS....
  115: [17, 1], // SOMEONE ELSE
  116: [17, 0], // MARIA IN SPACE
  117: [18, 0], // BANNED
  118: [19, 0], // (FLOWER) POWER SOURCE
  119: [20, 0], // STAR DRIVE (EARLY BRICK VERSION)
  120: [14, 4], // ROCKET ROOM
  121: [0, 1], // TELEPORT
  122: [1, 1], // GALACTIC INVASION
  123: [2, 1], // INCREDIBLE -
  124: [3, 1], // - BIG HOLE -
  125: [4, 1], // - IN THE GROUND
  126: [5, 1], // LOONY JET SET
  127: [6, 1], // EGGOIDS
  128: [7, 1], // SPOT ME UP BEAMY
  129: [3, 2], // THE HOLE WITH NO NAME
  130: [2, 2], // THE SECRET PASSAGE
  131: [19, 9], // WITHOUT A LIMB
  132: [17, 15], // WELL
  133: [17, 16], // WELL
  134: [17, 17], // WELL
  135: [19, 14], // DINKING VATER ?
  136: [22, 0], // THE BEGINNING OF THE END
  138: [18, 13], // NOW YOUR IN IT !!!!!
  139: [18, 14], // TO THY GRAVE
};

/** Left, right, up, down: where an exit leads on the grid. */
export const STEP = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
/** The way back: an exit leading left arrives on the other room's right edge, and so on. */
export const OPPOSITE = [1, 0, 3, 2] as const;

export const cellOf = (room: number): Cell => {
  const c = CELLS[room];
  if (!c) throw new Error(`room ${room} has no cell on the map`);
  return c;
};

/** The map's size in cells. */
export const MAP_SIZE = (() => {
  const cells = Object.values(CELLS);
  return { w: Math.max(...cells.map(([x]) => x)) + 1, h: Math.max(...cells.map(([, y]) => y)) + 1 };
})();

/** The places the rooms are drawn on: the exits to or from a room no play can enter are not drawn, so are not joins. */
const drawn = (room: number) => !UNENTERABLE.includes(room);

/** One end of a join: the edge of a room's mark (0 left, 1 right, 2 up, 3 down) the exit leaves by, or arrives at. */
export interface End { room: number; edge: number }
/**
 * An exit that does not lead to the room beside this one the way it goes (the mansion is not a consistent grid): the exit, and its
 * pair, a number (from 0) shared by the exit and the one back where there is one. The map draws the pair's two ends in one colour
 * (PAIRS), on the edge a room is left by and the edge the other is arrived at by.
 */
export interface Join { from: number; way: number; to: number; pair: number; ends: [End, End] }

/** Every join, by room and way. */
export const JOINS: readonly Join[] = (() => {
  const joins: Join[] = [];
  const keys: string[] = []; // pair -> its two ends
  for (const [n, room] of Object.entries(MANSION).sort(([a], [b]) => Number(a) - Number(b))) {
    const from = Number(n), [x, y] = cellOf(from);
    room.exits.forEach((to, way) => {
      if (to === from || !drawn(from) || !drawn(to)) return;
      const [tx, ty] = cellOf(to);
      if (tx === x + STEP[way][0] && ty === y + STEP[way][1]) return;
      const ends: [End, End] = [{ room: from, edge: way }, { room: to, edge: OPPOSITE[way] }];
      const key = ends.map((e) => `${e.room}.${e.edge}`).sort().join(' ');
      let pair = keys.indexOf(key);
      if (pair < 0) { pair = keys.length; keys.push(key); }
      joins.push({ from, way, to, pair, ends });
    });
  }
  return joins;
})();

/** The colours a pair of ends is drawn in (by pair number): distinct from the rooms' (yellow, brown, white) and the items' (cyan), and, as far as the palette allows, from each other. */
export const PAIR_COLOURS = [COL.orange, COL.pink, COL.green, COL.purple, COL.lblue, COL.lgrey, COL.blue, COL.red] as const;
/** How many pairs of ends there are. */
export const PAIRS = JOINS.reduce((n, j) => Math.max(n, j.pair + 1), 0);
/** The ends of every pair, once each. */
export const ENDS: readonly (End & { pair: number })[] = (() => {
  const seen = new Set<string>();
  return JOINS.flatMap((j) => j.ends.flatMap((e) => {
    const id = `${e.room}.${e.edge}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ ...e, pair: j.pair }];
  }));
})();
