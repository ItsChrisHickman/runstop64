# The HD view

The HD view draws a game as a lit 3D scene built from its own picture and data, in the manner of the "HD-2D"
remasters: the game's pixels stay crisp and flat, standing in a deep, lit room. It is a view only, and C64 is the default.
Blackwyche, Karnath, Entombed and Dragonskulle have it. (Monty on the Run had a side-on one; it was removed because the
original's own picture was cleaner and the 3D added nothing. If the HD view cannot improve on the original, a game does
not get one.)

## The switch

A system setting of the shell, not part of any game's screens (never on a title, a pause screen or the options): one
setting for every game, remembered. `games/shared/view.ts` holds `ViewSwitch`; it is driven by the shell's C64/HD button
(bottom right, showing the view now), the touch layer's C64/HD key beside PAUSE on a phone, and H at any time, which the
shell takes before the game sees it (`VIEW_KEY`). A game declares only its `HdView` and draws the HD view while `on`. Where
the browser's graphics cannot draw it (no float render targets: byte targets are used; a shader that will not compile or a
throw: `renderer.hd.available` is false) the C64 view is drawn and the switch goes for the session.

## Rules

- **The view only.** The game's memory, saves, map and travel are untouched, and every colour is the game's as drawn now
  (live multicolours, colour RAM): the HD view never shows what the C64 view hides. A room the game draws black is black;
  light falls only on what is drawn in a colour. `checkHidden` checks it on every still, `checkBehind` for sprites set
  behind the characters.
- **Colours are the game's palette.** Brightness, darkness, light and camera are the view's to make dramatic. A lit still
  must be visibly the HD view (`checkRemastered`: 0.08 or more from the C64's pixel for pixel on average); a view held
  close to the original's look reads as no enhancement. The judge is a phone-size still beside the C64's, looked at.
- **Pieces, not guesses.** Depth guessed per pixel from the picture tears under perspective (planks broken at every post,
  tables smeared across the floor), and every fix of the guess fixed one picture and bent another. Where a game keeps its
  rooms as data, the room is decoded once into pieces (below). Find where the game keeps its rooms before guessing from the
  screen: search its memory for the screen's rows.
- **Test the view the way the browser draws it**, at `FixedLoop`'s alphas between the game's frames, not only at the game's
  frames.

## The look

`LOOK` in `packages/c64kit/src/hd/scene.ts`, the same for every game. A lower camera with real perspective, fixed for the
room (it never follows the player: room and sprites move together). Indoors it is night: a cool light raking from one side,
warm pools round flames and the player, corners darkened where walls meet floors, glints on floors, a cool haze further
back; out of doors (a room showing a sky: Blackwyche's deck, Dragonskulle's beach) a warm sun and cool shade. Heavy bloom,
light shafts from the flames, a tilt-shift depth of field round the player (sprites standing are never softened: the
softened copy is taken before they are drawn, `checkSpritesCrisp`), dust and embers, a dark edge.

## How it is built

- `packages/c64kit/src/hd/`: `scene.ts` (the model and `LOOK`), `oblique.ts` (rooms for the Pendragon games' oblique
  views), `placed.ts` (`placePictures`: a band of the screen matched to the game's room pictures by its characters, or a
  window of a strip of rooms wider than the band), `layer.ts` (the Three.js layer: the room as one instanced quad, the
  passes at most 600 lines high, scaled up by the composite), `refresher.ts`, `work.ts` and `worker.ts` (builds off the main
  thread).
- **Rooms.** A game's `HdBuilder` (`obliqueRooms(spec)` with an `ObliqueSpec`: the room's band, the floor characters, what
  is seen past the room, flames, the player's sprite, its pictures) builds a room; it is made again only when the room's
  part of the picture changes, and then only what changed (the same places in new colours; the same room moved for a
  scroll). Every build runs in a worker (a frame of the game never waits for one): a room come into is built there while the C64's picture
  stays (`HdRooms.room` and `at` give null till it's back: the room before is never shown over another room's sprites), a scroll's
  rebuild likewise while the room it has is moved on; the room is drawn scrolled as far as the sprites are (`HdRooms.at(alpha)`).
  What of the room before can stand for this frame (`HdBuilder.keep`: the same picture moved, a few characters animating, the same
  places in new colours, a few things changed) is told without building; where nothing can, it's another room.
- **Pictures.** The Pendragon games keep each room as a picture of characters. `packages/c64kit/src/pendragon/room.ts` has the
  types and `games/shared/pendragon/decode.ts` (`decodePictures`, `DecodeRules`) decodes each once into pieces: floor (a
  height; `raised` for tops of things, `beyond` for the room seen over a back wall), the back wall (a depth), side walls (a
  slope), things (their front), each cell's piece and the pixels that are another's, and which pictures stand side by side.
  Each game declares its pictures and rules (`re/pictures.ts` writing `src/pictures.ts`). Blackwyche, Karnath and Entombed
  use them; Dragonskulle is inferred from the picture alone (`infer` in `oblique.ts`, `ragged` for its cliffs).
- **Sprites** stand on the floor as lit billboards with shadows under their footprint. A sprite drawn all in the floor's
  colour is a patch of it (`patchOfFloor`: it lies on the floor, no shadow). A sprite set behind the characters shows none of
  the pixels the characters hide, wherever the camera puts it; otherwise the lower-numbered sprite is in front at one depth,
  as the VIC has it; a sprite in the air is in front of everything it is drawn over. A sprite reaching past the room's band
  stands exactly where the C64 has it (`pinned`).
- **Past the picture.** Where the camera shows more than the picture drew, walls and floors carry on past the picture's
  edge, and behind the room the C64's own picture shows, dimmed: never a black hole.
- **Pictures as pixels.** `packages/c64kit/src/c64/picture.ts` (`decodePicture`) gives each pixel's colour and character; it
  is what `C64View` draws from and what `renderPixels` in `tools/probe` uses, with sprites over it as the VIC orders them
  (`drawSprites`, checked on every still by `checkC64Priority`).

## Checks

- Each game's `test/hd.ts`, built from `games/shared/test/hd.ts`: `checkHdSwitch` (the shell's switch with the game),
  `checkHdRoom` (with pictures: each piece one surface, `checkHdPieces`), `checkHdFrames`, `checkHdEntry` (each of a game's
  rooms come into in turn with the build off the main thread: the C64's picture stays till it's back, and the main thread's
  frames at the entry, the answer and the layer's first frame of the room stay within a budget, timed on the gl stub),
  `checkHdLockstep` (walking along a scrolling room, every frame drawn, between the game's frames too), `checkHdSprites`
  (each billboard's texture is its sprite's pixels), `checkHidden`, `checkBehind`, `checkRemastered`, `checkShadows`,
  `routeWalker` to walk recorded routes.
- `packages/c64kit/test/`: `hd-raster.ts` is a software renderer for stills; `gl-stub.ts` is a recording stand-in for WebGL 2
  under the real Three.js and `hd-gl.ts` checks what reached the GL (targets, viewports, scissors, feedback loops, shaders as
  far as a check without a compiler goes) and the fallbacks.
- **GPU test page** (`https://goshow.me/runstop64/hdtest.html`, `games/hdtest.html` and `games/hdtest/`, its own Vite entry,
  not linked from the loader): draws two Blackwyche frames with the real `HdLayer` on the device's GPU beside the software
  renderer's PNG of the same frame, with luminance statistics, a difference heat map, frame times, the render targets and
  any failure, in one portrait screenshot. Fixtures are `games/blackwyche/test/fixtures/*.hd.bin` and `*.sw.png`; regenerate
  them after any change to the look or the builder with `nice -n 15 node tools/test.mjs games/blackwyche/test/hd-fixtures.ts`
  and commit them. The page's logic is checked headless by `games/hdtest/test/hdtest.ts`.

## Known issues

- Room entry no longer builds on the main thread (it did: an 808 ms `requestAnimationFrame` stall was seen once on a PC); what a
  frame costs there is measured headless on the gl stub (`checkHdEntry`: a few ms, the build's 20-150 ms the worker's). Not
  measured, there being no GPU here: the first HD frame of a session (the shaders compiling, the first upload), which may have
  been that stall.
- Furniture is upright cut-outs (a table's top stands upright); Dragonskulle's cliffs and caves are inferred.
- Entombed: walls over tiers that step back a cell a column (an alcove cut at an angle) and the wedges of a stair's end that grow
  a cell a row are now side walls going back at their angle (decode.ts, `stacked`); before they were stairs of flat walls with faces
  joining them, whose one pixel of colour per face stretched across each gap (the smear, the stretched dither). Left: the big
  slanted faces at the right edge of chambers 2, 8 and 10 (the side of a stair mass reaching the picture's bottom, no foot to read
  a slope from) stand flat at the front, the blue wedge on the face of a block; and a thin ribbon runs between some tiers where the
  tile's edge face (the game draws it a few pixels wide, at 2:1) falls between two floors.
- Karnath: `checkHdLockstep` passes along the lower floor (the cause: something in a room animating a few characters during the
  scroll made the picture no longer "the same, moved", so each time the room was taken for another room, its camera and scroll
  started over; now a few characters changed are allowed). The stair hatch is still a box: the hatched diagonal wall at a stairwell
  decodes as a 45 degree side wall (right where the picture puts it) but stands as one slab, and the steps beside it are floor;
  a flight of steps (treads rising as they go back) is not modelled, and which characters make which stairs was not
  traced further.
