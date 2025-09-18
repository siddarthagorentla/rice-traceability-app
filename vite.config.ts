import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // FIX: Expose the API_KEY to the client-side code under process.env.API_KEY
  // to align with the Gemini API coding guidelines.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
