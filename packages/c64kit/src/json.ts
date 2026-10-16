// Reading data that comes from outside the code (JSON kept in the browser, data files, a save):
// `readJson` is the one place `JSON.parse`'s `any` is turned into `unknown`; everything else
// narrows with the guards below, never assumes.

/**
 * Parse JSON text as `unknown`. This is the single untyped adapter for `JSON.parse` (whose lib
 * signature returns `any`); callers narrow the result with the guards. Throws on bad JSON.
 */
export function readJson(text: string): unknown {
  const parsed: unknown = JSON.parse(text); // strict-ok: untyped API (JSON.parse returns any; typed unknown here, once)
  return parsed;
}

/** The property `key` of `target` as `unknown` (`Reflect.get` returns `any`); the one adapter for reflective reads. */
export function getProp(target: object, key: PropertyKey): unknown {
  const value: unknown = Reflect.get(target, key); // strict-ok: untyped API (Reflect.get returns any; typed unknown here, once)
  return value;
}

export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
export const isNumber = (v: unknown): v is number => typeof v === 'number';
export const isString = (v: unknown): v is string => typeof v === 'string';
export const isNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNumber);
export const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
export const isRecordOf = <T>(v: unknown, item: (x: unknown) => x is T): v is Record<string, T> =>
  isRecord(v) && Object.values(v).every(item);
export const isArrayOf = <T>(v: unknown, item: (x: unknown) => x is T): v is T[] => Array.isArray(v) && v.every(item);
