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
        // 0007: las ordenes historicas no declaran impuesto.
        tax: null,
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
        tax: null,
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

describe('0007_programs_prices', () => {
  const COHORT_SWITCH = '2027-01-01T05:00:00.000Z';

  it('pasa el plan a programa y conserva su precio como historico', async () => {
    await db()
      .prepare(`UPDATE payment_plans SET updated_at = '2026-10-05 14:30:00' WHERE code = 'squai-one'`)
      .run();

    await applyAll();

    const program = await db().prepare('SELECT code, description FROM programs').all();
    expect(program.results).toEqual([
      { code: 'squai-one', description: 'Fundamentos de Inteligencia Artificial Generativa' },
    ]);

    const { results: prices } = await db()
      .prepare(
        `SELECT program_code, currency, amount, valid_from FROM program_prices
         ORDER BY currency, valid_from`
      )
      .all<{ program_code: string; currency: string; amount: number; valid_from: string }>();

    // 399.000 COP es historia; 440.000 / 147 rigen desde la migracion; el
    // 1 de enero de 2027 a las 00:00 de Colombia (05:00 UTC) suben solos.
    expect(prices.map(({ currency, amount }) => [currency, amount])).toEqual([
      ['COP', 399000],
      ['COP', 440000],
      ['COP', 550000],
      ['USD', 147],
      ['USD', 185],
    ]);
    expect(prices[0]?.valid_from).toBe('2026-10-05T14:30:00.000Z');
    expect(prices[2]?.valid_from).toBe(COHORT_SWITCH);
    expect(prices[4]?.valid_from).toBe(COHORT_SWITCH);
    expect(prices[1]!.valid_from > prices[0]!.valid_from).toBe(true);
    expect(prices[1]!.valid_from < COHORT_SWITCH).toBe(true);
    expect(prices[3]!.valid_from).toBe(prices[1]!.valid_from);

    const legacy = await db()
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payment_plans'`)
      .first();
    expect(legacy).toBeNull();
  });

  it('deja el historico antes del precio nuevo aunque el plan se haya tocado en el mismo segundo', async () => {
    await db().prepare(`UPDATE payment_plans SET updated_at = datetime('now') WHERE code = 'squai-one'`).run();

    await applyAll();

    const { results } = await db()
      .prepare(`SELECT amount, valid_from FROM program_prices WHERE currency = 'COP' ORDER BY valid_from`)
      .all<{ amount: number }>();
    expect(results.map((r) => r.amount)).toEqual([399000, 440000, 550000]);
  });

  it('exige montos enteros con minimo de 1000 en COP y mayor que 0 en USD', async () => {
    await applyAll();

    const insert = (currency: string, amount: number) =>
      db()
        .prepare(
          `INSERT INTO program_prices (program_code, currency, amount, valid_from)
           VALUES ('squai-one', ?, ?, '2030-01-01T05:00:00.000Z')`
        )
        .bind(currency, amount)
        .run();

    await expect(insert('COP', 999)).rejects.toThrow();
    await expect(insert('USD', 0)).rejects.toThrow();
    await expect(insert('USD', 12.5)).rejects.toThrow();
    await expect(insert('EUR', 100)).rejects.toThrow();
    await expect(insert('COP', 1000)).resolves.toBeDefined();
    await expect(insert('USD', 1)).resolves.toBeDefined();
  });

  it('no acepta precios de un programa que no existe', async () => {
    await applyAll();

    await expect(
      db()
        .prepare(
          `INSERT INTO program_prices (program_code, currency, amount, valid_from)
           VALUES ('no-existe', 'COP', 1000, '2030-01-01T05:00:00.000Z')`
        )
        .run()
    ).rejects.toThrow();
  });

  it('agrega a la orden el impuesto, vacio en las ordenes historicas', async () => {
    await db()
      .prepare(
        `INSERT INTO enrollments
          (id, order_id, plan_code, full_name, email, country_code, phone, phone_e164, amount, currency)
         VALUES (3, 'squai-one-eee', 'squai-one', 'Ana Rios', 'ana@x.co', '+57', '3001112222', '+573001112222', 399000, 'COP')`
      )
      .run();

    await applyAll();

    const order = await db().prepare(`SELECT amount, currency, tax FROM orders WHERE id = 3`).first();
    expect(order).toEqual({ amount: 399000, currency: 'COP', tax: null });
  });
});

describe('0008_program_limits', () => {
  it('siembra las ventas de Squai One del 1 dic 2026 al 22 ene 2027 (hora de Colombia) con 30 cupos', async () => {
    await applyAll();

    const limits = await db().prepare('SELECT * FROM program_limits').all();
    // Las 00:00 de Colombia son las 05:00 UTC; el cierre es exclusivo, asi que
    // el 22 de enero se vende completo.
    expect(limits.results).toEqual([
      {
        program_code: 'squai-one',
        opens_at: '2026-12-01T05:00:00.000Z',
        closes_at: '2027-01-23T05:00:00.000Z',
        capacity: 30,
      },
    ]);
  });

  it('deja el programa sin cierre manual y solo acepta 0 o 1', async () => {
    await applyAll();

    const program = await db().prepare(`SELECT closed_manually FROM programs WHERE code = 'squai-one'`).first();
    expect(program).toEqual({ closed_manually: 0 });

    await expect(
      db().prepare(`UPDATE programs SET closed_manually = 2 WHERE code = 'squai-one'`).run()
    ).rejects.toThrow();
    await expect(
      db().prepare(`UPDATE programs SET closed_manually = 1 WHERE code = 'squai-one'`).run()
    ).resolves.toBeDefined();
  });

  it('exige un programa existente, un cupo positivo y un cierre posterior a la apertura', async () => {
    await applyAll();
    await db().prepare(`INSERT INTO programs (code, description) VALUES ('otro', 'Otro programa')`).run();

    const insert = (code: string, opensAt: string, closesAt: string, capacity: number) =>
      db()
        .prepare(`INSERT INTO program_limits (program_code, opens_at, closes_at, capacity) VALUES (?, ?, ?, ?)`)
        .bind(code, opensAt, closesAt, capacity)
        .run();

    await expect(insert('no-existe', '2030-01-01T05:00:00.000Z', '2030-02-01T05:00:00.000Z', 10)).rejects.toThrow();
    await expect(insert('otro', '2030-01-01T05:00:00.000Z', '2030-02-01T05:00:00.000Z', 0)).rejects.toThrow();
    await expect(insert('otro', '2030-02-01T05:00:00.000Z', '2030-01-01T05:00:00.000Z', 10)).rejects.toThrow();
    await expect(insert('otro', '2030-01-01T05:00:00.000Z', '2030-02-01T05:00:00.000Z', 10)).resolves.toBeDefined();
  });
});
