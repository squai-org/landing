import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

/**
 * La tabla de la antigua lista de espera nunca tuvo registros y ya no la usa
 * ninguna ruta. Las migraciones 0001 y 0002 la crean y no se tocan (ya estan
 * aplicadas); una migracion nueva la elimina junto con su indice.
 */
describe('migraciones de D1', () => {
  it('dejan la base sin la tabla ni el indice de la lista de espera', async () => {
    const { results } = await env.DB.prepare(
      `SELECT type, name FROM sqlite_master WHERE name LIKE '%waitlist%'`
    ).all<{ type: string; name: string }>();

    expect(results).toEqual([]);
  });
});
