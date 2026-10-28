import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Fills the precache list + version into dist/sw.js after the build.
function serviceWorkerPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'alchemydoku-sw',
    apply: 'build',
    configResolved(cfg) { outDir = path.resolve(cfg.root, cfg.build.outDir); },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) walk(full);
          else if (e.name !== 'sw.js' && !e.name.endsWith('.map')) {
            files.push(path.relative(outDir, full).split(path.sep).join('/'));
          }
        }
      };
      walk(outDir);
      files.sort();
      const hash = crypto.createHash('sha1');
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(outDir, f)));
      const precache = ['./', ...files];
      const out = fs.readFileSync(swPath, 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 10))
        .replace('__PRECACHE__', () => JSON.stringify(precache));
      fs.writeFileSync(swPath, out);
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/alchemydoku/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react(), serviceWorkerPlugin()],
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
