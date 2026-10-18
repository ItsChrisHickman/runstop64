import { BitmapFont, Input, KIT_GLYPHS, type MachineState } from 'c64kit';
import { CREDIT, Ending, creditAt, type EndingSpec } from '../native/ending';
import type { PortConfig } from '../native/host';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import type { C64 } from '../../../packages/c64kit/src/c64/machine';
import { indicesPng, renderPixels, shownLayers, type Picture } from '../../../tools/probe/render';
import { check } from './check';
import { nowhere } from './browser';
import { PixelRenderer } from './kit';

/**
 * What the ending's tests (games/*\/test/ending.ts) share: the show run from its first frame to THE END with everything worth
 * knowing noted, and the checks every game's ending has to pass (the credits' band, the length, the cast, the tune, the skip).
 * A game's test adds what is its own (what Pendragon did in each scene, what a win is, the front end).
 */

/**
 * The picture as the tests see it. The C64 view is a stand-in that draws nothing (games/shared/test/kit.ts), so the montage's
 * picture is the machine's own, laid out as the show lays it (`renderer.layout`), with what the show draws over it (the credit
 * lines) on top; the parade and THE END are the renderer's own. C64 colour indexes, 320 x 200.
 */
export function shown(r: PixelRenderer, m?: Picture): Uint8Array {
  if (!m) return r.picture();
  const out = renderPixels(m, r.layout);
  const over = r.screen.pixels;
  for (let i = 0; i < out.length; i++) if (over[i] !== TRANSPARENT) out[i] = over[i];
  return out;
}

/** A show to run: the machines it needs and where the credits stand. */
export interface ShowRun {
  spec: EndingSpec;
  port: PortConfig;
  title: MachineState;
  /** The lines under THE END. */
  stats: readonly string[];
  /** The rows the credits stand in, with a little room round them (picture pixels). */
  band: { top: number; bottom: number };
  /** PNGs of scenes, credits, the parade and THE END go here (the folder is made by the caller), if given. */
  out?: string;
  /** Every frame of the montage (the scene's index, frames into it, the game being shown). */
  onMontage?(scene: number, frame: number, m: C64): void;
}

/** What the run saw. */
export interface ShowResult {
  frames: number;
  /** The phases in order, a montage's scene by its number (`montage3`). */
  phases: string[];
  figures: { name: string; poses: number }[];
  /** How many frames the tune had writes in, and of how many. */
  tuneFrames: { played: number; of: number };
  over: number;
  active: boolean;
  /** The credit lines shown in full (`scene.line`). */
  shownLines: Set<string>;
  /** The band in each scene with credit lines before its text came (and how many of those), and what stood in it when a line was in full (anything but the credit colour). */
  bandEmptyBefore: number;
  scenes: number;
  stray: string[];
  /** The game's own picture in the band, every sample, over every scene: pixels in all, and pixels drawn. */
  gameBand: { pixels: number; drawn: number };
}

const SAMPLE = 25;

/** Run the show to its end (or 12,000 frames) and note what is to be checked. */
export function playShow(o: ShowRun): ShowResult {
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const font = new BitmapFont().addDrawn(KIT_GLYPHS);
  const tune = { played: 0, of: 0 };
  let over = 0;
  const show = new Ending({
    host: { renderer, input, canvas: nowhere },
    spec: o.spec,
    port: o.port,
    title: () => o.title,
    sound: { pushFrame: (w) => { tune.of++; if (w.length > 0) tune.played++; } },
    font: () => font,
    done: () => { over++; },
  });
  show.start(o.stats);
  const r: ShowResult = { frames: 0, phases: [], figures: [], tuneFrames: tune, over: 0, active: true, shownLines: new Set(), bandEmptyBefore: 0, scenes: 0, stray: [], gameBand: { pixels: 0, drawn: 0 } };
  const { top, bottom } = o.band;
  const bandOf = (px: Uint8Array) => {
    let credit = 0, other = 0;
    for (let y = top; y <= bottom; y++) for (let x = 0; x < 320; x++) { const c = px[y * 320 + x]; if (c === CREDIT.colour) credit++; else if (c !== 0) other++; }
    return { credit, other };
  };
  let still = 0;
  while (show.active && r.frames < 12000) {
    input.poll();
    show.tick();
    show.render(0);
    r.frames++;
    const p = show.progress;
    const phase = `${p.phase}${p.phase === 'montage' ? p.scene : ''}`;
    if (r.phases[r.phases.length - 1] !== phase) r.phases.push(phase);
    const m = p.machine;
    if (p.phase === 'montage' && m) {
      const scene = o.spec.scenes[p.scene];
      o.onMontage?.(p.scene, p.frames, m);
      // (the game's own picture in the band: both layers, every pixel, before our text goes over it)
      if (p.frames % SAMPLE === 1) {
        const pic = shownLayers(m, renderer.layout);
        let drawn = 0;
        for (let y = top; y <= bottom; y++) for (let x = 0; x < 320; x++) { const i = y * 320 + x; if (pic.back[i] !== 0 || (pic.fore[i] !== TRANSPARENT && pic.fore[i] !== 0)) drawn++; }
        r.gameBand.pixels += (bottom - top + 1) * 320;
        r.gameBand.drawn += drawn;
      }
      const px = shown(renderer, m);
      if (p.frames === 1 && scene.credits?.length) {
        const b = bandOf(px);
        r.scenes++;
        if (b.credit === 0 && b.other === 0) r.bandEmptyBefore++; else r.stray.push(`scene ${p.scene} band before text: ${b.credit} credit-coloured, ${b.other} other`);
      }
      const now = creditAt(scene, p.frames - 1);
      if (now && now.shown.length === scene.credits?.[now.line]?.length && !r.shownLines.has(`${p.scene}.${now.line}`)) {
        const b = bandOf(px);
        r.shownLines.add(`${p.scene}.${now.line}`);
        if (b.credit === 0) r.stray.push(`scene ${p.scene} line ${now.line} not drawn`);
        if (b.other !== 0) r.stray.push(`scene ${p.scene} line ${now.line}: ${b.other} pixels of another colour in the band`);
        if (o.out) indicesPng(`${o.out}/credit-scene${p.scene}-line${now.line}.png`, px, 320, 200);
      }
      if (o.out && p.frames % 70 === 5) indicesPng(`${o.out}/montage-scene${p.scene}-${String(p.frames).padStart(3, '0')}.png`, px, 320, 200);
    } else if (o.out && (p.phase === 'parade' || p.phase === 'end')) {
      still++;
      if (still % 60 === 1) indicesPng(`${o.out}/${p.phase}-${String(still).padStart(4, '0')}.png`, shown(renderer), 320, 200);
    }
  }
  r.figures = show.progress.figures;
  r.over = over;
  r.active = show.active;
  return r;
}

/** The checks every game's ending has to pass, on what `playShow` saw (the credits are the game's own words: `lines` is all of them in order). */
export function checkShow(o: ShowRun, r: ShowResult, lines: readonly string[], portLines: readonly string[], opening: string) {
  const spec = o.spec;
  console.log(`phases: ${r.phases.join(' ')}; ${r.frames} frames; figures: ${r.figures.map((f) => `${f.name}:${f.poses}`).join(', ')}`);
  check('the show ran to its end and went back to the title (done, once)', !r.active && r.over === 1);
  check('it went through every scene of the montage, the parade and THE END', spec.scenes.every((_, i) => r.phases.includes(`montage${i}`)) && r.phases.includes('parade') && r.phases.includes('end'));
  check(`it is a watchable length (${(r.frames / 50).toFixed(0)} seconds, 60 to 150)`, r.frames >= 3000 && r.frames <= 7500);
  check(`every figure of the cast was recorded (${r.figures.length} of ${spec.cast.length})`, r.figures.length === spec.cast.length);
  check('the title tune played all the way (writes in most frames)', r.tuneFrames.of > 0 && r.tuneFrames.played > r.tuneFrames.of / 4);
  check(`every credit line was shown in full (${r.shownLines.size} of ${lines.length})`, r.shownLines.size === lines.length && lines.length >= 25);
  check(`the game leaves the band for the credits (rows ${o.band.top} to ${o.band.bottom}) black: ${r.gameBand.drawn} of ${r.gameBand.pixels} pixels drawn, over every scene`, r.gameBand.pixels > 0 && r.gameBand.drawn === 0);
  check('the band was empty before the text in every scene with credits, and only the credit colour is drawn in it', r.bandEmptyBefore === r.scenes && r.scenes === spec.scenes.filter((sc) => sc.credits?.length).length && r.stray.length === 0);
  if (r.stray.length) console.log(r.stray.join('\n'));
  check(`every line fits the band (at most ${CREDIT.letters} letters, upper case)`, lines.every((l) => l.length <= CREDIT.letters && l === l.toUpperCase()));
  check('the credits are in order: the game first, the port and thanks last', lines[0] === opening && portLines.every((l) => lines.includes(l)) && lines[lines.length - 1] === 'THANKS FOR PLAYING');
  check('the port is credited to Christopher Hickman, with Claude', lines.includes('CHRISTOPHER HICKMAN') && lines.includes('WITH CLAUDE (ANTHROPIC)'));
}
