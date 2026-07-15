import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev server pinned to 5174 so it matches the backend's CORS whitelist.
// (5173 is left free for the ghelpdesk project's Vite server.)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
  },
});
