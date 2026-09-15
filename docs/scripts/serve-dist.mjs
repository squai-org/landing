/**
 * Servidor estático que replica el routing de producción de este sitio:
 * `trailingSlash: 'never'` + `build.format: 'file'` (astro.config.mjs), es
 * decir que /servicios/squai-one se sirve desde dist/servicios/squai-one.html.
 *
 * Sin esto, un servidor genérico devuelve 404 en las rutas internas y las
 * auditorías analizan una página de error en vez de la real.
 *
 *   pnpm build && node docs/scripts/serve-dist.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../dist/', import.meta.url));
const PORT = Number(process.env.PORT ?? 8799);

const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.json': 'application/json',
};

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.join(ROOT, pathname);

    if (pathname === '/') file = path.join(ROOT, 'index.html');
    else if (!path.extname(file)) file += '.html';

    // Nadie debe poder salirse de dist/ con ../
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('403');
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      return res.end(`404 ${pathname}`);
    }

    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`http://127.0.0.1:${PORT}`));
