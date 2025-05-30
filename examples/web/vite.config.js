
import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm';
import vue from '@vitejs/plugin-vue';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), wasm()],
  server: {
    watch: {
      ignored: ['!**/vendor/sazan-wasm/**']
    }
  },
  build: {
    target: 'esnext',
    // GitHub Pages
    outDir: '../../docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500, // KB
  },
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
