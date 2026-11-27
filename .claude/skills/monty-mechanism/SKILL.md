---
name: monty-mechanism
description: Add or change a mechanism of a Monty game on Monty on the Run's engine (a timed hazard, a mover, a gate, a ride): a module in games/montyotr/src driven by a list in MontyData, never a special case in game.ts. Use before writing a new mechanism, extending one (pulses, icicles, rollers, tunnels, cracks, floats...), or testing one in a region's *-mechanisms.ts.
---

# A Monty mechanism

A mechanism is **data plus a module**: a spec type in `MontyData` (`games/montyotr/src/montydata.ts`), a list of specs in the game's
value, and a module in `games/montyotr/src` with an `init` (the room loads) and an `update` (one frame). Monty on the Run's lists are
empty, so it plays exactly as before. Never `if (roomId === ...)` in `game.ts` (README section 3). First look at the ~25 modules that
exist (`ls games/montyotr/src`): extend one with an optional field before adding a new one (`calmedBy` on pulses, `passes` on rollers).

## The pattern, from pulses.ts and rollers.ts

1. **The spec** (`montydata.ts`): every entry names its `room`; the rest is plain numbers in playfield cells or frames.
   ```ts
   export interface PulseSpec { room: number; col: number; row: number; cols: number; rows: number;
     period: number; start: number; warn: number; live: number; offset?: number; idle: number; warnCode: number; liveCode: number; spent: number }
   export interface RollerSpec { room: number; sprite: number; path: readonly (readonly [col: number, row: number])[]; speed: number; every: number; start: number; frames: readonly number[]; colour: number }
   ```
   and a list in `MontyData`: `pulses: readonly PulseSpec[]`, `rollers: readonly RollerSpec[]`. Add `<yours>: []` to `motr.ts` and to
   `tools/new-game.mjs`'s template.
2. **The room's state**, on `Game` (`game.ts`): `pulses: PulseState[] = []`, `rollers: RollerState[] = []`, cleared where a room unloads
   (beside `this.pulses = []`). State holds the spec's **index** in the data's list and numbers only (`{ index, t, drawn }`):
   `game-copy.ts` copies a game field by field for the bots, so no references to data, no closures.
3. **The module**: `pulseInit(g)` / `rollerInit(g)` filter `g.data.<list>` by `e.room === g.roomId` into state; `pulseUpdate(g)` /
   `rollerUpdate(g)` step `t`, draw (room characters through `g.setRoomChar`, or a sprite through `g.sx/sy/sptr/scol/enable`) and kill by
   setting `g.actionCounter = 1` when a live cell or box meets Monty (`montyOver`, `meetsMonty` in `cells.ts`). Time counts from the
   room's loading, so a room is the same each time he comes in. Keep pure helpers exported for tests (`pulsePhase`, `pulseCode`,
   `rollerAt`) and a "meets" query for other modules (`pulseLiveOver`, `rollerMeets`: a pursuer flying into them).
4. **game.ts calls it** in two places only: `xInit(this)` in the room load (beside `pulseInit(this)`, `rollerInit(this)`) and
   `xUpdate(this)` in the frame after Monty's move (beside `pulseUpdate(this)`). A sprite-drawn one adds its mask to the collision
   sprites (`rollerSprites(this)` in the mask line).
5. **The bot's key**: add the state's phase to `keyOf` in `games/shared/monty/test/bot.ts` (each thing by its own period, coarsened
   `>> 3`: `r${t % every >> 3}`), or the search dedups states that differ and misses ways (LESSONS "Build pitfalls"). That file is
   shared: coordinate before touching it.
6. **Saves**: room-scoped state needs none (the room reloads). State that must outlive a death or a save is a hidden find: a slot in
   `specialItems` after every room's (montyworld `data.ts` `HIDDEN`, read through `g.siCollected`), counted in `uncountedItems`; a
   lever or switch flips it (`levers.ts`). Never a new save field for it.
7. **C64 limits**: sprites 8 a room (`budget.ts`), characters through the room's palette codes (1-8), a decoration kind a byte.

## Where the list is declared

A region exports its entries, each a literal naming its room (the change detector maps lines to rooms by `room:`):
`export const PULSES = [...CRACKER_PULSES, ...ARM_PULSES]` in `games/montyworld/src/china.ts` (built from `codeOf(PALETTE, 'K')` for its
characters); `ROLLERS` in `andes.ts`. `games/montyworld/src/data.ts` concatenates every region's: `pulses: [...PULSES, ...DOOR_PULSES, ...]`,
`rollers: [...ROLLERS, ...ROCKS, ...]`. One that takes an item number is a function of it (`spitPulses(PANPIPES)`).

## The test

In the region's `games/montyworld/test/<region>-mechanisms.ts`, one `SCOPE.section` per mechanism naming every room it enters, reads
or can wander into (template: `'the timed strikes: the hutong\'s firecrackers'` in `china-mechanisms.ts`):

```ts
SCOPE.section([CHI.alley], 'the timed strikes: the hutong\'s firecrackers', () => {
  const s = at(CHI.alley, 3, 17);                          // mech-kit.ts: a game with Monty placed in the room, creatures out of the way
  check('the pure timing is the data\'s', pulsePhase(first, first.start) === 'warn');
  check('standing under it he dies as it goes off', diesAt(at(CHI.alley, 16, 9), NONE, first.period) >= 0);
  check('crossing once it is spent he lives', ...);         // both ways
});
```

Prove reachability and one-way pieces with the bot's search (recorded: `search` from `./search`, `--record` once after a change):
`search(from, goal, [aim], limit, weight) !== null` for a way, `=== null` for "no way" (a gate shut without its item:
`china-mechanisms.ts` 'the gates'). A tiny exhausted search means the key or the start is wrong before it means no way.
Run it scoped: `tools/wait-turn.sh && nice -n 15 node tools/test.mjs games/montyworld/test/<region>-mechanisms.ts --room <id>`.
Add an engine-level case to `games/montyworld/test/mechanisms.ts` only if the module itself is new.

## The shots

Look at it moving: `nice -n 15 node tools/test.mjs games/montyworld/test/rooms-sheet.ts /tmp/claude-0/renders/<job> --room <id>` (paths
traced), or the region's `<region>-shots.ts` on `shots-kit.ts` (`placed`, `shot`, `contactSheet`) for frames over a period
(`escalator-shots.ts`, `train-shots.ts` are small models). It must read at a glance, warn before it kills, run on its own (not only
when he stops), and be fair from every side (LESSONS "Every element has a playable purpose").
