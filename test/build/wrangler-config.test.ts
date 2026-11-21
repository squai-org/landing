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

  it('declara el Cron Trigger que reintenta las confirmaciones cada 5 minutos', async () => {
    const config = await readJsonc('wrangler.jsonc');

    expect(config.triggers).toEqual({ crons: ['*/5 * * * *'] });
  });

  it('las previews usan una base de pruebas distinta de la de produccion', async () => {
    const config = await readJsonc('wrangler.jsonc');
    const production = (config.d1_databases as { database_id: string }[])[0];
    const preview = (config.previews as { d1_databases: { binding: string; database_id: string; database_name: string }[] }).d1_databases[0];

    expect(preview?.binding).toBe('DB');
    expect(preview?.database_name).toBe('squai-test');
    expect(preview?.database_id).not.toBe(production?.database_id);
  });

  it('wrangler.test.jsonc migra la misma base de pruebas que usan las previews', async () => {
    const config = await readJsonc('wrangler.jsonc');
    const test = await readJsonc('wrangler.test.jsonc');
    const preview = (config.previews as { d1_databases: unknown[] }).d1_databases;

    expect(test.d1_databases).toEqual(preview);
  });
});
