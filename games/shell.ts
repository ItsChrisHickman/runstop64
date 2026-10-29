import { FixedLoop, Input, PixelRenderer } from 'c64kit';
import * as Loader from './loader';
import * as Saves from './saves';
import { GAMES, type GameInfo, type Program } from './registry';
import { exportSaves, readSaves, watchWrites } from './shared/saves';
import { TouchLayer } from './shared/touch';
import { decideBack, isPlayEntry, PLAY_ENTRY } from './shared/touch/back-guard';

/**
 * The runstop64 shell: one framed C64 screen (with a full-screen button) that
 * runs the loader, then whichever game it loads, in place, like a real load.
 * The panel under the screen shows credits and source for what's running. The
 * gear is the game's pause screen, or (on the directory) the saved games.
 */
/** An element the page must have (games/index.html), of the type the shell uses it as. */
function $<T extends Element>(selector: string, type: new () => T): T {
  const e = document.querySelector(selector);
  if (!(e instanceof type)) throw new Error(`runstop64: the page has no ${type.name} ${selector}`);
  return e;
}

const canvas = $('#screen', HTMLCanvasElement);
const frame = $('#frame', HTMLElement);
const panelTitle = $('#info-title', HTMLElement);
const panelBody = $('#info-body', HTMLElement);
const back = $('#back', HTMLAnchorElement);
// Next to the full-screen button: back to the runstop64 menu from any game (after a
// confirmation saying whether progress is kept), and the game's own options menu.
const menu = $('#menu', HTMLButtonElement);
const settings = $('#settings', HTMLButtonElement);
const leave = $('#leave', HTMLElement);
// (a line in the overlay while progress is not being kept: the browser's storage is full or blocked)
const saveWarning = $('#save-warning', HTMLElement);
watchWrites((ok) => { saveWarning.hidden = ok; });
const leaveText = $('#leave-text', HTMLElement);
let current: GameInfo | null = null;
/** The running game's id (its saves' id), or null on the directory and the saved games. */
let currentId: string | null = null;
const renderer = new PixelRenderer(canvas);
const input = new Input();
const host = { renderer, input, canvas };

let program: Program;

function showInfo(info: GameInfo) {
  panelTitle.textContent = info.title;
  panelBody.innerHTML = info.html;
  document.title = info.title === 'runstop64' ? 'runstop64' : `${info.title} · runstop64`;
}

let launched = false;
async function launch(id: string, push: boolean, replace = false) {
  const entry = GAMES.find((g) => g.id === id);
  if (!entry || launched) return; // (one game per page: going back reloads it)
  launched = true;
  const game = await entry.load();
  program = game.run(host);
  showInfo(game.info);
  current = game.info;
  currentId = id;
  back.hidden = menu.hidden = false;
  if (program.menu) gear('Game options');
  else settings.hidden = true;
  frame.classList.add('playing');
  touch.setGame(program.touch, { pause: !!program.menu, home: true });
  if (push) history.pushState(null, '', `#${id}`);
  if (replace) history.replaceState(null, '', `#${id}`);
  armBackGuard(id);
}

/**
 * The phone's back gesture lands on the entry before the guard and opens the pause screen instead of leaving. Chrome skips,
 * going back, an entry the page was on when it pushed another without the user's activation, so the guard waits for one: a
 * touch only gives it on lifting the finger (pointerup, touchend), a key on keydown; never on a touch's pointerdown or in a popstate.
 */
const ACTIVATING = ['pointerup', 'touchend', 'keydown', 'click'] as const;
let guardArmed = false;
function armBackGuard(id: string) {
  if (guardArmed) return;
  guardArmed = true;
  const push = () => {
    if (navigator.userActivation && !navigator.userActivation.isActive) return; // (not yet: wait for an event that gives it)
    for (const t of ACTIVATING) window.removeEventListener(t, push, true);
    guardArmed = false;
    if (currentId === id && !isPlayEntry(history.state)) history.pushState(PLAY_ENTRY, '', `#${id}`);
  };
  for (const t of ACTIVATING) window.addEventListener(t, push, true);
}

/** The gear: what it does here (a game's options, or the saved games). */
function gear(label: string) {
  settings.hidden = false;
  settings.title = label;
  settings.setAttribute('aria-label', label);
}

function startLoader(skipIntro = false) {
  program = Loader.run(host, { launch: (g) => void launch(g.id, true), saves: () => startSaves(true), skipIntro });
  showInfo(Loader.info);
  current = null;
  back.hidden = menu.hidden = true;
  gear('Saved games');
  touch.setGame(program.touch, { pause: false, home: false });
}

/** The saved games (games/saves.ts): from the directory (F1, its line, the gear), or #saves. */
function startSaves(push: boolean) {
  program = Saves.run(host, {
    back: () => { history.replaceState(null, '', location.pathname); startLoader(true); },
    launch: (g) => void launch(g.id, false, true),
  });
  showInfo(Saves.info);
  current = null;
  back.hidden = menu.hidden = true;
  gear('Back to the directory');
  touch.setGame(program.touch, { pause: false, home: false });
  if (push) history.pushState(null, '', '#saves');
}

// Going back (or editing the hash) restarts cleanly, like pressing RUN/STOP + RESTORE; except in a game, where back (the
// phone's swipe) first opens the pause screen, and only from there leaves (games/shared/touch/back-guard.ts).
window.addEventListener('popstate', (e) => {
  const action = decideBack({ game: currentId, state: e.state, hash: location.hash.slice(1), asking: !leave.hidden, paused: program?.paused?.() ?? false });
  if (action === 'ignore') return;
  // (the guard goes in again on the next tap or key: pushed here, in a popstate, Chrome would skip this entry going back)
  if (action === 'close-ask') { askLeave(false); if (currentId) armBackGuard(currentId); return; }
  if (action === 'pause') {
    program?.menu?.();
    if (program?.paused?.()) { if (currentId) armBackGuard(currentId); return; }
  }
  if (action === 'reload') location.reload();
  else toMenu(e); // (leave: the pause screen was open, or the game can't pause now)
});
function toMenu(e: Event) {
  e.preventDefault();
  history.pushState(null, '', location.pathname);
  location.reload();
}
back.addEventListener('click', toMenu);

function askLeave(open: boolean) {
  leave.hidden = !open;
  if (open) {
    leaveText.textContent = current?.progress ?? 'Progress in this game is not saved.';
    $('#leave-no', HTMLButtonElement).focus();
  } else canvas.focus?.();
}
menu.addEventListener('click', () => askLeave(true));
$('#leave-no', HTMLButtonElement).addEventListener('click', () => askLeave(false));
$('#leave-yes', HTMLButtonElement).addEventListener('click', toMenu);
// While asking, Esc stays, Enter leaves, and no key reaches the game.
window.addEventListener('keydown', (e) => {
  if (leave.hidden) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  if (e.key === 'Escape') askLeave(false);
  if (e.key === 'Enter') toMenu(e);
}, true);
// Touch controls (phones, tablets, or once the screen is touched): see games/shared/touch.
const touch = new TouchLayer({
  stage: frame,
  renderer,
  input,
  onPause: () => program?.menu?.(),
  onHome: () => askLeave(true),
});

settings.addEventListener('click', () => { program?.menu?.(); canvas.focus?.(); });

// Credits and source: a sheet that slides up over the screen. The URL is left
// alone (the hash names the running game).
const sheet = $('#info', HTMLElement);
const moreButton = $('#more', HTMLButtonElement);
const closeButton = $('#close', HTMLButtonElement);
// (its debug line: the running game's saves as a file, shown when it has any)
const exportLine = $('#export', HTMLElement);
const BUILD: unknown = import.meta.env.VITE_BUILD; // (vite.config.ts: when the site was built)
function setSheet(open: boolean) {
  if (open) {
    const saves = currentId === null ? null : readSaves(currentId);
    exportLine.hidden = !saves?.current && !saves?.previous;
  }
  sheet.classList.toggle('open', open);
  sheet.setAttribute('aria-hidden', String(!open));
  if (open) closeButton.focus();
  else moreButton.focus();
}
moreButton.addEventListener('click', () => setSheet(true));

// Debug: the running game's saves as one file, for Chris to send with a bug (games/shared/saves.ts,
// `exportSaves`; AGENTS.md's Tools say how to load one in a test).
$('#export-save', HTMLAnchorElement).addEventListener('click', (e) => {
  e.preventDefault();
  if (currentId === null) return;
  const { name, text } = exportSaves(currentId, typeof BUILD === 'string' ? BUILD : 'dev');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
closeButton.addEventListener('click', () => setSheet(false));
canvas.addEventListener('pointerdown', () => {
  if (sheet.classList.contains('open')) setSheet(false);
});
// On-screen buttons give focus back after a click, so Space and Enter (fire, confirm) never press them.
document.addEventListener('click', (e) => {
  const b = e.target instanceof Element ? e.target.closest('button') : null;
  if (b && !b.closest('#leave') && !b.closest('#info')) b.blur();
});

// Esc closes the sheet, and doesn't also reach the game (where Esc pauses).
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheet.classList.contains('open')) {
    e.stopImmediatePropagation();
    setSheet(false);
  }
}, true);

$('#fullscreen', HTMLButtonElement).addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void frame.requestFullscreen?.();
});

const initial = location.hash.slice(1);
if (GAMES.some((g) => g.id === initial)) void launch(initial, false);
else if (initial === 'saves') startSaves(false);
else startLoader();

new FixedLoop({
  tick() {
    input.poll();
    // the game waits while "back to the menu?" is asked, and on a phone until it's been turned and tapped
    if (leave.hidden && !touch.holding) program?.tick();
  },
  render(alpha) {
    program?.render(alpha);
  },
}, 50).start();
