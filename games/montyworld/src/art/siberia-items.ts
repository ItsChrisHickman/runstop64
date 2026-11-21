/**
 * Siberia's items for Monty Mole: World Tour (region 2): the miner's lamp and the ticket (the key items), the pelmeni (the food in
 * place of the cupcake) and the mine cart's two sprites. Hires sprite blocks as Moscow's items are (creatures.ts), drawn in the
 * same manner: a solid shape with the detail cut into it.
 */
import { itemBlock, spriteBlock } from './pixels';
import { over, Raster } from './raster';
import type { NewItem } from './types';

/** A miner's lamp: a cap with a ring, a round glass globe with a flame in it, a heavy base, rays of light to each side. */
function lamp(): NewItem {
  const r = new Raster(16, 16);
  r.rect(6, 0, 9, 0); r.rect(6, 1, 6, 1); r.rect(9, 1, 9, 1); // the ring to carry it by
  r.rect(5, 2, 10, 3); // the cap
  r.ellipse(7.5, 8, 3.9, 4.4); // the globe
  r.ellipse(7.5, 8, 2.6, 3.2, false); // the glass, dark inside
  r.rect(7, 8, 8, 10); r.rect(7, 6, 7, 7); // the flame
  r.rect(4, 12, 11, 15); // the base
  r.rect(5, 13, 10, 13, false);
  for (const y of [6, 8, 10]) { r.rect(0, y, 1, y); r.rect(14, y, 15, y); } // the rays, dashes of light each side
  return { block: itemBlock('lamp', r.rows()), colour: 7 };
}

/** A railway ticket: a card with its stub torn off by a row of holes, lines of print, a punched star and a stripe. */
function ticket(): NewItem {
  const r = new Raster(16, 16);
  r.rect(0, 3, 15, 12);
  r.cut(['#', '#', '#', '#', '#', '#', '#', '#'], 4, 4); // the tear: a dark column of holes
  for (const y of [4, 6, 8, 10]) r.set(4, y, true);
  r.rect(6, 5, 13, 5, false); r.rect(6, 7, 11, 7, false); // lines of print
  r.cut(['.#.', '###', '.#.'], 11, 8); // the punched hole
  r.rect(0, 11, 15, 11, false); // the stripe
  r.rect(0, 3, 0, 3, false); r.rect(15, 3, 15, 3, false); r.rect(0, 12, 0, 12, false); r.rect(15, 12, 15, 12, false); // the corners, clipped
  return { block: itemBlock('ticket', r.rows()), colour: 14 };
}

/** Pelmeni, Siberia's dumplings: three plump pleated pockets of dough heaped on a plate. White, as the cupcake is. */
function pelmeni(): NewItem {
  const r = new Raster(16, 16);
  const plate = new Raster(16, 16);
  plate.ellipse(7.5, 13, 7.5, 2.4);
  const dumpling = (cx: number, cy: number) => {
    const d = new Raster(16, 16);
    d.ellipse(cx, cy, 3.6, 3.4);
    d.triangle(cx - 3.4, cy + 1, cx + 3.4, cy + 1, cx, cy - 4.2, false);
    d.ellipse(cx, cy + 0.5, 3.6, 3);
    d.rect(Math.round(cx) - 3, Math.round(cy) - 1, Math.round(cx) + 3, Math.round(cy) - 1); // the pleated edge, a ridge across
    return d;
  };
  over(r, dumpling(4.5, 10)); over(r, dumpling(11, 10)); over(r, dumpling(7.8, 6));
  r.rect(0, 12, 15, 15, false);
  r.stamp(['..####..####..##', '.##############.'], 0, 12);
  r.rect(3, 14, 12, 14);
  r.cut(['#.#.'], 3, 7); r.cut(['#.#.'], 9.5, 7); r.cut(['#.#.'], 6, 3);
  return { block: itemBlock('pelmeni', r.rows()), colour: 1 };
}

/** The cart's upper sprite: the hoist's chain hanging from a bracket, over Monty's head. */
function cartTop(): Uint8Array {
  const r = new Raster(24, 21);
  r.rect(4, 0, 19, 1);
  for (let y = 2; y < 21; y++) if (y % 4 !== 3) r.rect(11, y, 12, y); // the chain, link by link
  for (const y of [5, 13]) r.rect(10, y, 13, y);
  return spriteBlock('cart top', r.rows());
}

/** The cart's lower sprite: the front of a coal tub with its rim, its rivets and planks, on two wheels (Monty stands in it). */
function cartBottom(): Uint8Array {
  const r = new Raster(24, 21);
  r.rect(0, 9, 23, 10); // the rim
  r.rect(1, 11, 22, 17); // the tub's front
  for (const x of [5, 11, 17]) r.rect(x, 12, x, 16, false); // the planks' joints
  for (const x of [2, 8, 14, 20]) r.set(x, 12, false);
  r.rect(0, 9, 0, 10, true);
  for (const cx of [5, 18]) { r.disc(cx, 18, 2.9); r.rect(cx, 18, cx, 18, false); }
  r.rect(1, 17, 22, 17);
  r.rect(0, 20, 23, 20);
  return spriteBlock('cart bottom', r.rows());
}

export const SIBERIA_ITEMS = {
  lamp: lamp(),
  ticket: ticket(),
  pelmeni: pelmeni(),
} as const satisfies Record<string, NewItem>;

export const CART = { top: cartTop(), bottom: cartBottom(), colour: 8 } as const;
