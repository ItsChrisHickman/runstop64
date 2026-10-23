/**
 * A place of the montage and what BLOB does there (src/ending.ts plays them; `re/routes.ts` finds the routes).
 */

/** What he does in a place: the thing the route ends in (the search's goal, and what the test checks). */
export type Goal =
  /** Carries a thing of this graphic (a core piece, the access card...: picked up where it lies). */
  | { readonly take: number }
  /** Is within a cell of a place (column and row as the game keeps them). */
  | { readonly near: { readonly col: number; readonly row: number } }
  /** Is riding a hover pad. */
  | { readonly ride: true }
  /** Goes into a teleport booth: its screen is up (and the destination's name is typed, if the scene says). */
  | { readonly booth: true }
  /** Leaves into a room. */
  | { readonly room: number }
  /** The core is whole: the game's own ending. */
  | { readonly won: true };

/** A thing lying in the room when he comes in (a graphic, where). */
export interface Lying { readonly graphic: number; readonly col: number; readonly row: number }

export interface Scene {
  room: number;
  /** Where he comes into the room (a cell: column, row). */
  spot: { readonly col: number; readonly row: number };
  /** Things put in the room for him to find (the game scatters them at random; here they lie where the scene wants). */
  lying?: readonly Lying[];
  /** What he carries by then (graphics). */
  carry?: readonly number[];
  /** The core's pieces all in his hands: he comes into the core with them (the game's own ending follows). */
  complete?: boolean;
  /** What he does, one after another (the last is what the place is for). */
  goals: readonly Goal[];
  /** The room of the booth whose name he types at the booth he goes into (the teleport's screen asks for one). */
  teleportTo?: number;
  /** The stick, a frame a count, as text (games/shared/ending/pilot.ts), found by `re/routes.ts`. */
  route: string;
  /** Frames the place is shown at least, if its route is not what it lasts. */
  frames?: number;
  /** Credit lines over this place (upper case, at most 38 letters). */
  credits: readonly string[];
}

/**
 * The montage: BLOB's own start on the surface, then places down the planet (a hover pad over the surface, a teleport booth with
 * the thing it asks for typed, the cave's pad, the core). The credits are in three parts, as Super Mario World's: the makers, true
 * facts, then the port (shared/ending/credits.ts `PORT_CREDITS`, put after the last place's by ending.ts). Sources of every line:
 * re/credits.md. A line is at most 38 letters of the game's own lettering (the last text row, under the room, is empty in every place).
 */
export const SCENES: readonly Scene[] = [
  {
    // (his own start, on the rock: he walks off it and falls into the cave below)
    room: 8, spot: { col: 21, row: 16 }, goals: [{ room: 24 }], route: '<36',
    credits: ['STARQUAKE, BUBBLE BUS SOFTWARE, 1985', 'WRITTEN BY STEPHEN CROW'],
  },
  {
    // (the hover pad over the surface: on it, round the room)
    room: 51, spot: { col: 31, row: 19 }, goals: [{ ride: true }, { near: { col: 8, row: 8 } }], route: '<72 ^4 >36 ^>28 ^<20 v<48',
    credits: ['C64 VERSION BY NICK STRANGE', 'MUSIC BY STEPHEN CROW'],
  },
  {
    // (a core piece lying on the ledge, platforms built up to it, and the booth, whose far end's name is typed)
    room: 31, spot: { col: 4, row: 19 }, lying: [{ graphic: 0x1f, col: 5, row: 12 }], goals: [{ take: 0x1f }, { booth: true }], teleportTo: 289,
    route: '>12 v4 >4 v4 <4 v4 <8 v4 <4 v4 <4 v4 <8 ^4 >41', frames: 480,
    credits: ['BLOB IS A BIO-LOGICALLY OPERATED', 'BEING: HIS MISSION, THE CORE OF AN', 'UNSTABLE ROGUE PLANET, TO BE', 'REPAIRED BEFORE IT IMPLODES'],
  },
  {
    room: 289, spot: { col: 4, row: 20 }, goals: [{ booth: true }], teleportTo: 461, route: 'v4 >56 v4 <4 v4 >4 v4 >25', frames: 400,
    credits: ['512 SCREENS, EACH WITH ITS OWN LOOK', 'NINE ELEMENTS TO REPLACE IN THE CORE', 'WHICH, AND WHERE THE THINGS ARE,', 'IS RANDOM EACH GAME'],
  },
  {
    room: 461, spot: { col: 31, row: 16 }, goals: [{ ride: true }, { booth: true }], teleportTo: 343,
    route: '<8 v4 <4 v4 >4 v4 <8 v4 >4 v4 <4 v4 <4 v4 <40 >29', frames: 500,
    credits: ['FIFTEEN TELEPORTS, EACH WITH ITS', 'OWN CODE, CONNECT THE PLANET', 'ON A HOVER PAD BLOB CANNOT PICK UP', 'THINGS: HE MOUNTS AT DOCKS ONLY'],
  },
  {
    room: 343, spot: { col: 10, row: 19 }, goals: [{ ride: true }, { booth: true }], teleportTo: 31, route: '<8 v4 >8 v4 >4 v4 >53', frames: 400,
    credits: ['ZZAP!64: ONE OF THE MOST PLAYABLE', 'AND ABSORBING GAMES OF ITS TYPE'],
  },
  {
    room: 41, spot: { col: 28, row: 13 }, goals: [{ ride: true }, { near: { col: 8, row: 20 } }], route: '<28 >4 v4 <20 v4 <24 v4 <8',
    credits: ['ZZAP!64: THE HEROES ALL DECLINED,', 'CERTAIN DEATH AND NO MORE CHAT SHOW', 'APPEARANCES. THAT LEFT BLOB'],
  },
  {
    // (the core's last pieces in his hands: the core's sequence puts them in, and the game's own ending follows)
    room: 199, spot: { col: 21, row: 16 }, complete: true, goals: [{ won: true }], route: '', frames: 640,
    credits: ['THE SPECTRUM GAME WON A CRASH SMASH', 'AT 96 PER CENT'],
  },
];

/**
 * A creature that walks through the montage: its kind (what the game draws into an enemy's sprite: 0-14), a room where one of that kind is about
 * with BLOB standing in his own start of it (under the montage's seed), and a name. The game names none of them: the names are plain
 * descriptions of the pictures.
 */
export interface Creature { readonly name: string; readonly kind: number; readonly room: number }
export const CAST: readonly Creature[] = [
  { name: 'WHITE SPINNER', kind: 0, room: 130 },
  { name: 'COG', kind: 1, room: 268 },
  { name: 'ANTENNA BUG', kind: 2, room: 271 },
  { name: 'WINGED BUG', kind: 3, room: 391 },
  { name: 'WHITE BIRD', kind: 4, room: 226 },
  { name: 'BLUE CURL', kind: 5, room: 412 },
  { name: 'BLUE SNAIL', kind: 6, room: 220 },
  { name: 'YELLOW SNAIL', kind: 7, room: 388 },
  { name: 'RED LIZARD', kind: 8, room: 1 },
  { name: 'RED CRAWLER', kind: 9, room: 421 },
  { name: 'BROWN CRAWLER', kind: 10, room: 31 },
  { name: 'WHITE SPLAT', kind: 11, room: 436 },
  { name: 'BLUE BEETLE', kind: 12, room: 154 },
  { name: 'YELLOW DRAGON', kind: 13, room: 79 },
  { name: 'PURPLE SCISSORS', kind: 14, room: 445 },
];
