import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the root of surama.net (a GitHub Pages custom domain), so
// production and dev share Vite's default base of "/".
export default defineConfig({
  plugins: [react()],
})
