import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Escribe la Content-Security-Policy en dist/_headers al terminar el build.
 *
 * Por que en build y no a mano: Astro incrusta en el HTML los scripts de
 * componente que son pequenos, en vez de emitirlos como archivo. Esos bloques
 * cambian de contenido en cada cambio de codigo, asi que sus hashes no se
 * pueden escribir a mano en un archivo estatico sin que queden obsoletos al
 * primer despliegue. Aqui se leen del HTML ya construido.
 *
 * Referencias:
 * - https://developers.cloudflare.com/workers/static-assets/headers/
 * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
 */

const MARKER = '# @csp@';
const TURNSTILE = 'https://challenges.cloudflare.com';

/** Bloques <script> y <style> sin `src`/`href`, que son los que necesitan hash. */
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const INLINE_STYLE = /<style(?![^>]*\bhref=)[^>]*>([\s\S]*?)<\/style>/gi;

const sha256 = (source) => `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return htmlFiles(full);
      return entry.name.endsWith('.html') ? [full] : [];
    })
  );
  return found.flat();
}

function collect(html, pattern, into) {
  for (const match of html.matchAll(pattern)) {
    // El navegador calcula el hash sobre el contenido exacto del elemento,
    // sin recortar espacios: cualquier normalizacion aqui lo invalidaria.
    into.add(sha256(match[1]));
  }
}

/**
 * @param {{ reportOnly?: boolean }} [options] `reportOnly` emite la politica
 *   como Content-Security-Policy-Report-Only: el navegador informa de lo que
 *   habria bloqueado, pero no bloquea nada. Sirve para desplegar un cambio de
 *   politica sin arriesgar una pagina rota, y se activa con CSP_REPORT_ONLY=1.
 */
export default function cspHeaders(options = {}) {
  const reportOnly = options.reportOnly ?? process.env.CSP_REPORT_ONLY === '1';

  return {
    name: 'squai:csp-headers',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = path.resolve(dir.pathname);
        const headersFile = path.join(outDir, '_headers');

        let template;
        try {
          template = await readFile(headersFile, 'utf8');
        } catch {
          logger.warn('No hay dist/_headers (deberia venir de public/_headers). No se escribe CSP.');
          return;
        }
        if (!template.includes(MARKER)) {
          logger.warn(`dist/_headers no contiene el marcador ${MARKER}. No se escribe CSP.`);
          return;
        }

        const scriptHashes = new Set();
        const styleHashes = new Set();
        for (const file of await htmlFiles(outDir)) {
          const html = await readFile(file, 'utf8');
          collect(html, INLINE_SCRIPT, scriptHashes);
          collect(html, INLINE_STYLE, styleHashes);
        }

        const directives = [
          "default-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          // frame-ancestors solo surte efecto en la cabecera: la especificacion
          // obliga a descartarlo en una politica entregada por <meta>.
          // https://www.w3.org/TR/CSP2/
          "frame-ancestors 'none'",
          "object-src 'none'",
          "img-src 'self' data:",
          "font-src 'self'",
          `script-src 'self' ${[...scriptHashes].join(' ')} ${TURNSTILE}`,
          `style-src 'self'${styleHashes.size ? ' ' + [...styleHashes].join(' ') : ''}`,
          // Los atributos style="" del HTML (el color del verbo del hero, los
          // botones sociales del footer) los gobierna style-src-attr. Sin esto
          // se bloquean, y no se pueden cubrir con hash porque no son elementos.
          "style-src-attr 'unsafe-inline'",
          `connect-src 'self' ${TURNSTILE}`,
          // Turnstile se renderiza dentro de un iframe de su propio origen.
          // https://developers.cloudflare.com/turnstile/
          `frame-src ${TURNSTILE}`,
          'upgrade-insecure-requests',
        ];

        const header = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
        const line = `  ${header}: ${directives.join('; ')}`;

        await writeFile(headersFile, template.replace(MARKER, line), 'utf8');
        logger.info(
          `${header} escrita en dist/_headers ` +
            `(${scriptHashes.size} hashes de script, ${styleHashes.size} de estilo).`
        );
      },
    },
  };
}
