/**
 * The Spectrum's beeper (one bit of port $FE drives the speaker) as audio. A sound is the times the bit was flipped: the time to the
 * first flip, the time between flips, and the time from the last flip to the end, all in T-states of the CPU clock (3.5 MHz on a
 * 48K). `renderToggles` integrates the 1-bit signal over each output sample (a box filter: the sample is the fraction of its time
 * the speaker was up), so the sound is the original's exactly, at the browser's sample rate, with no Z80 and no ROM.
 */
export interface Toggles {
  /** T-states before the first flip */
  readonly lead: number;
  /** T-states between one flip and the next (each flips the speaker) */
  readonly gaps: readonly number[];
  /** T-states from the last flip to the end of the sound */
  readonly tail: number;
}

/** The 48K Spectrum's CPU clock. */
export const SPECTRUM_48K_CLOCK = 3_500_000;

/** How many T-states the whole sound takes. */
export function togglesLength(t: Toggles): number {
  return t.gaps.reduce((a, g) => a + g, t.lead + t.tail);
}

/**
 * The sound as samples at `sampleRate`: the speaker starts down; each sample is the mean level (0 to 1) of the speaker over its
 * time. With `acCoupled` (the default) a one-pole high pass at 20 Hz then takes the constant level away, like the speaker's coupling
 * (a sound that ends with the speaker up does not leave the cone pushed out); without it you get the box filter alone.
 */
export function renderToggles(t: Toggles, sampleRate: number, clock = SPECTRUM_48K_CLOCK, acCoupled = true): Float32Array {
  const total = togglesLength(t);
  const perSample = clock / sampleRate;
  const out = new Float32Array(Math.ceil(total / perSample));
  // the flip times, T-states from the start
  const at: number[] = [];
  let time = t.lead;
  at.push(time);
  for (const gap of t.gaps) at.push((time += gap));
  let flip = 0; // the first flip not before the sample's start
  for (let i = 0; i < out.length; i++) {
    const from = i * perSample;
    const to = Math.min((i + 1) * perSample, total);
    // (the level before flip k is k & 1: down at the start, up after the first flip)
    while (flip < at.length && (at[flip] ?? Infinity) <= from) flip++;
    let up = 0;
    let cursor = from;
    for (let k = flip; ; k++) {
      const end = k < at.length ? Math.min(at[k] ?? Infinity, to) : to;
      if ((k & 1) === 1) up += end - cursor;
      cursor = end;
      if (cursor >= to) break;
    }
    out[i] = up / perSample;
  }
  if (!acCoupled) return out;
  const keep = 1 - (2 * Math.PI * 20) / sampleRate;
  let before = 0;
  let filtered = 0;
  for (let i = 0; i < out.length; i++) {
    const x = out[i] ?? 0;
    filtered = x - before + keep * filtered;
    before = x;
    out[i] = filtered;
  }
  return out;
}
