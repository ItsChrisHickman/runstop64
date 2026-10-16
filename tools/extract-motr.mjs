#!/usr/bin/env node
// Extracts the original Monty on the Run data tables (rooms, tiles, sprites,
// jump arc, exit map, charset) from Dave-Agent's annotated reconstruction:
//   https://github.com/Dave-Agent/monty-on-the-run
//
// Usage: node tools/extract-motr.mjs <path-to-reconstruction> [out.json]
//
// Only data is read; none of the reconstruction's code is used.

import fs from 'node:fs';
import path from 'node:path';
import { originalImage } from './motr-prg.mjs';

const [, , repo, out = 'games/montyotr/src/data/motr.json'] = process.argv;
if (!repo) {
  console.error('usage: node tools/extract-motr.mjs <path-to-monty-on-the-run> [out.json]');
  process.exit(1);
}
const src = path.join(repo, 'refactored/src');

/** `.const` values seen so far (the scroller's control codes). */
const CONSTS = new Map();

/** Parse a KickAssembler file into labelled byte runs, in file order. */
function parse(file) {
  const lines = fs.readFileSync(path.join(src, file), 'utf8').split('\n');
  const ns = [];
  const entries = []; // { label, bytes }
  let current = { label: null, bytes: [] };
  entries.push(current);

  const num = (t) => {
    t = t.trim();
    if (t.startsWith('$')) return parseInt(t.slice(1), 16);
    if (t.startsWith('%')) return parseInt(t.slice(1), 2);
    if (CONSTS.has(t)) return CONSTS.get(t);
    return parseInt(t, 10);
  };

  // (`.text "A"; .byte $00` puts two statements on a line)
  for (const line of lines.map((l) => l.replace(/\/\/.*$/, '')).flatMap((l) => l.split(/;(?=\s*\.)/))) {
    let m;
    if ((m = line.match(/^\s*\.const\s+(\w+)\s*=\s*(\S+)/))) { CONSTS.set(m[1], num(m[2])); continue; }
    if ((m = line.match(/^\s*\.namespace\s+(\w+)\s*\{/))) { ns.push(m[1]); continue; }
    // Other blocks (.if { } else { }) also open braces; track them so they don't pop a namespace.
    if (/^\s*\}\s*else\s*\{\s*$/.test(line)) continue;
    if (/\{\s*$/.test(line)) { ns.push(''); continue; }
    if (/^\s*\}\s*$/.test(line)) { ns.pop(); continue; }
    if ((m = line.match(/^\s*([A-Za-z_]\w*):/))) {
      current = { label: [...ns.filter(Boolean), m[1]].join('.'), bytes: [] };
      entries.push(current);
    }
    if ((m = line.match(/\.byte\s+(.+)$/))) {
      for (const t of m[1].split(',')) if (t.trim()) current.bytes.push(num(t) & 0xff);
    } else if ((m = line.match(/\.text\s+"([^"]*)"/))) {
      for (const ch of m[1]) current.bytes.push(ch.charCodeAt(0));
    } else if ((m = line.match(/\.fill\s+([^,]+),\s*(.+)$/))) {
      const n = num(m[1]);
      for (let i = 0; i < n; i++) current.bytes.push(num(m[2]) & 0xff);
    }
  }
  return entries;
}

/** Take `count` bytes starting at `label`, continuing across following labels. */
function take(entries, label, count, { pad = false } = {}) {
  const i = entries.findIndex((e) => e.label === label);
  if (i < 0) throw new Error(`label not found: ${label}`);
  const bytes = [];
  for (let j = i; j < entries.length && bytes.length < count; j++) bytes.push(...entries[j].bytes);
  if (bytes.length < count && !pad) throw new Error(`${label}: wanted ${count} bytes, found ${bytes.length}`);
  while (bytes.length < count) bytes.push(0);
  return bytes.slice(0, count);
}

/** Bytes from `label` up to (not including) the first $FF terminator. */
function untilFF(entries, label) {
  const bytes = take(entries, label, 4096, { pad: true });
  return bytes.slice(0, bytes.indexOf(0xff));
}

/** Bytes belonging to exactly one label. */
function own(entries, label) {
  const e = entries.find((e) => e.label === label);
  if (!e) throw new Error(`label not found: ${label}`);
  return e.bytes;
}

/**
 * Rebuild the VIC bank 1 graphics ($4000-$7FFF) the way the assembler lays it
 * out: honour absolute `.pc = $XXXX` pins and place bytes sequentially. Sprite
 * pointer P then lives at $4000 + P*64, exactly as on the C64.
 */
function buildBank(files) {
  const mem = new Uint8Array(0x4000);
  for (const file of files) {
    let pc = -1;
    for (const raw of fs.readFileSync(path.join(src, file), 'utf8').split('\n')) {
      const line = raw.replace(/\/\/.*$/, '');
      let m;
      if ((m = line.match(/^\s*\.pc\s*=\s*\$([0-9a-fA-F]+)/))) { pc = parseInt(m[1], 16); continue; }
      if (/^\s*\.pc\s*=\s*CHARSET_RAM/.test(line)) { pc = 0x4000; continue; }
      if (pc < 0) continue;
      const put = (v) => { if (pc >= 0x4000 && pc < 0x8000) mem[pc - 0x4000] = v & 0xff; pc++; };
      if ((m = line.match(/\.byte\s+(.+)$/))) {
        for (const t of m[1].split(',')) if (t.trim()) put(t.trim().startsWith('$') ? parseInt(t.trim().slice(1), 16) : parseInt(t, 10));
      } else if ((m = line.match(/\.text\s+"([^"]*)"/))) {
        for (const ch of m[1]) put(ch.charCodeAt(0));
      } else if ((m = line.match(/\.word\s+(.+)$/))) {
        for (const t of m[1].split(',')) if (t.trim()) { put(0); put(0); }
      }
    }
  }
  return mem;
}

const hex = (b) => Buffer.from(b).toString('hex');
const hx = (n) => n.toString(16).padStart(2, '0');

const roomData = parse('subsystems/room_data.asm');
const tiles = parse('subsystems/tiles_data.asm');
const charset = parse('subsystems/font_chr.asm');
const montySpr = parse('subsystems/monty_spr.asm');
const montyData = parse('subsystems/monty_data.asm');
const enemySpr = parse('subsystems/enemy_spr.asm');
const utilsData = parse('subsystems/utils_data.asm');
const fkData = parse('subsystems/freedom_kit_data.asm');

// Enemy graphics banks in type order ($08-$22). Each is read as 8 packed rows
// of 32 bytes like the original UnpackSpriteGraphics (4-frame types read on
// into the next bank; the copy flag then duplicates frames 0-3 over 4-7).
const ENEMY_TYPES = ['boot', 'skate', 'lamp', 'knight', 'ufo', 'queen_liz', 'clock', 'big_nose', 'king', 'rubik',
  'sad_mug', 'pi_pie', 'wasp', 'bubble', 'sad_ghost', 'alien', 'kettle', 'smiley', 'cone', 'hand', 'tank',
  'jelly_fish', 'medusa', 'fish', 'flying_banner_1', 'flying_banner_2', 'flying_banner_3'];
const enemyBanks = ENEMY_TYPES.map((n) => hex(take(enemySpr, `Enemies.sprites.${n}`, 256, { pad: true })));

const ROOMS = 52;
const tilemaps = [];
for (let r = 0; r < ROOMS; r++) {
  const bytes = own(roomData, `Room.Data.tilemap.rm_${hx(r)}`);
  // Stream ends at $FF $FF; keep everything before the terminator.
  let end = bytes.length;
  for (let i = 0; i + 1 < bytes.length; i++) if (bytes[i] === 0xff && bytes[i + 1] === 0xff) { end = i; break; }
  tilemaps.push(hex(bytes.slice(0, end)));
}

const enemies = [];
for (let r = 0; r < ROOMS; r++) enemies.push(hex(own(roomData, `Room.Data.enemy_spawn.rm_${hx(r)}`)));

const sectorNames = [];
for (let i = 1; i <= 10; i++) {
  const b = own(roomData, `Room.Data.sector_name_${i}`);
  const text = String.fromCharCode(...b.slice(1)).replace(/\*+$/, '');
  sectorNames.push({ col: b[0], text });
}

const bank = buildBank([
  'subsystems/font_chr.asm',
  'subsystems/monty_spr.asm',
  'subsystems/special_items_spr.asm',
  'subsystems/freedom_kit_spr.asm',
]);

// Decorations: per type, the bitmap (w*h chars) and either a solid colour or a
// per-cell colour stream; plus where each appears.
const decor = parse('subsystems/decor_data.asm');
const decorProps = take(decor, 'Decor.props_tbl', 97 * 4);
const decorTypes = [];
{
  const lines = fs.readFileSync(path.join(src, 'subsystems/decor_data.asm'), 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*entry\(([\w.]+),\s*([\w.$]+)\)/);
    if (!m) continue;
    const t = decorTypes.length;
    const [w, h, wh] = decorProps.slice(t * 4, t * 4 + 3);
    const chr = hex(take(decor, `Decor.${m[1]}`, wh * 8));
    const colour = m[2].startsWith('$') ? parseInt(m[2].slice(1), 16) : hex(take(decor, `Decor.${m[2]}`, wh));
    decorTypes.push({ w, h, chr, colour });
  }
}
const decorRooms = hex(untilFF(decor, 'Decor.room_list'));
const mechData = parse('subsystems/mechanisms_data.asm');
const jetData = parse('subsystems/jetpack_data.asm');
const goData = parse('subsystems/game_over_data.asm');

// The title (attract) screen: the scroller, the hi-score box and the freedom kit carousel.
const scroller = parse('subsystems/scroller_data.asm');
const hiData = parse('subsystems/hiscore_data.asm');
const hiSubs = parse('subsystems/hiscore_data_substitutions.asm');
const fkCode = parse('subsystems/freedom_kit.asm');
// The refactored half tidied a few bytes; the title is taken from the original's own
// (the byte-perfect half, at the addresses the reconstruction gives), and any table
// that differs from the refactored label's is reported.
const original = originalImage(repo, (m) => console.log(m));
const fromOriginal = (name, bytes, at) => {
  const o = [...original.subarray(at, at + bytes.length)];
  const diff = o.map((b, i) => (b !== bytes[i] ? i : -1)).filter((i) => i >= 0);
  if (diff.length) console.log(`title.${name}: the original differs from the refactored source at ${diff.length} bytes (+${diff.slice(0, 8).map((i) => i.toString(16)).join(' +')}); using the original's`);
  return hex(o);
};
const title = Object.fromEntries(Object.entries({
  // Attract.UpdateChrs copies these over the charset: $B8 bytes at char $16, $1C0 at char $C8
  chr: [take(parse('subsystems/attract_chr.asm'), 'Attract.Chr.chr_src', 0xb8 + 0x100 + 0xc0), 0xc9fa],
  // the scroller's stream: text and control codes ($F9-$FE), $FF restarts
  message: [[...untilFF(scroller, 'Scroller.Data.message'), 0xff], 0x3a59],
  bitmask: [own(scroller, 'Scroller.Data.bitmask_tbl'), 0x3a51],
  nybbleMask: [own(scroller, 'Scroller.Data.nybble_mask_tbl'), 0x3c1a],
  // 50 scores (5 PETSCII digits each), the 5-byte overflow, 50 names (16 each)
  scores: [take(hiData, 'HiScore.Data.top_scores', 250 + 5 + 800), 0x7300],
  nameInput: [own(hiData, 'HiScore.Data.name_input_buf'), 0x771f],
  // "CONGRATULATIONS !!": 6 rows of 28, and where each starts
  entryText: [take(hiData, 'HiScore.Data.string_entry', 6 * 28), 0x3d75],
  entryRows: [own(hiData, 'HiScore.Data.entry_row_offsets'), 0x3e1d],
  rowTemplate: [own(hiData, 'HiScore.Data.attract_row_tpl'), 0x371e],
  bandColours: [own(hiData, 'HiScore.Data.border_tile_data'), 0x37c0],
  scoreRows: [own(hiData, 'HiScore.Data.scores_row_tbl'), 0x3821],
  // ProcessName's words ($00 between, $FF after) and what 10-25 become (16 each)
  triggers: [[...untilFF(hiSubs, 'HiScore.Data.triggers'), 0xff], 0x08bb],
  replacements: [take(hiSubs, 'HiScore.Data.replacements', 16 * 16), 0x0974],
  kitTop: [own(fkData, 'FreedomKit.Data.chr_top_idx'), 0x350b],
  kitBottom: [own(fkData, 'FreedomKit.Data.chr_bot_idx'), 0x3519],
  kitFlags: [take(fkData, 'FreedomKit.Data.item_flags', 23), 0x352c],
  kitMarks: [own(fkData, 'FreedomKit.Data.pos_offsets'), 0x3543],
  kitX: [own(fkCode, 'FreedomKit.sprite_x_base'), 0x369a],
}).map(([name, [bytes, at]]) => [name, fromOriginal(name, bytes, at)]));

const data = {
  source: 'Extracted from https://github.com/Dave-Agent/monty-on-the-run (reconstruction of Monty on the Run, Gremlin Graphics 1985)',
  rooms: ROOMS,
  tileLibrary: hex(take(tiles, 'Tiles.Data.tile_library', 121 * 8)),
  roomDefs: hex(take(roomData, 'Room.Data.room_defs', ROOMS * 16)),
  tilemaps,
  enemies,
  exitGrid: hex(take(roomData, 'Room.Data.room_exit_dest_tbl', 6 * 23)),
  sectorNames,
  sectorIdx: hex(take(roomData, 'Room.Data.sector_idx', 53)),
  charset: hex(take(charset, 'chrset.base', 2048)),
  // walk-left(4) walk-right(4) climb(4) somersault-left(12) somersault-right(12), 64 bytes each
  montySprites: hex(take(montySpr, 'Monty.sprites.walk_l_spr', 36 * 64)),
  jumpArc: hex(take(montyData, 'Monty.Data.jump_arc_tbl', 41)),
  enemyTypes: ENEMY_TYPES,
  enemyBanks,
  enemyCopyFlags: hex(take(utilsData, 'Utils.Data.enemy_copy_flag_tbl', 27)),
  enemyColours: hex(take(utilsData, 'Utils.Data.enemy_sprite_colour_tbl', 16)),
  enemyDirFlags: hex(take(utilsData, 'Utils.Data.enemy_dir_flags_tbl', 5)),
  // (room, col, row) for every coin
  coins: hex(untilFF(fkData, 'FreedomKit.Data.item_tbl')),
  // bits 0-2: animated room char slot, bits 4-7: animation mode
  roomMeta: hex(take(utilsData, 'Utils.Data.room_metadata_tbl', 54)),
  // VIC bank 1 graphics, $4000-$7FFF: sprite pointer P is at offset P*64
  bank: hex(bank),
  // Special items: (room, sprite X, sprite Y, frame_base) — sprite pointer = frame_base + $8E
  specialItems: hex(take(parse('subsystems/special_items_data.asm'), 'SpecialItems.Data.si_spawn_tbl', 80)),
  // Freedom kit icon sprite layout (packed 32 bytes → 64-byte sprite)
  fkLayout: hex(take(fkData, 'FreedomKit.Data.sprite_layout_tbl', 32)),
  decorTypes,
  decorRooms,
  piledrivers: hex(untilFF(mechData, 'Mechanisms.Data.config_tbl')),
  piledriverGlyphs: hex(take(mechData, 'Mechanisms.Data.piledriver_frame_data', 48)),
  teleporterColours: hex(take(mechData, 'Mechanisms.Data.colour_table', 4)),
  teleporters: hex(untilFF(mechData, 'Mechanisms.Data.teleporter_cfg_tbl')),
  teleporterDests: hex(take(mechData, 'Mechanisms.Data.dest_tbl', 16)),
  flameMasks: hex(take(jetData, 'Jetpack.Data.flame_mask_a', 36)),
  greyPulse: hex(take(utilsData, 'Utils.Data.grey_pulse_tbl', 8)),
  cloudFrames: hex(take(parse('subsystems/special_items_data.asm'), 'SpecialItems.Data.cloud_frame_tbl', 4)),
  arrestedText: hex(take(goData, 'GameOver.Data.arrested_text', 0xdb)),
  gameOverPtrs: hex(take(goData, 'GameOver.Data.game_over_sprite_ptrs', 8)),
  bannerText: 'MONTY FREEDOM KIT.',
  title,
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
console.log(`wrote ${out} (${fs.statSync(out).size} bytes)`);
