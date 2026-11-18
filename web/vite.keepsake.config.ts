import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The offline keepsake of a birthday card (src/birthday/keepsake.tsx), built as one plain
 * script + one stylesheet: pages opened straight from a file can't load ES modules, so
 * this is an IIFE. scripts/card-picker/keepsake.py runs it and puts the folder together.
 */
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: 'dist-keepsake',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/birthday/keepsake.tsx',
      formats: ['iife'],
      name: 'Keepsake',
      fileName: () => 'keepsake.js',
      cssFileName: 'keepsake',
    },
  },
});
