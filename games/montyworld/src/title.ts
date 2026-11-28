import { Surface } from 'c64kit';
import type { TitleGame, TitleInput, TitleScreen, TitleSound } from '../../montyotr/src/title';
import { SCREEN } from '../../shared/monty/screen';
import type { Worn } from './art/costume';
import { HAT_COLOUR } from './art/hat';
import { buildTitleArt, CYAN, MC1, MC2, RED, ROUTE_LENGTH, routeAt, ROWS, SEA, SKY, WHITE, YELLOW, type TitleArt } from './title-art';
import { chaseAt, HAT_WORN_LIFT, sceneAt, type MontyAt, type ViktorAt } from './title-chase';
import { StripScroller, type Passage } from './title-scroll';
import { VIKTOR_HEIGHT, VIKTOR_LAYERS, VIKTOR_POSES, viktorBlock, viktorFallenBlock } from './title-viktor';

export { GONE, SCENES, STAND, VIKTOR_GAP, WALK_FRAMES } from './title-chase';

/**
 * Do Svidaniya Monty's title screen (the picture is title-art.ts): the logo over the world map from Montos to Rio on a black screen (the
 * sea's strip blue: the background colour changed down its lines), Monty in his ushanka walking the dotted route on a loop (two sprites,
 * his picture and his hat, turned to face east) and Viktor Vole, the Russian operative (title-viktor.ts) a few steps behind him, something different
 * happening on the way each loop (title-chase.ts: Viktor trips, Monty hides behind the names, Viktor overtakes him), the story scroller
 * under the map, ENTER CONTINUE's line (`STRIP_Y`) under that and the credits at the foot, Hubbard's tune playing. It takes
 * the game's characters, screen and sprites, and gives them back (`leave`).
 */

/** Where ENTER CONTINUE's line goes: the top, in pixels, of the empty row under the scroller. */
export const STRIP_Y = ROWS.strip * 8;

/**
 * The sprite blocks the title uses, all ones the bank leaves empty ($30-$4F): Monty's four walking pictures and their hats, Viktor's two
 * paces of four layers facing east and (`viktorWest`) west, his two lit layers lying flat, and Monty and his hat cut where the names hide him.
 */
export const SPRITE_BLOCKS = { monty: 0x30, hat: 0x34, viktor: 0x38, viktorWest: 0x40, viktorFallen: 0x48, hidden: 0x4a, hiddenHat: 0x4b } as const;
/** Rows from the top of Monty's sprite block to the soles of his feet (his pictures leave the rest of the block empty). */
export const MONTY_HEIGHT = 15;
/** Sprite-enable bits: Monty's two sprites, Viktor's four (2 to 5). */
export const MONTY_BITS = 0x03, VIKTOR_BITS = 0x3c;
/** Monty's walking pictures (the right-facing half of his set: pointers $54-$57). */
const WALK = [0x54, 0x55, 0x56, 0x57] as const;
/** Frames: Monty takes a step every six, Viktor every eight walking and every four running. */
const SCROLL_SPEED = 2;
const STEP = 6, VIKTOR_STEP = STEP + 2, VIKTOR_RUN = 4;

/** Viktor's layers drawn lying flat when he trips: his coat and his fur (his hat and star fly off). */
const FALLEN_LAYERS: readonly string[] = ['k', 'f'];

/** A 24-pixel-wide sprite block turned round (he walks east, his pictures face the other way). */
function mirrored(block: Uint8Array): Uint8Array {
  const out = new Uint8Array(64);
  for (let r = 0; r < 21; r++) {
    for (let x = 0; x < 24; x++) {
      if (((block[r * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) === 0) continue;
      const m = 23 - x;
      out[r * 3 + (m >> 3)] = (out[r * 3 + (m >> 3)] ?? 0) | (0x80 >> (m & 7));
    }
  }
  return out;
}

/** The title's story: what the scroller says (colours 0-7; no apostrophe: the scroller's letters have none). */
export const STORY: readonly Passage[] = [
  { colour: WHITE, text: 'INTERMOLE HAS FOUND MONTY ON MONTOS...  ' },
  { colour: CYAN, text: 'MONTY FLEES EAST...  ' },
  { colour: RED, text: 'BUT RUSSIAN OPERATIVE VIKTOR VOLE IS HOT ON HIS TRAIL...  ' },
  { colour: YELLOW, text: 'THE LONG WAY ROUND: MOSCOW TO RIO...  ' },
  { colour: WHITE, text: 'GOOD LUCK!' },
];

export class MapTitle implements TitleScreen {
  readonly table = Uint8Array.from([0x30, 0x30, 0x30, 0x30, 0x30]);
  readonly fine = { top: 0, lines: 0 };
  readonly phase = 0;
  private readonly scroller: StripScroller;
  private saved: { mc1: number; mc2: number } | null = null;
  private readonly art: TitleArt;
  private frames = 0;
  /** The background's lines: black, and the sea's blue behind the map's strip. */
  readonly backdrop = new Surface(320, 200, SKY);

  /** `bank` is the game's bank image (its lettering, and what `leave` puts back), `worn` Monty in his ushanka. */
  constructor(private readonly g: TitleGame, private readonly sound: TitleSound, private readonly bank: Uint8Array, private readonly worn: Worn) {
    this.scroller = new StripScroller(bank, STORY);
    this.art = buildTitleArt(bank);
    this.backdrop.fillRect(0, this.art.sea.top, 320, this.art.sea.height, SEA);
  }

  start() {
    const g = this.g;
    this.frames = 0;
    this.scroller.reset();
    if (this.sound.musicOn()) this.sound.song(0); else this.sound.stop();
    this.saved ??= { mc1: g.vic.mc1, mc2: g.vic.mc2 };
    g.vic.border = g.vic.background = SKY;
    g.vic.mc1 = MC1; g.vic.mc2 = MC2; g.vic.multicolourChars = true;
    g.vic.enable = 0;
    g.mem.set(this.art.chars, 0);
    g.mem.fill(0, SCREEN, SCREEN + 1024);
    g.col.fill(1);
    g.mem.set(this.art.screen, SCREEN);
    g.col.set(this.art.colour, 0);
    this.scroller.draw(g.mem, this.art.scrollerCodes, g.col, ROWS.scroller * 40);
    this.placeSprites();
    this.walk();
  }

  /** The sprite blocks: his four walking pictures and their hats, turned to face east. */
  private placeSprites() {
    const v = this.g.vic;
    WALK.forEach((ptr, i) => {
      const body = this.worn.monty.find((m) => m.ptr === ptr);
      const hat = this.worn.hat.find((h) => h.ptr === ptr);
      if (!body || !hat) throw new Error(`no ushanka picture for Monty's $${ptr.toString(16)}`);
      this.g.mem.set(mirrored(body.block), (SPRITE_BLOCKS.monty + i) * 64);
      this.g.mem.set(mirrored(hat.block), (SPRITE_BLOCKS.hat + i) * 64);
    });
    v.multicolour = 0; v.priority = 0; v.expandX = 0; v.expandY = 0;
    v.sprites[0].colour = 1;
    v.sprites[1].colour = HAT_COLOUR;
    VIKTOR_LAYERS.forEach((layer) => {
      for (let pose = 0; pose < VIKTOR_POSES; pose++) {
        const at = (layer.sprite - 2) * VIKTOR_POSES + pose, east = viktorBlock(layer, pose);
        this.g.mem.set(east, (SPRITE_BLOCKS.viktor + at) * 64);
        this.g.mem.set(mirrored(east), (SPRITE_BLOCKS.viktorWest + at) * 64);
      }
      const lying = FALLEN_LAYERS.indexOf(layer.key);
      if (lying >= 0) this.g.mem.set(viktorFallenBlock(layer), (SPRITE_BLOCKS.viktorFallen + lying) * 64);
      v.sprites[layer.sprite].colour = layer.colour;
    });
  }

  /** The figures this frame (title-chase.ts): nobody, or Monty and maybe Viktor. */
  private walk() {
    const { scene, f } = sceneAt(this.frames);
    const at = chaseAt(scene, f);
    const v = this.g.vic;
    v.enable = 0;
    if (at === null) return;
    this.drawMonty(at.monty, f);
    if (at.viktor !== null) this.drawViktor(at.viktor, f);
  }

  /** Monty: his feet on the route (or `drop` below it), a pace while he moves; the parts of him behind a name cut away. */
  private drawMonty(m: MontyAt, f: number) {
    const v = this.g.vic;
    const at = routeAt(m.d / ROUTE_LENGTH);
    const pose = m.moving ? Math.floor(f / STEP) % WALK.length : 0;
    const bob = m.moving && pose % 2 === 1 ? 1 : 0;
    const x = Math.round(at.x) - 8, y = Math.round(at.y) + Math.round(m.drop) - MONTY_HEIGHT - bob;
    const hat = this.worn.hat.find((h) => h.ptr === WALK[pose]);
    const dx = hat ? -hat.dx : 0, dy = hat ? hat.dy : 0;
    v.enable |= MONTY_BITS;
    const body = this.behindNames(SPRITE_BLOCKS.monty + pose, x, y, SPRITE_BLOCKS.hidden);
    const cap = this.behindNames(SPRITE_BLOCKS.hat + pose, x + dx, y + dy, SPRITE_BLOCKS.hiddenHat);
    v.sprites[0].ptr = body; v.sprites[0].x = x + 24; v.sprites[0].y = y + 50;
    v.sprites[1].ptr = cap; v.sprites[1].x = x + dx + 24; v.sprites[1].y = y + dy + 50;
  }

  /**
   * Block `ptr` drawn with its top left at (x, y) on the picture, behind the map's names: where a name's cells cover it, its pixels are
   * cleared into `spare` (a copy made in software, as a C64 game would) and that is the block to show; otherwise `ptr` itself.
   */
  private behindNames(ptr: number, x: number, y: number, spare: number): number {
    const over = this.art.labels.filter((l) => x < (l.col + l.name.length) * 8 && x + 24 > l.col * 8 && y < (ROWS.map + l.row + 1) * 8 && y + 21 > (ROWS.map + l.row) * 8);
    if (over.length === 0) return ptr;
    const out = this.g.mem.slice(ptr * 64, ptr * 64 + 64);
    for (const l of over) {
      const top = (ROWS.map + l.row) * 8, left = l.col * 8, right = (l.col + l.name.length) * 8;
      for (let r = Math.max(0, top - y); r < Math.min(21, top + 8 - y); r++) {
        for (let c = Math.max(0, left - x); c < Math.min(24, right - x); c++) out[r * 3 + (c >> 3)] = (out[r * 3 + (c >> 3)] ?? 0) & ~(0x80 >> (c & 7));
      }
    }
    this.g.mem.set(out, spare * 64);
    return spare;
  }

  /** Viktor: standing, walking or running (his legs quicker), facing either way, or lying flat; his hat and star off his head when they fly. */
  private drawViktor(w: ViktorAt, f: number) {
    const v = this.g.vic;
    const at = routeAt(w.d / ROUTE_LENGTH);
    const pose = w.moving && !w.fallen ? Math.floor(f / (w.running ? VIKTOR_RUN : VIKTOR_STEP)) % VIKTOR_POSES : 0;
    const bob = w.moving && pose === 1 ? 1 : 0;
    const x = Math.round(at.x) - 12 + 24, y = Math.round(at.y) - VIKTOR_HEIGHT - bob + 50;
    const hat = w.hat === null ? null : { at: routeAt(w.hat.d / ROUTE_LENGTH), lift: w.hat.lift };
    v.enable |= VIKTOR_BITS;
    for (const layer of VIKTOR_LAYERS) {
      const s = v.sprites[layer.sprite];
      const lying = FALLEN_LAYERS.indexOf(layer.key);
      if (hat !== null && lying < 0) {
        // the hat and its star, upright, wherever they are
        s.ptr = SPRITE_BLOCKS.viktor + (layer.sprite - 2) * VIKTOR_POSES;
        s.x = Math.round(hat.at.x) - 12 + 24; s.y = Math.round(hat.at.y) - VIKTOR_HEIGHT + HAT_WORN_LIFT - Math.round(hat.lift) + 50;
        continue;
      }
      s.ptr = w.fallen && lying >= 0 ? SPRITE_BLOCKS.viktorFallen + lying
        : (w.facing === 'east' ? SPRITE_BLOCKS.viktor : SPRITE_BLOCKS.viktorWest) + (layer.sprite - 2) * VIKTOR_POSES + pose;
      s.x = x; s.y = y;
    }
  }

  frame(input: TitleInput): 'start' | null {
    this.scroller.step(SCROLL_SPEED);
    this.scroller.draw(this.g.mem, this.art.scrollerCodes, this.g.col, ROWS.scroller * 40);
    this.frames++;
    this.walk();
    return input.fire ? 'start' : null;
  }

  leave() {
    this.g.vic.enable = 0;
    this.g.vic.multicolourChars = false;
    if (this.saved) { this.g.vic.mc1 = this.saved.mc1; this.g.vic.mc2 = this.saved.mc2; this.saved = null; }
    this.g.mem.set(this.bank);
  }
}
