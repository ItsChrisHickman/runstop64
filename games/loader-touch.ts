import type { TouchLayout } from './shared/touch';

/** Touch: tap a game (then tap it again), or move the choice with the stick and press LOAD. */
export const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'LOAD', key: 'Space', size: 'big' }] };
