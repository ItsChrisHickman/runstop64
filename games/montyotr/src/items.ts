import type { Condition } from './montydata';
import { ROW, SCREEN, type Game } from './game';
import { shimmer, takeCoin } from '../../shared/monty/screen';

/** Ports of the original SpecialItems subsystem: coins, special items, their room effects. */

/** CollectCoin: a coin char ($34) in Monty's 2x2 footprint is worth 50. */
export function collectCoin(g: Game) {
  const taken = takeCoin(g.mem, g.montyChr, g.entities);
  if (!taken?.item) return;
  g.coinCollected[taken.item.index] = 0xff;
  g.addScore(50);
  g.sfx(g.data.sfx.coin);
}

/** CharacterAnimation: collectibles shimmer through an 11-step colour cycle. */
export function animateCharacters(g: Game) {
  shimmer(g.entities, (at, colour) => { if (!g.tunnels.some((t) => t.over.has(at))) g.setCol(at, colour); }); // (a coin under a train keeps the train's colour)
}

/** SpawnSIForRoom: put this room's special item (if any, and not yet taken) on sprite 0. */
export function spawnForRoom(g: Game) {
  g.siActiveIdx = -1;
  g.siSecondIdx = -1;
  const { specialItems, cheatItem } = g.data;
  if (spawnTwo(g)) return;
  for (let i = 0; i * 4 < specialItems.length; i++) {
    if (specialItems[i * 4] !== g.roomId) continue;
    if (i === cheatItem && !g.cheatMode) return; // the cake is cheat-mode only
    if (g.siCollected[i]) return;
    g.sx[0] = specialItems[i * 4 + 1];
    g.sy[0] = specialItems[i * 4 + 2];
    g.sptr[0] = (specialItems[i * 4 + 3] + 0x8e) & 0xff;
    g.scol[0] = g.data.itemSprites.colour(g.sptr[0]);
    g.enable |= 0x01;
    g.priority |= 0x01;
    g.siActiveIdx = i;
    return;
  }
  g.sy[0] = 0xff;
}

/**
 * A room with two special items (only a game's own has them: the original's rooms have one): the first of them not yet taken is
 * on sprite 0, the second on sprite 1 (which such a room has no other use for), each as the original's one is. True if this is
 * such a room.
 */
function spawnTwo(g: Game): boolean {
  const { specialItems } = g.data;
  const mine: number[] = [];
  for (let i = 0; i * 4 < specialItems.length; i++) if (specialItems[i * 4] === g.roomId) mine.push(i);
  if (mine.length < 2) return false;
  const left = mine.filter((i) => !g.siCollected[i]);
  const place = (n: number, i: number | undefined) => {
    if (i === undefined) return;
    g.sx[n] = specialItems[i * 4 + 1];
    g.sy[n] = specialItems[i * 4 + 2];
    g.sptr[n] = (specialItems[i * 4 + 3] + 0x8e) & 0xff;
    g.scol[n] = g.data.itemSprites.colour(g.sptr[n]);
    g.priority |= 1 << n;
  };
  g.siActiveIdx = left[0] ?? -1;
  g.siSecondIdx = left[1] ?? -1;
  place(0, left[0]);
  place(1, left[1]);
  if (left[0] !== undefined) g.enable |= 0x01;
  else g.sy[0] = 0xff;
  return true;
}

/** Each frame: the second special item of a room that has two stays shown (sprite 1 is switched off by the frame's flush). */
export function secondItemUpdate(g: Game) {
  if (g.siSecondIdx >= 0 && !g.siCollected[g.siSecondIdx]) g.enable |= 0x02;
}

/** HandleSICollision: Monty touching sprite 0 (item/treasure) or an enemy (4-7). */
export function handleCollision(g: Game) {
  const cs = g.collisionStore;
  const { itemSprites } = g.data;
  if (!((g.c5.active && cs & 0x04) || cs & 0x08)) return;
  const second = !(cs & 0x01) && !!(cs & 0x02) && g.siSecondIdx >= 0 && !g.siCollected[g.siSecondIdx];
  if (!(cs & 0x01) && !second) {
    if (cs & 0xf0) g.actionCounter = g.c5.active ? 7 : 2;
    return;
  }
  const n = second ? 1 : 0;
  const ptr = g.sptr[n];
  if (ptr === itemSprites.treasure) {
    g.actionCounter = 6; // the treasure: the end of the game
    return;
  }
  if (!itemSprites.collectable(ptr)) return;
  const idx = second ? g.siSecondIdx : g.siActiveIdx;
  if (idx < 0 || g.siCollected[idx]) return;
  g.siCollected[idx] = 0x81;
  if (idx === g.data.cheatItem) {
    g.cheatMode |= 0x81;
    g.enable &= 0xfe;
    return;
  }
  applyRoomEffects(g);
  g.enable &= ~(1 << n) & 0xff;
  if (ptr === itemSprites.extraLife) g.lives++; // first aid kit
  if (ptr === itemSprites.fatal) g.actionCounter = 1; // the smoke stack
  g.addScore(200);
  g.sfx(g.data.sfx.item);
  if (g.data.costumes.some((c) => c.item === idx)) wear(g, idx);
  g.noteTaken(idx);
}

/**
 * Put on the costume of special item `item` (the data's `costumes`; null: none): Monty's pictures in the bank are the
 * costume's from now on. Called when the item is taken and when a save is carried on from (the bank comes back as the game
 * loads it, so what was worn is put on again).
 */
export function wear(g: Game, item: number | null) {
  g.worn = item;
  const costume = g.data.costumes.find((c) => c.item === item);
  for (const { ptr, block } of costume?.blocks ?? []) g.mem.set(block, ptr * 64);
}

/** Whether a condition of a room effect holds (what Monty has taken, what he carries). */
function holds(g: Game, c: Condition): boolean {
  if ('taken' in c) return !!g.siCollected[c.taken];
  if ('notTaken' in c) return !g.siCollected[c.notTaken];
  if ('kit' in c) return !!g.roomItemActive[c.kit];
  return !g.roomItemActive[c.noKit];
}

/**
 * ApplyItemRoomEffects: item-gated changes to rooms (the data's `roomEffects`; run on load and on pickup). On a room's loading it runs twice, `before` the decorations are drawn (the original's order) and `after` them, for the effects
 * that are `late` (one that takes a decoration away); on a pickup everything runs once (`all`), the decorations being drawn.
 */
export function applyRoomEffects(g: Game, pass: 'all' | 'before' | 'after' = 'all') {
  const id = g.roomId;
  for (const e of g.data.roomEffects) {
    if (e.room !== id || !(e.when ?? []).every((c) => holds(g, c))) continue;
    if ((pass === 'before' && e.late) || (pass === 'after' && !e.late)) continue;
    for (const [row, col] of e.clear ?? []) g.setChr(SCREEN + row * ROW + col, 0);
    for (const t of e.openTiles ?? []) g.tileProps[t] = 0;
    if (e.place) for (const [row, col] of e.place.cells) g.setRoomChar(row * ROW + col, e.place.code);
    const slot = e.removeEnemy === undefined ? undefined : g.enemies[e.removeEnemy];
    if (slot) slot.x = 0xff; // (fly spray sees off the wasp; key + rum: the queen steps aside)
    const wake = e.wake && g.enemies[e.wake.slot];
    if (e.wake && wake) {
      // The teddy bear is a poison pill: taking it wakes the bubble, once.
      const taken = g.siCollected[e.wake.item];
      if (taken && taken < 0x82) {
        g.siCollected[e.wake.item]++;
        wake.x = e.wake.x;
      }
    }
  }
}

/** UpdateRisingCloud: room $01's cloud rises and carries Monty up. */
export function updateRisingCloud(g: Game) {
  const cloud = g.data.risingCloud;
  if (!cloud || g.roomId !== cloud.room) return;
  g.cloudTick = (g.cloudTick + 1) & 0xff;
  if (g.cloudTick & 1) {
    g.sptr[1] = g.data.cloudFrames[(g.cloudTick & 0x0c) >> 2];
    g.sy[1] = (g.sy[1] - 1) & 0xff;
  }
  g.sx[1] = cloud.x;
  g.scol[1] = 1;
  g.vic.enable |= 0x02;
  const y = g.sy[1];
  if (y >= 0xda) return;
  if (y < 0x52) {
    for (let c = cloud.col; c < cloud.col + 3; c++) g.setChr(SCREEN + 4 * ROW + c, 0);
    return;
  }
  const at = g.rowAddr(((y - 0x32) & 0xff) >> 3);
  for (let i = 0; i < 3; i++) {
    g.setChr(at + cloud.col + i, 8);
    g.setChr(at + cloud.col + ROW + i, 0);
  }
}

/**
 * Assist (not in the original): ride the rising cloud in room $01. The cloud
 * is drawn with characters that jump up 8 pixels at a time, and Monty only
 * checks for floor on character boundaries, so in the original he drops
 * through it unless he keeps hopping. With the assist on, whenever Monty's
 * feet are on or just inside the cloud's row (and he isn't jumping upward)
 * he's lifted to stand on top of it.
 */
export function cloudAssist(g: Game) {
  const cloud = g.data.risingCloud;
  if (!cloud || g.roomId !== cloud.room) return;
  const cy = g.sy[1];
  if (cy >= 0xda || cy < 0x52) return;
  const cloudTop = ((cy - 0x32) & 0xff) & ~7; // pixel row of the cloud's character row
  const col0 = g.montyCol, col1 = col0 + (((g.x2 - 0x0c) & 3) ? 2 : 1);
  if (col1 < cloud.col || col0 > cloud.col + 2) return; // not over the cloud
  // (The cloud is built from rope characters, so Monty may be "holding" it; that's fine.)
  const ascending = g.montyAction && !(g.arcIdx & 0x80);
  if (ascending) return;
  const feet = ((g.y - 0x32) & 0xff) + 16; // pixel row just below Monty
  if (feet < cloudTop || feet > cloudTop + 8) return;
  g.y = (cloudTop - 16 + 0x32) & 0xff;
  g.falling = 0;
  if (g.montyAction) {
    g.montyAction = 0;
    g.arcIdx = 0;
  }
}

/** PlaceTreasure: once the jerry can is found, the treasure glows in its room. */
export function placeTreasure(g: Game) {
  const treasure = g.data.treasure;
  if (!treasure || g.roomId !== treasure.room || !g.siCollected[treasure.item]) return;
  g.sx[0] = treasure.x;
  g.sy[0] = treasure.y;
  g.sptr[0] = g.data.itemSprites.treasure;
  g.enable |= 0x01;
  g.scol[0] = (g.scol[0] + 1) & 0xff;
}

/** What's left to collect in a room (coins and special items). */
export function roomProgress(g: Game, roomId: number) {
  const { coinTable, specialItems, uncountedItems } = g.data;
  let coins = 0, coinsLeft = 0, items = 0, itemsLeft = 0;
  for (let i = 0; i * 3 < coinTable.length; i++) {
    if (coinTable[i * 3] !== roomId) continue;
    coins++;
    if (!g.coinCollected[i]) coinsLeft++;
  }
  for (let i = 0; i * 4 < specialItems.length; i++) {
    if (specialItems[i * 4] !== roomId || uncountedItems.includes(i)) continue;
    items++;
    if (!g.siCollected[i]) itemsLeft++;
  }
  return { coins, coinsLeft, items, itemsLeft, complete: coinsLeft === 0 && itemsLeft === 0 };
}
