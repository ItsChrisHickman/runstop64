import type { TouchLayout } from '../../shared/touch';

/** Touch: the stick walks and climbs (four directions), the one button jumps. */
export const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] };
