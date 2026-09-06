import { defineConfig } from "vite";

// Konfigurasi untuk Vercel / Netlify (deploy statis).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
  server: {
    // Dev server lokal — kalau kamu mau mengetes scan kamera lewat https
    // (getUserMedia butuh secure context), pakai: npm run dev -- --host
    host: true,
    port: 5173,
  },
});
