import { isMove, RoutePilot, type Move } from '../../shared/ending/pilot';

/**
 * Monty driven by input like a player (games/shared/ending/pilot.ts has the route text and the pilot; a route's step is a
 * frame of the game): the show's scenes carry theirs, found by a search over the game's own frames (`re/routes.ts`).
 */
export { isMove, parseRoute, routeText, stickOf, type Move, type Run } from '../../shared/ending/pilot';
export { RoutePilot as Pilot };

/** Every stick Monty's routes use (the search's actions): the four directions and rest, with the climbs and the jumps. */
export const MOVES: readonly Move[] = ['<', '>', '^', 'v', '.', 'J', 'J<', 'J>', '^>', '^<', 'v>', 'v<'].filter(isMove);
