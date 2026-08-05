import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vite configuration for the admin portal.
 *
 * Runs on port 5174 so it can sit alongside the guest frontend (5173) during
 * development. Tailwind v4 is wired through PostCSS (`postcss.config.js`).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },

    server: {
      port: 5174,
      open: true,
      proxy: env.VITE_API_URL
        ? { '/api': { target: env.VITE_API_URL, changeOrigin: true, secure: false } }
        : undefined,
    },

    preview: { port: 4174 },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
