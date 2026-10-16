// The repo's headless tests, for tools/test-all.mjs. One entry per run of a script:
//   file    a TypeScript test, run as `node tools/test.mjs <file> [args]` (or `cmd`: any other command)
//   args    the arguments it needs
//   set     'fast' (default run; the whole fast set takes a few minutes) or 'slow' (--slow: long-running or heavy)
//   needs   files it wants that may not be on this machine; one missing = skipped with a message, not failed
//   todo    a known failure: it runs and is reported, but does not fail the run
//   name    how it is listed (default: file and args)
// Not listed, on purpose: scripts that write committed files or pictures rather than check anything
// (games/blackwyche/test/hd-fixtures.ts, antiriad/test/fixtures.ts, native/test/explore.ts, shots.ts,
// effects-shots.ts), helper modules, and Starquake's comparisons against its original (they need snapshots
// made by hand from the original; see games/starquake/build/README.md).
// A new test goes here. Games whose originals are gitignored (AWM) are listed with `needs`.

const AWM = 'games/awm/build/play.state'; // the machine in play, from the original
const AWM_T = 'games/awm/build/t807.state'; // the original at its title's set-up
const MOTR = '/tmp/motr.prg'; // the original Monty on the Run (npm run extract:motr)

/** @type {{ file?: string, cmd?: string[], args?: string[], set: 'fast' | 'slow', needs?: string[], name?: string, todo?: string, limitSeconds?: number }[]} */
export const TESTS = [
  // ---- shared modules and the kit
  { file: 'games/shared/test/machine-state.ts', set: 'fast' },
  { file: 'games/shared/test/saves.ts', set: 'fast' },
  { file: 'games/shared/test/continue-step.ts', set: 'fast' },
  { file: 'games/shared/test/loader.ts', set: 'fast' },
  { file: 'games/shared/test/export.ts', set: 'fast' },
  { file: 'packages/c64kit/test/effects.test.ts', set: 'fast' },
  { file: 'packages/c64kit/test/input.test.ts', set: 'fast' },
  { name: 'touch layer (npm run test:touch)', cmd: ['npm', 'run', '--silent', 'test:touch'], set: 'fast' },
  { name: 'translator fuzz (tools/re/test/run-fuzz.mjs)', cmd: [process.execPath, 'tools/re/test/run-fuzz.mjs'], set: 'slow' },

  // ---- Auf Wiedersehen Monty (its originals are gitignored: games/awm/build/README.md)
  { file: 'games/awm/test/frontend.ts', set: 'fast' },
  { file: 'games/awm/test/closing.ts', args: [AWM], set: 'slow', needs: [AWM] },
  { file: 'games/awm/test/flow.ts', args: [AWM], set: 'slow', needs: [AWM] },
  { file: 'games/awm/test/lockstep.ts', args: [AWM, 'R:100,UR:30,F:1'], set: 'slow', needs: [AWM] },
  { file: 'games/awm/test/picture.ts', args: [AWM, 'rand:600:7'], set: 'slow', needs: [AWM] },
  { file: 'games/awm/test/program.ts', args: [AWM_T], set: 'slow', needs: [AWM_T] },
  { file: 'games/awm/test/rooms.ts', args: [AWM], set: 'slow', needs: [AWM] },
  { file: 'games/awm/test/sound.ts', args: [AWM], set: 'slow', needs: [AWM] },
  { file: 'games/awm/test/sprites.ts', args: [AWM], set: 'slow', needs: [AWM] },
  { file: 'games/awm/test/title.ts', args: [AWM_T, '400'], set: 'slow', needs: [AWM_T] },

  // ---- Antiriad
  { file: 'games/antiriad/test/cells.ts', set: 'fast' },
  { file: 'games/antiriad/test/centre.ts', set: 'fast' },
  { file: 'games/antiriad/test/controls.ts', set: 'fast' },
  { file: 'games/antiriad/test/empty.ts', set: 'fast' },
  { file: 'games/antiriad/test/feel.ts', set: 'fast' },
  { file: 'games/antiriad/test/frontend.ts', set: 'fast' },
  { file: 'games/antiriad/test/grace.ts', set: 'fast' },
  { file: 'games/antiriad/test/logic.ts', set: 'fast' },
  { file: 'games/antiriad/test/travel.ts', set: 'fast' },
  { file: 'games/antiriad/test/won.ts', set: 'fast' },
  { file: 'games/antiriad/test/transitions.ts', args: ['games/antiriad/test/original.state'], set: 'fast' },
  { file: 'games/antiriad/test/rooms.ts', args: ['games/antiriad/test/original.state'], set: 'fast' },
  { file: 'games/antiriad/test/soak.ts', set: 'slow' },
  { file: 'games/antiriad/test/hunt.ts', set: 'slow' },
  { file: 'games/antiriad/test/lockstep.ts', args: ['games/antiriad/test/original.state', 'R:100,-:20,UR:30'], set: 'slow' },

  // ---- Blackwyche
  { file: 'games/blackwyche/test/grace.ts', set: 'fast' },
  { file: 'games/blackwyche/test/guided.ts', set: 'fast' },
  { file: 'games/blackwyche/test/items.ts', set: 'fast' },
  { file: 'games/blackwyche/test/ladder.ts', set: 'fast' },
  { file: 'games/blackwyche/test/map.ts', set: 'fast' },
  { file: 'games/blackwyche/test/mend.ts', set: 'fast' },
  { file: 'games/blackwyche/test/pictures.ts', set: 'slow' },
  { file: 'games/blackwyche/test/rooms.ts', set: 'fast' },
  { file: 'games/blackwyche/test/trapdoors.ts', set: 'fast' },
  { file: 'games/blackwyche/test/hd.ts', set: 'slow' },

  // ---- Dragon Skulle
  { file: 'games/dragonskulle/test/frontend.ts', set: 'fast' },
  { file: 'games/dragonskulle/test/grace.ts', set: 'fast' },
  { file: 'games/dragonskulle/test/shovel-touch.ts', set: 'fast' },
  { file: 'games/dragonskulle/test/shovel.ts', set: 'fast' },
  { file: 'games/dragonskulle/test/hd.ts', set: 'slow' },

  // ---- Entombed
  { file: 'games/entombed/test/combat.ts', set: 'fast' },
  { file: 'games/entombed/test/controls.ts', set: 'fast' },
  { file: 'games/entombed/test/frontend.ts', set: 'fast' },
  { file: 'games/entombed/test/grace.ts', set: 'fast' },
  { file: 'games/entombed/test/map.ts', set: 'fast' },
  { file: 'games/entombed/test/pictures.ts', set: 'slow' },
  { file: 'games/entombed/test/stairs.ts', set: 'fast' },
  { file: 'games/entombed/test/hd.ts', set: 'slow' },

  // ---- HD view on the stand-in GL
  { file: 'games/hdtest/test/hdtest.ts', set: 'fast' },

  // ---- Jet Set Willy II
  { file: 'games/jsw2/test/deathloop.ts', set: 'fast' },
  { file: 'games/jsw2/test/falls.ts', set: 'fast' },
  { file: 'games/jsw2/test/frontend.ts', set: 'fast' },
  { file: 'games/jsw2/test/grace.ts', set: 'fast' },
  { file: 'games/jsw2/test/items.ts', set: 'fast' },
  { file: 'games/jsw2/test/run.ts', set: 'fast' },
  { file: 'games/jsw2/test/sprites.ts', set: 'fast' },
  { file: 'games/jsw2/test/route.ts', set: 'fast', todo: 'fails on main too: travel offers 5 of 7 rooms passed through, and reopening lands in another room' },

  // ---- Karnath
  { file: 'games/karnath/test/grace.ts', set: 'fast' },
  { file: 'games/karnath/test/pictures.ts', set: 'fast' },
  { file: 'games/karnath/test/hd.ts', set: 'slow' },

  // ---- Monty on the Run (title.ts and jetpack.ts compare with the original: /tmp/motr.prg, made by npm run extract:motr)
  { file: 'games/montyotr/test/c5.ts', set: 'fast' },
  { file: 'games/montyotr/test/c5hop.ts', set: 'fast' },
  { file: 'games/montyotr/test/c5respawn.ts', set: 'fast' },
  { file: 'games/montyotr/test/ending.ts', set: 'fast' },
  { file: 'games/montyotr/test/frontend.ts', set: 'fast' },
  { file: 'games/montyotr/test/grace.ts', set: 'fast' },
  { file: 'games/montyotr/test/runstop64-rooms.ts', set: 'slow' },
  { file: 'games/montyotr/test/warps.ts', set: 'fast' },
  { file: 'games/montyotr/test/jetpack.ts', args: [MOTR], set: 'slow', needs: [MOTR] },
  { file: 'games/montyotr/test/title.ts', args: [MOTR], set: 'fast', needs: [MOTR] },

  // ---- Starquake (the comparisons with its original need snapshots made by hand: not listed)
  { file: 'games/starquake/test/frontend.ts', set: 'fast' },
  { file: 'games/starquake/test/grace.ts', set: 'fast' },

  // ---- Thing on a Spring
  { file: 'games/thingonaspring/test/assists.ts', set: 'slow', limitSeconds: 580 },
  { file: 'games/thingonaspring/test/frontend.ts', set: 'fast' },
  { file: 'games/thingonaspring/test/grace.ts', set: 'fast' },
  { file: 'games/thingonaspring/test/names.ts', set: 'fast' },
  { file: 'games/thingonaspring/test/travel.ts', set: 'slow' },

  // ---- Translated games, together (games/shared/native/test)
  { file: 'games/shared/native/test/combat.ts', args: ['karnath'], set: 'slow' },
  { file: 'games/shared/native/test/controls.ts', args: ['karnath'], set: 'slow' },
  { file: 'games/shared/native/test/travel.ts', args: ['karnath'], set: 'slow' },
  { file: 'games/shared/native/test/combat.ts', args: ['blackwyche'], set: 'slow' },
  { file: 'games/shared/native/test/controls.ts', args: ['blackwyche'], set: 'slow' },
  { file: 'games/shared/native/test/travel.ts', args: ['blackwyche'], set: 'slow' },
  { file: 'games/shared/native/test/combat.ts', args: ['dragonskulle'], set: 'slow' },
  { file: 'games/shared/native/test/controls.ts', args: ['dragonskulle'], set: 'slow' },
  { file: 'games/shared/native/test/travel.ts', args: ['dragonskulle'], set: 'slow' },
  { file: 'games/shared/native/test/pausemap.ts', args: ['blackwyche'], set: 'slow' },
  { file: 'games/shared/native/test/resume.ts', args: ['entombed'], set: 'slow' },
  { file: 'games/shared/native/test/verify.ts', args: ['entombed', '600'], set: 'slow' },
  // (lockstep does not apply to Karnath and JSW II, which time themselves; irqcycles.ts and trace.ts are their checks, not listed yet)
  { file: 'games/shared/native/test/lockstep.ts', args: ['entombed', '500'], set: 'slow' },
  { file: 'games/shared/native/test/resume.ts', args: ['blackwyche'], set: 'slow' },
  { file: 'games/shared/native/test/verify.ts', args: ['blackwyche', '600'], set: 'slow' },
  { file: 'games/shared/native/test/lockstep.ts', args: ['blackwyche', '500'], set: 'slow' },
  { file: 'games/shared/native/test/resume.ts', args: ['dragonskulle'], set: 'slow' },
  { file: 'games/shared/native/test/verify.ts', args: ['dragonskulle', '600'], set: 'slow' },
  { file: 'games/shared/native/test/lockstep.ts', args: ['dragonskulle', '500'], set: 'slow' },
  { file: 'games/shared/native/test/resume.ts', args: ['karnath'], set: 'slow' },
  { file: 'games/shared/native/test/verify.ts', args: ['karnath', '600'], set: 'slow' },
  { file: 'games/shared/native/test/resume.ts', args: ['thingonaspring'], set: 'slow' },
  { file: 'games/shared/native/test/verify.ts', args: ['thingonaspring', '600'], set: 'slow' },
  { file: 'games/shared/native/test/lockstep.ts', args: ['thingonaspring', '500'], set: 'slow' },
  { file: 'games/shared/native/test/resume.ts', args: ['jsw2'], set: 'slow' },
  { file: 'games/shared/native/test/verify.ts', args: ['jsw2', '600'], set: 'slow' },
];
