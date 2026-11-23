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

describe('pildoras del header a la misma altura', () => {
  const header = read('src/components/Header.astro');
  const css = styleOf(header);
  const logo = read('src/components/Logo.astro');

  it('los botones de redes del header son circulos de --pill-h', () => {
    const rule = /\.site-header-social :global\(\.social-button\) \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('width: var(--pill-h)');
    expect(rule).toContain('height: var(--pill-h)');
  });

  it('la pildora del logo mide --pill-h y el logo escala con ella', () => {
    const rule = /\.logo-pill \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('height: var(--pill-h)');
    expect(rule).toMatch(/--logo-size: calc\(var\(--pill-h\) \* [\d.]+\)/);
    expect(rule).not.toMatch(/padding: 8px 16px/);
    expect(logo).toContain('font-size:var(--logo-size, ${size}px)');
  });
});

describe('personajes de Presentacion', () => {
  const css = styleOf(read('src/components/VideoSection.astro'));

  it('miden lo mismo de alto: 1,4 veces la altura media que tenian (2,99 veces --peep-w)', () => {
    expect(css).toContain('--peep-h: calc(var(--peep-w) * 4.2);');
    const peep = /\.video-peep \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(peep).toContain('height: var(--peep-h)');
    expect(peep).toContain('width: auto');
  });

  it('cada personaje se mete un 40 % de su ancho sobre la tarjeta y el pie de la tarjeta le deja ese hueco', () => {
    expect(css).toContain('--peep-left-w: calc(var(--peep-h) * 256 / 687);');
    expect(css).toContain('--peep-right-w: calc(var(--peep-h) * 213 / 701);');
    expect(css).toContain('grid-template-columns: calc(var(--peep-left-w) * 0.6) minmax(0, 1fr) calc(var(--peep-right-w) * 0.6);');
    expect(css).toMatch(/\.video-peep--left \{[^}]*justify-self: end; margin-right: calc\(var\(--peep-left-w\) \* -0\.4\)/);
    expect(css).toMatch(/\.video-peep--right \{[^}]*justify-self: start; margin-left: calc\(var\(--peep-right-w\) \* -0\.4\)/);
    expect(css).toContain('calc(var(--u) * 12 + var(--peep-left-w) * 0.4)');
    expect(css).toContain('calc(var(--u) * 12 + var(--peep-right-w) * 0.4)');
  });
});
