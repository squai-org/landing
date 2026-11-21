import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadProgram } from '../../src/server/services/program.service';

const PROGRAM = 'programa-limites';
const CAPACITY = 30;
const BEFORE_OPENING = new Date('2026-12-01T04:59:59.999Z');
const OPENING = new Date('2026-12-01T05:00:00.000Z');
const LAST_MOMENT = new Date('2027-01-23T04:59:59.999Z');
const CLOSING = new Date('2027-01-23T05:00:00.000Z');

let customerId = 0;

beforeAll(async () => {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO programs (code, description) VALUES (?, 'Programa con limites') ON CONFLICT (code) DO NOTHING`
    ).bind(PROGRAM),
    env.DB.prepare(
      `INSERT INTO program_prices (program_code, currency, amount, valid_from)
       VALUES (?, 'COP', 440000, '2020-01-01T05:00:00.000Z') ON CONFLICT DO NOTHING`
    ).bind(PROGRAM),
    env.DB.prepare(
      `INSERT INTO program_limits (program_code, opens_at, closes_at, capacity)
       VALUES (?, '2026-12-01T05:00:00.000Z', '2027-01-23T05:00:00.000Z', ?) ON CONFLICT DO NOTHING`
    ).bind(PROGRAM, CAPACITY),
  ]);

  const customer = await env.DB.prepare(
    `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
     VALUES ('cupos@limites.co', 'Ana Rios', '+57', '3205551234', '+573205551234')
     ON CONFLICT (email) DO UPDATE SET full_name = excluded.full_name
     RETURNING id`
  ).first<{ id: number }>();
  customerId = customer!.id;
});

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM orders WHERE program_code = ?').bind(PROGRAM).run();
  await env.DB.prepare('UPDATE programs SET closed_manually = 0 WHERE code = ?').bind(PROGRAM).run();
});

const seedOrders = async (count: number, status: string) => {
  const ids = Array.from({ length: count }, () => `${PROGRAM}-${crypto.randomUUID()}`);
  await env.DB.batch(
    ids.map((orderId) =>
      env.DB.prepare(
        `INSERT INTO orders (order_id, customer_id, program_code, status, amount, currency)
         VALUES (?, ?, ?, ?, 440000, 'COP')`
      ).bind(orderId, customerId, PROGRAM, status)
    )
  );
  return ids;
};

const statusAt = async (now: Date) => (await loadProgram(env, PROGRAM, now, 'CO')).status;

describe('estado calculado del programa', () => {
  it('esta proximamente hasta el ultimo milisegundo antes de la apertura', async () => {
    expect(await statusAt(BEFORE_OPENING)).toBe('upcoming');
  });

  it('abre solo a las 00:00 del 1 de diciembre en Colombia', async () => {
    expect(await statusAt(OPENING)).toBe('open');
  });

  it('sigue abierto todo el 22 de enero en Colombia', async () => {
    expect(await statusAt(LAST_MOMENT)).toBe('open');
  });

  it('cierra por fecha a las 00:00 del 23 de enero en Colombia', async () => {
    expect(await statusAt(CLOSING)).toBe('closed');
  });

  it('cierra por cupo con 30 ordenes aprobadas', async () => {
    await seedOrders(CAPACITY - 1, 'approved');
    expect(await statusAt(OPENING)).toBe('open');

    await seedOrders(1, 'approved');
    expect(await statusAt(OPENING)).toBe('closed');
  });

  it('no cuenta como cupo ocupado las ordenes pendientes, rechazadas o anuladas', async () => {
    await seedOrders(CAPACITY - 1, 'approved');
    await seedOrders(3, 'pending');
    await seedOrders(3, 'rejected');
    await seedOrders(3, 'voided');

    expect(await statusAt(OPENING)).toBe('open');
  });

  it('cierra con el cierre manual aunque haya fecha y cupo', async () => {
    await env.DB.prepare('UPDATE programs SET closed_manually = 1 WHERE code = ?').bind(PROGRAM).run();

    expect(await statusAt(OPENING)).toBe('closed');
  });

  it('reabre cuando una venta aprobada pasa a anulada y libera su cupo', async () => {
    const [first] = await seedOrders(CAPACITY, 'approved');
    expect(await statusAt(OPENING)).toBe('closed');

    await env.DB.prepare(`UPDATE orders SET status = 'voided' WHERE order_id = ?`).bind(first).run();

    expect(await statusAt(OPENING)).toBe('open');
  });

  it('un programa sin limites configurados no se vende', async () => {
    await env.DB.prepare(
      `INSERT INTO programs (code, description) VALUES ('programa-sin-limites', 'Sin limites') ON CONFLICT (code) DO NOTHING`
    ).run();
    await env.DB.prepare(
      `INSERT INTO program_prices (program_code, currency, amount, valid_from)
       VALUES ('programa-sin-limites', 'COP', 1000, '2020-01-01T05:00:00.000Z') ON CONFLICT DO NOTHING`
    ).run();

    expect((await loadProgram(env, 'programa-sin-limites', OPENING, 'CO')).status).toBe('closed');
  });
});
