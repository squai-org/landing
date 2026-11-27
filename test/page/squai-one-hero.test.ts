import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { courseLoadSummary, isoDuration } from '../../src/lib/course-load';
import { decodeHtml, service, site } from './content';

const dist = path.join(import.meta.dirname, '../../dist');
const one = service('squai-one');
const hero = one.hero!;

let html = '';
let course: Record<string, any> = {};
let graph: Record<string, any>[] = [];

beforeAll(async () => {
  html = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8').catch(() => {
    throw new Error('Falta dist/servicios/squai-one.html: ejecuta pnpm build antes de pnpm test:dist');
  });
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
  graph = blocks.flatMap((block) => {
    const data = JSON.parse(block);
    return data['@graph'] ?? [data];
  });
  course = graph.find((node) => node['@type'] === 'Course')!;
});

describe('hero y datos clave de Squai One', () => {
  it('lleva al formulario de inscripcion desde el hero y los datos clave', () => {
    expect(html).toContain('id="inscripcion"');
    const ctas = html.match(/<a[^>]*href="#inscripcion"[^>]*data-scroll-to="inscripcion"/g) ?? [];
    expect(ctas.length).toBeGreaterThanOrEqual(2);
  });

  it('dice fechas y horario pendientes del contenido mientras la base no responde', () => {
    for (const [attribute, pending] of [['data-cohort-dates', hero.datesPending], ['data-cohort-schedule', hero.schedulePending]]) {
      const texts = [...html.matchAll(new RegExp(`<(li|span)[^>]*${attribute}[^>]*>([^<]*)</\\1>`, 'g'))].map((match) => decodeHtml(match[2] ?? ''));
      expect(texts.length, attribute).toBeGreaterThan(0);
      for (const text of texts) expect(text, attribute).toBe(pending);
    }
  });

  it.skipIf(!hero.supportSchedule)('el hero pinta una etiqueta por segmento del horario con su variante de color', () => {
    const chips = [...html.matchAll(/<li class="one-hero-chip one-hero-chip-(\w+)"[^>]*>([^<]*)<\/li>/g)].map((match) => [match[1], decodeHtml(match[2] ?? '')]);
    const segments = (hero.supportSchedule ?? '').split('·').map((segment) => segment.trim()).filter(Boolean);
    const variants = ['start', 'schedule'];
    expect(chips).toEqual([
      ...segments.map((label, index) => [variants[index] ?? 'offer', label]),
      ...(hero.supportOffer ? [['offer', hero.supportOffer]] : []),
    ]);
  });

  it('las etiquetas del hero no llevan iconos', () => {
    const list = /<ul class="one-hero-chips"[^>]*>([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
    expect(list).not.toBe('');
    expect(list).not.toMatch(/<svg|<img/);
  });

  it('pide la cohorte al endpoint de lectura del Programa', () => {
    expect(html).toContain('data-cohort-endpoint="/api/checkout/program/squai-one"');
  });

  it('las etiquetas del hero aparecen una sola vez en el HTML', () => {
    expect(html.match(/class="[^"]*\bone-hero-tag-note\b[^"]*"/g)).toHaveLength(1);
    expect(html.match(/class="[^"]*\bone-hero-tag-sticker\b[^"]*"/g)).toHaveLength(1);
    const text = decodeHtml(html);
    expect(text.split(`>${hero.note}<`)).toHaveLength(2);
    expect(text.split(`>${hero.sticker}<`)).toHaveLength(2);
  });

  it('el hero no lleva chip de estado ni formas detras de la persona', () => {
    const heroHtml = html.slice(html.indexOf('data-hero'), html.indexOf('id="datos-clave"'));
    expect(heroHtml).not.toContain('data-program-status');
    expect(heroHtml).not.toMatch(/one-hero-(arch|block)/);
  });

  it('los datos clave van en una tarjeta con ilustracion por cada una del contenido, sin cuadricula aparte', () => {
    const start = html.indexOf('id="datos-clave"');
    const facts = html.slice(start, html.indexOf('</section>', start));
    const cards = one.keyFacts?.cards ?? [];
    expect(cards.length).toBeGreaterThan(0);
    expect(facts.match(/<article\b/g)).toHaveLength(cards.length);
    expect(facts.match(/<dt\b/g)).toBeNull();
    expect(facts.match(/<img\b/g)).toHaveLength(cards.length);
  });

  it('publica en el JSON-LD la misma carga, sin precios ni fechas', () => {
    const load = one.keyFacts!.load!;
    expect(course.hasCourseInstance.courseWorkload).toBe(courseLoadSummary(load, site.seo.course.workload));
    expect(course.hasCourseInstance.duration).toBe(isoDuration(load));
    expect(course.timeRequired).toBe(isoDuration(load));
    const serialized = JSON.stringify(course);
    expect(serialized).not.toMatch(/price|offers|startDate|endDate|\d{4}-\d{2}-\d{2}/i);
  });

  it('no afirma direcciones, resenas ni precios en ningun nodo del JSON-LD de la pagina', () => {
    const serialized = JSON.stringify(graph);
    expect(serialized).not.toMatch(/PostalAddress|streetAddress|"address"|"review"|aggregateRating|"offers"|"price"|priceCurrency/i);
  });
});
