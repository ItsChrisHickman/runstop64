# runstop64: architecture review

Read-only. Nothing in the repo was edited. What I ran, all with `nice -n 15` and one at a time: `tsc --noEmit` (clean, 7.7 s), `tools/strict.mjs` (0 violations), 21 of the headless tests (all pass, 30 s in total), a translator re-run into scratch (see finding 6), and a few throwaway analysis scripts kept in the scratchpad.

## Verdict

**What is sound.** The layering is better than "built quickly by agents" suggests.
- c64kit hides the renderer and input behind interfaces. A game receives a `Host`, not a canvas. That is what lets about 125 headless tests run without a browser.
- The shared modules are real. I looked for copy-paste across `src` files with an 8-line sliding window and found none. Duplication is not literal. All ten games use the same `ContinueFlow`, `FrontEnd`, `PauseMap` and `Grace`.
- Saves go through one typed, versioned, read-back-checked module (`games/shared/saves.ts`).
- Typecheck is clean and fast. There is almost no dead code (finding 7). The translator is deterministic.
- One game per page load is a deliberate rule (`shell.ts`: "going back reloads it"). That makes module-level singletons such as `cpu`, `ram` and the Starquake `ROM` acceptable, so I am not counting them as a problem.

**The real problem is one missing abstraction, plus a few places where the strictness rule has holes.**
- The "native port session" is hand-written five times. `runNative` (676 lines) wires the translated games. `montyotr`, `awm`, `starquake` and `antiriad` each re-implement the same `tick()` skeleton in their own `main.ts`. A feature added to one (grace, travel, a new pause rule) must be repeated by hand in the others. This is where the "one shared module per feature" rule in AGENTS.md has drifted.
- The state that drives the front end is implicit: bags of booleans and `let`s (`ContinueFlow` has 10+ private flags, `runNative` has 23 closure `let`s), and `Found` is `Record<string, unknown>`. It works and is tested, but it is the thing most likely to grow bugs as features are added.
- `strict.mjs` only finds the keyword `any`. Implicit `any` from `JSON.parse` slips through, including on the central save path (finding 4).

Zustand would not help (details in the libraries section). A small hand-rolled state machine and typed `Found` would.

---

## Findings

### 1. The native-port session is copy-pasted five times (the main one)

**What.**
- `games/shared/native/play.ts:187` `runNative` serves the 6 translated games.
- `games/montyotr/src/main.ts` (292 lines), `games/awm/src/main.ts` (265), `games/starquake/src/main.ts` (409) and `games/antiriad/src/main.ts` (322) each rebuild the same skeleton by hand.
  - Construct `ContinueFlow` + `FrontEnd` with the same options shape (montyotr main.ts:77-96, awm:105-118, starquake:78-95, antiriad:144-157).
  - Keep `fireHeldOver`, `roomSave`/`roomCount`, a `status()` object, `resume()`, `asked()`, `backToRoomStart()`, `canGoBack` and `canPause`.
  - Add the same pointerdown `unlock`, the same `M` mute and `V` snap toggle.
  - Run the same `tick()` order: pauseKey, then pausedTick, then travel (`fe.going`), then `flow.before`, then game frame, then `flow.grace.tick()`, then `flow.after`, then `view.update`, then `flow.draw`.
  - Close with the same `render()` tail: `hold(...)` and `hideSprites()` when covered.
- Counts of the identical identifiers per `main.ts`: `fireHeldOver` 6 files (7-9 uses each), `roomCount` 4, `backToRoomStart` 5, `canvas.addEventListener('pointerdown', unlock)` 6.

**Why it matters.** Every front-end rule (grace, "no new game over a held fire", travel, pause on or off during sequences) exists as five slightly different copies, and the differences are not all deliberate. Example: awm and monty call `flow.grace.start()` on travel inside their own code. runNative does it in `onWait`. antiriad does it in a third place. Adding the next native port, or the next cross-cutting rule, means touching five tick loops.

**Fix.** Extract `runPort<S, G>(host, adapter)` into `games/shared/port.ts`. It owns the flow, the front end, `FireLatch`, unlock and mute, and the tick order. A port supplies a small typed adapter:
```
interface PortAdapter<S, F> {
  id; codec: SaveCodec<S>; strip; font; assists; map: PauseMap<…, F>;
  phase(): 'title' | 'play' | 'other';     // other = ending / closing / hero table
  canPause(): boolean;
  roomKey(): number | null;                // null = not a save point
  save(): S | null;
  resume(s: S, afterGameOver: boolean): void;
  toTitle(): void;
  travel(id: string): boolean;
  frame(input: HeldControls, holding: boolean): void;
  describe(s: S, found: F): string[];
}
```
`runNative` then becomes "build an adapter from a `PortConfig`" (a machine-backed adapter) and keeps its translated-code-specific hooks (combat, 8-way, run, latch). The four native games reduce to their `Game` plus an adapter, roughly 100 lines each of glue removed. Do it in two steps. First extract the small pieces (a `FireLatch` class, `audioUnlock(canvas, player)`, and one `PortFlow` for the room-save bookkeeping). Then the whole `runPort`. The per-game `test/frontend.ts` files already pin the behaviour.

**Cost.** L overall (S for the small pieces, M-L for `runPort`). **Risk.** Medium. Tick-order differences are real (antiriad checks `optionsOpen` first; starquake has 8 modes). Port one game at a time with its frontend and grace tests as the guard.

### 2. `runNative`: a 490-line closure with 23 `let`s and a 30-hook options bag

**What.**
- `NativeGameOptions` (play.ts:20-150) has about 28 optional members (`fullHealth`, `health`, `hints`, `hintsWith`, `assists`, `onHook`, `afterFrame`, `onAssists`, `lives`, `safe`, `grace`, `joyPort`, `actions`, `layout`, `latch`, `run`, `map`, `describe`, `font`, `strip`, `names`, `remap`, `reserved`, `touch`, `combat`, `controls`, `hd`, …).
- Features are tangled through the one function. Examples: `latch`, `knock`, `running`, `eightWay` and `picked`/`actionFire` all feed `putStick` through `feedInput` (play.ts:403) and `onWait` (play.ts:~222), which mutate shared closure variables (`stick`, `knock`, `latched`, `wanted`, `latchBusy`, `fireHeldOver`, `arrived`, `respawn`, `resuming`, …).
- The translated CPU's registers are saved around every injected call by hand: `const regs = { ...cpu }; fn(); Object.assign(cpu, regs);` appears at play.ts:230, 234, 236 and 317. The one correct helper is the `runner` at line 317, and the other three copies bypass it.

**Why it matters.** This is the file most future games will want to extend. Each new "assist" or hook has to be spliced into `onWait`, `feedInput` and `afterGameFrame` at the right point, and ordering bugs hide in closure state.

**Fix.** Split `runNative` into small feature objects, each with `beforeFrame / input / afterFrame` and its own private state. Candidates: `Running`, `Knockback`, `Latch`, `ActionKeys`, `NamePick`, `SafeArrival`, `HealthAssist`. Compose them in an ordered list inside `runNative`. Group the options by feature: `opts.run`, `opts.latch` and `opts.actions` already are; do the same for `health`/`fullHealth`/`lives` (one `vitals` option). Replace the three raw `{...cpu}` copies with `runner.call` (S, do first). Keep `assist` ids typed with a union of the ids that exist (`'eightWay' | 'respawn' | 'effects' | …`) rather than `Record<string, boolean>` (`frontend.ts:56`), so the games' own ids are the only stringly part.

**Cost.** M. **Risk.** Low-medium (the lockstep, combat, controls and frontend tests exercise it; run them after each feature is moved).

### 3. Front-end state is implicit, and `Found` is untyped

**What.**
- `ContinueFlow` (continue.ts:~100-150) holds `prompt`, `playing`, `lastRoom`, `hasSave`, `restartAsked`, `fireWasDown`, `titleTicks`, `startOk`, `answer`, `launch`, `fresh`, `over`, `rooms`, `loadedRooms`. Its `before()` (continue.ts:161-285, 125 lines) reads input, hit-tests hard-coded pixel boxes (`t.y >= 60 && t.y < 140 && t.x < 160`) and mutates these flags in one pass. The valid combinations (for example `launch !== null` together with `prompt`) are in comments, not types.
- `FrontEnd` has `paused`, `optionsOpen`, `going`, `page`, `pickId`, `pauseTicks`. `holding` is derived from two of them, and nothing stops both being true.
- `export type Found = Record<string, unknown>` (saves.ts:22) is what the map's "progress" is. Each map re-validates it on every frame with ad-hoc guards: montyotr map.ts:97 `roomsOf`, blackwyche map.ts:44-57 `seen()` (which also writes `found.ship = s` back), karnath, jsw2, starquake, dragonskulle, awm. The validation is correct, but it is repeated per game and re-run per frame, and the type of the progress record lives only in each map's head.

**Why it matters.** This is the "types model the domain" rule, not satisfied where it matters most: the persisted player progress. The flag soup is also where the next regression ("CONTINUE? appeared after T on the pause screen") will come from.

**Fix.**
- Make the continue flow an explicit state: `type Flow = { kind: 'launching'; ticks } | { kind: 'idle' } | { kind: 'title'; prompt: null | 'title' | 'continue' | 'newGame'; … } | { kind: 'playing' }`, with `before()` split into `readIntent(input, layout): Intent` (pure; taps and keys to `'yes' | 'no' | 'fire' | …`) and `step(state, intent, status): {state, resume?}`. The latter is a pure function that can be tested exhaustively with no `Input` at all. This is a 60-line hand-rolled reducer, not a library.
- Type `Found` per game: `PauseMap<T, F>` plus a `FoundCodec<F> { empty(): F; parse(u: unknown): F }` supplied by the map. `FrontEnd` parses once at load and after resume, and serialises on keep. Maps then take an `F` and stop re-checking every frame.
- Hit-test geometry (`PAUSE_TAP`, `onStrip`, `listLine`) moves to one `layout` constants object per screen, shared with the drawing code that already knows the same numbers.

**Cost.** M for the reducer, M for typed `Found` (touches ~8 maps and their tests). **Risk.** Medium for the reducer (the frontend tests per game plus `games/shared/test/saves.ts` cover it); low for `Found`.

### 4. The strict-TypeScript rule has holes: implicit `any` from `JSON.parse` and friends

**What.** `tools/strict.mjs` is a 40-line AST walk that flags the keyword `any`, `as`, `!` and `@ts-*`. It cannot see an expression whose type is `any` by inference. I ran a throwaway type-checker scan (checker types, not keywords) over both tsconfigs and found, in hand-written code:
- Production (26 hits in `tsconfig.json`).
  - `packages/c64kit/src/c64/machine.ts:707`: `unpackState` does `const meta = JSON.parse(…)` and returns `{ ...meta, ram: …}` as `MachineState`. That is an unchecked `any` spread into the central save type, so every machine save (all 6 translated games and Antiriad) gets no validation at all on load beyond "JSON parses".
  - `games/montyotr/src/save.ts:72`, `awm/src/save.ts:129`, `starquake/src/save.ts:31/74`: `JSON.parse` is fed straight into a type guard. These are fine (the guard narrows), but only because every call happens to be wrapped; nothing enforces it.
  - `games/starquake/src/save.ts:58`: `Reflect.get(target, k)` in the reflective restore.
  - Three.js uniforms (`layer.ts:385-438`, `effects-layer.ts:144`): `IUniform<any>` from three's types. That is a genuine untyped third-party API; the rule says to isolate it in one commented adapter, and these are 8 scattered call sites.
  - `hdtest/gl.ts`: `getParameter` returns `any` (6 sites).
- Tests (41 more).
  - About 20 are `const routes: number[][] = JSON.parse(…)` in tests. That is an `any` assigned to a precise type with no check, which is exactly the loophole the rule is meant to close (a typo in `routes.json` becomes a confusing runtime failure).
  - `Function(...)()` in `gl-stub.ts:306`, `structuredClone(Reflect.get(...))` in several montyotr tests.

**Why it matters.** It matters most for saves: a corrupted or old-format machine save passes `unpackState` and then crashes or misbehaves inside the game.

**Fix.**
- Extend `strict.mjs` (about 30 lines, no install) to build a TS program and flag any call or identifier whose checker type is `any`, with an allowlist for the isolated adapters. My throwaway scanner is a working starting point (scratchpad `anyscan.mjs`). Alternatively, add `typescript-eslint` with `no-unsafe-assignment`, `no-unsafe-argument`, `no-unsafe-return`, `no-unsafe-member-access` and `consistent-type-assertions: never`. That is the standard way to enforce this, but it needs an install (ask first).
- Add a `readJson(text): unknown` helper in `guards.ts` that returns `unknown`, and use it everywhere `JSON.parse` is used (tests included).
- `unpackState`: validate the header (`cpu`, `cia1`, `cia2`, … as numbers/records) and lengths (`b.length === 4 + n + 0x10000 + 1024 + 0x40 + 0x20`) and throw a clear error. Add a short magic or version byte to packed states so a future format change can't be silently misread.
- Put the three.js uniform setters behind one `setUniform(u, ...values)` adapter, commented as the untyped boundary.

**Cost.** S-M. **Risk.** Low.

### 5. Four different save formats, one reflective, none versioned at the game-image level

**What.**
- Translated games and antiriad: `packState` (JSON header plus raw RAM) via `MACHINE_CODEC`. Monty: a JSON `MontySave` with `v: 1`, hand-listed `parseSave` (save.ts:62-70, every field named twice in the interface and in the guard). AWM: `AwmSave`, also hand-validated. Starquake: `snapshot` loops `Object.entries(g)` (save.ts:14) over every field of the `Game` object, minus a `SKIP` set, and restores with `Reflect.set`.
- Consequences.
  - Starquake: adding or renaming any field on `Game` changes the save format with no version. A new field restores as `undefined` from an old save. `describeSave` (save.ts:70-80) re-parses the blob to read `room`, `lives`, `coreMissing` and `score` by field name.
  - Machine saves have no marker for which build of the game image they came from. The workaround for this is the "mends" feature (`NativeGameOptions.mends`, `applyMends`, FNV hashes of 64-byte blocks, play.ts:620-642). It is clever, and it exists because there is no save-format version to migrate from.
  - `SaveSlot.data` is base64 in localStorage (about 87 KB per machine save, two slots per game, plus the previous one). localStorage quota is roughly 5 MB per origin, and all games share the origin. Ten games with a current and a previous save each is close to the limit; `writeCurrent` returning false on a full store is handled quietly (`saves.ts` `set`), but the player is not told.

**Why it matters.** Saves are the one persistent contract with the player. The mechanism works today; its weak point is change.

**Fix.**
- A shared `SaveCodec<S>` that always includes `{ game, format: number, image?: hash }` in the envelope, so `unpack` can reject or migrate a save instead of guessing.
- Replace Starquake's reflection with an explicit `StarquakeSave` type listing the persisted fields (the same shape as Monty's), with a guard.
- Derive the interface and its validator from one definition (see the schema candidate in the libraries section) to stop writing each field twice.
- Compress machine saves (the state is mostly zeros; `CompressionStream('gzip')` is built into the browsers and Node 24, no install) and store them in IndexedDB or at least report a failed write to the player.

**Cost.** M. **Risk.** Medium: a format change must migrate existing players' saves (`readSaves` already has a `migrate`). Keep old formats readable.

### 6. Generated code: regenerate at build, don't commit it (done: `tools/gen.mjs`, `games/*/src/gen/` is gitignored)

**What.** There are 76 generated files in `games/*/src/gen`, 109,012 lines and 5.3 MB, sitting beside about 56 k hand-written lines. Each is "Generated by tools/re/to-ts.mjs from X.json: do not edit by hand". Inputs are committed: the `re/*.json` configs (50 of them) and 68 KB `assets/*-title.state` snapshots. I verified determinism in scratch: copying `games/entombed/{re,assets}` and running `node tools/re/to-ts.mjs engine.json` and `room-6000.json` reproduced the committed `engine.ts` and `rooms/room-6000.ts` **byte for byte**, each in about 0.2 s. There is no single "regenerate everything" command; the README says to run the translator per config.

**Why it matters.** Committing derived output bloats the repo (every translator change produces a thousand-line diff nobody reviews), invites hand edits (the README for entombed explicitly says nothing generated is hand-edited, but there is no guard), and makes the translator's behaviour hard to see in review.

**Fix.**
- Add `tools/gen.mjs`: for each game, run the translator over all `re/*.json` that name an `out`. Estimated total about 10-15 s. Wire it as `npm run gen`, run automatically before `typecheck`, `test` and `build`.
- Stop committing `*/gen/` (gitignore). The inputs are committed, and the build is deterministic, so a clean checkout builds the same code.
- Safety net so a translator change can't silently alter behaviour: keep the lockstep/verify tests (`games/shared/native/test/lockstep.ts`, `verify.ts`), and add a cheap `gen:hash` snapshot (a checked-in file of hashes of each generated file) that CI or a pre-push check compares. A translator change then shows up as a one-line hash change in review, not 100 k lines.
- If you prefer to keep committing it, at least add `npm run gen:check` that regenerates into a temp dir and diffs, so drift and hand edits are caught.

**Cost.** S-M. **Risk.** Low, provided the determinism holds on a clean machine (same Node and no network). Caveat: the `.state` snapshots are compiled-in inputs; they must stay committed.

### 7. Tests: a lot of coverage, no single entry point, 66 copies of `check()`

**What.**
- 125 files under `test/` directories (about 20 k lines, roughly a third of hand-written code), run one at a time through `node tools/test.mjs <file>`. 66 of them define the identical `const check = (what, ok) => {...}` helper, then `process.exit(failures ? 1 : 0)` at the end. Others use slightly different variants (`controls.ts` and `rooms.ts` print only failures; `map.ts` is silent on pass).
- Only 3 scripts exist in `package.json` (`test:touch`, `test:effects`, `test:input`). There is no way to say "run everything". About half the files take arguments or an output directory (screenshots), or need originals that are not committed (`.d64`/`.prg` under `build/`: awm, blackwyche mend and rooms, montyotr title and jetpack, starquake ref), so a naive loop would not work. `explore.ts` and `blackwyche/test/hd-fixtures.ts` write committed files, so they are not tests at all.
- There is no CI (Actions minutes are scarce), so nothing runs the tests on push.
- The ones I ran (the front-end and grace tests of every game, `saves`, `loader`) pass and take 0.1-0.6 s each. The whole non-original suite is probably a few minutes.
- `tools/test.mjs` imports `esbuild`, which is not in `package.json`; it only works because vite 5.4.11 depends on it (version 0.21.5 in `node_modules`). Twelve places (README, re/README.md, test headers) say `npx tsx …`; `tsx` is not installed, so on this server `npx` would fetch it from the network.
- `games/shared/test/kit.ts` is a second index of c64kit (115 lines) that every test is bundled against, with a hand-written `PixelRenderer` that "implements `Renderer`". It works because `Renderer` is an interface, but it is a parallel implementation that must be kept in step with `packages/c64kit/src/index.ts`; the games construct `new SidPlayer()`, `new C64View(...)` themselves, so tests can't just inject.

**Fix.**
1. Add `tools/test-all.mjs` with a manifest (`tools/tests.json` or a list at the top): `{ file, args?, needs?: 'originals' | 'none', writes?: boolean }`. Default run = everything with `needs: none`. It uses **`node:test`** (built in to Node 24; no install): one `test()` per file that spawns `nice -n 15 node tools/test.mjs <file>` and asserts exit code 0, run serially (`concurrency: 1`) to respect "one heavy process at a time". Output is TAP/spec for free, plus a total and per-file time. Add `npm test`, and `npm run test:game -- entombed`.
2. Keep each test's `check()` but move it to one `games/shared/test/check.ts` exporting `check`, `done()` (prints and sets the exit code). 66 deletions of one line each, sed-able. Do not rewrite 125 files into `describe/it`; the files are scenario scripts, and a rewrite would risk them for no gain.
3. Declare `esbuild` in `devDependencies` (needs a one-line install of an already-present version, ask first). Replace `npx tsx` in docs with `node tools/test.mjs` (it already runs any TS file), or add `tsx` to devDependencies.
4. Run the suite as a pre-push step (a `.git/hooks/pre-push` or `npm run verify` = typecheck + strict + tests), not in CI. That costs no Actions minutes.
5. Later: move the games' constructors for `SidPlayer` and `C64View` onto `Host` (`host.audio`, `host.makeView`) so tests can inject fakes and the `kit.ts` alias goes away.

**Cost.** S (runner and `check.ts`), S (docs), M (item 5). **Risk.** Low.

### 8. Duplicated registry, and per-game boilerplate that wants a manifest

**What.** A game is registered in three places: `GAMES` in `games/loader.ts:13-24` (id, name, blocks), `PROGRAMS` in `games/shell.ts` (id to dynamic import), and each game's `info` object inside its own `main.ts`. `games/saves.ts` and `shared/test/loader.ts` read `GAMES`. Nothing checks that the two lists agree, but adding a game means editing both plus the `info`. Each `main.ts` also embeds 20-30 lines of HTML prose as a template string inside the code (entombed main.ts:14-40), next to wiring.

**Fix.** One `games/registry.ts`: `{ id, name, blocks, load: () => import(...) }[]`. The loader reads names, the shell reads `load`. Move the prose into `games/<id>/src/info.ts` (data, no logic). A test can then assert that registry ids equal directories under `games/` that have a `main.ts`.

**Cost.** S. **Risk.** Low.

### 9. Dead code: small, but there is a whole dead entry point (done: the items below are deleted)

**What.** A scan of exported names with no importer anywhere (tests included):
- `games/shared/original.ts` (152 lines) `runOriginal`, a third copy of the tick loop. Nothing imports it; AGENTS.md still names it in the touch-layer row.
- `games/shared/native/patch.ts` (147 lines) `patchInto`: unused.
- Six unused `Native<Game>` classes: `native.ts` in blackwyche, dragonskulle, entombed, jsw2, karnath, thingonaspring (`NativeEntombed extends NativeHost` and the like).
- Smaller: `BANNER_TEXT`, `FK_NAMES`, `ITEM_NAMES` (montyotr data.ts), `teleportName` (starquake specials.ts), `ATTR` (starquake screen.ts), `placeOn` (pendragon/room.ts), `decodeHiresSprite`, `decodeMulticolourSprite`, `surfacesOverlap` (c64kit surface.ts), `SPECIAL_ROOM`, `GRID_ROWS` (awm).
- About 115 more exports are used only inside their own file (over-exported). That is cosmetic.

**Why it matters.** `runOriginal` and `patchInto` are code that looks like infrastructure and is not. They mislead the next agent into extending the wrong thing.

**Fix.** Delete the first three groups (about 350 lines) and update AGENTS.md. Re-run `tsc` and the tests. The smaller list is one pass with `ts-prune`-style output; my scan script is in the scratchpad (`dead.mjs`, output `dead.txt`).

**Cost.** S. **Risk.** Very low.

### 10. Size and shape of the hand-written code

**What.** The biggest hand-written files are `games/shared/test/hd.ts` 848, `c64kit/src/hd/scene.ts` 812, `montyotr/src/game.ts` 802, `hd/oblique.ts` 757, `awm/src/monty.ts` 718, `c64/machine.ts` 711, `play.ts` 676, `hd/layer.ts` 650. None is unreasonable for what it does. The Monty games are a rewrite from data and are in good shape. The real hot spots are structural, covered in findings 1-3, not "too many lines in one file". `AGENTS.md` is 45 KB and one table row (the HD view) runs to a single line of thousands of characters; it is useful as a log of decisions, but nobody (human or agent) can find the shared-module list in it. Moving each row to the module's header comment, or `docs/`, and keeping AGENTS.md as the short "rules and where things are" would help the agents that depend on it.

**Fix.** Split AGENTS.md: rules (strict TS, DRY, two modes), then a one-line-per-feature index linking to `docs/<feature>.md` or the module header.

**Cost.** S. **Risk.** None.

---

## Libraries

Dependencies are three, vite and typescript. Nothing here needs a runtime library.

| Candidate | Verdict | Why |
|---|---|---|
| **Zustand** | **No** | It solves sharing UI state across React components with subscriptions and selectors. There is no React and no UI tree. The state is a 50 Hz mutable simulation (C64 RAM, a `Game` object) plus a front-end flow, and saves need a full snapshot (bytes), which a store would not give. The front-end flow's real problem is that its states are implicit. A discriminated union and a pure `step()` (finding 3) fixes that in about 60 lines with no dependency. |
| **XState** | **No** | Same need as above, much heavier than the problem (the flow has about 5 real states). A hand reducer in the type system you already enforce is better. Revisit only if the number of screens grows well beyond the current set. |
| **Valibot (or Zod)** | **Yes, small and optional** | Where it earns its place: boundary validation of saves and `Found`. Today `MontySave`, `AwmSave` and the maps' progress records each write the shape twice (interface and guard), by hand. A schema gives the type via inference and one validator. Valibot is tree-shakeable and a few KB; Zod is larger. If you'd rather add no dependency, extend `guards.ts` with 60 lines of combinators (`object`, `array`, `optional`) and an inferred `Infer<…>` type. Either way, needs sign-off before any install on this server. |
| **Vitest** | **No** | Needs an install, and the suite is 125 imperative scenario scripts with their own pass/fail print and a custom esbuild alias to a stand-in kit. Vitest would work but gives little (watch mode, snapshots) and wants the tests rewritten into `describe/it`. |
| **node:test** | **Yes (as the runner only)** | Built into Node 24, zero installs. Use it as the orchestrator in `tools/test-all.mjs` (serial, one subprocess per script, TAP output, an exit code), not as a rewrite of the tests. See finding 7. |
| **esbuild** | **Yes, declare it** | Already used by `tools/test.mjs` but only present because vite depends on it. Add it to `devDependencies` pinned to the installed 0.21.5; a one-line change that stops a vite upgrade from breaking the tests. |
| **typescript-eslint** | **Yes, if an install is acceptable** | Enforces your rules properly (`no-unsafe-*`, `consistent-type-assertions: never`, `no-non-null-assertion`). The cheaper alternative, extending `strict.mjs` with the type checker (finding 4), needs no install and gets 90% of the benefit. |
| **tsx** | **No** | Docs mention it (12 places) but it isn't installed. `tools/test.mjs` already runs any TS file; fix the docs. |
| **A game/ECS framework (Phaser etc.)** | **No** | The games are bit-exact ports of 8-bit machines on a custom VIC/SID/CIA model; a general engine would fight that. |

---

## Recommended order of work

1. **Close the strictness holes (finding 4) and add the single test runner (finding 7).** Both are small, low-risk and make everything after safer. About a day of work in total: the `strict.mjs` any-scan, `readJson`, `unpackState` validation, `tools/test-all.mjs` on `node:test`, `check.ts`, docs fixed to `node tools/test.mjs`. Add `npm run verify` (typecheck + strict + tests) as a pre-push step instead of CI.
2. **Stop committing generated code (finding 6) and delete the dead code (finding 9).** `tools/gen.mjs` plus gitignore, and a `gen:hash` file for review. Delete `runOriginal`, `patchInto`, the six `Native*` classes and the small unused exports. Repo shrinks by about 5.5 MB and 109 k lines of diff noise disappears.
3. **Extract the small shared pieces from the five tick loops (finding 1, step 1).** `FireLatch`, audio unlock and mute, and the room-save bookkeeping. Replace the raw `{...cpu}` copies in `play.ts` with `runner.call` (finding 2, S). This is the safe on-ramp to the big change.
4. **Make the front-end state explicit and `Found` typed (finding 3), then do `runPort` (finding 1, step 2).** Reducer for `ContinueFlow` first (it is the thing `runPort` will own), typed `Found` per map, then port the four native games onto `runPort` one at a time with their frontend tests as the guard. Decompose `runNative` into feature objects (finding 2) at the same time.
5. **Save format envelope (finding 5), plus the registry (finding 8).** Do the envelope with the schema decision (valibot or in-house combinators). Migrate old saves on read. Then one registry file and the AGENTS.md split.
