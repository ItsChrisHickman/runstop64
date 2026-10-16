/**
 * A phone's touch controls for headless tests: the game's TouchLayout laid out on a phone held
 * sideways (915 × 412) by the touch layer's own geometry, and touched through its controller
 * (games/shared/touch), which presses the virtual keys on the game's Input as on a phone.
 * `pickName` enters a name with them the way games/shared/letters.ts NamePicker reads them.
 */
import type { Input } from 'c64kit';
import { TouchController } from '../touch/controller';
import { layoutStage, type SystemSpec, type TouchLayout } from '../touch/layout';
import type { NameSpec } from '../letters';
import { must } from './must';

const SYSTEM: SystemSpec[] = [{ id: 'home', label: 'HOME' }, { id: 'layout', label: 'TURN' }, { id: 'pause', label: 'PAUSE' }, { id: 'enter', label: 'RETURN', key: 'Enter' }];
type Dir = 'up' | 'down' | 'left' | 'right';
const VEC: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function touchPad(input: Input, layout: TouchLayout, tick: (n?: number) => void) {
  input.touch = true;
  const geo = layoutStage(915, 412, 'landscape', layout, SYSTEM);
  const ctl = new TouchController({ keyDown: (c) => input.keyDown(c), keyUp: (c) => input.keyUp(c) }, geo, layout.stick);
  let id = 1;
  const enter = must(geo.system.find((s) => s.spec.id === 'enter'), 'the RETURN key');
  const pad = {
    /** A thumb pushing the stick one way for `frames` frames, then let go. */
    stick(dir: Dir, frames = 2, after = 2) {
      const { x, y } = geo.stickHome, R = geo.stickRadius, [dx, dy] = VEC[dir], t = id++;
      ctl.down(t, x, y);
      ctl.move(t, x + dx * R * 0.9, y + dy * R * 0.9);
      tick(frames);
      ctl.up(t);
      tick(after);
    },
    /** The main button (JUMP, FIRE) tapped. */
    button(index = 0, after = 2) {
      const b = must(geo.buttons[index], `button ${index}`), t = id++;
      ctl.down(t, b.x, b.y);
      tick(2);
      ctl.up(t, b.x, b.y);
      tick(after);
    },
    /** The RETURN key tapped. */
    ret(after = 2) {
      const t = id++;
      ctl.down(t, enter.x, enter.y);
      tick(2);
      ctl.up(t, enter.x, enter.y);
      tick(after);
    },
    /**
     * A name entered with the stick and the button, then RETURN: each letter reached from the
     * one shown (the first letter of the alphabet to start, then the last put in) the shorter
     * way round, put in with the button (the last with RETURN). `gap`: frames after each touch
     * (a game that takes its keys a frame at a time needs a few).
     */
    pickName(spec: NameSpec, text: string, gap = 2) {
      const n = spec.alphabet.length;
      let at = 0;
      [...text].forEach((ch, k) => {
        const i = spec.alphabet.indexOf(ch);
        if (i < 0) throw new Error(`'${ch}' isn't one of the name's letters`);
        const fwd = (i - at + n) % n, back = (at - i + n) % n;
        for (let s = 0; s < Math.min(fwd, back); s++) pad.stick(fwd <= back ? 'up' : 'down', 2, gap);
        at = i;
        if (k < text.length - 1) pad.button(0, gap);
      });
      pad.ret(gap);
    },
  };
  return pad;
}
