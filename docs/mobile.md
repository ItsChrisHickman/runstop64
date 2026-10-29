# Playing on a phone

Every game (and the loader) has touch controls, from one shared layer:
`games/shared/touch`. A game only declares its layout; the layer does the rest.

## How it works

- **Desktop is unchanged.** Nothing appears unless the device's main pointer is a finger
  (`pointer: coarse`) or the screen is touched.
- **Before the first tap** a phone shows a C64-style screen: TURN YOUR PHONE, with a little
  phone turning on its side. The game waits behind it.
- **The first tap** (it also unlocks the sound) asks for full screen and
  `screen.orientation.lock('landscape')`. Android Chrome honours the lock in full screen even
  with auto-rotate off. Leaving full screen (back gesture) brings the TURN YOUR PHONE screen
  back and the game waits; a tap carries on.
- **Where the lock isn't possible** (iPhone, or refused), the whole stage (picture and
  controls) is drawn turned a quarter inside the portrait page, so turning the phone shows it
  upright without auto-rotate. Touches are mapped back through the same turn. By default it
  expects the phone's top to the left; on Android the accelerometer picks the side.
- **Upright**: "OR TAP HERE TO PLAY UPRIGHT" on the first screen, or the TURN key later, puts
  the picture on top and the controls underneath. The choice is remembered.
- **Landscape**: the picture in the middle, the stick in the left gutter, the buttons in the
  right one; a thumb never covers the picture. With many buttons the right gutter widens a
  little and the picture shrinks a little.

### Controls

- **Stick** (left): floating, so it centres wherever the thumb lands; drag past its reach and
  it follows. A dead zone in the middle; 8-way, 4-way or left/right only, per game.
- **Buttons** (right): the main one (red, biggest) lowest, nearest the thumb. A touch anywhere
  in the right gutter presses the nearest button, and sliding a thumb from one to the next
  switches. Several fingers at once work (stick + buttons). A short buzz on each press where
  the phone supports it (Android).
- **Small keys** (top of the gutters, brown like C64 keys): the shell's buttons on a phone (its
  bottom-right buttons are hidden there) and RETURN. HOME (back to the menu, asks first), TURN
  (landscape / other way round / upright), PAUSE (the pause screen or options; again to go back),
  RET (the RETURN key: continue on title screens, and so on). Where the gutter is too narrow for a row of them, a second row under it (the
  stick and the buttons below).
- **Taps on the picture**: on pause maps, tap a place to pick it and tap it again to go there;
  tap an option (right-hand column) to change it; tap the foot line to go back; tap the ends of
  the title to turn pages (Entombed's floors). On a title screen with a save, tap
  "CONTINUE"; in "CONTINUE?", tap YES or NO. On the pause screen, tap T TITLE for the title
  (the save kept). In the loader, tap a game, then tap it again (or move with the stick and
  press LOAD); tap the line under the banner (TAP HERE: SAVED GAMES) for the saved games, where
  a tap picks a line and a second tap on it does it (OK and BACK work too).
- The controls fade when nothing has been touched for a few seconds.

### Per game

| Game | Stick | Buttons |
|---|---|---|
| Loader | 4-way (choose) | LOAD |
| Monty on the Run | 4-way | JUMP |
| Auf Wiedersehen Monty | 4-way | JUMP, FLY (boards a plane: stand at one with a ticket) |
| Moley Christmas | 4-way (up and down climb the ropes, and fly in the last screen) | JUMP |
| Thing on a Spring | 8-way | JUMP (fire; with a direction, the big jump) |
| Jet Set Willy II | left/right | JUMP, RUN |
| Entombed | 8-way | USE (current action), JUMP, WHIP, TORCH, RUN |
| The Staff of Karnath | 8-way | CAST, SPELL (next spell), RUN |
| Blackwyche | 8-way | USE (current action), JUMP, SWORD, RUN |
| Dragonskulle | 8-way | USE (the icon the hand points at), JUMP, STONE, DIG, CLOAK, RUN |
| Starquake | 8-way (up picks up, down builds a platform) | FIRE |
| The Sacred Armour of Antiriad | 8-way (up jumps, down crouches to pick up; in the armour, flies) | FIRE (throw, fire the Pulsar Beam), JUMP (jump; in the armour, lift); in ORIGINAL both are the original's one button |

RUN is a toggle (lit green while on); it's Shift held down.

### Adding a game

Declare a `TouchLayout` and hand it to your front end: `touch:` in `runNative(...)` options
(RUN is added for games with `run`), or as `touch` on the program a native rebuild's
`run(host)` returns (as Monty does). Buttons name the key they stand
for (`Space` is fire), so the game sees a touch exactly as that key. Screens that can be
tapped read `input.points` (C64 pixels) and say "tap" when `input.touch` is set.

## The back gesture

Android's gesture navigation (and iOS's edge swipe) starts at either side edge and a page can't block it. So: the controls and
the stick's and buttons' touch zones keep `EDGE_GUARD` (28 px, on top of the safe area) clear of both side edges (the stage's top
and bottom when it is drawn turned), so a thumb never starts a touch there; the page has `overscroll-behavior: none` and
`touch-action: none` on the stage, so a drag is never a browser swipe. As a backstop, the first tap or key of play pushes a
history entry (Chrome ignores entries made without a gesture), and a back landing before it opens the pause screen and puts the
entry back; back from the pause screen leaves for the directory (`games/shared/touch/back-guard.ts`, used by `games/shell.ts`).

## Checks

`npm run test:touch` (headless, no browser): layouts on 360×780, 412×915 and 390×844 in
portrait and landscape (and with an iPhone notch) for every game: the picture keeps its shape
and size, controls stay off it and inside the screen, buttons don't overlap and are big enough;
synthetic touches through to `Input` (8-way/4-way/left-right stick, dead zone, the stick
following the thumb, quick taps, multi-touch, sliding between buttons, the RUN toggle, PAUSE on
release, RETURN, taps on the picture), the same through a stage turned either way inside a
portrait page, the mode decisions, that a desktop gets no touch UI, the nudge screen, and the
pause screen's tap places, the edge guard on every game's layout, and the back gesture's decisions.

## What to try on a phone

Android with rotation locked to portrait, then an iPhone.

1. Open goshow.me/runstop64/ held upright: the blue TURN YOUR PHONE screen, nothing else moving. Turn the phone (top to the
   left) and tap: full screen, landscape, the loader with a stick on the left and LOAD on the right.
2. In the loader tap a game once to pick it and again to load it. Touching the stick or LOAD alone must not pick a game.
3. In a game: move in every direction the stick offers, hold a button while walking, slide a thumb between buttons, toggle
   RUN. Nothing covers the picture; the page never scrolls, zooms or selects text; a long press brings up no menu.
4. PAUSE shows the map: tap a place (it is boxed), tap it again (you go there); tap the option line to switch ORIGINAL and
   ENHANCED; tap the bottom line to go back.
5. Lose the last life: in CONTINUE? tap YES. On a title with a save, tap CONTINUE.
6. Leave full screen (swipe back): TURN YOUR PHONE returns and the game waits; a tap carries on where you were.
7. TURN: upright (picture on top, controls below) and back. On an iPhone, after the first tap the game is drawn sideways in
   the page: turn the phone (top to the left) and it is upright; if it is upside down, TURN flips it.
8. Sound starts on the first tap. A desktop browser gets no controls and no TURN YOUR PHONE.
