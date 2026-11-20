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

describe('textos del selector de moneda', () => {
  it('vienen del contenido y cumplen el esquema', async () => {
    const site = await loadSite();

    expect(site.ui.checkout.currency).toEqual({
      label: expect.any(String),
      cop: expect.any(String),
      usd: expect.any(String),
    });
  });

  it('se pueden editar en Pages CMS, sin el precio de referencia fijo en USD', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const checkoutNode = pages.slice(pages.indexOf('label: Sección de inscripción'));
    const currencyNode = checkoutNode.slice(checkoutNode.indexOf('- name: currency'));

    expect(checkoutNode).toContain('- name: currency');
    for (const field of ['label', 'cop', 'usd']) expect(currencyNode).toContain(`- name: ${field}`);
    expect(pages).not.toContain('referencePrice');
  });
});

describe('textos del estado de ventas', () => {
  it('"Proximamente" e "Inscripciones cerradas" vienen del contenido', async () => {
    const site = await loadSite();

    expect(site.ui.checkout.status).toEqual({
      upcomingTitle: 'Próximamente',
      upcomingBody: expect.any(String),
      closedTitle: 'Inscripciones cerradas',
      closedBody: expect.any(String),
    });
  });

  it('la pagina de gracias tiene la variante de cliente ya inscrito', async () => {
    const site = await loadSite();

    expect(site.ui.checkout.thanks).toMatchObject({
      enrolledTitle: expect.any(String),
      enrolledBody: expect.any(String),
    });
  });

  it('se pueden editar en Pages CMS', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const checkoutNode = pages.slice(pages.indexOf('label: Sección de inscripción'));
    const thanksNode = checkoutNode.slice(checkoutNode.indexOf('- name: thanks'));
    const statusNode = checkoutNode.slice(checkoutNode.indexOf('- name: status'));

    expect(checkoutNode).toContain('- name: status');
    for (const field of ['upcomingTitle', 'upcomingBody', 'closedTitle', 'closedBody']) {
      expect(statusNode).toContain(`- name: ${field}`);
    }
    for (const field of ['enrolledTitle', 'enrolledBody']) expect(thanksNode).toContain(`- name: ${field}`);
  });
});
