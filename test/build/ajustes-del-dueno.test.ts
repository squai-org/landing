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
