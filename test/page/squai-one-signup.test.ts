import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

const sectionOf = (html: string, id: string) => {
  const start = html.indexOf(`<section id="${id}"`);
  if (start === -1) throw new Error(`Sin <section id="${id}"> en el HTML`);
  return html.slice(start, html.indexOf('</section>', start));
};

describe('pagina de Squai One: inscripcion', () => {
  let signup: string;

  beforeAll(async () => {
    signup = sectionOf(await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8'), 'inscripcion');
  });

  it('la forma del fondo usa periwinkle-10 opaco', () => {
    const backdrop = /<div class="one-backdrop"[\s\S]*?<\/svg>/.exec(signup)?.[0] ?? '';
    const paths = backdrop.match(/<path[^>]*>/g) ?? [];

    expect(paths.length).toBeGreaterThan(0);
    for (const tag of paths) {
      expect(tag).toContain('fill="#777ae3"');
      expect(tag).not.toContain('#e1e4fd');
    }
  });
});
