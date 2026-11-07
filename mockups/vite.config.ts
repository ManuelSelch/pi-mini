import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: { rollupOptions: { input: fileURLToPath(new URL('./companion/index.html', import.meta.url)) } },
});
