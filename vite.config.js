import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const bypassHtml = (req) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return '/index.html';
  }
  return null;
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/login': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        bypass: bypassHtml,
      },
      '/admin/login': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        bypass: bypassHtml,
      },
      '/logout': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/me': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/change-password': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/student': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        bypass: bypassHtml,
      },
      '/lecturer': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        bypass: bypassHtml,
      },
      '/admin': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        bypass: bypassHtml,
      },
    },
  },
});
