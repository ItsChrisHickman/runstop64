# Making a new Monty game: what Chris taught us

For any new Monty game on Monty on the Run's engine (`MontyData`, `runMonty`: see AGENTS.md's shared modules). Learned making
Do Svidaniya Monty (games/montyworld, 2026-11), from Chris playing each region. Read this before designing anything; every
builder and reviewer applies it. Game-specific plans keep their own decisions (`docs/<game>-plan.md`); what holds for every
Monty game lives here.

## The benchmark

- **Monty on the Run is the benchmark.** Monty's own moves are its (walk, jump arc, ropes, no steering in the air). Keep its
  quirks that make it fun (the Mole Crushers, a jetpack-like flight); leave out what frustrated (timed warps that send you back
  if you walk in at the wrong moment) and what bored (a vehicle section like the C5 street). New mechanisms should feel familiar
  but fresh: a timing to learn, seen at once, fair from every side. Nothing may feel like a glitch (an escalator must make sense
  from both ends; a ride never traps).
- **The route winds** as Monty on the Run's does: start one way, go down, circle back up, pass through rooms and double back to
  the ladder out; rooms crossed twice at different heights, dead ends holding items, ways an item opens elsewhere. Never a
  corridor, and never a closed box crossed by a ladder up and a ladder down. Study its exit grid before laying out a region.

## How it looks

- **A place reads at a glance as the place.** The one test for every room's screenshot: would a stranger name it? A train is
  carriages on rails with scenery passing; a landmark is drawn as the landmark (the Great Wall over hills, the Willow Pattern
  plate); a vehicle runs on through the screen's edges, never into a wall. Signs name a place; they never stand in for drawing
  it. The level is Monty on the Run's own: simply drawn, leaving a lot to the imagination, but its boat is a boat and its
  street is a road.
- **Not every room is a dungeon.** No frame walls or ceilings by habit: outdoor rooms open to the sky and run off the screen's
  edges; walls only where the place is indoors, shaped as that building.
- **No grey by default.** Each room picks a few bright, place-true colours on black; grey only where the thing is grey.
- **Monty on the Run's art manner:** solid shapes with black-line detail, no checkerboard dithering; bold cartoon creatures with
  big faces filling their 16x16 in one solid colour; recognisably of the place they're in.
- **Creatures are reused rarely** (a reused one should feel like a surprise): no creature in more than two rooms of a region.
- **A costume is worn, not stuck on:** small on his head above the eyes (a lei round the neck); his face always shows
  (`art/costume.ts` in montyworld finds his head per picture, and its test holds every costume to it).

## Words and sound

- **Names are plain and evocative first, a pun only when it lands** (Monty on the Run: THE HOUSE, SEWERAGE WORKS). A name that
  needs explaining is the wrong name. No James Bond puns. Check the room-name font draws every letter (it has no good Z).
- **No filler statistics** on titles, posters or credits. Credits are sourced, never invented; a new game says it is a new
  game, after the original it is built on.
- **References only to games Chris played and loves** (Willow Pattern, The Last Ninja, Jeff Minter's llamas); nothing he doesn't
  know, nothing that's a stretch.
- **Music:** Hubbard's own driver and tune; a region's version may change the scale and the instruments, never the tempo.
  Folk-tune breaks only from public-domain tunes, and only if they sound like part of the tune.

## How we build it

- **Plan first, together:** the story, the route, each region's places, items, costumes, food and mechanisms are agreed with
  Chris region by region before building. Expect him to correct geography and order; follow it exactly.
- **Pre-production runs ahead:** design docs and art for later regions can be made in parallel while earlier regions build;
  builders start from them.
- **Each region:** design, build with a bot that plays it through in both modes taking everything, then two adversarial reviews
  (design and play; engine and correctness), fixes, the full suite, ship. Monty on the Run must play exactly as before (its
  trace and title tests).
- **Chris plays it and his notes come fast:** keep a pass running for his notes alongside the build; write every lesson back
  into this file.
- **Go fast:** up to three tests at once, several agents in parallel (`tools/wait-turn.sh`). Never push to main while a ship
  step is merging.
