import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The site is served from goshow.me/runstop64/: the loader at the root,
// each game in its own folder (games/<name>/index.html → /<name>/).
export default defineConfig({
  root: r('./games'),
  base: './',
  // (the build, in an export of saves: games/shell.ts)
  define: { 'import.meta.env.VITE_BUILD': JSON.stringify(new Date().toISOString()) },
  resolve: { alias: { c64kit: r('./packages/c64kit/src/index.ts') } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    outDir: r('./dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        loader: r('./games/index.html'),
        montyotr: r('./games/montyotr/index.html'),
      },
    },
  },
});
