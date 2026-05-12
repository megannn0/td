import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to the backend during development to avoid CORS issues.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
