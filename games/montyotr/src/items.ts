import { cloudFrames, coinTable, SFX, specialItems } from './data';
import { ROW, SCREEN, type Game } from './game';

/** Ports of the original SpecialItems subsystem: coins, special items, their room effects. */

const COIN_COLOURS = [2, 4, 4, 10, 7, 1, 1, 7, 10, 4, 4];

/** CollectCoin: a coin char ($34) in Monty's 2×2 footprint is worth 50. */
export function collectCoin(g: Game) {
  const base = g.montyChr;
  for (const o of [ROW + 1, ROW, 1, 0]) {
    if (g.chr(base + o) !== 0x34) continue;
    g.setChr(base + o, 0);
    const e = g.entities.find((x) => x.at === base + o && x.index >= 0);
    if (!e) return;
    g.coinCollected[e.index] = 0xff;
    g.addScore(50);
    g.sfx(SFX.coin);
    return;
  }
}

/** CharacterAnimation: collectibles shimmer through an 11-step colour cycle. */
export function animateCharacters(g: Game) {
  for (const e of g.entities) {
    e.phase = (e.phase + 1) % 11;
    g.setCol(e.at, COIN_COLOURS[e.phase]);
  }
}

/** SpawnSIForRoom: put this room's special item (if any, and not yet taken) on sprite 0. */
export function spawnForRoom(g: Game) {
  g.siActiveIdx = -1;
  for (let i = 0; i * 4 < specialItems.length; i++) {
    if (specialItems[i * 4] !== g.roomId) continue;
    if (g.roomId === 0x01 && !g.cheatMode) return; // the cake is cheat-mode only
    if (g.siCollected[i]) return;
    g.sx[0] = specialItems[i * 4 + 1];
    g.sy[0] = specialItems[i * 4 + 2];
    g.sptr[0] = (specialItems[i * 4 + 3] + 0x8e) & 0xff;
    g.scol[0] = 1;
    g.enable |= 0x01;
    g.priority |= 0x01;
    g.siActiveIdx = i;
    return;
  }
  g.sy[0] = 0xff;
}

/** HandleSICollision: Monty touching sprite 0 (item/treasure) or an enemy (4-7). */
export function handleCollision(g: Game) {
  const cs = g.collisionStore;
  if (!((g.c5.active && cs & 0x04) || cs & 0x08)) return;
  if (!(cs & 0x01)) {
    if (cs & 0xf0) g.actionCounter = g.c5.active ? 7 : 2;
    return;
  }
  const ptr = g.sptr[0];
  if (ptr === 0x9b) {
    g.actionCounter = 6; // the treasure: the end of the game
    return;
  }
  if (ptr !== 0xbf && (ptr < 0x8e || ptr >= 0x98)) return;
  const idx = g.siActiveIdx;
  if (idx < 0 || g.siCollected[idx]) return;
  g.siCollected[idx] = 0x81;
  if (idx === 19) {
    g.cheatMode |= 0x81;
    g.enable &= 0xfe;
    return;
  }
  applyRoomEffects(g);
  g.enable &= 0xfe;
  if (ptr === 0x8e) g.lives++; // first aid kit
  if (ptr === 0x92) g.actionCounter = 1; // the smoke stack
  g.addScore(200);
  g.sfx(SFX.item);
}

/** ApplyItemRoomEffects: item-gated changes to rooms (run on load and on pickup). */
export function applyRoomEffects(g: Game) {
  const id = g.roomId;
  const clear = (row: number, col: number) => g.setChr(SCREEN + row * ROW + col, 0);
  const slot3 = g.enemies[3];
  if (id === 0x0c && g.siCollected[0]) {
    for (let r = 0; r < 4; r++) for (const c of [2, 3, 4]) { clear(13 + r, c); clear(17 + r, c); }
  }
  if (id === 0x14 && g.siCollected[1]) for (let r = 17; r <= 20; r++) clear(r, 19);
  if (id === 0x14 && g.siCollected[2] && g.roomItemActive[3]) for (let r = 18; r <= 20; r++) clear(r, 7);
  if (id === 0x19 && g.siCollected[3] && slot3) slot3.x = 0xff; // fly spray sees off the wasp
  if (id === 0x1c && !g.siCollected[5]) for (let c = 2; c <= 27; c++) clear(18, c);
  if (id === 0x2f && g.siCollected[10] && g.roomItemActive[4] && slot3) slot3.x = 0xff; // key + rum: the queen steps aside
  if (id === 0x22 && !g.roomItemActive[1]) {
    for (let r = 0; r < 5; r++) { clear(3 + r, 17); clear(8 + r, 18); }
  }
  if (id === 0x08 && slot3) {
    slot3.x = 0xff;
    // The teddy bear is a poison pill: taking it wakes the bubble, once.
    if (g.siCollected[13] && g.siCollected[13] < 0x82) {
      g.siCollected[13]++;
      slot3.x = 0x6f;
    }
  }
  if (id === 0x26 || id === 0x2d) g.tileProps[3] = g.tileProps[4] = 0;
}

/** UpdateRisingCloud: room $01's cloud rises and carries Monty up. */
export function updateRisingCloud(g: Game) {
  if (g.roomId !== 0x01) return;
  g.cloudTick = (g.cloudTick + 1) & 0xff;
  if (g.cloudTick & 1) {
    g.sptr[1] = cloudFrames[(g.cloudTick & 0x0c) >> 2];
    g.sy[1] = (g.sy[1] - 1) & 0xff;
  }
  g.sx[1] = 0x3c;
  g.scol[1] = 1;
  g.vic.enable |= 0x02;
  const y = g.sy[1];
  if (y >= 0xda) return;
  if (y < 0x52) {
    for (const c of [0x0c, 0x0d, 0x0e]) g.setChr(SCREEN + 4 * ROW + c, 0);
    return;
  }
  const at = g.rowAddr(((y - 0x32) & 0xff) >> 3);
  for (let i = 0; i < 3; i++) {
    g.setChr(at + 0x0c + i, 8);
    g.setChr(at + 0x34 + i, 0);
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
  if (g.roomId !== 0x01) return;
  const cy = g.sy[1];
  if (cy >= 0xda || cy < 0x52) return;
  const cloudTop = ((cy - 0x32) & 0xff) & ~7; // pixel row of the cloud's character row
  const col0 = g.montyCol, col1 = col0 + (((g.x2 - 0x0c) & 3) ? 2 : 1);
  if (col1 < 0x0c || col0 > 0x0e) return; // not over the cloud
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

/** PlaceTreasure: once the jerry can is found, the treasure glows in room $2F. */
export function placeTreasure(g: Game) {
  if (g.roomId !== 0x2f || !g.siCollected[8]) return;
  g.sx[0] = 0x40;
  g.sy[0] = 0x9a;
  g.sptr[0] = 0x9b;
  g.enable |= 0x01;
  g.scol[0] = (g.scol[0] + 1) & 0xff;
}

/** Items that count towards finishing a room: not the teddy bear (a trap), the smoke stack (fatal) or the cheat-only cake. */
const COUNTED_ITEMS = (i: number) => i !== 13 && i !== 16 && i !== 19;

/** What's left to collect in a room (coins and special items). */
export function roomProgress(g: Game, roomId: number) {
  let coins = 0, coinsLeft = 0, items = 0, itemsLeft = 0;
  for (let i = 0; i * 3 < coinTable.length; i++) {
    if (coinTable[i * 3] !== roomId) continue;
    coins++;
    if (!g.coinCollected[i]) coinsLeft++;
  }
  for (let i = 0; i * 4 < specialItems.length; i++) {
    if (specialItems[i * 4] !== roomId || !COUNTED_ITEMS(i)) continue;
    items++;
    if (!g.siCollected[i]) itemsLeft++;
  }
  return { coins, coinsLeft, items, itemsLeft, complete: coinsLeft === 0 && itemsLeft === 0 };
}
