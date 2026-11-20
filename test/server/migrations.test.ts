import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Las migraciones se prueban sobre datos que ya existen en produccion: se
 * aplica el esquema hasta la ultima migracion ya publicada, se siembran filas
 * con la forma de entonces y luego se aplican las nuevas.
 */
const LAST_PUBLISHED = '0004_enrollments.sql';

const db = () => env.MIGRATIONS_DB;

/** Deja la base vacia, incluida la tabla que registra migraciones aplicadas. */
const wipe = async () => {
  const { results } = await db()
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`
    )
    .all<{ name: string }>();

  // Con claves foraneas activas una tabla padre no se puede borrar antes que
  // sus hijas; se reintenta hasta que no quede ninguna.
  let pending = results.map((r) => r.name);
  while (pending.length) {
    const failed: string[] = [];
    for (const name of pending) {
      try {
        await db().exec(`DROP TABLE IF EXISTS "${name}"`);
      } catch {
        failed.push(name);
      }
    }
    if (failed.length === pending.length) throw new Error(`No se pudieron borrar: ${failed.join(', ')}`);
    pending = failed;
  }
};

const applyPublished = () =>
  applyD1Migrations(
    db(),
    env.TEST_MIGRATIONS.filter((m) => m.name <= LAST_PUBLISHED)
  );

const applyAll = () => applyD1Migrations(db(), env.TEST_MIGRATIONS);

beforeEach(async () => {
  await wipe();
  await applyPublished();
});

describe('0006_customers_orders', () => {
  it('une dos intentos del mismo correo en un cliente con dos ordenes', async () => {
    await db()
      .prepare(
        `INSERT INTO enrollments
          (id, order_id, plan_code, status, full_name, email, country_code, phone, phone_e164,
           referral_source, amount, currency, bold_transaction_id, payment_method,
           source_page, ip_country, user_agent, created_at, confirmed_at)
         VALUES
          (7, 'squai-one-aaa', 'squai-one', 'rejected', 'Ana R', 'Ana@X.co ', '+57', '3001112222', '+573001112222',
           'instagram', 399000, 'COP', 'TX-1', 'CREDIT_CARD',
           '/servicios/squai-one', 'CO', 'UA-1', '2026-10-01T10:00:00.000Z', '2026-10-01T10:05:00.000Z'),
          (9, 'squai-one-bbb', 'squai-one', 'approved', 'Ana Rios', 'ana@x.co', '+1', '2025550100', '+12025550100',
           'linkedin', 399000, 'COP', 'TX-2', 'PSE',
           '/servicios/squai-one', 'US', 'UA-2', '2026-10-02T10:00:00.000Z', '2026-10-02T10:07:00.000Z')`
      )
      .run();

    await applyAll();

    const { results: customers } = await db().prepare('SELECT * FROM customers').all<Record<string, unknown>>();
    expect(customers).toHaveLength(1);
    // Los datos de contacto son los del intento mas reciente.
    expect(customers[0]).toMatchObject({
      email: 'ana@x.co',
      full_name: 'Ana Rios',
      country_code: '+1',
      phone: '2025550100',
      phone_e164: '+12025550100',
    });

    const { results: orders } = await db()
      .prepare('SELECT * FROM orders ORDER BY id')
      .all<Record<string, unknown>>();
    expect(orders).toEqual([
      {
        id: 7,
        order_id: 'squai-one-aaa',
        customer_id: customers[0].id,
        program_code: 'squai-one',
        status: 'rejected',
        referral_source: 'instagram',
        amount: 399000,
        currency: 'COP',
        bold_transaction_id: 'TX-1',
        payment_method: 'CREDIT_CARD',
        source_page: '/servicios/squai-one',
        ip_country: 'CO',
        user_agent: 'UA-1',
        created_at: '2026-10-01T10:00:00.000Z',
        confirmed_at: '2026-10-01T10:05:00.000Z',
      },
      {
        id: 9,
        order_id: 'squai-one-bbb',
        customer_id: customers[0].id,
        program_code: 'squai-one',
        status: 'approved',
        referral_source: 'linkedin',
        amount: 399000,
        currency: 'COP',
        bold_transaction_id: 'TX-2',
        payment_method: 'PSE',
        source_page: '/servicios/squai-one',
        ip_country: 'US',
        user_agent: 'UA-2',
        created_at: '2026-10-02T10:00:00.000Z',
        confirmed_at: '2026-10-02T10:07:00.000Z',
      },
    ]);

    const legacy = await db()
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'enrollments'`)
      .first();
    expect(legacy).toBeNull();
  });

  it('no reutiliza ids de orden ya migrados', async () => {
    await db()
      .prepare(
        `INSERT INTO enrollments
          (id, order_id, plan_code, full_name, email, country_code, phone, phone_e164, amount, currency)
         VALUES (41, 'squai-one-ccc', 'squai-one', 'Ana Rios', 'ana@x.co', '+57', '3001112222', '+573001112222', 399000, 'COP')`
      )
      .run();

    await applyAll();

    const customer = await db().prepare('SELECT id FROM customers').first<{ id: number }>();
    const inserted = await db()
      .prepare(
        `INSERT INTO orders (order_id, customer_id, program_code, amount, currency)
         VALUES ('squai-one-ddd', ?, 'squai-one', 399000, 'COP') RETURNING id`
      )
      .bind(customer?.id)
      .first<{ id: number }>();
    expect(inserted?.id).toBeGreaterThan(41);
  });
});
