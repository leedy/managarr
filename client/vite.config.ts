import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env from root directory
  const env = loadEnv(mode, resolve(__dirname, '..'), '');

  const port = parseInt(env.VITE_PORT || '5179');
  const host = env.VITE_HOST || '0.0.0.0';
  const apiUrl = env.VITE_API_URL || 'http://192.168.1.20:3005';

  return {
    plugins: [react()],
    server: {
      port,
      host,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiUrl,
          ws: true,
        },
      },
    },
  };
});
