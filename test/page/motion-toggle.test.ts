import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');
const page = (file: string) => readFile(path.join(dist, file), 'utf8');
const toggleTag = (html: string) => /<button[^>]*data-motion-toggle[^>]*>/.exec(html)?.[0] ?? '';

describe('boton de pausa en el HTML construido', () => {
  it.each(['index.html', 'servicios/squai-one.html', 'servicios/squai-grow.html', 'servicios/squai-learn.html'])(
    '%s trae el nombre accesible Pausar animaciones',
    async (file) => {
      const tag = toggleTag(await page(file));
      expect(tag).toMatch(/aria-label="Pausar animaciones"/);
      expect(tag).toMatch(/data-resume-label="Reanudar animaciones"/);
    },
  );
});
