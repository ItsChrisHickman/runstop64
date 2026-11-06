import type { TouchLayout } from '../../shared/touch';

/** The blackwyche touch controls (the front end adds RUN where the game can run). */
export const TOUCH: TouchLayout = { stick: '8', buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'SWORD', key: 'KeyX' }] };
