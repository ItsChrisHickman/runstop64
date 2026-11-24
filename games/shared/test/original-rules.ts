/**
 * The original's own rules, for a test that compares a port's changes with them or replays what was found under them: the
 * changes that are assists turned off in the front end's live record (`fe.assist`), all of them or the ones named. In play
 * nothing turns them off: both modes have them, EASY and HARD differ only in the lives (AGENTS.md). A switch of the mode on
 * the pause screen sets them as play has them again.
 */
export function originalRules(assist: Record<string, boolean>, ids: readonly string[] = Object.keys(assist)): void {
  for (const id of ids) assist[id] = false;
}

/** The store of a page that has HARD chosen for game `id` (the switch as the page remembers it). */
export const hardStore = (id: string): Map<string, string> => new Map([[`${id}.assist`, JSON.stringify({ easy: false })]]);
