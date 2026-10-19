import { Vic, VicView, type Renderer } from 'c64kit';
import { Game } from './game';

/**
 * A game of Starquake and the picture it is drawn in: the VIC set up as the game uses it (a hi-res bitmap, the sprites behind its
 * pixels), the game over that VIC's memory, and the view that draws it into the renderer. The session (main.ts) has one for the
 * player's game, the ending's montage (ending.ts) another for its own.
 */
export class Stage {
  readonly vic = new Vic();
  game: Game;
  readonly view: VicView;

  constructor(renderer: Renderer) {
    const { vic } = this;
    vic.bitmap = true;
    vic.screenOffset = 0x1c00;
    vic.bitmapOffset = 0x2000;
    vic.priority = 0xff; // all sprites behind the bitmap's pixels ($D01B)
    this.game = new Game(vic.bank);
    this.view = new VicView(renderer, vic);
  }

  /** A game of nothing yet over the same picture (the montage's places each begin one). */
  fresh(): Game {
    this.game = new Game(this.vic.bank);
    return this.game;
  }

  /** The picture: the sprites as the game last wrote their registers (sprites 0-2 are BLOB, at sprite 0's place), shown if `sprites` (in play), and the room. */
  update(sprites: boolean) {
    const g = this.game, { vic } = this;
    for (let n = 0; n < 8; n++) {
      const r = vic.sprites[n];
      r.x = g.vic.x[n] | (g.vic.msb & (1 << n) ? 0x100 : 0);
      r.y = g.vic.y[n];
      r.ptr = g.sprites.ptr[n];
      r.colour = g.sprites.colour[n];
    }
    vic.enable = sprites ? g.vic.enable : 0;
    this.view.update();
  }
}
