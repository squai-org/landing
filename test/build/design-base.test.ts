import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.join(import.meta.dirname, '../..', file), 'utf8').replace(/\r\n/g, '\n');

const css = read('src/styles/global.css');

const tabletStart = css.indexOf('@media (min-width: 768px) {\n  :root {');
const desktopStart = css.indexOf('@media (min-width: 992px) {\n  :root {');
const desktopEnd = css.indexOf('\n}\n', desktopStart);

const base = css.slice(0, tabletStart);
const tablet = css.slice(tabletStart, desktopStart);
const desktop = css.slice(desktopStart, desktopEnd);

const missingFrom = (block: string, tokens: Record<string, string>) =>
  Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .filter((line) => !block.includes(line));

describe('tokens de landing-design en :root', () => {
  it('movil: faq, books, slider, etiquetas, marco y nota del hero', () => {
    expect(
      missingFrom(base, {
        '--fs-badge': 'calc(var(--u) * 18)',
        '--faq-r': 'calc(var(--u) * 16)',
        '--faq-py': 'calc(var(--u) * 23)',
        '--faq-px': 'calc(var(--u) * 20)',
        '--frame-r': 'calc(var(--u) * 40)',
        '--frame-b': 'calc(var(--u) * 8)',
        '--hero-note-x': 'calc(var(--u) * 229)',
        '--hero-note-y': 'calc(var(--u) * 114)',
        '--hero-note-w': 'calc(var(--u) * 137)',
        '--books-header-pt': 'calc(var(--u) * 72)',
        '--books-header-pb': 'calc(var(--u) * 24)',
        '--books-header-gap': 'calc(var(--u) * 12)',
        '--books-pb': 'calc(var(--u) * 40)',
        '--books-list-px': 'calc(var(--u) * 8)',
        '--books-list-py': 'calc(var(--u) * 40)',
        '--books-item-w': 'calc(var(--u) * 380)',
        '--books-item-px': 'calc(var(--u) * 12)',
        '--books-item-pad': 'calc(var(--u) * 28)',
        '--books-item-gap': 'calc(var(--u) * 20)',
        '--slider-btn': 'max(44px, calc(var(--u) * 56))',
        '--fs-label': 'calc(var(--u) * 30)',
        '--label-r': 'calc(var(--u) * 22)',
        '--label-px': 'calc(var(--u) * 12)',
        '--label-py': 'calc(var(--u) * 9)',
      })
    ).toEqual([]);
  });

  it('tableta (768): etiquetas, nota del hero, badge y carrusel', () => {
    expect(
      missingFrom(tablet, {
        '--fs-label': 'calc(var(--u) * 52)',
        '--hero-note-x': 'calc(var(--u) * 629)',
        '--hero-note-y': 'calc(var(--u) * 123)',
        '--hero-note-w': 'calc(var(--u) * 138)',
        '--label-r': 'calc(var(--u) * 40)',
        '--label-px': 'calc(var(--u) * 20)',
        '--label-py': 'calc(var(--u) * 12)',
        '--fs-badge': 'calc(var(--u) * 32)',
        '--books-item-w': 'calc(var(--u) * 401)',
        '--books-item-px': 'calc(var(--u) * 16)',
      })
    ).toEqual([]);
  });

  it('escritorio (992): faq, marco, nota, books, slider y etiquetas', () => {
    expect(
      missingFrom(desktop, {
        '--fs-badge': 'calc(var(--u) * 64)',
        '--faq-r': 'calc(var(--u) * 24)',
        '--faq-py': 'calc(var(--u) * 28.8)',
        '--faq-px': 'calc(var(--u) * 32)',
        '--frame-r': 'calc(var(--u) * 80)',
        '--frame-b': 'calc(var(--u) * 16)',
        '--hero-note-x': 'calc(var(--u) * 1693)',
        '--hero-note-y': 'calc(var(--u) * 518)',
        '--hero-note-w': 'calc(var(--u) * 153)',
        '--books-header-pt': 'calc(var(--u) * 220)',
        '--books-header-pb': 'calc(var(--u) * 80)',
        '--books-header-gap': 'calc(var(--u) * 32)',
        '--books-pb': 'calc(var(--u) * 125)',
        '--books-list-px': 'calc(var(--u) * 16)',
        '--books-list-py': 'calc(var(--u) * 56)',
        '--books-item-w': 'calc(var(--u) * 420)',
        '--books-item-px': 'calc(var(--u) * 24)',
        '--books-item-pad': 'calc(var(--u) * 32)',
        '--books-item-gap': 'calc(var(--u) * 20)',
        '--slider-btn': 'calc(var(--u) * 72)',
        '--fs-label': 'calc(var(--u) * 84)',
        '--label-r': 'calc(var(--u) * 70)',
        '--label-px': 'calc(var(--u) * 32)',
        '--label-py': 'calc(var(--u) * 22)',
      })
    ).toEqual([]);
  });
});

describe('base visual de landing-design', () => {
  it('html es blanco con texto Midnight', () => {
    const rule = /(?:^|\n)html \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('background-color: #FFFFFF;');
    expect(rule).toContain('color: #0A0C1A;');
  });

  it('body hereda el fondo blanco y el texto Midnight', () => {
    const rule = /(?:^|\n)body \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('background: var(--surface);');
    expect(rule).toContain('color: var(--midnight);');
  });

  it('el foco visible es un contorno de 2 px con desfase de 3 px y sin halo', () => {
    const rule = /\n:focus-visible \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('outline: 2px solid var(--focus-ink);');
    expect(rule).toContain('outline-offset: 3px;');
    expect(rule).not.toContain('box-shadow');
    expect(css).toContain('--focus-ink: var(--periwinkle-11);');
  });

  it('el foco se invierte a Midnight sobre el hero Periwinkle para no perder contraste', () => {
    expect(css).toMatch(/\.one-hero-band \{\s*--focus-ink: var\(--midnight\);\s*\}/);
  });
});

describe('colores del pie', () => {
  const footer = read('src/components/Footer.astro');

  it('el cuerpo es Midnight y la barra legal P12 en todas las paginas, sin color por servicio', () => {
    const css = read('src/styles/global.css');
    expect(css).toMatch(/:root \{[^}]*--footer-bg: var\(--midnight\);/);
    expect(css).toMatch(/:root \{[^}]*--footer-bar: var\(--periwinkle-12\);/);
    expect(css).toMatch(/--midnight: #0A0C1A;/);
    expect(css).toMatch(/--periwinkle-12: #303163;/);
    expect(/\.site-footer \{[^}]*background: var\(--footer-bg\);/.test(footer)).toBe(true);
    expect(/\.footer-bottom \{[^}]*background: var\(--footer-bar\);/.test(footer)).toBe(true);
    expect(footer).not.toMatch(/--accent-deep|--on-deep/);
    expect(css).not.toMatch(/\[data-service=[^\]]+\] \{[^}]*--footer-/);
  });
});

describe('solape del pie con la curva de la seccion anterior', () => {
  const footer = read('src/components/Footer.astro');
  const page = read('src/pages/servicios/[slug].astro');

  it('el pie solapado sube --edge-r y suma --edge-r al padding superior', () => {
    const rule = /\.site-footer--overlap \{([^}]*)\}/.exec(footer)?.[1] ?? '';
    expect(rule).toContain('margin-top: calc(var(--edge-r) * -1);');
    expect(rule).toContain('padding-top: calc(var(--edge-r) + var(--section-py));');
  });

  it('las paginas de servicio usan el pie solapado y el marco blanco', () => {
    expect(page).toMatch(/<Footer overlap/);
    expect(page).toMatch(/\.page-frame \{ background: var\(--surface\); \}/);
  });
});

describe('una sola definicion de los tokens de landing-design', () => {
  const owned = /^\s*--(faq-r|faq-py|faq-px|books-[a-z-]+|slider-btn|fs-label|label-r|label-px|label-py|fs-badge|frame-[a-z]+|hero-note-[a-z]+):/m;

  it('ningun componente ni hoja de estilos distinta de global.css los redefine', () => {
    const files = [
      ...readdirSync(path.join(import.meta.dirname, '../../src/components')).map((name) => `src/components/${name}`),
      'src/styles/one-sections.css',
      'src/styles/motion.css',
    ];
    const redefining = files.filter((file) => owned.test(read(file)));
    expect(redefining).toEqual([]);
  });
});

describe('etiquetas del hero en movil', () => {
  const hero = read('src/components/OneHero.astro');

  it('limitan su ancho para que el texto no salga por la izquierda de la pantalla', () => {
    expect(hero).toMatch(/@media \(max-width: 1023px\) \{[^@]*container-type: size/);
    expect(hero).toMatch(/\.one-hero-tag-note \{ max-width: min\(/);
    expect(hero).toMatch(/\.one-hero-tag-sticker \{ max-width: min\(/);
  });
});
