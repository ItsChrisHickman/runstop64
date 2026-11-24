import type { NativeRun } from './play-session';
import { must } from './must';
import { check } from './check';

/**
 * EASY's unlimited lives in a translated game with energy, not lives (`vitals.lifeEnds`, shared/native/play.ts): once his death has
 * played out he is back at the start of the room he died in, at full health, playing, with no prompt and no title (a moment's grace,
 * as after any continue); in HARD the same death is the game's end and CONTINUE?. Through the front end, from a session in play
 * (EASY on) that keeps nothing up: `die` ends his energy the game's way (its flag), `room` reads where he is, `full` says his health
 * is full again.
 */
export function checkLifeEnds(game: string, s: { p: NativeRun; tick(n?: number): void }, die: (ram: Uint8Array) => void, room: (ram: Uint8Array) => number, full: (ram: Uint8Array) => boolean) {
  const ram = () => must(s.p.machine, 'the machine').ram;
  for (let n = 0; n < 600 && !(s.p.state.playing && s.p.state.grace === 0 && !s.p.frontEnd.paused); n++) s.tick(); // (past the continue's grace)
  check(`${game}: in play, EASY`, s.p.state.playing && s.p.frontEnd.easy && s.p.state.grace === 0);
  const here = room(ram());
  die(ram());
  let prompt = false, back = false, n = 0;
  for (; n < 4000 && !back; n++) {
    s.tick();
    prompt ||= s.p.state.prompt !== null;
    back = s.p.state.grace > 0 && s.p.state.playing;
  }
  s.tick(5);
  check(`${game}, EASY: the death played out, then back in the room he died in (${room(ram())}, was ${here}) at full health, playing, no prompt (${n} frames)`,
    back && !prompt && s.p.state.prompt === null && room(ram()) === here && full(ram()));
  s.tick(200);
  s.p.frontEnd.toggleEasy();
  check(`${game}: HARD`, !s.p.frontEnd.easy && s.p.frontEnd.assist.lives === false);
  die(ram());
  let over = false;
  for (n = 0; n < 6000 && !over; n++) { s.tick(); over = s.p.state.prompt === 'continue'; }
  check(`${game}, HARD: the same death is the game's end, then CONTINUE? (${n} frames)`, over);
  s.p.frontEnd.toggleEasy();
}
