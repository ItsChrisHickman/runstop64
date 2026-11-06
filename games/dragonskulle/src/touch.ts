import type { TouchLayout } from '../../shared/touch';

/** The dragonskulle touch controls: the stick, USE (the action the hand points at), straight to an action (the front end adds RUN). */
export const TOUCH: TouchLayout = {
  stick: '8',
  buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'STONE', key: 'KeyX' }, { label: 'DIG', key: 'KeyC' }, { label: 'CLOAK', key: 'KeyV' }],
};
