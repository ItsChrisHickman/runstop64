#!/usr/bin/env bash
# Wait for a turn to run tests: at most three at once (Chris, 2026-11-21: speed matters, the server has the power; tests run niced below the sites).
# A running test-all (`npm run verify`, `npm test`) counts as three (it runs three tests at a time); a lone tools/test.mjs as one.
#   tools/wait-turn.sh      before a single test
#   tools/wait-turn.sh 3    before `npm run verify`
need=${1:-1}; [ "$need" = "--count" ] && need=0
under_test_all() { # is process $1 started by a test-all?
  local p=$1
  for _ in 1 2 3; do
    p=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ')
    [ -z "$p" ] && return 1
    ps -o args= -p "$p" 2>/dev/null | grep -q 'tools/test-all\.mjs' && return 0
  done
  return 1
}
busy() {
  local n=0 pid
  # a test-all takes as many slots as it runs tests at once (its JOBS, 3 by default)
  for pid in $(pgrep -f '^(\S*/)?node tools/test-all\.mjs' || true); do
    jobs=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null | sed -n 's/^JOBS=//p' | head -1)
    n=$((n + ${jobs:-3}))
  done
  for pid in $(pgrep -f '^(\S*/)?node tools/test\.mjs' || true); do under_test_all "$pid" || n=$((n + 1)); done
  echo "$n"
}
[ "${1:-}" = "--count" ] && { busy; exit 0; }
while [ $(( $(busy) + need )) -gt 3 ]; do sleep 10; done
