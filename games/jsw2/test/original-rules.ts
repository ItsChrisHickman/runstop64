import { hardStore as hardStoreOf, originalRules as off } from '../../shared/test/original-rules';

/**
 * Jet Set Willy II's original rules (games/shared/test/original-rules.ts): its changes that are assists, off. The ones that are
 * no assist (running, the latch) stay on.
 */
export const ORIGINAL_RULES = ['airJump', 'ropes', 'gentle', 'falls', 'hints', 'lives', 'respawn', 'entryGrace'] as const;

export const originalRules = (options: Record<string, boolean>): void => off(options, ORIGINAL_RULES);

/** The store of a page that has HARD chosen. */
export const hardStore = (): Map<string, string> => hardStoreOf('jsw2');
