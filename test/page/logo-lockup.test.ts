import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

describe('lockup del logo en el HTML generado', () => {
  let compact = '';

  beforeAll(async () => {
    const html = await readFile(path.join(dist, 'index.html'), 'utf8');
    compact = html.replace(/\s+/g, '');
  });

  it('separa isotipo y wordmark 0,15 H con H = 1cap', () => {
    expect(/gap:calc\(var\(--logo-cap\)\*0?\.15\)/.test(compact)).toBe(true);
    expect(compact.includes('--logo-cap:1cap')).toBe(true);
  });

  it('aplica el tracking del wordmark de -0,055em', () => {
    expect(/\.logo\[[^\]]+\]\{[^}]*letter-spacing:-0?\.055em/.test(compact)).toBe(true);
  });

  it('recorta el viewBox al isotipo para que H sea su altura visible', () => {
    expect(compact.includes('viewBox="293.7299420.9426.2"')).toBe(true);
  });

  it('declara los colores exactos de la marca', () => {
    expect(compact.toLowerCase().includes('#8a8ef9')).toBe(true);
    expect(compact.toLowerCase().includes('#f9c24d')).toBe(true);
  });
});
