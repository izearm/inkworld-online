import { defineConfig } from 'vite';
// base './' → deploy ใต้ path ไหนก็ได้ (เช่น Cloudflare Workers) · server.host เปิดให้ทดสอบมือถือผ่าน IP เครื่อง
export default defineConfig({
  base: './',
  server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:8787', '/ws': { target: 'ws://localhost:8787', ws: true } } }, // ออนไลน์: npm run server คู่กับ npm run dev
  build: { target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: { input: { main: 'index.html', arena: 'arena.html', editor: 'editor.html', online: 'online.html' }, output: { manualChunks: { phaser: ['phaser'] } } } }
});
