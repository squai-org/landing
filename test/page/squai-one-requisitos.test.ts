import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

const sectionOf = (html: string, id: string) => {
  const start = html.indexOf(`<section id="${id}"`);
  if (start === -1) throw new Error(`Sin <section id="${id}"> en el HTML`);
  return html.slice(start, html.indexOf('</section>', start));
};

describe('Squai One: Requisitos, fila No es para ti si...', () => {
  let page = '';

  beforeAll(async () => {
    page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
  });

  it('va inmediatamente despues de Es para ti', () => {
    const fitStart = page.indexOf('<section id="para-quien"');
    const next = page.slice(fitStart + 1).match(/<section id="([^"]+)"/);

    expect(next?.[1]).toBe('requisitos');
  });

  it('muestra el titulo, el cuerpo y la nota manuscrita literales', () => {
    const section = sectionOf(page, 'requisitos');

    expect(section).toMatch(/<h2\b[^>]*>No es para ti si\.\.\.<\/h2>/);
    expect(section).toContain(
      'Buscas construir agentes (asistentes que trabajan solos) para hacerte rico. Preferimos no venderte lo que no necesitas, porque con lo básico bien aprendido ya se logra mucho.'
    );
    expect(section).toMatch(/class="[^"]*one-hand[^"]*"[^>]*>No te vendemos humo\.</);
  });

  it('la foto lleva un alt no vacio que sale del contenido', () => {
    const section = sectionOf(page, 'requisitos');
    const image = section.match(/<img\b[^>]*>/)?.[0] ?? '';

    expect(image).toMatch(/\balt="[^"]+"/);
  });

  it('no aparece en el menu', () => {
    const header = page.slice(0, page.indexOf('<main'));

    expect(header).not.toContain('#requisitos');
  });

  it('Es para ti muestra la nueva nota y ya no lleva el bloque de Requisitos', () => {
    const fit = sectionOf(page, 'para-quien');

    expect(fit).toContain('Puedes empezar sin haber usado la IA antes.');
    expect(fit).not.toContain('No es para ti si');
    expect(fit).not.toContain('Lo que necesitas');
  });
});
