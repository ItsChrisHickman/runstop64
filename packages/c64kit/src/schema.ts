// Small schema combinators for data that comes from outside the code (a save read back from
// storage, what a map kept): a shape is written once and gives both the type (`Infer`) and the
// check. A schema is a plain type guard, so the guards in json.ts (`isNumber`, `isRecord`...) are
// schemas too and the two mix freely. Used as `S.object({ room: S.number, hands: S.array(hand) })`.
import { isArray, isArrayOf, isBoolean, isNumber, isNumbers, isRecord, isRecordOf, isString, isStrings } from './json';

/** A schema: says whether an unknown value is a `T`. */
export type Schema<T> = (v: unknown) => v is T;
/** The type a schema checks for. */
export type Infer<G> = G extends (v: unknown) => v is infer T ? T : never;

export const number: Schema<number> = isNumber;
export const string: Schema<string> = isString;
export const boolean: Schema<boolean> = isBoolean;
/** A list of numbers, of strings. */
export const numbers: Schema<number[]> = isNumbers;
export const strings: Schema<string[]> = isStrings;

/** Exactly this value (a string, number, boolean or null). */
export const literal = <const T extends string | number | boolean | null>(value: T): Schema<T> => (v): v is T => v === value;
/** `undefined` or a `T` (a key that is allowed to be missing). */
export const optional = <T>(item: Schema<T>): Schema<T | undefined> => (v): v is T | undefined => v === undefined || item(v);
/** `null` or a `T`. */
export const nullable = <T>(item: Schema<T>): Schema<T | null> => (v): v is T | null => v === null || item(v);
/** A list of `T`. */
export const array = <T>(item: Schema<T>): Schema<T[]> => (v): v is T[] => isArrayOf(v, item);
/** A record of any keys whose values are all `T`. */
export const record = <T>(item: Schema<T>): Schema<Record<string, T>> => (v): v is Record<string, T> => isRecordOf(v, item);
/** Any one of these. */
export const union = <T extends readonly Schema<unknown>[]>(...options: T): Schema<Infer<T[number]>> =>
  (v): v is Infer<T[number]> => options.some((o) => o(v));
/** A list of exactly these, in order: `tuple(number, string)` is `[number, string]`. */
export const tuple = <T extends readonly Schema<unknown>[]>(...items: T): Schema<{ [I in keyof T]: Infer<T[I]> }> =>
  (v): v is { [I in keyof T]: Infer<T[I]> } => isArray(v) && v.length === items.length && items.every((item, i) => item(v[i]));
/** What the schema checks, and one more condition on it (a length, a range, a key that must exist). */
export const refine = <T>(item: Schema<T>, ok: (v: T) => boolean): Schema<T> => (v): v is T => item(v) && ok(v);

type Shape = { readonly [key: string]: Schema<unknown> };
type Flat<T> = { [K in keyof T]: T[K] };
type OptionalKeys<G extends Shape> = { [K in keyof G]: undefined extends Infer<G[K]> ? K : never }[keyof G];
/** The type of an object schema: a key whose schema allows `undefined` may be missing. */
export type ObjectOf<G extends Shape> = Flat<{ [K in Exclude<keyof G, OptionalKeys<G>>]: Infer<G[K]> } & { [K in OptionalKeys<G>]?: Infer<G[K]> }>;

/** An object schema, which also keeps its `shape` (for what builds on the parts: games/shared/native/pause.ts `foundCodec`). */
export type ObjectSchema<G extends Shape> = Schema<ObjectOf<G>> & { readonly shape: G };

/** A record with (at least) these keys, each of the given schema. */
export function object<G extends Shape>(shape: G): ObjectSchema<G> {
  const keys = Object.entries(shape);
  const is = (v: unknown): v is ObjectOf<G> => isRecord(v) && keys.every(([key, item]) => item(v[key]));
  return Object.assign(is, { shape });
}
