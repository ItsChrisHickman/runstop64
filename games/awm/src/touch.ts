import type { TouchLayout } from '../../shared/touch';

/** The key that boards a plane: the Commodore key in the original, C here (a PC keyboard has no such key). */
export const FLY_KEY = 'KeyC';

/** Touch: Monty walks and climbs (four directions) and jumps (the joystick's fire button); FLY is the key that boards a plane. */
export const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }, { label: 'FLY', key: FLY_KEY, size: 'small' }] };
