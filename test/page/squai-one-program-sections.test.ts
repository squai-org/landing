import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

const sectionOf = (html: string, id: string) => {
  const start = html.indexOf(`<section id="${id}"`);
  if (start === -1) throw new Error(`Sin <section id="${id}"> en el HTML`);
  return html.slice(start, html.indexOf('</section>', start));
};

const count = (fragment: string, pattern: RegExp) => fragment.match(pattern)?.length ?? 0;

const classed = (name: string) => new RegExp(`class="(?:[^"]* )?${name}(?: [^"]*)?"`, 'g');

describe('Squai One: para quien es, como funciona y temario', () => {
  let page = '';

  beforeAll(async () => {
    page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
  });

  it('muestra las tres secciones en el orden de Notion', () => {
    const order = ['para-quien', 'como-funciona', 'temario'].map((id) => page.indexOf(`<section id="${id}"`));

    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('cada seccion tiene un h2 y sus encabezados bajan de nivel sin saltos', () => {
    for (const id of ['para-quien', 'como-funciona', 'temario']) {
      const section = sectionOf(page, id);
      expect(count(section, /<h2\b/g)).toBe(1);
      if (id !== 'para-quien') expect(count(section, /<h3\b/g)).toBeGreaterThan(0);
    }
  });

  it('el temario es el carrusel de 6 bloques de contenido sin etiquetas de modulo', () => {
    const syllabus = sectionOf(page, 'temario');

    expect(count(syllabus, classed('syllabus-module'))).toBe(0);
    expect(count(syllabus, classed('syllabus-session'))).toBe(6);
    expect(syllabus).toMatch(/Lo que vemos en las 8 sesiones/);
    expect(count(syllabus, classed('session-slide-meta'))).toBe(0);
  });

  it('Es para ti integra los tres bloques en el mismo tramo de scroll', () => {
    const fit = sectionOf(page, 'para-quien');

    expect(fit).toContain('¿Es para ti?');
    expect(fit).toContain('Puedes empezar sin haber usado la IA antes.');
    expect(fit).toContain('No es para ti si...');
    expect(fit).toContain('No te vendemos humo.');
    expect(fit).toContain('Reemplazar todo con IA');
    expect(fit).toContain('Lo que necesitas');
    expect(fit).toContain('También puedes comprar una libreta para tomar apuntes');
    expect(fit).toContain('Un computador.');
    expect(fit).toContain('Conexión a internet.');
    expect(fit).toContain('Una cuenta gratuita de IA');
    expect(fit).toContain('Cualquier herramienta como Claude, ChatGPT o Gemini. Si todavía no la tienes, te ayudamos a crearla en la primera sesión.');
    expect(fit).toContain('Quiero inscribirme');
  });

  it('cuenta cuatro pasos y cada ilustracion lleva texto alternativo', () => {
    const flow = sectionOf(page, 'como-funciona');

    expect(count(flow, classed('flow-step'))).toBe(4);
    const images = flow.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(4);
    expect(images.every((tag) => /\balt="[^"]+"/.test(tag))).toBe(true);
  });
});

describe('Squai One: franja de datos', () => {
  it('ninguna cinta lleva precios ni monedas, solo datos de la cohorte y textos editables', async () => {
    const page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
    const start = page.indexOf('class="one-marquee"');
    const strip = page.slice(start, page.indexOf('</section>', start)).replace(/<[^>]+>/g, ' ');

    expect(strip).toContain('8 sesiones en vivo');
    expect(strip).not.toMatch(/COP|USD|\$|\d[.,]\d{3}/);
  });
});
