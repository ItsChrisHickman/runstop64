import { measure, pointAt } from '../../montyotr/src/dragons';
import { pixelX, pixelY } from '../../montyotr/src/cells';
import type { DragonSpec } from '../../montyotr/src/montydata';
import { DRAGON } from '../src/china';

/** The share of start phases from which a walk along the street (a pixel a frame) from cell 13 to cell 31 is untouched. */
function clearShare(path: DragonSpec['path'], gap: number, pieces: number, speed = 1): { share: number; lap: number; pattern: string } {
  const p = measure(path);
  const lap = Math.ceil(p.length / speed);
  let clear = 0, n = 0, pattern = '';
  for (let wait = 0; wait < lap; wait += 8) {
    let hit = false;
    for (let f = 0; f < 150 && !hit; f++) {
      const t = wait + f;
      const mx = pixelX(13) + f; // his sprite x (2 * x2) walks 1 px a frame
      const my = pixelY(15); // his top
      for (let i = 0; i < pieces; i++) {
        const [x, y] = pointAt(p, t * speed - i * gap);
        if (mx + 14 > x + 4 && x + 20 > mx + 2 && my + 16 > y + 4 && y + 17 > my) { hit = true; break; }
      }
    }
    n++;
    if (!hit) clear++;
    pattern += hit ? '#' : '.';
  }
  return { share: clear / n, lap, pattern };
}

const variants: [string, DragonSpec['path'], number, number][] = [
  ['current', DRAGON.path, DRAGON.gap, 6],
  ['current gap 18', DRAGON.path, 18, 6],
  ['current gap 16', DRAGON.path, 16, 6],
  ['shallow dip', [[13, 2.5], [19, 1.5], [25, 2.5], [27.5, 7], [27, 12.2], [24, 13.6], [20, 12.4], [17.5, 8.5], [15, 4.5]], 18, 6],
  ['wide loop', [[12, 2.5], [18, 1.5], [24, 3], [27.5, 7], [27, 12.5], [23, 14.2], [19, 12.8], [15.5, 8], [13, 4.5]], 18, 6],
  ['tall loop', [[13, 1.5], [19, 1], [25, 2], [27.5, 5], [27.5, 10], [25, 13.8], [21, 13.8], [19, 9], [16, 3.5]], 18, 6],
];
for (const [name, path, gap, pieces] of variants) {
  const r = clearShare(path, gap, pieces);
  console.log(name.padEnd(16), `lap ${r.lap}`, `clear ${(r.share * 100).toFixed(0)}%`, r.pattern);
}
