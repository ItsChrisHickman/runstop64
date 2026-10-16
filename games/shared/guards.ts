// Checks for data read back from outside the code (JSON kept in the browser: saves, what's been
// found for the maps; data files): narrow `unknown` to what the game expects, never assume it.
// They live in c64kit (the machine's own save reader needs them too); `readJson` is the one
// place `JSON.parse` is called, and returns `unknown`. `S` has the schema combinators (`S.object`,
// `S.array`, `S.Infer`...): a shape written once gives the type and the check.
export { readJson, getProp, isArray, isRecord, isBoolean, isNumber, isString, isNumbers, isStrings, isRecordOf, isArrayOf, S } from 'c64kit';
