import { distanceAtX, ROUTE_LENGTH } from './title-art';

/**
 * The chase on the title's map, as pure timing (title.ts draws it): Monty walks the route from Montos to Rio and Viktor Vole tails him
 * `VIKTOR_GAP` pixels behind, and each loop something different happens on the way, in turn:
 *  - `trip`: Viktor trips on SIBERIA's mark, falls flat and his hat flies off; he gets up, picks it up and runs to catch up.
 *  - `duck`: Monty steps down behind JAPAN and ANDES (his hat and eyes peep over the names); Viktor runs past, stops, looks back, walks
 *    back the way he came; Monty climbs out behind him, and Viktor turns and follows.
 *  - `overtake`: Viktor hurries, gets ahead of Monty, stops; they stand, Viktor looks round at him, then backs off past him to his place behind.
 * Everything is distances along the route (`routeAt(d / ROUTE_LENGTH)`) and frames: straight lines between keys.
 */

/** Monty's pace: a pixel and a bit a frame. */
export const SPEED = 0.7;
/** The plain walk from Montos to Rio, in frames. */
export const WALK_FRAMES = Math.ceil(ROUTE_LENGTH / SPEED);
/** He stands at Rio `STAND` frames, then the map is empty `GONE` frames before the next loop. */
export const STAND = 90, GONE = 30;
/** How far behind Monty Viktor walks along the route, in pixels. */
export const VIKTOR_GAP = 28;

/** A value at a frame. Between keys it goes in a straight line; before the first and after the last it holds. */
type Key = readonly [frame: number, value: number];
export type Facing = 'east' | 'west';
export type SceneName = 'trip' | 'duck' | 'overtake';

export interface Scene {
  readonly name: SceneName;
  /** Monty along the route; how far below it he has stepped. */
  readonly monty: readonly Key[];
  readonly drop: readonly Key[];
  /** Viktor along the route (off the map while it is below 0), and from which frame he faces which way. */
  readonly viktor: readonly Key[];
  readonly facing: readonly (readonly [number, Facing])[];
  /** The frames he lies flat, from and to. */
  readonly fallen: readonly [number, number] | null;
  /** His hat off his head: the frames, where it is along the route, how high its brim is over the ground. */
  readonly hat: { readonly from: number; readonly to: number; readonly d: readonly Key[]; readonly lift: readonly Key[] } | null;
  /** The frame Monty reaches Rio. */
  readonly arrives: number;
}

export interface MontyAt { readonly d: number; readonly drop: number; readonly moving: boolean }
export interface ViktorAt {
  readonly d: number;
  readonly facing: Facing;
  readonly moving: boolean;
  /** Faster than a walk (his legs go quicker). */
  readonly running: boolean;
  readonly fallen: boolean;
  readonly hat: { readonly d: number; readonly lift: number } | null;
}
/** What the map shows at a frame of a scene: nobody (the gap at the end of a loop), or Monty and maybe Viktor. */
export interface ChaseAt { readonly monty: MontyAt; readonly viktor: ViktorAt | null }

/** The hat's brim over the ground when it is on his head. */
export const HAT_WORN_LIFT = 13;

function along(keys: readonly Key[], f: number): number {
  const first = keys[0];
  if (first === undefined) return 0;
  if (f <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (a === undefined || b === undefined) break;
    if (f <= b[0]) return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (f - a[0]) / (b[0] - a[0]);
  }
  return keys[keys.length - 1]?.[1] ?? 0;
}

/** Where Viktor, going on from `from` at `speed`, is back `VIKTOR_GAP` behind Monty, who walks at `SPEED` and is at `monty` at that frame. */
function rejoin(from: Key, speed: number, monty: number): Key {
  const t = (monty - VIKTOR_GAP - from[1]) / (speed - SPEED);
  return [from[0] + t, from[1] + speed * t];
}

const END = ROUTE_LENGTH - VIKTOR_GAP;

function trip(): Scene {
  const s = distanceAtX(116), fall = (s + VIKTOR_GAP) / SPEED;
  const up = fall + 44, walks = fall + 56, hatOn = fall + 76, lands = s + 14;
  return {
    name: 'trip',
    monty: [[0, 0], [WALK_FRAMES, ROUTE_LENGTH]],
    drop: [[0, 0]],
    viktor: [[0, -VIKTOR_GAP], [fall, s], [walks, s], [hatOn, lands], rejoin([hatOn, lands], 1.5, SPEED * hatOn), [WALK_FRAMES, END]],
    facing: [[0, 'east']],
    fallen: [fall, up],
    hat: { from: fall, to: hatOn, d: [[fall, s], [fall + 20, lands]], lift: [[fall, HAT_WORN_LIFT], [fall + 4, 15], [fall + 10, 12], [fall + 16, 6], [fall + 20, 0]] },
    arrives: WALK_FRAMES,
  };
}

/** Where Monty hides: under JAPAN and ANDES (their names one over the other), `HIDE_DROP` below the route. */
export const HIDE_X = 214, HIDE_DROP = 21;

function duck(): Scene {
  const h = distanceAtX(HIDE_X), at = h / SPEED;
  const stops = at + 57, back = stops + 110, out = stops + 116, follows = stops + 130;
  const held = out - at;
  return {
    name: 'duck',
    monty: [[0, 0], [at, h], [out, h], [WALK_FRAMES + held, ROUTE_LENGTH]],
    drop: [[at, 0], [at + 16, HIDE_DROP], [stops + 100, HIDE_DROP], [out, 0]],
    viktor: [[0, -VIKTOR_GAP], [at, h - VIKTOR_GAP], [stops, h + 40], [stops + 40, h + 40], [back, h - 30], [follows, h - 30],
      rejoin([follows, h - 30], 0.9, h + SPEED * (follows - out)), [WALK_FRAMES + held, END]],
    facing: [[0, 'east'], [stops + 15, 'west'], [stops + 125, 'east']],
    fallen: null,
    hat: null,
    arrives: WALK_FRAMES + held,
  };
}

function overtake(): Scene {
  const m0 = distanceAtX(120), runs = m0 / SPEED, halt = runs + 70, m1 = m0 + SPEED * 70, ahead = m1 + 38;
  const pause = 52, goes = halt + pause, back = 60, behind = goes + back;
  return {
    name: 'overtake',
    monty: [[0, 0], [halt, m1], [goes, m1], [WALK_FRAMES + pause, ROUTE_LENGTH]],
    drop: [[0, 0]],
    viktor: [[0, -VIKTOR_GAP], [runs, m0 - VIKTOR_GAP], [halt, ahead], [goes, ahead], [behind, m1 + SPEED * back - VIKTOR_GAP], [WALK_FRAMES + pause, END]],
    facing: [[0, 'east'], [halt + 12, 'west'], [halt + 42, 'east']],
    fallen: null,
    hat: null,
    arrives: WALK_FRAMES + pause,
  };
}

/** The loops, in turn. */
export const SCENES: readonly Scene[] = [trip(), duck(), overtake()];

/** A scene's whole loop: the walk, the stand at Rio, the empty map. */
export const loopLength = (s: Scene) => Math.ceil(s.arrives) + STAND + GONE;

/** Which scene the title's `frames` fall in, and how far into it. */
export function sceneAt(frames: number): { readonly scene: Scene; readonly f: number } {
  const total = SCENES.reduce((n, s) => n + loopLength(s), 0);
  let f = frames % total;
  for (const scene of SCENES) {
    if (f < loopLength(scene)) return { scene, f };
    f -= loopLength(scene);
  }
  throw new Error('no scene');
}

/** The figures at frame `f` of `s`, or null while the map is empty. */
export function chaseAt(s: Scene, f: number): ChaseAt | null {
  if (f >= Math.ceil(s.arrives) + STAND) return null;
  const md = along(s.monty, f), drop = along(s.drop, f);
  const monty = { d: md, drop, moving: md !== along(s.monty, f + 1) || drop !== along(s.drop, f + 1) };
  const vd = along(s.viktor, f);
  if (vd < 0) return { monty, viktor: null };
  const step = along(s.viktor, f + 1) - vd;
  let facing: Facing = 'east';
  for (const [from, way] of s.facing) if (f >= from) facing = way;
  const hat = s.hat && f >= s.hat.from && f < s.hat.to ? { d: along(s.hat.d, f), lift: along(s.hat.lift, f) } : null;
  const fallen = s.fallen !== null && f >= s.fallen[0] && f < s.fallen[1];
  return { monty, viktor: { d: vd, facing, moving: Math.abs(step) > 0.01, running: Math.abs(step) > 1, fallen, hat } };
}
