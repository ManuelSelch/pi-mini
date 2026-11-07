import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { entries: ['index.html'] },
  server: { host: '127.0.0.1', port: 1420, strictPort: true },
  clearScreen: false,
});
