/**
 * Japan's tiles for Monty Mole: World Tour (region 4): 8 x 8 hires characters for a room's codes 1-8, in Monty on the Run's style as
 * Moscow's and Siberia's are: one bright ink on black in solid shapes cut with black lines (planks, roof tiles, lattice, stone),
 * never a checker or a dither. The harbour's, Tokyo's, the parlour's, the station's, Fuji's, the garden's, the castle's and the port's.
 * Every name starts `jp` so it cannot clash with another region's.
 */
import { tile } from './tiles';

export const JAPAN_TILES = {
  /** The quay's planks, wet: boards with their joints. Solid. */
  jpQuay: tile('jpQuay', 1, 9, ['########', '........', '###.####', '###.####', '........', '####.###', '####.###', '........']),
  /** Harbour stone under the quay: big blocks with their joints. Solid. */
  jpPier: tile('jpPier', 1, 12, ['########', '#......#', '#.####.#', '#.####.#', '########', '.#....#.', '.#.##.#.', '########']),
  /** Harbour water: waves in rows. Deadly. */
  jpWater: tile('jpWater', 4, 14, ['........', '.##..##.', '#..##..#', '........', '..##..##', '.#..##..', '........', '##..##..']),
  /** A crate: planks with a cross brace. Solid. */
  jpCrate: tile('jpCrate', 1, 8, ['########', '##....##', '#.#..#.#', '#..##..#', '#..##..#', '#.#..#.#', '##....##', '########']),
  /** A kawara roof's top: the ridge's tiles in a scalloped row. A floor. */
  jpKawara: tile('jpKawara', 2, 14, ['########', '########', '#.##.##.', '.#..#..#', '........', '........', '........', '........']),
  /** The roof's body: broad bands of tiles with black joints. Solid. */
  jpRoofBody: tile('jpRoofBody', 1, 6, ['########', '########', '###.####', '........', '########', '####.###', '########', '........']),
  /** A shop front's concrete: a grid of windows. Solid. */
  jpOffice: tile('jpOffice', 1, 12, ['########', '#.##.##.', '#.##.##.', '########', '#.##.##.', '#.##.##.', '########', '########']),
  /** The street: asphalt with a kerb's line along the top. Solid. */
  jpAsphalt: tile('jpAsphalt', 1, 11, ['########', '........', '#...#...', '........', '..#...#.', '........', '#...#...', '........']),
  /** The crossing: zebra stripes seen end on, bold bars with gaps. Solid. */
  jpZebra: tile('jpZebra', 1, 1, ['########', '........', '###.###.', '###.###.', '###.###.', '###.###.', '........', '########']),
  /** The parlour's carpet: a loud diamond pattern. Solid. */
  jpCarpet: tile('jpCarpet', 1, 4, ['...##...', '..####..', '.##..##.', '##....##', '##....##', '.##..##.', '..####..', '...##...']),
  /** A pachinko machine: pins and a window, lit. Nothing (he walks in front). */
  jpPachinko: tile('jpPachinko', 0, 10, ['.######.', '#......#', '#.####.#', '#.#..#.#', '#.#..#.#', '#.####.#', '#......#', '.######.']),
  /** Tatami: straw mats with their borders and a rush's lines. Solid. */
  jpTatami: tile('jpTatami', 1, 7, ['########', '#......#', '#.####.#', '#.####.#', '#.####.#', '#......#', '########', '........']),
  /** A paper door shut: a white panel in a lattice frame. Solid. */
  jpShojiShut: tile('jpShojiShut', 1, 1, ['########', '#..##..#', '#..##..#', '########', '#..##..#', '#..##..#', '########', '#..##..#']),
  /** The paper door shaking: the lattice broken, a warning. Nothing. */
  jpShojiWarn: tile('jpShojiWarn', 0, 7, ['#......#', '#.#..#.#', '#......#', '#..#.#.#', '#......#', '#.#..#.#', '#......#', '#..#.#.#']),
  /** The paper door open: only the frame's edge in the pocket. Nothing. */
  jpShojiOpen: tile('jpShojiOpen', 0, 9, ['#.......', '#.......', '#.......', '#.......', '#.......', '#.......', '#.......', '#.......']),
  /** A castle's plaster wall: white panels with their black joints. Solid. */
  jpPlaster: tile('jpPlaster', 1, 1, ['########', '########', '####.###', '........', '########', '###.####', '########', '........']),
  /** A dark timber beam: grain along it. Solid. */
  jpTimber: tile('jpTimber', 1, 9, ['########', '#.#.#.##', '########', '##.#.###', '########', '#.##.#.#', '########', '########']),
  /** The castle's stone base: great blocks, joints wandering. Solid. */
  jpStoneWall: tile('jpStoneWall', 1, 12, ['###.####', '###.####', '........', '#.######', '#.######', '........', '####.###', '####.###']),
  /** A castle eave: upturned tiles over a curved lip. A floor. */
  jpEave: tile('jpEave', 2, 14, ['########', '#######.', '.######.', '..####..', '...##...', '........', '........', '........']),
  /** Snow on Fuji's upper slope: drifts in rows, as scenery (the mountain's body is behind him, the trail in front). Nothing. */
  jpSnow: tile('jpSnow', 0, 1, ['########', '########', '####.###', '########', '########', '###.####', '########', '########']),
  /** Fuji's slope below the snow: blue-grey rock in streaks, as scenery. Nothing. */
  jpSlope: tile('jpSlope', 0, 6, ['##.##.##', '##.##.##', '#..##..#', '##.##.##', '#.##.##.', '##.##.##', '#..##..#', '##.##.##']),
  /** Volcanic cinders under the snow line: rough lumps. Solid. */
  jpScree: tile('jpScree', 1, 11, ['..####..', '.######.', '###..###', '##....##', '###..###', '.######.', '#.####.#', '..#..#..']),
  /** A pilgrim's trail: stone steps with a dirt edge. A floor. */
  jpTrail: tile('jpTrail', 2, 9, ['########', '########', '.#.#.#.#', '........', '........', '........', '........', '........']),
  /** Moss over rock: turf along the top, soil below. Solid. */
  jpMoss: tile('jpMoss', 1, 5, ['#.##.#.#', '########', '########', '#.#.##.#', '........', '.####.##', '........', '##.####.']),
  /** Raked gravel: circles combed in the sand. Solid. */
  jpGravel: tile('jpGravel', 1, 15, ['########', '........', '.######.', '........', '########', '........', '.######.', '........']),
  /** A stepping stone: a round flat stone with its dark underside. A floor. */
  jpStone: tile('jpStone', 2, 12, ['########', '########', '###.####', '########', '########', '.######.', '........', '........']),
  /** A lacquered plank of the zig-zag bridge: bold, with its pegs. A floor. */
  jpPlank: tile('jpPlank', 2, 2, ['########', '#.#..#.#', '########', '........', '........', '........', '........', '........']),
  /** A bamboo pole to climb: a stalk with its nodes. A rope. */
  jpBamboo: tile('jpBamboo', 3, 5, ['..####..', '..#..#..', '..#..#..', '########', '..#..#..', '..#..#..', '..#..#..', '########']),
  /** A drainpipe on its brackets. A rope. */
  jpPipe: tile('jpPipe', 3, 12, ['..####..', '..#..#..', '..#..#..', '########', '..#..#..', '..#..#..', '..#..#..', '..#..#..']),
  /** The mountain trail's chain: links hanging from posts. A rope. */
  jpChain: tile('jpChain', 3, 12, ['...##...', '..#..#..', '..#..#..', '...##...', '...##...', '..#..#..', '..#..#..', '...##...']),
  /** The platform's edge: the yellow studded warning strip over concrete. Solid. */
  jpPlatform: tile('jpPlatform', 1, 7, ['########', '#.#.#.#.', '########', '........', '#...#...', '........', '..#...#.', '........']),
  /** Tiled concrete wall of the underpass: square tiles. Solid. */
  jpTiled: tile('jpTiled', 1, 14, ['#######.', '#######.', '#######.', '#######.', '#######.', '#######.', '#######.', '........']),
  /** A roller shutter: ribs across, a handle at the foot. Solid. */
  jpShutter: tile('jpShutter', 1, 12, ['########', '........', '########', '........', '########', '........', '########', '...##...']),
  /** A shipping container's corrugation: ribs up and down. Solid. */
  jpContainer: tile('jpContainer', 1, 2, ['#.#.#.#.', '#.#.#.#.', '#.#.#.#.', '#.#.#.#.', '#.#.#.#.', '#.#.#.#.', '#.#.#.#.', '########']),
  /** Steel quay plate with rivets. Solid. */
  jpSteel: tile('jpSteel', 1, 12, ['########', '#......#', '#.#..#.#', '#......#', '#......#', '#.#..#.#', '#......#', '########']),
  /** A cargo ship's hull: red plates, a seam and rivets. Solid. */
  jpShipHull: tile('jpShipHull', 1, 2, ['########', '........', '#.#.#.#.', '########', '########', '........', '#.#.#.#.', '########']),
  /** A cargo ship's hull with a porthole: the red plates and a round black window. Solid. */
  jpPorthole: tile('jpPorthole', 1, 2, ['########', '###..###', '##....##', '##....##', '###..###', '########', '########', '........']),
  /** The junk's hull: wide planks with a batten between. Solid. */
  jpJunkHull: tile('jpJunkHull', 1, 2, ['########', '########', '........', '#.##.##.', '########', '........', '########', '########']),
  /** The top of a crate: planks with a cross brace, thin. A floor (the harbour's stair of crates). */
  jpCrateTop: tile('jpCrateTop', 2, 8, ['########', '#.#..#.#', '########', '........', '........', '........', '........', '........']),
  /** The bullet train's window row: white with a black window in each cell, the frame left between them. Nothing (the train is a picture drawn over the room as it sweeps). */
  jpTrainWin: tile('jpTrainWin', 0, 1, ['########', '##....##', '##....##', '##....##', '##....##', '########', '########', '########']),
  /** The bullet train's white body, a black seam at its foot. Nothing. */
  jpTrainBody: tile('jpTrainBody', 0, 1, ['########', '########', '########', '########', '########', '########', '########', '........']),
  /** The bullet train's blue band: a stripe across it between thin black lines. Nothing. */
  jpTrainBand: tile('jpTrainBand', 0, 6, ['........', '########', '########', '########', '########', '########', '########', '........']),
  /** The bullet train's skirt and bogie: a grey skirt over a pair of wheels. Nothing. */
  jpTrainWheel: tile('jpTrainWheel', 0, 12, ['########', '########', '########', '.######.', '##.##.##', '##.##.##', '.######.', '........']),
  /** The bullet train's nose, a half cell: the lower half white, so the nose rises a half cell at a time. Nothing. */
  jpTrainHalf: tile('jpTrainHalf', 0, 1, ['........', '........', '........', '........', '########', '########', '########', '........']),
  /** A warehouse's wall: upright planks, seams and nails. Solid. */
  jpWarehouse: tile('jpWarehouse', 1, 9, ['###.###.', '###.###.', '#.#.#.#.', '###.###.', '###.###.', '###.###.', '#.#.#.#.', '###.###.']),
  /** A tower block's face at night: rows of lit windows on black. Solid. */
  jpLitA: tile('jpLitA', 1, 7, ['........', '###.###.', '###.###.', '###.###.', '........', '###.###.', '###.###.', '###.###.']),
  /** A tower block's face at night, some windows dark. Solid. */
  jpLitB: tile('jpLitB', 1, 7, ['........', '###.....', '###.....', '###.....', '........', '.....###', '.....###', '.....###']),
  /** A castle's plaster wall in the open: white panels with black joints. Nothing (the castle behind him). */
  jpKeepWall: tile('jpKeepWall', 0, 1, ['########', '########', '####.###', '........', '########', '###.####', '########', '........']),
  /** A castle's window: a slit in the plaster. Nothing. */
  jpKeepWindow: tile('jpKeepWindow', 0, 1, ['########', '#..##..#', '#..##..#', '########', '########', '###.####', '########', '........']),
  /** A castle's stone base seen behind him: great dressed blocks. Nothing (the castle behind him). */
  jpKeepBase: tile('jpKeepBase', 0, 9, ['########', '#......#', '########', '###.####', '###.####', '########', '#.######', '#.######']),
  /** The mountain's left flank, a 45 degree edge: blue rock below a diagonal, as scenery. Nothing. */
  jpSlopeL: tile('jpSlopeL', 0, 6, ['.......#', '......##', '.....###', '....####', '...#####', '..######', '.#######', '########']),
  /** The mountain's right flank, a 45 degree edge. Nothing. */
  jpSlopeR: tile('jpSlopeR', 0, 6, ['#.......', '##......', '###.....', '####....', '#####...', '######..', '#######.', '########']),
} as const;

export type JapanTile = keyof typeof JAPAN_TILES;
