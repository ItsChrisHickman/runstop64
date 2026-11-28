/**
 * Do Svidaniya Monty's tests, declared for the change detector (tools/affected.mjs; the shared planner games/shared/monty/test/affected.ts):
 * which tests take `--room`, each region's own tests, the cheap world-wide ones a room change runs whole, and the ones a room change leaves out.
 * A test not named here that imports a region file is run whole by tools/affected.mjs (a new test is never silently left out).
 *
 *   node tools/affected.mjs [base] [--run]        (this file is what it runs: node tools/test.mjs games/montyworld/test/affected.ts <changes.json>)
 */
import { printPlan, type MontyTests, type RegionTests } from '../../shared/monty/test/affected';
import { ROUTES } from './routes-dir';
import { ALL_ROOMS, NAMES, REGION_ROOMS } from './scope';

const T = 'games/montyworld/test';
const bots = (region: string): RegionTests['tests'] => [{ file: `${T}/${region}.ts`, args: ['original'] }, { file: `${T}/${region}.ts`, args: ['enhanced'] }];
/** Each region's own tests: its mechanisms (Moscow's is `mechanisms.ts`), its bot in both modes, its layout test. */
const OWN: Readonly<Record<string, RegionTests['tests']>> = {
  moscow: [{ file: `${T}/mechanisms.ts` }, ...bots('moscow')],
  siberia: [{ file: `${T}/siberia-mechanisms.ts` }, ...bots('siberia')],
  china: [{ file: `${T}/china-mechanisms.ts` }, ...bots('china'), { file: `${T}/china-art.ts` }],
  japan: [{ file: `${T}/japan-mechanisms.ts` }, ...bots('japan')],
  pacific: [{ file: `${T}/pacific-mechanisms.ts` }, ...bots('pacific'), { file: `${T}/pacific-layout.ts` }],
  andes: [{ file: `${T}/andes-mechanisms.ts` }, ...bots('andes'), { file: `${T}/andes-layout.ts` }],
  rio: [{ file: `${T}/rio-mechanisms.ts` }, ...bots('rio'), { file: `${T}/rio-layout.ts` }],
};

export const MONTYWORLD_TESTS: MontyTests = {
  game: 'montyworld',
  names: NAMES,
  grid: ALL_ROOMS.map((r) => ({ id: r.id, col: r.col, row: r.row })),
  // (a region's art and sprite pointers feed the world's shared bank and decoration list, so a change there is not one region's: no extras)
  regions: REGION_ROOMS.map((r) => ({ name: r.name, file: `games/montyworld/src/${r.name}.ts`, extras: [], tests: OWN[r.name] ?? [], route: r.name })),
  routes: ROUTES,
  roomTests: ['joins', 'climbs', 'stands', 'edges', 'creature-contrast', 'backdrop-holes', 'backdrop-edges', 'crushers', 'sprites-front', 'no-bounce'].map((n) => ({ file: `${T}/${n}.ts` })),
  everyRoomChange: ['world', 'text', 'save-migrate', 'walk', 'train'].map((n) => ({ file: `${T}/${n}.ts` })),
  roomFree: ['title', 'costume', 'dither', 'music', 'music-siberia', 'music-china', 'music-japan', 'music-pacific', 'music-andes', 'music-amazon', 'music-rio'].map((n) => `${T}/${n}.ts`),
  slowWide: ['reward', 'japan-fair', 'rio-fair'].map((n) => `${T}/${n}.ts`),
};

printPlan(MONTYWORLD_TESTS);
