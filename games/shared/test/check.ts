/**
 * Pass/fail reporting for the headless tests, in one place: `check(what, ok)` prints one line per
 * check (`ok  ` or `FAIL`) and counts it; `finish()` prints the total and exits 1 if any failed
 * (the exit code is what tools/test-all.mjs and `npm run verify` go by).
 *
 *   check('the pause screen opens', paused);
 *   finish();
 */

let passed = 0;
let failed = 0;

/** Report one check. `VERBOSE` unset: `quiet` checks print only when they fail. */
export function check(what: string, ok: boolean, quiet = false): void {
  if (ok) passed++;
  else failed++;
  if (!ok || !quiet || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
}

/** Count a failure found some other way (a comparison loop with its own report). */
export function fail(what: string): void {
  failed++;
  console.log(`FAIL ${what}`);
}

/** How many checks have failed so far. */
export function failures(): number {
  return failed;
}

/** Print the total and end the run: exit code 1 if anything failed, else 0. */
export function finish(): never {
  const total = passed + failed;
  console.log(failed ? `${failed} of ${total} checks FAILED` : `all ${total} checks passed`);
  process.exit(failed ? 1 : 0);
}
