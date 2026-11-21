import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROGRAM = 'programa-seguimiento';
const OTHER_PROGRAM = 'programa-seguimiento-dos';
const PROGRAMS = [PROGRAM, OTHER_PROGRAM];

const CUSTOMERS = {
  ana: 'ana@seguimiento.co',
  bruno: 'bruno@seguimiento.co',
  carla: 'carla@seguimiento.co',
  diego: 'diego@seguimiento.co',
  elena: 'elena@seguimiento.co',
};

const ids: Record<keyof typeof CUSTOMERS, number> = { ana: 0, bruno: 0, carla: 0, diego: 0, elena: 0 };

beforeAll(async () => {
  await env.DB.batch(
    PROGRAMS.map((code) =>
      env.DB.prepare(
        `INSERT INTO programs (code, description) VALUES (?, 'Programa de seguimiento') ON CONFLICT (code) DO NOTHING`
      ).bind(code)
    )
  );

  for (const [key, email] of Object.entries(CUSTOMERS) as [keyof typeof CUSTOMERS, string][]) {
    const row = await env.DB.prepare(
      `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
       VALUES (?, ?, '+57', '3205551234', '+573205551234')
       ON CONFLICT (email) DO UPDATE SET full_name = excluded.full_name
       RETURNING id`
    )
      .bind(email, key)
      .first<{ id: number }>();
    ids[key] = row!.id;
  }
});

beforeEach(async () => {
  await env.DB.prepare(`DELETE FROM orders WHERE program_code IN (?, ?)`).bind(...PROGRAMS).run();
  await env.DB.prepare(`DELETE FROM program_limits WHERE program_code IN (?, ?)`).bind(...PROGRAMS).run();
  await env.DB.prepare(`UPDATE programs SET closed_manually = 0 WHERE code IN (?, ?)`).bind(...PROGRAMS).run();
});

type Seed = {
  customer: keyof typeof CUSTOMERS;
  program?: string;
  status: string;
  createdAt: string;
  confirmedAt?: string;
};

const seedOrders = async (orders: Seed[]) => {
  await env.DB.batch(
    orders.map((o) =>
      env.DB.prepare(
        `INSERT INTO orders (order_id, customer_id, program_code, status, amount, currency, created_at, confirmed_at)
         VALUES (?, ?, ?, ?, 440000, 'COP', ?, ?)`
      ).bind(
        `SEG-${crypto.randomUUID()}`,
        ids[o.customer],
        o.program ?? PROGRAM,
        o.status,
        o.createdAt,
        o.confirmedAt ?? null
      )
    )
  );
};

const fromView = async <T>(view: string, orderBy: string) =>
  (
    await env.DB.prepare(`SELECT * FROM ${view} WHERE program_code IN (?, ?) ORDER BY ${orderBy}`)
      .bind(...PROGRAMS)
      .all<T>()
  ).results;

describe('v_customers_without_enrollment', () => {
  it('lista una vez por programa a cada cliente con ordenes y sin orden aprobada, con su ultimo intento', async () => {
    await seedOrders([
      { customer: 'ana', status: 'pending', createdAt: '2026-12-02T10:00:00.000Z' },
      { customer: 'ana', status: 'rejected', createdAt: '2026-12-03T10:00:00.000Z' },
      { customer: 'bruno', status: 'failed', createdAt: '2026-12-02T11:00:00.000Z' },
      { customer: 'bruno', status: 'approved', createdAt: '2026-12-02T12:00:00.000Z' },
      { customer: 'carla', status: 'approved', createdAt: '2026-12-04T09:00:00.000Z' },
      { customer: 'carla', program: OTHER_PROGRAM, status: 'pending', createdAt: '2026-12-05T09:00:00.000Z' },
      { customer: 'diego', status: 'voided', createdAt: '2026-12-06T09:00:00.000Z' },
    ]);

    const rows = await fromView<Record<string, unknown>>(
      'v_customers_without_enrollment',
      'program_code, email'
    );

    expect(rows).toEqual([
      {
        customer_id: ids.ana,
        email: CUSTOMERS.ana,
        full_name: 'ana',
        phone_e164: '+573205551234',
        program_code: PROGRAM,
        attempts: 2,
        last_status: 'rejected',
        last_attempt_at: '2026-12-03T10:00:00.000Z',
      },
      {
        customer_id: ids.diego,
        email: CUSTOMERS.diego,
        full_name: 'diego',
        phone_e164: '+573205551234',
        program_code: PROGRAM,
        attempts: 1,
        last_status: 'voided',
        last_attempt_at: '2026-12-06T09:00:00.000Z',
      },
      {
        customer_id: ids.carla,
        email: CUSTOMERS.carla,
        full_name: 'carla',
        phone_e164: '+573205551234',
        program_code: OTHER_PROGRAM,
        attempts: 1,
        last_status: 'pending',
        last_attempt_at: '2026-12-05T09:00:00.000Z',
      },
    ]);
  });
});

describe('v_enrollments_by_program', () => {
  it('lista una vez por programa a cada cliente con una orden aprobada, con su primera aprobacion', async () => {
    await seedOrders([
      { customer: 'ana', status: 'failed', createdAt: '2026-12-02T10:00:00.000Z', confirmedAt: '2026-12-02T10:05:00.000Z' },
      { customer: 'ana', status: 'approved', createdAt: '2026-12-02T11:00:00.000Z', confirmedAt: '2026-12-02T11:03:00.000Z' },
      { customer: 'bruno', status: 'approved', createdAt: '2026-12-03T09:00:00.000Z', confirmedAt: '2026-12-03T09:02:00.000Z' },
      { customer: 'bruno', status: 'approved', createdAt: '2026-12-03T10:00:00.000Z', confirmedAt: '2026-12-03T10:02:00.000Z' },
      { customer: 'carla', program: OTHER_PROGRAM, status: 'approved', createdAt: '2026-12-04T09:00:00.000Z', confirmedAt: '2026-12-04T09:01:00.000Z' },
      { customer: 'diego', status: 'voided', createdAt: '2026-12-05T09:00:00.000Z', confirmedAt: '2026-12-05T12:00:00.000Z' },
      { customer: 'elena', status: 'pending', createdAt: '2026-12-06T09:00:00.000Z' },
    ]);

    const rows = await fromView<Record<string, unknown>>('v_enrollments_by_program', 'program_code, email');

    expect(rows.map(({ order_id, ...rest }) => ({ ...rest, has_order_id: typeof order_id === 'string' }))).toEqual([
      {
        program_code: PROGRAM,
        customer_id: ids.ana,
        email: CUSTOMERS.ana,
        full_name: 'ana',
        phone_e164: '+573205551234',
        enrolled_at: '2026-12-02T11:03:00.000Z',
        has_order_id: true,
      },
      {
        program_code: PROGRAM,
        customer_id: ids.bruno,
        email: CUSTOMERS.bruno,
        full_name: 'bruno',
        phone_e164: '+573205551234',
        enrolled_at: '2026-12-03T09:02:00.000Z',
        has_order_id: true,
      },
      {
        program_code: OTHER_PROGRAM,
        customer_id: ids.carla,
        email: CUSTOMERS.carla,
        full_name: 'carla',
        phone_e164: '+573205551234',
        enrolled_at: '2026-12-04T09:01:00.000Z',
        has_order_id: true,
      },
    ]);
  });

  it('da el numero de inscritos por programa con un GROUP BY', async () => {
    await seedOrders([
      { customer: 'ana', status: 'approved', createdAt: '2026-12-02T11:00:00.000Z' },
      { customer: 'bruno', status: 'approved', createdAt: '2026-12-03T09:00:00.000Z' },
      { customer: 'bruno', status: 'approved', createdAt: '2026-12-03T10:00:00.000Z' },
      { customer: 'carla', program: OTHER_PROGRAM, status: 'approved', createdAt: '2026-12-04T09:00:00.000Z' },
    ]);

    const { results } = await env.DB.prepare(
      `SELECT program_code, count(*) AS enrolled FROM v_enrollments_by_program
       WHERE program_code IN (?, ?) GROUP BY program_code ORDER BY program_code`
    )
      .bind(...PROGRAMS)
      .all();

    expect(results).toEqual([
      { program_code: PROGRAM, enrolled: 2 },
      { program_code: OTHER_PROGRAM, enrolled: 1 },
    ]);
  });
});

describe('v_program_seats', () => {
  const setLimits = (capacity: number) =>
    env.DB.prepare(
      `INSERT INTO program_limits (program_code, opens_at, closes_at, capacity)
       VALUES (?, '2026-12-01T05:00:00.000Z', '2027-01-23T05:00:00.000Z', ?)`
    )
      .bind(PROGRAM, capacity)
      .run();

  it('resta del cupo solo las ordenes aprobadas, como el estado del programa', async () => {
    await setLimits(5);
    await seedOrders([
      { customer: 'ana', status: 'approved', createdAt: '2026-12-02T11:00:00.000Z' },
      { customer: 'bruno', status: 'approved', createdAt: '2026-12-03T09:00:00.000Z' },
      { customer: 'carla', status: 'approved', createdAt: '2026-12-03T10:00:00.000Z' },
      { customer: 'diego', status: 'voided', createdAt: '2026-12-04T09:00:00.000Z' },
      { customer: 'elena', status: 'pending', createdAt: '2026-12-05T09:00:00.000Z' },
      { customer: 'elena', status: 'rejected', createdAt: '2026-12-05T10:00:00.000Z' },
      { customer: 'elena', program: OTHER_PROGRAM, status: 'approved', createdAt: '2026-12-06T09:00:00.000Z' },
    ]);

    const [seats] = await fromView<Record<string, unknown>>('v_program_seats', 'program_code');

    expect(seats).toEqual({
      program_code: PROGRAM,
      capacity: 5,
      approved_orders: 3,
      seats_left: 2,
      opens_at: '2026-12-01T05:00:00.000Z',
      closes_at: '2027-01-23T05:00:00.000Z',
      closed_manually: 0,
    });
  });

  it('no baja de cero cupos aunque haya mas aprobadas que cupo', async () => {
    await setLimits(1);
    await seedOrders([
      { customer: 'ana', status: 'approved', createdAt: '2026-12-02T11:00:00.000Z' },
      { customer: 'bruno', status: 'approved', createdAt: '2026-12-03T09:00:00.000Z' },
    ]);

    const [seats] = await fromView<{ approved_orders: number; seats_left: number }>('v_program_seats', 'program_code');

    expect(seats).toMatchObject({ approved_orders: 2, seats_left: 0 });
  });

  it('muestra el cierre manual y deja sin cupo un programa sin limites configurados', async () => {
    await setLimits(5);
    await env.DB.prepare('UPDATE programs SET closed_manually = 1 WHERE code = ?').bind(PROGRAM).run();
    await seedOrders([{ customer: 'ana', program: OTHER_PROGRAM, status: 'approved', createdAt: '2026-12-02T11:00:00.000Z' }]);

    const rows = await fromView<Record<string, unknown>>('v_program_seats', 'program_code');

    expect(rows).toEqual([
      expect.objectContaining({ program_code: PROGRAM, seats_left: 5, closed_manually: 1 }),
      {
        program_code: OTHER_PROGRAM,
        capacity: null,
        approved_orders: 1,
        seats_left: null,
        opens_at: null,
        closes_at: null,
        closed_manually: 0,
      },
    ]);
  });
});
