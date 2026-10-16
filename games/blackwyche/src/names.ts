/**
 * Names for the ship's places on the pause map. The game names none: these are ours, from what
 * each picture shows and what is found there, in ship's terms (the halls with windows taken for
 * the stern, the others the bow). Every place is here by its map id (travel.ts
 * `placeId`): cabins "C deck.part.door", halls "H deck.part"; the decks' long parts are "DECK n".
 */
export const PLACE_NAMES: Record<string, string> = {
  // deck 1
  'C1.0.1': 'OFFICERS MESS',
  'C1.0.3': 'ARMOURY',
  'C1.0.7': 'MATES CABIN',
  'C1.1.3': 'SAIL LOCKER',
  'C1.1.7': 'SHOT LOCKER',
  // deck 2
  'C2.0.1': 'COMPANIONWAY',
  'C2.0.5': 'BROKEN CABIN',
  'C2.0.7': 'CREWS MESS',
  'C2.1.5': 'GALLEY',
  'C2.1.7': 'POWDER ROOM',
  // deck 3
  'C3.0.1': 'WARDROOM',
  'C3.0.3': 'ROTTEN CABIN',
  'C3.0.7': 'PURSERS ROOM',
  'C3.1.3': 'STOREROOM',
  'C3.1.5': 'CARPENTERS ROOM',
  // deck 4
  'C4.0.1': 'BOSUNS ROOM',
  'C4.0.3': 'STRONGROOM',
  'C4.0.5': 'NAVIGATORS CABIN',
  'C4.1.1': 'CREWS QUARTERS',
  'C4.1.3': 'BREAD ROOM',
  'C4.1.5': 'GUN ROOM',
  // deck 5
  'C5.0.1': 'CAPTAINS CABIN',
  'C5.0.3': 'MASTERS CABIN',
  'C5.0.5': 'FORE HOLD',
  'C5.1.1': 'WATER CASKS',
  'C5.1.3': 'AFT HOLD',
  'C5.1.5': 'BILGE',
};

/** A place's name, from its map id. */
export function placeName(id: string) {
  const deck = id.slice(1, 2);
  if (id[0] === 'H') return `DECK ${deck} ${id.endsWith('.2') ? 'STERN' : 'BOW'} HALL`;
  return PLACE_NAMES[id] ?? `DECK ${deck}${id[0] === 'C' ? ' CABIN' : ''}`;
}
