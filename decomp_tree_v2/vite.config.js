import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import fs from 'fs';
import path from 'path';

const certFile = path.resolve('./certs/cert.pem');
const keyFile  = path.resolve('./certs/key.pem');
const hasCerts = fs.existsSync(certFile) && fs.existsSync(keyFile);

const httpsOpts = hasCerts
  ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
  : false;

// Append cache-busting query param to built index.html so Tableau/browsers load latest bundle
function cacheBustPlugin() {
  return {
    name: 'cache-bust',
    writeBundle() {
      return new Promise((resolve) => {
        setTimeout(() => {
          const indexPath = path.resolve('./docs/index.html');
          if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            const v = `v=${Date.now()}`;
            html = html
              .replace(/src="([^"]+\.js)"/g, `src="$1?${v}"`)
              .replace(/href="([^"]+\.css)"/g, `href="$1?${v}"`);
            fs.writeFileSync(indexPath, html);
          }
          resolve();
        }, 100);
      });
    }
  };
}

export default defineConfig({
  plugins: [svelte(), cacheBustPlugin()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js']
  },
  base: '/tableau-decomposition-tree/decomp_tree_v2/docs/',
  server:  { port: 8000, strictPort: true, https: httpsOpts },
  preview: { port: 8000, strictPort: true, https: httpsOpts },
  build: {
    outDir: 'docs',   // GitHub Pages serves from /docs on main branch
    emptyOutDir: true,
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['d3']
  }
});
