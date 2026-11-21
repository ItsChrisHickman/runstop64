# Monty Mole: World Tour: changes from Monty on the Run

Monty Mole: World Tour is a new game (2026, `docs/worldtour-plan.md`) on the engine, tiles, sprites and music of **Monty on the Run** (Gremlin Graphics, Commodore 64, 1985): the engine in `games/montyotr/src` takes its game data as a value, and this game is a second data set (`games/montyworld/src/data.ts`), not a copy. "The original" below is Monty on the Run. It is **not in the directory yet** (`listed: false` in the registry; it loads at `#montyworld`) and only a skeleton so far: three placeholder rooms, two coins, a piece of cake. Anything that changes how the game *plays* or looks (or helps) beyond Monty on the Run's own is in ENHANCED, one switch (ENHANCED by default; ORIGINAL is the game as designed, without the helps); the rest is in both.

| Feature | The original | In this port | Default |
|---|---|---|---|
| **The world** | 52 rooms on a grid of 23 by 6 cells. | Rooms of our own on a grid of 50 by 3 cells (5 regions of about 10 rooms, west to east: for now three rooms in a row), made of Monty on the Run's tiles, sprites and music. The pause screen's map draws the wide grid in smaller cells to fit. | Always |
| **Monty and the rules** | Walk, somersault jump, ropes, coins (50), items (200), Mole Crushers, lifts, teleporters, five lives, the deaths. | The same code (`games/shared/monty`, `games/montyotr/src`), nothing added, nothing missing. | Always |
| **Pause screen, map, travel, back to room start, autosave, continue, grace** | The pause screen and map are ours in Monty on the Run. | The same, for this game's rooms. | Always |
| **ENHANCED: unlimited lives and continues** | Five lives, then game over. | A death takes no life (`games/shared/lives.ts`). | ENHANCED |
| **ENHANCED: safe respawn** | A death starts Monty again where he came into the room. | A death before he has had a moment on his feet there starts him again where he last came into a room and had that moment. | ENHANCED |

## Not changed

Monty's walk and jump, the coins and items and what they score, the enemies' paths, Rob Hubbard's tune and sound effects, the title screen's frame and lettering (the scroller says MONTY MOLE: WORLD TOUR with its credits).
