import { enemyRecords, ROOM_COUNT } from '../../montyotr/src/data';
const perType = new Map<number, Set<number>>();
let slots = 0, roomsWith = 0, typesPerRoom = 0;
for (let id = 0; id < ROOM_COUNT; id++) {
  const rec = enemyRecords(id);
  const types = new Set<number>();
  for (let i = 0; i + 6 < rec.length && rec[i] !== 0xff; i += 7) { types.add(rec[i + 4] ?? 0); slots++; }
  if (types.size) roomsWith++;
  typesPerRoom += types.size;
  for (const t of types) { const s = perType.get(t) ?? new Set<number>(); s.add(id); perType.set(t, s); }
}
const counts = [...perType.values()].map((s) => s.size).sort((a, b) => a - b);
console.log(`rooms ${ROOM_COUNT}, with enemies ${roomsWith}, creature slots ${slots}, distinct types ${perType.size}`);
console.log(`types per room (rooms with enemies): ${(typesPerRoom / roomsWith).toFixed(2)}; rooms per type: ${(roomsWith === 0 ? 0 : [...perType.values()].reduce((a, s) => a + s.size, 0) / perType.size).toFixed(2)}`);
console.log('rooms per type, sorted:', counts.join(' '));
console.log('types in 1 room:', counts.filter((c) => c === 1).length, ' 2:', counts.filter((c) => c === 2).length, ' 3+:', counts.filter((c) => c >= 3).length);
