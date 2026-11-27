# Committed workflows

Workflow scripts kept in the repo so a pass can be run again without re-writing its briefs: launch one from a Claude Code session with
the Workflow tool, `scriptPath` set to the file (e.g. `/root/projects/runstop64/tools/workflows/dosvidaniya-challenge-pass.js`),
after reading it and checking its job list, lanes and worktree names against today's state (at most two agents at once: skill
`runstop64-ship`). Each brief loads the skills (`monty-room`, `monty-mechanism`, `runstop64-ship`) rather than pasting engine
notes, takes its rooms' rows from `docs/dosvidaniya-feedback.md` and marks a row done with the commit once
`games/montyworld/test/rooms-sheet.ts` renders the fix; edit the job list here, not a private copy, and commit the change.
