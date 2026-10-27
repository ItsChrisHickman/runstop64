import type { Input } from 'c64kit';

/** What a launched game shows of its flow (`state` of a program: ContinueFlow's, with `playing`). */
interface Flowing { readonly state: { readonly prompt: string | null; readonly playing: boolean } }

/**
 * A launch with a save, the way a player continues it: the game opens on its title, ENTER CONTINUE comes up after a
 * moment, and Enter goes back into play (a launch never does by itself). Returns on the frame play resumes, the grace
 * just begun. Throws if the title never offers it, or Enter never gets the game back into play.
 */
export function continueFromTitle(g: Flowing, input: Pick<Input, 'keyDown' | 'keyUp'>, tick: (n: number) => void, max = 900) {
  for (let i = 0; i < max && g.state.prompt !== 'title'; i++) tick(1);
  if (g.state.prompt !== 'title') throw new Error('the title never offered ENTER CONTINUE');
  input.keyDown('Enter');
  for (let i = 0; i < max && !g.state.playing; i++) tick(1);
  input.keyUp('Enter');
  if (!g.state.playing) throw new Error('Enter on ENTER CONTINUE never got the game back into play');
}
