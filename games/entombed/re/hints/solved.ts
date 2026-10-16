import fs from 'node:fs';
import { isNumber, isNumbers, isRecord, isRecordOf, isString, readJson } from '../../../shared/guards';

type Pair = [number, number];
/** A chamber solved by solve.ts (solved/chamber-NN.json): the steps done by playing, where, and how. */
export interface Solved {
  chamber: number;
  given: Record<string, number>;
  steps: { name: string; at: Pair; path: Pair[] }[];
}

const isPair = (v: unknown): v is Pair => isNumbers(v) && v.length === 2;
const isStep = (v: unknown): v is Solved['steps'][number] =>
  isRecord(v) && isString(v.name) && isPair(v.at) && Array.isArray(v.path) && v.path.every(isPair);

/** Read a solved chamber's file, checked. */
export function readSolved(file: URL): Solved {
  const j: unknown = readJson(fs.readFileSync(file, 'utf8'));
  if (!isRecord(j) || !isNumber(j.chamber) || !isRecordOf(j.given, isNumber) || !Array.isArray(j.steps) || !j.steps.every(isStep)) {
    throw new Error(`${file.pathname}: not a solved chamber`);
  }
  return { chamber: j.chamber, given: j.given, steps: j.steps };
}
