import { defineConfig } from 'vite';

// 静的サイトとしてビルド。GitHub Pages 等へ配置する場合は base を調整する。
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});
