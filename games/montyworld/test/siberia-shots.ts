/**
 * Siberia's six rooms as the real engine draws them (the game's own frame, Monty in it, the creatures, mouths and ice where they are
 * a moment in), one picture each and a contact sheet; the sleeper's corridor with and without the ticket; the cracking ice in its stages; the
 * tunnel mouth under way; and each room beside one of Monty on the Run's (compare-*.png). Pictures only: nothing is checked.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE } from '../../montyotr/test/play';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { STEAM_VALVE } from '../src/data';
import { compare, contactSheet, motrRoom, newPlay, placed, savePng, settle, shot, standing } from './shots-kit';
import { itemIndex } from './route';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: siberia-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

/** The spots he is shown at: the room, how many frames in, and the room of Monty on the Run to compare with. */
const SPOTS: readonly { room: number; name: string; col: number; floor: number; frames: number; compare: number }[] = [
  { room: SIB.gravy, name: '9-gravy-train', col: 2, floor: 9, frames: 150, compare: 0x13 },
  { room: SIB.sleeper, name: '10-sleeper-hit', col: 3, floor: 9, frames: 4, compare: 0x15 },
  { room: SIB.coal, name: '11-coal-comfort', col: 3, floor: 17, frames: 60, compare: 0x17 },
  { room: SIB.yeti, name: '13-yeti-or-not', col: 24, floor: 17, frames: 60, compare: 0x0e },
  { room: SIB.mine, name: '14-mine-all-mine', col: 2, floor: 4, frames: 40, compare: 0x1b },
  { room: SIB.border, name: '17-border-line-case', col: 7, floor: 17, frames: 60, compare: 0x03 },
];

/** He is in Moscow's ushanka (its item's index in the table). */
const worn = itemIndex(newPlay().g, ROOM.platform, 1);

const pics = SPOTS.map((s) => {
  const { px } = placed({ room: s.room, col: s.col, floor: s.floor, frames: s.frames, worn });
  savePng(out, `room-${s.name}.png`, px);
  return px;
});
contactSheet(out, 'sheet.png', pics);

// the sleeper's corridor with the inspector in his gangway, and with the ticket (he has gone)
savePng(out, 'sleeper-corridor.png', placed({ room: SIB.sleeper, col: 4, floor: 17, frames: 30, worn }).px);
savePng(out, 'sleeper-ticket.png', placed({ room: SIB.sleeper, col: 4, floor: 17, frames: 30, worn, items: [itemIndex(newPlay().g, SIB.yeti)] }).px);
// the train's path puzzle, its moments in order: on the tender's coal from the sleeper's roof, the steam out of the pipe's top across the way and the wheel seen below; in the tender's
// corridor with the ticket, the bottom quiet, the cab open; the wheel turned (in its niche), the steam out of the bottom across the way into the cab, the top quiet; on the sleeper's
// roof by the vestibule on the way back east; across the quiet top onto the cab's roof; on the boiler's top under the tipple's ladder.
{
  const ticket = itemIndex(newPlay().g, SIB.yeti);
  const turned = [ticket, STEAM_VALVE];
  const moments = [
    placed({ room: SIB.coal, col: 3, floor: 9, frames: 30, worn }).px,
    placed({ room: SIB.coal, col: 6, floor: 17, frames: 30, worn, items: [ticket] }).px,
    placed({ room: SIB.coal, col: 10, floor: 17, frames: 30, worn, items: turned }).px,
    placed({ room: SIB.sleeper, col: 24, floor: 9, frames: 4, worn, items: turned }).px,
    placed({ room: SIB.coal, col: 14, floor: 9, frames: 4, worn, items: turned }).px,
    placed({ room: SIB.coal, col: 27, floor: 11, frames: 30, worn, items: turned }).px,
  ];
  moments.forEach((px, i) => savePng(out, `steam-${i + 1}.png`, px));
  contactSheet(out, 'strip-steam.png', moments);
}
// the tunnel mouths under way
savePng(out, 'tunnel-gravy.png', placed({ room: SIB.gravy, col: 8, floor: 17, frames: 40 + 130 + 48 + 170, worn }).px);
savePng(out, 'tunnel-sleeper.png', placed({ room: SIB.sleeper, col: 4, floor: 17, frames: 8 + 44 + 48 + 90, worn }).px);
// the ice in its stages (he stands on it)
for (const frames of [30, 70, 100]) {
  const s = newPlay();
  const at = standing(11, 17);
  enterRoom(s.g, SIB.border, at.x2, at.y);
  settle(s);
  s.g.enemies = [];
  for (let n = 0; n < frames; n++) frame(s, NONE);
  savePng(out, `ice-${frames}.png`, shot(s.g));
}

// strips of the moving things (contact sheets, three across, frames apart as the lists say)
const strip = (name: string, room: number, col: number, floor: number, frames: readonly number[], noEnemies = false) => {
  const s = newPlay();
  s.g.siCollected[itemIndex(s.g, ROOM.platform, 1)] = 0x81;
  const at = standing(col, floor);
  enterRoom(s.g, room, at.x2, at.y);
  settle(s);
  if (noEnemies) s.g.enemies = [];
  const pics: Uint8Array[] = [];
  let done = 0;
  for (const f of frames) { for (; done < f; done++) frame(s, NONE); pics.push(shot(s.g)); }
  contactSheet(out, name, pics);
};
// the mountain: the portal flashing at the entry, then coming in, over the roof, going out (he is safe in the car)
strip('strip-tunnel-gravy.png', SIB.gravy, 8, 17, [190, 235, 330, 450, 570, 690, 810, 930, 1060], true);
strip('strip-tunnel-sleeper.png', SIB.sleeper, 4, 17, [40, 90, 140, 200, 260, 320, 400, 480, 560], true);
// the yeti on its loop
strip('strip-yeti.png', SIB.yeti, 25, 17, [10, 60, 110, 160, 210, 260, 310, 360, 410]);
// the cart, from the east dock
strip('strip-cart.png', SIB.mine, 22, 18, [10, 50, 90, 130, 170, 210], true);

// each room beside one of Monty on the Run's
SPOTS.forEach((s, i) => compare(out, `compare-${s.name}.png`, pics[i] ?? new Uint8Array(0), motrRoom(s.compare)));
