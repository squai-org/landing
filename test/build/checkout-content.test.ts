import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkout } from '../../src/config/checkout';
import { siteSchema } from '../../src/content/schema';
import { company, confirmationEmailCopy } from '../../src/server/lib/copy';

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

  it('se pueden editar en Pages CMS, sin precios fijos en los textos de la sección', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const checkoutNode = pages.slice(pages.indexOf('label: Sección de inscripción'));
    const currencyNode = checkoutNode.slice(checkoutNode.indexOf('- name: currency'));

    expect(checkoutNode).toContain('- name: currency');
    for (const field of ['label', 'cop', 'usd']) expect(currencyNode).toContain(`- name: ${field}`);
    expect(checkoutNode).not.toContain('referencePrice');
    expect(pages).toContain('- name: referencePrice');
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

const RESUME_FIELDS = [
  'checking',
  'expiredTitle',
  'expiredBody',
  'closedTitle',
  'closedBody',
  'notFoundTitle',
  'notFoundBody',
  'backCta',
  'errorTitle',
  'errorBody',
];

describe('textos de la pagina para retomar', () => {
  it('los avisos de expirado, cerrado y no encontrado vienen del contenido', async () => {
    const site = await loadSite();

    expect(Object.keys(site.ui.checkout.resume).sort()).toEqual([...RESUME_FIELDS].sort());
    for (const field of RESUME_FIELDS) {
      expect(site.ui.checkout.resume[field as keyof typeof site.ui.checkout.resume]).toEqual(expect.any(String));
    }
  });

  it('se pueden editar en Pages CMS', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const checkoutNode = pages.slice(pages.indexOf('label: Sección de inscripción'));
    const resumeNode = checkoutNode.slice(checkoutNode.indexOf('- name: resume'));

    expect(checkoutNode).toContain('- name: resume');
    for (const field of RESUME_FIELDS) expect(resumeNode).toContain(`- name: ${field}`);
  });

  it('no repiten el plazo del enlace, que vive en src/config/checkout.ts', async () => {
    const site = await loadSite();
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const days = new RegExp(`\\b${checkout.resumeExpiryDays}\\s*d`, 'i');

    expect(JSON.stringify(site.ui.checkout.resume)).not.toMatch(days);
    expect(pages).not.toMatch(new RegExp(`\\(${checkout.resumeExpiryDays}\\s*d`, 'i'));
  });
});

describe('textos y datos del correo de confirmacion', () => {
  it('el Worker los lee del mismo contenido que valida el esquema', async () => {
    const site = await loadSite();

    expect(confirmationEmailCopy).toEqual(site.ui.checkout.confirmationEmail);
    expect(company).toEqual(site.company);
  });

  it('razon social y NIT son los de los Terminos de Servicio', async () => {
    const site = await loadSite();
    const terms = JSON.stringify(site.legal.terms);

    expect(terms).toContain(site.company.legalName);
    expect(terms).toContain(`NIT ${site.company.nit}`);
  });

  it('se pueden editar en Pages CMS', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const emailNode = pages.slice(pages.indexOf('- name: confirmationEmail'));
    const companyNode = pages.slice(pages.indexOf('- name: company'));

    for (const field of ['pending', 'durationOne', 'durationMany', 'sessionsLinkBefore', 'sessionsLinkFallback', 'paymentMethods', 'paymentMethodFallback']) {
      expect(emailNode).toContain(`- name: ${field}`);
    }
    for (const field of ['legalName', 'nit', 'address', 'phone', 'contact']) expect(companyNode).toContain(`- name: ${field}`);
  });

  it('no quedan textos del correo escritos en el Worker', async () => {
    const service = await readFile(path.join(root, 'src/server/services/email.service.ts'), 'utf8');

    for (const text of ['Por confirmar', 'antes de la primera', 'Pago en l', 'Tarjeta de cr', 'enero', 'semana']) {
      expect(service).not.toContain(text);
    }
  });
});

describe('estado de ventas en el contenido', () => {
  it('"Proximamente" no promete una fecha: la apertura vive en D1 (program_limits)', async () => {
    const site = await loadSite();

    expect(site.ui.checkout.status.upcomingBody).not.toMatch(/\d/);
  });
});

describe('placeholders y nota de pago seguro del formulario', () => {
  it('vienen del contenido y cumplen el esquema', async () => {
    const site = await loadSite();

    expect(site.ui.forms.placeholders).toEqual({
      fullName: 'Ej. Laura Gómez',
      email: 'laura@tuempresa.com',
      phone: '300 000 0000',
    });
    expect(site.ui.checkout.secureNote).toBe('Pago seguro en línea · Confirmación por correo');
  });

  it('se pueden editar en Pages CMS', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');

    for (const field of ['placeholders', 'secureNote']) expect(pages).toContain(`- name: ${field}`);
  });
});
