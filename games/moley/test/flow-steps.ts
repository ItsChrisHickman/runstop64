/**
 * The flow (src/flow.ts) and its screens (src/screens.ts) on their own, no original needed (test/flow.ts compares them with it): the
 * scrollers' text goes round and a character comes every 8th frame, a jump key starts a game only once the credits page has finished
 * looking for a joystick, GAME OVER lasts 100 frames and its colours go round, the Christmas card waits for the keys to be let go and
 * then for one, the high score and the one `Game` carry over from game to game, and the same seed and the same keys give the same
 * pictures.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/flow-steps.ts
 */
import { PixelRenderer } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { GAME_OVER_TEXT, GLYPHS, CREDITS_TEXT, ENDING_TEXT } from '../src/data';
import { cellOffset, pixelsOf } from '../src/display';
import { CARD_FRAMES, CREDITS_FRAMES, ENDING_WAIT_FRAMES, type FlowInput, type FlowStep, MoleyFlow, OVER_ENTRY_FRAMES, START_FRAMES } from '../src/flow';
import { Key } from '../src/monty';
import { type Random, SeededRandom } from '../src/random';
import { cardScreen, creditsScreen, CREDITS_ROW, OVER_COLUMN, OVER_FRAMES, OVER_ROW, Scroller, Screen } from '../src/screens';
import { BORDER, centre, MoleyView, SURFACE_HEIGHT, SURFACE_WIDTH } from '../src/view';

const NONE: FlowInput = { keys: 0, any: false };
const JUMP: FlowInput = { keys: Key.jump, any: true };
const ANY: FlowInput = { keys: 0, any: true };

/** Random numbers that count how many were asked for. */
class Counting implements Random {
  asked = 0;
  constructor(private readonly inner: Random) {}
  byte(): number { this.asked++; return this.inner.byte(); }
}

const glyph = (char: string): Uint8Array => {
  const g = GLYPHS.get(char.charCodeAt(0));
  if (g === undefined) throw new Error(`no glyph for ${char}`);
  return g;
};
/** The 8 lines of the cell (`row`, `column`) of a bitmap in the ULA's layout. */
const cell = (bits: Uint8Array, row: number, column: number): number[] => Array.from({ length: 8 }, (_, line) => bits[cellOffset(row * 32 + column) + (line << 8)]);
const shotOf = (step: FlowStep): { bits: Uint8Array; attrs: Uint8Array } => {
  if (step.shot === null) throw new Error('a step with no picture');
  return step.shot;
};

/** A flow brought to the first scroll step of the credits page, with the first steps taken. */
function atCredits(seed = 1): { flow: MoleyFlow; first: FlowStep } {
  const flow = new MoleyFlow(new SeededRandom(seed));
  return { flow, first: flow.step(NONE) };
}

// ---- the credits page ------------------------------------------------------------------------------------------------
{
  const { flow, first } = atCredits();
  const credits = creditsScreen();
  check(`the credits page first holds its picture for ${CREDITS_FRAMES} frames (the unpacking and the wait for a joystick)`, first.phase === 'credits' && first.frames === CREDITS_FRAMES && first.redraw && first.shot !== null);
  check('the picture is the unpacked Gremlin picture, its last three attributes black', shotOf(first).bits.every((v, i) => v === credits.bits[i]) && shotOf(first).attrs.every((v, i) => v === credits.attrs[i]) && [0x2fd, 0x2fe, 0x2ff].every((i) => credits.attrs[i] === 0));
  const one = flow.step(NONE);
  check('then the scroller runs a frame at a time', one.phase === 'credits' && one.frames === 1 && !one.redraw);
  const letter = glyph(CREDITS_TEXT[0]);
  check('the first scroll step puts the text\'s first character at the right edge, not yet shifted', cell(shotOf(one).bits, CREDITS_ROW, 31).every((v, i) => v === letter[i]));
  const two = flow.step(NONE);
  check('the next step shifts the row one pixel left', cell(shotOf(two).bits, CREDITS_ROW, 31).every((v, i) => v === ((letter[i] << 1) & 0xff)) && cell(shotOf(two).bits, CREDITS_ROW, 30).every((v, i) => v === (letter[i] >> 7)));
  let last = two;
  for (let i = 0; i < 7; i++) last = flow.step(NONE);
  const second = glyph(CREDITS_TEXT[1]);
  check('8 frames later the first character has gone a whole cell along and the second is at the edge', cell(shotOf(last).bits, CREDITS_ROW, 30).every((v, i) => v === letter[i]) && cell(shotOf(last).bits, CREDITS_ROW, 31).every((v, i) => v === second[i]));
}

// ---- a scroller's text goes round -------------------------------------------------------------------------------------------
for (const [name, text, row] of [['credits', CREDITS_TEXT, 23], ['card', ENDING_TEXT, 8]] as const) {
  const screen = new Screen();
  const scroller = new Scroller(text, row);
  let ok = true, drawn = 0;
  for (let frame = 0; frame < text.length * 8 * 2 + 8; frame++) {
    scroller.shift(screen);
    scroller.feed(screen);
    if (frame % 8 !== 0) continue;
    const want = glyph(text[drawn % text.length]);
    if (!cell(screen.bits, row, 31).every((v, i) => v === want[i])) ok = false;
    drawn++;
  }
  check(`the ${name} scroller draws one character every 8th frame and goes round the ${text.length} characters of its text (${drawn} drawn)`, ok && drawn > text.length * 2);
}

// ---- the jump key and the wait ----------------------------------------------------------------------------------------------
{
  const { flow } = atCredits();
  const start = flow.step(JUMP);
  check('a jump key held through the wait starts a game at the first frame the page reads it', start.phase === 'play' && start.frames === START_FRAMES && start.redraw && start.shot !== null);
  const pass = flow.step(NONE);
  check('the first pass follows after the 10 frames of starting, the display as it is, 2 frames', pass.phase === 'play' && pass.shot === null && pass.fresh && pass.frames === 2);
  check('a new game: 5 lives, room 0, no score', flow.game.lives === 5 && flow.game.room === 0 && flow.game.score === 0);
}
{
  const { flow } = atCredits();
  for (let i = 0; i < 20; i++) {
    const s = flow.step({ keys: Key.right, any: true });
    if (s.phase === 'play') break;
  }
  check('Z, X, O and K do not start a game (only the jump key does)', flow.phase === 'credits');
}

// ---- GAME OVER ----------------------------------------------------------------------------------------------------------------
{
  const { flow } = atCredits();
  flow.step(JUMP);
  for (let i = 0; i < 30; i++) flow.step({ keys: Key.right, any: true });
  flow.game.lives = -1; // (the last life is gone: the next pass is the one in which the game is over)
  const entry = flow.step(NONE);
  check(`the room is entered again (${OVER_ENTRY_FRAMES} frames) and GAME OVER follows`, entry.phase === 'over' && entry.frames === OVER_ENTRY_FRAMES && entry.redraw);
  let ok = true, frames = 0, steps = 0;
  const text: string[] = [];
  for (let i = 0; i < OVER_FRAMES; i++) {
    const s = flow.step(JUMP);
    steps++;
    frames += s.frames;
    const attr = shotOf(s).attrs[OVER_ROW * 32 + OVER_COLUMN];
    if (s.phase !== 'over' || s.frames !== 1 || attr !== (0x10 | (i & 7))) ok = false;
    text.push(...GAME_OVER_TEXT.split('').map((c, k) => (cell(shotOf(s).bits, OVER_ROW, OVER_COLUMN + k).every((v, line) => v === glyph(c)[line]) ? c : '?')));
  }
  check(`GAME OVER lasts ${OVER_FRAMES} frames, a frame a step, in paper red with the ink going round the 8 colours (${steps} steps, ${frames} frames)`, ok && frames === OVER_FRAMES);
  check('it reads GAME OVER !!', text.slice(0, GAME_OVER_TEXT.length).join('') === GAME_OVER_TEXT && !text.includes('?'));
  const back = flow.step(JUMP);
  check('then the credits page, which does not read the keys at once', back.phase === 'credits' && back.frames === CREDITS_FRAMES && back.redraw && back.before === null);
  check('and a jump key held all the while starts a game when the text starts', flow.step(JUMP).phase === 'play');
}

// ---- the Christmas card ---------------------------------------------------------------------------------------------------------
{
  const rng = new Counting(new SeededRandom(3));
  const flow = new MoleyFlow(rng);
  flow.step(NONE);
  flow.step(JUMP);
  for (let i = 0; i < 5; i++) flow.step(NONE);
  flow.game.score = 1234;
  flow.game.finish(); // (the last delivery is made in the next pass)
  const wait = flow.step(NONE);
  check(`the last delivery draws once more, adds its points and waits (${ENDING_WAIT_FRAMES} frames)`, wait.phase === 'play' && wait.shot === null && wait.frames === ENDING_WAIT_FRAMES);
  const card = flow.step(NONE);
  const wanted = cardScreen();
  check(`then the card: room 6 on a cleared screen (${CARD_FRAMES} frames)`, card.phase === 'ending' && card.frames === CARD_FRAMES && card.redraw && shotOf(card).bits.every((v, i) => v === wanted.bits[i]));
  const before = rng.asked;
  const held = flow.step(ANY);
  check('a key held from the game waits: the card stays as it is and nothing twinkles', held.phase === 'ending' && held.frames === 1 && rng.asked === before && shotOf(held).bits.every((v, i) => v === wanted.bits[i]));
  const run = flow.step(NONE);
  const c = glyph(ENDING_TEXT[0]);
  check('the keys are up: the scroller starts with its first character at the right edge of row 8', cell(shotOf(run).bits, 8, 31).every((v, i) => v === c[i]) && rng.asked === before);
  const next = flow.step(NONE);
  check('then each frame shifts the row and twinkles 7 cells (7 random bytes)', rng.asked === before + 7 && cell(shotOf(next).bits, 8, 31).every((v, i) => v === ((c[i] << 1) & 0xff)));
  check('the cell the text comes out of is black (`$591F`)', shotOf(next).attrs[8 * 32 + 31] === 0 && [0x1cf, 0x20f, 0x22e, 0x26f, 0x270, 0x28e, 0x2b1].every((i) => (shotOf(next).attrs[i] & 0x40) !== 0));
  const home = flow.step(ANY);
  check('any key takes it back to the credits page, which shows the old screen\'s last picture as what it draws over', home.phase === 'credits' && home.frames === CREDITS_FRAMES && home.redraw && home.before !== null);
  flow.step(JUMP);
  check('the high score is the first game\'s score once a second game starts', flow.highScore === 1234 && flow.game.score === 0 && flow.game.lives === 5);
}

// ---- the same game twice ------------------------------------------------------------------------------------------------------
{
  const play = (): string[] => {
    const flow = new MoleyFlow(new SeededRandom(9));
    const out: string[] = [];
    flow.step(NONE);
    const keys = [JUMP, ...Array.from({ length: 120 }, (_, i) => ({ keys: i % 40 < 30 ? Key.right : Key.jump | Key.right, any: true }))];
    keys.forEach((k, i) => {
      if (i === 90) flow.game.lives = -1;
      const s = flow.step(k);
      out.push(`${s.phase} ${s.frames} ${s.shot === null ? 'live' : s.shot.bits.reduce((a, v) => (a * 31 + v) >>> 0, 7)}`);
    });
    return out;
  };
  const a = play(), b = play();
  check(`the same seed and the same keys give the same pictures (${a.length} steps)`, a.length === b.length && a.every((v, i) => v === b[i]));
  check('every step lasts at least a frame', play().every((s) => Number(s.split(' ')[1]) >= 1));
}

// ---- on the renderer -----------------------------------------------------------------------------------------------------------
{
  const { flow, first } = atCredits();
  const renderer = new PixelRenderer();
  const view = new MoleyView(renderer, flow.display, 'enhanced');
  view.present(first, 0);
  const want = centre(pixelsOf(shotOf(first).bits, shotOf(first).attrs, new Uint8Array(256 * 192), false), BORDER, new Uint8Array(SURFACE_WIDTH * SURFACE_HEIGHT));
  check('the view shows a held picture centred on the Spectrum\'s black border, and no sprite', renderer.screen.pixels.every((v, i) => v === want[i]) && renderer.sprites.every((s) => !s.visible));
  flow.step(JUMP);
  const pass = flow.step({ keys: Key.right, any: true });
  view.present(pass, 0);
  view.render(0);
  check('a pass shows the display with its sprites on the renderer in ENHANCED', pass.shot === null && renderer.sprites.some((s) => s.visible));
}
finish();
