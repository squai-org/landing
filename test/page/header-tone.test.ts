import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');
const TONES = ['light', 'dark', 'brand'];

const htmlFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '_astro' ? [] : htmlFiles(full);
      return entry.name.endsWith('.html') ? [full] : [];
    })
  );
  return nested.flat();
};

const openTags = (html: string, tag: string) => html.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];
const toneOf = (tag: string) => /\sdata-header-tone="([^"]*)"/.exec(tag)?.[1];
const headerOf = (html: string) => {
  const start = html.indexOf('<header class="site-header');
  return html.slice(start, html.indexOf('</header>', start));
};

describe('tono del header por seccion en el HTML compilado', () => {
  let files: string[] = [];

  beforeAll(async () => {
    files = (await htmlFiles(dist)).filter((file) => !file.endsWith('404.html'));
  });

  it('cada seccion y el pie de cada pagina declaran light, dark o brand', async () => {
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const html = await readFile(file, 'utf8');
      const tags = [...openTags(html, 'section'), ...openTags(html, 'footer')];
      expect(tags.length, file).toBeGreaterThan(0);
      for (const tag of tags) expect(TONES, `${file} ${tag}`).toContain(toneOf(tag));
    }
  });

  it('las paginas sin secciones de portada declaran el tono en el main', async () => {
    for (const file of ['politica-de-privacidad.html', 'terminos-de-servicio.html', 'gracias.html', 'retomar.html']) {
      const html = await readFile(path.join(dist, file), 'utf8');
      expect(TONES, file).toContain(toneOf(openTags(html, 'main')[0]!));
    }
  });

  it('el header arranca con el tono de su pagina y el hero de Squai One es brand', async () => {
    const one = headerOf(await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8'));
    expect(/<header[^>]*data-tone="brand"/.test(one)).toBe(true);
    const home = headerOf(await readFile(path.join(dist, 'index.html'), 'utf8'));
    expect(/<header[^>]*data-tone="dark"/.test(home)).toBe(true);
  });

  it('el logo del header no lleva pildora', async () => {
    for (const file of ['index.html', 'servicios/squai-one.html', 'gracias.html']) {
      const header = headerOf(await readFile(path.join(dist, file), 'utf8'));
      expect(header).not.toContain('logo-pill');
      expect(header).toContain('header-logo');
    }
  });
});
