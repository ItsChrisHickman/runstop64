/**
 * The picture on c64kit's renderer: the Spectrum's 256 x 192 centred in its 320 x 200 surface, the border round it (black: the original never changes it), in the
 * Spectrum's own colours (games/shared/spectrum.ts) in both looks.
 *
 * ORIGINAL puts the game's screen on the surface once a pass (25 a second in the rooms, 50 in the opening), nothing else: the sprites are in it, over the scenery, in
 * the colour of the cells they are over (the colour clash).
 * ENHANCED puts the scenery (the screen without the sprites: scenery.ts) on the surface and the sprites on the renderer, each whole in one colour, and moves them
 * smoothly between the passes the way Moley Christmas's view does (c64kit's `Smoothed`): the logic steps once in two frames, so the view is told the step (`ViewStep`:
 * `fresh` in the frame the step happened, `frames` how long it lasts) and glides across all of it, at whatever rate `render(alpha)` is called. The logic is not touched.
 */
import { EVERY_FRAME, Smoothed, Surface, TRANSPARENT, makePalette, type Renderer, type SpriteHandle, type ViewStep } from 'c64kit';
import { centre, PICTURE_HEIGHT, PICTURE_LEFT, PICTURE_TOP, PICTURE_WIDTH, pixelsOf, SPECTRUM_PALETTE } from '../../shared/spectrum';
import type { FlowStep, Shot } from './flow';
import type { Game } from './game';
import { spritePlaces, sceneryBits, SPRITE_SIZE, type SpritePlace } from './scenery';

export type Look = 'original' | 'enhanced';

export const SPECTRUM_COLOURS = makePalette(SPECTRUM_PALETTE);
/** The border is black in play (and nothing else in the game sets another). */
export const BORDER = 0;
/** The stardust is wider, its specks bigger and its light stronger than on a C64 picture: the Spectrum's colours are bright and busy. */
export const SPARKLE_SIZE = 2, SPARKLE_GAIN = 2;
/** A sprite that moves further than this between two passes is not gliding but placed (a new thing, a jump to the other side). */
const GLIDE_LIMIT = 12;

/** One entity's sprite on the renderer, and what it needs to glide. */
interface Slot {
  readonly handle: SpriteHandle;
  readonly image: Surface;
  readonly glide: Smoothed;
  /** what the image shows now: the picture's address and colour, or '' */
  shown: string;
  x: number;
  y: number;
  /** the step it was last placed in */
  seen: number;
}

/** Monty, the six things of the room: seven sprites at most. */
const SLOTS = 7;

export class MontyView {
  look: Look;
  private readonly slots: Slot[];
  private readonly scratch = new Uint8Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  private readonly plain = new Uint8Array(6144);
  private step = 0;
  private span = 1;
  private into = 0;

  constructor(readonly renderer: Renderer, public game: Game, look: Look = 'enhanced') {
    this.look = look;
    renderer.palette = SPECTRUM_COLOURS;
    this.slots = Array.from({ length: SLOTS }, (_, i) => {
      const image = new Surface(SPRITE_SIZE, SPRITE_SIZE, TRANSPARENT);
      image.palette = SPECTRUM_COLOURS;
      const handle = renderer.createSprite(10 - i); // (Monty, entity 0, in front)
      handle.surface = image;
      return { handle, image, glide: new Smoothed(), shown: '', x: 0, y: 0, seen: -1 };
    });
  }

  /** Show another game (one continued or begun): the sprites start afresh. */
  setGame(game: Game): void {
    this.game = game;
    this.hide();
  }

  /** The surface and the sprites for the game as it is now. `step`: see the top of the file. */
  update(step: ViewStep = EVERY_FRAME): void {
    const g = this.game;
    const places = this.look === 'enhanced' ? spritePlaces(g) : [];
    this.paint(this.look === 'enhanced' ? sceneryBits(g, this.plain) : g.field.screen, g.field.attrs);
    if (this.look === 'original') {
      this.hide();
      return;
    }
    if (step.fresh) { this.step++; this.into = 0; this.span = step.frames; } else this.into++;
    this.slots.forEach((slot, i) => {
      const place = places.find((p) => p.entity === i);
      if (place === undefined) { slot.handle.visible = false; slot.seen = -1; return; }
      this.dress(slot, place);
      slot.handle.visible = true;
      if (!step.fresh) {
        if (slot.seen < 0) { slot.glide.reset(place.x, place.y); slot.seen = this.step; slot.x = place.x; slot.y = place.y; }
        return;
      }
      // (a thing that was not there, and one that jumped, are put where they are, not glided to)
      const reset = slot.seen !== this.step - 1 || Math.abs(place.x - slot.x) > GLIDE_LIMIT || Math.abs(place.y - slot.y) > GLIDE_LIMIT;
      if (reset) slot.glide.reset(place.x, place.y); else slot.glide.push(place.x, place.y);
      slot.x = place.x; slot.y = place.y; slot.seen = this.step;
    });
  }

  /**
   * What a step of the flow (flow.ts) shows, on the frame `into` of its `step.frames` (0 the first): a held picture is drawn on the first frame, the game as it is with its
   * sprites gliding across a pass (ENHANCED) on each. `repaint`: a held picture is drawn on every frame (a front end that draws over the surface, as the pause screen does,
   * needs the picture back).
   */
  present(step: FlowStep, into: number, repaint = false): void {
    if (step.shot !== null) {
      if (into === 0 || repaint) this.show(step.shot);
      return;
    }
    this.update({ fresh: into === 0 && step.fresh, frames: step.frames });
  }

  /** A picture held for some frames (a title, a death): drawn as it is, the sprites exactly where they are. */
  show(shot: Shot): void {
    this.paint(this.look === 'enhanced' ? shot.plain : shot.bits, shot.attrs);
    if (this.look === 'original' || shot.sprites.length === 0) {
      this.hide();
      return;
    }
    this.slots.forEach((slot, i) => {
      const place = shot.sprites.find((p) => p.entity === i);
      slot.seen = -1;
      if (place === undefined) { slot.handle.visible = false; return; }
      this.dress(slot, place);
      slot.glide.reset(place.x, place.y);
      slot.handle.visible = true;
      slot.handle.x = PICTURE_LEFT + place.x;
      slot.handle.y = PICTURE_TOP + place.y;
    });
  }

  /** Sparkles on places in the picture's pixels (shifted into the surface); none: no sparkles. */
  sparkle(places: readonly { readonly x: number; readonly y: number }[]): void {
    this.renderer.sparkles.set(places.map((h) => ({ x: PICTURE_LEFT + h.x, y: PICTURE_TOP + h.y, size: SPARKLE_SIZE, gain: SPARKLE_GAIN })));
  }

  /** Draw a frame, `alpha` of the way from this pass to the next (0-1) for the sprites. */
  render(alpha: number): void {
    if (this.look === 'enhanced') {
      for (const slot of this.slots) {
        if (!slot.handle.visible || slot.seen < 0) continue;
        const p = slot.glide.at(Math.min(1, (this.into + alpha) / this.span), this.renderer.snap);
        slot.handle.x = PICTURE_LEFT + p.x;
        slot.handle.y = PICTURE_TOP + p.y;
      }
    }
    this.renderer.render();
  }

  // ---- parts ---------------------------------------------------------------------------------------------

  private paint(bits: Uint8Array, attrs: Uint8Array): void {
    const r = this.renderer;
    r.palette = SPECTRUM_COLOURS;
    r.border = BORDER;
    r.background = BORDER;
    centre(pixelsOf(bits, attrs, this.scratch, false), BORDER, r.screen.pixels);
    r.screen.version++;
  }

  private hide(): void {
    for (const slot of this.slots) { slot.handle.visible = false; slot.seen = -1; }
  }

  /** Make the slot's image show the sprite, if it does not already. */
  private dress(slot: Slot, place: SpritePlace): void {
    const key = `${place.address}:${place.colour}`;
    if (slot.shown === key) return;
    slot.shown = key;
    for (let r = 0; r < SPRITE_SIZE; r++) {
      for (let c = 0; c < SPRITE_SIZE; c++) {
        const set = ((place.image[r * 2 + (c >> 3)] ?? 0) & (0x80 >> (c & 7))) !== 0;
        slot.image.pixels[r * SPRITE_SIZE + c] = set ? place.colour : TRANSPARENT;
      }
    }
    slot.image.version++;
  }
}
