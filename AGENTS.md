# AGENTS.md: working on runstop64

runstop64 brings Commodore 64 games to the browser as tributes with full credits (live at https://goshow.me/runstop64/).
Read `README.md` (layout, commands), `GAMES.md` (the ten games and how each was made) and `HANDOFF.md` (what is next and what
is waiting on Chris). Each game's `re/README.md` records what was learned about its original; its `QOL.md` lists every change
from the original.

## The rules

- **Rebuild, don't emulate.** New games are native rebuilds in TypeScript with the original's data (graphics, rooms, music)
  and behaviour, like Monty on the Run. The translated games (6502 converted to TS on `games/shared/native`) play exactly
  right, but every feature first needs reverse-engineering; translation is a tool for understanding a game and checking a
  rebuild. **Never call a translation native.** No native rewrite of a translated game unless Chris asks.
- **One switch per game: ORIGINAL or ENHANCED**, ENHANCED by default, on the pause screen (E), remembered. Be opinionated: no
  menus of options, no per-feature toggles. ORIGINAL is the game exactly as it was. ENHANCED is one curated set of
  quality-of-life changes for a modern playthrough (better controls, combat that makes sense, help). Describe it that way,
  never as "fixing what was unfair". ENHANCED has unlimited lives and continues in every game (`games/shared/lives.ts`: a death takes no life, so there is no game over; the translated games use `vitals.lives` with `infinite`); no invincibility, ever.
- **Standard in every game, both modes**, never behind ENHANCED: the pause screen, the map (with progress) and travel,
  autosave, continue, back to room start, touch controls, phone scaling, the info sheet. Finishing or dying never wipes
  progress; a new game over a save asks NEW GAME? first.
- **The C64 experience goes in the picture; meta goes in the HTML overlay.** The game, its pause screen and map, and
  ORIGINAL/ENHANCED are C64-style (C64 palette, the game's own lettering the right way round). System settings (the C64/HD
  switch), saves, export and debug live in the shell's overlay and info card.
- **No boxes behind text drawn over the game's picture.** Put our text in a part the game leaves empty (each title declares
  where ENTER CONTINUE goes: `TitleStrip` in `continue.ts`), in a colour that reads there, or on a screen of its own.
- **Rewrite the game's on-screen key instructions** to our keys, in every game.
- **Keep it simple.** No bells and whistles; design before adding screens.
- **Full credits** in each game's `info` (with Wikipedia links) and on its title screen. The loader is one plain disk
  directory (no headings or folders); a new game is one entry in `games/registry.ts`, next to its series.
- **Mobile matters.** Touch controls per game (`docs/mobile.md`); every new screen that asks for a key also takes a tap.
- **QOL.md format** is the same in every game: an intro, a table (Feature | The original | In this port | Default) with the
  Always rows first and the `ENHANCED:` rows after, then "Not changed". In ENHANCED rows say what it is for, not that the
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
`readJson`, `getProp` and the WebGL `getParameter` in `games/hdtest/gl.ts`; add one only for a genuinely untyped API.

`tsconfig.json` checks what runs in the browser, `tsconfig.test.json` everything that runs under Node (tests, `re/` scripts,
tools, `vite.config.ts`) with c64kit stood in by `games/shared/test/kit.ts` and Node's APIs from `types/node.d.ts` (by hand;
`@types/node` is not installed). `npm run typecheck` runs both; `npm run build` runs them and check:strict. Tests use
`games/shared/test/browser.ts` (storage, also one with little room, fetch, listener targets) and `must()` (`games/shared/test/must.ts`) instead of casts
and `!`; JSON read back goes through `games/shared/guards.ts` (data files: `games/shared/test/data.ts`, `readRoutes`...).

## Workflow and the machine

- **This is a live production server** hosting client sites: no dev servers, no installs, no open ports. Run every node
  process with `nice -n 15`, one heavy process at a time, runs under about 10 minutes.
- **Before every push run `nice -n 15 npm run verify`** (typecheck + check:strict + the fast tests, a few minutes). There is no
  CI (Actions minutes are scarce), so this is the check.
- Chris's repo: commit and push straight to `main`, no PRs or branches. Other sessions share the clone: `git fetch` and list
  `origin/main..HEAD` and `HEAD..origin/main` before every push. Agents working in worktrees commit there; the coordinating
  session merges, pushes and deploys (`npm run deploy`).
- Commit messages end with the Co-Authored-By and Claude-Session trailers the session gives.
- Never commit secrets, traced (`TRACE=1`) translations or scratch output (keep scratch in `/tmp`). `.claude/` is ignored.
- Keep reports short and plain.

## Shared modules

| Feature | Where | A game provides |
|---|---|---|
| Renderer: Three.js, the 320x200 picture, smooth sprites, phone scaling | `packages/c64kit/src/renderer.ts` | a `Surface` per frame, sprites |
| Picture layout: the picture shown laid out differently from how the machine draws it (parts moved, labels in the picture's own letters, gauges), presentation only | `packages/c64kit/src/layout.ts` (`renderer.layout`) | a `PictureLayout` (`layout:` in `runNative`) |
| Overlays (sparkles); combat effects over the picture (an enemy destroyed, a blow, a trail, a hurt) | `overlay.ts`, `effects.ts`, `effects-layer.ts` in the same folder | places in screen pixels; events with sprite images |
| Input: keyboard, gamepads, touch (virtual keys, taps as `input.points`) | `packages/c64kit/src/input.ts` | its keys |
| Touch controls: stick and buttons in the gutters, landscape even with rotation locked | `games/shared/touch` (`npm run test:touch`) | a `TouchLayout` (`touch:` in the run options) |
| SID music and sound effects that sound like the machine | `packages/c64kit/src/sid` (`SidPlayer.sfx(name)` in `sfx.ts`) | the .sid or the writes; a name (`kill`, `hit`, `hurt`) |
| AY chip and its music player (the 128K Spectrum's AY-3-8912, a recorded tune on an audio worklet), and 1-bit speaker effects as audio | `packages/c64kit/src/ay` (`AyPlayer`, `AyTune`, `Ay`), `packages/c64kit/src/beeper.ts` (`renderToggles`) | the recorded register stream; the toggles of each effect (Moley Christmas's `sound.ts`) |
| The C64 model, and how its picture is decoded (`decodePicture`) | `packages/c64kit/src/c64`, `vic.ts` | |
| Autosave per room, CONTINUE?, NEW GAME?, ENTER CONTINUE, back to the title (the state machine is pure: `step`, `readIntent`, `FLOW_LAYOUT` in `continue-step.ts`, tested headless) | `games/shared/continue.ts` (`ContinueFlow<S>`) | room id, a save, where the strip goes, `describe(save, found)` |
| A moment's grace: 150 frames (`GRACE_FRAMES`) of invulnerability after our front end puts the player back into play, in both modes, no visual cue | `games/shared/grace.ts` (`Grace`), `ContinueFlow.grace` | what it refuses while `grace.active` (`grace:` in `runNative`, or a `graceActive` check) |
| The port session, written once: ContinueFlow, FrontEnd, the spent press, audio keys, room saves, the tick order (pause key, paused tick, travel, flow.before, game frame, grace, flow.after, view, panels) and the render tail. The five native rebuilds give a `PortAdapter` by hand; `runNative` builds one over a translated machine | `games/shared/port.ts` (`runPort`, `Port`, `PortSetup`, `PortAdapter`) | `phase`, `frame`, `resume(s, from)`, `travel`, `toTitle`, `updateView`, `renderView`, `audio` (and optional `status`, `canPause`, `typing`, `afterFrame`, `afterView`); `colours` (`PauseColours`, `native/pause.ts`) where the palette is not the C64's (Moley Christmas, the Spectrum's) |
| The small pieces every port's tick loop needs: the spent press (`FireLatch`), audio unlock and the M / V keys (`AudioKeys`), the room-save bookkeeping (`RoomSaves`) | `games/shared/fire-latch.ts`, `audio.ts`, `room-saves.ts` | the sound it starts, what resumes |
| ENHANCED's unlimited lives and continues, the same in every game: `LIVES_ASSIST` (id `lives`, UNLIMITED LIVES) in the game's assists, and `afterLoss(lives, unlimited)` where a death takes a life (the game reads `fe.assist.lives`); translated games: `vitals.lives` + `infinite` | `games/shared/lives.ts`, `native/features.ts` (`Vitals`) | the assist, where its lives are lost (rebuilds); `vitals.lives(ram, colour)` (translations) |
| Save storage: typed, the current and the previous save per game, the debug export. Every stored save is in an envelope `{ v: 3, game, format, image?, data... }`: `format` is the number its `SaveCodec` bumps whenever its bytes change (`unpack(bytes, format)` reads or migrates the formats players have and throws on one it does not know), `image` for a machine save is a hash of the game image. Saves from before the envelope (`v: 2`, `<id>.save.v1`, old exports) read as format 1 and are rewritten in the envelope the next time they are written; their fixtures are in `games/shared/test/fixtures/saves` (never regenerate them: they are what players have). A write that fails (storage full or blocked) is reported (`watchWrites`) and the shell shows a line in its overlay while it does | `games/shared/saves.ts`, `SaveCodec` in `continue.ts` | a codec: `format`, `pack`, `unpack(bytes, format)` |
| Saved-games screen (F1, the line under the banner, the gear) | `games/saves.ts` | its `describe` |
| Which games there are: id, directory name and size, `load()` of its `src/main.ts` (`run`, `info`), once. The loader, the saved-games screen and the shell read it; each game's info prose is its `src/info.ts` | `games/registry.ts` (`GAMES`; `games/shared/test/registry.ts` checks it against the game folders) | one entry, and `src/info.ts` |
| Schemas for data from outside the code (saves, what a map kept): a shape written once gives the type and the check; `foundCodec` makes a map's `FoundCodec` from one | `packages/c64kit/src/schema.ts` (`S`), `foundCodec` in `native/pause.ts` | the shape |
| Front end for any port: pause screen, map, travel, assists | `games/shared/frontend.ts` (`FrontEnd<T, F>`), `native/pause.ts` (`PauseMap<T, F>`, `FoundCodec<F>`) | a `PauseMap<T, F>`: its progress type `F` and the `found` codec that reads what was kept (once, at launch; the saved record is `F` as JSON), and assists; native ports carry out `going` and "back to room start" themselves |
| Runtime for translated games: `runNative` on `runPort`, its parts as small feature objects with their own state (running, knockback, 8-way, latch, action keys, name picking, safe arrival, health and lives), composed in the order it declares | `games/shared/native/play.ts` (`runNative`), `features.ts`, `host.ts` (`NativeHost`) | options in `runNative(...)` (`vitals`, `run`, `latch`, `actions`, `names`, `safe`...) |
| Hooks in translated code (`"hooks"` in a translation's config report reaching an instruction; `"skips"` return a routine at once) | `tools/re/to-ts.mjs`, `native/host.ts` (`onHook`, `onSkip`) | addresses in its `re/*.json` |
| Combat for translated games: kills, blows, hurts, swings, enemies showing a counted hit (`react`: `colour-cycle.ts`, in the frame's capture only) to effects and sounds, and assists (safe after a hit, knockback, hit-stop) | `games/shared/native/combat.ts` (`CombatSpec`) | `combat:` (the game's `src/combat.ts`) |
| 8-way controls for the Pendragon games | `games/shared/native/controls.ts` (`pendragonControls`) | `controls:` |
| The title tune of a game whose tune times itself by counting cycles (a translation takes no time for the work between its waits, and the tune plays twice as fast): the original's own code on a machine of its own, its SID writes sent while the title is up; the ending's tune too | `games/shared/native/title-tune.ts` (`TitleTune`; `titleTune` in `runNative`), `games/shared/native/test/tune.ts` | `titleTune: true` |
| Narration on a game's status line (Blackwyche's GUIDED, Karnath's hints) | `games/shared/native/narrate.ts` (`Narrator`), the Pendragon panel's lettering `games/shared/pendragon/status.ts` | the line and what to say |
| The reward for winning (ENHANCED): a montage of places (the game's own engine on a new game of ours, Pendragon driven by the joystick, a caption on the status line), a parade of the creatures (images and frames recorded from the engine, names under them), THE END with numbers, the title tune; won is kept apart from the saves, W on the pause screen once won, `?ending` on the page | `games/shared/native/ending.ts` (`Ending`, `EndingSpec`; `takeover` in `PortAdapter`; `ending:` in `runNative`), `games/*/test/ending.ts` on `games/shared/test/ending-kit.ts` (`playShow`, `checkShow`) and `play-session.ts` | scenes (a place, what he does there: walk, strike, use an action, jump, press a way and fire; a caption; credit lines in an empty band, `creditRow`, or typed into a panel line, `creditLine`, where the picture has none), the cast (sprites in a place, a name), `layout` and `tidy` where the picture is laid out and a panel must be put away, `tune: 'game'` where the title is silent, `tune: 'effects'` where the game has no music (Entombed), `arm`, `won(ram)`, `stats` (`src/ending.ts`) |
| The same reward for the native rebuilds on `runPort` (the game's own engine on a game of ours, Monty driven by a route found by search, the parade from the engine's sprites, credits in a row the game leaves empty, THE END; `takeover`, W and `?ending` as above) | `games/shared/ending/` (`RewardShow` in `show.ts`, `Reel`, `Place`, `RewardSpec`; `figures.ts`: `recordFigure`, `vicShot`), `games/montyotr/test/reward.ts`; `readWon`, `keepWon`, `wantsEnding`, `PORT_CREDITS` come from `native/ending.ts` | places (a room, a route, credit lines), the cast (a recorded figure and a name), `creditRow`, `music`, `endingStats` (`src/ending.ts`, `src/ending-scenes.ts`; `re/routes.ts` finds the routes) |
| Where a hint's sparkle goes: a sprite's middle, a run of text cells, a sprite showing a given picture | `games/shared/native/spots.ts` (`spriteSpot`, `cellSpots`, `spriteShows`) | what to point at (`src/hints.ts`) |
| Names and codes on a touch screen | `games/shared/letters.ts` (`NamePicker`, `KeyPacer`) | its letters, `names:` |
| The HD view | `games/shared/view.ts`, `packages/c64kit/src/hd`, `docs/hd-view.md` | an `HdView` and its rooms' builder |
| The Pendragon games' rooms as data | `games/shared/pendragon/decode.ts`, `packages/c64kit/src/pendragon/room.ts` | its pictures and `DecodeRules` |
| Loader, shell (home, gear, the C64/HD switch, info, full screen) | `games/loader.ts`, `games/shell.ts` | `run(host)`, `info` (registry entry) |

All the native rebuilds (Monty, Auf Wiedersehen Monty, Moley Christmas, Starquake, Antiriad) run their session through `runPort`
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
  `npm run verify` = typecheck + check:strict + the fast tests.
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
  state; `loadIntoStorage(file)` before `run(host)` launches straight back into play).
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
  new image is drawn where the game puts it.
- **A translation can have holes nothing shows.** Routines only an engine calls through `call()` are not found by following
  calls; look at `NativeHost.fallbacks` after playing in each kind of place and add them as entries. A call into swapped-in
  code that waits needs `callsMayWait`. `verify` cannot see interrupts inside a call; lockstep is the check for those.
- **The Pendragon engines' floor checks also act.** They test the way ahead and carry out doors, stairs and corners there and
  then; an extra step must run the floor check for the way he faces, look the tile up the game's way, and hand the rest to the
  game.
- **A sentinel a real value can take hides bugs.** Check decoded data against invariants of the room (every part of a thing on
  its own foot, every side wall on the floor), not only that it reproduces the picture.
- **"Can't be reached" is a claim about the floor, not about the code.** Before suspecting a port, run the translation against
  the original in lockstep from a state there, then work out where the pixels can overlap.
- **A layer that has never run can still be checked.** There is no GPU here: the HD layer runs on a recording stand-in for
  WebGL 2 (`packages/c64kit/test/gl-stub.ts`) under the real Three.js.
- **Phones are different.** Slow loading exposed a launch-every-frame bug; whole-number scaling left the picture tiny; taps
  need big targets and a confirm step.
