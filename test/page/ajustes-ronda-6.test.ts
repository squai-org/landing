import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodeHtml, service } from './content';

const dist = path.join(import.meta.dirname, '../../dist');
const page = (file: string) => readFile(path.join(dist, file), 'utf8');
const navCtaClasses = (html: string) => /<(?:a|button)[^>]*class="([^"]*\bnav-cta\b[^"]*)"/.exec(html)?.[1]?.split(' ') ?? [];
const serviceOf = (html: string) => /<html[^>]*data-service="([^"]+)"/.exec(html)?.[1];

describe('CTA del navbar por pagina', () => {
  it.each([
    ['index.html', undefined],
    ['servicios/squai-grow.html', 'squai-grow'],
    ['servicios/squai-learn.html', 'squai-learn'],
    ['terminos-de-servicio.html', undefined],
    ['politica-de-privacidad.html', undefined],
  ])('%s usa el boton principal, que toma el color de la pagina', async (file, service) => {
    const html = await page(file);
    expect(navCtaClasses(html)).toContain('btn-primary');
    expect(serviceOf(html)).toBe(service);
  });

  it('Squai One conserva el CTA oscuro', async () => {
    expect(navCtaClasses(await page('servicios/squai-one.html'))).toContain('btn-dark');
  });
});

describe('hero de la pagina principal', () => {
  let html = '';
  beforeAll(async () => {
    html = await page('index.html');
  });

  it('no tiene boton propio de pausa: lo controla el boton flotante global', () => {
    expect(html).not.toContain('data-hero-animation-toggle');
    expect(html).not.toContain('hero-animation-toggle');
    expect(html).toContain('data-motion-toggle');
  });
});

describe('Lo que necesitas saber en Squai One', () => {
  const cards = service('squai-one').keyFacts?.cards ?? [];
  let section = '';
  beforeAll(async () => {
    const html = await page('servicios/squai-one.html');
    const start = html.indexOf('<section class="one-facts');
    section = html.slice(start, html.indexOf('</section>', start));
  });

  it('es un carrusel con las flechas y el arrastre de Sesiones', () => {
    expect(section).toMatch(/<section[^>]*id="datos-clave"[^>]*data-sessions/);
    expect(section).toContain('data-sessions-track');
    expect(section.match(/data-sessions-step="(prev|next)"/g)).toHaveLength(2);
  });

  it('muestra una tarjeta por cada una del contenido, con solo titulo, descripcion e ilustracion decorativa', () => {
    const slides = section.split('data-session-slide').slice(1);
    expect(cards.length).toBeGreaterThan(0);
    expect(slides).toHaveLength(cards.length);
    for (const slide of slides) {
      expect(slide.match(/<h3\b/g)).toHaveLength(1);
      expect(slide.match(/<p\b/g)).toHaveLength(1);
      expect(slide.match(/<img\b[^>]*alt=""/g)).toHaveLength(1);
    }
    expect(section).not.toMatch(/<dl\b|<dt\b|session-slide-meta|session-slide-topics|data-cohort-/);
  });

  it('los titulos salen del contenido, en su orden', () => {
    const titles = [...section.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((match) => decodeHtml(match[1] ?? ''));
    expect(titles).toEqual(cards.map((card) => card.title));
  });
});
