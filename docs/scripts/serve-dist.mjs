/**
 * Servidor estático que replica el routing y las cabeceras de producción:
 * `trailingSlash: 'never'` + `build.format: 'file'` (astro.config.mjs), es
 * decir que /servicios/squai-one se sirve desde dist/servicios/squai-one.html.
 *
 * Sin esto, un servidor genérico devuelve 404 en las rutas internas y las
 * auditorías analizan una página de error en vez de la real.
 *
 * Aplica además las reglas de dist/_headers, que es lo que permite comprobar
 * la Content-Security-Policy real antes de desplegarla.
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

function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    const at = raw.indexOf(':');
    if (current && at > 0) current.headers.push([raw.slice(0, at).trim(), raw.slice(at + 1).trim()]);
  }
  return rules;
}

const matches = (pattern, pathname) => {
  const star = pattern.indexOf('*');
  if (star === -1) return pattern === pathname;
  return pathname.startsWith(pattern.slice(0, star));
};

let RULES = [];
try {
  RULES = parseHeaders(fs.readFileSync(path.join(ROOT, '_headers'), 'utf8'));
  console.log(`_headers: ${RULES.length} reglas cargadas`);
} catch {
  console.log('_headers: no encontrado, se sirve sin cabeceras extra');
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.join(ROOT, pathname);

    if (pathname === '/') file = path.join(ROOT, 'index.html');
    else if (!path.extname(file)) file += '.html';

    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('403');
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      return res.end(`404 ${pathname}`);
    }

    const headers = { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' };
    for (const rule of RULES) {
      if (!matches(rule.pattern, pathname)) continue;
      for (const [name, value] of rule.headers) headers[name] = value;
    }

    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`http://127.0.0.1:${PORT}`));
