import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');
const styleOf = (source: string) => [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n');

describe('sesiones del temario', () => {
  const syllabus = read('src/components/Syllabus.astro');

  it('no muestra un CTA de inscripcion propio debajo del carrusel', () => {
    expect(syllabus).not.toContain('syllabus-cta');
    expect(syllabus).not.toMatch(/<Button variant="primary"/);
  });
});

describe('flechas del carrusel de sesiones', () => {
  const syllabus = read('src/components/Syllabus.astro');
  const css = styleOf(syllabus);
  const arrowsRule = /\.syllabus-arrows \{([^}]*)\}/.exec(css)?.[1] ?? '';

  it('van superpuestas al carrusel, sin ocupar una fila propia que lo empuje hacia abajo', () => {
    expect(arrowsRule).toContain('position: absolute');
    expect(syllabus).toMatch(/<div class="syllabus-carousel">\s*<div class="syllabus-arrows">/);
    expect(/\.syllabus-carousel \{[^}]*position: relative/.test(css)).toBe(true);
  });

  it('el carrusel sube sobre el margen inferior de la cabecera para no dejar hueco bajo el lead', () => {
    expect(/\.syllabus-carousel \{[^}]*margin-top: calc\(var\(--books-header-pb\) \* -1\)/.test(css)).toBe(true);
  });

  it('desde 992px se alinean arriba a la derecha, a la altura del final del lead', () => {
    const desktop = css.slice(css.indexOf('@media (min-width: 992px)'));
    expect(desktop).toMatch(/\.syllabus-arrows \{[^}]*top: 0;/);
  });
});
