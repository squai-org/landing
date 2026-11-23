import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { whatsappUrl } from '../../src/lib/whatsapp';

const root = path.join(import.meta.dirname, '../..');
const toggleTag = /<button[^>]*\sdata-whatsapp-toggle[\s>][^>]*>/;
const pages = ['index.html', 'gracias.html', 'terminos-de-servicio.html', 'servicios/squai-one.html'];

describe('botón de WhatsApp en el HTML generado', () => {
  it('refleja el teléfono corporativo del contenido en todas las páginas', async () => {
    const copies = JSON.parse(await readFile(path.join(root, 'src/content/copies.json'), 'utf8')).site;
    const topics = copies.ui.whatsapp.panel.topics as { label: string; message: string }[];
    expect(topics.length).toBeGreaterThan(0);

    for (const page of pages) {
      const html = await readFile(path.join(root, 'dist', page), 'utf8');
      const toggle = toggleTag.exec(html)?.[0] ?? '';
      expect(toggle, page).toContain(`aria-label="${copies.ui.whatsapp.label}"`);
      expect(toggle, page).toContain('aria-expanded="false"');
      for (const topic of topics) {
        const href = whatsappUrl(copies.company.phone, topic.message);
        expect(href).toMatch(/^https:\/\/wa\.me\/573143802400\?text=/);
        expect(html, page).toContain(`href="${href}"`);
      }
    }
  });
});
