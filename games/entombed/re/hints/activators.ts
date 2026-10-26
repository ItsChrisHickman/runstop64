/**
 * What can be done in each of Entombed's chambers: the activators, read from each chamber's
 * code (src/gen/rooms; find.ts points at the bytes that change) and done by playing (solve.ts)
 * to find where. A step is done when its goal bytes have their values; its hint shows while
 * `until` isn't reached and everything in `when` holds (the items it needs, the steps before it).
 *
 * The global flags (kept for the rest of the game; cleared when one starts, at $0A3E):
 *   items: $322E magic whip (chamber 2; whipping needs it), $322F torch (16; lighting it needs
 *   it), $322B knot of Isis (8), $322A bowl of fruit (4), $322C book of the dead (9), $322D small
 *   idol (10; 2 once offered in 15), $3230 the way out (1 once open, from 25; 2 when he's out).
 *   scrolls read: $3235-$323B (scrolls 1-7: chambers 11, 19, 6, 20, 22, 24, 13).
 *   chambers done: $37F9 (14: the ankhs), $37FC (17: the statue pushed, counts to $20), $37FD
 *   (5: jumped on, counts to $29), $37FE (7: the pools), $37FF (12: the cobra).
 * Sprite collisions ($D01E, kept in $3214) are how most are done: Pendragon is sprite 2, his
 * whip sprite 3 ($3228 counts the whip's frames: 3-5 is it out).
 */
export interface Step {
  name: string;
  /** Done when these bytes have these values. */
  goal: [number, number][];
  /** The hint shows until this byte has this value... */
  until: [number, number];
  /** ...and while these hold (what it needs: the steps before it). */
  when?: [number, number][];
  /** Where it is (Pendragon's x, y), to steer the search there. */
  near?: [number, number];
  /** More bytes that tell the search's states apart (a counter on the way to the goal; $D0xx: the VIC-II's). */
  watch?: number[];
  /** Only while he's to be seen (his sprite shown). */
  seen?: boolean;
  /** Where a monster in the way is (a byte, shifted right: roughly), to tell the search's states apart. */
  phase?: [number, number][];
  /**
   * The thing it's done to: the hint is on this sprite (at this place on it, from its corner),
   * following it if it moves; else it's where Pendragon stood when he did it.
   */
  sprite?: [number, number, number];
}
interface Chamber {
  /** Global flags set before going in (the items it needs, from elsewhere): the hints need them too. */
  given?: Record<number, number>;
  steps: Step[];
}

const WHIP = { 0x322e: 1 }, TORCH = { 0x322f: 1 };

export const ACTIVATORS: Record<number, Chamber> = {
  // The way out of the tomb, once 25 has opened it ($3230 = 1; leaving a chamber then, $C072
  // changes floor 1's corridor at this chamber, $1609 = $79, and it scrolls on to the left): the
  // mummy barring the left (sprites 0, 1) is gone, and walking out there ($3212 = $30) wins.
  1: { given: { 0x3230: 1, 0x1609: 0x79 }, steps: [{ name: 'the way out', goal: [[0x3230, 2]], until: [0x3230, 2], near: [48, 140] }] },
  // The magic whip (sprite 7, taken from behind: his y < $50).
  2: { steps: [{ name: 'the magic whip', goal: [[0x322e, 1]], until: [0x322e, 1], near: [160, 78], sprite: [7, 12, 10] }] },
  // Bowl of fruit (sprite 7), once the knot of Isis has freed the mummy (without it, walking
  // there raises the mummy, sprite 5, which throws him back).
  4: { given: { 0x322b: 1 }, steps: [{ name: 'the bowl of fruit', goal: [[0x322a, 1]], until: [0x322a, 1], near: [56, 80], sprite: [7, 12, 21] }] },
  // Jump at the back on the left ($3212 < $4C, y < $5C): each landing moves the stone (sprite 6)
  // a little ($37FD, to $29), opening the way.
  5: { steps: [{ name: 'jump on the stone', goal: [[0x37fd, 0x29]], until: [0x37fd, 0x29], near: [50, 85], watch: [0x37fd] }] },
  // Scroll 3 (sprite 6).
  6: { steps: [{ name: 'scroll 3', goal: [[0x3237, 1]], until: [0x3237, 1], near: [176, 130], sprite: [6, 12, 10] }] },
  // The room of pools (scroll 7: "each in order stand"): left, middle, right, left, middle
  // ($62C6 counts them; out of order is 10, and he's hurt). In the middle one he sinks out of
  // sight ($D015), and is seen again only by the left one (the right one needs him seen: it's
  // his sprite touching its sprite, 5): the hints show only while he's seen.
  7: {
    steps: [
      { name: 'pool 1 (left)', goal: [[0x62c6, 1]], until: [0x37fe, 1], when: [[0x62c6, 0]], near: [90, 95], seen: true },
      { name: 'pool 2 (middle)', goal: [[0x62c6, 2]], until: [0x37fe, 1], when: [[0x62c6, 1]], near: [200, 100], seen: true },
      { name: 'pool 3 (right)', goal: [[0x62c6, 3]], until: [0x37fe, 1], when: [[0x62c6, 2]], near: [261, 156], watch: [0xd015], seen: true },
      { name: 'pool 4 (left)', goal: [[0x62c6, 4]], until: [0x37fe, 1], when: [[0x62c6, 3]], near: [90, 95], watch: [0xd015], seen: true },
      { name: 'pool 5 (middle)', goal: [[0x37fe, 1]], until: [0x37fe, 1], when: [[0x62c6, 4]], near: [200, 100], watch: [0xd015], seen: true },
    ],
  },
  // Scroll 2: "move the pots and ye shalt find the statue with the clue behind". Whip each pot
  // (sprite 1, sprite 7) until it gives ($6291 to $1A, $6292 to $78), and on, until it's moved
  // ($6295 counts them); then the statue goes, and the knot of Isis (sprite 6) is behind it.
  8: {
    given: WHIP,
    steps: [
      { name: 'the right pot', goal: [[0x6291, 0x1a]], until: [0x6291, 0x1a], when: [[0x322b, 0]], near: [230, 160], watch: [0x6291], sprite: [1, 24, 10] },
      { name: 'the left pot', goal: [[0x6292, 0x78]], until: [0x6292, 0x78], when: [[0x322b, 0]], near: [160, 100], watch: [0x6292], sprite: [7, 12, 10] },
      { name: 'the knot of Isis', goal: [[0x322b, 1]], until: [0x322b, 1], when: [[0x6295, 2]], near: [250, 111], sprite: [6, 12, 10] },
    ],
  },
  // With the bowl of fruit, the two creatures (sprites 4, 5) come for it: both at once, and they
  // give the book of the dead.
  9: { given: { 0x322a: 1 }, steps: [{ name: 'the book of the dead', goal: [[0x322c, 1]], until: [0x322c, 1], watch: [0x6435] }] },
  // The small idol (sprite 7, as the whip in 2: the same room).
  10: { steps: [{ name: 'the small idol', goal: [[0x322d, 1]], until: [0x322d, 1], near: [160, 78], sprite: [7, 12, 10] }] },
  // Scroll 1: the bird (sprite 0) drops stones (sprite 1) from a place it picks at random; jump
  // to catch one as it falls ($63BA; caught: $63B4) and carry it to the right ($3212/$3213 = $10D): seven in a visit ($63BB)
  // and the scroll shows. The hint for catching follows the falling stone.
  11: {
    steps: [
      { name: 'catch a stone', goal: [[0x63b4, 1]], until: [0x3235, 1], when: [[0x63b4, 0], [0x63ba, 1]], sprite: [1, 14, 3] },
      { name: 'carry it to the edge', goal: [[0x63b4, 0]], until: [0x3235, 1], when: [[0x63b4, 1]], near: [269, 150] },
    ],
  },
  // The cobra (scroll 4: "it doth fear a book that's dead"): with the book, touch it ($37FF).
  12: { given: { 0x322c: 1 }, steps: [{ name: 'the cobra', goal: [[0x37ff, 1]], until: [0x37ff, 1], near: [125, 84], watch: [0x63e3], sprite: [5, 12, 21] }] },
  // Scroll 7 (sprite 6, from behind: y < $60).
  13: { steps: [{ name: 'scroll 7', goal: [[0x323b, 1]], until: [0x323b, 1], near: [60, 69], phase: [[0x3207, 4]], sprite: [6, 12, 10] }] },
  // The lift down to the stairs and the ankh: whip the ball on the walk (sprite 5) until it
  // drops ($6410 to $18: $640F = 1), and the lift (sprite 7) he's standing on to do it goes down
  // ($6411 = 1, then $640F = 2); down there, the ankh (sprite 6) gives all his ankhs back, once
  // ($37F9).
  14: {
    given: WHIP,
    steps: [
      { name: 'whip the ball', goal: [[0x640f, 1]], until: [0x640f, 1], when: [[0x640f, 0]], near: [72, 80], watch: [0x6410], sprite: [5, 12, 10] },
      { name: 'the ankh', goal: [[0x37f9, 1]], until: [0x37f9, 1], near: [80, 150], sprite: [6, 12, 10] },
    ],
  },
  // Scroll 3: "with your whip a note shall chime": whip the five bells in order (sprites 4, 1,
  // 0, 5, then 6 and 7; $6329 counts them, wrong is $10) and the torch comes down.
  16: {
    given: WHIP,
    steps: [
      { name: 'bell 1', goal: [[0x6329, 1]], until: [0x322f, 1], when: [[0x6329, 0]], near: [83, 106], sprite: [4, 24, 21] },
      { name: 'bell 2', goal: [[0x6329, 2]], until: [0x322f, 1], when: [[0x6329, 1]], near: [232, 150], sprite: [1, 24, 21] },
      { name: 'bell 3', goal: [[0x6329, 3]], until: [0x322f, 1], when: [[0x6329, 2]], near: [112, 150], sprite: [0, 24, 21] },
      { name: 'bell 4', goal: [[0x6329, 4]], until: [0x322f, 1], when: [[0x6329, 3]], near: [277, 106], sprite: [5, 24, 21] },
      { name: 'bell 5', goal: [[0x6329, 5]], until: [0x322f, 1], when: [[0x6329, 4]], near: [200, 100], sprite: [6, 24, 21] },
    ],
  },
  // The statue (sprite 4): whip it from its left until it's moved out of the way ($37FC to $20).
  17: { given: WHIP, steps: [{ name: 'the statue', goal: [[0x37fc, 0x20]], until: [0x37fc, 0x20], near: [170, 110], watch: [0x37fc], sprite: [4, 24, 21] }] },
  // Scroll 2, at the back on the left ($3212 < $9C, y < $62); the room is dark: the torch.
  19: { given: TORCH, steps: [{ name: 'scroll 2', goal: [[0x3236, 2]], until: [0x3236, 2], near: [140, 90] }] },
  // Scroll 4, at the back on the left, past the portcullis.
  20: { steps: [{ name: 'scroll 4', goal: [[0x3238, 4]], until: [0x3238, 4], near: [140, 90], watch: [0x62eb] }] },
  // Scroll 5 (sprite 6, as in 6); dark: the torch.
  22: { given: TORCH, steps: [{ name: 'scroll 5', goal: [[0x3239, 1]], until: [0x3239, 1], near: [176, 130], sprite: [6, 12, 10] }] },
  // Scroll 6 (sprite 6, as in 13); dark: the torch.
  24: { given: TORCH, steps: [{ name: 'scroll 6', goal: [[0x323a, 1]], until: [0x323a, 1], near: [48, 90], sprite: [6, 12, 10] }] },
  // The scroll of Thoth, and the way out: push the ball (sprite 7) along the walk ($6553 to $78),
  // whip it seven times ($6554) and it falls in the river, and the way opens ($3230 = 1).
  25: {
    given: WHIP,
    steps: [
      { name: 'push the ball', goal: [[0x6553, 0x78]], until: [0x6553, 0x78], when: [[0x3230, 0]], near: [140, 103], watch: [0x6553], sprite: [7, 12, 10] },
      { name: 'whip the ball', goal: [[0x6555, 1]], until: [0x3230, 1], when: [[0x6553, 0x78], [0x6555, 0]], watch: [0x6554], sprite: [7, 12, 10] },
    ],
  },
};
