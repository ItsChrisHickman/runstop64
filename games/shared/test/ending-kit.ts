import { BitmapFont, Input, KIT_GLYPHS, type MachineState, type Rect } from 'c64kit';
import { CREDIT } from '../ending/credits';
import { Ending, MachineReel, bandBackground, creditColourOn, type EndingSpec } from '../ending/machine-reel';
import type { Said, Seen } from '../ending/show';
import { clean, type StatusLine } from '../native/narrate';
import { screenText } from '../native/pause';
import type { PortConfig } from '../native/host';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import type { C64 } from '../../../packages/c64kit/src/c64/machine';
import { indicesPng, renderPixels, shownLayers, type Picture } from '../../../tools/probe/render';
import { check } from './check';
import { nowhere } from './browser';
import { PixelRenderer } from './kit';

/**
 * What the ending's tests (games/*\/test/ending.ts, reward.ts) share: the show run from its first frame to THE END with everything
 * worth knowing noted, and the checks every game's ending has to pass (the credits' band, the length, the cast walking through the
 * montage and named in empty pixels only, the tune, the skip). A game's test adds what is its own (what the hero did in each scene,
 * what a win is, the front end).
 */

/** The montage's frames: the show is about a minute to a minute and a quarter (at 50 frames a second). */
export const SHOW_FRAMES = { min: 2900, max: 3900 } as const;

/** The visitors' sprites (ours: the show makes them in front of everything, z 20 and up) drawn into a picture of C64 colour indexes (320 x 200). */
export function drawVisitors(r: PixelRenderer, out: Uint8Array) {
  for (const h of r.sprites) {
    const sp = h.surface;
    if (!h.visible || !sp || h.z < 20) continue;
    for (let y = 0; y < sp.height; y++) for (let x = 0; x < sp.width; x++) {
      const v = sp.pixels[y * sp.width + x], X = Math.round(h.x) + x, Y = Math.round(h.y) + y;
      if (v !== TRANSPARENT && X >= 0 && Y >= 0 && X < 320 && Y < 200) out[Y * 320 + X] = v;
    }
  }
}

/**
 * The picture as the tests see it. The C64 view is a stand-in that draws nothing (games/shared/test/kit.ts), so the montage's
 * picture is the machine's own, laid out as the show lays it (`renderer.layout`), with what the show draws over it (the band's
 * text, the visitors) on top; THE END is the renderer's own. C64 colour indexes, 320 x 200.
 */
export function shown(r: PixelRenderer, m?: Picture): Uint8Array {
  if (!m) return r.picture();
  const out = renderPixels(m, r.layout);
  const over = r.screen.pixels;
  for (let i = 0; i < out.length; i++) if (over[i] !== TRANSPARENT) out[i] = over[i];
  drawVisitors(r, out);
  return out;
}

/** What the visitors did, frame by frame: who walked on the picture, who was named, and anything that went wrong. */
export class CastWatch {
  /** Visitors seen on the picture (their left edge inside it), and names shown whole in the band. */
  readonly walked = new Set<string>();
  readonly named = new Set<string>();
  /** Frames a name was in the band, and the problems found (a name over something the game draws, a visitor's feet in the band). */
  nameFrames = 0;
  readonly problems = new Set<string>();
  /** Names a picture was made of (for a test run with an out folder). */
  readonly pictured = new Set<string>();
  /** With a stage: the frames a visitor was cut by its edge, and what was drawn outside it (`place: who, where`). */
  cutFrames = 0;
  readonly outside = new Set<string>();

  /**
   * One frame, with a stage: every part of a visitor drawn (`drawn`: the box of each, as the renderer has it) lies inside the stage, and
   * where a visitor's own box went beyond it, the part outside was cut off (`cutFrames`).
   */
  onStage(p: { place: number; visitors: readonly Seen[] }, stage: Rect, drawn: readonly Rect[]) {
    for (const v of p.visitors) if (v.left < stage.x || v.left + v.width > stage.x + stage.w) this.cutFrames++;
    for (const b of drawn) {
      if (b.x < stage.x || b.y < stage.y || b.x + b.w > stage.x + stage.w || b.y + b.h > stage.y + stage.h) this.outside.add(`place ${p.place}: a part at ${b.x},${b.y} (${b.w} x ${b.h}) is outside the stage ${stage.x},${stage.y} ${stage.w} x ${stage.h}`);
    }
  }

  /**
   * One frame: the show's progress, the rows the band takes (picture pixels), and whether the game's own picture under what the band
   * says is empty (the caller reads its own game's picture: pixels of its characters and sprites under the text's span).
   */
  frame(p: { place: number; visitors: readonly Seen[]; said: Said | null }, band: { top: number; bottom: number }, empty: (said: Said) => boolean) {
    for (const v of p.visitors) {
      if (v.left + v.width > 0 && v.left < 320) this.walked.add(v.name);
      if (band.bottom > 0 && v.feet > band.top && v.feet - v.height <= band.bottom) this.problems.add(`place ${p.place}: ${v.name} reaches into the band (feet ${v.feet}, ${v.height} tall)`);
    }
    const said = p.said;
    if (!said || said.kind !== 'name') return;
    this.named.add(said.text);
    this.nameFrames++;
    if (!empty(said)) this.problems.add(`place ${p.place}: ${said.text} lands on something the game draws`);
  }

  /** What every game's ending has to pass about its cast (`letters`: how many the band can hold). */
  check(figures: readonly { name: string }[], letters: number = CREDIT.letters) {
    const names = figures.map((f) => f.name);
    check(`every name fits the band (at most ${letters} letters, upper case)`, names.every((n) => n.length <= letters && n === n.toUpperCase()));
    const unseen = names.filter((n) => !this.walked.has(n)), unnamed = names.filter((n) => !this.named.has(n));
    check(`every cast member walks through the montage (${this.walked.size} of ${names.length}${unseen.length ? `; not seen: ${unseen.join(', ')}` : ''})`, names.length > 0 && unseen.length === 0);
    check(`every cast member is named in the band, once, in full (${this.named.size} of ${names.length}${unnamed.length ? `; not named: ${unnamed.join(', ')}` : ''})`, unnamed.length === 0);
    check(`the names land only on pixels the game leaves empty, and no visitor reaches into the band (${this.nameFrames} frames of names)`, this.nameFrames > 0 && this.problems.size === 0);
    if (this.problems.size) console.log([...this.problems].slice(0, 12).join('\n'));
  }
}

/** What the band showed, frame by frame, in a native rebuild's reward test: lines typed on, names, and nothing between turns. */
export class BandWatch {
  /** The credit lines shown in full (`place.line`). */
  readonly typed = new Set<string>();
  withText = 0;
  between = 0;
  wrong = 0;
  readonly wrongAt: string[] = [];

  /**
   * One frame: what the show says is in the band (null: nothing), the place's credit lines, and what the test reads in the band's
   * rows of the picture as shown: pixels in the text's colour, and in any other.
   */
  frame(p: { place: number; frames: number; said: Said | null }, lines: readonly string[] | undefined, b: { ink: number; other: number }) {
    const said = p.said;
    if (said) {
      this.withText++;
      if (said.text.trim().length > 0 && (b.ink === 0 || b.other > 0)) { this.wrong++; if (this.wrongAt.length < 8) this.wrongAt.push(`place ${p.place} frame ${p.frames} ${said.kind}: ink ${b.ink} other ${b.other}`); }
      if (said.kind === 'credit' && said.text === lines?.[said.index]) this.typed.add(`${p.place}.${said.index}`);
    } else {
      this.between++;
      if (b.ink > 0 || b.other > 0) this.wrong++;
    }
  }

  /** The checks every native rebuild's credits have to pass (`total`: how many lines the places carry). */
  check(total: number, gameBandFrames: number, gameBand: number, badPlaces: readonly string[]) {
    check(`the game's own picture is empty in the band in all ${gameBandFrames} frames of the montage${badPlaces.length ? ` (${badPlaces.join('; ')})` : ''}`, gameBandFrames > 1000 && gameBand === 0);
    check(`credits and names land in empty pixels only: the text's colour when a turn is up, nothing between turns (${this.withText} frames with text, ${this.between} between; ${this.wrong} wrong${this.wrongAt.length ? `: ${this.wrongAt.join('; ')}` : ''})`, this.withText > 1000 && this.wrong === 0);
    check(`every credit line was typed on in full and held (${this.typed.size} of ${total} lines)`, this.typed.size === total && total >= 12);
  }
}

/** A show to run: the machines it needs and where the credits stand. */
interface ShowRun {
  spec: EndingSpec;
  port: PortConfig;
  title: MachineState;
  /** The lines under THE END. */
  stats: readonly string[];
  /** The title tune is the original's own code (the game's `titleTune`). */
  titleTune?: boolean;
  /** The rows the credits stand in, with a little room round them (picture pixels); unused where they are typed into a panel's line (`spec.creditLine`). */
  band: { top: number; bottom: number };
  /** The part of the picture the room is shown in: the creatures are seen only on it. Checked if given. */
  stage?: Rect;
  /** PNGs of scenes, credits, names and THE END go here (the folder is made by the caller), if given. */
  out?: string;
  /** Every frame of the montage (the scene's index, frames into it, the game being shown). */
  onMontage?(scene: number, frame: number, m: C64): void;
}

/** What the run saw. */
interface ShowResult {
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
  /** With names in a row of their own (`spec.nameRow`): the frames each kind of turn was up, and what stood in the wrong row (a name's colour in the credits' band, a credit's in the name's row, either between turns). */
  apart: { credit: number; name: number; mixed: string[] };
  /** The band in each scene with credit lines before its text came (and how many of those), and what stood in it when a line was in full (anything but the credit colour). */
  bandEmptyBefore: number;
  scenes: number;
  stray: string[];
  /** The game's own picture in the band, every sample, over every scene: pixels in all, and pixels drawn. */
  gameBand: { pixels: number; drawn: number };
  /** With a plain band (`EndingSpec.plainBand`): the frames a credit line was shown in which what lay under its span was checked. */
  spanFrames: number;
  cast: CastWatch;
  /** How many frames each scene ran. */
  sceneFrames: number[];
}

const SAMPLE = 25;

/** What a panel's line says now, read back from the screen (the Pendragon lettering: letters, digits, spaces folded). */
function lineText(ram: Uint8Array, line: StatusLine): string {
  const at = line.at - 0x400;
  return screenText(ram, Math.floor(at / 40), at % 40, line.width);
}

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
    titleTune: o.titleTune,
    font: () => font,
    done: () => { over++; },
  });
  show.start(o.stats);
  const cast = new CastWatch();
  const r: ShowResult = { frames: 0, phases: [], figures: [], tuneFrames: tune, over: 0, active: true, shownLines: new Set(), bandEmptyBefore: 0, scenes: 0, stray: [], gameBand: { pixels: 0, drawn: 0 }, apart: { credit: 0, name: 0, mixed: [] }, spanFrames: 0, cast, sceneFrames: [] };
  const { top, bottom } = o.band;
  // (the band's own colour: black, or the room's plain background where the picture fills the screen)
  const backOf = (m: C64) => (o.spec.plainBand ? bandBackground(m) : 0);
  const bandOf = (px: Uint8Array, m: C64) => {
    const bg = backOf(m), ink = o.spec.plainBand ? creditColourOn(bg) : CREDIT.colour;
    let credit = 0, other = 0;
    for (let y = top; y <= bottom; y++) for (let x = 0; x < 320; x++) { const c = px[y * 320 + x]; if (c === ink) credit++; else if (c !== bg) other++; }
    return { credit, other };
  };
  /** Whether the game's own picture (both layers) under a span of the band holds nothing but the background. */
  const emptyUnder = (m: C64, x0: number, len: number, row?: number) => {
    const bg = backOf(m), pic = shownLayers(m, renderer.layout);
    // (a name in a row of its own: that row's eight lines)
    const [y0, y1] = row === undefined || (row >= top && row <= bottom) ? [top, bottom] : [row, row + 7];
    for (let y = y0; y <= y1; y++) for (let x = x0; x < Math.min(320, x0 + 8 * len); x++) { const i = y * 320 + x; if (pic.back[i] !== bg || (pic.fore[i] !== TRANSPARENT && pic.fore[i] !== bg)) return false; }
    return true;
  };
  let still = 0;
  while (show.active && r.frames < 12000) {
    input.poll();
    show.tick();
    show.render(0);
    r.frames++;
    const p = show.progress;
    const phase = `${p.phase}${p.phase === 'montage' ? p.place : ''}`;
    if (r.phases[r.phases.length - 1] !== phase) r.phases.push(phase);
    const reel = p.reel;
    const m = reel instanceof MachineReel ? reel.machine : undefined;
    if (p.phase === 'montage' && m) {
      const scene = o.spec.scenes[p.place];
      if (!scene) continue;
      o.onMontage?.(p.place, p.frames, m);
      r.sceneFrames[p.place] = p.frames;
      const line = o.spec.creditLine;
      // (the game's own picture in the band: both layers, every pixel, before our text goes over it)
      if (!line && !o.spec.plainBand && p.frames % SAMPLE === 1) {
        const pic = shownLayers(m, renderer.layout);
        let drawn = 0;
        for (let y = top; y <= bottom; y++) for (let x = 0; x < 320; x++) { const i = y * 320 + x; if (pic.back[i] !== backOf(m) || (pic.fore[i] !== TRANSPARENT && pic.fore[i] !== backOf(m))) drawn++; }
        r.gameBand.pixels += (bottom - top + 1) * 320;
        r.gameBand.drawn += drawn;
      }
      const px = shown(renderer, m);
      const said = p.said;
      if (o.stage) cast.onStage(p, o.stage, renderer.sprites.filter((h) => h.visible && h.surface && h.z >= 20).map((h) => ({ x: Math.round(h.x), y: Math.round(h.y), w: h.surface?.width ?? 0, h: h.surface?.height ?? 0 })));
      if (o.spec.nameRow !== undefined && o.spec.nameInk !== undefined) {
        // (a name and a credit line are never up together: what the show wrote, its own layer of the picture, has one kind of text in its row
        // and the other kind's row bare, in every frame)
        const row = o.spec.nameRow, own = renderer.screen.pixels;
        let nameInk = 0, creditInk = 0, otherInName = 0, otherInBand = 0;
        for (let x = 0; x < 320; x++) {
          for (let y = row; y < row + 8; y++) { const c = own[y * 320 + x]; if (c === o.spec.nameInk) nameInk++; else if (c !== TRANSPARENT) otherInName++; }
          for (let y = top; y <= bottom; y++) { const c = own[y * 320 + x]; if (c === CREDIT.colour) creditInk++; else if (c !== TRANSPARENT) otherInBand++; }
        }
        const kind = said && said.text.trim() !== '' ? said.kind : 'none';
        if (kind === 'credit') r.apart.credit++;
        if (kind === 'name') r.apart.name++;
        const wrong = (kind !== 'name' && nameInk > 0) || (kind !== 'credit' && creditInk > 0) || otherInName > 0 || otherInBand > 0 || (kind === 'name' && nameInk === 0) || (kind === 'credit' && creditInk === 0);
        if (wrong && r.apart.mixed.length < 8) r.apart.mixed.push(`place ${p.place} frame ${p.frames} ${kind}: ${nameInk} name-coloured and ${otherInName} other pixels in the name row, ${creditInk} credit-coloured and ${otherInBand} other in the band`);
      }
      // (a plain band: nothing the game draws lies under the text, in any frame it is shown: its span of the rows, in the background colour)
      if (o.spec.plainBand && said) {
        r.spanFrames++;
        if (!emptyUnder(m, said.x, said.text.length)) { const tag = `scene ${p.place} ${said.kind} ${said.index}: pixels of the game's under the text`; if (!r.stray.includes(tag)) r.stray.push(tag); }
      }
      cast.frame(p, o.band, (s) => (line ? lineText(m.ram, line).trim() === clean(s.text, line).trim() : emptyUnder(m, s.x, s.text.length, s.row)));
      if (p.frames === 1 && scene.credits?.length) {
        r.scenes++;
        if (o.spec.plainBand) r.bandEmptyBefore++;
        else if (line) {
          const text = lineText(m.ram, line);
          if (text === '') r.bandEmptyBefore++; else r.stray.push(`scene ${p.place} line before text: '${text}'`);
        } else {
          const b = bandOf(px, m);
          if (b.credit === 0 && b.other === 0) r.bandEmptyBefore++; else r.stray.push(`scene ${p.place} band before text: ${b.credit} credit-coloured, ${b.other} other`);
        }
      }
      if (said?.kind === 'credit' && said.text.length === scene.credits?.[said.index]?.length && !r.shownLines.has(`${p.place}.${said.index}`)) {
        r.shownLines.add(`${p.place}.${said.index}`);
        if (line) {
          const want = clean(said.text, line), text = lineText(m.ram, line);
          if (text !== want) r.stray.push(`scene ${p.place} line ${said.index}: the panel says '${text}', not '${want}'`);
        } else {
          const b = bandOf(px, m);
          if (b.credit === 0) r.stray.push(`scene ${p.place} line ${said.index} not drawn`);
          if (!o.spec.plainBand && b.other !== 0) r.stray.push(`scene ${p.place} line ${said.index}: ${b.other} pixels of another colour in the band`);
        }
        if (o.out) indicesPng(`${o.out}/credit-scene${p.place}-line${said.index}.png`, px, 320, 200);
      }
      if (o.out && said?.kind === 'name' && !cast.pictured.has(said.text)) { cast.pictured.add(said.text); indicesPng(`${o.out}/name-scene${p.place}-${said.text.replace(/\W+/g, '-').toLowerCase()}.png`, px, 320, 200); }
      if (o.out && p.frames % 70 === 5) indicesPng(`${o.out}/montage-scene${p.place}-${String(p.frames).padStart(3, '0')}.png`, px, 320, 200);
    } else if (o.out && p.phase === 'end') {
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
  console.log(`phases: ${r.phases.join(' ')}; ${r.frames} frames (${(r.frames / 50).toFixed(0)} s); figures: ${r.figures.map((f) => `${f.name}:${f.poses}`).join(', ')}; scenes: ${r.sceneFrames.join(' ')}`);
  check('the show ran to its end and went back to the title (done, once)', !r.active && r.over === 1);
  check('it went through every scene of the montage, then THE END, and no parade', spec.scenes.every((_, i) => r.phases.includes(`montage${i}`)) && r.phases[r.phases.length - 1] === 'end' && !r.phases.includes('parade'));
  check(`it is a watchable length (${(r.frames / 50).toFixed(0)} seconds, about 60 to 75)`, r.frames >= SHOW_FRAMES.min && r.frames <= SHOW_FRAMES.max);
  check(`every figure of the cast was recorded (${r.figures.length} of ${spec.cast.length})`, r.figures.length === spec.cast.length);
  check('the hero is in every scene and not among the visitors', !r.figures.some((f) => /PENDRAGON|WILLY|^THING$/.test(f.name)));
  r.cast.check(r.figures, spec.creditLine?.width ?? spec.creditLetters ?? CREDIT.letters);
  if (o.stage) {
    check(`the creatures are seen only on the stage (${r.cast.cutFrames} frames of one cut by its edge, ${r.cast.outside.size} parts drawn outside it)`, r.cast.cutFrames > 100 && r.cast.outside.size === 0);
    if (r.cast.outside.size) console.log([...r.cast.outside].slice(0, 8).join('\n'));
  }
  if (spec.nameRow !== undefined) {
    check(`a name and a credit line are never up together: names in the row of their own, in their colour, credits in the band, in theirs (${r.apart.name} frames of names, ${r.apart.credit} of credits)`, r.apart.name > 200 && r.apart.credit > 1000 && r.apart.mixed.length === 0);
    if (r.apart.mixed.length) console.log(r.apart.mixed.join('\n'));
  }
  if (spec.tune === 'effects') check(`the places' own sound is heard (${r.tuneFrames.played} frames with writes: the whip, the bells)`, r.tuneFrames.played >= 100);
  else check('the title tune played all the way (writes in most frames)', r.tuneFrames.of > 0 && r.tuneFrames.played > r.tuneFrames.of / 4);
  check(`every credit line was shown in full (${r.shownLines.size} of ${lines.length})`, r.shownLines.size === lines.length && lines.length >= 12);
  const line = spec.creditLine;
  if (line) {
    check(`the line the credits are typed into is blank before the text in every scene with credits, and says each line as given (${r.bandEmptyBefore} of ${r.scenes})`, r.bandEmptyBefore === r.scenes && r.scenes === spec.scenes.filter((sc) => sc.credits?.length).length && r.stray.length === 0);
    check(`every line fits the panel's line and its lettering (at most ${line.width} letters: A to Z, digits, a colon)`, lines.every((l) => l.length <= line.width && clean(l, line) === l));
  } else if (spec.plainBand) {
    check(`no credit line or name stands over anything the game draws (${r.spanFrames} frames of text, each over its own span of rows ${o.band.top} to ${o.band.bottom}: the room's plain background only)`, r.spanFrames > 1000 && r.stray.length === 0);
    check(`every line fits the band (at most ${CREDIT.letters} letters, upper case)`, lines.every((l) => l.length <= CREDIT.letters && l === l.toUpperCase()));
  } else {
    check(`the game leaves the band for the credits (rows ${o.band.top} to ${o.band.bottom}) black: ${r.gameBand.drawn} of ${r.gameBand.pixels} pixels drawn, over every scene`, r.gameBand.pixels > 0 && r.gameBand.drawn === 0);
    check('the band was empty before the text in every scene with credits, and only the credit colour is drawn in it', r.bandEmptyBefore === r.scenes && r.scenes === spec.scenes.filter((sc) => sc.credits?.length).length && r.stray.length === 0);
    check(`every line fits the band (at most ${CREDIT.letters} letters, upper case)`, lines.every((l) => l.length <= CREDIT.letters && l === l.toUpperCase()));
  }
  if (r.stray.length) console.log(r.stray.join('\n'));
  check('the credits are in order: the game first, the port and thanks last', lines[0] === opening && portLines.every((l) => lines.includes(l)) && lines[lines.length - 1] === 'THANKS FOR PLAYING');
  check('the port is credited to Christopher Hickman, with Claude', portLines.some((l) => l.includes('HICKMAN')) && portLines.some((l) => l.includes('CLAUDE')) && lines.some((l) => l.includes('HICKMAN')) && lines.some((l) => l.includes('CLAUDE')));
}
