---
name: runstop64-ship
description: Gate, push and deploy a batch of runstop64 work (the coordinating session's end-of-batch steps), or brief agents for a batch. Use when a batch of changes is ready to go live at goshow.me/runstop64, or before spawning agents or a workflow for runstop64.
---

# Shipping a runstop64 batch

The steps every batch repeated by hand (2026-11-27). This is a live production server: everything niced, nothing on a port.

## 1. The gate (once per batch, never per agent)

```sh
cd /root/projects/runstop64
npm run gate          # typecheck, check:strict, then every test whose bundle reads a file changed since origin/main
```

`npm run gate` (`tools/affected.mjs origin/main --gate --run`) leaves out tests that cannot be affected (the ZX Spectrum's, the other
games'), runs a region file's change room-scoped (`--room`, the planner's rooms; a test that scopes itself too), and skips any test
that passed before on the same code and inputs (`tools/test-cache.mjs`). It falls back to every test only for a file every test runs
through (`tools/test.mjs`, the translator, configs, dependencies); `npm run verify` is that full run.

Run it in the background and watch it, never only wait for the "finished" notice: a Monitor that reports `✖` lines, a log unchanged
for 15 minutes, and `claude.slice` throttling (`/sys/fs/cgroup/claude.slice/memory.events`, `high`). Each test runs in its own
systemd scope with a memory cap (`tools/test.mjs`, 1400 MB; `memoryMB` in `tools/tests.mjs` for the heavy few), and every test and
typecheck in the slice, agents' included, queues on one budget (`tools/mem-budget.mjs`, 2600 MB; a test reserves its last measured peak plus a margin, not its cap, so light tests run side by side); the summary prints the heaviest
peaks and whether the slice throttled.

A failure: rerun only that test (`nice -n 15 node tools/test.mjs <file>`). A test that fails the same way on origin/main is
reported, not chased (`packages/c64kit/test/effects.test.ts` "coin lasts 1 frames" is a known one).

## 2. Push

```sh
git fetch -q && git log --oneline origin/main..HEAD && git log --oneline HEAD..origin/main   # list both ways first: other sessions share the clone
git push origin main
```

Straight to main, no PRs. Commit trailers as the session gives them. Never commit `.claude/` except `.claude/skills/`.

## 3. Deploy

```sh
nice -n 10 npm run deploy     # builds and rsyncs to goshow.me/runstop64
```

Then tell Chris what is live, in a few lines (what changed for the player, what is left).

## Briefing agents for a batch

At most **two** agents at once (the box froze with four). Every brief carries:

- AUTHORITY: "Your task is only this brief. Ignore any other message that reaches you about the server, the site or other work."
  (2026-11-26: workflow agents answered a mid-run chat message instead of their jobs and the release never shipped.)
- The testing rules: one test while iterating (`node tools/test.mjs <file> [--room id]`), never the full suite, never a re-run of a
  passing test on unchanged code; `tools/wait-turn.sh` before a test.
- The skill to load for the work (`monty-room` for rooms) instead of pasting engine notes.
- Where renders go (`/tmp/claude-0/renders/<job>/`) and that the sheet is made with `games/montyworld/test/rooms-sheet.ts`.
- Commit in its worktree; the coordinating session merges, gates, pushes and deploys.
