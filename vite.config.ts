import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Important for Electron builds
  server: {
    port: 3000,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})


