import { Scroller } from '../src/scroller';
import { Title } from '../src/title';
/**
 * The rebuild's title captures, in the shape title-cap.ts prints the original's, for looking at them side by side.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/title-dump.ts count [lead]
 */
const [countArg = '5', leadArg] = process.argv.slice(2);
const title = new Title(new Scroller(), 0, undefined, leadArg === undefined ? undefined : Number(leadArg));
for (let i = 0; i < Number(countArg); i++) {
  title.frame({ fire: false, f1: false, f7: false });
  console.log(`--- frame ${i}`);
  for (const s of title.capture.sprites) {
    if (s.y > 200) continue;
    const d = Array.from(s.data.subarray(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
    console.log(`sprite ${s.n} x${s.x} y${s.y} col${s.colour} data ${d}`);
  }
}
