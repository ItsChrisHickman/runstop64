import type { TouchLayout } from '../../shared/touch';

/** Touch: FIRE, JUMP and CELL (ENHANCED's buttons; see the notes in main.ts). */
export const TOUCH: TouchLayout = { stick: '8', buttons: [{ label: 'FIRE', key: 'Space', size: 'big', colour: 'red' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'CELL', key: 'KeyC', size: 'small' }] };
