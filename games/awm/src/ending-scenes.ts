/**
 * A place of the montage and what Monty does there (src/ending.ts plays them; `re/routes.ts` finds the routes).
 */

/** What he does in a place: the thing the route ends in (the search's goal, and what the test checks). */
export type Goal =
  /** Takes an entry of the item list (0-235, the room's own). */
  | { readonly take: number }
  /** Goes through an exit into a room (what he carries is handed over there, if it is wanted). */
  | { readonly enter: number }
  /** Reaches a plane with a ticket in his hands. */
  | { readonly board: true }
  /** Takes the record in Luxembourg: he breakdances to the title tune (the game's walk-in, state $11). */
  | { readonly dance: true }
  /** Walks into Montos with everything delivered: the game's own ending (two figures come to stand beside him). */
  | { readonly ending: true }
  /** Comes within a character of a place on the way (the route finder's steps for a way that goes round). */
  | { readonly near: { readonly x: number; readonly y: number } };

export interface Scene {
  room: number;
  /** Where he comes into the room (his place in the game's pixels, and the way he faces). */
  spot: { readonly x: number; readonly y: number; readonly faceLeft?: boolean };
  /** Entries of the item list already taken (so the room shows what is left of it). */
  taken?: readonly number[];
  /** What is in his hands (item types), in the order of the boxes. */
  carry?: readonly number[];
  /** The progress the game has by then ($405D; $C3 is everything delivered). */
  progress?: number;
  /** What he does, one after another (the last is what the place is for; the finder searches for each in turn). */
  goals: readonly Goal[];
  /** The stick, a logic step (a 25th of a second) a count, as text (games/shared/ending/pilot.ts), found by `re/routes.ts`. */
  route: string;
  /** The key that boards a plane is pressed once the route is over (the flight is chased by the stick for the rest of the place). */
  fly?: boolean;
  /** The row its credits go on (picture pixels), if not the usual one under the room (the flight's sky ends lower). */
  creditRow?: number;
  /** Frames the place is shown at least, if its route is not what it lasts. */
  frames?: number;
  /** Credit lines over this place (upper case, at most 38 letters). */
  credits: readonly string[];
}

/**
 * The montage: Gibraltar where the game begins, then places across Europe, to Montos. The credits are in three parts, as Super
 * Mario World's: the makers, true facts, then the port (shared/native/ending.ts `PORT_CREDITS`, put after the last place's by
 * ending.ts). Sources of every line: re/credits.md. A line is at most 38 letters of the game's lettering (no apostrophes,
 * percent signs or brackets: its font has none).
 */
export const SCENES: readonly Scene[] = [
  {
    // (the game's own start room, with its springs: the shield, then the coins above)
    room: 0x48, spot: { x: 128, y: 104 }, goals: [{ take: 0 }, { take: 1 }],
    route: '>4 J<28 >12 J>12 ^>12 J>12 >5',
    credits: ['A GREMLIN GRAPHICS GAME, 1987', 'WRITTEN BY PETE HARRAP'],
  },
  {
    // (the red cape: in Spain it brings the bulls' heads)
    room: 0x3c, spot: { x: 24, y: 120 }, goals: [{ take: 30 }, { take: 32 }],
    route: 'J>20 ^4 J>20 <4 J>48 >8 <56 J<56 <1',
    credits: ['AND SHAUN HOLLINGWORTH', 'ALSO CREDITED: CHRIS KERRY,', 'COLIN DOOLEY AND GREG HOLMES', 'GRAPHICS: STEVE KERRY, T LLOYD'],
  },
  {
    room: 0x3b, spot: { x: 24, y: 120 }, goals: [{ take: 21 }, { take: 20 }],
    route: '>4 J>20 J12 J<12 >24 J>48 >7',
    credits: ['MUSIC BY ROB HUBBARD', 'AND BEN DAGLISH', 'THE FOURTH MONTY MOLE GAME'],
  },
  {
    // (the beret, France's own item)
    room: 0x09, spot: { x: 40, y: 120 }, goals: [{ take: 53 }, { take: 55 }],
    route: 'J>40 >16 ^16 ^>32 J>44 J<75',
    credits: ['MONTY TRAVELS EUROPE FOR MONEY', 'TO BUY MONTOS, A GREEK ISLAND', 'ITEMS SUIT EACH COUNTRY, LIKE', 'BERETS IN FRANCE'],
  },
  {
    // (the record: he breakdances to the title tune, the game's walk-in, which plays on by itself after the route)
    room: 0x13, spot: { x: 32, y: 96 }, goals: [{ dance: true }],
    route: '^>4 ^4 ^>4 J>12 ^8 ^>16 J>8 >4 J>8 >8 J>40', frames: 760,
    credits: ['A RECORD IN LUXEMBOURG MAKES', 'MONTY BREAKDANCE TO THE TITLE', 'MUSIC. HUBBARD VISITED GREMLIN', 'FOR TWO DAYS TO WORK ON THE', 'TITLE TUNE WITH BEN DAGLISH'],
  },
  {
    room: 0x0c, spot: { x: 112, y: 120 }, goals: [{ take: 115 }, { take: 116 }, { take: 114 }],
    route: '<8 ^4 ^<4 J<12 J>24 ^<4 J<4 <4 >16 <16 v20 J>79',
    credits: ['A CAR DROPS INTO ONE OF TWO', 'PLACES AS HE ENTERS DUSSELDORF', 'HUBBARD ALSO WROTE A DOZEN', 'ANTHEMS FOR THE BORDERS'],
  },
  {
    // (the chef's hat, then the ticket, and to the plane)
    room: 0x00, spot: { x: 40, y: 104 }, goals: [{ take: 131 }, { take: 134 }, { board: true }],
    route: 'J>20 >8 J>12 ^4 >24 J>12 >4 J>16 <4 J<12 <4 J<8 <28 J<12 <8 >54',
    credits: ['A CHEFS HAT IN SWEDEN NODS TO', 'THE SWEDISH CHEF OF THE MUPPETS', 'WINE AND BEER MAKE MONTY DRUNK', 'AUF WIEDERSEHEN IS GERMAN FOR', 'GOODBYE'],
  },
  {
    // (the plane boarded at once, as he stands at it with the ticket: the flight, the other plane chased)
    room: 0x00, spot: { x: 176, y: 104 }, carry: [0], goals: [{ board: true }], fly: true, creditRow: 152,
    route: '', frames: 450,
    credits: ['IN THE SKY HE CHASES A PLANE', 'FLOWN BY AN INTERMOLE AGENT:', 'TOUCHING ITS BACK WITH THE', 'PROPELLER DESTROYS IT (ZZAP!64)'],
  },
  {
    // (a steering wheel handed over in Monaco pays: he comes into the room with it)
    room: 0x2b, spot: { x: 40, y: 120 }, carry: [12], goals: [{ enter: 0x2c }, { take: 79 }],
    route: '>4 J>40 >24 v>4 J>8 v>8 ^<4 J>48 >6',
    credits: ['DROP ITEMS OFF IN THE RIGHT', 'PLACES FOR MONEY: A CAR ENTERED', 'IN A GRAND PRIX (ZZAP!64)', 'CRASH READERS VOTED IT BEST', 'PLATFORM GAME OF THE YEAR'],
  },
  {
    // (everything delivered: into Montos, and the game's own ending, two figures coming to stand beside him)
    room: 0x4b, spot: { x: 40, y: 88 }, progress: 0xc3, goals: [{ ending: true }],
    route: 'v>8 J12 v>16', frames: 600,
    credits: ['YOUR SINCLAIR READERS PUT IT AT', 'NUMBER 57 IN THEIR TOP 100', 'MOLEY CHRISTMAS CAME LATER', 'IN THE SAME YEAR'],
  },
];

/** A creature of the parade: where its frames are recorded (the room and the slot of its record there) and its name. */
export interface Creature { readonly name: string; readonly room: number; readonly slot: number }
export const CAST: readonly Creature[] = [
  { name: 'GREEN MASK', room: 0x00, slot: 3 },
  { name: 'FROG', room: 0x09, slot: 0 },
  { name: 'YELLOW BIRD', room: 0x01, slot: 0 },
  { name: 'WHITE HAT', room: 0x07, slot: 1 },
  { name: 'GREEN SNAKE', room: 0x08, slot: 3 },
  { name: 'CYAN BAT', room: 0x08, slot: 2 },
  { name: 'HORNED HEAD', room: 0x06, slot: 3 },
  { name: 'SANDWICH', room: 0x0a, slot: 0 },
  { name: 'CYAN WHIRL', room: 0x0a, slot: 1 },
  { name: 'PURPLE FACE', room: 0x0b, slot: 0 },
  { name: 'YELLOW FIGURE', room: 0x0c, slot: 0 },
  { name: 'GREEN GRUMP', room: 0x0d, slot: 0 },
  { name: 'YELLOW DINO', room: 0x0e, slot: 0 },
  { name: 'CYAN DRAGON', room: 0x14, slot: 1 },
  { name: 'BROWN BEAR', room: 0x15, slot: 2 },
  { name: 'FOUNTAIN', room: 0x19, slot: 1 },
  { name: 'GREEN DRAGON', room: 0x20, slot: 0 },
  { name: 'EYEBALL', room: 0x32, slot: 2 },
  { name: 'BULL', room: 0x3c, slot: 0 },
  { name: 'WHITE WALKER', room: 0x04, slot: 2 },
];
