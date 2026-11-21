import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { siteSchema } from '../../src/content/schema';

const root = path.join(import.meta.dirname, '../..');

const loadProgramsSection = async () => {
  const source = await readFile(path.join(root, 'src/content/copies.json'), 'utf8');
  const site = siteSchema.parse((JSON.parse(source) as { site: unknown }).site);
  return site.legal.terms.sections.find((section) => /Programas de Squai One/.test(section.title));
};

const textOf = (section: NonNullable<Awaited<ReturnType<typeof loadProgramsSection>>>) =>
  section.blocks
    .flatMap((block) => (block.type === 'paragraph' ? [block.content] : block.items))
    .flat()
    .map((part) => part.text)
    .join('\n');

describe('terminos: programas de Squai One', () => {
  it('existe como seccion de la pagina de terminos', async () => {
    const section = await loadProgramsSection();

    expect(section).toBeDefined();
    expect(section!.blocks.length).toBeGreaterThan(1);
  });

  it('no repite precios, fechas ni cupo', async () => {
    const text = textOf((await loadProgramsSection())!);

    expect(text).not.toMatch(/\$\s?\d|\b(COP|USD)\b/);
    expect(text).not.toMatch(/\b20\d{2}\b/);
    expect(text).not.toMatch(
      /\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i,
    );
    expect(text).not.toMatch(/\b\d+\s+(cupos|personas|participantes|sesiones|semanas)\b/i);
  });

  it('remite a lo publicado en la pagina del programa', async () => {
    const text = textOf((await loadProgramsSection())!);

    expect(text).toMatch(/página del programa/);
  });

  it('el Precio se fija al enviar el formulario', async () => {
    const text = textOf((await loadProgramsSection())!);

    expect(text).toMatch(/Precio vigente en el momento en que envías el formulario/);
    expect(text).not.toMatch(/fecha del pago/i);
  });
});
