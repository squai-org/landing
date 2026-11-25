import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

const sectionOf = (html: string) => {
  const start = html.indexOf('id="inscripcion"');
  return html.slice(start, html.indexOf('</section>', start));
};

const focusableTags = (fragment: string) => fragment.match(/<(?:input|button|a|select)\b[^>]*>/g) ?? [];

describe('orden de la seccion de compra en Squai One', () => {
  let section = '';

  beforeAll(async () => {
    section = sectionOf(await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8'));
  });

  it('el DOM sigue el orden visual en movil: titulo, cupos, precio, formulario, incluye y fechas', () => {
    const marks = [
      'id="one-signup-title"',
      'checkout-seats',
      'data-currency-picker',
      'data-bold-price',
      'id="checkout-form"',
      'checkout-includes',
      'checkout-dates',
    ].map((mark) => section.indexOf(mark));

    expect(marks.every((index) => index >= 0)).toBe(true);
    expect([...marks].sort((a, b) => a - b)).toEqual(marks);
  });

  it('el recorrido de teclado pasa por el formulario antes que por los enlaces de lo que incluye', () => {
    const form = section.indexOf('id="checkout-form"');
    const includes = section.indexOf('checkout-includes');
    const interactiveAfterIncludes = focusableTags(section.slice(includes));

    expect(form).toBeLessThan(includes);
    expect(interactiveAfterIncludes).toEqual([]);
  });
});
