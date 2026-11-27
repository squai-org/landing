import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveWhatsappConfig, whatsappUrl } from '../../src/lib/whatsapp';
import { decodeHtml } from './content';

const root = path.join(import.meta.dirname, '../..');
const toggleTag = /<button[^>]*\sdata-whatsapp-toggle[\s>][^>]*>/;
const pages = ['index.html', 'gracias.html', 'terminos-de-servicio.html', 'servicios/squai-one.html'];

describe('botón de WhatsApp en el HTML generado', () => {
  it('refleja el teléfono corporativo del contenido en todas las páginas', async () => {
    const copies = JSON.parse(await readFile(path.join(root, 'src/content/copies.json'), 'utf8')).site;
    const squaiOne = JSON.parse(await readFile(path.join(root, 'src/content/services/squai-one.json'), 'utf8'));

    for (const page of pages) {
      const config =
        page === 'servicios/squai-one.html'
          ? resolveWhatsappConfig(copies.ui.whatsapp, squaiOne.whatsapp)
          : copies.ui.whatsapp;
      const topics = config.panel?.topics ?? [];

      const html = await readFile(path.join(root, 'dist', page), 'utf8');
      const toggle = toggleTag.exec(html)?.[0] ?? '';
      expect(decodeHtml(toggle), page).toContain(`aria-label="${config.label}"`);
      expect(toggle, page).toContain('aria-expanded="false"');
      if (config.tooltip) {
        expect(decodeHtml(html), page).toContain(config.tooltip);
      }
      for (const topic of topics) {
        const href = whatsappUrl(copies.company.phone, topic.message);
        expect(href, page).toBeTruthy();
        expect(html, page).toContain(`href="${href}"`);
      }
    }
  });
});
