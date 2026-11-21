import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { whatsappUrl } from '../../src/lib/whatsapp';

const root = path.join(import.meta.dirname, '../..');
const anchorPattern = /<a[^>]*\sdata-whatsapp[\s>][^>]*>/;
const pages = ['index.html', 'gracias.html', 'terminos-de-servicio.html', 'servicios/squai-one.html'];

describe('botón de WhatsApp en el HTML generado', () => {
  it('refleja el teléfono corporativo del contenido en todas las páginas', async () => {
    const copies = JSON.parse(await readFile(path.join(root, 'src/content/copies.json'), 'utf8')).site;
    const expected = whatsappUrl(copies.company.phone, copies.ui.whatsapp.message);

    for (const page of pages) {
      const html = await readFile(path.join(root, 'dist', page), 'utf8');
      if (expected) {
        const anchor = anchorPattern.exec(html)?.[0] ?? '';
        expect(anchor, page).toContain(`href="${expected}"`);
        expect(anchor, page).toContain(`aria-label="${copies.ui.whatsapp.label}"`);
      } else {
        expect(html, page).not.toMatch(anchorPattern);
        expect(html, page).not.toContain('wa.me');
      }
    }
  });
});
