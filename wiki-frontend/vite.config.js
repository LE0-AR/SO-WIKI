import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [
        fileURLToPath(new URL('.', import.meta.url)),
        fileURLToPath(new URL('../definici_n_del_proyecto_2.md', import.meta.url)),
        fileURLToPath(new URL('../propuesta_parqueo.md', import.meta.url)),
      ],
    },
    proxy: {
      '/api/parqueo': { target: 'http://127.0.0.1:3000' },
      '/socket.io': { target: 'http://127.0.0.1:3000', ws: true },
    },
  },
})
