import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// オフライン配布用：JS/CSS をすべてインライン化した自己完結の単一 HTML を生成する。
// file:// で直接開いても動作する（module script の CORS 制約を回避）。
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-offline',
    emptyOutDir: true,
  },
});
