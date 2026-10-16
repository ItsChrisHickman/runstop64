/**
 * The toy factory, as the game keeps it (see re/README.md).
 *
 * Thing is on level $5F (0-3: I-IV) at screen $5E along it: 0 is the lift, odd screens are
 * corridors (all alike, 120 characters long), even ones are rooms ($20 = $5E / 2 - 1 + 4 * $5F,
 * 0-15; room 15 is the goblin's). Every screen is a strip wider than the picture, scrolled
 * sideways: its map is drawn into pages $E000-$F4FF (a page a row, a byte a column), and the
 * picture shows 40 columns of it from $19. Thing's sprite x is $1D * 2, his y $1E.
 */
export interface Place { level: number; screen: number; x: number; y: number }

/** Where Thing is: level, screen, x (in his own units, two pixels, from the strip's left) and y. */
export const place = (ram: Uint8Array): Place => ({ level: ram[0x5f], screen: ram[0x5e], x: ram[0x19] * 4 + ram[0x1d], y: ram[0x1e] });

/** The room on screen $5E of level $5F (or null: a corridor or the lift). */
export const roomOf = (level: number, screen: number) => (screen > 0 && !(screen & 1) ? (screen >> 1) - 1 + 4 * level : null);
