import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import cspHeaders from '../../src/integrations/csp-headers.mjs';

/**
 * El checkout embebido de Bold carga su libreria desde checkout.bold.co y abre
 * su formulario en un iframe de ese mismo origen. Si la politica no los
 * permite, el boton no falla con un error visible: el navegador bloquea el
 * script y no pasa nada. Ningun test de la API detecta eso, asi que se
 * comprueba sobre el archivo que termina en dist/_headers.
 */
const runIntegration = async (html: string) => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'squai-csp-'));
  await writeFile(path.join(outDir, '_headers'), '/*\n# @csp@\n  X-Content-Type-Options: nosniff\n', 'utf8');
  await writeFile(path.join(outDir, 'index.html'), html, 'utf8');

  const integration = cspHeaders({ reportOnly: false });
  await integration.hooks['astro:build:done']({
    dir: pathToFileURL(`${outDir}${path.sep}`),
    logger: { info: () => {}, warn: () => {} },
  });

  return readFile(path.join(outDir, '_headers'), 'utf8');
};

const directive = (headers: string, name: string) => {
  const line = headers.split('\n').find((row) => row.includes('Content-Security-Policy:'));
  const found = line?.split(';').find((part) => part.trim().startsWith(`${name} `));
  return found?.trim() ?? '';
};

describe('Content-Security-Policy construida en el build', () => {
  it('permite la libreria y el iframe de Bold', async () => {
    const headers = await runIntegration('<html><body><p>hola</p></body></html>');

    expect(directive(headers, 'script-src')).toContain('https://checkout.bold.co');
    expect(directive(headers, 'frame-src')).toContain('https://checkout.bold.co');
  });

  it('mantiene permitido Turnstile', async () => {
    const headers = await runIntegration('<html><body><p>hola</p></body></html>');

    expect(directive(headers, 'script-src')).toContain('https://challenges.cloudflare.com');
    expect(directive(headers, 'frame-src')).toContain('https://challenges.cloudflare.com');
  });

  it('permite marcos solo de YouTube en privacidad mejorada, sin abrir otras directivas', async () => {
    const headers = await runIntegration('<html><body><p>hola</p></body></html>');

    expect(directive(headers, 'frame-src').split(' ')).toContain('https://www.youtube-nocookie.com');
    for (const name of ['default-src', 'script-src', 'img-src', 'connect-src', 'style-src', 'font-src']) {
      expect(directive(headers, name)).not.toMatch(/youtube/);
    }
    expect(directive(headers, 'img-src')).toBe("img-src 'self' data:");
    expect(headers).not.toContain('youtube.com');
  });

  it('sigue poniendo el hash de los scripts en linea que emite Astro', async () => {
    const headers = await runIntegration('<html><body><script>console.log(1)</script></body></html>');

    expect(directive(headers, 'script-src')).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
  });

  /**
   * La libreria de Bold abre el modal con un <bold-embedded-checkout> cuyo
   * shadow DOM lleva su propio <style>. Con `style-src 'self'` el navegador lo
   * descarta y el iframe queda como un bloque sin posicion al final de la
   * pagina, en vez de un modal centrado. El hash se calcula aqui a partir de una
   * copia de la libreria real (test/fixtures/bold-library.js.txt), no de la
   * constante de la integracion: si Bold cambia su CSS, la copia se actualiza y
   * este test avisa de que la CSP quedo vieja.
   */
  it('permite el CSS con el que Bold pinta su modal', async () => {
    const library = await readFile(path.join(import.meta.dirname, '../fixtures/bold-library.js.txt'), 'utf8');
    const modalCss = library.match(/D="(#boldEmbeddedCheckout[^"]*)"/)?.[1];
    expect(modalCss, 'no se encontro el CSS del modal en la copia de la libreria').toBeTruthy();
    const hash = `'sha256-${createHash('sha256').update(modalCss!, 'utf8').digest('base64')}'`;

    const headers = await runIntegration('<html><body><p>hola</p></body></html>');

    expect(directive(headers, 'style-src')).toContain(hash);
  });
});
