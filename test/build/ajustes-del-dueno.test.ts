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

describe('fondo del formulario de inscripcion', () => {
  it('la forma usa #e1e4fd opaco', () => {
    expect(read('src/components/Checkout.astro')).toContain(`<OneBackdrop shape="signup" colors={['#e1e4fd']} opacities={[1]}`);
  });
});

describe('boton Pausar animaciones', () => {
  const css = read('src/styles/motion.css');
  const rule = /\n\.motion-toggle \{([^}]*)\}/.exec(css)?.[1] ?? '';

  it('no tiene borde ni contorno en reposo y se separa del fondo con la misma sombra que volver arriba', () => {
    expect(rule).toContain('border: 0;');
    expect(rule).not.toMatch(/border: \d+px|outline:/);
    expect(rule).toContain('box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);');
  });

  it('conserva el foco visible por teclado', () => {
    expect(css).not.toMatch(/\.motion-toggle:focus(-visible)? \{[^}]*outline: (none|0)/);
    expect(read('src/styles/global.css')).toMatch(/:focus-visible \{[^}]*outline: 2px solid/);
  });
});

describe('union entre Mentores y Testimonios', () => {
  const quotes = styleOf(read('src/components/OneTestimonials.astro'));
  const team = styleOf(read('src/components/OneTeam.astro'));

  it('Testimonios sube --edge-r sobre Mentores a cualquier ancho', () => {
    expect(/\.one-quotes \{[^}]*margin-top: calc\(var\(--edge-r\) \* -1\);/.test(quotes)).toBe(true);
    expect(quotes).not.toMatch(/margin-top: -\d/);
  });

  it('Mentores suma --edge-r a su padding inferior para quedar detras de las esquinas', () => {
    expect(/\.one-team \{[^}]*padding: var\(--section-py\) var\(--gutter\) calc\(var\(--section-py\) \+ var\(--edge-r\)\);/.test(team)).toBe(true);
  });
});

describe('Testimonios', () => {
  const source = read('src/components/OneTestimonials.astro');
  const css = styleOf(source);
  const doc = read('docs/diseno/tokens-y-contraste.md');

  it('la seccion es Periwinkle 5 (#c3c9fc) y el lead pasa a Neutral 12 para cumplir AA sobre ella', () => {
    expect(read('src/styles/global.css')).toContain('--periwinkle-5: #c3c9fc;');
    expect(/\.one-quotes \{[^}]*background: var\(--periwinkle-5\);/.test(css)).toBe(true);
    expect(/\.one-quotes-lead \{[^}]*color: var\(--neutral-12\);/.test(css)).toBe(true);
  });

  it('las tarjetas son blanca, crema Gold 3 y Periwinkle 2, con su contraste documentado', () => {
    expect(source).toContain("bg: 'var(--surface)'");
    expect(source).toContain("bg: 'var(--gold-3)'");
    expect(source).toContain("bg: 'var(--periwinkle-2)'");
    for (const card of ['--surface', '--gold-3', '--periwinkle-2']) {
      expect(doc).toContain(`| base | Testimonios: cita y nombre en tarjeta | \`--midnight\` | \`${card}\` |`);
      expect(doc).toContain(`| base | Testimonios: contexto en tarjeta | \`--neutral-11\` | \`${card}\` |`);
    }
  });

  it('los bloques de esquina entran al pasar sobre la tarjeta con la misma regla que Sesiones y Datos clave', () => {
    expect(source).toMatch(/<li class="one-quote-item one-card-host"/);
    expect(source).toMatch(/<OneCornerBlocks preset=\{style\.preset\} color=\{style\.block\} hoverOnly \/>/);
    expect(css).not.toMatch(/one-corner-blocks|@keyframes/);
  });
});
