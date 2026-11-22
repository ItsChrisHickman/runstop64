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
  from both ends; a ride never traps). Climbs are easy: from anywhere at a rope's or ladder's foot Monty goes up, and from
  anywhere over its top he goes down; no overhang or narrow opening that only a pixel-perfect position clears (Chris on Moscow,
  2026-11-22). Every coin, item and creature on the way is passable with slack, not only by the bot's exact inputs.
- **The route winds** as Monty on the Run's does: start one way, go down, circle back up, pass through rooms and double back to
  the ladder out; rooms crossed twice at different heights, dead ends holding items, ways an item opens elsewhere. Give each
  region at least one "aha": something you can see in a room but can't reach from the way you first come in, reachable only
  when the route brings you back from another side (Chris on China, 2026-11-22). Vary each region's puzzle shape (an item
  used twice, taken early and used late, one that changes rooms already crossed); don't repeat one formula, and don't end
  every region with the same "costume plus guard" gate. Never a
  corridor, and never a closed box crossed by a ladder up and a ladder down. Study its exit grid before laying out a region.

## How it looks

- **A place reads at a glance as the place.** The one test for every room's screenshot: would a stranger name it? A train is
  carriages on rails with scenery passing; a landmark is drawn as the landmark (the Great Wall over hills, the Willow Pattern
  plate); a vehicle runs on through the screen's edges, never into a wall. Signs name a place; they never stand in for drawing
  it. The level is Monty on the Run's own: simply drawn, leaving a lot to the imagination, but its boat is a boat and its
  street is a road.
- **Backgrounds tell the place** (Chris on the train's moving scenery and sky, 2026-11-22: "I really love what was done with
  the train sequence... we should look for more opportunities to have interesting backgrounds"): layered scenery behind the
  play area (sky, receding roofs, hills, horizon), moving where the place moves; the set piece is where Monty stands (on the
  rooftops, not under a picture of them).
- **What looks like a floor is a floor**, and nothing solid looks like background; decorations finish what they start (a
  clothesline runs wall to wall) (Chris on China).
- **Not every room is a dungeon.** No frame walls or ceilings by habit: outdoor rooms open to the sky and run off the screen's
  edges; walls only where the place is indoors, shaped as that building.
- **No grey by default.** Each room picks a few bright, place-true colours on black; grey only where the thing is grey.
- **Monty on the Run's art manner:** solid shapes with black-line detail, no checkerboard dithering; bold cartoon creatures with
  big faces filling their 16x16 in one solid colour; recognisably of the place they're in.
- **Monty on the Run's room recipe** (measured over its rooms, sewers aside: games/montyworld/test/room-stats.ts,
  docs/dosvidaniya-room-audit.md): about 3 creatures a room, 2 of them long up-and-down patrols (a vertical creature in 94% of
  rooms; no room of walkers only), about 8 ledges on 6 levels, 2 ropes or ladders; a mechanism in only a third of rooms; each
  room has one thing of its own. Measure a new game against it.
- **Creatures move in varied ways**, as Monty on the Run's do: up-and-down patrols, creatures on different floors, fliers,
  short fast and long slow patrols, timing hazards, rooms with a mechanism instead of a walker; never room after room of two
  walkers to jump over (Chris on Siberia, 2026-11-22).
- **Creatures stand out from what's behind them**: never white on snow, brown on earth (Chris on Mount Fuji).
- **A big creature now and then is a highlight** (Chris on China's New Year dragon: "the first time I've ever seen anything
  this incredible"): several sprites moving as one, the room built round it; at most one per region.
- **Creatures are reused rarely** (a reused one should feel like a surprise): no creature in more than two rooms of a region.
- **A costume is worn, not stuck on:** small on his head above the eyes (a lei round the neck); his face always shows
  (`art/costume.ts` in montyworld finds his head per picture, and its test holds every costume to it).

- **It must still fit a real C64** (Chris, 2026-11-22). Native code, but the data keeps the machine's limits: one byte per
  kind, 256 characters, the VIC bank's sprite blocks. A big game splits by region as a multiload would, each region within
  budget; a per-region budget test enforces it.

## Words and sound

- **Names are plain and evocative first, a pun only when it lands** (Monty on the Run: THE HOUSE, SEWERAGE WORKS). A name that
  needs explaining is the wrong name. No James Bond puns. Check the room-name font draws every letter (it has no good Z).
- **Hints give the reason, in the story** (Chris: not "THE CITY GATE WANTS A RICE HAT" but that Monty needs a disguise). All
  game text goes through one writer that maps characters the font lacks (the apostrophe) to the game's own.
- **A new game is presented as the next adventure and a tribute, subtly** (Chris, 2026-11-22): its own title screen in the
  house style (never a copy of the original's), a line like A MONTY MOLE ADVENTURE, and the tribute done quietly by the credits
  (the new makers first, "after Peter Harrap's Monty on the Run", the music's author, a thank-you line), never by writing
  "tribute" or "fan game", and never implying the originals made it.
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
