import { jumpArc } from '../../montyotr/src/data';
const a = [...jumpArc];
console.log(a.join(','));
let up = 0, i = 1;
for (; a[i] !== 0xff && i < a.length; i++) up += a[i] ?? 0;
console.log('ascent px', up, 'frames', i);
