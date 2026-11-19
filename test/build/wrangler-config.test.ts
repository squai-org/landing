import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Workers Builds ejecuta `npx wrangler preview` en las ramas que no son la de
 * produccion, y ese comando se niega a correr si wrangler.jsonc no tiene un
 * bloque `previews` (puede estar vacio):
 *
 *   [ERROR] Your Wrangler configuration is missing a `previews` block
 *
 * Eso rompe el despliegue de cada rama aunque los tests y el build pasen, asi
 * que se protege aqui, donde el gate (`pnpm verify`) lo ve antes de empujar.
 * https://developers.cloudflare.com/workers/previews/configuration/
 */
const readJsonc = async (file: string) => {
  const source = await readFile(path.join(import.meta.dirname, '../..', file), 'utf8');
  // wrangler.jsonc admite comentarios y comas finales: se quitan para JSON.parse.
  const json = source
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(json) as Record<string, unknown>;
};

describe('wrangler.jsonc', () => {
  it('declara el bloque previews que exige `wrangler preview`', async () => {
    const config = await readJsonc('wrangler.jsonc');

    expect(config.previews).toBeTypeOf('object');
    expect(config.previews).not.toBeNull();
  });

  it('mantiene el nombre del Worker que Workers Builds espera', async () => {
    const config = await readJsonc('wrangler.jsonc');

    expect(config.name).toBe('landing-page');
  });
});
