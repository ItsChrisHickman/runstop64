// The browser, for headless front-end tests (run under Node by tools/test.mjs): storage in
// memory, fetch answering with a snapshot's bytes, and targets for listeners that never fire.
import type { KeyTarget, PointerTarget } from 'c64kit';

/**
 * localStorage, kept in `store` (tests seed it and read it back). Returns the store. `room`: how many characters
 * (keys and values) the storage holds at most, as a browser's quota does; a write past it throws, as a browser's does.
 */
export function useMemoryStorage(store = new Map<string, string>(), room = Infinity): Map<string, string> {
  const storage: Storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const others = [...store].reduce((n, [key, value]) => (key === k ? n : n + key.length + value.length), 0);
      if (others + k.length + v.length > room) throw new Error('QuotaExceededError');
      store.set(k, v);
    },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return store;
}

/** fetch(), answering anything with these bytes (a game's title snapshot). */
export function stubFetch(bytes: Uint8Array) {
  const body = () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
  Object.defineProperty(globalThis, 'fetch', { value: async () => ({ arrayBuffer: async () => body() }), configurable: true, writable: true });
}

/** Where Input and a game's pointer listeners are attached when nothing will call them. */
export const nowhere: KeyTarget & PointerTarget = { addEventListener() {}, removeEventListener() {} };
