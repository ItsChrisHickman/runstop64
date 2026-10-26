/** Data files the tests read (re/routes.json, ...): parsed as `unknown` and checked, a clear error if the shape is wrong. */
import fs from 'node:fs';
import { isArray, isNumber, isRecord, readJson } from '../guards';

/** A JSON file, as `unknown` (narrow it). */
export function readJsonFile(file: string): unknown {
  return readJson(fs.readFileSync(file, 'utf8'));
}

/** A game's recorded routes (re/routes.json): lists of numbers (joystick, frames, ...). */
export function readRoutes(file: string): number[][] {
  const v = readJsonFile(file);
  if (!isArray(v)) throw new Error(`${file}: not a list of routes`);
  return v.map((route, i) => {
    if (!isArray(route) || !route.every(isNumber)) throw new Error(`${file}: route ${i} is not numbers`);
    return route.filter(isNumber);
  });
}

/** One recorded route, or an error saying it isn't there. */
export function readRoute(file: string, index = 0): number[] {
  const route = readRoutes(file)[index];
  if (!route) throw new Error(`${file}: no route ${index}`);
  return route;
}

/** A game's assist options as the front end stored them (`<game>.assist`): the fields, or none. */
export function parseOptions(text: string | null | undefined): Record<string, unknown> {
  const v = readJson(text ?? '{}');
  return isRecord(v) ? { ...v } : {};
}
