import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5179,
    // Listen on all interfaces so other devices on your LAN can open http://<your-PC-IP>:5179
    host: true,
  },
  preview: {
    port: 5179,
    host: true,
  },
});
