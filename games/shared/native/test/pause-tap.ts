/**
 * Where a tap lands on the pause screen (PAUSE_TAP in games/shared/native/pause.ts), headless: the option lines run
 * bottom up from y=166, 12 apart, to the right of x=214; a tap on the map, left of them, above the first or below the
 * last is not an option.
 *
 *   node tools/test.mjs games/shared/native/test/pause-tap.ts
 */
import { PAUSE_TAP } from '../pause';
import { check, finish } from '../../test/check';

for (const count of [1, 3, 6]) {
  const lineY = (i: number) => 166 - (count - 1 - i) * 12;
  for (let i = 0; i < count; i++) check(`${count} options: line ${i} is tapped in its middle`, PAUSE_TAP.option(250, lineY(i) + 4, count) === i);
  check(`${count} options: each line takes 12 rows (3 above its text to 8 below)`, Array.from({ length: count }, (_, i) => PAUSE_TAP.option(250, lineY(i) - 3, count) === i && PAUSE_TAP.option(250, lineY(i) + 8, count) === i).every(Boolean));
  check(`${count} options: just above the first and just below the last is no option`, PAUSE_TAP.option(250, lineY(0) - 4, count) === -1 && PAUSE_TAP.option(250, lineY(count - 1) + 9, count) === -1);
  check(`${count} options: the map side (x left of ${PAUSE_TAP.optionsX}) is no option, the option side starts at it`, PAUSE_TAP.option(PAUSE_TAP.optionsX - 1, lineY(0) + 4, count) === -1 && PAUSE_TAP.option(PAUSE_TAP.optionsX, lineY(0) + 4, count) === 0);
}
check('no options: nothing to tap', PAUSE_TAP.option(250, 166, 0) === -1);

finish();
