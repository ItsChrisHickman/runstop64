# Do Svidaniya Monty: pacing audit (2026-11-27)

Chris: "The original Monty on the Run was great: it had great pacing, could be beaten by a speed runner quickly and had pretty
good balance." This is what the region bots' recorded routes show, and a list of what could be quicker. **Nothing is cut**: every
item below is for Chris to choose.

How it was measured: `nice -n 15 node tools/test.mjs games/montyworld/re/pacing.ts [original|enhanced] [region ...]` adds up the
frames of the recorded routes (`games/montyworld/test/routes/<region>-<mode>.json`, 50 a second) with nothing played: per region,
per room, the room changes, how many go back into a room already crossed, and every stand of more than 1.5 s. The bots take
every coin and find, and the search finds *a* way, not the fastest, so these are a player who knows the way and takes
everything; a speed runner skipping the coin legs comes near the "without the coin legs" figure.

## The numbers (enhanced; original is the same route)

| Region | Route | Without the coin legs | Rooms | Room changes | Back into a room already crossed | A room visit |
|---|---|---|---|---|---|---|
| Siberia | 102 s | 81 s | 8 | 9 | 2 | 11.3 s |
| China | 166 s | 114 s | 12 | 19 | 8 | 8.7 s |
| Japan | 191 s | 132 s | 13 | 25 | 13 | 7.6 s |
| Pacific | 294 s | 210 s | 20 | 36 | 17 | 8.2 s |
| Andes | 154 s | 118 s | 14 | 24 | 11 | 6.4 s |
| Rio | 103 s | 84 s | 8 | 12 | 5 | 8.6 s |
| **Six regions** | **16.8 min** | **12.3 min** | 75 | 125 | 56 | 8.1 s |

Moscow, the flight and the finale have no recorded route (Moscow's bot searches every run), so they are not in these figures.

**Monty on the Run** has no route of the whole game in our tools (its `re/routes.ts` finds only the ending's montage scenes).
The published tool-assisted run of the C64 game (TASVideos, DrD2k9) finishes it in **12:04**, 52 rooms, teleporter waits and the
C5 street included. So the six regions *without their coins* already take as long as the whole of Monty on the Run played
perfectly; with Moscow, the flight and the finale a speed run of Do Svidaniya Monty will be nearer 15 minutes.

The rooms themselves are brisk: 6 to 11 s a visit, and in all six routes there is only one stand longer than 3 s (below). The
length comes from the number of rooms and from crossing them again.

## Fixed in this pass

- `siberia-enhanced.json` named OFF THE BEATEN PATH by its old id (94, the Andes' THE RIVER ENDS since 02d6cb50 gave the taiga
  95), so a room-scoped Siberia run in ENHANCED (`--room 95`) chose none of its legs. Corrected; the routes are unchanged
  (`siberia.ts enhanced --room 95`: 33 legs replayed, all checks pass). `pacing.ts` reports any id like it.

No timer, wait or room was changed: none of the waits below is both small and clearly dull; each is part of a set piece or
its timing proof.

## For Chris: the dull stretches, longest first

1. **The Pacific is long and doubles back most.** 294 s, 29% of the six regions, nearly three times Siberia or Rio. Two
   back-and-forths account for most of it: luau, Diamond Head, the lookout, Diamond Head, the lookout, Diamond Head, the luau
   (Diamond Head 22 s, the lookout 11 s), and Hilo, the falls, Mauna Kea, the summit, Mauna Kea, the summit, Mauna Kea, the
   falls, Hilo (Mauna Kea 22 s, the summit 10 s); also Kona and Mauna Loa, the coffee farm and Hilo crossed twice each. 85 s of
   it is in coin legs. Options: a one-way way down from the summit and from the lookout (a drop or a slide, as Moscow's
   one-way ride) so the way back is not the way up; or move a coin so a leg is not walked twice.
2. **Japan goes back in half its room changes** (13 of 25): platform and crossing three times, Fuji and the garden three
   times, the garden and the mole three times, the hall and the hideout three times. Each pair is short (7.6 s a visit), so it
   feels like ping-pong rather than a slog. Option: let one of the four pairs be crossed once (a fetch moved into the room
   the way already goes through).
3. **The Andes: Machu Picchu and the terraces four times** (picchu 23 s, terraces 19 s), and the kapok and the roots four times
   at the end (17 s each). Option: the panpipes nearer the first visit to the plateau, or a liana down from the kapok's
   walkway to the boat's bank.
4. **The one long wait: the closet on the sleeper, 7.8 s** while the mountain passes over (the tunnel is 44 cells, at a cell
   every 6 frames). It is the only stand over 3 s in all six routes, and it is the train's set piece working as designed (the
   wait in the closet is the lesson). If it drags for Chris: a cell every 5 frames makes it about 6.5 s (the sleeper's timing
   proof in `siberia-mechanisms.ts` and the leg would be re-recorded).
5. **One shape used for three bonus rooms**: a row of hops in turn, each a leg of its own: the taiga's five boughs (Siberia),
   the grove's four bamboo stalks (Japan), VINE AND DANDY's three vines (the Andes, with more vines on the sandbar and the
   roots). Each is good alone; three in a row of regions is a repeated idea. Option: give one of them a different shape
   (a trap set up, a ride).
6. **Crumbling floors recur**: the Amur's ice and the taiga's boughs (Siberia), the market's awning and the jetty (China),
   the sinking stones and the hideout's lookout boards (Japan), Mauna Loa's crust (the Pacific). Each is a different place,
   but the timing to learn is the same. No change proposed; worth knowing before adding another.
7. **Timers a player can wait on that the bot times exactly**: the hutong's firecrackers (a 450-frame period: up to about
   6 s on the ledge if he arrives just too late), the bullet trains (a 656-frame cycle with two quiet moments: up to about
   5 s), Diamond Head's boulder (one every 420 frames; a hazard, not a wait). Shortening the firecrackers' period (450 to
   360, lit at 110) would cut the worst wait by about 2 s; the bot's route there does not wait for them, so it gains nothing
   measurable.

No corridors: the rooms with the most walking are the canyon's drops in the Andes (3.5 to 8 s each), the market (the dragon's
room) and Rio's coloured houses, all short and each with its own thing. Every dead end on the route (the bonus rooms,
HEAVEN CAN WAIT, the churrascaria, THE RIVER ENDS, the Inca bridge) holds at least a coin or a find.
