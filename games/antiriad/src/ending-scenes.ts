import { fitPart } from './collisions';
import type { Game } from './game';
import { alive, cruise, flyTo, inArmour, ready, shootAt, talX, type Step } from './pilot';
import { V } from './vars';

/**
 * The montage of The Sacred Armour of Antiriad's reward (ending.ts): places of the game, in the order of the quest, each one the
 * game's own engine on a new game of ours with Tal driven by a pilot (pilot.ts) doing there what the place is for. The credits
 * go over them in the empty row between the playfield and the panel (three parts, as Super Mario World's: the makers, true
 * facts, then the port: shared/native/ending.ts `PORT_CREDITS`, put after the last place's by ending.ts). Sources of every
 * line: re/credits.md. A line is at most 38 letters of the C64's own lettering.
 */

/** What a place begins from: a new game (Tal on foot, the panel dark), the armour worn once (the panel lit, Tal on foot, the armour in room $3F), or in it. */
export type Base = 'new' | 'worn' | 'suited';

export interface Scene {
  /** What it is, for the notes and the test's messages. */
  name: string;
  base: Base;
  /** Where Tal comes into it (the game's own travel: on foot as through a teleporter, in the armour flying in), if not the base's room. */
  arrive?: { room: number; x: number; y: number };
  /** What the game has by then (parts found), before he arrives. */
  prepare(g: Game): void;
  /** The input. */
  steps: readonly Step[];
  /** What he does there is done (the test checks it, in the frames the place runs). */
  done(g: Game): boolean;
  /** Frames the place is shown at least. */
  frames: number;
  /** Credit lines over it (upper case, at most 38 letters). */
  credits: readonly string[];
}

const nothing = () => {};
/** The parts of the armour (collisions.ts `fitPart`). */
export const PULSAR = 0, NEGATOR = 1, DISPLACER = 2, MINE = 3;
export const hasPart = (g: Game, part: number) => !!(g.ram[0x067e + part] & 0x80);
/** Per part: bit 7 = to show in the panel (collisions.ts). */
const PART_NEWS = 0x067a;
/** The game as it is after some parts are found some time ago (the panel has told him so). */
const parts = (...which: number[]) => (g: Game) => { for (const p of which) { fitPart(g, p); g.ram[PART_NEWS + p] = 0; } };
/** ... and one just found, the panel yet to say so when he is next in the armour. */
const justFound = (found: number, ...before: number[]) => (g: Game) => { parts(...before)(g); fitPart(g, found); };

/** The armour's room, and where it stands in it (the original's own: $3F, x $80, y $40). */
export const ARMOUR_ROOM = 0x3f;

/** Tal comes to the armour on its ledge, steps in (faces front over it), and it powers up: the first time he wears it. */
const TO_THE_ARMOUR: readonly Step[] = [
  { hold: '.', until: (g) => g.ram[V.room] === ARMOUR_ROOM && ready(g), max: 120 },
  { hold: '>', until: (g) => talX(g) >= 0x7c, max: 100 },
  { hold: '.', frames: 10 },
  { hold: '<', until: (g) => g.ram[V.anim] === 0x88, max: 30 },
  { hold: '.', until: inArmour, max: 200 },
];
const ARMOUR_ARRIVAL = { room: ARMOUR_ROOM, x: 0x50, y: 0x30 };

/** The armour powered up (its panel lit, its energy full). */
export const poweredUp = (g: Game) => inArmour(g) && g.ram[V.suitEnergy] >= 0x1f;

/** ... and powered up (its tune, the panel lighting up). */
const WEARING: readonly Step[] = [...TO_THE_ARMOUR, { hold: '.', until: poweredUp, max: 500 }];

/** Standing still until Tal is on his feet in the stance a crouch needs. */
const standing: Step = { hold: '.', until: (g) => g.ram[V.anim] === 0x84 || g.ram[V.anim] === 0x86, max: 60 };

/** The Implosion Mine set off ($B1, bit 7: hero.ts `powerCentre`). */
const mineSetOff = (g: Game) => !!(g.ram[0xb1] & 0x80);

/**
 * Landing on the pedestal's top (the power centre's, which flashes through seven colours, a frame each, of which only two are
 * floor: the armour lands on it only if it comes down in one of those, else it sinks into it, and takes off and tries again, a
 * little higher each time: test/centre.ts): up, a moment, down, until the mine goes off.
 */
function landing(tries: number): Step[] {
  const steps: Step[] = [];
  for (let t = 0; t < tries; t++) {
    steps.push(
      { hold: '^', until: (g) => mineSetOff(g) || g.ram[0x0201] < 72 - t, max: 40 + t * 3 },
      { hold: '.', until: mineSetOff, max: 9 },
      { hold: 'v', until: (g) => mineSetOff(g) || g.ram[V.anim] === 0xb2, max: 80 },
      { hold: '.', until: mineSetOff, max: 10 },
    );
  }
  return steps;
}

export const SCENES: readonly Scene[] = [
  {
    name: 'the start: Tal runs the jungle, jumps and throws a stone',
    base: 'new', prepare: nothing,
    steps: [
      { hold: '.', until: ready, max: 120 },
      { hold: '>', frames: 60 },
      { hold: '>J', frames: 10 },
      { hold: '>', frames: 60 },
      { hold: 'F', frames: 20 },
    ],
    done: (g) => g.ram[0x0697] > 0, frames: 330,
    credits: ['THE SACRED ARMOUR OF ANTIRIAD', 'PALACE SOFTWARE, LONDON, 1986'],
  },
  {
    name: 'the armour: Tal steps into it and it powers up',
    base: 'new', arrive: ARMOUR_ARRIVAL, prepare: nothing,
    // (and he tries to fly: "GRAVITY PREVENTS TAKEOFF", the game's own message, until the boots are found)
    steps: [...WEARING, { hold: '^', frames: 20 }],
    done: poweredUp, frames: 700,
    credits: ['PROGRAMMING BY STANLEY SCHEMBRI', 'GRAPHICS BY DANIEL MALONE', 'AND STEPHEN ROBERTSON'],
  },
  {
    name: 'the Gravity Displacer: crouch over it to take it',
    base: 'worn', arrive: { room: 0x2b, x: 0x4c, y: 0x30 }, prepare: nothing,
    steps: [
      { hold: '.', until: (g) => g.ram[V.room] === 0x2b && ready(g), max: 120 },
      { hold: '>', until: (g) => talX(g) >= 0x50, max: 100 },
      standing,
      { hold: 'v', until: (g) => hasPart(g, DISPLACER), max: 60 },
      { hold: '.', frames: 20 },
      { hold: '>', frames: 50 },
      { hold: '>J', frames: 10 },
      { hold: '>', frames: 50 },
    ],
    done: (g) => hasPart(g, DISPLACER), frames: 330,
    credits: ['STORY AND COMIC BY DANIEL MALONE', 'MUSIC BY RICHARD JOSEPH'],
  },
  {
    name: 'flight: the armour flies, the boots of the Gravity Displacer fitted',
    base: 'suited', arrive: { room: 0x39, x: 0x48, y: 0x58 }, prepare: justFound(DISPLACER),
    steps: [
      { hold: '.', until: (g) => g.ram[V.room] === 0x39 && ready(g), max: 60 },
      cruise('>', 70, 110),
      cruise('>', 110, 110),
      cruise('>', 64, 110),
      cruise('>', 120, 110),
      cruise('>', 80, 110),
    ],
    done: (g) => g.ram[V.room] >= 0x3c, frames: 560,
    credits: ['RICHARD JOSEPH ALSO SCORED', 'SENSIBLE SOCCER AND CANNON FODDER', 'A 16 PAGE COMIC CAME IN THE BOX'],
  },
  {
    name: 'the Pulsar Beam: fetched from under the guns, then fired',
    base: 'suited', arrive: { room: 0x21, x: 0x50, y: 0x40 }, prepare: parts(DISPLACER),
    steps: [
      { hold: '.', until: (g) => g.ram[V.room] === 0x21 && ready(g), max: 60 },
      flyTo(176, 60, 10, 100),
      flyTo(176, 140, 10, 100),
      flyTo(150, 149, 8, 100),
      { hold: '.', frames: 40 },
      // out of the room to the right, where creatures wait to be shot
      { hold: '>', until: (g) => g.ram[V.room] === 0x22 && ready(g), max: 200 },
      shootAt(6, 200),
      shootAt(5, 200),
    ],
    done: (g) => hasPart(g, PULSAR) && g.ram[V.room] === 0x22 && !alive(g, 6) && !alive(g, 5), frames: 700,
    credits: ['AN EARLY METROIDVANIA, MADE ALONGSIDE', 'METROID WITHOUT KNOWING OF IT', 'PALACE MADE CAULDRON AND BARBARIAN'],
  },
  {
    name: 'the Implosion Mine: out of the armour, crouch over it',
    base: 'worn', arrive: { room: 0x14, x: 0x60, y: 0x30 }, prepare: parts(DISPLACER, PULSAR),
    steps: [
      { hold: '.', until: (g) => g.ram[V.room] === 0x14 && ready(g), max: 120 },
      { hold: '<', until: (g) => talX(g) <= 0x58, max: 100 },
      standing,
      { hold: 'v', until: (g) => hasPart(g, MINE), max: 60 },
      { hold: '.', frames: 20 },
      { hold: '>', frames: 70 },
      { hold: '>J', frames: 10 },
      { hold: '>', frames: 50 },
      { hold: 'F', frames: 30 },
    ],
    done: (g) => hasPart(g, MINE), frames: 330,
    credits: ['ZZAP!64 GAVE ITS GRAPHICS 98 PERCENT', 'AND THE SOUND 91 PERCENT, DEC 1986'],
  },
  {
    name: 'the Particle Negator: flown to through the radiation',
    base: 'suited', arrive: { room: 0x06, x: 0x50, y: 0x40 }, prepare: parts(DISPLACER, PULSAR),
    steps: [
      { hold: '.', until: (g) => g.ram[V.room] === 0x06 && ready(g), max: 60 },
      flyTo(150, 80, 10, 150),
      flyTo(236, 80, 10, 150),
      flyTo(244, 140, 10, 150),
      flyTo(264, 146, 6, 100),
      { hold: '.', frames: 30 },
      { hold: '^', frames: 40 },
      { hold: '<F', frames: 120 },
    ],
    done: (g) => hasPart(g, NEGATOR), frames: 520,
    credits: ['ZZAP!64: A MAP IS ALMOST ESSENTIAL', 'ZZAP!64 PRINTED ONE IN DEC 1986', 'ZZAP!64 SAID OVER 100 LOCATIONS', 'THE GAME HAS 69 SCREENS'],
  },
  {
    name: 'the teleporter: back to the armour',
    base: 'worn', arrive: { room: 0x27, x: 0x68, y: 0x42 }, prepare: parts(DISPLACER, PULSAR),
    steps: [
      { hold: '.', until: (g) => g.ram[V.room] === ARMOUR_ROOM && inArmour(g), max: 500 },
      { hold: '.', frames: 60 },
    ],
    done: (g) => g.ram[V.room] === ARMOUR_ROOM && inArmour(g), frames: 400,
    credits: ['THE TELEPORTER SAYS BEAM ME UP SCOTTY', 'ANTIRIAD COMES FROM ANTI-RADIATION', 'IN THE US EPYX CALLED IT RAD WARRIOR'],
  },
  {
    name: 'the power centre: down on the pedestal with the Implosion Mine',
    base: 'suited', arrive: { room: 0x00, x: 168, y: 64 }, prepare: parts(DISPLACER, PULSAR, NEGATOR, MINE),
    steps: [
      { hold: '.', until: (g) => g.ram[V.room] === 0 && ready(g), max: 120 },
      ...landing(6),
      { hold: '.', frames: 600 },
    ],
    done: (g) => mineSetOff(g), frames: 780,
    // (two slots with no line: the armour comes down and the mine goes off, and the game's ending flashes the screen white for
    // a second and more, which nothing may be typed over; the port's lines follow, over the last message)
    credits: ['', ''],
  },
];

/** How the bases are made (ending.ts `Bases`): the armour worn for the first time. */
export const FIRST_WEARING = { arrive: ARMOUR_ARRIVAL, steps: WEARING };
