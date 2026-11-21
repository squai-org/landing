import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('migraciones de D1', () => {
  it('dejan la base sin la tabla ni el indice de la lista de espera', async () => {
    const { results } = await env.DB.prepare(
      `SELECT type, name FROM sqlite_master WHERE name LIKE '%waitlist%'`
    ).all<{ type: string; name: string }>();

    expect(results).toEqual([]);
  });
});
