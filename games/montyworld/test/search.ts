/**
 * Do Svidaniya Monty's recorded searches for its mechanism tests: the shared kit (games/shared/monty/test/proofs.ts) over this game's routes folder,
 * its fingerprints (scope.ts `prints`), its tests' folder, and its regions (a no-way's fingerprint holds every room of each region it went into).
 */
import { proofsIn } from '../../shared/monty/test/proofs';
import { ROUTES } from './routes-dir';
import { prints, REGION_ROOMS } from './scope';

const REGION_OF = new Map<number, readonly number[]>();
for (const r of REGION_ROOMS) { const ids = r.specs.map((s) => s.id); for (const id of ids) REGION_OF.set(id, ids); }

export const search = proofsIn(ROUTES, { prints, testFile: (name) => `games/montyworld/test/${name}.ts`, regionOf: (room) => REGION_OF.get(room) ?? [room] });
