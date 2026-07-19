import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forwards relative /api calls (see CampusContext.jsx / AdminContext.jsx)
    // to the local Express backend during `npm run dev`, so the frontend
    // can use the same relative '/api' base URL in dev, single-service
    // Docker deploy, AND split deploys (via VITE_API_URL) without any code
    // branching.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
