import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkout } from '../../src/config/checkout';
import { siteSchema } from '../../src/content/schema';

/**
 * Todos los textos del flujo de compra se editan desde el CMS. La configuracion
 * de runtime (src/config) solo guarda rutas y codigos, nunca textos visibles.
 */
const root = path.join(import.meta.dirname, '../..');

const loadSite = async () => {
  const source = await readFile(path.join(root, 'src/content/copies.json'), 'utf8');
  return siteSchema.parse((JSON.parse(source) as { site: unknown }).site);
};

describe('navegacion', () => {
  it('lleva el boton de fuera de Squai One en una clave de programa', async () => {
    const site = await loadSite();

    expect(site.ui.navigation.program).toBe('Empieza aquí');
  });
});

describe('textos del boton de pago', () => {
  it('vienen del contenido validado por el esquema', async () => {
    const site = await loadSite();

    expect(site.ui.checkout.button).toEqual({
      paying: 'Completa el pago en la ventana de Bold',
      retry: 'Continuar con el pago',
    });
  });

  it('no viven en la configuracion de runtime del checkout', () => {
    expect(Object.keys(checkout).filter((key) => /label/i.test(key))).toEqual([]);
  });
});

describe('casillas de consentimiento', () => {
  it('la de terminos tiene sus textos en el contenido, aparte de la de privacidad', async () => {
    const site = await loadSite();

    expect(site.ui.forms).toMatchObject({
      termsConsentPrefix: 'He leído y acepto los ',
      termsConsentLink: 'Términos de Servicio',
      termsConsentSuffix: ' de Squai.',
      privacyConsentLink: 'Política de Privacidad',
    });
  });
});
