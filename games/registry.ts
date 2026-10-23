import type { Host } from 'c64kit';
import type { TouchLayout } from './shared/touch';

/**
 * Every game, once: its place in the directory (name and size as the C64's directory lists them) and how
 * to load it. The loader lists these, the saved-games screen keeps their saves, the shell loads one by its
 * id. A game is its `src/main.ts` (`run`, and the `info` the shell shows; the prose is in `src/info.ts`); a
 * new game gets one entry here, next to its series, and a test checks the entries and the game folders agree
 * (games/shared/test/registry.ts).
 */

/** A game as the directory lists it. */
export interface GameEntry { id: string; name: string; blocks: number }

/** The running game, as the shell drives it. */
export interface Program {
  tick(): void;
  render(alpha: number): void;
  /** Open the game's own options/pause menu (if it has one, and it can open now). */
  menu?(): void;
  /** Its touch controls (games/shared/touch): the stick and buttons it wants on a phone. */
  touch?: TouchLayout;
}

/** What a game says about itself to the shell. */
export interface GameInfo {
  title: string;
  html: string;
  /** Shown when leaving for the menu: whether progress is kept. */
  progress?: string;
}

/** What a game's `src/main.ts` gives. */
export interface GameModule {
  run(host: Host): Program;
  info: GameInfo;
}

export interface RegisteredGame extends GameEntry {
  /** The game's code, fetched when it is wanted (one game per page load). */
  load(): Promise<GameModule>;
}

export const GAMES: readonly RegisteredGame[] = [
  // In series order, like a compilation disk (no headings): the Monty games (Auf Wiedersehen Monty under its disk file's name,
  // the 16 letters a name has; Moley Christmas, the Spectrum-only one, after them), then Gremlin's
  // others (Thing on a Spring), the four Pendragon games in release order,
  // Jet Set Willy II, Starquake, Antiriad. A new game goes next to its series.
  { id: 'montyotr', name: 'MONTY ON THE RUN', blocks: 165, load: () => import('./montyotr/src/main') },
  { id: 'awm', name: 'AUF WIEDERSEHEN', blocks: 172, load: () => import('./awm/src/main') },
  { id: 'moley', name: 'MOLEY CHRISTMAS', blocks: 162, load: () => import('./moley/src/main') },
  { id: 'thingonaspring', name: 'THING ON A SPRING', blocks: 187, load: () => import('./thingonaspring/src/main') },
  { id: 'karnath', name: 'STAFF OF KARNATH', blocks: 117, load: () => import('./karnath/src/main') },
  { id: 'entombed', name: 'ENTOMBED', blocks: 229, load: () => import('./entombed/src/main') },
  { id: 'blackwyche', name: 'BLACKWYCHE', blocks: 161, load: () => import('./blackwyche/src/main') },
  { id: 'dragonskulle', name: 'DRAGONSKULLE', blocks: 195, load: () => import('./dragonskulle/src/main') },
  { id: 'jsw2', name: 'JET SET WILLY II', blocks: 196, load: () => import('./jsw2/src/main') },
  { id: 'starquake', name: 'STARQUAKE', blocks: 179, load: () => import('./starquake/src/main') },
  { id: 'antiriad', name: 'ANTIRIAD', blocks: 184, load: () => import('./antiriad/src/main') },
];
