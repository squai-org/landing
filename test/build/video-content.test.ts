import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceSchema } from '../../src/content/schema';

const root = path.join(import.meta.dirname, '../..');

const loadOne = async () =>
  JSON.parse(await readFile(path.join(root, 'src/content/services/squai-one.json'), 'utf8')) as Record<string, unknown>;

const videoCopy = {
  title: 'Titulo',
  playLabel: 'Reproducir',
  iframeTitle: 'Video de presentacion',
  caption: 'Pie',
  posterAlt: 'Ilustracion',
};

const withVideo = async (video: Record<string, unknown>) => serviceSchema.safeParse({ ...(await loadOne()), video });

describe('campo del video de presentacion', () => {
  it('el contenido publicado deja la URL vacia y el esquema lo acepta', async () => {
    const parsed = serviceSchema.parse(await loadOne());

    expect(parsed.video).toBeDefined();
    expect(parsed.video?.url).toBeUndefined();
  });

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ])('acepta %s', async (url) => {
    expect((await withVideo({ ...videoCopy, url })).success).toBe(true);
  });

  it('acepta la URL vacia', async () => {
    expect((await withVideo({ ...videoCopy, url: '' })).success).toBe(true);
  });

  it.each(['https://vimeo.com/123', 'https://www.youtube.com/watch?v=corto', 'dQw4w9WgXcQ'])('rechaza %s', async (url) => {
    expect((await withVideo({ ...videoCopy, url })).success).toBe(false);
  });

  it('el formulario del CMS edita los mismos campos', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const node = pages.slice(pages.indexOf('- name: one-video'));
    const end = node.indexOf('\n      - name:', 10);
    const form = end === -1 ? node : node.slice(0, end);

    for (const field of ['url', ...Object.keys(videoCopy)]) expect(form).toContain(`- name: ${field}`);
  });
});
