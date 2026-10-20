import { defineConfig } from 'vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/** Isolated, read-only access to source assets; never opens CharEd or its write APIs. */
export default defineConfig({
  root: 'E:/zengine/ScratchXR/site/tools',
  publicDir: false,
  optimizeDeps: { noDiscovery: true, include: ['three', 'pako'] },
  server: { host: '127.0.0.1', port: 5197, strictPort: true, fs: { allow: ['E:/zengine'] } },
  plugins: [{
    name: 'scratchxr-avatar-sources',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        const route = url.startsWith('/ctr-vroid/') ? ['/ctr-vroid/', 'E:/vroid-studio']
          : url.startsWith('/mixamo/') ? ['/mixamo/', 'E:/GAP/mixamo'] : null;
        if (!route) return next();
        const base = resolve(route[1]), path = resolve(base, url.slice(route[0].length));
        if (!path.startsWith(base + '\\') || !existsSync(path) || !statSync(path).isFile()) {
          res.statusCode = 404; res.end(); return;
        }
        res.setHeader('Content-Type', path.endsWith('.json') ? 'application/json' : path.endsWith('.png') ? 'image/png' : 'application/octet-stream');
        createReadStream(path).pipe(res);
      });
    },
  }],
});
