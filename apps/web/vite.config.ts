import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // In production `/api` is a Vercel function; locally `api/dev.mjs` serves
    // the same Hono app (started alongside Vite by the root `pnpm dev`).
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 8787}`,
        // Keep the browser's Host header (string shorthand implies
        // changeOrigin: true) — the API's origin guard requires the Origin
        // host to match the Host it sees, so POSTs 403 otherwise.
        changeOrigin: false,
      },
    },
  },
});
