import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Squai One tiene inscripciones abiertas: el sitio ya no habla de una lista de
 * espera ni de preinscribirse. Se revisa codigo, contenido, CMS y documentacion.
 * Quedan fuera las migraciones (0001, 0002 y la que borra la tabla tienen que
 * nombrarla) y estas pruebas.
 */
const root = path.join(import.meta.dirname, '../..');
const scanned = ['src', 'public', 'docs', 'README.md', 'GLOSSARY.md', 'AGENTS.md', '.pages.yml', 'astro.config.mjs'];
const forbidden = [/waitlist/i, /lista de espera/i, /preinscri/i, /#lista\b/, /["']lista["']/];

const filesUnder = async (entry: string): Promise<string[]> => {
  const absolute = path.join(root, entry);
  const children = await readdir(absolute, { withFileTypes: true }).catch(() => null);
  if (!children) return [entry];
  const nested = await Promise.all(children.map((child) => filesUnder(`${entry}/${child.name}`)));
  return nested.flat();
};

const isText = (file: string) => /\.(astro|ts|mjs|js|json|md|ya?ml|txt|html|css|svg|xml)$|_headers$/.test(file);

describe('programa abierto', () => {
  it('no deja referencias a la lista de espera', async () => {
    const files = (await Promise.all(scanned.map(filesUnder))).flat().filter(isText);
    const hits: string[] = [];

    for (const file of files) {
      const lines = (await readFile(path.join(root, file), 'utf8')).split('\n');
      lines.forEach((line, index) => {
        if (forbidden.some((pattern) => pattern.test(line))) hits.push(`${file}:${index + 1}`);
      });
    }

    expect(files.length).toBeGreaterThan(20);
    expect(hits).toEqual([]);
  });
});
