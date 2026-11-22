import type { TitleGame, TitleInput, TitleScreen, TitleSound } from '../../montyotr/src/title';
import { SCREEN } from '../../shared/monty/screen';
import type { Worn } from './art/costume';
import { HAT_COLOUR } from './art/hat';
import { buildTitleArt, CYAN, MC1, MC2, ROUTE_LENGTH, routeAt, ROWS, SKY, WHITE, YELLOW, type TitleArt } from './title-art';
import { StripScroller, type Passage } from './title-scroll';

/**
 * Do Svidaniya Monty's title screen (the picture is title-art.ts): the logo over the world map from Montos to Rio, Monty in his
 * ushanka walking the dotted route on a loop (two sprites, his picture and his hat, turned to face east), the story scroller
 * under the map, ENTER CONTINUE's line (`STRIP_Y`) under that and the credits at the foot, Hubbard's tune playing. It takes
 * the game's characters, screen and sprites, and gives them back (`leave`).
 */

/** Where ENTER CONTINUE's line goes: the top, in pixels, of the empty row under the scroller. */
export const STRIP_Y = ROWS.strip * 8;

/** The sprite blocks the title's Monty and hat use: blocks the bank leaves empty ($30-$37: where a room's enemies go, none yet). */
export const SPRITE_BLOCKS = { monty: 0x30, hat: 0x34 } as const;
/** Monty's walking pictures (the right-facing half of his set: pointers $54-$57). */
const WALK = [0x54, 0x55, 0x56, 0x57] as const;
/** Frames: a step every six, a pixel and a bit a frame; he stands at Rio `STAND` frames and is back at Montos after `GAP` more. */
const SCROLL_SPEED = 2;
const STEP = 6, SPEED = 0.7, GAP = 30;
export const STAND = 90;
export const WALK_FRAMES = Math.ceil(ROUTE_LENGTH / SPEED);

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
  { colour: YELLOW, text: 'DO SVIDANIYA MONTY.  ' },
  { colour: WHITE, text: 'INTERMOLE HAS FOUND MONTY ON HIS ISLAND OF MONTOS.  ' },
  { colour: CYAN, text: 'EUROPE IS NO LONGER SAFE.  ' },
  { colour: WHITE, text: 'SO MONTY HEADS EAST, OUT OF THE REACH OF INTERMOLE, THE LONG WAY ROUND:  ' },
  { colour: YELLOW, text: 'MOSCOW, THE TRANS SIBERIAN, THE GREAT WALL, A JUNK TO JAPAN, A CARGO SHIP TO HAWAII, A PARACHUTE INTO THE ANDES, A RIVERBOAT DOWN THE AMAZON, AND RIO.  ' },
  { colour: WHITE, text: 'FIND THE KEYS, WATCH THE TIMING, LISTEN FOR THE MUSIC.  ' },
  { colour: CYAN, text: 'WITH THANKS TO PETER HARRAP, ROB HUBBARD AND EVERYONE AT GREMLIN.  ' },
  { colour: YELLOW, text: 'GOOD LUCK!' },
];

export class MapTitle implements TitleScreen {
  readonly table = Uint8Array.from([0x30, 0x30, 0x30, 0x30, 0x30]);
  readonly fine = { top: 0, lines: 0 };
  readonly phase = 0;
  private readonly scroller: StripScroller;
  private saved: { mc1: number; mc2: number } | null = null;
  private readonly art: TitleArt;
  private frames = 0;

  /** `bank` is the game's bank image (its lettering, and what `leave` puts back), `worn` Monty in his ushanka. */
  constructor(private readonly g: TitleGame, private readonly sound: TitleSound, private readonly bank: Uint8Array, private readonly worn: Worn) {
    this.scroller = new StripScroller(bank, STORY);
    this.art = buildTitleArt(bank);
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
  }

  /** Where Monty is this frame: his feet on the route, a pace along it, then standing at Rio, then gone for a moment. */
  private walk() {
    const cycle = WALK_FRAMES + STAND + GAP, f = this.frames % cycle;
    const v = this.g.vic;
    if (f >= WALK_FRAMES + STAND) { v.enable = 0; return; }
    const at = routeAt(Math.min(f, WALK_FRAMES) / WALK_FRAMES);
    const walking = f < WALK_FRAMES;
    const pose = walking ? Math.floor(f / STEP) % WALK.length : 0;
    const bob = walking && pose % 2 === 1 ? 1 : 0;
    const x = Math.round(at.x) - 12, y = Math.round(at.y) - 21 - bob;
    const hat = this.worn.hat.find((h) => h.ptr === WALK[pose]);
    const dx = hat ? -hat.dx : 0, dy = hat ? hat.dy : 0;
    v.enable = 3;
    v.sprites[0].ptr = SPRITE_BLOCKS.monty + pose; v.sprites[0].x = x + 24; v.sprites[0].y = y + 50;
    v.sprites[1].ptr = SPRITE_BLOCKS.hat + pose; v.sprites[1].x = x + dx + 24; v.sprites[1].y = y + dy + 50;
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
