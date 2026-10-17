import type { Stage } from '../stage';
import type { Stateful } from '../state';

/** A room's script (`$927A` table): run once a pass, after Monty's move. What it keeps between passes it keeps in itself. */
export interface RoomScript extends Stateful {
  run(s: Stage): void;
}
