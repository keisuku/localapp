import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Actions でのビルド時のみ Pages のサブパスを base にする
const base = process.env.GITHUB_ACTIONS ? '/localapp/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Local App Studio',
        short_name: 'LocalAppStudio',
        description:
          'Excel/CSV/JSONをドラッグ&ドロップで取り込み、ブラウザ内で完結するローカル業務アプリ基盤',
        lang: 'ja',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // オフライン単一HTML版（ビルド後に同梱）は precache 対象外
        globIgnores: ['**/local-app-studio-offline.html'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
