/** For checks: a value the test needs to be there, or a clear failure saying what was missing. */
export function must<T>(v: T | null | undefined, what: string): T {
  if (v === null || v === undefined) throw new Error(`missing: ${what}`);
  return v;
}
