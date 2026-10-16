// The few Node.js APIs our headless tests and tools use, typed by hand: @types/node isn't in
// node_modules. Only what we call, with Node's own signatures narrowed to our uses;
// tsconfig.test.json includes this file. If @types/node is added as a devDependency, delete
// this file and put "node" in tsconfig.test.json's "types".

type BufferEncoding = 'utf8' | 'latin1' | 'hex' | 'base64' | 'ascii';

declare class Buffer extends Uint8Array {
  static alloc(size: number): Buffer;
  static from(data: string, encoding?: BufferEncoding): Buffer;
  static from(data: ArrayLike<number> | ArrayBufferLike): Buffer;
  static concat(list: readonly Uint8Array[]): Buffer;
  toString(encoding?: BufferEncoding): string;
  writeUInt32BE(value: number, offset?: number): number;
  subarray(start?: number, end?: number): Buffer;
}

declare const process: {
  readonly argv: string[];
  readonly env: Record<string, string | undefined>;
  exit(code?: number): never;
};

declare module 'node:fs' {
  type Path = string | URL;
  function readFileSync(path: Path): Buffer;
  function readFileSync(path: Path, encoding: BufferEncoding): string;
  function writeFileSync(path: Path, data: string | Uint8Array): void;
  function mkdirSync(path: Path, options?: { recursive?: boolean }): void;
  function readdirSync(path: Path): string[];
  function existsSync(path: Path): boolean;
  const fs: {
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    mkdirSync: typeof mkdirSync;
    readdirSync: typeof readdirSync;
    existsSync: typeof existsSync;
  };
  export default fs;
}

declare module 'node:path' {
  const path: {
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    dirname(p: string): string;
    basename(p: string, ext?: string): string;
  };
  export default path;
}

declare module 'node:url' {
  function fileURLToPath(url: string | URL): string;
  function pathToFileURL(path: string): URL;
}

declare module 'node:zlib' {
  const zlib: { deflateSync(data: Uint8Array): Buffer };
  export default zlib;
}

declare module 'node:crypto' {
  interface Hash {
    update(data: string | Uint8Array): Hash;
    digest(encoding: 'hex' | 'base64'): string;
  }
  const crypto: { createHash(algorithm: string): Hash };
  export default crypto;
}
