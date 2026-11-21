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
      expect(count(section, /<h3\b/g)).toBeGreaterThan(0);
    }
  });

  it('el temario tiene 6 modulos repartidos en 8 sesiones', () => {
    const syllabus = sectionOf(page, 'temario');

    expect(count(syllabus, classed('syllabus-module'))).toBe(6);
    expect(count(syllabus, classed('syllabus-session'))).toBe(8);
    expect(syllabus).toMatch(/Seis módulos, ocho sesiones/);
  });

  it('numera las sesiones de 1 a 8 sin repetir', () => {
    const tags = [...sectionOf(page, 'temario').matchAll(/syllabus-session-tag[^>]*>Sesión (\d+)</g)].map((match) => Number(match[1]));

    expect(tags).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('cuenta cuatro pasos y cada ilustracion lleva texto alternativo', () => {
    const flow = sectionOf(page, 'como-funciona');

    expect(count(flow, classed('flow-step'))).toBe(4);
    const images = flow.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(4);
    expect(images.every((tag) => /\balt="[^"]+"/.test(tag))).toBe(true);
  });
});
