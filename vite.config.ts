/// <reference types="vitest/config" />
import { createReadStream, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);
const GENAI_WASM_DIR = join(dirname(require.resolve('@mediapipe/tasks-genai')), 'wasm');
const GENAI_WASM_FILES = ['genai_wasm_internal.js', 'genai_wasm_internal.wasm'];
const GENAI_PUBLIC_DIR = 'mediapipe';

/**
 * Self-hosts the MediaPipe GenAI WebAssembly runtime so the app never needs a
 * CDN at runtime (a requirement for working offline). Files are served from
 * node_modules during development and emitted as static assets in production.
 */
function mediapipeWasm(): Plugin {
  return {
    name: 'sightecho:mediapipe-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        const file = GENAI_WASM_FILES.find((name) => path.endsWith(`/${GENAI_PUBLIC_DIR}/${name}`));
        if (!file) return next();
        res.setHeader(
          'Content-Type',
          file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        );
        createReadStream(join(GENAI_WASM_DIR, file)).pipe(res);
      });
    },
    generateBundle() {
      for (const file of GENAI_WASM_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `${GENAI_PUBLIC_DIR}/${file}`,
          source: readFileSync(join(GENAI_WASM_DIR, file)),
        });
      }
    },
  };
}

// BASE_PATH lets the app be served from a sub-path, e.g. "/SightEcho/" on GitHub Pages.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), mediapipeWasm()],
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
