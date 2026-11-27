import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodeHtml, service } from './content';

const dist = path.join(import.meta.dirname, '../../dist');
const one = service('squai-one');
const { notForYou, needs } = one.beforeSignup!;

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

  it('muestra el titulo, el cuerpo y la nota manuscrita del contenido', () => {
    const section = sectionOf(page, 'requisitos');
    const title = /<h2\b[^>]*>([^<]*)<\/h2>/.exec(section)?.[1] ?? '';
    const hand = /class="[^"]*one-hand[^"]*"[^>]*>([^<]*)</.exec(section)?.[1] ?? '';

    expect(decodeHtml(title)).toBe(notForYou.title);
    expect(decodeHtml(section)).toContain(notForYou.body);
    expect(decodeHtml(hand)).toBe(notForYou.handwritten);
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

  it('Es para ti muestra su nota y ya no lleva el bloque de Requisitos', () => {
    const fit = sectionOf(page, 'para-quien');

    if (one.audienceFit?.handwritten) expect(decodeHtml(fit)).toContain(one.audienceFit.handwritten);
    expect(fit).not.toContain('one-needs');
  });
});

describe('Squai One: Requisitos, fila Lo que necesitas y Nota', () => {
  let page = '';
  let section = '';

  beforeAll(async () => {
    page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
    section = sectionOf(page, 'requisitos');
  });

  it('tiene exactamente dos h2 y no salta niveles', () => {
    const headings = [...section.matchAll(/<h([1-6])\b[^>]*>([^<]*)<\/h\1>/g)].map((m) => [m[1], decodeHtml(m[2] ?? '')]);

    expect(headings).toEqual([
      ['2', notForYou.title],
      ['2', needs.title],
    ]);
  });

  it('muestra un item por cada uno del contenido', () => {
    const items = [...section.matchAll(/<li\b[^>]*>([^<]*)<\/li>/g)].map((m) => decodeHtml(m[1] ?? ''));

    expect(items).toEqual(needs.items);
  });

  it('muestra la Nota del contenido con Nota: en negrita y sin fuente manuscrita', () => {
    const note = section.match(/<p\b[^>]*class="[^"]*one-needs-footnote[^"]*"[^>]*>[\s\S]*?<\/p>/)?.[0] ?? '';

    expect(note).toMatch(/<strong\b[^>]*>Nota:<\/strong>/);
    expect(decodeHtml(note)).toContain(needs.note);
    expect(note).not.toContain('one-hand');
  });

  it('la Nota va despues de las dos filas', () => {
    expect(section.indexOf('one-needs-footnote')).toBeGreaterThan(section.lastIndexOf('data-needs-row'));
  });

  it('muestra ChatGPT, Claude y Gemini con alt y no Grok', () => {
    const logos = section.match(/<[^>]*data-needs-logos[^>]*>/)?.[0] ?? '';

    expect(logos).toMatch(/role="img"/);
    expect(decodeHtml(/aria-label="([^"]*)"/.exec(logos)?.[1] ?? '')).toBe(needs.logosAlt);
    expect(section).toContain('claude-color');
    expect(section).toContain('gemini-color');
    expect(section).toMatch(/one-needs-chatgpt[\s\S]*?<span[^>]*>ChatGPT<\/span>/);
    expect(section.toLowerCase()).not.toContain('grok');
  });

  it('los logos son SVG sin comentarios ni scripts', async () => {
    const dir = path.join(import.meta.dirname, '../../public/illustrations/logos');
    for (const name of ['claude-color', 'claude-text', 'gemini-color', 'gemini-text', 'openai']) {
      const svg = await readFile(path.join(dir, `${name}.svg`), 'utf8');
      expect(svg).not.toMatch(/<!--|<script|<title|<metadata|style=/);
    }
  });
});

describe('Squai One: Requisitos, ganchos de revelado', () => {
  const source = readFileSync(path.join(import.meta.dirname, '../../src/components/OneRequirements.astro'), 'utf8');

  it('cada fila marca su lado de medios con data-needs-media y ya no hay data-needs-photo', () => {
    expect(source.match(/data-needs-media/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain('data-needs-photo');
  });

  it('.one-needs-shell se declara una sola vez', () => {
    expect(source.match(/\.one-needs-shell \{/g)).toHaveLength(1);
  });
});

describe('Squai One: Requisitos, ajustes de la Nota y los logos', () => {
  const source = readFileSync(path.join(import.meta.dirname, '../../src/components/OneRequirements.astro'), 'utf8');

  it('suma --edge-r al padding inferior para que Lo que vas a lograr no tape la Nota', () => {
    expect(/\.one-needs \{[^}]*padding: var\(--section-py\) var\(--gutter\) calc\(var\(--section-py\) \+ var\(--edge-r\)\);/.test(source)).toBe(true);
  });

  it('los logos van centrados en su columna', () => {
    expect(/\.one-needs-logos \{[^}]*align-items: center;/.test(source)).toBe(true);
  });

  it('los logos son mas grandes en escritorio', () => {
    expect(/\.one-needs-logo img \{[^}]*height: calc\(var\(--u\) \* 112\);/.test(source)).toBe(true);
    expect(/\.one-needs-logo \.one-needs-wordmark \{[^}]*height: calc\(var\(--u\) \* 72\);/.test(source)).toBe(true);
    expect(/\.one-needs-logo span \{[^}]*font-size: calc\(var\(--u\) \* 72\);/.test(source)).toBe(true);
  });
});

describe('Squai One: Requisitos, borde con Es para ti', () => {
  const source = readFileSync(path.join(import.meta.dirname, '../../src/components/OneRequirements.astro'), 'utf8');
  const rule = /\.one-needs \{[^}]*\}/.exec(source)?.[0] ?? '';

  it('sube --edge-r sobre Es para ti con esquinas redondeadas, por encima de ella', () => {
    expect(rule).toContain('margin-top: calc(var(--edge-r) * -1);');
    expect(rule).toContain('border-radius: var(--edge-r);');
    expect(rule).toContain('z-index: 15;');
  });
});
