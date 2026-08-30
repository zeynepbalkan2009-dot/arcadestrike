import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@shared': path.resolve(__dirname, '../shared/src') } },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:2567', changeOrigin: true } },
  },
  build: {
    outDir: 'dist',
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'], colyseus: ['colyseus.js'] } } },
  },
  define: {
    '__SERVER_URL__': JSON.stringify(process.env.VITE_SERVER_URL ?? 'ws://localhost:2567'),
  },
});
