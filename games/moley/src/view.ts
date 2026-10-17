/**
 * The picture on c64kit's renderer: the Spectrum's 256 x 192 centred in its 320 x 200 surface (32 pixels either side, 4 above and
 * below), the border colour round it, the Spectrum's own colours (palette.ts) in both looks.
 *
 * ORIGINAL puts the display's screen on the surface once a logic pass (25 a second), nothing else: the sprites are in it.
 * ENHANCED puts the scenery on the surface and the entities on the renderer as sprites, each whole in its colour (`SPRITE_INK`), and moves them
 * smoothly between the passes the way Auf Wiedersehen Monty's view does (c64kit's `C64View`): the logic steps once in two frames,
 * so the view is told the step (`ViewStep`: `fresh` in the frame the step happened, `frames` how long it lasts) and glides across
 * all of it, at whatever rate `render(alpha)` is called. The logic is not touched; the sprites are only drawn in between.
 */
import { EVERY_FRAME, Smoothed, Surface, TRANSPARENT, makePalette, type Renderer, type SpriteHandle, type ViewStep } from 'c64kit';
import { Display, pixelsOf, type Shot, type SpritePlace } from './display';
import { SPRITE_INK, spriteImage, spritePixel, type Look } from './look';
import { PICTURE_HEIGHT, PICTURE_WIDTH } from './picture';
import { SPECTRUM_PALETTE } from './palette';

export const SPECTRUM_COLOURS = makePalette(SPECTRUM_PALETTE);
export const SURFACE_WIDTH = 320, SURFACE_HEIGHT = 200;
/** Where the Spectrum's picture sits in the surface. */
export const PICTURE_LEFT = (SURFACE_WIDTH - PICTURE_WIDTH) / 2, PICTURE_TOP = (SURFACE_HEIGHT - PICTURE_HEIGHT) / 2;
/** The border is black in play: the sound effects write `OUT ($FE)` with the border bits clear (`$A017`...) and nothing sets another. */
export const BORDER = 0;
const SPRITE_SIZE = 16;
/** A sprite that moves further than this between two passes is not gliding but placed (a new thing, a jump). */
const GLIDE_LIMIT = 12;

/** The 256 x 192 picture put in the middle of a 320 x 200 surface of border colour. */
export function centre(picture: Uint8Array, border: number, out: Uint8Array): Uint8Array {
  out.fill(border);
  for (let y = 0; y < PICTURE_HEIGHT; y++) out.set(picture.subarray(y * PICTURE_WIDTH, (y + 1) * PICTURE_WIDTH), (y + PICTURE_TOP) * SURFACE_WIDTH + PICTURE_LEFT);
  return out;
}

/** One entity's sprite on the renderer, and what it needs to glide. */
interface Slot {
  readonly handle: SpriteHandle;
  readonly image: Surface;
  readonly glide: Smoothed;
  /** what the image shows now (picture and facing), or '' */
  shown: string;
  x: number;
  y: number;
  /** the step it was last placed in */
  seen: number;
}

export class MoleyView {
  look: Look;
  private readonly slots: Slot[];
  private readonly scratch = new Uint8Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  private step = 0;
  private span = 1;
  private into = 0;

  constructor(readonly renderer: Renderer, readonly display: Display, look: Look = 'enhanced') {
    this.look = look;
    renderer.palette = SPECTRUM_COLOURS;
    this.slots = Array.from({ length: display.game.entities.length }, (_, i) => {
      const image = new Surface(SPRITE_SIZE, SPRITE_SIZE, TRANSPARENT);
      image.palette = SPECTRUM_COLOURS;
      const handle = renderer.createSprite(10 - i); // (Monty, entity 0, in front)
      handle.surface = image;
      return { handle, image, glide: new Smoothed(), shown: '', x: 0, y: 0, seen: -1 };
    });
  }

  /** The surface and the sprites for the display as it is now. `step`: see the top of the file. */
  update(step: ViewStep = EVERY_FRAME, flash = false): void {
    const d = this.display;
    this.paint(this.look === 'enhanced' ? d.plain() : d.bits, d.attributes(), flash);
    if (this.look === 'original') {
      this.hide();
      return;
    }
    if (step.fresh) { this.step++; this.into = 0; this.span = step.frames; } else this.into++;
    const places = this.places();
    this.slots.forEach((slot, i) => {
      const place = places[i];
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

  /** A picture held for some frames (a death picture): drawn as it is, the sprites exactly where they are. */
  show(shot: Shot): void {
    this.paint(this.look === 'enhanced' ? shot.plain : shot.bits, shot.attrs, false);
    if (this.look === 'original') {
      this.hide();
      return;
    }
    const places = this.entityPlaces(shot.sprites);
    this.slots.forEach((slot, i) => {
      const place = places[i];
      slot.seen = -1;
      if (place === undefined) { slot.handle.visible = false; return; }
      this.dress(slot, place);
      slot.glide.reset(place.x, place.y);
      slot.handle.visible = true;
      slot.handle.x = PICTURE_LEFT + place.x;
      slot.handle.y = PICTURE_TOP + place.y;
    });
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

  private paint(bits: Uint8Array, attrs: Uint8Array, flash: boolean): void {
    const r = this.renderer;
    r.palette = SPECTRUM_COLOURS;
    r.border = BORDER;
    r.background = BORDER;
    centre(pixelsOf(bits, attrs, this.scratch, flash), BORDER, r.screen.pixels);
    r.screen.version++;
  }

  private hide(): void {
    for (const slot of this.slots) { slot.handle.visible = false; slot.seen = -1; }
  }

  /** The sprites by entity number (the empty ones missing). */
  private places(): (SpritePlace | undefined)[] {
    return this.entityPlaces(this.display.sprites());
  }

  private entityPlaces(sprites: readonly SpritePlace[]): (SpritePlace | undefined)[] {
    const out: (SpritePlace | undefined)[] = new Array<SpritePlace | undefined>(this.slots.length).fill(undefined);
    for (const s of sprites) out[s.entity] = s;
    return out;
  }

  /** Make the slot's image show the sprite, if it does not already. */
  private dress(slot: Slot, place: SpritePlace): void {
    const key = `${place.frame}:${place.facingLeft ? 1 : 0}`;
    if (slot.shown === key) return;
    slot.shown = key;
    const image = spriteImage(place.frame, place.facingLeft);
    for (let r = 0; r < SPRITE_SIZE; r++) {
      for (let c = 0; c < SPRITE_SIZE; c++) slot.image.pixels[r * SPRITE_SIZE + c] = spritePixel(image, c, r) ? SPRITE_INK : TRANSPARENT;
    }
    slot.image.version++;
  }
}
