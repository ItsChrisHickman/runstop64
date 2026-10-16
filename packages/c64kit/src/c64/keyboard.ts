/**
 * The C64 keyboard matrix: KeyboardEvent.code → [row (CIA1 PA bit), column (PB bit)].
 * Positional, so a modern keyboard's keys land where the C64's were.
 */
export const C64_KEYS: Record<string, [number, number]> = {
  Backspace: [0, 0], Enter: [0, 1], NumpadEnter: [0, 1], F7: [0, 3], F1: [0, 4], F3: [0, 5], F5: [0, 6],
  Digit3: [1, 0], KeyW: [1, 1], KeyA: [1, 2], Digit4: [1, 3], KeyZ: [1, 4], KeyS: [1, 5], KeyE: [1, 6], ShiftLeft: [1, 7],
  Digit5: [2, 0], KeyR: [2, 1], KeyD: [2, 2], Digit6: [2, 3], KeyC: [2, 4], KeyF: [2, 5], KeyT: [2, 6], KeyX: [2, 7],
  Digit7: [3, 0], KeyY: [3, 1], KeyG: [3, 2], Digit8: [3, 3], KeyB: [3, 4], KeyH: [3, 5], KeyU: [3, 6], KeyV: [3, 7],
  Digit9: [4, 0], KeyI: [4, 1], KeyJ: [4, 2], Digit0: [4, 3], KeyM: [4, 4], KeyK: [4, 5], KeyO: [4, 6], KeyN: [4, 7],
  Minus: [5, 3], KeyP: [5, 1], KeyL: [5, 2], Period: [5, 4], Semicolon: [6, 2], Comma: [5, 7],
  Equal: [6, 5], Slash: [6, 7], ShiftRight: [6, 4],
  Digit1: [7, 0], ControlLeft: [7, 2], Digit2: [7, 3], Space: [7, 4], KeyQ: [7, 6], Escape: [7, 7],
};
