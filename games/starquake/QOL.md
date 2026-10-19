# Starquake: changes from the original

This is the 1985 Commodore 64 game (Nick Strange's conversion of Stephen Crow's Spectrum game) as it was, a native port
from the original's own code and data (checked frame for frame against it; `re/README.md`). **ORIGINAL or ENHANCED:** one
switch, E on the pause screen; ENHANCED is the default and turns on the rows marked ENHANCED, quality-of-life changes for
a modern playthrough. ORIGINAL is the game as it was. Rows marked Always are in both modes. Continuing after a game over
starts with four lives in both.

| Feature | The original | In this remake | Default |
|---|---|---|---|
| **Title** | The loading picture, then a text screen; any key starts. | The same picture, alternating with a page of credits and keys; Space (or fire) starts. The intro ("touch down imminent...") is the original's, without the crack's "cracked by" line. | Always |
| **Pause screen** (P, Esc, pad Start, the gear) | F3 paused. | The shared runstop64 pause screen: a map of the planet (two pages: the surface and the depths), rooms appearing as BLOB visits them, the core and teleports marked. | Always |
| **Travel** | None. | From the map, go back to any room BLOB has been in: he leaves the room he's in as by an exit and arrives where he first stood in that one. | Always |
| **Autosave and Continue** | Game over: back to the start. | Progress is saved in the browser each time BLOB comes into a room. The title offers Continue; after game over, "CONTINUE?" goes back to the last room entered, as it was then. Launched with a save, the game goes straight back into play where it was (the title only without one, or with T on the pause screen). Starting a new game keeps the save from before it as the previous one: the saved games (F1 on the directory, or the gear there) bring it back, or delete a save (they ask first). | Always |
| **Core of heroes** (high scores) | Reset every time the game was loaded. | Kept in your browser. | Always |
| **Back to room start** | None. | On the pause screen (B): the room as it was when BLOB came in. | Always |
| **Back to the title** | None (only by losing, or a restart). | T on the pause screen (or a tap on it): the title, with the save kept; ENTER CONTINUE goes back to it, and only a new game started there begins a new one (keeping the save as the previous one). A new game over a save asks first: NEW GAME? (Space or fire again yes, Esc or a tap no, Enter continues); a jump or fire still held as the last life goes brings CONTINUE? up instead of starting one. | Always |
| **Smooth movement** | Locked to a 50 Hz PAL television (and slower when the C64 is busy). | Game logic runs one of the original's frames per 50 Hz tick; sprites glide between ticks on 60/120/144 Hz screens. V switches to whole-pixel steps. | Smooth |
| **Sound** | The music on the title screens, effects in play. | The same, played by the original's own music and effect players (a .sid made from the game). M turns sound off and on. | On |
| **ENHANCED: full energy** | Energy only from bonuses. | BLOB's energy is full each time he comes into a room. | ENHANCED |
| **ENHANCED: unlimited lives** | Four lives (more from bonuses). | A life comes back each time one is lost. | ENHANCED |
| **ENHANCED: the reward for winning** | The core is whole: its picture and the framed message, a key, the final count, game over; nothing more to see. | The game's own ending stays as it was (the core drawn, the message, a key); then the show: a montage of places on the planet (BLOB's own start and the cave below it, a hover pad over the surface and another in a cave, the pieces of the core and the platforms built up to them, teleport booths with a destination's name typed, the core with its last pieces put in and the game's own ending), each one the game's own engine running with its creatures moving and BLOB driven by input like a player's; credits typing on a line at a time in the screen's last text row, which the game never draws in (the makers, true facts, then the port); then the parade of the game's creatures, their own sprites and frames, a plain name under each, BLOB last; then THE END with the pause screen's numbers (score, rooms, lives) and the title tune all through; then the final count and game over go on as before. A key or a tap skips it after two seconds. That the game has been won is kept apart from the saves; once won, W on the pause screen shows it again (it ends on the title), and `?ending` on the page shows it at once. Sources of every credit line: `re/credits.md`. Checked by `test/reward.ts` | ENHANCED |
| **Touch answers** | The teleports' names, a hero's initials and the Cheops trade (1-5) are typed. | On a phone the five letters are entered with the touch controls: the stick (up and down) changes the letter under the cursor, FIRE puts it in (the fifth ends it, as the original), left rubs out, RET finishes; a line under the screen says so. The trade's five things take a tap. | Always (phones) |
| **Controls** | Joystick, or Z X F5 F7 and Shift. | Arrows/WASD (up picks up, down builds a platform), Space (or Z, X) fires, gamepads, touch (stick and FIRE). F1 (abort) is the shell's menu. | Always |
| **A moment's grace** | None. | For 3 seconds (150 frames) after the game puts you back into play, nothing kills BLOB or takes his energy (the energy clock waits): continuing a save (ENTER CONTINUE, a launch going straight back into play, CONTINUE? after losing), back to room start, arriving from the map. Quality of life for a modern playthrough, so a resume never starts in the middle of a fight; no sign on screen. Both modes. | Always |

## Not changed

Everything else is the original's: all 512 rooms (identical to the C64's,
byte for byte), the items and the core's pieces scattered as the original
scatters them, BLOB's walking, falling, platforms, lifts and hover pads, the
laser, the enemies and how they move and appear, sparks, bonuses, the panel,
teleports (type a destination's name), security doors and Cheops pyramids
(and their trades), key and flat barriers, the core (pieces put back, its
guardians, the end), the final count, the core of heroes (with its quirks:
only five digits of a score count, and the sixth isn't copied), the sounds and
the music.
