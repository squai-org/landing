import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { siteSchema } from '../../src/content/schema';

/**
 * El selector de moneda del checkout no tiene textos propios: salen del
 * contenido (Pages CMS), validado por el mismo esquema que usa el build.
 */
const read = (file: string) => readFile(path.join(import.meta.dirname, '../..', file), 'utf8');

describe('textos del selector de moneda', () => {
  it('vienen del contenido y cumplen el esquema', async () => {
    const copies = JSON.parse(await read('src/content/copies.json')) as { site: unknown };

    const site = siteSchema.parse(copies.site);

    expect(site.ui.checkout.currency).toEqual({
      label: expect.any(String),
      cop: expect.any(String),
      usd: expect.any(String),
    });
  });

  it('se pueden editar en Pages CMS, sin el precio de referencia fijo en USD', async () => {
    const pages = await read('.pages.yml');
    const checkoutNode = pages.slice(pages.indexOf('label: Sección de inscripción'));
    const currencyNode = checkoutNode.slice(checkoutNode.indexOf('- name: currency'));

    expect(checkoutNode).toContain('- name: currency');
    for (const field of ['label', 'cop', 'usd']) expect(currencyNode).toContain(`- name: ${field}`);
    expect(pages).not.toContain('referencePrice');
  });
});
