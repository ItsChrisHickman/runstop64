import { BitmapFont, C64, KIT_GLYPHS, type Host } from 'c64kit';
import { GAMES, type GameEntry } from './registry';
import { deleteSave, readSaves, restorePrevious, type GameSaves, type SaveSlot } from './shared/saves';
import type { TouchLayout } from './shared/touch';

/**
 * The save manager: every game's saves, outside the games, on a screen like the loader's
 * (READY.'s blue, the kit's letters, one line a row, the line picked shown reversed). Reached from
 * the directory (F1, a tap on its SAVED GAMES line) and the shell's gear there.
 *
 * - The list: each game with the date of its save; under it, the picked game's saves (current and
 *   previous: when, and what the game said about its progress then: games/shared/saves.ts).
 * - A game's page: CONTINUE (opens the game on its title, which offers ENTER CONTINUE from this save), RESTORE PREVIOUS (the previous
 *   save and the current one change places: the same again undoes it), DELETE (each save; a page
 *   of its own asks first, NO picked).
 *
 * Keys: up/down pick, Return (or fire) does it, a line's letter does it straight away, Esc goes
 * back. Taps: a tap picks a line, a second tap on it does it; a mouse click does it at once.
 */

/** Touch: up and down pick, OK does it, BACK goes back. */
const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'OK', key: 'Space', size: 'big' }, { label: 'BACK', key: 'Escape' }] };

export const info = {
  title: 'Saved games',
  html: `
    <p>Every game here saves your progress as you play, in this browser, and keeps the save from before
    your last new game too. Here you can see them all: when each was made and how far you'd got.</p>
    <p>Pick a game (arrows and Enter, or tap it twice): CONTINUE opens the game, and its title offers ENTER CONTINUE from the save, RESTORE PREVIOUS
    brings back the save from before the last new game (the two change places, so doing it again undoes it),
    and DELETE removes a save for good (it asks first). Esc goes back to the directory.</p>
  `,
};

/** A line of the screen: text (in a colour), or a choice (with its key, and what it does). */
interface Line { row: number; text: string; colour?: number; key?: string; act?: () => void }
type Page = { kind: 'list' } | { kind: 'game'; game: GameEntry } | { kind: 'confirm'; game: GameEntry; which: 'current' | 'previous' };

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** When a save was made, the C64 way (capitals, 24 hours); `long` with the year. */
export function when(at: number, long = false): string {
  if (!at) return 'UNDATED';
  const d = new Date(at), two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())} ${MONTHS[d.getMonth()]}${long ? ` ${d.getFullYear()}` : ''} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** A save's summary, as lines no wider than `width`: its first part (where) alone, the rest run on. */
function summaryLines(slot: SaveSlot, width: number, max: number): string[] {
  const [first, ...rest] = slot.summary;
  if (first === undefined) return ['NO DETAILS (MADE BEFORE THEY WERE KEPT)'.slice(0, width)];
  const lines = [first.slice(0, width)];
  let line = '';
  for (const part of rest) {
    if (line && line.length + 2 + part.length > width) { lines.push(line); line = ''; }
    line = line ? `${line}  ${part}` : part.slice(0, width);
  }
  if (line) lines.push(line);
  return lines.slice(0, max);
}

interface SavesOptions {
  /** Back to the directory. */
  back(): void;
  /** Open a game (on its title, which offers ENTER CONTINUE from its save). */
  launch(game: GameEntry): void;
}

export function run(host: Host, opts: SavesOptions) {
  const { renderer, input, canvas } = host;
  const font = new BitmapFont().addDrawn(KIT_GLYPHS);
  const BG = C64.Blue, FG = C64.LightBlue, HI = C64.White;
  renderer.border = FG;
  renderer.background = BG;
  renderer.frame = { x: 32, y: 36 };

  let page: Page = { kind: 'list' };
  let picked = 0; // the choice picked on this page
  let listPicked = 0; // (the list's, kept while a game's page is open)
  let saves: Record<string, GameSaves> = {};
  let note = ''; // what was just done, shown for a while
  let noteTicks = 0;
  let left = false;
  const reload = () => { saves = Object.fromEntries(GAMES.map((g) => [g.id, readSaves(g.id)])); };
  reload();

  const go = (to: Page, pick = 0) => { page = to; picked = pick; };
  const say = (text: string) => { note = text; noteTicks = 4 * 50; };
  const leave = (then: () => void) => {
    if (left) return;
    left = true;
    canvas.removeEventListener('pointerdown', onPointer);
    then();
  };

  /** The page's lines (choices among them). */
  function lines(): Line[] {
    const touch = input.touch;
    if (page.kind === 'list') {
      const out: Line[] = [{ row: 1, text: '   **** RUNSTOP64 SAVED GAMES ****' }];
      GAMES.forEach((g, i) => {
        const s = saves[g.id];
        const date = s?.current ? when(s.current.at) : s?.previous ? '(PREVIOUS)' : '';
        out.push({ row: 3 + i, text: `${g.name.padEnd(18)}${date}`, act: () => { listPicked = i; go({ kind: 'game', game: g }); } });
      });
      const g = GAMES[Math.min(listPicked, GAMES.length - 1)], s = saves[g.id];
      let row = 4 + GAMES.length;
      for (const [label, slot] of [['NOW', s?.current ?? null], ['BEFORE', s?.previous ?? null]] as const) {
        if (!slot) continue;
        out.push({ row: row++, text: `${label.padEnd(7)}${when(slot.at, true)}`, colour: HI });
        for (const l of summaryLines(slot, 33, 2)) out.push({ row: row++, text: `       ${l}`, colour: HI });
        row++;
      }
      if (!s?.current && !s?.previous) out.push({ row: row, text: '       NO SAVES YET', colour: HI });
      out.push({ row: 24, text: touch ? 'TAP A GAME TWICE   BACK: DIRECTORY' : 'RETURN: OPEN   ESC: DIRECTORY' });
      return out;
    }
    const g = page.game, s = saves[g.id];
    if (page.kind === 'confirm') {
      const which = page.which, slot = which === 'current' ? s?.current : s?.previous;
      return [
        { row: 6, text: `DELETE THE ${which === 'current' ? 'CURRENT' : 'PREVIOUS'} SAVE OF` },
        { row: 7, text: `${g.name}?`, colour: HI },
        ...(slot ? [{ row: 8, text: `(${when(slot.at, true)})`, colour: HI }] : []),
        { row: 10, text: 'IT CAN\'T BE UNDONE.' },
        { row: 13, text: 'N  NO, KEEP IT', key: 'KeyN', act: () => go({ kind: 'game', game: g }) },
        { row: 14, text: 'Y  YES, DELETE IT', key: 'KeyY', act: () => { deleteSave(g.id, which); reload(); say('DELETED.'); go({ kind: 'game', game: g }); } },
        { row: 24, text: touch ? 'TAP ONE TWICE' : 'RETURN: DO IT   ESC: NO' },
      ];
    }
    const out: Line[] = [{ row: 1, text: g.name }];
    let row = 3;
    for (const [label, slot] of [['CURRENT SAVE', s?.current ?? null], ['PREVIOUS SAVE', s?.previous ?? null]] as const) {
      out.push({ row: row++, text: `${label.padEnd(15)}${slot ? when(slot.at, true) : 'NONE'}` });
      if (slot) for (const l of summaryLines(slot, 38, 3)) out.push({ row: row++, text: `  ${l}`, colour: HI });
      row++;
    }
    row = Math.max(row, 13);
    const choices: Line[] = [];
    if (s?.current) choices.push({ row: 0, text: 'C  CONTINUE', key: 'KeyC', act: () => leave(() => opts.launch(g)) });
    if (s?.previous) choices.push({ row: 0, text: 'R  RESTORE PREVIOUS', key: 'KeyR', act: () => { if (restorePrevious(g.id)) { reload(); say('RESTORED: THE TWO CHANGED PLACES.'); } } });
    if (s?.current) choices.push({ row: 0, text: 'D  DELETE CURRENT', key: 'KeyD', act: () => go({ kind: 'confirm', game: g, which: 'current' }) });
    if (s?.previous) choices.push({ row: 0, text: 'P  DELETE PREVIOUS', key: 'KeyP', act: () => go({ kind: 'confirm', game: g, which: 'previous' }) });
    if (!s?.current) choices.push({ row: 0, text: 'L  LOAD (A NEW GAME)', key: 'KeyL', act: () => leave(() => opts.launch(g)) });
    choices.push({ row: 0, text: 'B  BACK', key: 'KeyB', act: () => back() });
    choices.forEach((c) => { c.row = row++; });
    out.push(...choices);
    if (noteTicks > 0) out.push({ row: 22, text: note, colour: HI });
    out.push({ row: 24, text: touch ? 'TAP ONE TWICE' : 'RETURN: DO IT   ESC: BACK' });
    return out;
  }

  const choices = () => lines().filter((l): l is Line & { act: () => void } => l.act !== undefined);

  function back() {
    if (page.kind === 'confirm') go({ kind: 'game', game: page.game });
    else if (page.kind === 'game') go({ kind: 'list' }, listPicked);
    else leave(opts.back);
  }

  /** The choice on a screen row, if any. */
  const choiceAt = (y: number) => choices().findIndex((c) => c.row === Math.floor(y / 8));

  // A mouse click does a choice at once; taps (the touch layer's points) pick, then do.
  const mouse: { x: number; y: number }[] = [];
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return; // (taps arrive as input.points)
    mouse.push(renderer.toScreen(e.clientX, e.clientY));
  };
  canvas.addEventListener('pointerdown', onPointer);

  function tick() {
    if (left) return;
    if (noteTicks > 0) noteTicks--;
    const list = choices();
    picked = Math.max(0, Math.min(picked, list.length - 1));
    let todo: (() => void) | null = null;
    if (input.pressed.up) picked = (picked + list.length - 1) % list.length;
    if (input.pressed.down) picked = (picked + 1) % list.length;
    for (const code of input.typed) {
      const k = list.find((c) => c.key === code);
      if (k) todo = k.act;
    }
    for (const t of input.points) {
      const i = choiceAt(t.y);
      if (i < 0) continue;
      if (i === picked) todo = list[i].act;
      else picked = i;
    }
    for (const m of mouse.splice(0)) {
      const i = choiceAt(m.y);
      if (i >= 0) { picked = i; todo = list[i].act; }
    }
    if (input.pressed.fire || input.typed.includes('Enter') || input.typed.includes('NumpadEnter')) todo = list[picked]?.act ?? null;
    if (page.kind === 'list') listPicked = Math.max(0, picked);
    if (input.typed.includes('Escape')) todo = back;
    // (the confirm page starts on NO)
    todo?.();
  }

  function draw() {
    const s = renderer.screen;
    s.clear(BG);
    const list = choices();
    for (const l of lines()) {
      const sel = l.act !== undefined && list[picked]?.row === l.row;
      if (sel) s.fillRect(0, l.row * 8, 320, 8, FG);
      font.draw(s, l.text.slice(0, 40), 0, l.row * 8, sel ? BG : l.colour ?? FG);
    }
  }

  return {
    touch: TOUCH,
    /** For tests: the page, the choice picked, the choices' words. */
    get state() { return { page: page.kind, picked, choices: choices().map((c) => c.text), left }; },
    tick() { tick(); if (!left) draw(); },
    render() { renderer.render(); },
    /** The gear: back to the directory. */
    menu() { leave(opts.back); },
  };
}
