// Checks for data read back from outside the code (JSON kept in the browser: saves, what's been
// found for the maps; data files): narrow `unknown` to what the game expects, never assume it.

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
export const isNumber = (v: unknown): v is number => typeof v === 'number';
export const isString = (v: unknown): v is string => typeof v === 'string';
export const isNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every(isNumber);
export const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
export const isRecordOf = <T>(v: unknown, item: (x: unknown) => x is T): v is Record<string, T> =>
  isRecord(v) && Object.values(v).every(item);
