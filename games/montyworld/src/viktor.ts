import type { CameoSpec, PursuerSpec, RoomBlocks } from '../../montyotr/src/montydata';
import { creatureBlocks } from '../../montyotr/src/cameos';
import { AND } from './andes';
import { VIKTOR_CAMEO, VIKTOR_INK, VIKTOR_SHADOW, VIKTOR_SPLIT } from './art/viktor';
import { CHI } from './china';
import { JP } from './japan';
import { ROOM } from './moscow';
import { PAC } from './pacific';
import { RIO_ROOM } from './rio';
import { SPLIT_POINTERS } from './rio-pointers';
import { SIB } from './siberia';
import { CAR } from './train';

/**
 * Viktor Vole round the world (docs/dosvidaniya-reset.md, "Viktor Vole"): every border Monty crosses he arrives at a moment too late, runs on at the edge Monty came by after him, is stopped short at a brink
 * and shakes his fist (a cameo, one line each); in Japan's THE LAST MOLE, once Monty has the hood, his shadow crosses the moon, stops and turns to look, and moves on (the hood has fooled him); on the train's roof and the cargo ship he
 * follows Monty on his trail (a pursuer: swept off the roof by the mountain as Monty shelters, led under the crane's swinging crate; his stepping in where Monty came in and his knock both flash the
 * room's name with a sting, and the tune turns to Monty on the Run's own while he is in sight: `announce`, `music.chase`); and in the Sambadrome, SPY VERSUS MOLE, the showdown (rio.ts `pursuerOf`). His pictures are art/viktor.ts.
 */

/** A cameo's eight pictures go in a creature slot the room has free (its blocks: $30 + 8 a slot), on that slot's sprite, or in blocks of `first` on `sprite`. */
interface Place { room: number; sprite: number; first: number }
const slot = (room: number, n: number): Place => ({ room, sprite: 4 + n, first: 0x30 + n * 8 });

/** The rooms each cameo plays in, with its sprite and pictures' blocks. */
const PLACES = {
  station: slot(ROOM.station, 2), // Moscow's platform (two creatures)
  wall: slot(CHI.wall, 2), // China's first room (two)
  harbour: { room: JP.harbour, sprite: 1, first: 0x48 }, // Japan's first (three creatures: sprite 1, which its one find leaves free, and the unused fourth slot's blocks)
  moon: { room: JP.mole, sprite: 1, first: 0x48 }, // THE LAST MOLE (three creatures: the same)
  arms: slot(RIO_ROOM.arms, 2), // OPEN ARMS (two creatures: the vulture, the marmoset; sprite 1 is the guarana, its second find, which the cameo once drew over)
} as const satisfies Record<string, Place>;

/**
 * A cameo at a border, a chase stopped short (Chris, 2026-11-26: "he is trying to chase Monty and can't reach him yet... not that he is running away from him"): he runs on from off the edge Monty came in
 * by (`side`) toward him, is stopped at the brink of what he cannot cross (`brink`: the column he stops at and the floor row he runs on), shakes his fist after Monty and stays there, looking after him, until
 * Monty has gone. Never beside Monty, never back the way he came.
 */
const border = (p: Place, from: number, side: 'left' | 'right', brink: { col: number; row: number }, when: CameoSpec['when'], wait = 30): CameoSpec => ({
  room: p.room, from: [from], when, wait, sprite: p.sprite, first: p.first, colour: VIKTOR_INK,
  move: { from: side === 'left' ? -3 : 33, at: brink, pose: 'fist', hold: 90, clear: BORDER_CLEAR },
});

/**
 * How far (in cells, the larger of across and down) Viktor stays from Monty all through a border cameo. The test of a cameo (Chris on OPEN ARMS, 2026-11-24: "I was practically touching him. Then he ran
 * away... he could have just got me"): if he is ever near enough that he could have caught Monty, it is wrong. He is clearly too late and stopped short, out of reach.
 */
export const BORDER_CLEAR = 10;

/** The cameos, given the find that keeps the moon's shadow to once and the hood's find. */
export const viktorCameos = (moonSeen: number, hood: number): readonly CameoSpec[] => [
  // Moscow to Siberia: he drops in through the Kremlin's gorge onto the platform; Viktor runs out onto the Kremlin's tower top above, is stopped at its brink by the drop, and shakes his fist down after him
  border(PLACES.station, ROOM.kremlin, 'left', { col: 0, row: 2 }, { col0: 0, row0: 0, col1: 31, row1: 10 }, 20),
  // The other three: he comes on at the edge Monty came in by only once Monty is well away from it (the box is the near side of the room: the cameo starts as Monty leaves it), running after him, and is
  // stopped short at a brink between them, clearly too late: never near enough that he could have caught him (viktor.ts's test holds every border cameo at least BORDER_CLEAR cells from Monty all
  // through, from where Monty is when it starts, and has him only ever run toward Monty and stay).
  // Siberia to China: Monty is into the tunnel under the Great Wall (column 16 on) as Viktor runs out along the border post's top behind him and is stopped by its drop to the road
  border(PLACES.wall, SIB.border, 'left', { col: 0, row: 3 }, { col0: 0, row0: 0, col1: 15, row1: 19 }, 10),
  // China to Japan: Monty is across the inlet and up the market's stair of crates (column 20 on) as Viktor runs along the junk's deck after him and is stopped by the inlet's water at its end
  border(PLACES.harbour, CHI.junk, 'left', { col: 8, row: 17 }, { col0: 0, row0: 0, col1: 19, row1: 19 }, 10),
  // the Andes to Rio: Monty is past the Redeemer, at the east ladder or under the east arm (column 21 on), as Viktor runs out along the kapok's branch after him and is stopped at its tip, over the drop
  border(PLACES.arms, AND.kapok, 'left', { col: 6, row: 8 }, { col0: 0, row0: 0, col1: 20, row1: 19 }, 10),
  // Japan, THE LAST MOLE: the hood taken, his shadow (black: seen only against the moon) walks on from the east, stops on the moon and turns to Monty for a long beat, and moves on west
  {
    room: PLACES.moon.room, when: { col0: 0, row0: 0, col1: 31, row1: 19 }, after: hood, once: moonSeen, wait: 40, sprite: PLACES.moon.sprite, first: PLACES.moon.first, colour: 0,
    move: { from: 26.5, at: { col: 20.5, row: 4.5 }, to: 14.5, pose: 'look', hold: 150 }, // (the moon is cols 20-22, rows 2-4: he is in the middle of it)
  },
];

/** The pictures the cameos and the showdown's split want in their rooms while those are loaded. */
export const VIKTOR_BLOCKS: readonly RoomBlocks[] = [
  ...[PLACES.station, PLACES.wall, PLACES.harbour, PLACES.arms].map((p): RoomBlocks => ({ rooms: [p.room], blocks: creatureBlocks(VIKTOR_CAMEO).map((block, i) => ({ ptr: p.first + i, block })) })),
  { rooms: [PLACES.moon.room], blocks: creatureBlocks(VIKTOR_SHADOW).map((block, i) => ({ ptr: PLACES.moon.first + i, block })) },
  { rooms: [RIO_ROOM.drum], blocks: VIKTOR_SPLIT.map((block, i) => ({ ptr: SPLIT_POINTERS[i] ?? 0, block })) },
];

/**
 * The train (Siberia's sleeper, early on): Viktor drops onto the carriage roof behind Monty from the dining car's (the room's third creature, slot 2: sprite 6) and walks his path `TRAIN_CHASE.delay`
 * frames behind, from when Monty is up on the roof past its west end (a trigger zone on the roof's rows: standing in the carriage's lower lane, at the inspector, never wakes him). The mountain comes from the east soon after Monty comes onto the roof; Monty shelters in the luggage closet under its hatch
 * as it goes over, and Viktor, still on the roof behind him (however soon Monty is down the hatch), is swept off it (`knockedBy.tunnels`). Escaped, he is gone from the train (`escaped`, kept in a save).
 */
export const TRAIN_CHASE = { delay: 150 } as const;
export const trainPursuer = (escaped: number): PursuerSpec => ({
  room: SIB.sleeper, slot: 2, delay: TRAIN_CHASE.delay, wake: { col0: 2, row0: 0, col1: 31, row1: CAR.roof - 1 }, until: escaped, knockedBy: { tunnels: true }, announce: true,
});

/**
 * The cargo ship (the Pacific's first room, about halfway round): Viktor came aboard by the gangway behind him (the ship's third creature, slot 2: sprite 6) and walks his path `SHIP_CHASE.delay` frames behind
 * from when Monty leaves the landing. The crane's crate (slot 1) swings down to the deck and up again, 128 frames there and back; he is that far and a half behind, so when Monty ducks under the crate as it
 * rises, it is coming down as Viktor ducks under after him, and it knocks him overboard. Escaped, he is gone from the ship (`escaped`, kept in a save).
 */
export const SHIP_CHASE = { delay: 192 } as const;
export const shipPursuer = (escaped: number): PursuerSpec => ({
  room: PAC.ship, slot: 2, delay: SHIP_CHASE.delay, calm: { col0: 0, row0: 9, col1: 3, row1: 13 }, until: escaped, knockedBy: { creatures: [1] }, announce: true,
});
