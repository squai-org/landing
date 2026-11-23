import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

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

  it('dice fechas y horario por confirmar mientras la base no responde, en el hero y en los datos clave', () => {
    expect(html).toMatch(/<dd[^>]*data-cohort-dates[^>]*>Fechas por confirmar<\/dd>/);
    expect(html).toMatch(/<dd[^>]*data-cohort-schedule[^>]*>Horario por confirmar<\/dd>/);
    expect(html).toMatch(/<span[^>]*data-cohort-dates[^>]*>Fechas por confirmar<\/span>/);
    expect(html).toMatch(/<span[^>]*data-cohort-schedule[^>]*>Horario por confirmar<\/span>/);
  });

  it('pide la cohorte al endpoint de lectura del Programa', () => {
    expect(html).toContain('data-cohort-endpoint="/api/checkout/program/squai-one"');
  });

  it('el hero no lleva chip de estado ni formas detras de la persona', () => {
    const hero = html.slice(html.indexOf('data-hero'), html.indexOf('id="datos-clave"'));
    expect(hero).not.toContain('data-program-status');
    expect(hero).not.toMatch(/Inscripciones abiertas/);
    expect(hero).not.toMatch(/one-hero-(arch|block)/);
  });

  it('los datos clave van en las cuatro tarjetas con ilustracion, sin cuadricula aparte', () => {
    const start = html.indexOf('id="datos-clave"');
    const facts = html.slice(start, html.indexOf('</section>', start));
    expect(facts.match(/<article\b/g)).toHaveLength(4);
    expect(facts.match(/<dt\b/g)).toHaveLength(6);
    expect(facts.match(/<img\b/g)).toHaveLength(4);
  });

  it('muestra 4 semanas y 8 sesiones de 2 horas y media', () => {
    expect(html).toContain('4 semanas · 20 horas');
    expect(html).toContain('8 sesiones de 2 horas y media, 2 por semana');
    expect(html).not.toMatch(/5 semanas|cinco semanas/i);
  });

  it('publica en el JSON-LD la misma carga, sin precios ni fechas', () => {
    expect(course.hasCourseInstance.courseWorkload).toBe('8 sesiones de 2 horas y media, 2 por semana durante 4 semanas');
    expect(course.hasCourseInstance.duration).toBe('PT20H');
    expect(course.timeRequired).toBe('PT20H');
    const serialized = JSON.stringify(course);
    expect(serialized).not.toMatch(/price|offers|startDate|endDate|\d{4}-\d{2}-\d{2}/i);
  });

  it('no afirma direcciones, resenas ni precios en ningun nodo del JSON-LD de la pagina', () => {
    const serialized = JSON.stringify(graph);
    expect(serialized).not.toMatch(/PostalAddress|streetAddress|"address"|"review"|aggregateRating|"offers"|"price"|priceCurrency/i);
  });
});
