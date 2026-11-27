import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeHtml, site } from './content';

const dist = path.join(import.meta.dirname, '../../dist');
const page = (file: string) => readFile(path.join(dist, file), 'utf8');
const toggleTag = (html: string) => /<button[^>]*data-motion-toggle[^>]*>/.exec(html)?.[0] ?? '';
const attr = (tag: string, name: string) => decodeHtml(new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? '');

describe('boton de pausa en el HTML construido', () => {
  it.each(['index.html', 'servicios/squai-one.html', 'servicios/squai-grow.html', 'servicios/squai-learn.html'])(
    '%s trae los nombres accesibles de pausa y reanudar del contenido',
    async (file) => {
      const tag = toggleTag(await page(file));
      expect(attr(tag, 'aria-label')).toBe(site.ui.motion.pause);
      expect(attr(tag, 'data-resume-label')).toBe(site.ui.motion.resume);
    },
  );
});
