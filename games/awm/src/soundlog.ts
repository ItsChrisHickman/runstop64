/**
 * What the game asks of its sound drivers, in the order it asks (the logic step is silent itself: the
 * rebuild records the requests and whoever plays the game gives them to the .sid, `main.ts`; the lockstep
 * compares them with the calls the original makes).
 *
 *   effect   $85A6, A = a sound number $40-$4C (only taken when the game's sound flag $4066 is set);
 *   tune     $E409, A = a tune 0-12 for the music driver;
 *   stop     $E40C, the music stopped (a new game);
 *   silence  $C7E3, A = a voice 0-2: its effect cut.
 */
export type SoundCall =
  | { readonly kind: 'effect'; readonly n: number }
  | { readonly kind: 'tune'; readonly n: number }
  | { readonly kind: 'silence'; readonly n: number }
  | { readonly kind: 'stop' };

export class SoundLog {
  private calls: SoundCall[] = [];

  effect(n: number): void {
    this.calls.push({ kind: 'effect', n });
  }

  tune(n: number): void {
    this.calls.push({ kind: 'tune', n });
  }

  silence(voice: number): void {
    this.calls.push({ kind: 'silence', n: voice });
  }

  stop(): void {
    this.calls.push({ kind: 'stop' });
  }

  /** The requests since the last time, and forget them. */
  take(): SoundCall[] {
    const taken = this.calls;
    this.calls = [];
    return taken;
  }
}

/** A request as the lockstep writes it down (`e46`, `t0`, `v1`, `s`: effect, tune, silence, stop; numbers in hex). */
export const callText = (c: SoundCall): string => {
  switch (c.kind) {
    case 'effect': return `e${c.n.toString(16)}`;
    case 'tune': return `t${c.n.toString(16)}`;
    case 'silence': return `v${c.n.toString(16)}`;
    case 'stop': return 's';
  }
};
