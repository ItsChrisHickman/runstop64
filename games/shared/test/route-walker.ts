import { unpackState, type MachineState } from 'c64kit';
import { NativeHost, type PortConfig } from '../native/host';
import { must } from './must';
import { readRoute } from './data';
import type { Picture } from '../../../tools/probe/render';

/**
 * A game played along a recorded route (its re/routes.json: joystick, and the space bar in bit 5, a
 * value and how many frames, found by automatic play), a frame at a time from its title snapshot,
 * kept alive by `cheat` as the travel check does: `next()` plays a frame and gives the machine (null
 * at the route's end), `frame` the frames played.
 */
export function routeWalker(o: { port: PortConfig; title: Uint8Array; routes: string; route?: number; cheat(ram: Uint8Array): void }) {
  const steps = readRoute(o.routes, o.route ?? 0);
  const g = new NativeHost(o.port, unpackState(o.title));
  let i = 0, left = steps[1] ?? 0;
  const walker = {
    frame: 0,
    host: g,
    next(): Picture | null {
      while (left <= 0 && i + 2 < steps.length) { i += 2; left = steps[i + 1]; }
      if (left <= 0) return null;
      left--;
      g.m.joy1 = g.m.joy2 = steps[i] & 0x1f;
      g.m.keys = steps[i] & 32 ? [[1, 2]] : [];
      g.tick(); o.cheat(g.m.ram); walker.frame++;
      return g.m;
    },
    /** Played on to this frame, and saved there. */
    at(frame: number): MachineState {
      while (walker.frame < frame) if (!walker.next()) throw new Error(`the route ends before frame ${frame}`);
      return must(g.save(), 'a save');
    },
  };
  return walker;
}
