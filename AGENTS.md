# AGENTS.md: working on runstop64

runstop64 brings Commodore 64 games to the browser as tributes with full credits (live at https://goshow.me/runstop64/).
Read `README.md` (layout, commands), `GAMES.md` (the games and how each was made) and `HANDOFF.md` (what is next and what
is waiting on Chris). Each game's `re/README.md` records what was learned about its original; its `QOL.md` lists every change
from the original.

## The rules

- **Rebuild, don't emulate.** New games are native rebuilds in TypeScript with the original's data (graphics, rooms, music)
  and behaviour, like Monty on the Run. The translated games (6502 converted to TS on `games/shared/native`) play exactly
  right, but every feature first needs reverse-engineering; translation is a tool for understanding a game and checking a
  rebuild. **Never call a translation native.** No native rewrite of a translated game unless Chris asks.
- **One switch per game: EASY or HARD** (Chris, 2026-11-24, in place of ORIGINAL/ENHANCED), EASY by default, on the pause
  screen (E EASY, ticked when on), remembered (`<id>.assist`: `{ easy }`; an old `{ enhanced }` reads as EASY for ENHANCED and
  HARD for ORIGINAL: `readEasy` in `games/shared/frontend.ts`). The two differ only in the lives. HARD: the lives exactly as
  the original had them. EASY: no lives (a death takes none, so there is no game over), no lives counter (left out of the
  HUD, the pause screen's panel, THE END's lines and the saves' summaries), and a death starts the room again as he came into
  it (`games/shared/lives.ts`: `LIVES_ASSIST`, role `easy`, `afterLoss`, `livesShown`; the translated games with lives use
  `vitals.lives` with `infinite` and `vitals.counter` or a `layout` for the counter, the ones with energy or oil
  `vitals.lifeEnds`, a hook where the death has played out). No invincibility, ever. Every other change of ours (the glitch
  fixes and the one curated set of quality-of-life changes for a modern playthrough: better controls, combat that makes
  sense, help, the reward show) is on in both modes (`AssistSpec.role` defaults to `always`). Be opinionated: no menus of
  options, no per-feature toggles. Describe the changes as being for a modern playthrough, never as "fixing what was unfair".
  The engines keep the original's rules behind their own flags (`g.enhanced`, `Assists`, `newGame(data, enhanced)` in the
  bots) for the tests that compare a port with the original running; nothing in play turns them off.
- **Standard in every game, both modes**: the pause screen, the map (with progress) and travel,
  autosave, continue, back to room start, touch controls, phone scaling, the info sheet. Finishing or dying never wipes
  progress; a new game over a save asks NEW GAME? first.
- **The C64 experience goes in the picture; meta goes in the HTML overlay.** The game, its pause screen and map, and
  EASY/HARD are C64-style (C64 palette, the game's own lettering the right way round). Saves, export and debug live in
  the shell's overlay and info card.
- **No boxes behind text drawn over the game's picture.** Put our text in a part the game leaves empty (each title declares
  where ENTER CONTINUE goes: `TitleStrip` in `continue.ts`), in a colour that reads there, or on a screen of its own.
- **Rewrite the game's on-screen key instructions** to our keys, in every game.
- **Keep it simple.** No bells and whistles; design before adding screens.
- **Full credits** in each game's `info` (with Wikipedia links) and on its title screen. The loader is one plain disk
  directory (no headings or folders); a new game is one entry in `games/registry.ts`, next to its series.
- **Mobile matters.** Touch controls per game (`docs/mobile.md`); every new screen that asks for a key also takes a tap.
- **QOL.md format** is the same in every game: an intro, a table (Feature | The original | In this port | Default) with the
  Always rows first and the `EASY:` rows (the lives) after, then "Not changed". Say what a change is for, not that the
  original was unfair.
- **Root causes, not defensive patches.** **Verify automatically**: headless tests, renders you look at yourself, and
  comparisons against the original running. Chris does not check by eye.
- **DRY: one shared module per feature**; games only declare their specifics. Before writing something for one game, look for
  the shared version; if a game needs more, extend the shared module and its other users rather than copying. Say so when a
  design is drifting.

## Strict TypeScript, no loopholes

`strict` is on and nothing is excluded from type-checking to dodge errors, tests and tools included. No type assertions (`x as
T`, `as unknown as T`, `<T>x`; `as const` is fine), no non-null assertions (`x!`), no `any`, no
`@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`. Model the types so they follow: type guards, discriminated unions, generics,
`satisfies`, validation at the boundaries (JSON, storage, DOM queries, worker messages). A genuinely untyped outside API gets
one small, commented adapter, and you say so. `npm run check:strict` (`tools/strict.mjs`) must report 0; generated
translations (`*/gen/`, not committed: `tools/gen.mjs` makes them) are the generator's responsibility. It also finds the `any` nobody writes: with the TypeScript
checker over both tsconfigs it reports every expression whose type is `any` (`JSON.parse`, `Reflect.get`, `Array.isArray`
narrowing an `unknown`, `new Array(n)`, a lib typed `any`), and any call of `JSON.parse` itself. Parse JSON with
`readJson(text)` (returns `unknown`; `games/shared/guards.ts`, from `packages/c64kit/src/json.ts`) and narrow it with the
guards (`isRecord`, `isArray`, `isNumbers`, `isArrayOf`...) or write the shape once as a schema (`S.object({ room: S.number, hands: S.array(hand) })`,
`S.Infer<typeof schema>` is its type, `packages/c64kit/src/schema.ts`; a schema is a type guard, so it mixes with the guards); read a property
reflectively with `getProp`. The allowed
untyped adapters are marked `// strict-ok: untyped API (why)` on the line (or the one above) that makes the `any`: today
`readJson` and `getProp`; add one only for a genuinely untyped API.

`tsconfig.json` checks what runs in the browser, `tsconfig.test.json` everything that runs under Node (tests, `re/` scripts,
tools, `vite.config.ts`) with c64kit stood in by `games/shared/test/kit.ts` and Node's APIs from `types/node.d.ts` (by hand;
`@types/node` is not installed). `npm run typecheck` runs both; `npm run build` runs them and check:strict. Tests use
`games/shared/test/browser.ts` (storage, also one with little room, fetch, listener targets) and `must()` (`games/shared/test/must.ts`) instead of casts
and `!`; JSON read back goes through `games/shared/guards.ts` (data files: `games/shared/test/data.ts`, `readRoutes`...).

## Workflow and the machine

- **This is a live production server** hosting client sites: no dev servers, no installs, no open ports. Run every node
  process with `nice -n 15`. **Up to two tests at once** (2026-11-24: the box has 4 cores shared with the live sites and CaptureM360's
  test lane, and three at once made each test about 1.7x slower): `tools/test-all.mjs` (so `npm run verify`) runs two at a
  time (`JOBS`, 2 by default), and before running tests wait for a turn with `tools/wait-turn.sh` (one slot for a single test,
  `tools/wait-turn.sh 2` before a verify). A few agents may
  work at once (see the testing rules below).
- **Testing is a budget, not a ritual** (Chris, 2026-11-24: "every change took 30 to 60 minutes" on a game already largely
  playtested; 2026-11-23: broad runs "wasted a lot of tokens and slowed things down a heck of a lot"). A change is a few
  minutes of building and at most a few minutes of testing. The rules:
  1. **Budget: about 5 minutes of tests for a change, 10 at the most.** `tools/affected.mjs` prints each run's last time
     (`tools/timings.mjs`, recorded by test-all) and an estimate, and `--run` refuses a plan over 10 minutes
     (`TEST_BUDGET_MIN`). Over budget means the change is too broad or the plan is wrong: narrow it, or run the one test
     that matters by hand. `--over-budget` only for the end-of-batch gate (rule 5).
  2. **While iterating, run the one test that exercises the change**: `nice -n 15 node tools/test.mjs <file> [--room <id>]`.
     A music change: its `music*.ts`; the title: `title.ts`; a room: the room tests `--room <id>` and the region's mechanisms
     `--room <id>`; text: `text.ts`. Look at renders yourself rather than adding broad checks. Then `npm run typecheck`
     (30 s) once before the commit; `check:strict` (20 s) once per batch.
  3. **`node tools/affected.mjs` (without `--run`) is the check before a commit**: read the plan; if it lists more than the
     handful of tests you expected, the planner is wrong: fix the planner, don't run its plan. It follows imports only up to
     the hubs (`HUBS`: `games/montyworld/src/data.ts` imports every region, tune and picture, so following through it made
     a change to a tune's constant run 42 tests); a file reached only through a hub runs no test of its own.
  4. **Region bots and recorded routes** (`<region>.ts original|enhanced`, `--record`) only when that region's route or gates
     changed, scoped to the legs through the changed rooms, once per change. Never for art, text, music, the title, the
     ending, the HUD or another region; never "to be safe".
  5. **The full gate once per batch, by the coordinating session, before a deploy**: `npm run verify` (`JOBS=2`), plus the
     slow bots only for the regions whose routes changed in the batch. Never per agent, never per round, never after each
     merge. A merge with no code conflicts is not re-tested; one with conflicts runs rule 2's tests for the conflicted files.
  6. **Never re-run a passing test on unchanged code**, never the same suite in two worktrees, and never a test to confirm
     what an agent's report already shows (its numbers are enough; read its renders).
  7. **Runner and planner files** (`tools/test-all.mjs`, `tests.mjs`, `affected.mjs`, `timings.mjs`, `wait-turn.sh`) run no
     tests; the translator, `tools/test.mjs`, `gen.mjs`, the configs and `package.json` are what need the full gate. **Docs**
     run nothing.
  8. **Coordinating session:** at most four agents at once, at most one of them running region bots; each agent's brief
     repeats rules 1, 2 and 6. A red test that fails the same way on main is reported, not chased in an unrelated change.
     A test that needs a ROM or file the worktree lacks (e.g. moley's 48K ROM) is skipped there and run in the main checkout.
  9. **Waiting:** let a background command notify you when it ends. Never a `pgrep -f <pattern>` wait loop: it matches its
     own command line and never exits (16 of them were left running for days, 2026-11-24). Wait on a PID or not at all.
  There is no CI (Actions minutes are scarce), so rule 2's tests plus the end-of-batch gate are the check.
- Chris's repo: commit and push straight to `main`, no PRs or branches. Other sessions share the clone: `git fetch` and list
  `origin/main..HEAD` and `HEAD..origin/main` before every push. Agents working in worktrees commit there; the coordinating
  session merges, pushes and deploys (`npm run deploy`).
- Commit messages end with the Co-Authored-By and Claude-Session trailers the session gives.
- Never commit secrets, traced (`TRACE=1`) translations or scratch output (keep scratch in `/tmp`). `.claude/` is ignored.
- Keep reports short and plain.

## Making a new Monty game

Read `games/shared/monty/LESSONS.md` first: what Chris taught us making Do Svidaniya Monty (the route, how places must read,
no dungeons, no grey, names, costumes, music, and how we build and review a region). Add to it whenever he teaches something new.
How to build one with the kit (rooms, mechanisms as data, the tests and room scoping, shots, music, the ending): `games/shared/monty/README.md`.

## Shared modules

| Feature | Where | A game provides |
|---|---|---|
| Renderer: Three.js, the 320x200 picture, sprites that glide sideways between ticks (vertical is drawn at the latest tick: `Smoothed`, `loop.ts`), phone scaling | `packages/c64kit/src/renderer.ts` | a `Surface` per frame, sprites |
| Picture layout: the picture shown laid out differently from how the machine draws it (parts moved, labels in the picture's own letters, gauges), presentation only | `packages/c64kit/src/layout.ts` (`renderer.layout`) | a `PictureLayout` (`layout:` in `runNative`) |
| Overlays (sparkles); combat effects over the picture (an enemy destroyed, a blow, a trail, a hurt) | `overlay.ts`, `effects.ts`, `effects-layer.ts` in the same folder | places in screen pixels; events with sprite images |
| Input: keyboard, gamepads, touch (virtual keys, taps as `input.points`) | `packages/c64kit/src/input.ts` | its keys |
| Touch controls: stick and buttons in the gutters, landscape even with rotation locked | `games/shared/touch` (`npm run test:touch`) | a `TouchLayout` (`touch:` in the run options) |
| SID music and sound effects that sound like the machine | `packages/c64kit/src/sid` (`SidPlayer.sfx(name)` in `sfx.ts`) | the .sid or the writes; a name (`kill`, `hit`, `hurt`) |
| AY chip and its music player (the 128K Spectrum's AY-3-8912, a recorded tune on an audio worklet), and 1-bit speaker effects as audio | `packages/c64kit/src/ay` (`AyPlayer`, `AyTune`, `Ay`), `packages/c64kit/src/beeper.ts` (`renderToggles`) | the recorded register stream; the toggles of each effect (Moley Christmas's `sound.ts`) |
| The C64 model, and how its picture is decoded (`decodePicture`) | `packages/c64kit/src/c64`, `vic.ts` | |
| Autosave per room, CONTINUE?, NEW GAME?, ENTER CONTINUE, back to the title (the state machine is pure: `step`, `readIntent`, `FLOW_LAYOUT` in `continue-step.ts`, tested headless) | `games/shared/continue.ts` (`ContinueFlow<S>`) | room id, a save, where the strip goes, `describe(save, found)` |
| A moment's grace: 150 frames (`GRACE_FRAMES`) of invulnerability after our front end puts the player back into play, in both modes, no visual cue | `games/shared/grace.ts` (`Grace`), `ContinueFlow.grace` | what it refuses while `grace.active` (`grace:` in `runNative`, or a `graceActive` check) |
| The port session, written once: ContinueFlow, FrontEnd, the spent press, audio keys, room saves, the tick order (pause key, paused tick, travel, flow.before, game frame, grace, flow.after, view, panels) and the render tail. The native rebuilds give a `PortAdapter` by hand; `runNative` builds one over a translated machine | `games/shared/port.ts` (`runPort`, `Port`, `PortSetup`, `PortAdapter`) | `phase`, `frame`, `resume(s, from)`, `travel`, `toTitle`, `updateView`, `renderView`, `audio` (and optional `status`, `canPause`, `typing`, `afterFrame`, `afterView`); `colours` (`PauseColours`, `native/pause.ts`) where the palette is not the C64's (Moley Christmas, the Spectrum's) |
| The small pieces every port's tick loop needs: the spent press (`FireLatch`), audio unlock and the M / V keys (`AudioKeys`), the room-save bookkeeping (`RoomSaves`) | `games/shared/fire-latch.ts`, `audio.ts`, `room-saves.ts` | the sound it starts, what resumes |
| EASY's unlimited lives and continues, the same in every game: `LIVES_ASSIST` (id `lives`, role `easy`) in the game's assists, `afterLoss(lives, unlimited)` where a death takes a life (the game reads `fe.assist.lives`) and no lives counter while it is on (`livesShown(assist)`); translated games: `vitals.lives` + `infinite` (and `vitals.counter`, presentation only, to leave the counter out of the frame), or `vitals.lifeEnds` for a game with energy | `games/shared/lives.ts`, `native/features.ts` (`Vitals`) | the assist, where its lives are lost and drawn (rebuilds); `vitals.lives(ram, colour)`, `counter`, `lifeEnds` (translations) |
| Save storage: typed, the current and the previous save per game, the debug export. Every stored save is in an envelope `{ v: 3, game, format, image?, data... }`: `format` is the number its `SaveCodec` bumps whenever its bytes change (`unpack(bytes, format)` reads or migrates the formats players have and throws on one it does not know), `image` for a machine save is a hash of the game image. Saves from before the envelope (`v: 2`, `<id>.save.v1`, old exports) read as format 1 and are rewritten in the envelope the next time they are written; their fixtures are in `games/shared/test/fixtures/saves` (never regenerate them: they are what players have). A write that fails (storage full or blocked) is reported (`watchWrites`) and the shell shows a line in its overlay while it does | `games/shared/saves.ts`, `SaveCodec` in `continue.ts` | a codec: `format`, `pack`, `unpack(bytes, format)` |
| The CARRYING page of the pause screen (a page after the map's, `PauseMap.pages`): everything carried, newest first, a picture and two lines each, paged 8 to a page; a game gives the things and draws one | `games/shared/carrying.ts` (`drawCarrying`, `carryingPages`, `carryingTitle`, `pageCount`) | its entries and how one is drawn (`awm/src/carrying.ts`) |
| Saved-games screen (F1, the line under the banner, the gear) | `games/saves.ts` | its `describe` |
| Which games there are: id, directory name and size, `load()` of its `src/main.ts` (`run`, `info`), once. The loader, the saved-games screen and the shell read it; each game's info prose is its `src/info.ts` | `games/registry.ts` (`GAMES`; `games/shared/test/registry.ts` checks it against the game folders) | one entry, and `src/info.ts` |
| Schemas for data from outside the code (saves, what a map kept): a shape written once gives the type and the check; `foundCodec` makes a map's `FoundCodec` from one | `packages/c64kit/src/schema.ts` (`S`), `foundCodec` in `native/pause.ts` | the shape |
| Front end for any port: pause screen, map, travel, assists, the EASY switch | `games/shared/frontend.ts` (`FrontEnd<T, F>`), `native/pause.ts` (`PauseMap<T, F>`, `FoundCodec<F>`) | a `PauseMap<T, F>`: its progress type `F` and the `found` codec that reads what was kept (once, at launch; the saved record is `F` as JSON), and assists; native ports carry out `going` and "back to room start" themselves |
| Runtime for translated games: `runNative` on `runPort`, its parts as small feature objects with their own state (running, knockback, 8-way, latch, action keys, name picking, safe arrival, lives), composed in the order it declares | `games/shared/native/play.ts` (`runNative`), `features.ts`, `host.ts` (`NativeHost`) | options in `runNative(...)` (`vitals`, `run`, `latch`, `actions`, `names`, `safe`, `reserved`: the joystick's keys are `JOYSTICK_KEYS` in `features.ts`...) |
| Hooks in translated code (`"hooks"` in a translation's config report reaching an instruction; `"skips"` return a routine at once) | `tools/re/to-ts.mjs`, `native/host.ts` (`onHook`, `onSkip`) | addresses in its `re/*.json` |
| Combat for translated games: kills, blows, hurts, swings, enemies showing a counted hit (`react`: `colour-cycle.ts`, in the frame's capture only) to effects and sounds, and assists (safe after a hit, knockback, hit-stop) | `games/shared/native/combat.ts` (`CombatSpec`) | `combat:` (the game's `src/combat.ts`) |
| 8-way controls for the Pendragon games | `games/shared/native/controls.ts` (`pendragonControls`) | `controls:` |
| The title tune of a game whose tune times itself by counting cycles (a translation takes no time for the work between its waits, and the tune plays twice as fast): the original's own code on a machine of its own, its SID writes sent while the title is up; the ending's tune too | `games/shared/native/title-tune.ts` (`TitleTune`; `titleTune` in `runNative`), `games/shared/native/test/tune.ts` | `titleTune: true` |
| Narration on a game's status line (Blackwyche's GUIDED, Karnath's hints) | `games/shared/native/narrate.ts` (`Narrator`), the Pendragon panel's lettering `games/shared/pendragon/status.ts` | the line and what to say |
| The reward for winning (both modes), one show for every game: a montage of places (each the game's own engine on a game of ours, never the player's; the hero driven by input and doing something that fits; about 1.5 to 2.5 minutes in all), the credits typing on a line at a time in a row the picture leaves empty (or a panel's line) with a gap of black from the playfield, and after the last line the game's creatures parading one at a time across the last place (recorded from the engine, their own frames at their own size, each crossing the whole picture alone in 125 frames with its name under it all the way, in the credits' row, never between two lines) in a colour of their own (`colours.name`, cyan by default; `nameInk` per game) or, where a game gives names a row of their own (`nameRow`: Blackwyche's), there, and cut off at the room's edges (`stage`), so every one is seen once, in places it is never in; presentation only, drawn as overlay sprites), or, where a game gives a `procession` (Do Svidaniya Monty), after the last place a procession on a plain ground of its own: a troupe from each region marching in, halting for each member's small move as its name comes up under the region's, marching off, the hero last dancing (`procession.ts`, its clock); then THE END with numbers and the game's tune; won is kept apart from the saves, W on the pause screen once won, `?ending` on the page. Two kinds of reel under the one show: a translated machine (Pendragon driven by the joystick, a caption on the status line; `Ending`, `EndingSpec` in `machine-reel.ts`; `takeover` in `PortAdapter`; `ending:` in `runNative`) and a native engine (each rebuild's own `Reel`, its hero driven by a route found by search; `RewardShow` on `runPort`) | `games/shared/ending/` (`show.ts`: `RewardShow`, `Place`, `Reel`, `RewardSpec`; `timeline.ts`: the credits' and names' clock and the visitors' walks, pure; `figures.ts`: `recordFigure`, `vicShot`; `pilot.ts`: routes; `credits.ts`: `CREDIT`, `PORT_CREDITS`, `readWon`, `keepWon`, `wantsEnding`; `machine-reel.ts`), tests `games/shared/test/ending-kit.ts` (`playShow`, `checkShow`, `CastWatch`, `BandWatch`), `ending-timeline.ts`, `games/*/test/ending.ts` and `reward.ts` | places (a room, what the hero does there, credit lines; a `Scene` for a machine, a `Place` and `Reel` for a native engine), the cast (sprites in a place and a name, or a recorded figure), `creditRow` (`creditX`, `creditLetters`) or `creditLine` where the picture has no empty band, `layout` and `tidy`, `tune`/`music`, `arm`, `won(ram)`, `stats` (`src/ending.ts`, `src/ending-scenes.ts`) |
| Pendragon drawn as Dragonskulle draws him (both modes, Karnath, Entombed, Blackwyche): after each frame, sprite 2's picture in the capture is looked up by its 63 bytes and replaced, moved to keep his feet, recoloured by role; presentation only, nothing written to the machine. The study that made the tables: `games/shared/pendragon/poses.md`, `study/tables.ts` | `games/shared/pendragon/figure.ts` (`FigureSwap`, `FigureSpec`), `figure-frames.ts` (Dragonskulle's pictures), `figure-drawn.ts` (frames drawn for cast, whip and sword), tests `games/shared/test/figure-kit.ts` | `figure:` in `runNative`: `src/figure.ts` (colour roles, stand-in facing) and `src/figure-table.ts` (generated) |
| Where a hint's sparkle goes: a sprite's middle, a run of text cells, a sprite showing a given picture | `games/shared/native/spots.ts` (`spriteSpot`, `cellSpots`, `spriteShows`) | what to point at (`src/hints.ts`) |
| Names and codes on a touch screen | `games/shared/letters.ts` (`NamePicker`, `KeyPacer`) | its letters, `names:` |
| A Monty game on Monty on the Run's engine: the engine (`Game`, items, mechanisms, map, save, ending, title) takes everything of the game it plays as one `MontyData` value (rooms, exit grid of any size, tiles, sprites, coins, items and their room effects, crushers, lifts, teleporters, sectors, start, music, and a world tour's own mechanisms: escalators, icicles, tunnel mouths, cracking ice, timed strikes (`pulses`), dragons, animated characters (`charAnims`: scrolling rings, cycling pictures: a train's windows, sleepers and wheels) and costumes, a module each in `games/montyotr/src` and a list in the value, empty in Monty on the Run's; Monty on the Run's own C5 street, jetpack rooms, rising cloud and finale are data of its value); the session (`runMonty`) is written once; rooms in runstop64's room format (`RoomSpec`) are turned into the tables by `buildRooms`. A second game is a second value, not a copy | `games/montyotr/src/montydata.ts` (`MontyData`), `session.ts` (`runMonty`), `games/shared/monty/rooms.ts` (`RoomSpec`, `buildRooms`); Monty on the Run's value `motr.ts` (tables `data.ts`), Do Svidaniya Monty's `games/montyworld/src/data.ts`; tests `montyworld/test/walk.ts` | a `MontyData` and a `main.ts` that calls `runMonty(host, data)` |
| A Monty game's test bots, game-agnostic: the search over the game's own frames (`bot.ts`: `search`, `play`, `newGame(data, enhanced)`), a region's legs played from recorded routes (`legs.ts`: `runLegs`, `--record`, `--full`; a route that no longer reaches its goal falls back to the search and says to re-record) and the mechanism tests' searches recorded the same way, a search that found no way kept as its answer while its fingerprint holds (`proofs.ts`: `proofsIn(dir, sources)`) | `games/shared/monty/test/` | a `MontyData`, its legs (`Leg`: goal and aim), a routes folder (`games/montyworld/test/routes`, `routes-dir.ts`, `search.ts`) |
| Room-scoped testing for a Monty game: `--room` on `tools/test.mjs` (env `MONTY_ROOMS`) and `RoomScope` (`scope.ts`: `has`, `keep`, `pick`, `section(rooms, what, body)` for a mechanism test's parts); the bots' legs chosen by the rooms their recorded routes go through, started from kept states (`states.ts`, a cache in `os.tmpdir()`, used only while the fingerprints of the engine and the rooms behind them hold: `attribute.ts`) and checked to rejoin the recorded chain after; lines to rooms (`attribute.ts`) and the change detector's planner (`affected.ts`, called by `tools/affected.mjs`) | `games/shared/monty/test/` (`scope.ts`, `attribute.ts`, `states.ts`, `affected.ts`) | its room names (`montyworld/test/scope.ts`: `SCOPE`, `prints()`), its tests for the planner (`montyworld/test/affected.ts`) |
| Loader, shell (home, gear, info, full screen) | `games/loader.ts`, `games/shell.ts` | `run(host)`, `info` (registry entry) |

All the native rebuilds (Monty, Auf Wiedersehen Monty, Moley Christmas, Antiriad) run their session through `runPort`
(`FrontEnd` and `ContinueFlow` inside it); each game's `src/map.ts` is its `PauseMap`, and `games/*/test/frontend.ts` checks it headless.

## Tools

- `tools/test.mjs`: runs a headless check written in TypeScript (bundles it with c64kit stood in by
  `games/shared/test/kit.ts`, `?url` imports stubbed): `nice -n 15 node tools/test.mjs games/montyotr/test/frontend.ts [out-dir]`.
  Also `npm run test:touch`, `test:effects`, `test:input`.
- `tools/test-all.mjs` (`npm test`): every headless test on `node:test`, one at a time under `nice -n 15`, from the list in
  `tools/tests.mjs` (file, arguments, the set `fast` or `slow`, and `needs`: the files a test wants; one missing, such as
  AWM's gitignored originals in `games/awm/build/`, is a skip with a message, not a failure). `--slow` adds the slow set,
  `--list` shows what would run, a word filters by name. **A new test goes in `tests.mjs`.** Tests report with
  `check(what, ok)` and end with `finish()` (`games/shared/test/check.ts`: the exit code is what the runner goes by).
  `npm run verify` = typecheck + check:strict + the fast tests. `--plan=<file.json>` runs a given list (what `tools/affected.mjs --run` hands it).
- `tools/affected.mjs` (`[base] [--run] [--slow] [--list]`): the change detector, the pre-ship check for a change (see Workflow).
- `tools/probe`: a C64 in TypeScript (boot a .prg/.d64, run frames, patch memory, save a state, render PNGs). It makes title
  snapshots and runs the originals the ports are checked against (`games/*/build/README.md`).
- `tools/zx`: a headless ZX Spectrum 48K in TypeScript (Z80, ULA, tape loader trap, snapshots, PNGs, a Z80 disassembler), the
  Spectrum counterpart of `tools/probe`: test and study only, never imported by the browser bundle (`tools/zx/README.md`). The
  original Moley Christmas, the 48K ROM and the exercisers it is checked with live in the gitignored `games/moley/build/`.
- `tools/gen.mjs` (`npm run gen`): runs `tools/re/to-ts.mjs` over every `games/*/re/*.json` that names an `out`, engine first, into the gitignored `games/*/src/gen/`; skips a game while a stamp (`src/gen/.stamp`) matches the hash of its configs, `.state` snapshots and the translator (`--force` redoes all). `typecheck`, `check:strict`, `build`, `deploy`, `test`, `dev` and `tools/test.mjs` run it first, so a fresh clone needs no step.
- `tools/re/to-ts.mjs`: the 6502 to TypeScript translator (structured flow, cycle counting, `TRACE=1` adds a per-instruction
  hook); `tools/re/disasm.mjs`; `tools/re/test`: an opcode fuzz test.
- `games/shared/native/test`: headless checks for the translated games (`verify`, `lockstep`, `trace`, `irqcycles`, `resume`,
  `shots`, `explore` Go-Explore, `travel`, `combat`, `controls`). Go-Explore (play automatically, archive new places, restart
  from rare ones) finds what a game can do without a human.
- A save Chris sends (the info sheet's "Export save (debug)": `runstop64-<game>-<date>.json`, the current and previous saves
  exactly as stored): reproduce it with `games/shared/test/load-save.ts` (`loadSave(file, MACHINE_CODEC)` gives the machine
  state; `loadIntoStorage(file)` before `run(host)` opens the game on its title with ENTER CONTINUE from that save; `continueFromTitle` in `games/shared/test/continue-from-title.ts` presses Enter as a player does).
- Deploy: `npm run deploy` (builds, rsyncs to goshow.me/runstop64).

## Lessons

- **Our C64 model has gaps, and a port checked only against it inherits them.** Found so far: VIC-II extended colour mode,
  its invalid modes (ECM + bitmap draws black), sprite-background collisions reading ECM characters and not raising the
  VIC's interrupt, the CPU's interrupt-disable flag not restored on resume, and native-mode time counted twice. When
  something looks wrong, suspect the model; fix it in `packages/c64kit/src/c64` for everyone.
- **Check data against the game, not a guess or a tidy copy.** A reconstruction's refactored source is not the original's
  bytes; two releases of one game can differ; an image can lack a block (Blackwyche's missing kilobyte was found by a
  room-by-room check). Saves are machine snapshots, so a mend to the image does not reach them: declare it (`mends`).
- **Do things the game's own way.** Travel calls the game's own routines (leave a chamber as the game does, enter a room
  through an exit pointed at it), and undoes swapped-in blocks in the game's order. Hook the code, don't guess from the
  picture.
- **A tune can be a loop that times itself by counting cycles.** Compare a translation's SID writes with the original's from the same snapshot (`games/shared/native/test/tune.ts`): Blackwyche's and Dragonskulle's title tunes ran twice as fast. Spending the time in the translation would move when a game starts from the title, and the SID's voice 3 the games take their random numbers from, and so every route recorded from the title; so the original plays the tune (`TitleTune`).
- **A port that takes no time sees the original's moments differently.** The original's interrupts and main loop take time;
  where it shows, model it from measured cycles, compare allowing a frame either way, and sample the original when its logic
  is done. Extra work (running) goes at the point the game runs the routine, and collision reads stay fresh.
- **Smoothing glides a box, not the figure in it.** Judge motion by the figure drawn: a step that moves a sprite's box with a
  new image is drawn where the game puts it. Smoothing is sideways only: a trailing average up and down drew a figure 2 to 6 px
  off the floor on stairs, slopes and landings, so vertical is the latest tick's (`games/awm/test/ground-vertical.ts`).
- **A translation can have holes nothing shows.** Routines only an engine calls through `call()` are not found by following
  calls; look at `NativeHost.fallbacks` after playing in each kind of place and add them as entries. A call into swapped-in
  code that waits needs `callsMayWait`. `verify` cannot see interrupts inside a call; lockstep is the check for those.
- **The Pendragon engines' floor checks also act.** They test the way ahead and carry out doors, stairs and corners there and
  then; an extra step must run the floor check for the way he faces, look the tile up the game's way, and hand the rest to the
  game.
- **"Can't be reached" is a claim about the floor, not about the code.** Before suspecting a port, run the translation against
  the original in lockstep from a state there, then work out where the pixels can overlap.
- **Phones are different.** Slow loading exposed a launch-every-frame bug; whole-number scaling left the picture tiny; taps
  need big targets and a confirm step.
