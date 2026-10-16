import { imageCentre, spriteImage, type FrameCapture } from 'c64kit';
import type { CombatEvent } from '../../shared/native/combat';

/**
 * What Tal and the creatures feel (added for runstop64, ENHANCED's and ORIGINAL's presentation
 * alike: effects over the picture, never in it): the game's hurts and kills, noted as they
 * happen (collisions.ts) and placed on the screen with the sprites as the VIC drew them, as the
 * shared combat events (games/shared/native/combat.ts `playEvents` makes them effects and
 * sounds). The port keeps no state for them: nothing here reaches the game's memory.
 */
export type FeelEvent =
  /** Tal, or the armour, loses life or energy. */
  | { kind: 'hurt' }
  /** A creature (sprite 3-7) destroyed: by a stone, the Pulsar Beam, or the armour's touch. */
  | { kind: 'kill'; sprite: number };

/** The most notes kept if nothing collects them (checks that don't show effects). */
const KEPT = 16;

export function note(list: FeelEvent[], e: FeelEvent) {
  list.push(e);
  if (list.length > KEPT) list.shift();
}

/** Tal's sprite (the armour's too): the second is its colour layer. */
const HERO = 0;

/** Where Tal (or the armour) is in the picture (C64 screen pixels). */
export function heroAt(sprites: FrameCapture['sprites']) {
  const hero = sprites.find((s) => s.n === HERO);
  return hero ? imageCentre(spriteImage(hero)) : { x: 160, y: 100 };
}

/** The notes of a frame, placed with that frame's picture. */
export function placeFeel(sprites: FrameCapture['sprites'], notes: readonly FeelEvent[], frame: number): CombatEvent[] {
  const events: CombatEvent[] = [];
  const at = heroAt(sprites);
  for (const e of notes) {
    if (e.kind === 'hurt') { events.push({ kind: 'hurt', x: at.x, y: at.y, frame }); continue; }
    const s = sprites.find((q) => q.n === e.sprite);
    if (!s) continue; // (not drawn: nothing to show)
    const image = spriteImage(s), c = imageCentre(image);
    events.push({ kind: 'kill', x: c.x, y: c.y, image, sprite: e.sprite, frame });
  }
  return events;
}
