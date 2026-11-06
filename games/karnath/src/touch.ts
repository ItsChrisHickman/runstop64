import type { TouchLayout } from '../../shared/touch';

/** The karnath touch controls (the front end adds RUN where the game can run). */
export const TOUCH: TouchLayout = { stick: '8', buttons: [{ label: 'CAST', key: 'Space', size: 'big' }, { label: 'SPELL', key: 'Enter' }] };
