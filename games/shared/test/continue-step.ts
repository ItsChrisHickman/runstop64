/**
 * The continue flow's state machine, headless and with no Input (games/shared/continue-step.ts):
 *
 * - `step()` over every state the flow can be in (each screen, title up or not, playing or not,
 *   a save or not, ...) and every intent (keys, fire, taps on each target): it never changes
 *   what it is given, says the same twice, counts its ticks, only resumes from a screen that
 *   offers it (to the open one), and only brings a question up where it should;
 * - the documented moves one by one (the launch onto the title, ENTER CONTINUE, NEW GAME?, CONTINUE?);
 * - `readIntent()`: keys and taps placed on the screens' targets, the targets where the drawing is.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/continue-step.ts
 */
import { Input } from 'c64kit';
import { FLOW_LAYOUT, initialState, NO_INTENT, panelTop, readIntent, step, stripText, type FlowState, type Intent, type Screen, type StepStatus } from '../continue-step';
import { nowhere } from './browser';
import { check, finish } from './check';

// ---- every state and every intent ---------------------------------------------------------------

const SCREENS: Screen[] = [
  { kind: 'open' }, { kind: 'title' }, { kind: 'continue' }, { kind: 'newGame' },
];
const BOOLS = [false, true];
const TICKS = [0, 24, 25, 100];

/** Every state the flow can be in: a question needs a save to offer. */
function* states(): Generator<FlowState> {
  for (const screen of SCREENS) for (const playing of BOOLS) for (const hasSave of BOOLS) for (const over of BOOLS) for (const startOk of BOOLS)
    for (const fireWasDown of BOOLS) for (const newGameOk of BOOLS) for (const titleTicks of TICKS) for (const restartAsked of [0, 1000]) {
      if (screen.kind !== 'open' && !hasSave) continue;
      yield { screen, playing, hasSave, lastRoom: playing ? 7 : -1, rooms: 4, fresh: playing, over, restartAsked, titleTicks, fireWasDown, startOk, newGameOk };
    }
}

const TAPS: Intent['tap'][] = [
  { any: false, strip: false, left: false, right: false },
  { any: true, strip: false, left: false, right: false },
  { any: true, strip: true, left: false, right: false },
  { any: true, strip: false, left: true, right: false },
  { any: true, strip: false, left: false, right: true },
  { any: true, strip: true, left: true, right: false },
];

/** Every intent: a restart key, fire (up, held, just pressed), Enter, Escape, and a tap on each target. */
function* intents(): Generator<Intent> {
  for (const restart of BOOLS) for (const [fire, firePressed] of [[false, false], [true, false], [true, true]]) for (const enter of BOOLS) for (const escape of BOOLS) for (const tap of TAPS)
    yield { restart, fire, firePressed, enter, escape, tap };
}

const STATUSES: StepStatus[] = [
  { onTitle: false }, { onTitle: true },
];

const deepFreeze = <T extends object>(o: T): T => {
  for (const v of Object.values(o)) if (typeof v === 'object' && v !== null) deepFreeze(v);
  return Object.freeze(o);
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isQuestion = (s: Screen) => s.kind === 'continue' || s.kind === 'newGame';
const offers = (s: Screen) => s.kind === 'title' || isQuestion(s);

let runs = 0;
const broken = new Map<string, string>();
const fail = (rule: string, detail: () => string) => { if (!broken.has(rule)) broken.set(rule, detail()); };

for (const prev of states()) {
  deepFreeze(prev);
  for (const intent of intents()) {
    deepFreeze(intent);
    for (const status of STATUSES) {
      runs++;
      const where = () => `${JSON.stringify(prev)} ${JSON.stringify(intent)} ${JSON.stringify(status)}`;
      const r = step(prev, intent, status), again = step(prev, intent, status);
      const { state: s, resume } = r;
      if (!same(r, again)) fail('same twice', where);
      if (s.titleTicks !== (status.onTitle ? prev.titleTicks + 1 : 0)) fail('counts the title being up', where);
      if (s.restartAsked !== (intent.restart ? 1 : prev.restartAsked + 1)) fail('counts since a restart key', where);
      if (s.hasSave !== prev.hasSave || s.rooms !== prev.rooms) fail('leaves the save and the rooms to the flow', where);
      if (s.playing && !prev.playing) fail('never starts play itself', where);
      if (!s.playing && s.lastRoom !== (prev.playing ? -1 : prev.lastRoom)) fail('play ended: no last room', where);
      if (offers(s.screen) && !s.hasSave) fail('a question needs a save', where);
      if (resume !== null) {
        // (a title up a moment with a save offers ENTER CONTINUE and may be answered in the same tick)
        const offered = offers(prev.screen) || (status.onTitle && prev.hasSave && (prev.titleTicks + 1 > 25 || intent.enter));
        if (!offered) fail('resumes only where something is on offer', where);
        if (s.screen.kind !== 'open') fail('after resuming no screen is up', where);
        if (resume === 'continue' && !(prev.screen.kind === 'continue' || prev.over || (prev.playing && status.onTitle))) fail('the continue answer is to CONTINUE? (up, or coming up as play ends)', where);
        if (prev.screen.kind === 'newGame' && resume === 'title' && !intent.enter) fail('NEW GAME? resumes only on Enter', where);
        if (prev.screen.kind === 'title' && resume === 'title' && !(intent.enter || intent.tap.strip)) fail('ENTER CONTINUE resumes on Enter or a tap on the line', where);
      }
      // questions come up where they should
      if (isQuestion(s.screen) && !isQuestion(prev.screen)) {
        if (s.screen.kind === 'newGame' && !(status.onTitle && intent.fire)) fail('NEW GAME? comes up on a press on the title', where);
        if (s.screen.kind === 'continue' && !(status.onTitle && s.restartAsked > 100)) fail('CONTINUE? comes up on the title, not after a restart on purpose', where);
      }
      if (s.screen.kind === 'title' && !(status.onTitle && s.titleTicks > 25)) fail('ENTER CONTINUE shows only once the title has been up a moment', where);
      if (s.newGameOk && !prev.newGameOk && !(prev.screen.kind === 'newGame' && intent.firePressed)) fail('a new game is the player\'s say only by NEW GAME? answered yes', where);
      if (resume !== null && s.newGameOk) fail('carrying on from a save clears the say', where);
      if (s.startOk && !prev.startOk && !(prev.screen.kind === 'newGame' && intent.firePressed)) fail('a press is passed on to the title only by NEW GAME? answered yes', where);
    }
  }
}
for (const [rule, where] of broken) check(`step: ${rule} (${where})`, false);
check(`step: ${runs} combinations of state, intent and status keep the rules`, broken.size === 0);

// ---- the moves, one by one ------------------------------------------------------------------------

const idle = (over: Partial<FlowState> = {}): FlowState => ({ ...initialState(true), titleTicks: 30, ...over });
const title = { onTitle: true }, play = { onTitle: false };
const go = (state: FlowState, intent: Partial<Intent>, status: StepStatus = title) => step(state, { ...NO_INTENT, ...intent }, status);
const kind = (r: { state: FlowState }) => r.state.screen.kind;

check('a new flow starts on the game\'s own title, with or without a save (a launch never goes straight into play)',
  initialState(true).screen.kind === 'open' && initialState(false).screen.kind === 'open');
{
  let st = initialState(true), r = go(st, {});
  for (let i = 0; i < 24; i++) { r = go(st, {}); st = r.state; }
  check('launch: the title up a few ticks offers nothing yet and resumes nothing', kind(r) === 'open' && r.resume === null);
  for (let i = 0; i < 3; i++) { r = go(st, {}); st = r.state; }
  check('launch: the title up a moment offers ENTER CONTINUE, and resumes nothing by itself', kind(r) === 'title' && r.resume === null);
  r = go(st, { enter: true });
  check('launch: Enter on it goes back to the save', r.resume === 'title' && kind(r) === 'open');
}

check('the title up a moment, with a save: ENTER CONTINUE is offered', kind(go(idle({ titleTicks: 25 }), {})) === 'title');
{
  const early = go(idle({ titleTicks: 3 }), { enter: true });
  check('Enter on a title only just up, over a save: continues it (the game\'s title would start a new game on Return)', early.resume === 'title' && kind(early) === 'open');
  const over = go(idle({ playing: true, titleTicks: 0 }), { enter: true });
  check('...and as the last life goes: the CONTINUE? answer', over.resume === 'continue' && !over.state.over && !over.state.playing);
  check('...without a save Enter is left to the game', go(idle({ hasSave: false, titleTicks: 3 }), { enter: true }).resume === null);
  const yes = go(go(idle({ screen: { kind: 'newGame' } }), { fire: true, firePressed: true }).state, { fire: false });
  check('NEW GAME? answered yes: a game that begins after it is the player\'s say, kept after the press is let go', yes.state.newGameOk);
}
check('the title only just up: nothing yet', kind(go(idle({ titleTicks: 10 }), {})) === 'open');
check('without a save: nothing is offered', kind(go(idle({ hasSave: false }), {})) === 'open');
check('ENTER CONTINUE: Enter resumes (answer: title)', go(idle({ screen: { kind: 'title' } }), { enter: true }).resume === 'title');
check('ENTER CONTINUE: a tap on the line resumes', go(idle({ screen: { kind: 'title' } }), { tap: { any: true, strip: true, left: false, right: false } }).resume === 'title');
check('ENTER CONTINUE: a tap elsewhere does not', go(idle({ screen: { kind: 'title' } }), { tap: { any: true, strip: false, left: true, right: false } }).resume === null);
check('the game is not on its title: ENTER CONTINUE goes', kind(go(idle({ screen: { kind: 'title' } }), {}, play)) === 'open');
{
  const r = go(idle({ screen: { kind: 'title' } }), { fire: true, firePressed: true });
  check('Space or fire on the title over a save: NEW GAME? first, the press kept from the game', kind(r) === 'newGame' && r.resume === null && r.state.fireWasDown);
  check('NEW GAME?: fire pressed again says yes: back to the title, which has that press until it is let go', go(r.state, { fire: true, firePressed: true }).state.startOk && kind(go(r.state, { fire: true, firePressed: true })) === 'open');
  check('NEW GAME?: Escape says no', kind(go(r.state, { escape: true })) === 'open' && !go(r.state, { escape: true }).state.startOk);
  check('NEW GAME?: a tap says no', kind(go(r.state, { tap: { any: true, strip: false, left: false, right: true } })) === 'open');
  check('NEW GAME?: Enter continues the save (answer: title)', go(r.state, { enter: true }).resume === 'title');
  check('NEW GAME?: waits for an answer (a held fire is neither)', kind(go(r.state, { fire: true })) === 'newGame');
  const held = go(go(r.state, { fire: true, firePressed: true }).state, { fire: true });
  check('NEW GAME? answered yes, fire still down: no new question (the title is back, its line up)', kind(held) !== 'newGame' && held.state.startOk);
  check('...and let go: the title takes presses again', !go(held.state, {}).state.startOk);
}
{
  const over = go(idle({ playing: true, lastRoom: 5, fresh: true, titleTicks: 0 }), {});
  check('play over (the title is back): the next game is a new one', !over.state.playing && over.state.lastRoom === -1 && !over.state.fresh && over.state.over);
  const later = go(idle({ playing: true, titleTicks: 25 }), {});
  check('...and once the title has been up a moment, CONTINUE? is asked', kind(later) === 'continue' && !later.state.over);
  const early = go(idle({ playing: true, titleTicks: 0 }), {});
  check('...not before', kind(early) === 'open' && early.state.over);
  const restarted = go(idle({ playing: true, titleTicks: 25 }), { restart: true });
  check('after a restart on purpose (R, F1): no CONTINUE?', kind(restarted) !== 'continue' && restarted.state.restartAsked === 1);
  const press = go(early.state, { fire: true, firePressed: true });
  check('a press as the last life goes, before CONTINUE? is up: CONTINUE? and not a new game', kind(press) === 'continue' && !press.state.over);
  const q = idle({ screen: { kind: 'continue' } });
  check('CONTINUE?: Enter yes (answer: continue)', go(q, { enter: true }).resume === 'continue');
  check('CONTINUE?: fire pressed (it was up) yes', go({ ...q, fireWasDown: false }, { fire: true }).resume === 'continue');
  check('CONTINUE?: fire still down from before is not an answer', go(q, { fire: true }).resume === null);
  check('CONTINUE?: a tap on the left half yes', go(q, { tap: { any: true, strip: false, left: true, right: false } }).resume === 'continue');
  check('CONTINUE?: Escape no, and the save stays', kind(go(q, { escape: true })) === 'open' && go(q, { escape: true }).resume === null);
  check('CONTINUE?: a tap on the right half no', kind(go(q, { tap: { any: true, strip: false, left: false, right: true } })) === 'open');
  check('CONTINUE?: waits for its answer however long', kind(go({ ...q, titleTicks: 5000 }, {})) === 'continue');
}

// ---- the taps: keys and fingers read as an intent, the targets where the drawing is -----------------

const input = new Input(nowhere);
const touch = (x: number, y: number) => { input.points.length = 0; input.points.push({ x, y }); return readIntent(input, { y: 172 }, ['KeyR']).tap; };
const L = FLOW_LAYOUT;
{
  input.typed.length = 0; input.typed.push('NumpadEnter', 'KeyR');
  const i = readIntent(input, { y: 172 }, ['F1', 'KeyR']);
  check('readIntent: keys (NumpadEnter is Enter, KeyR a restart)', i.enter && i.restart && !i.escape);
  check('readIntent: restart keys are the game\'s', !readIntent(input, { y: 172 }, []).restart);
  input.typed.length = 0;

  const strip = { y: 172 }, text = stripText(strip, true), left = Math.floor(L.strip.mid - (text.length * L.glyph) / 2);
  check('the title\'s line: a tap on its letters (left half) is on the line', touch(left + 4, strip.y + 3).strip);
  check('...the right half is the new game\'s, not the line', !touch(L.strip.mid + 10, strip.y + 3).strip);
  check('...a little above and below it is still on it, well off it is not', touch(left + 4, strip.y - L.strip.above).strip && touch(left + 4, strip.y + L.strip.below - 1).strip && !touch(left + 4, strip.y - L.strip.above - 1).strip && !touch(left + 4, strip.y + L.strip.below).strip);
  check('CONTINUE?: left half yes, right half no, within the band the panel is drawn in', touch(10, 100).left && !touch(10, 100).right && touch(L.question.split, 100).right && !touch(L.question.split, 100).left);
  check('CONTINUE?: outside the band nothing is answered', !touch(10, L.question.y0 - 1).left && !touch(10, L.question.y1).left && touch(10, L.question.y0).left);
  const lines = 3, top = panelTop(lines);
  check('the CONTINUE? band holds the panel\'s lines (' + `${top}..${top + lines * L.lineStep}` + ')', top >= L.question.y0 && top + lines * L.lineStep <= L.question.y1);
  const short = { y: 150, short: true, x: 100 }, shortText = stripText(short, true);
  input.points.length = 0; input.points.push({ x: 100 + (shortText.length * L.glyph) / 2 + L.strip.pad - 1, y: 150 });
  check('a short line is tapped round its middle, a little beyond its letters', readIntent(input, short, []).tap.strip);
  input.points.length = 0; input.points.push({ x: 100 + (shortText.length * L.glyph) / 2 + L.strip.pad, y: 150 });
  check('...and not beyond that', !readIntent(input, short, []).tap.strip);
  input.points.length = 0;
}

finish();
