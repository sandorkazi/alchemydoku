import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/alchemydoku/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@':        path.resolve(__dirname, './src'),
      '@shared':  path.resolve(__dirname, './src/shared'),
      '@base':    path.resolve(__dirname, './src/base'),
      '@expanded': path.resolve(__dirname, './src/expanded'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
