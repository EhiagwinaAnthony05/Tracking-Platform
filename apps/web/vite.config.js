import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // @movex/shared is CommonJS (the API require()s it). Linked workspace packages are served
  // as raw source in dev, so pre-bundle it to get ES module named exports.
  optimizeDeps: {
    include: ['@movex/shared'],
  },
})
